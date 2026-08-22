# app/schemas/certificado.py
# SCHEMAS PARA CERTIFICADOS

from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class CertificadoCreate(BaseModel):
    codigo: Optional[str] = None
    estudiante_id: str
    estudiante_nombre: str
    curso_id: str
    curso_titulo: str
    docente_id: str
    docente_nombre: Optional[str] = None
    url: Optional[str] = None


class CertificadoUpdate(BaseModel):
    estudiante_nombre: Optional[str] = None
    curso_titulo: Optional[str] = None
    docente_nombre: Optional[str] = None
    url: Optional[str] = None
    estado: Optional[str] = None


class CertificadoResponse(BaseModel):
    id: str
    codigo: str
    estudiante_id: str
    estudiante_nombre: str
    curso_id: str
    curso_titulo: str
    docente_id: str
    docente_nombre: Optional[str]
    fecha_emision: Optional[datetime]
    url: Optional[str]
    estado: str
    created_at: Optional[datetime]
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


class MensajeResponse(BaseModel):
    mensaje: str
    ok: bool = True