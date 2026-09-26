# app/schemas/biblioteca.py
# SCHEMAS DE LA BIBLIOTECA INDEPENDIENTE (recursos + tareas)

from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class RecursoBibliotecaBase(BaseModel):
    tipo: str = "articulo"
    titulo: str
    descripcion: Optional[str] = None
    contenido: Optional[str] = None
    url: Optional[str] = None
    portada_url: Optional[str] = None
    tema: Optional[str] = None
    etiquetas: Optional[List[str]] = []
    fecha_limite: Optional[datetime] = None
    destacado: bool = False


class RecursoBibliotecaCreate(RecursoBibliotecaBase):
    pass


class RecursoBibliotecaUpdate(BaseModel):
    tipo: Optional[str] = None
    titulo: Optional[str] = None
    descripcion: Optional[str] = None
    contenido: Optional[str] = None
    url: Optional[str] = None
    portada_url: Optional[str] = None
    tema: Optional[str] = None
    etiquetas: Optional[List[str]] = None
    fecha_limite: Optional[datetime] = None
    destacado: Optional[bool] = None
    activo: Optional[bool] = None


class RecursoBibliotecaResponse(BaseModel):
    id: str
    autor_id: str
    autor_nombre: Optional[str]
    tipo: str
    titulo: str
    descripcion: Optional[str]
    contenido: Optional[str]
    url: Optional[str]
    portada_url: Optional[str]
    tema: Optional[str]
    etiquetas: Optional[List[str]]
    fecha_limite: Optional[datetime]
    token: Optional[str]
    activo: bool
    destacado: bool
    visitas: int
    created_at: Optional[datetime]
    updated_at: Optional[datetime]
    # ✅ Estado respecto al usuario que consulta
    favorito: bool = False
    completado: bool = False
    completados_count: int = 0
    es_autor: bool = False
    vencida: bool = False


class RecursoPublicoResponse(BaseModel):
    """Vista pública por token: sin IDs internos ni datos de otros usuarios."""
    tipo: str
    titulo: str
    descripcion: Optional[str]
    contenido: Optional[str]
    url: Optional[str]
    portada_url: Optional[str]
    tema: Optional[str]
    autor_nombre: Optional[str]
    fecha_limite: Optional[datetime]
    created_at: Optional[datetime]


class InteraccionRequest(BaseModel):
    comentario: Optional[str] = None


class InteraccionResponse(BaseModel):
    recurso_id: str
    tipo: str
    activo: bool
    completados_count: int = 0


class CompletadoResponse(BaseModel):
    usuario_id: str
    usuario_nombre: Optional[str]
    comentario: Optional[str]
    completado_en: Optional[datetime]


class TemaResponse(BaseModel):
    tema: str
    total: int


class EventoRequest(BaseModel):
    """Evento de actividad del alumno: vista | descarga."""
    tipo: str = "descarga"


class EventoResponse(BaseModel):
    recurso_id: str
    tipo: str
    veces: int
    ultima_vez: Optional[datetime] = None


class AnaliticaRecursoResponse(BaseModel):
    recurso_id: str
    titulo: str
    tipo: str
    visitas: int
    usuarios_unicos: int
    descargas: int
    favoritos: int
    completados: int


class AnaliticaAlumnoResponse(BaseModel):
    usuario_id: str
    usuario_nombre: Optional[str]
    eventos: int
    vistas: int
    descargas: int
    ultima_vez: Optional[datetime]


class AnaliticaResponse(BaseModel):
    total_recursos: int
    total_visitas: int
    total_descargas: int
    alumnos_activos: int
    top_recursos: List[AnaliticaRecursoResponse]
    alumnos: List[AnaliticaAlumnoResponse]


class ActividadItemResponse(BaseModel):
    recurso_id: str
    titulo: str
    tipo_recurso: str
    evento: str
    veces: int
    primera_vez: Optional[datetime]
    ultima_vez: Optional[datetime]


class ActividadResponse(BaseModel):
    usuario_id: str
    usuario_nombre: Optional[str]
    total_eventos: int
    items: List[ActividadItemResponse]


class MensajeResponse(BaseModel):
    mensaje: str
    ok: bool = True
