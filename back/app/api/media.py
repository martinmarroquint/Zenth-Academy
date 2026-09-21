# app/api/media.py
# =====================================================
# PROXY DE IMÁGENES (Google Drive)
#
# ¿Por qué? Google rate-limita `lh3.googleusercontent.com` (HTTP 429) y
# `drive.google.com/thumbnail` puede fallar según la IP/red del usuario.
# Descargamos la imagen UNA vez, la guardamos en disco y la servimos desde
# nuestro propio servidor. Resultado: carga instantánea y sin dependencias.
#
# Endpoint PÚBLICO (sin auth) para que funcione en etiquetas <img>.
# =====================================================

import logging
import os
import re
import time
from typing import Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse, Response

from app.core.dependencies import require_admin
from app.core.errors import error_interno
from app.models.usuario import Usuario

logger = logging.getLogger(__name__)
router = APIRouter()

# Carpeta de caché (dentro de static/, ya montado por FastAPI)
CACHE_DIR = os.path.join("static", "drive_cache")
os.makedirs(CACHE_DIR, exist_ok=True)

# Validación estricta del ID (evita path traversal)
_FILE_ID_RE = re.compile(r"^[a-zA-Z0-9_-]{10,80}$")

# Tamaños permitidos
_SIZES_VALIDOS = {"w200", "w400", "w600", "w800", "w1000", "w1200", "w1600", "w2000"}

# Tiempo máximo de descarga desde Google
_TIMEOUT = 20.0


def _ruta_cache(file_id: str, sz: str) -> str:
    return os.path.join(CACHE_DIR, f"{file_id}_{sz}.img")


def _content_type_desde_bytes(data: bytes) -> str:
    """Detecta el tipo por los magic bytes (Google puede devolver HTML de error)."""
    if data[:3] == b"\xff\xd8\xff":
        return "image/jpeg"
    if data[:8] == b"\x89PNG\r\n\x1a\n":
        return "image/png"
    if data[:6] in (b"GIF87a", b"GIF89a"):
        return "image/gif"
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "image/webp"
    return ""


@router.get("/drive/estado")
async def estado_cache(current_user: Usuario = Depends(require_admin)):
    """Devuelve cuántas imágenes hay en caché y su tamaño total (solo admin)."""
    try:
        archivos = [f for f in os.listdir(CACHE_DIR) if f.endswith(".img")]
        total = sum(os.path.getsize(os.path.join(CACHE_DIR, f)) for f in archivos)
        return {
            "imagenes_en_cache": len(archivos),
            "tamano_total_kb": round(total / 1024, 1),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=error_interno(e, "Error consultando caché"))


@router.delete("/drive/cache")
async def limpiar_cache(current_user: Usuario = Depends(require_admin)):
    """Elimina la caché local de imágenes de Drive (solo admin)."""
    eliminados = 0
    try:
        for nombre in os.listdir(CACHE_DIR):
            if nombre.endswith(".img") or nombre.endswith(".tmp"):
                try:
                    os.remove(os.path.join(CACHE_DIR, nombre))
                    eliminados += 1
                except OSError:
                    pass
    except Exception as e:
        raise HTTPException(status_code=500, detail=error_interno(e, "Error limpiando caché"))
    return {"mensaje": f"Caché limpiada ({eliminados} archivos)", "ok": True}


@router.get("/drive/{file_id}")
async def proxy_drive_image(
    file_id: str,
    sz: str = Query("w2000", description="Tamaño solicitado a Google Drive"),
):
    """
    Sirve una imagen de Google Drive desde caché local.

    - Primera petición: descarga desde Google y guarda en disco.
    - Siguientes: sirve el archivo cacheado (instantáneo).
    """
    # 1) Validar entrada
    if not _FILE_ID_RE.match(file_id or ""):
        raise HTTPException(status_code=400, detail="ID de archivo inválido")
    if sz not in _SIZES_VALIDOS:
        sz = "w2000"

    ruta = _ruta_cache(file_id, sz)

    # 2) Cache hit
    if os.path.exists(ruta) and os.path.getsize(ruta) > 0:
        return FileResponse(
            ruta,
            media_type="image/jpeg",
            headers={"Cache-Control": "public, max-age=604800, immutable"},
        )

    # 3) Cache miss → descargar de Google
    url = f"https://drive.google.com/thumbnail?id={file_id}&sz={sz}"
    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT, follow_redirects=True) as client:
            resp = await client.get(
                url,
                headers={
                    "User-Agent": (
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                        "AppleWebKit/537.36 (KHTML, like Gecko) "
                        "Chrome/131.0.0.0 Safari/537.36"
                    ),
                    "Accept": "image/avif,image/webp,image/*,*/*;q=0.8",
                },
            )
    except Exception as e:
        logger.warning(f"No se pudo descargar la imagen de Drive {file_id}: {e}")
        raise HTTPException(status_code=502, detail="No se pudo obtener la imagen")

    if resp.status_code != 200:
        logger.warning(f"Drive devolvió {resp.status_code} para {file_id}")
        raise HTTPException(status_code=502, detail="Google Drive no devolvió la imagen")

    data = resp.content
    content_type = _content_type_desde_bytes(data)
    if not content_type:
        # Google devolvió HTML (archivo privado/inexistente) en vez de una imagen
        logger.warning(f"Drive devolvió contenido no-imagen para {file_id}")
        raise HTTPException(status_code=404, detail="El archivo no es una imagen accesible")

    # 4) Guardar en caché (atómico)
    try:
        tmp = f"{ruta}.tmp"
        with open(tmp, "wb") as f:
            f.write(data)
        os.replace(tmp, ruta)
    except Exception as e:
        logger.warning(f"No se pudo cachear la imagen {file_id}: {e}")

    return Response(
        content=data,
        media_type=content_type,
        headers={
            "Cache-Control": "public, max-age=604800, immutable",
            "X-Cache": "MISS",
        },
    )

