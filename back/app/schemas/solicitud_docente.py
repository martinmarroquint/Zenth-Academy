# app/schemas/solicitud_docente.py
# SCHEMAS PARA SOLICITUDES DE DOCENTE

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class SolicitudDocenteCreate(BaseModel):
    """Schema para crear una solicitud de docente"""
    especialidad: str = Field(..., max_length=200, description="Especialidad del docente")
    institucion: Optional[str] = Field(None, max_length=200, description="Institución educativa")
    experiencia_anos: Optional[str] = Field(None, max_length=20, description="Años de experiencia")
    experiencia_detalle: Optional[str] = Field(None, description="Detalle de experiencia profesional")
    motivacion: Optional[str] = Field(None, description="Motivación para ser docente")
    portafolio_url: Optional[str] = Field(None, max_length=500, description="URL de portafolio")
    documentos_url: Optional[str] = Field(None, max_length=500, description="URL de documentos respaldo")


class SolicitudDocenteUpdate(BaseModel):
    """Schema para actualizar una solicitud (admin)"""
    estado: str = Field(..., pattern="^(pendiente|en_revision|aprobado|rechazado)$")
    comentario_admin: Optional[str] = Field(None, description="Comentario del admin")


class SolicitudDocenteResponse(BaseModel):
    """Schema de respuesta para solicitudes"""
    id: str
    usuario_id: str
    usuario_nombre: Optional[str] = None
    usuario_email: Optional[str] = None
    usuario_foto: Optional[str] = None
    
    especialidad: str
    institucion: Optional[str] = None
    experiencia_anos: Optional[str] = None
    experiencia_detalle: Optional[str] = None
    motivacion: Optional[str] = None
    portafolio_url: Optional[str] = None
    documentos_url: Optional[str] = None
    
    estado: str
    comentario_admin: Optional[str] = None
    admin_id: Optional[str] = None
    fecha_revision: Optional[datetime] = None
    
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class SolicitudDocenteListResponse(BaseModel):
    """Schema para lista de solicitudes"""
    total: int
    solicitudes: list[SolicitudDocenteResponse]


class MensajeResponse(BaseModel):
    """Schema genérico para mensajes"""
    mensaje: str
    ok: bool = True
