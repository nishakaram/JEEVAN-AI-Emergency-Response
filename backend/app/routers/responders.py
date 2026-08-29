from typing import List

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas
from app.services.matching import rank_responders

router = APIRouter(prefix="/api/responders", tags=["responders"])


@router.get("", response_model=List[schemas.ResponderOut])
def list_responders(db: Session = Depends(get_db)):
    """Returns every responder in the demo database, unranked."""
    return db.query(models.Responder).all()


@router.get("/nearby", response_model=List[schemas.ResponderMatchOut])
def nearby_responders(
    lat: float = Query(..., description="Latitude of the emergency"),
    lng: float = Query(..., description="Longitude of the emergency"),
    severity: str = Query("Moderate", description="Low | Moderate | Critical"),
    db: Session = Depends(get_db),
):
    """Returns every responder ranked best-match-first for this location
    and severity, each with distance, ETA, and its full score breakdown."""
    return rank_responders(db, lat, lng, severity)
