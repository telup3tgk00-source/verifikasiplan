"""
Router: /api/foto — Proxy foto meter ACMT PLN (full cookie mode)
"""

import logging
import httpx
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import Response
from pydantic import BaseModel

from app.pln_proxy import fetch_photo, set_cookie_string, get_session_status
from app.pln_proxy import _session_cache, PHOTO_URL, _BASE_HEADERS

logger = logging.getLogger(__name__)
router = APIRouter()


class SessionPayload(BaseModel):
    cookie_string: str   # full cookie: "JSESSIONID=x; TS01be508d=x; ..."
    set_by: str = "admin"


@router.get("/foto/session/status")
def session_status():
    """Cek status cookie ACMT yang tersimpan."""
    return get_session_status()


@router.post("/foto/session")
def update_session(payload: SessionPayload):
    """
    Simpan full cookie string dari browser.
    Format: JSESSIONID=xxx; TS01be508d=xxx; Pool_ACMTJava=xxx; TS017170f7=xxx
    """
    if not payload.cookie_string or len(payload.cookie_string) < 10:
        raise HTTPException(status_code=400, detail="Cookie string tidak valid")
    if "JSESSIONID" not in payload.cookie_string:
        raise HTTPException(status_code=400, detail="Cookie harus mengandung JSESSIONID")
    set_cookie_string(payload.cookie_string, set_by=payload.set_by)
    status = get_session_status()
    return {"ok": True, "message": "Cookie ACMT berhasil diupdate", "cookie_keys": status["cookie_keys"]}


@router.get("/foto")
async def get_foto_meter(
    idpel:  str = Query(...),
    blth:   str = Query(...),
    fotoke: str = Query(...),
):
    """Proxy foto meter dari ACMT PLN ICONPLN."""
    try:
        image_bytes, content_type = await fetch_photo(idpel=idpel, blth=blth, fotoke=fotoke)
        return Response(
            content=image_bytes,
            media_type=content_type or "image/jpeg",
            headers={"Cache-Control": "private, max-age=3600"},
        )
    except RuntimeError as exc:
        msg = str(exc)
        if "SESSION_EXPIRED" in msg or "belum diset" in msg:
            raise HTTPException(status_code=401, detail=msg)
        if "tidak tersedia" in msg:
            raise HTTPException(status_code=404, detail=msg)
        raise HTTPException(status_code=502, detail=msg)
    except Exception as exc:
        logger.exception("Error tidak terduga saat ambil foto meter")
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/foto/debug")
async def debug_acmt_response(
    idpel:  str = Query(...),
    blth:   str = Query(...),
    fotoke: str = Query("1"),
):
    """Debug: lihat raw response dari ACMT tanpa filter."""
    cookie_string = _session_cache.get("cookie_string", "")
    params  = {"idpel": idpel, "nomor_meter": "null", "fotoke": fotoke, "blth": blth, "isPhoto": "null"}
    headers = {**_BASE_HEADERS, "Cookie": cookie_string}

    async with httpx.AsyncClient(timeout=20.0, verify=False, follow_redirects=False) as client:
        resp = await client.get(PHOTO_URL, params=params, headers=headers)

    ct = resp.headers.get("content-type", "")
    return {
        "status_code":    resp.status_code,
        "content_type":   ct,
        "content_length": len(resp.content),
        "resp_headers":   dict(resp.headers),
        "body_preview":   resp.text[:500] if "text" in ct else f"<binary {len(resp.content)} bytes>",
        "magic_bytes_hex": resp.content[:8].hex() if resp.content else "",
        "cookie_keys_sent": [p.split("=")[0].strip() for p in cookie_string.split(";") if "=" in p],
    }
