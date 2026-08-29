"""
Simulated emergency-contact notification.

For this prototype, "notifying" a contact means logging a clear,
timestamped event onto the emergency's timeline — it does NOT send a
real SMS, phone call, or WhatsApp message. Real notification delivery
(Twilio, WhatsApp Business API, etc.) is explicitly out of scope; see
the project README's Limitations section.
"""
from typing import List

from sqlalchemy.orm import Session

from app import models


def notify_emergency_contacts(db: Session, emergency: models.Emergency) -> List[str]:
    """Simulates notifying every emergency contact belonging to the
    emergency's user (if the emergency has a user_id and that user has
    saved contacts). Returns the list of notification messages that
    describe what would have been sent — the caller logs one timeline
    event per message."""
    if not emergency.user_id:
        return []

    contacts = (
        db.query(models.EmergencyContact)
        .filter(models.EmergencyContact.user_id == emergency.user_id)
        .all()
    )

    location = emergency.location_label or f"{emergency.latitude:.4f}, {emergency.longitude:.4f}"

    messages = []
    for contact in contacts:
        messages.append(
            f"Notified {contact.name} ({contact.relationship_type or 'contact'}) at "
            f"{contact.phone}: {emergency.emergency_type or 'Emergency'} — "
            f"{emergency.severity or 'Unknown severity'} near {location}."
        )

    return messages
