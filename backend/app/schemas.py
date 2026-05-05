from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.models import RoleEnum, StatusEnum

# ── AUTH ──────────────────────────────────────────
class LoginRequest(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    full_name: str

# ── USER ──────────────────────────────────────────
class UserCreate(BaseModel):
    username: str
    password: str
    full_name: str
    role: RoleEnum = RoleEnum.verifikator

class UserOut(BaseModel):
    id: int
    username: str
    full_name: str
    role: RoleEnum
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

# ── RECORD ────────────────────────────────────────
class RecordOut(BaseModel):
    id: int
    id_pelanggan: str
    stand_ai: Optional[float]
    stand_petugas: Optional[float]
    selisih: Optional[float]
    merek_ai: Optional[str]
    merek_petugas: Optional[str]
    tipe_ai: Optional[str]
    tipe_petugas: Optional[str]
    status: StatusEnum
    assigned_to: Optional[int]
    catatan: Optional[str]
    verified_at: Optional[datetime]
    is_anomaly: bool

    class Config:
        from_attributes = True

class RecordUpdate(BaseModel):
    status: StatusEnum
    catatan: Optional[str] = None

# ── ASSIGNMENT ────────────────────────────────────
class AssignmentRequest(BaseModel):
    session_id: int
    method: str  # "auto", "range", "prefix", "manual"
    operator_ids: list[int]
    range_start: Optional[str] = None
    range_end: Optional[str] = None
    prefix: Optional[str] = None

# ── DASHBOARD ─────────────────────────────────────
class DashboardStats(BaseModel):
    total: int
    pending: int
    verified_ok: int
    verified_reject: int
    need_investigation: int
    progress_pct: float