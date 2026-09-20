# app/models/comentario_leccion.py
# =====================================================
# COMENTARIOS POR LECCIÓN
#
# Independiente del Foro del curso (Post/Comentario). Cada comentario
# pertenece a un curso + lección concretos y guarda un snapshot del
# autor (id, nombre y rol) para poder renderizarlo sin JOIN.
#
# Convención: igual que el resto de modelos de cursos, se usan columnas
# String planas (sin ForeignKey). La limpieza en cascada se hace de forma
# explícita al eliminar un curso (ver eliminar_curso en api/cursos.py).
# =====================================================

from sqlalchemy import Column, String, Integer, DateTime, Text
from app.database import Base
from datetime import datetime, timezone
import uuid


class ComentarioLeccion(Base):
    __tablename__ = "comentarios_lecciones"
    __table_args__ = {'extend_existing': True}

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    curso_id = Column(String, nullable=False, index=True)
    leccion_id = Column(String, nullable=False, index=True)
    usuario_id = Column(String, nullable=False, index=True)
    usuario_nombre = Column(String(200), nullable=True)
    usuario_rol = Column(String(20), nullable=True)
    contenido = Column(Text, nullable=False)
    likes_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class LikeComentarioLeccion(Base):
    """Like de un usuario sobre un comentario de lección (1 por usuario)."""

    __tablename__ = "likes_comentarios_lecciones"
    __table_args__ = {'extend_existing': True}

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    comentario_id = Column(String, nullable=False, index=True)
    usuario_id = Column(String, nullable=False, index=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
