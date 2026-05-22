from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import VerificationRecord, AuditLog, StatusEnum, User
from app.schemas import RecordOut, RecordUpdate
from typing import List, Optional
from datetime import datetime

from app.routers.auth import get_current_user

router = APIRouter()

@router.get("/", response_model=List[RecordOut])
def get_records(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    session_id: Optional[int] = None,
    status: Optional[str] = None,
    assigned_to: Optional[int] = None,
    search: Optional[str] = None,
    record_type: Optional[str] = None,
    unit: Optional[str] = None,
    reason_type: Optional[str] = None,
    anomaly_only: bool = False,
    merek_mismatch: bool = False,
    skip: int = 0,
    limit: int = 50
):
    q = db.query(VerificationRecord).filter_by(is_deleted=False)
    if session_id:
        q = q.filter(VerificationRecord.session_id == session_id)
    if status:
        q = q.filter(VerificationRecord.status == status)
    from app.models import RoleEnum
    if current_user.role == RoleEnum.verifikator:
        q = q.filter(VerificationRecord.assigned_to == current_user.id)
    elif assigned_to:
        q = q.filter(VerificationRecord.assigned_to == assigned_to)
    if search:
        q = q.filter(VerificationRecord.id_pelanggan.contains(search))
    if record_type:
        q = q.filter(VerificationRecord.record_type == record_type)
    if unit:
        q = q.filter(VerificationRecord.unit == unit)
    if reason_type:
        q = q.filter(VerificationRecord.reason_type == reason_type)
    if anomaly_only:
        q = q.filter(VerificationRecord.is_anomaly == True)
    if merek_mismatch:
        q = q.filter(VerificationRecord.merek_ai != VerificationRecord.merek_petugas)
    return q.offset(skip).limit(limit).all()

@router.patch("/{record_id}", response_model=RecordOut)
def update_record(record_id: int, req: RecordUpdate, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    record = db.query(VerificationRecord).filter_by(id=record_id, is_deleted=False).first()
    if not record:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Record tidak ditemukan")

    # Simpan audit log
    log = AuditLog(
        record_id=record_id,
        user_id=current_user.id,
        action="update_status",
        old_status=record.status.value if record.status else None,
        new_status=req.status.value,
        catatan=req.catatan
    )
    db.add(log)

    record.status = req.status
    record.catatan = req.catatan
    record.reason_type = req.reason_type
    record.corrected_stand = req.corrected_stand
    record.verified_by = current_user.id
    record.verified_at = datetime.utcnow()
    db.commit()
    db.refresh(record)

    # Trigger Notifikasi ke Admin/Supervisor jika ada penolakan atau investigasi
    if req.status in [StatusEnum.VERIFIED_REJECT, StatusEnum.NEED_INVESTIGATION]:
        from app.models import User, RoleEnum, Notification
        supervisors = db.query(User).filter(User.role.in_([RoleEnum.admin, RoleEnum.supervisor])).all()
        for sup in supervisors:
            db.add(Notification(
                user_id=sup.id,
                title="Perhatian: Penolakan Data",
                message=f"Verifikator {current_user.full_name} menandai ID {record.id_pelanggan} sebagai {req.status.value}. Catatan: {req.catatan}"
            ))
        db.commit()

    return record

@router.get("/stats/summary")
def get_summary(session_id: Optional[int] = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    q = db.query(VerificationRecord).filter_by(is_deleted=False)
    if session_id:
        q = q.filter(VerificationRecord.session_id == session_id)
    total = q.count()
    pending = q.filter(VerificationRecord.status == StatusEnum.PENDING).count()
    ok = q.filter(VerificationRecord.status == StatusEnum.VERIFIED_OK).count()
    reject = q.filter(VerificationRecord.status == StatusEnum.VERIFIED_REJECT).count()
    inv = q.filter(VerificationRecord.status == StatusEnum.NEED_INVESTIGATION).count()
    return {
        "total": total, "pending": pending,
        "verified_ok": ok, "verified_reject": reject,
        "need_investigation": inv,
        "progress_pct": round((ok + reject + inv) / total * 100, 1) if total > 0 else 0
    }