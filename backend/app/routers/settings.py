from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import ReasonOption, User, RoleEnum
from app.routers.auth import get_current_user
from app.permissions import CAN_MANAGE_REASONS
from pydantic import BaseModel
from typing import Optional, List

router = APIRouter()

class ReasonCreate(BaseModel):
    value: str
    label: str
    sort_order: int = 0
    requires_stand_correction: bool = False

class ReasonOut(BaseModel):
    id: int
    value: str
    label: str
    is_active: bool
    sort_order: int
    requires_stand_correction: bool
    class Config:
        from_attributes = True

@router.get("/reasons", response_model=List[ReasonOut])
def get_reasons(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(ReasonOption).filter_by(is_active=True).order_by(ReasonOption.sort_order).all()

@router.post("/reasons", response_model=ReasonOut)
def create_reason(req: ReasonCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role not in CAN_MANAGE_REASONS:
        raise HTTPException(status_code=403, detail="Hanya UID dan Super Admin yang dapat menambah alasan")
    existing = db.query(ReasonOption).filter_by(value=req.value).first()
    if existing:
        raise HTTPException(status_code=400, detail="Key/value alasan sudah ada")
    reason = ReasonOption(**req.model_dump())
    db.add(reason)
    db.commit()
    db.refresh(reason)
    return reason

@router.put("/reasons/{reason_id}", response_model=ReasonOut)
def update_reason(reason_id: int, req: ReasonCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role not in CAN_MANAGE_REASONS:
        raise HTTPException(status_code=403, detail="Hanya UID dan Super Admin yang dapat mengubah alasan")
    reason = db.query(ReasonOption).filter_by(id=reason_id).first()
    if not reason:
        raise HTTPException(status_code=404, detail="Alasan tidak ditemukan")
    reason.label = req.label
    reason.sort_order = req.sort_order
    reason.requires_stand_correction = req.requires_stand_correction
    db.commit()
    db.refresh(reason)
    return reason

@router.delete("/reasons/{reason_id}")
def delete_reason(reason_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role not in CAN_MANAGE_REASONS:
        raise HTTPException(status_code=403, detail="Hanya UID dan Super Admin yang dapat menghapus alasan")
    reason = db.query(ReasonOption).filter_by(id=reason_id).first()
    if not reason:
        raise HTTPException(status_code=404, detail="Alasan tidak ditemukan")
    reason.is_active = False
    db.commit()
    return {"message": "Alasan dinonaktifkan"}
