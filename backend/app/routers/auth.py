from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User
from app.schemas import LoginRequest, TokenResponse
from passlib.context import CryptContext
from jose import jwt
from datetime import datetime, timedelta
import os
from app.models import RoleEnum

from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError

router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET_KEY = os.getenv("SECRET_KEY", "pln-kwh-secret-key-ganti-di-production")
ALGORITHM = "HS256"

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=401,
        detail="Token tidak valid",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = db.query(User).filter(User.id == int(user_id)).first()
    if user is None:
        raise credentials_exception
    return user

def create_token(data: dict, expires_hours: int = 8):
    expire = datetime.utcnow() + timedelta(hours=expires_hours)
    return jwt.encode({**data, "exp": expire}, SECRET_KEY, algorithm=ALGORITHM)

@router.post("/login", response_model=TokenResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter_by(username=req.username, is_active=True).first()
    if not user or not pwd_context.verify(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Username atau password salah")
    token = create_token({"sub": str(user.id), "role": user.role.value})
    return TokenResponse(access_token=token, role=user.role.value, full_name=user.full_name)

@router.post("/init-admin")
def init_admin(db: Session = Depends(get_db)):
    existing = db.query(User).filter_by(username="admin").first()
    if existing:
        return {"message": "Admin sudah ada"}
    admin = User(
        username="admin",
        password_hash=pwd_context.hash("admin123"),
        full_name="Administrator PLN",
        role=RoleEnum.admin
    )
    db.add(admin)
    db.commit()
    return {"message": "Admin berhasil dibuat", "username": "admin", "password": "admin123"}

@router.get("/force-reset-admin")
def force_reset_admin(db: Session = Depends(get_db)):
    # ENDPOINT SEMENTARA: Untuk reset admin via browser di Railway
    admin = db.query(User).filter_by(username="admin").first()
    if not admin:
        admin = User(
            username="admin",
            password_hash=pwd_context.hash("admin123"),
            full_name="Administrator PLN",
            role=RoleEnum.admin
        )
        db.add(admin)
    else:
        admin.password_hash = pwd_context.hash("admin123")
    
    db.commit()
    return {"message": "Admin password forcefully reset to admin123. PLEASE REMOVE THIS ENDPOINT AFTER USE."}