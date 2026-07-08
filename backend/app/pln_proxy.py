"""
PLN ACMT Proxy Module — Full Cookie Mode
User paste SELURUH string cookie dari browser DevTools,
backend forward semua cookie ke ICONPLN.
"""

import logging
import httpx
import asyncio

logger = logging.getLogger(__name__)

ACMT_BASE_URL = "https://portalapp.iconpln.co.id/acmt"
PHOTO_URL     = f"{ACMT_BASE_URL}/DisplayBlobServlet1"

# ─── Session Cache (in-memory) ────────────────────────────────────────────────
_session_cache: dict = {
    "cookie_string": None,   # full cookie string dari browser
    "set_by":        None,
    "set_at":        None,
}

_BASE_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "image/webp,image/apng,image/*,*/*;q=0.8",
    "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8",
    "Accept-Encoding": "gzip, deflate, br",
    "Connection": "keep-alive",
    "Referer": f"{ACMT_BASE_URL}/Main.htm",
}


def set_cookie_string(cookie_string: str, set_by: str = "admin") -> None:
    """Simpan full cookie string dari browser."""
    from datetime import datetime
    cleaned = cookie_string.strip()
    _session_cache["cookie_string"] = cleaned
    _session_cache["set_by"]        = set_by
    _session_cache["set_at"]        = datetime.now().isoformat()
    # Log tanpa expose nilai cookie
    keys = [part.split("=")[0].strip() for part in cleaned.split(";") if "=" in part]
    logger.info("Cookie diupdate oleh %s — keys: %s", set_by, ", ".join(keys))


def get_session_status() -> dict:
    cookie_string = _session_cache.get("cookie_string")
    keys = []
    if cookie_string:
        keys = [p.split("=")[0].strip() for p in cookie_string.split(";") if "=" in p]
    return {
        "has_session": bool(cookie_string),
        "set_by":      _session_cache.get("set_by"),
        "set_at":      _session_cache.get("set_at"),
        "cookie_keys": keys,   # nama-nama cookie yang tersimpan (tanpa nilai)
    }


async def fetch_photo(idpel: str, blth: str, fotoke: str, client_cookie: str = None) -> tuple[bytes, str]:
    """
    Ambil foto meter dari ACMT PLN atau R2 Backup.
    """
    print(f"[FOTO] idpel={idpel} blth={blth} fotoke={fotoke}")

    # ========================================================
    # BYPASS UNTUK BULAN 7 (202607) - AMBIL DARI R2 CLOUDFLARE
    # ========================================================
    if blth == "202607":
        if fotoke != "1":
            raise RuntimeError("Backup Lampung hanya memiliki 1 foto utama per IDPEL")
            
        r2_url = f"https://pub-da52918545424c74a6ab1ec35249a14e.r2.dev/{idpel}.jpg"
        print(f"[FOTO] BYPASS ACMT -> Ambil dari R2: {r2_url}")
        
        max_retries = 3
        for attempt in range(max_retries):
            try:
                async with httpx.AsyncClient(timeout=15.0) as r2_client:
                    r2_resp = await r2_client.get(r2_url)
                    
                    if r2_resp.status_code == 200:
                        return r2_resp.content, r2_resp.headers.get("content-type", "image/jpeg")
                    else:
                        raise RuntimeError(f"Foto idpel {idpel} tidak tersedia di server R2 Backup (Status: {r2_resp.status_code})")
            except httpx.RequestError as e:
                if attempt < max_retries - 1:
                    print(f"[FOTO] Retry {attempt+1}/{max_retries} ke R2 untuk {idpel} karena error: {e}")
                    await asyncio.sleep(1)
                else:
                    raise RuntimeError(f"Gagal mengambil foto dari R2 setelah {max_retries} percobaan: {e}")
    # ========================================================

    # --- LOGIKA NORMAL KE ACMT (UNTUK BULAN LAIN) ---
    cookie_string = client_cookie or _session_cache.get("cookie_string")
    
    if client_cookie:
        print("[FOTO] Menggunakan cookie personal dari browser client!")
    else:
        print(f"[FOTO] Cookie cache isi: {list(_session_cache.keys())}")
        print(f"[FOTO] Cookie value ada: {bool(cookie_string)}")
    
    if not cookie_string:
        raise RuntimeError(
            "Cookie ACMT belum diset. "
            "Pastikan Ekstensi Chrome Metrik berjalan atau sinkronkan sesi."
        )

    params = {
        "idpel":       idpel,
        "nomor_meter": "null",
        "fotoke":      fotoke,
        "blth":        blth,
        "isPhoto":     "null",
        "unitup":      "17130"
    }

    headers = {
        **_BASE_HEADERS,
        "Cookie": cookie_string,   # Forward SEMUA cookie
    }

    async with httpx.AsyncClient(
        timeout=30.0,
        verify=False,
        follow_redirects=False,
    ) as client:
        resp = await client.get(PHOTO_URL, params=params, headers=headers)

    # Tangkap jika server ACMT merotasi cookie (misal: TS01)
    if resp.cookies:
        current_cookies = {}
        for pair in cookie_string.split(";"):
            if "=" in pair:
                k, v = pair.strip().split("=", 1)
                current_cookies[k] = v
        
        updated = False
        for k, v in resp.cookies.items():
            if current_cookies.get(k) != v:
                current_cookies[k] = v
                updated = True
                logger.info("ACMT Server rotated cookie: %s", k)
        
        if updated:
            new_cookie_string = "; ".join(f"{k}={v}" for k, v in current_cookies.items())
            _session_cache["cookie_string"] = new_cookie_string

    content_type = resp.headers.get("content-type", "").lower()
    status_code  = resp.status_code

    logger.info(
        "ACMT [%d] ct=%s size=%d — idpel=%s blth=%s fotoke=%s",
        status_code, content_type, len(resp.content), idpel, blth, fotoke
    )

    # ─── Sukses: response adalah gambar ───────────────────────────────────────
    if status_code == 200 and len(resp.content) > 0 and (
        content_type.startswith("image/")
        or content_type == "application/octet-stream"
    ):
        ct = content_type if content_type.startswith("image/") else "image/jpeg"
        return resp.content, ct

    # Kadang server kembalikan binary tanpa content-type yang benar
    if status_code == 200 and len(resp.content) > 100:
        # Cek magic bytes JPEG: FF D8 FF
        if resp.content[:3] == b'\xff\xd8\xff':
            logger.info("Terdeteksi JPEG dari magic bytes")
            return resp.content, "image/jpeg"
        # Magic bytes PNG: 89 50 4E 47
        if resp.content[:4] == b'\x89PNG':
            return resp.content, "image/png"

    # ─── Redirect → session/cookie expired ────────────────────────────────────
    if status_code in (301, 302, 303, 307, 308):
        location = resp.headers.get("location", "")
        logger.warning("Redirect ke: %s — cookie mungkin expired (atau foto tidak ada)", location)
        # Jangan langsung hapus _session_cache["cookie_string"] karena bisa jadi hanya foto yang tidak ada!
        raise RuntimeError(
            "SESSION_EXPIRED: ACMT merespon Redirect (foto tidak ditemukan atau sesi kadaluarsa)."
        )

    # ─── Server Error ─────────────────────────────────────────────────────────
    if status_code >= 500:
        raise RuntimeError(
            f"Server ACMT Error (HTTP {status_code}): "
            f"(idpel={idpel} blth={blth} fotoke={fotoke})"
        )

    # ─── HTML → halaman login atau error ──────────────────────────────────────
    if "text/html" in content_type or status_code in (401, 403):
        body = resp.text[:400] if resp.content else ""
        logger.warning("Response HTML/401: %s", body[:200])
        if any(k in body.lower() for k in ("login", "captcha", "j_username")):
            _session_cache["cookie_string"] = None
            raise RuntimeError(
                "SESSION_EXPIRED: Cookie ACMT sudah kadaluarsa. "
                "Login ulang di browser dan update cookie di panel Sesi ACMT."
            )
        raise RuntimeError(
            f"Foto tidak tersedia (idpel={idpel} blth={blth} fotoke={fotoke})"
        )

    # ─── Lainnya ──────────────────────────────────────────────────────────────
    if status_code == 200 and len(resp.content) == 0:
        raise RuntimeError(
            f"Foto tidak tersedia — response kosong "
            f"(idpel={idpel} blth={blth} fotoke={fotoke})"
        )

    raise RuntimeError(
        f"Gagal mengambil foto: HTTP {status_code} ct={content_type} "
        f"(idpel={idpel} blth={blth} fotoke={fotoke})"
    )
