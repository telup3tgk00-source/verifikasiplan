import os
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

    # Check and add columns to reason_options
    try:
        db.execute(text("ALTER TABLE reason_options ADD COLUMN requires_stand_correction BOOLEAN DEFAULT 0"))
    except Exception:
        pass

    db.commit()
    db.close()

run_migrations()

DEBUG = os.getenv("DEBUG", "false").lower() == "true"

app = FastAPI(
    title="PLN KWH Verification API",
    description="Backend untuk sistem verifikasi meter PLN",
    version="1.0.0",
    docs_url="/docs" if DEBUG else None,
    redoc_url="/redoc" if DEBUG else None,
    openapi_url="/openapi.json" if DEBUG else None,
)

# CORS agar React bisa akses
origins = [
    os.getenv("FRONTEND_URL", "http://localhost:5173"), 
    "http://127.0.0.1:5173",
    "https://portalapp.iconpln.co.id"
]

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
def dashboard_stats(bulan: str = None, current_user: User = Depends(get_current_user)):
    from app.database import SessionLocal
    db = SessionLocal()
    try:
        from app.models import VerificationRecord, StatusEnum, UploadSession, RoleEnum
        
        # Base query for records
        query = db.query(VerificationRecord).filter(VerificationRecord.is_deleted == False)
        
        # Filter jika user adalah verifikator, hanya tampilkan tugasnya sendiri
        if current_user.role == RoleEnum.verifikator:
            query = query.filter(VerificationRecord.assigned_to == current_user.id)
            
        if bulan:
            query = query.join(UploadSession, VerificationRecord.session_id == UploadSession.id)\
                         .filter(UploadSession.bulan_verifikasi == bulan)
                         
        total = query.count()
        pending = query.filter(VerificationRecord.status == StatusEnum.PENDING).count()
        ok = query.filter(VerificationRecord.status == StatusEnum.VERIFIED_OK).count()
        reject = query.filter(VerificationRecord.status == StatusEnum.VERIFIED_REJECT).count()
        inv = query.filter(VerificationRecord.status == StatusEnum.NEED_INVESTIGATION).count()
        anomaly = query.filter(VerificationRecord.is_anomaly == True).count()
        
        pct = round((ok + reject + inv) / total * 100, 1) if total > 0 else 0
        
        # Data untuk chart: Progres per sesi
        session_query = db.query(UploadSession)
        if bulan:
            session_query = session_query.filter(UploadSession.bulan_verifikasi == bulan)
        sessions = session_query.order_by(UploadSession.id.desc()).limit(5).all()
        
        chart_data = []
        for s in sessions:
            s_total_q = db.query(VerificationRecord).filter_by(session_id=s.id, is_deleted=False)
            s_done_q = db.query(VerificationRecord).filter(
                VerificationRecord.session_id == s.id,
                VerificationRecord.status != StatusEnum.PENDING,
                VerificationRecord.is_deleted == False
            )
            
            if current_user.role == RoleEnum.verifikator:
                s_total_q = s_total_q.filter(VerificationRecord.assigned_to == current_user.id)
                s_done_q = s_done_q.filter(VerificationRecord.assigned_to == current_user.id)

            s_total = s_total_q.count()
            s_done = s_done_q.count()
            
            # Jangan tampilkan sesi di chart jika verifikator tidak punya tugas di sesi tersebut
            if current_user.role == RoleEnum.verifikator and s_total == 0:
                continue

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