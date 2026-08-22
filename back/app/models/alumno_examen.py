# app/models/alumno_examen.py
# VERSION ACTUALIZADA - CON CAMPOS PARA COMPARTIR

from sqlalchemy import Column, String, DateTime, Text, Boolean
from app.database import Base
from datetime import datetime, timezone


class AlumnoExamen(Base):
    __tablename__ = "alumnos_examenes"
    __table_args__ = {'extend_existing': True}

    id = Column(String, primary_key=True)
    dni = Column(String(20), default="")
    grado = Column(String(50), default="")
    nombres = Column(Text, nullable=False)
    apellidos = Column(Text, nullable=False)
    email = Column(String(100), default="")
    grupo = Column(String(50), default="")
    grupo_id = Column(String(100), nullable=True)
    activo = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))