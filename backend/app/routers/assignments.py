from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import VerificationRecord, AssignmentBatch, StatusEnum
from app.schemas import AssignmentRequest

router = APIRouter()

@router.post("/")
def assign_tasks(req: AssignmentRequest, db: Session = Depends(get_db)):
    # 1. Ambil record yang belum diassign
    query = db.query(VerificationRecord).filter_by(
        session_id=req.session_id,
        is_deleted=False,
        assigned_to=None
    )

    # 2. Filter berdasarkan metode
    if req.method == "range":
        if not req.range_start or not req.range_end:
            raise HTTPException(status_code=400, detail="Range start dan end wajib diisi")
        query = query.filter(VerificationRecord.id_pelanggan.between(req.range_start, req.range_end))
    elif req.method == "prefix":
        if not req.prefix:
            raise HTTPException(status_code=400, detail="Prefix wajib diisi")
        query = query.filter(VerificationRecord.id_pelanggan.like(f"{req.prefix}%"))

    records = query.all()

    if not records:
        raise HTTPException(status_code=400, detail="Tidak ada record yang sesuai kriteria/belum diassign")

    n_ops = len(req.operator_ids)
    if n_ops == 0:
        raise HTTPException(status_code=400, detail="Pilih minimal 1 verifikator")

    # 3. Bagi tugas
    # Jika manual/range/prefix dan hanya 1 operator, assign semua ke dia
    # Jika auto, bagi rata ke semua operator_ids
    batches = []
    if req.method == "auto" or (len(records) > 0 and n_ops > 1):
        chunk = len(records) // n_ops
        for i, op_id in enumerate(req.operator_ids):
            start = i * chunk
            end = start + chunk if i < n_ops - 1 else len(records)
            batch_records = records[start:end]
            
            for rec in batch_records:
                rec.assigned_to = op_id
            
            if batch_records:
                batch = AssignmentBatch(
                    session_id=req.session_id,
                    operator_id=op_id,
                    total_assigned=len(batch_records)
                )
                db.add(batch)
                batches.append({"operator_id": op_id, "total": len(batch_records)})
    else:
        # Assign semua ke operator pertama (untuk manual/range/prefix yang spesifik 1 orang)
        op_id = req.operator_ids[0]
        for rec in records:
            rec.assigned_to = op_id
        
        batch = AssignmentBatch(
            session_id=req.session_id,
            operator_id=op_id,
            total_assigned=len(records)
        )
        db.add(batch)
        batches.append({"operator_id": op_id, "total": len(records)})

    db.commit()
    
    # 4. Buat notifikasi
    from app.models import Notification
    for b in batches:
        notif = Notification(
            user_id=b["operator_id"],
            title="Tugas Baru Assigned",
            message=f"Anda menerima {b['total']} data baru untuk diverifikasi pada Sesi #{req.session_id}."
        )
        db.add(notif)
    db.commit()

    return {"message": "Tugas berhasil dibagi", "distribution": batches, "total_processed": len(records)}

@router.get("/progress")
def get_progress(session_id: int, db: Session = Depends(get_db)):
    batches = db.query(AssignmentBatch).filter_by(session_id=session_id).all()
    result = []
    for b in batches:
        selesai = db.query(VerificationRecord).filter(
            VerificationRecord.session_id == session_id,
            VerificationRecord.assigned_to == b.operator_id,
            VerificationRecord.status != StatusEnum.PENDING
        ).count()
        result.append({
            "operator_id": b.operator_id,
            "total_assigned": b.total_assigned,
            "selesai": selesai,
            "pct": round(selesai / b.total_assigned * 100, 1) if b.total_assigned > 0 else 0
        })
    return result