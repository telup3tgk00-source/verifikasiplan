from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from app.database import get_db
from app.routers.auth import get_current_user
from app.models import UploadSession, VerificationRecord, User
import pandas as pd
import io

router = APIRouter()

ANOMALY_THRESHOLD = 500

def process_matching(session_id: int, ai_bytes: bytes, petugas_bytes: bytes, db: Session):
    try:
        df_ai = pd.read_excel(io.BytesIO(ai_bytes))
        df_petugas = pd.read_excel(io.BytesIO(petugas_bytes))

        # Normalisasi nama kolom
        df_ai.columns = [c.strip().lower().replace(" ", "_") for c in df_ai.columns]
        df_petugas.columns = [c.strip().lower().replace(" ", "_") for c in df_petugas.columns]

        # Cari kolom ID
        ai_id_col = next((c for c in df_ai.columns if "pelanggan" in c or "id" in c), df_ai.columns[0])
        pet_id_col = next((c for c in df_petugas.columns if "idpel" in c or "id" in c), df_petugas.columns[0])

        df_ai[ai_id_col] = df_ai[ai_id_col].astype(str).str.strip()
        df_petugas[pet_id_col] = df_petugas[pet_id_col].astype(str).str.strip()

        merged = pd.merge(df_ai, df_petugas, left_on=ai_id_col, right_on=pet_id_col, how="left")

        records = []
        for _, row in merged.iterrows():
            try:
                stand_ai = float(row.get("stand_kwh", row.get("stand", 0)) or 0)
                stand_pet = float(row.get("stand_baca", 0) or 0)
                selisih = abs(stand_ai - stand_pet)
                merek_ai = str(row.get("merek", "") or "")
                merek_pet = str(row.get("merk_meter", "") or "")

                rec = VerificationRecord(
                    session_id=session_id,
                    id_pelanggan=str(row[ai_id_col]),
                    stand_ai=stand_ai,
                    stand_petugas=stand_pet,
                    selisih=selisih,
                    merek_ai=merek_ai,
                    merek_petugas=merek_pet,
                    tipe_ai=str(row.get("tipe_stan", "") or ""),
                    tipe_petugas=str(row.get("tipe", "") or ""),
                    is_anomaly=selisih > ANOMALY_THRESHOLD
                )
                records.append(rec)
            except Exception:
                continue

        db.bulk_save_objects(records)
        session = db.query(UploadSession).filter_by(id=session_id).first()
        session.status = "done"
        session.total_records = len(records)
        db.commit()
    except Exception as e:
        session = db.query(UploadSession).filter_by(id=session_id).first()
        if session:
            session.status = f"error: {str(e)}"
            db.commit()

@router.post("/upload")
async def upload_files(
    background_tasks: BackgroundTasks,
    file_ai: UploadFile = File(...),
    file_petugas: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not file_ai.filename.endswith(".xlsx") or not file_petugas.filename.endswith(".xlsx"):
        raise HTTPException(status_code=400, detail="File harus format .xlsx")

    ai_bytes = await file_ai.read()
    petugas_bytes = await file_petugas.read()

    session = UploadSession(
        uploaded_by=current_user.id,
        file_ai_name=file_ai.filename,
        file_petugas_name=file_petugas.filename,
        status="processing"
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    background_tasks.add_task(process_matching, session.id, ai_bytes, petugas_bytes, db)
    return {"session_id": session.id, "status": "processing", "message": "File sedang diproses"}

@router.get("/sessions")
def get_sessions(db: Session = Depends(get_db)):
    return db.query(UploadSession).order_by(UploadSession.created_at.desc()).all()

@router.get("/sessions/{session_id}")
def get_session(session_id: int, db: Session = Depends(get_db)):
    s = db.query(UploadSession).filter_by(id=session_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Sesi tidak ditemukan")
    return s

@router.delete("/sessions/{session_id}")
def delete_session(session_id: int, db: Session = Depends(get_db)):
    session = db.query(UploadSession).filter_by(id=session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Sesi tidak ditemukan")
    
    # Soft delete: set is_deleted=True for all records in this session
    db.query(VerificationRecord).filter_by(session_id=session_id).update({"is_deleted": True})
    
    # Delete session metadata
    db.delete(session)
    db.commit()
    return {"message": "Sesi berhasil dihapus (soft delete records)"}