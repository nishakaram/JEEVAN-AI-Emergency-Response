from datetime import datetime

from sqlalchemy import Column, Integer, Float, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    phone = Column(String, nullable=False)
    blood_group = Column(String, nullable=True)
    medical_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    contacts = relationship("EmergencyContact", back_populates="user")
    emergencies = relationship("Emergency", back_populates="user")


class EmergencyContact(Base):
    __tablename__ = "emergency_contacts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    name = Column(String, nullable=False)
    phone = Column(String, nullable=False)
    relationship_type = Column("relationship", String, nullable=True)

    user = relationship("User", back_populates="contacts")


class Responder(Base):
    __tablename__ = "responders"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    type = Column(String, nullable=False)  # Ambulance | First Responder | Hospital | Medical Volunteer
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    availability = Column(String, default="Available")  # Available | Busy | Offline
    capabilities = Column(String, nullable=True)  # comma-separated string
    contact = Column(String, nullable=True)
    estimated_speed = Column(Float, default=40.0)  # km/h, used for ETA math

    assigned_emergencies = relationship("Emergency", back_populates="assigned_responder")


class Emergency(Base):
    __tablename__ = "emergencies"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    description_text = Column(Text, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    location_label = Column(String, nullable=True)

    emergency_type = Column(String, nullable=True)
    severity = Column(String, nullable=True)
    ai_summary = Column(Text, nullable=True)
    assistance_required = Column(String, nullable=True)
    indicators = Column(Text, nullable=True)  # JSON-encoded list, stored as string

    assigned_responder_id = Column(Integer, ForeignKey("responders.id"), nullable=True)
    status = Column(String, default="Created")
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="emergencies")
    assigned_responder = relationship("Responder", back_populates="assigned_emergencies")
    events = relationship(
        "EmergencyEvent", back_populates="emergency", order_by="EmergencyEvent.timestamp"
    )


class EmergencyEvent(Base):
    __tablename__ = "emergency_events"

    id = Column(Integer, primary_key=True, index=True)
    emergency_id = Column(Integer, ForeignKey("emergencies.id"))
    event_type = Column(String, nullable=False)
    description = Column(String, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)

    emergency = relationship("Emergency", back_populates="events")
