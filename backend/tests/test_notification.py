"""
Tests for simulated emergency-contact notification.
Uses an isolated in-memory SQLite database, separate from the real
database/jeevan.db file.
Run with: pytest tests/test_notification.py
"""
import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app import models
from app.services.notification import notify_emergency_contacts


def make_session():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    return Session()


def test_no_user_id_returns_empty_list():
    db = make_session()
    emergency = models.Emergency(
        description_text="test", latitude=1.0, longitude=1.0,
        emergency_type="Fall", severity="Low",
    )
    db.add(emergency)
    db.commit()
    db.refresh(emergency)

    assert notify_emergency_contacts(db, emergency) == []


def test_user_with_no_contacts_returns_empty_list():
    db = make_session()
    user = models.User(name="Solo User", phone="0000000000")
    db.add(user)
    db.commit()
    db.refresh(user)

    emergency = models.Emergency(
        user_id=user.id, description_text="test", latitude=1.0, longitude=1.0,
    )
    db.add(emergency)
    db.commit()
    db.refresh(emergency)

    assert notify_emergency_contacts(db, emergency) == []


def test_notifies_all_contacts_for_user():
    db = make_session()
    user = models.User(name="Test User", phone="0000000000")
    db.add(user)
    db.commit()
    db.refresh(user)

    db.add(models.EmergencyContact(user_id=user.id, name="Son", phone="1111111111", relationship_type="Son"))
    db.add(models.EmergencyContact(user_id=user.id, name="Daughter", phone="2222222222", relationship_type="Daughter"))
    db.commit()

    emergency = models.Emergency(
        user_id=user.id, description_text="test", latitude=26.9124, longitude=75.7873,
        emergency_type="Road Accident", severity="Critical", location_label="Jaipur (Demo)",
    )
    db.add(emergency)
    db.commit()
    db.refresh(emergency)

    messages = notify_emergency_contacts(db, emergency)
    assert len(messages) == 2
    assert any("Son" in m for m in messages)
    assert any("Daughter" in m for m in messages)
    assert all("Critical" in m for m in messages)
