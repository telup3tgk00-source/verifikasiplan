from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, RoleEnum
from app.schemas import UserCreate, UserOut
from passlib.context import CryptContext
from typing import List

router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

from app.routers.auth import get_current_user

@router.get("/", response_model=List[UserOut])
def get_users(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(User).all()

@router.post("/", response_model=UserOut)
def create_user(req: UserCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != RoleEnum.admin:
        raise HTTPException(status_code=403, detail="Hanya admin yang dapat membuat user")
    existing = db.query(User).filter_by(username=req.username).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username sudah digunakan")
    user = User(
        username=req.username,
        password_hash=pwd_context.hash(req.password),
        full_name=req.full_name,
        role=req.role
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@router.patch("/{user_id}/toggle")
def toggle_user(user_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != RoleEnum.admin:
        raise HTTPException(status_code=403, detail="Hanya admin yang dapat mengubah status user")
    user = db.query(User).filter_by(id=user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User tidak ditemukan")
    user.is_active = not user.is_active
    db.commit()
    return {"message": "Status diperbarui", "is_active": user.is_active}

@router.delete("/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != RoleEnum.admin:
        raise HTTPException(status_code=403, detail="Hanya admin yang dapat menghapus user")
    user = db.query(User).filter_by(id=user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User tidak ditemukan")
    if user.username == "admin":
        raise HTTPException(status_code=400, detail="User admin utama tidak dapat dihapus")
    db.delete(user)
    db.commit()
    return {"message": "User berhasil dihapus"}

from pydantic import BaseModel
class PasswordReset(BaseModel):
    new_password: str

@router.put("/{user_id}/password")
def reset_password(user_id: int, req: PasswordReset, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != RoleEnum.admin:
        raise HTTPException(status_code=403, detail="Hanya admin yang dapat mengubah password")
    user = db.query(User).filter_by(id=user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User tidak ditemukan")
    user.password_hash = pwd_context.hash(req.new_password)
    db.commit()
    return {"message": "Password berhasil diubah"}