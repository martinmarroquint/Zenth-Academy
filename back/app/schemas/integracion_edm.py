# app/schemas/integracion_edm.py
# SCHEMAS PARA INTEGRACIÓN CON EDM TEAM

from pydantic import BaseModel
from typing import Optional, List, Any, Dict
from datetime import datetime


class IntegracionBase(BaseModel):
    nombre: str
    tipo: str  # teams, slack, zoom, meet, classroom, whatsapp
    descripcion: Optional[str] = None
    configuracion: Optional[Dict] = {}
    empresa_id: str
    creado_por: str
    webhook_url: Optional[str] = None


class IntegracionCreate(IntegracionBase):
    pass


class IntegracionUpdate(BaseModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    configuracion: Optional[Dict] = None
    activo: Optional[bool] = None
    webhook_url: Optional[str] = None


class IntegracionResponse(BaseModel):
    id: str
    nombre: str
    tipo: str
    descripcion: Optional[str]
    configuracion: Optional[Dict]
    activo: bool
    webhook_url: Optional[str]
    empresa_id: str
    creado_por: str
    ultima_sincronizacion: Optional[datetime]
    created_at: Optional[datetime]
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


class EventoIntegracionCreate(BaseModel):
    tipo_evento: str
    datos: Dict
    prioridad: Optional[str] = 'normal'
    destino: Optional[str] = None


class EventoIntegracionResponse(BaseModel):
    id: str
    integracion_id: str
    tipo_evento: str
    datos: Dict
    prioridad: str
    estado: str
    error: Optional[str]
    intentos: int
    destino: Optional[str]
    created_at: Optional[datetime]
    updated_at: Optional[datetime]
    enviado_en: Optional[datetime]

    class Config:
        from_attributes = True


class MensajeResponse(BaseModel):
    mensaje: str
    ok: bool = True