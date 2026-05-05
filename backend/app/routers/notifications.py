from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Notification, User
from app.routers.auth import get_current_user
from pydantic import BaseModel
from typing import List
from datetime import datetime

router = APIRouter()

class NotificationOut(BaseModel):
    id: int
    title: str
    message: str
    is_read: bool
    created_at: datetime
    class Config:
        from_attributes = True

@router.get("/", response_model=List[NotificationOut])
def get_notifications(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Notification).filter_by(user_id=current_user.id).order_by(Notification.created_at.desc()).limit(20).all()

@router.patch("/{notif_id}/read")
def mark_read(notif_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    notif = db.query(Notification).filter_by(id=notif_id, user_id=current_user.id).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notifikasi tidak ditemukan")
    notif.is_read = True
    db.commit()
    return {"message": "Success"}

@router.get("/unread-count")
def get_unread_count(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    count = db.query(Notification).filter_by(user_id=current_user.id, is_read=False).count()
    return {"count": count}
