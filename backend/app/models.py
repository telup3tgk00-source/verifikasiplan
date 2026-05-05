from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Enum, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base
import enum

class RoleEnum(str, enum.Enum):
    admin = "admin"
    supervisor = "supervisor"
    operator = "operator"
    verifikator = "verifikator"

class StatusEnum(str, enum.Enum):
    PENDING = "PENDING"
    VERIFIED_OK = "VERIFIED_OK"
    VERIFIED_REJECT = "VERIFIED_REJECT"
    NEED_INVESTIGATION = "NEED_INVESTIGATION"

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    password_hash = Column(Text, nullable=False)
    full_name = Column(String(100))
    role = Column(Enum(RoleEnum), default=RoleEnum.operator)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class UploadSession(Base):
    __tablename__ = "upload_sessions"
    id = Column(Integer, primary_key=True, index=True)
    uploaded_by = Column(Integer, ForeignKey("users.id"))
    file_ai_name = Column(String(200))
    file_petugas_name = Column(String(200))
    created_at = Column(DateTime, default=datetime.utcnow)
    status = Column(String(50), default="processing")
    total_records = Column(Integer, default=0)
    records = relationship("VerificationRecord", back_populates="session")

class VerificationRecord(Base):
    __tablename__ = "verification_records"
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("upload_sessions.id"))
    id_pelanggan = Column(String(50), index=True)
    stand_ai = Column(Float, nullable=True)
    stand_petugas = Column(Float, nullable=True)
    selisih = Column(Float, nullable=True)
    merek_ai = Column(String(100), nullable=True)
    merek_petugas = Column(String(100), nullable=True)
    tipe_ai = Column(String(50), nullable=True)
    tipe_petugas = Column(String(50), nullable=True)
    status = Column(Enum(StatusEnum), default=StatusEnum.PENDING)
    assigned_to = Column(Integer, ForeignKey("users.id"), nullable=True)
    catatan = Column(Text, nullable=True)
    verified_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    verified_at = Column(DateTime, nullable=True)
    is_anomaly = Column(Boolean, default=False)
    is_deleted = Column(Boolean, default=False)
    session = relationship("UploadSession", back_populates="records")

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True, index=True)
    record_id = Column(Integer, ForeignKey("verification_records.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    action = Column(String(100))
    old_status = Column(String(50), nullable=True)
    new_status = Column(String(50), nullable=True)
    catatan = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class AssignmentBatch(Base):
    __tablename__ = "assignment_batches"
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("upload_sessions.id"))
    operator_id = Column(Integer, ForeignKey("users.id"))
    total_assigned = Column(Integer, default=0)
    selesai = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

class Notification(Base):
    __tablename__ = "notifications"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    title = Column(String(200))
    message = Column(Text)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)