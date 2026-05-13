from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import VerificationRecord, AssignmentBatch, StatusEnum
from app.schemas import AssignmentRequest

router = APIRouter()

@router.post("/")
def assign_tasks(req: AssignmentRequest, db: Session = Depends(get_db)):
    # 0. Hapus AssignmentBatch lama untuk sesi ini agar tidak menumpuk
    db.query(AssignmentBatch).filter_by(session_id=req.session_id).delete(synchronize_session=False)
    db.commit()

    # 1. Reset semua assigned_to ke None agar bisa di-reassign bersih
    db.query(VerificationRecord).filter_by(
        session_id=req.session_id,
        is_deleted=False,
        record_type="beda"
    ).update({"assigned_to": None}, synchronize_session=False)
    db.commit()

    # 2. Ambil record yang belum diassign
    query = db.query(VerificationRecord).filter_by(
        session_id=req.session_id,
        is_deleted=False,
        assigned_to=None,
        record_type="beda"
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
    if req.method == "auto_unit":
        from app.models import User
        users = db.query(User).filter(User.id.in_(req.operator_ids)).all()
        
        unit_to_users = {}
        for u in users:
            if u.unit_penugasan:
                for unit in [x.strip() for x in u.unit_penugasan.split(',') if x.strip()]:
                    if unit not in unit_to_users:
                        unit_to_users[unit] = []
                    unit_to_users[unit].append(u.id)
                    
        unit_to_records = {}
        unassigned_count = 0
        
        for rec in records:
            u_val = rec.unit or ""
            if not u_val or u_val not in unit_to_users or not unit_to_users[u_val]:
                unassigned_count += 1
                continue
            if u_val not in unit_to_records:
                unit_to_records[u_val] = []
            unit_to_records[u_val].append(rec)
            
        batches_dict = {}
        for unit, recs in unit_to_records.items():
            ops = unit_to_users[unit]
            n_ops_for_unit = len(ops)
            chunk = len(recs) // n_ops_for_unit
            for i, op_id in enumerate(ops):
                start = i * chunk
                end = start + chunk if i < n_ops_for_unit - 1 else len(recs)
                batch_recs = recs[start:end]
                for r in batch_recs:
                    r.assigned_to = op_id
                if batch_recs:
                    batches_dict[op_id] = batches_dict.get(op_id, 0) + len(batch_recs)
                    
        for op_id, total in batches_dict.items():
            batch = AssignmentBatch(session_id=req.session_id, operator_id=op_id, total_assigned=total)
            db.add(batch)
            batches.append({"operator_id": op_id, "total": total})
            
        if unassigned_count > 0:
            pass # Maybe return a warning
            
    elif req.method == "auto" or (len(records) > 0 and n_ops > 1):
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

    assigned_count = sum(b['total'] for b in batches)
    warn_msg = f" Ada {unassigned_count} data gagal dibagikan karena tidak ada unit / petugas untuk unit tersebut." if req.method == "auto_unit" and 'unassigned_count' in locals() and unassigned_count > 0 else ""
    return {"message": f"Tugas berhasil dibagi ke {len(batches)} petugas.{warn_msg}", "distribution": batches, "total_processed": assigned_count}

@router.get("/progress")
def get_progress(session_id: int, db: Session = Depends(get_db)):
    from app.models import User
    from sqlalchemy import func

    # Ambil set user_id yang masih ada di DB
    existing_user_ids = {u.id for u in db.query(User.id).all()}

    batches = db.query(AssignmentBatch).filter_by(session_id=session_id).all()

    # Deduplikasi per operator_id — ambil yang total_assigned terbesar
    seen = {}
    for b in batches:
        # Skip ghost user (sudah dihapus)
        if b.operator_id not in existing_user_ids:
            continue
        if b.operator_id not in seen or b.total_assigned > seen[b.operator_id].total_assigned:
            seen[b.operator_id] = b

    result = []
    for b in seen.values():
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