"""
Seeds the responders table with DEMO/TEST data for JEEVAN's presentation
scenario, centered on Jaipur, Rajasthan (approx. 26.9124, 75.7873).

These are NOT real emergency services. Names and contacts are fictional.

Run after init_db.py:
    python seed_data.py
"""
import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), "..", "backend"))

from app.database import SessionLocal, Base, engine
from app import models

# Spread around Jaipur so distance-based matching (Phase 3) has real
# variety to work with: some close, some far, some busy, some offline.
DEMO_RESPONDERS = [
    {
        "name": "Jaipur City Ambulance 1", "type": "Ambulance",
        "latitude": 26.9124, "longitude": 75.7873,
        "availability": "Available", "capabilities": "Emergency Medical, Trauma Care",
        "contact": "DEMO-100", "estimated_speed": 45.0,
    },
    {
        "name": "Jaipur City Ambulance 2", "type": "Ambulance",
        "latitude": 26.8850, "longitude": 75.8100,
        "availability": "Busy", "capabilities": "Emergency Medical, Trauma Care",
        "contact": "DEMO-101", "estimated_speed": 45.0,
    },
    {
        "name": "Malviya Nagar Ambulance", "type": "Ambulance",
        "latitude": 26.8530, "longitude": 75.8060,
        "availability": "Available", "capabilities": "Emergency Medical, Trauma Care, Advanced Life Support",
        "contact": "DEMO-102", "estimated_speed": 42.0,
    },
    {
        "name": "SMS Hospital Emergency Wing", "type": "Hospital",
        "latitude": 26.9082, "longitude": 75.8021,
        "availability": "Available", "capabilities": "Trauma Care, Surgery, Emergency Medical",
        "contact": "DEMO-103", "estimated_speed": 0.0,
    },
    {
        "name": "Fortis Hospital Jaipur (Demo)", "type": "Hospital",
        "latitude": 26.8230, "longitude": 75.8060,
        "availability": "Available", "capabilities": "Trauma Care, Surgery, Emergency Medical, ICU",
        "contact": "DEMO-104", "estimated_speed": 0.0,
    },
    {
        "name": "First Responder - Vaishali Nagar", "type": "First Responder",
        "latitude": 26.9140, "longitude": 75.7370,
        "availability": "Available", "capabilities": "First Aid, CPR",
        "contact": "DEMO-105", "estimated_speed": 35.0,
    },
    {
        "name": "First Responder - Civil Lines", "type": "First Responder",
        "latitude": 26.9160, "longitude": 75.7900,
        "availability": "Offline", "capabilities": "First Aid, CPR",
        "contact": "DEMO-106", "estimated_speed": 35.0,
    },
    {
        "name": "Medical Volunteer - Raja Park", "type": "Medical Volunteer",
        "latitude": 26.9040, "longitude": 75.8260,
        "availability": "Available", "capabilities": "First Aid",
        "contact": "DEMO-107", "estimated_speed": 30.0,
    },
    {
        "name": "Sitapura Ambulance", "type": "Ambulance",
        "latitude": 26.7850, "longitude": 75.8300,
        "availability": "Available", "capabilities": "Emergency Medical, Trauma Care",
        "contact": "DEMO-108", "estimated_speed": 48.0,
    },
    {
        "name": "Medical Volunteer - Mansarovar", "type": "Medical Volunteer",
        "latitude": 26.8500, "longitude": 75.7600,
        "availability": "Busy", "capabilities": "First Aid",
        "contact": "DEMO-109", "estimated_speed": 30.0,
    },
]


def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        existing = db.query(models.Responder).count()
        if existing > 0:
            print(
                f"Responders table already has {existing} rows — skipping seed.\n"
                "Delete database/jeevan.db and re-run init_db.py + seed_data.py "
                "for a fresh seed."
            )
            return
        for r in DEMO_RESPONDERS:
            db.add(models.Responder(**r))
        db.commit()
        print(f"Seeded {len(DEMO_RESPONDERS)} demo responders around Jaipur.")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
