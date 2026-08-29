from typing import List, Optional
import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas
from app.services.matching import best_responder
from app.services.ai_classifier import classify_emergency
from app.services.notification import notify_emergency_contacts

router = APIRouter(prefix="/api/emergencies", tags=["emergencies"])

# The full lifecycle a demo emergency moves through. Created/Assessed/
# ResponderAssigned are set automatically during creation (Phases 2-3);
# EnRoute and Resolved are set by a responder/admin from the dashboard
# (Phase 7) via PATCH /{id}/status.
VALID_STATUSES = ["Created", "Assessed", "ResponderAssigned", "EnRoute", "Resolved"]


def log_event(db: Session, emergency_id: int, event_type: str, description: Optional[str] = None):
    """Writes one row to emergency_events. This is what powers the
    tracking timeline the user sees on the Tracking screen (Phase 7)."""
    event = models.EmergencyEvent(
        emergency_id=emergency_id, event_type=event_type, description=description
    )
    db.add(event)
    db.commit()


@router.post("/analyze", response_model=schemas.EmergencyAnalyzeResponse)
def analyze_emergency(payload: schemas.EmergencyAnalyzeRequest):
    """Runs AI classification on raw text WITHOUT creating an emergency
    record. Lets the classifier be tested/demoed independently, and could
    back a 'preview before sending' step in the UI later."""
    return classify_emergency(payload.description_text)


@router.post("", response_model=schemas.EmergencyOut)
def create_emergency(payload: schemas.EmergencyCreate, db: Session = Depends(get_db)):
    """Creates a new emergency incident: stores it, logs the initial
    timeline events, runs AI classification, then runs responder matching
    using the real AI-assessed severity."""
    emergency = models.Emergency(
        user_id=payload.user_id,
        description_text=payload.description_text,
        latitude=payload.latitude,
        longitude=payload.longitude,
        location_label=payload.location_label,
        status="Created",
    )
    db.add(emergency)
    db.commit()
    db.refresh(emergency)

    log_event(db, emergency.id, "emergency_request_received", "Emergency request received.")
    log_event(
        db,
        emergency.id,
        "location_obtained",
        f"Location captured: {payload.latitude:.4f}, {payload.longitude:.4f}"
        + (f" ({payload.location_label})" if payload.location_label else ""),
    )

    # Phase 4: classify the emergency with AI (or the deterministic mock
    # fallback if no API key is configured, or the call fails for any
    # reason — classify_emergency() guarantees a usable result either way).
    classification = classify_emergency(payload.description_text)
    emergency.emergency_type = classification["emergency_type"]
    emergency.severity = classification["severity"]
    emergency.ai_summary = classification["summary"]
    emergency.assistance_required = classification["assistance_required"]
    emergency.indicators = json.dumps(classification["indicators"])
    emergency.status = "Assessed"

    # Bug fix: this used to rely on db.commit() + SQLAlchemy's
    # expire-on-commit behavior to make these fields visible again
    # afterwards. The very next line called log_event(), which issues
    # its OWN db.commit() and re-expires every object in the session —
    # so any later read of emergency.severity (used below for matching,
    # and implicitly again when this object gets serialized into the
    # response) depended on an *implicit* reload happening at exactly
    # the right time. That's fragile and was the source of the null
    # fields. Fix: flush + commit, then explicitly db.refresh() right
    # here so the in-memory object is verified in sync with the DB
    # before anything else touches the session, and capture severity
    # into a plain local variable so matching never depends on a later
    # live ORM attribute read.
    db.flush()
    db.commit()
    db.refresh(emergency)

    assessed_severity = emergency.severity

    log_event(
        db,
        emergency.id,
        "ai_assessment_completed",
        f"{emergency.emergency_type} — {emergency.severity}. {emergency.ai_summary}",
    )

    # Phase 3 used a hardcoded "Moderate" severity here since AI
    # classification didn't exist yet. Matching now uses the real,
    # AI-assessed severity captured above — the matching logic itself
    # is unchanged from Phase 3.
    match = best_responder(db, payload.latitude, payload.longitude, severity=assessed_severity)
    if match:
        responder = match["responder"]
        emergency.assigned_responder_id = responder.id
        emergency.status = "ResponderAssigned"
        db.commit()

        log_event(
            db,
            emergency.id,
            "responder_identified",
            f"Best match: {responder.name} ({responder.type}), "
            f"score {match['total_score']}/100, {match['distance_km']} km away.",
        )
        log_event(
            db,
            emergency.id,
            "responder_assigned",
            f"{responder.name} assigned. ETA "
            + (f"~{match['eta_minutes']} min." if match["eta_minutes"] is not None else "N/A."),
        )
    else:
        log_event(db, emergency.id, "no_responder_available", "No responders found in the database.")

    # Phase 6: simulate notifying the user's saved emergency contacts.
    # This never sends a real SMS/call — it only logs what WOULD have
    # been sent, as timeline events, which is enough to demo the
    # end-to-end flow described in the project brief.
    notification_messages = notify_emergency_contacts(db, emergency)
    if notification_messages:
        for message in notification_messages:
            log_event(db, emergency.id, "emergency_contact_notified", message)
    else:
        log_event(
            db,
            emergency.id,
            "no_contacts_notified",
            "No emergency contacts on file for this user.",
        )

    db.refresh(emergency)
    return emergency


@router.post("/{emergency_id}/assign", response_model=schemas.EmergencyOut)
def assign_responder(
    emergency_id: int,
    responder_id: Optional[int] = None,
    db: Session = Depends(get_db),
):
    """Manually (re)assign a responder. If responder_id is omitted, the
    matching algorithm is re-run (useful once real AI severity is set)."""
    emergency = db.query(models.Emergency).filter(models.Emergency.id == emergency_id).first()
    if not emergency:
        raise HTTPException(status_code=404, detail="Emergency not found")

    if responder_id is not None:
        responder = db.query(models.Responder).filter(models.Responder.id == responder_id).first()
        if not responder:
            raise HTTPException(status_code=404, detail="Responder not found")
    else:
        match = best_responder(
            db, emergency.latitude, emergency.longitude, severity=emergency.severity or "Moderate"
        )
        if not match:
            raise HTTPException(status_code=404, detail="No responders available")
        responder = match["responder"]

    emergency.assigned_responder_id = responder.id
    emergency.status = "ResponderAssigned"
    db.commit()

    log_event(db, emergency.id, "responder_assigned", f"{responder.name} manually assigned.")

    db.refresh(emergency)
    return emergency


@router.get("", response_model=List[schemas.EmergencyOut])
def list_emergencies(db: Session = Depends(get_db)):
    """Used by the responder/admin dashboard (Phase 7) to list all incidents."""
    return db.query(models.Emergency).order_by(models.Emergency.created_at.desc()).all()


@router.patch("/{emergency_id}/status", response_model=schemas.EmergencyOut)
def update_status(
    emergency_id: int,
    payload: schemas.EmergencyStatusUpdate,
    db: Session = Depends(get_db),
):
    """Updates an emergency's status. Used by the responder/admin
    dashboard to move an incident through EnRoute -> Resolved."""
    emergency = db.query(models.Emergency).filter(models.Emergency.id == emergency_id).first()
    if not emergency:
        raise HTTPException(status_code=404, detail="Emergency not found")

    if payload.status not in VALID_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status '{payload.status}'. Must be one of {VALID_STATUSES}.",
        )

    emergency.status = payload.status
    db.commit()

    log_event(db, emergency.id, "status_updated", f"Status updated to {payload.status}.")

    db.refresh(emergency)
    return emergency


@router.get("/{emergency_id}", response_model=schemas.EmergencyOut)
def get_emergency(emergency_id: int, db: Session = Depends(get_db)):
    emergency = db.query(models.Emergency).filter(models.Emergency.id == emergency_id).first()
    if not emergency:
        raise HTTPException(status_code=404, detail="Emergency not found")
    return emergency
