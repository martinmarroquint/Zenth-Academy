# app/models/biblioteca.py
# BIBLIOTECA INDEPENDIENTE: recursos (artículos, libros, videos, enlaces) y
# tareas publicadas por docentes, visibles para TODOS los alumnos sin depender
# de ningún curso.

from sqlalchemy import (
    Column, String, Text, Integer, Boolean, DateTime, JSON, UniqueConstraint
)
from app.database import Base
from datetime import datetime, timezone
import uuid


class RecursoBiblioteca(Base):
    __tablename__ = "biblioteca_recursos"
    __table_args__ = {'extend_existing': True}

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    autor_id = Column(String, nullable=False, index=True)
    autor_nombre = Column(String(200), nullable=True)

    # tipo: articulo | libro | video | documento | enlace | tarea
    tipo = Column(String(20), default="articulo", index=True)
    titulo = Column(String(300), nullable=False)
    descripcion = Column(Text, nullable=True)
    # contenido: texto del artículo o URL (según tipo)
    contenido = Column(Text, nullable=True)
    # url: enlace externo / archivo (libro PDF, video, etc.)
    url = Column(String(700), nullable=True)
    portada_url = Column(String(700), nullable=True)
    tema = Column(String(120), nullable=True, index=True)
    etiquetas = Column(JSON, default=list)

    # ✅ Solo para tipo='tarea': fecha límite opcional
    fecha_limite = Column(DateTime, nullable=True)

    # Token público para compartir el recurso fuera de la plataforma (link/QR)
    token = Column(String(64), unique=True, nullable=False, index=True)
    activo = Column(Boolean, default=True, index=True)
    destacado = Column(Boolean, default=False)
    visitas = Column(Integer, default=0)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )


class BibliotecaInteraccion(Base):
    """Favoritos de recursos y entregas (marcas) de tareas."""

    __tablename__ = "biblioteca_interacciones"
    __table_args__ = (
        UniqueConstraint(
            "recurso_id", "usuario_id", "tipo", name="uq_biblioteca_interaccion"
        ),
        {'extend_existing': True},
    )

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    recurso_id = Column(String, nullable=False, index=True)
    usuario_id = Column(String, nullable=False, index=True)
    # tipo: favorito | completado
    tipo = Column(String(20), nullable=False)
    # ✅ Respuesta del alumno en una tarea
    comentario = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
