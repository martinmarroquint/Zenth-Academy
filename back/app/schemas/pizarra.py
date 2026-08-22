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
    creado_por: str
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
    usuario_id: str
    rol: Optional[str] = 'EDITOR'
    ip: Optional[str] = None
    user_agent: Optional[str] = None


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