"""
Responder-matching algorithm.

Every responder gets a transparent 0-100 suitability score made of four
factors, so it can be explained plainly in a viva:

    Score = distance_factor            (0-40)
          + availability_factor        (0-30)
          + capability_factor          (0-15)
          + severity_compatibility_factor  (0-15)

- distance_factor: closer responders score higher. Loses 3 points per km,
  floored at 0 (so anything beyond ~13.3 km scores 0 on this factor alone).
- availability_factor: Available=30, Busy=10, Offline=0.
- capability_factor: a baseline score per responder type, reflecting how
  generally equipped that type is for emergency response.
- severity_compatibility_factor: how well-suited that responder TYPE is
  for THIS emergency's severity (e.g. an Ambulance is a great match for a
  Critical case; a Medical Volunteer is a better relative match for a Low
  severity case than for a Critical one).

This is intentionally simple arithmetic (not a black-box ML model) so
every number in the final score can be traced back to a rule you can
explain and defend.
"""
from typing import List, Dict, Optional

from sqlalchemy.orm import Session

from app import models
from app.services.geo import haversine_distance_km, estimate_eta_minutes

CAPABILITY_BASE_SCORE = {
    "Ambulance": 15,
    "Hospital": 12,
    "First Responder": 9,
    "Medical Volunteer": 6,
}

# [severity][responder_type] -> points (0-15)
SEVERITY_COMPATIBILITY = {
    "Critical": {
        "Ambulance": 15,
        "Hospital": 15,
        "First Responder": 8,
        "Medical Volunteer": 2,
    },
    "Moderate": {
        "Ambulance": 10,
        "First Responder": 12,
        "Medical Volunteer": 8,
        "Hospital": 6,
    },
    "Low": {
        "First Responder": 12,
        "Medical Volunteer": 12,
        "Ambulance": 6,
        "Hospital": 4,
    },
}

AVAILABILITY_SCORE = {"Available": 30, "Busy": 10, "Offline": 0}


def score_responder(distance_km: float, responder: models.Responder, severity: str) -> Dict:
    distance_factor = max(0.0, 40.0 - distance_km * 3.0)
    availability_factor = AVAILABILITY_SCORE.get(responder.availability, 0)
    capability_factor = CAPABILITY_BASE_SCORE.get(responder.type, 5)
    severity_compatibility_factor = SEVERITY_COMPATIBILITY.get(severity, {}).get(
        responder.type, 5
    )

    total = distance_factor + availability_factor + capability_factor + severity_compatibility_factor

    return {
        "distance_factor": round(distance_factor, 1),
        "availability_factor": availability_factor,
        "capability_factor": capability_factor,
        "severity_compatibility_factor": severity_compatibility_factor,
        "total_score": round(total, 1),
    }


def rank_responders(
    db: Session, latitude: float, longitude: float, severity: str = "Moderate"
) -> List[Dict]:
    """Returns every responder, ranked best-match-first, each annotated
    with distance, ETA, and its full score breakdown."""
    responders = db.query(models.Responder).all()
    results = []

    for r in responders:
        distance_km = haversine_distance_km(latitude, longitude, r.latitude, r.longitude)
        eta_minutes = estimate_eta_minutes(distance_km, r.estimated_speed)
        breakdown = score_responder(distance_km, r, severity)

        results.append(
            {
                "responder": r,
                "distance_km": round(distance_km, 2),
                "eta_minutes": eta_minutes,
                **breakdown,
            }
        )

    results.sort(key=lambda x: x["total_score"], reverse=True)
    return results


def best_responder(
    db: Session, latitude: float, longitude: float, severity: str = "Moderate"
) -> Optional[Dict]:
    ranked = rank_responders(db, latitude, longitude, severity)
    return ranked[0] if ranked else None
