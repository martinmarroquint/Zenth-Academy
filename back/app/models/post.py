# app/models/post.py
# MODELO PARA COMUNIDAD / FORO

from sqlalchemy import Column, String, Integer, Boolean, DateTime, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.database import Base
from datetime import datetime, timezone
import uuid


class Post(Base):
    __tablename__ = "posts"
    __table_args__ = {'extend_existing': True}

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    titulo = Column(String(300), nullable=False)
    contenido = Column(Text, nullable=True)
    categoria = Column(String(100), nullable=True)
    curso_id = Column(String, nullable=True, index=True)  # NULL = foro global; valor = foro del curso
    docente_id = Column(String, nullable=False)
    docente_nombre = Column(String(200), nullable=True)
    destacado = Column(Boolean, default=False)
    estado = Column(String(20), default="publicado")  # publicado, archivado
    comentarios_count = Column(Integer, default=0)
    likes_count = Column(Integer, default=0)
    vistas_count = Column(Integer, default=0)
    tags = Column(JSON, default=list)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # docente = relationship("Docente", backref="posts")
    comentarios = relationship("Comentario", back_populates="post", cascade="all, delete-orphan")


class Comentario(Base):
    __tablename__ = "comentarios"
    __table_args__ = {'extend_existing': True}

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    post_id = Column(String, ForeignKey("posts.id", ondelete="CASCADE"), nullable=False)
    docente_id = Column(String, nullable=False)
    docente_nombre = Column(String(200), nullable=True)
    contenido = Column(Text, nullable=False)
    likes_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    post = relationship("Post", back_populates="comentarios")


class LikePost(Base):
    __tablename__ = "likes_posts"
    __table_args__ = {'extend_existing': True}

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    post_id = Column(String, ForeignKey("posts.id", ondelete="CASCADE"), nullable=False)
    docente_id = Column(String, nullable=False)
    docente_nombre = Column(String(200), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))