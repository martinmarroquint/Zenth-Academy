# app/models/material_compartido.py
# MODELO PARA EL PILAR MATERIALES: recursos compartibles con QR (sin login)

from sqlalchemy import Column, String, Text, Integer, Boolean, DateTime
from app.database import Base
from datetime import datetime, timezone
import uuid


class MaterialCompartido(Base):
    __tablename__ = "materiales_compartidos"
    __table_args__ = {'extend_existing': True}

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    docente_id = Column(String, nullable=False, index=True)
    docente_nombre = Column(String(200), nullable=True)

    titulo = Column(String(300), nullable=False)
    descripcion = Column(Text, nullable=True)
    # tipo: enlace | texto | archivo
    tipo = Column(String(20), default="enlace")
    # contenido: URL (tipo=enlace) o texto (tipo=texto)
    contenido = Column(Text, nullable=True)
    # nombre_archivo + url_archivo para tipo=archivo (si se sube un archivo)
    nombre_archivo = Column(String(300), nullable=True)
    url_archivo = Column(String(500), nullable=True)

    # Token público para acceder sin login (va en el QR)
    token = Column(String(64), unique=True, nullable=False, index=True)
    activo = Column(Boolean, default=True)
    visitas = Column(Integer, default=0)

    # INTEGRACIÓN CON EL RESTO DEL PROYECTO (recursos unificados)
    # Un material puede estar asociado a un grupo de examen, a un curso
    # o ser independiente (carpeta docente / pilar materiales).
    grupo_id = Column(String, nullable=True, index=True)
    curso_id = Column(String, nullable=True, index=True)
    # categoria: pdf | ppt | video | documento | otro (solo informativa)
    categoria = Column(String(30), nullable=True)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))