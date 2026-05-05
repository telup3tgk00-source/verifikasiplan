from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import VerificationRecord, StatusEnum
from openpyxl import Workbook
from openpyxl.styles import PatternFill, Font
from datetime import datetime
import io

router = APIRouter()

STATUS_COLORS = {
    "VERIFIED_OK":          ("D1EDCC", "155724"),
    "VERIFIED_REJECT":      ("FFDDDD", "721C24"),
    "NEED_INVESTIGATION":   ("FFF0D0", "663D00"),
    "PENDING":              ("F0F0F0", "555555"),
}

@router.get("/")
def export_excel(
    session_id: int = Query(...),
    filter_status: str = Query("all"),
    operator_id: int = Query(None),
    db: Session = Depends(get_db)
):
    q = db.query(VerificationRecord).filter_by(is_deleted=False, session_id=session_id)
    if filter_status != "all":
        q = q.filter(VerificationRecord.status == filter_status)
    if operator_id:
        q = q.filter(VerificationRecord.assigned_to == operator_id)
    
    from app.models import User
    records = q.all()

    wb = Workbook()
    ws = wb.active
    ws.title = "Data Verifikasi"

    headers = ["ID Pelanggan","Stand AI","Stand Petugas","Selisih",
               "Merek AI","Merek Petugas","Tipe AI","Tipe Petugas",
               "Status","Catatan","Verifikator","Waktu Verifikasi"]
    ws.append(headers)

    # Header style
    for cell in ws[1]:
        cell.font = Font(bold=True, color="FFFFFF")
        cell.fill = PatternFill("solid", fgColor="0D2A5E")

    # Ambil map user untuk efisiensi
    users = {u.id: u.full_name for u in db.query(User).all()}

    for rec in records:
        status_val = rec.status.value if rec.status else "PENDING"
        ws.append([
            rec.id_pelanggan, rec.stand_ai, rec.stand_petugas, rec.selisih,
            rec.merek_ai, rec.merek_petugas, rec.tipe_ai, rec.tipe_petugas,
            status_val, rec.catatan or "", 
            users.get(rec.assigned_to, "-") if rec.assigned_to else "-",
            rec.verified_at.strftime("%Y-%m-%d %H:%M") if rec.verified_at else ""
        ])
        bg, _ = STATUS_COLORS.get(status_val, ("FFFFFF", "000000"))
        for cell in ws[ws.max_row]:
            cell.fill = PatternFill("solid", fgColor=bg)

    # Sheet 2 — Summary
    ws2 = wb.create_sheet("Summary")
    ws2.append(["Status", "Jumlah"])
    for s in StatusEnum:
        count = db.query(VerificationRecord).filter_by(
            session_id=session_id, status=s, is_deleted=False).count()
        ws2.append([s.value, count])

    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    fname = f"verifikasi_kwh_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
    return StreamingResponse(buf, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                             headers={"Content-Disposition": f"attachment; filename={fname}"})