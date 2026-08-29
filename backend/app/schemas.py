"""
Pydantic schemas define the shape of data going IN and OUT of the API.
Models (models.py) define how data is stored in the database — schemas
define how it looks over HTTP. Keeping them separate means we can, e.g.,
hide internal fields or reshape data without touching the database.
"""
from datetime import datetime
from typing import Optional, List

from pydantic import BaseModel, ConfigDict


class ResponderOut(BaseModel):
    id: int
    name: str
    type: str
    latitude: float
    longitude: float
    availability: str
    capabilities: Optional[str] = None
    contact: Optional[str] = None
    estimated_speed: float

    # Lets Pydantic read data straight off SQLAlchemy model instances,
    # not just plain dicts.
    model_config = ConfigDict(from_attributes=True)


class EmergencyEventOut(BaseModel):
    id: int
    event_type: str
    description: Optional[str] = None
    timestamp: datetime

    model_config = ConfigDict(from_attributes=True)


class EmergencyCreate(BaseModel):
    description_text: str
    latitude: float
    longitude: float
    location_label: Optional[str] = None
    user_id: Optional[int] = None


class EmergencyOut(BaseModel):
    id: int
    description_text: str
    latitude: float
    longitude: float
    location_label: Optional[str] = None
    emergency_type: Optional[str] = None
    severity: Optional[str] = None
    ai_summary: Optional[str] = None
    assistance_required: Optional[str] = None
    indicators: Optional[str] = None
    assigned_responder_id: Optional[int] = None
    assigned_responder: Optional[ResponderOut] = None
    status: str
    created_at: datetime
    events: List[EmergencyEventOut] = []

    model_config = ConfigDict(from_attributes=True)


class ResponderMatchOut(BaseModel):
    """One responder's ranked-match result, with its full, explainable
    score breakdown — this is what /api/responders/nearby returns."""

    responder: ResponderOut
    distance_km: float
    eta_minutes: Optional[float] = None
    distance_factor: float
    availability_factor: int
    capability_factor: int
    severity_compatibility_factor: int
    total_score: float


class EmergencyAnalyzeRequest(BaseModel):
    description_text: str


class EmergencyAnalyzeResponse(BaseModel):
    """Structured AI classification output. Returned standalone by
    POST /api/emergencies/analyze, and also stored onto the Emergency
    record when POST /api/emergencies is called."""

    emergency_type: str
    severity: str
    summary: str
    assistance_required: str
    indicators: List[str]


class EmergencyContactCreate(BaseModel):
    name: str
    phone: str
    relationship_type: Optional[str] = None


class EmergencyContactOut(BaseModel):
    id: int
    user_id: int
    name: str
    phone: str
    relationship_type: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class UserCreate(BaseModel):
    name: str
    phone: str
    blood_group: Optional[str] = None
    medical_notes: Optional[str] = None


class UserOut(BaseModel):
    id: int
    name: str
    phone: str
    blood_group: Optional[str] = None
    medical_notes: Optional[str] = None
    created_at: datetime
    contacts: List[EmergencyContactOut] = []

    model_config = ConfigDict(from_attributes=True)


class EmergencyStatusUpdate(BaseModel):
    status: str
