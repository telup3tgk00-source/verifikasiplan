from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app.routers import auth, users, records, upload, assignments, export, notifications, foto, settings
from app import models

from sqlalchemy import text
from app.database import engine, Base, SessionLocal

# Buat semua tabel otomatis
Base.metadata.create_all(bind=engine)

# SQLite migration helper for new columns
def run_migrations():
    db = SessionLocal()
    try:
        # Check and add columns to verification_records
        db.execute(text("ALTER TABLE verification_records ADD COLUMN record_type VARCHAR(10) DEFAULT 'beda'"))
    except Exception:
        pass
    try:
        db.execute(text("ALTER TABLE verification_records ADD COLUMN reason_type VARCHAR(50)"))
    except Exception:
        pass
    try:
        db.execute(text("ALTER TABLE verification_records ADD COLUMN corrected_stand FLOAT"))
    except Exception:
        pass

    # Check and add columns to upload_sessions
    try:
        db.execute(text("ALTER TABLE upload_sessions ADD COLUMN file_match_name VARCHAR(200)"))
    except Exception:
        pass
    try:
        db.execute(text("ALTER TABLE upload_sessions ADD COLUMN file_beda_name VARCHAR(200)"))
    except Exception:
        pass
    try:
        db.execute(text("ALTER TABLE upload_sessions ADD COLUMN total_match INTEGER DEFAULT 0"))
    except Exception:
        pass
    try:
        db.execute(text("ALTER TABLE upload_sessions ADD COLUMN total_beda INTEGER DEFAULT 0"))
    except Exception:
        pass

    db.commit()
    db.close()

run_migrations()

app = FastAPI(
    title="PLN KWH Verification API",
    description="Backend untuk sistem verifikasi meter PLN",
    version="1.0.0"
)

import os

# CORS agar React bisa akses
origins = [os.getenv("FRONTEND_URL", "http://localhost:5173"), "http://127.0.0.1:5173"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Daftarkan semua router
app.include_router(auth.router,          prefix="/api/auth",          tags=["auth"])
app.include_router(users.router,         prefix="/api/users",         tags=["Users"])
app.include_router(records.router,       prefix="/api/records",       tags=["Records"])
app.include_router(upload.router,        prefix="/api/upload",        tags=["Upload"])
app.include_router(assignments.router,   prefix="/api/assignments",   tags=["Assignments"])
app.include_router(export.router,        prefix="/api/export",        tags=["Export"])
app.include_router(notifications.router, prefix="/api/notifications", tags=["Notifications"])
app.include_router(foto.router,          prefix="/api",               tags=["Foto Meter"])
app.include_router(settings.router,      prefix="/api/settings",      tags=["Settings"])

@app.get("/")
def root():
    return {"message": "PLN KWH Verification API is running"}

from fastapi import Depends
from app.routers.auth import get_current_user
from app.models import User

@app.get("/api/dashboard/stats")
def dashboard_stats(current_user: User = Depends(get_current_user)):
    from app.database import SessionLocal
    db = SessionLocal()
    try:
        from app.models import VerificationRecord, StatusEnum, UploadSession
        total = db.query(VerificationRecord).filter_by(is_deleted=False).count()
        pending = db.query(VerificationRecord).filter_by(status=StatusEnum.PENDING, is_deleted=False).count()
        ok = db.query(VerificationRecord).filter_by(status=StatusEnum.VERIFIED_OK, is_deleted=False).count()
        reject = db.query(VerificationRecord).filter_by(status=StatusEnum.VERIFIED_REJECT, is_deleted=False).count()
        inv = db.query(VerificationRecord).filter_by(status=StatusEnum.NEED_INVESTIGATION, is_deleted=False).count()
        anomaly = db.query(VerificationRecord).filter_by(is_anomaly=True, is_deleted=False).count()
        
        pct = round((ok + reject + inv) / total * 100, 1) if total > 0 else 0
        
        # Data untuk chart: Progres per sesi
        sessions = db.query(UploadSession).order_by(UploadSession.id.desc()).limit(5).all()
        chart_data = []
        for s in sessions:
            s_total = db.query(VerificationRecord).filter_by(session_id=s.id, is_deleted=False).count()
            s_done = db.query(VerificationRecord).filter(
                VerificationRecord.session_id == s.id,
                VerificationRecord.status != StatusEnum.PENDING,
                VerificationRecord.is_deleted == False
            ).count()
            chart_data.append({
                "name": f"Sesi {s.id}",
                "done": s_done,
                "total": s_total,
                "pct": round(s_done / s_total * 100, 1) if s_total > 0 else 0
            })

        return {
            "total": total, "pending": pending, "verified_ok": ok,
            "verified_reject": reject, "need_investigation": inv, 
            "anomaly": anomaly, "progress_pct": pct,
            "chart_data": chart_data[::-1] # Reverse to chronological
        }
    finally:
        db.close()