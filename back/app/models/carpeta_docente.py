# app/models/carpeta_docente.py
# MODELO PARA CARPETA DOCENTE

from sqlalchemy import Column, String, JSON, DateTime
from app.database import Base
from datetime import datetime, timezone
import uuid


class CarpetaDocente(Base):
    __tablename__ = "carpetas_docentes"
    __table_args__ = {'extend_existing': True}

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    nombre = Column(String(300), default="Mi Carpeta")
    docente_id = Column(String, nullable=False, index=True)
    archivos = Column(JSON, default=list)
    recursos = Column(JSON, default=list)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))