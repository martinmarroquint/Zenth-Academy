# app/models/certificado.py
# VERSIÓN CORREGIDA - SIN RELACIONES

from sqlalchemy import Column, String, DateTime, JSON
from app.database import Base
from datetime import datetime, timezone
import uuid


class Certificado(Base):
    __tablename__ = "certificados"
    __table_args__ = {'extend_existing': True}

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    codigo = Column(String(50), unique=True, nullable=False, index=True)
    
    # ✅ SIN RELACIONES POR AHORA
    alumno_id_unificado = Column(String, nullable=True)
    
    estudiante_id = Column(String, nullable=False)
    estudiante_nombre = Column(String(200), nullable=False)
    curso_id = Column(String, nullable=False)
    curso_titulo = Column(String(300), nullable=False)
    docente_id = Column(String, nullable=False)
    docente_nombre = Column(String(200), nullable=True)
    fecha_emision = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    url = Column(String(500), nullable=True)
    estado = Column(String(20), default="emitido")
    metadata_extra = Column("metadata", JSON, default={})
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # ❌ RELACIÓN ELIMINADA
    # alumno_unificado = relationship(...)