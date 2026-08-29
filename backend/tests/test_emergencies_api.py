"""
End-to-end integration tests hitting the real FastAPI app through HTTP
(via TestClient), against an isolated in-memory SQLite database — this
never touches the real database/jeevan.db file.

Covers the "emergency creation" and "responder assignment" testing
requirements at the full request/response level (unit-level coverage of
the individual pieces — distance, matching, AI fallback, status updates —
already lives in the other test_*.py files).

Run with: pytest tests/test_emergencies_api.py
"""
import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

from app.main import app
from app.database import Base, get_db
from app import models

engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    db.add(
        models.Responder(
            name="Test Ambulance",
            type="Ambulance",
            latitude=26.9124,
            longitude=75.7873,
            availability="Available",
            capabilities="Emergency Medical",
            contact="TEST-1",
            estimated_speed=40.0,
        )
    )
    db.commit()
    db.close()
    yield
    Base.metadata.drop_all(bind=engine)


client = TestClient(app)

DEMO_TEXT = "There has been a road accident. A person is unconscious and bleeding heavily."


def test_create_emergency_returns_full_ai_classification():
    response = client.post(
        "/api/emergencies",
        json={"description_text": DEMO_TEXT, "latitude": 26.9124, "longitude": 75.7873},
    )
    assert response.status_code == 200
    data = response.json()

    assert data["emergency_type"] == "Road Accident"
    assert data["severity"] == "Critical"
    assert data["ai_summary"]
    assert data["assistance_required"]
    assert data["indicators"] is not None


def test_create_emergency_assigns_best_responder():
    response = client.post(
        "/api/emergencies",
        json={"description_text": DEMO_TEXT, "latitude": 26.9124, "longitude": 75.7873},
    )
    data = response.json()

    assert data["assigned_responder"] is not None
    assert data["assigned_responder"]["type"] == "Ambulance"
    assert data["status"] == "ResponderAssigned"


def test_create_emergency_logs_full_timeline():
    response = client.post(
        "/api/emergencies",
        json={"description_text": "Minor fall, feeling okay.", "latitude": 26.9124, "longitude": 75.7873},
    )
    event_types = [e["event_type"] for e in response.json()["events"]]

    for expected in [
        "emergency_request_received",
        "location_obtained",
        "ai_assessment_completed",
        "responder_identified",
        "responder_assigned",
    ]:
        assert expected in event_types


def test_get_and_list_emergency():
    created = client.post(
        "/api/emergencies",
        json={"description_text": DEMO_TEXT, "latitude": 26.9124, "longitude": 75.7873},
    ).json()

    get_response = client.get(f"/api/emergencies/{created['id']}")
    assert get_response.status_code == 200
    assert get_response.json()["id"] == created["id"]

    list_response = client.get("/api/emergencies")
    assert list_response.status_code == 200
    assert any(e["id"] == created["id"] for e in list_response.json())


def test_get_missing_emergency_returns_404():
    response = client.get("/api/emergencies/999999")
    assert response.status_code == 404


def test_status_update_endpoint():
    created = client.post(
        "/api/emergencies",
        json={"description_text": DEMO_TEXT, "latitude": 26.9124, "longitude": 75.7873},
    ).json()

    response = client.patch(f"/api/emergencies/{created['id']}/status", json={"status": "EnRoute"})
    assert response.status_code == 200
    assert response.json()["status"] == "EnRoute"


def test_status_update_rejects_invalid_status():
    created = client.post(
        "/api/emergencies",
        json={"description_text": DEMO_TEXT, "latitude": 26.9124, "longitude": 75.7873},
    ).json()

    response = client.patch(f"/api/emergencies/{created['id']}/status", json={"status": "Teleporting"})
    assert response.status_code == 400
