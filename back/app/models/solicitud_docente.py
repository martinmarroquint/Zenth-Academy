# app/models/solicitud_docente.py
# MODELO DE SOLICITUDES PARA SER DOCENTE

from sqlalchemy import Column, String, DateTime, Text
from app.database import Base
from datetime import datetime, timezone
import uuid


class SolicitudDocente(Base):
    __tablename__ = "solicitudes_docente"
    __table_args__ = {'extend_existing': True}

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # Relación con usuario - Sin ForeignKey para compatibilidad con UUID de Supabase
    usuario_id = Column(String, nullable=False, index=True)
    
    # Datos de la solicitud
    especialidad = Column(String(200), nullable=False)  # Ej: "Matemáticas, Programación"
    institucion = Column(String(200), nullable=True)     # Universidad/Institución
    experiencia_anos = Column(String(20), nullable=True) # Años de experiencia
    experiencia_detalle = Column(Text, nullable=True)    # Descripción detallada de experiencia
    motivacion = Column(Text, nullable=True)             # Por qué quiere ser docente
    portafolio_url = Column(String(500), nullable=True)  # Link a portafolio o trabajos
    documentos_url = Column(String(500), nullable=True)  # Certificados/documentos respaldo
    
    # Estado de la solicitud
    # Estados: pendiente, en_revision, aprobado, rechazado
    estado = Column(String(20), default="pendiente", index=True)
    comentario_admin = Column(Text, nullable=True)       # Feedback del admin
    admin_id = Column(String, nullable=True)             # ID del admin que revisó
    fecha_revision = Column(DateTime, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    def __repr__(self):
        return f"<SolicitudDocente {self.id} - {self.estado}>"
