# app/schemas/post.py
# SCHEMAS PARA FORO / COMUNIDAD

from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class PostBase(BaseModel):
    titulo: str
    contenido: Optional[str] = None
    categoria: Optional[str] = "general"
    curso_id: Optional[str] = None  # NULL = foro global; valor = foro del curso
    tags: Optional[List] = []


class PostCreate(PostBase):
    docente_id: Optional[str] = None


class PostUpdate(BaseModel):
    titulo: Optional[str] = None
    contenido: Optional[str] = None
    categoria: Optional[str] = None
    curso_id: Optional[str] = None
    estado: Optional[str] = None
    tags: Optional[List] = None


class ComentarioResponse(BaseModel):
    id: str
    post_id: str
    docente_id: str
    docente_nombre: Optional[str]
    contenido: str
    likes_count: int
    created_at: Optional[datetime]
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


class PostResponse(BaseModel):
    id: str
    titulo: str
    contenido: Optional[str]
    categoria: Optional[str]
    curso_id: Optional[str]
    docente_id: str
    docente_nombre: Optional[str]
    destacado: bool
    estado: str
    comentarios_count: int
    likes_count: int
    vistas_count: int
    tags: Optional[List]
    created_at: Optional[datetime]
    updated_at: Optional[datetime]
    comentarios: Optional[List[ComentarioResponse]] = []

    class Config:
        from_attributes = True


class ComentarioCreate(BaseModel):
    contenido: str
    docente_id: Optional[str] = None


class LikeResponse(BaseModel):
    post_id: str
    liked: bool
    likes_count: int


class MensajeResponse(BaseModel):
    mensaje: str
    ok: bool = True