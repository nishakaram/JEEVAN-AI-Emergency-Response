"""
Tests for PATCH /api/emergencies/{id}/status. Calls the route function
directly (bypassing HTTP) against an isolated in-memory SQLite database —
no server or httpx client needed.
Run with: pytest tests/test_emergency_status.py
"""
import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi import HTTPException

from app.database import Base
from app import models, schemas
from app.routers.emergencies import update_status


def make_session():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    return Session()


def make_emergency(db):
    emergency = models.Emergency(
        description_text="test", latitude=1.0, longitude=1.0, status="Created"
    )
    db.add(emergency)
    db.commit()
    db.refresh(emergency)
    return emergency


def test_valid_status_update():
    db = make_session()
    emergency = make_emergency(db)

    result = update_status(emergency.id, schemas.EmergencyStatusUpdate(status="EnRoute"), db)
    assert result.status == "EnRoute"


def test_invalid_status_rejected():
    db = make_session()
    emergency = make_emergency(db)

    with pytest.raises(HTTPException):
        update_status(emergency.id, schemas.EmergencyStatusUpdate(status="NotARealStatus"), db)


def test_status_update_logs_event():
    db = make_session()
    emergency = make_emergency(db)

    update_status(emergency.id, schemas.EmergencyStatusUpdate(status="Resolved"), db)
    events = (
        db.query(models.EmergencyEvent)
        .filter(models.EmergencyEvent.emergency_id == emergency.id)
        .all()
    )
    assert any(e.event_type == "status_updated" for e in events)


def test_status_update_missing_emergency_raises_404():
    db = make_session()
    with pytest.raises(HTTPException):
        update_status(99999, schemas.EmergencyStatusUpdate(status="Resolved"), db)
