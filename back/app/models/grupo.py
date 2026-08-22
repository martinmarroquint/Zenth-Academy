# app/models/grupo.py
# VERSION ACTUALIZADA - CON SOPORTE PARA COMPARTIR

from sqlalchemy import Column, String, DateTime, JSON, Boolean
from app.database import Base
from datetime import datetime, timezone


class Grupo(Base):
    __tablename__ = "grupos"
    __table_args__ = {'extend_existing': True}

    id = Column(String, primary_key=True)
    nombre = Column(String(200), nullable=False)
    docente_id = Column(String(100), default="default")
    alumnos = Column(JSON, default=list)
    asistencias = Column(JSON, default=list)
    recursos = Column(JSON, default=list)
    session_activo = Column(String(100), nullable=True)
    compartir_con_todos = Column(Boolean, default=True)  # Si True, todos los alumnos ven
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))