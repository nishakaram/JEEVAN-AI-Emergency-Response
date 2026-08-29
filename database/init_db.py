"""
Creates all JEEVAN database tables (users, emergency_contacts, responders,
emergencies, emergency_events) inside database/jeevan.db.

Run this once before starting the backend for the first time, and again
any time you delete jeevan.db and want a fresh database.
"""
import sys
import os

# Make the backend/ package importable from this script's location.
sys.path.append(os.path.join(os.path.dirname(__file__), "..", "backend"))

from app.database import Base, engine
from app import models  # noqa: F401  (import registers all tables with Base)


def init_db():
    Base.metadata.create_all(bind=engine)
    print("Database initialized: all tables created at database/jeevan.db")


if __name__ == "__main__":
    init_db()
