from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from app.database import get_db
from app.routers.auth import get_current_user
from app.models import UploadSession, VerificationRecord, StatusEnum, User
import pandas as pd
import io

router = APIRouter()

ANOMALY_THRESHOLD = 500

# ── Kolom yang dikenali dari file Excel Web 1 ───────────────────────────────
def find_col(df, candidates):
    """Cari nama kolom dari daftar alias (case-insensitive)."""
    cols_lower = {c.lower().strip(): c for c in df.columns}
    for name in candidates:
        if name.lower() in cols_lower:
            return cols_lower[name.lower()]
    return None

def safe_float(val):
    try:
        if pd.isna(val) or val == "":
            return None
        return float(val)
    except (ValueError, TypeError):
        return None

def parse_excel_file(file_bytes: bytes, record_type: str, session_id: int) -> list:
    """
    Parse file Excel (MATCH atau BEDA) dari Web 1 dan kembalikan list VerificationRecord.
    Kolom yang dikenali: No, Waktu, ID Pelanggan, Stand AI, Stand Biller,
                         Selisih, Hasil Verifikasi, Merek, Tipe Stan, Batch, Nama Biller
    """
    df = pd.read_excel(io.BytesIO(file_bytes))

    # Normalisasi nama kolom
    df.columns = [str(c).strip() for c in df.columns]

    # Deteksi kolom
    col_id     = find_col(df, ["ID Pelanggan", "id_pelanggan", "IDPEL", "No Pelanggan"])
    col_stand_ai   = find_col(df, ["Stand AI", "stand_ai", "STAND AI", "KWH AI"])
    col_stand_bil  = find_col(df, ["Stand Biller", "stand_biller", "STAND BILLER", "Stand Petugas", "stand_baca"])
    col_selisih    = find_col(df, ["Selisih", "selisih", "SELISIH", "Diff"])
    col_merek      = find_col(df, ["Merek", "merek", "MEREK", "Merk"])
    col_tipe       = find_col(df, ["Tipe Stan", "tipe_stan", "TIPE STAN", "Tipe"])
    col_nama_bil   = find_col(df, ["Nama Biller", "nama_biller", "NAMA BILLER"])

    if not col_id:
        raise ValueError("Kolom 'ID Pelanggan' tidak ditemukan di file Excel")

    records = []
    for _, row in df.iterrows():
        try:
            id_pel = str(row[col_id]).strip() if col_id else ""
            if not id_pel or id_pel.lower() in ("nan", "none", ""):
                continue

            stand_ai  = safe_float(row[col_stand_ai])  if col_stand_ai else None
            stand_bil = safe_float(row[col_stand_bil]) if col_stand_bil else None
            selisih   = safe_float(row[col_selisih])   if col_selisih else None

            # Hitung selisih jika tidak ada kolom
            if selisih is None and stand_ai is not None and stand_bil is not None:
                selisih = abs(stand_ai - stand_bil)

            merek     = str(row[col_merek]).strip()    if col_merek    and pd.notna(row[col_merek])    else None
            tipe      = str(row[col_tipe]).strip()     if col_tipe     and pd.notna(row[col_tipe])     else None
            nama_bil  = str(row[col_nama_bil]).strip() if col_nama_bil and pd.notna(row[col_nama_bil]) else None

            rec = VerificationRecord(
                session_id=session_id,
                id_pelanggan=id_pel,
                record_type=record_type,
                stand_ai=stand_ai,
                stand_petugas=stand_bil,
                selisih=selisih,
                merek_ai=merek,
                merek_petugas=nama_bil,
                tipe_ai=tipe,
                # Data MATCH langsung VERIFIED_OK; BEDA = PENDING
                status=StatusEnum.VERIFIED_OK if record_type == "match" else StatusEnum.PENDING,
                is_anomaly=(selisih or 0) > ANOMALY_THRESHOLD,
            )
            records.append(rec)
        except Exception:
            continue

    return records


def process_upload(session_id: int, match_bytes: bytes, beda_bytes: bytes, db: Session):
    """Background task: parse kedua file dan simpan ke DB."""
    try:
        match_records = parse_excel_file(match_bytes, "match", session_id)
        beda_records  = parse_excel_file(beda_bytes,  "beda",  session_id)

        db.bulk_save_objects(match_records + beda_records)

        session = db.query(UploadSession).filter_by(id=session_id).first()
        session.status       = "done"
        session.total_match  = len(match_records)
        session.total_beda   = len(beda_records)
        session.total_records = len(match_records) + len(beda_records)
        db.commit()
    except Exception as e:
        session = db.query(UploadSession).filter_by(id=session_id).first()
        if session:
            session.status = f"error: {str(e)}"
            db.commit()


# ── Endpoints ───────────────────────────────────────────────────────────────

@router.post("/upload")
async def upload_files(
    background_tasks: BackgroundTasks,
    file_match: UploadFile = File(...),
    file_beda: UploadFile = File(...),
    batch_name: str = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    for f in [file_match, file_beda]:
        if not f.filename.lower().endswith((".xlsx", ".xls")):
            raise HTTPException(status_code=400, detail=f"File '{f.filename}' harus format .xlsx / .xls")

    match_bytes = await file_match.read()
    beda_bytes  = await file_beda.read()

    session = UploadSession(
        uploaded_by=current_user.id,
        batch_name=batch_name,
        file_match_name=file_match.filename,
        file_beda_name=file_beda.filename,
        status="processing"
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    background_tasks.add_task(process_upload, session.id, match_bytes, beda_bytes, db)
    return {
        "session_id": session.id,
        "status": "processing",
        "message": "File sedang diproses, tunggu beberapa saat"
    }


@router.get("/sessions")
def get_sessions(db: Session = Depends(get_db)):
    sessions = db.query(UploadSession).order_by(UploadSession.created_at.desc()).all()
    result = []
    for s in sessions:
        result.append({
            "id": s.id,
            "batch_name": s.batch_name,
            "file_match_name": s.file_match_name or s.file_ai_name,
            "file_beda_name":  s.file_beda_name  or s.file_petugas_name,
            "created_at": s.created_at,
            "status": s.status,
            "total_records": s.total_records,
            "total_match":   s.total_match,
            "total_beda":    s.total_beda,
        })
    return result


@router.get("/sessions/{session_id}")
def get_session(session_id: int, db: Session = Depends(get_db)):
    s = db.query(UploadSession).filter_by(id=session_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Sesi tidak ditemukan")
    return {
        "id": s.id,
        "batch_name": s.batch_name,
        "file_match_name": s.file_match_name or s.file_ai_name,
        "file_beda_name":  s.file_beda_name  or s.file_petugas_name,
        "created_at": s.created_at,
        "status": s.status,
        "total_records": s.total_records,
        "total_match":   s.total_match,
        "total_beda":    s.total_beda,
    }


@router.delete("/sessions/{session_id}")
def delete_session(session_id: int, db: Session = Depends(get_db)):
    session = db.query(UploadSession).filter_by(id=session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Sesi tidak ditemukan")
    db.query(VerificationRecord).filter_by(session_id=session_id).update({"is_deleted": True})
    db.delete(session)
    db.commit()
    return {"message": "Sesi berhasil dihapus"}