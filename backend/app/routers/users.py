from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas

router = APIRouter(prefix="/api/users", tags=["users"])


@router.post("", response_model=schemas.UserOut)
def create_user(payload: schemas.UserCreate, db: Session = Depends(get_db)):
    """Creates a simple demo user profile. No authentication in this
    prototype — the frontend just remembers the returned id locally."""
    user = models.User(
        name=payload.name,
        phone=payload.phone,
        blood_group=payload.blood_group,
        medical_notes=payload.medical_notes,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.get("/{user_id}", response_model=schemas.UserOut)
def get_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.post("/{user_id}/contacts", response_model=schemas.EmergencyContactOut)
def add_contact(user_id: int, payload: schemas.EmergencyContactCreate, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    contact = models.EmergencyContact(
        user_id=user_id,
        name=payload.name,
        phone=payload.phone,
        relationship_type=payload.relationship_type,
    )
    db.add(contact)
    db.commit()
    db.refresh(contact)
    return contact
