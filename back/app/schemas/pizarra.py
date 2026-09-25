# app/schemas/pizarra.py
# SCHEMAS PARA PIZARRA INTERACTIVA

from pydantic import BaseModel
from typing import Optional, List, Any, Dict
from datetime import datetime


class PizarraBase(BaseModel):
    titulo: str
    descripcion: Optional[str] = None
    tipo: str = 'blanca'
    configuracion: Optional[Dict] = {}
    # ✅ SEGURIDAD (ALTA 2): se conserva por compatibilidad, pero el servidor lo
    # IGNORA y usa el usuario autenticado (admin puede asignar otro explícitamente).
    creado_por: Optional[str] = None
    grupo_id: Optional[str] = None
    empresa_id: Optional[str] = None
    es_publica: bool = False


class PizarraCreate(PizarraBase):
    pass


class PizarraUpdate(BaseModel):
    titulo: Optional[str] = None
    descripcion: Optional[str] = None
    tipo: Optional[str] = None
    configuracion: Optional[Dict] = None
    # ✅ SEGURIDAD (ALTA 2): validado contra lista blanca en el endpoint
    # (ACTIVA/CERRADA/ARCHIVADA).
    estado: Optional[str] = None
    elementos: Optional[List] = None
    es_publica: Optional[bool] = None


class PizarraResponse(BaseModel):
    id: str
    titulo: str
    descripcion: Optional[str]
    tipo: str
    estado: str
    configuracion: Optional[Dict]
    elementos: Optional[List]
    capas: Optional[List[str]]
    colaboradores_activos: Optional[List]
    creado_por: str
    grupo_id: Optional[str]
    empresa_id: Optional[str]
    es_publica: bool
    created_at: Optional[datetime]
    updated_at: Optional[datetime]
    ultima_actividad: Optional[datetime]

    class Config:
        from_attributes = True


class SesionPizarraCreate(BaseModel):
    """✅ SEGURIDAD (ALTA 2): `usuario_id`, `rol`, `ip` y `user_agent` se
    conservan por compatibilidad, pero el servidor los IGNORA: la sesión usa el
    usuario autenticado, el rol se normaliza a EDITOR/LECTOR y la IP/user-agent
    se derivan del request."""
    usuario_id: Optional[str] = None
    rol: Optional[str] = 'EDITOR'
    ip: Optional[str] = None
    user_agent: Optional[str] = None


class ElementosPizarraUpdate(BaseModel):
    """Body de POST /pizarra/{pizarra_id}/elementos."""
    elementos: Optional[List[Any]] = []


class SesionPizarraResponse(BaseModel):
    id: str
    pizarra_id: str
    usuario_id: str
    rol: str
    cursor_posicion: Optional[Dict]
    zoom: float
    conectado: bool
    fecha_inicio: Optional[datetime]
    fecha_fin: Optional[datetime]
    duracion: int

    class Config:
        from_attributes = True


class MensajeResponse(BaseModel):
    mensaje: str
    ok: bool = True