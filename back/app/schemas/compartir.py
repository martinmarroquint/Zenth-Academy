# app/schemas/compartir.py
# SCHEMAS PARA "COMPARTIR EN CLASE" - CON QR EXPIRACIÓN

from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime


class EnviarMaterialRequest(BaseModel):
    material_id: str


class SalaEstadoResponse(BaseModel):
    """Estado público de la sala (sin datos del docente)."""
    codigo: str
    estado: str  # ESPERANDO | ACTIVO | CERRADO
    material_activo: Optional[Dict[str, Any]] = None
    fecha_inicio: Optional[datetime] = None
    fecha_fin: Optional[datetime] = None
    duracion_segundos: int = 0
    qr_token: Optional[str] = None
    qr_expira: Optional[str] = None
    qr_restante: Optional[int] = 0


class VincularResponse(BaseModel):
    ok: bool
    es_docente: bool = False
    es_dueño: bool = False
    sala: Optional[SalaEstadoResponse] = None
    mensaje: Optional[str] = None


class SalaDocenteResponse(BaseModel):
    """Sala activa del docente (para su panel)."""
    codigo: str
    url_publica: str
    estado: str
    material_activo: Optional[Dict[str, Any]] = None
    fecha_inicio: Optional[datetime] = None
    qr_token: Optional[str] = None
    qr_expira: Optional[str] = None