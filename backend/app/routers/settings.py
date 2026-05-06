from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import ReasonOption, User, RoleEnum
from app.routers.auth import get_current_user
from pydantic import BaseModel
from typing import List

router = APIRouter()

class ReasonCreate(BaseModel):
    value: str
    label: str
    is_active: bool = True
    sort_order: int = 0

class ReasonOut(ReasonCreate):
    id: int

@router.get("/reasons", response_model=List[ReasonOut])
def get_reasons(db: Session = Depends(get_db)):
    # Semua orang bisa lihat (termasuk verifikator untuk dropdown)
    return db.query(ReasonOption).order_by(ReasonOption.sort_order.asc(), ReasonOption.id.asc()).all()

@router.post("/reasons", response_model=ReasonOut)
def create_reason(req: ReasonCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role not in [RoleEnum.admin, RoleEnum.supervisor]:
        raise HTTPException(status_code=403, detail="Akses ditolak")
    
    exists = db.query(ReasonOption).filter_by(value=req.value).first()
    if exists:
        raise HTTPException(status_code=400, detail="Value sudah ada")
        
    reason = ReasonOption(**req.dict())
    db.add(reason)
    db.commit()
    db.refresh(reason)
    return reason

@router.put("/reasons/{reason_id}", response_model=ReasonOut)
def update_reason(reason_id: int, req: ReasonCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role not in [RoleEnum.admin, RoleEnum.supervisor]:
        raise HTTPException(status_code=403, detail="Akses ditolak")
        
    reason = db.query(ReasonOption).filter_by(id=reason_id).first()
    if not reason:
        raise HTTPException(status_code=404, detail="Alasan tidak ditemukan")
        
    # Check if value changed and conflicts
    if req.value != reason.value:
        exists = db.query(ReasonOption).filter_by(value=req.value).first()
        if exists:
            raise HTTPException(status_code=400, detail="Value sudah ada")
            
    reason.value = req.value
    reason.label = req.label
    reason.is_active = req.is_active
    reason.sort_order = req.sort_order
    db.commit()
    db.refresh(reason)
    return reason

@router.delete("/reasons/{reason_id}")
def delete_reason(reason_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role not in [RoleEnum.admin, RoleEnum.supervisor]:
        raise HTTPException(status_code=403, detail="Akses ditolak")
        
    reason = db.query(ReasonOption).filter_by(id=reason_id).first()
    if not reason:
        raise HTTPException(status_code=404, detail="Alasan tidak ditemukan")
        
    db.delete(reason)
    db.commit()
    return {"message": "Alasan dihapus"}
