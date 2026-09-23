# app/core/certificado_firma.py
# =====================================================
# FIRMA HMAC PARA CERTIFICADOS
# Genera una firma criptográfica sobre los datos del certificado
# para garantizar integridad y no-repudio.
# =====================================================

import hmac
import hashlib
from datetime import datetime

from app.core.security import SECRET_KEY


def _normalizar_fecha(fecha) -> str:
    """Normaliza datetime a string ISO estable para la firma."""
    if fecha is None:
        return ""
    if isinstance(fecha, str):
        return fecha
    if isinstance(fecha, datetime):
        return fecha.isoformat()
    return str(fecha)


def calcular_firma(
    codigo: str,
    estudiante_id: str,
    curso_id: str,
    fecha_emision,
) -> str:
    """
    Calcula HMAC-SHA256 sobre los datos identitarios del certificado.
    La firma se genera al emitir y se verifica al validar públicamente.
    """
    payload = "|".join([
        str(codigo or ""),
        str(estudiante_id or ""),
        str(curso_id or ""),
        _normalizar_fecha(fecha_emision),
    ])
    return hmac.new(
        SECRET_KEY.encode("utf-8"),
        payload.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


def verificar_firma(
    firma_esperada: str,
    codigo: str,
    estudiante_id: str,
    curso_id: str,
    fecha_emision,
) -> bool:
    """Verifica que la firma almacenada coincida con los datos actuales."""
    if not firma_esperada:
        return False
    recalculada = calcular_firma(codigo, estudiante_id, curso_id, fecha_emision)
    return hmac.compare_digest(str(firma_esperada), recalculada)
