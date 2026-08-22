# app/schemas/cuestionarios.py
# SCHEMAS PARA CUESTIONARIOS DINÁMICOS

from pydantic import BaseModel, Field
from typing import Optional, List, Any, Dict
from datetime import datetime


# ========== PREGUNTA ==========
class PreguntaCuestionarioBase(BaseModel):
    tipo: str
    orden: int = 0
    seccion: Optional[str] = None
    titulo: str
    descripcion: Optional[str] = None
    obligatoria: bool = True
    visible: bool = True
    opciones: Optional[List[str]] = []
    configuracion: Optional[Dict] = {}
    condicion: Optional[Dict] = None
    validaciones: Optional[List[dict]] = None
    puntaje: float = 0


class PreguntaCuestionarioCreate(PreguntaCuestionarioBase):
    pass


class PreguntaCuestionarioResponse(PreguntaCuestionarioBase):
    id: str
    cuestionario_id: str
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ========== CUESTIONARIO ==========
class CuestionarioBase(BaseModel):
    titulo: str
    descripcion: Optional[str] = None
    tipo: str  # examen, encuesta, evaluacion, feedback, test
    configuracion: Optional[Dict] = {}
    es_anonimo: bool = False
    permite_editar: bool = True
    mostrar_resultados: bool = False
    limite_respuestas: int = 0
    empresa_id: Optional[str] = None
    departamento: Optional[str] = None
    publico_objetivo: Optional[str] = None
    password: Optional[str] = None
    url_publica: Optional[str] = None
    fecha_inicio: Optional[datetime] = None
    fecha_fin: Optional[datetime] = None
    creado_por: Optional[str] = None


class CuestionarioCreate(CuestionarioBase):
    preguntas: List[PreguntaCuestionarioCreate] = []


class CuestionarioUpdate(BaseModel):
    titulo: Optional[str] = None
    descripcion: Optional[str] = None
    tipo: Optional[str] = None
    estado: Optional[str] = None
    configuracion: Optional[Dict] = None
    es_anonimo: Optional[bool] = None
    mostrar_resultados: Optional[bool] = None
    fecha_inicio: Optional[datetime] = None
    fecha_fin: Optional[datetime] = None
    limite_respuestas: Optional[int] = None
    password: Optional[str] = None
    url_publica: Optional[str] = None
    preguntas: Optional[List[PreguntaCuestionarioCreate]] = None


class CuestionarioResponse(BaseModel):
    id: str
    titulo: str
    descripcion: Optional[str]
    tipo: str
    estado: str
    configuracion: Optional[Dict]
    es_anonimo: bool
    permite_editar: bool
    mostrar_resultados: bool
    limite_respuestas: int
    empresa_id: Optional[str]
    departamento: Optional[str]
    publico_objetivo: Optional[str]
    url_publica: Optional[str]
    password: Optional[str] = None
    fecha_inicio: Optional[datetime]
    fecha_fin: Optional[datetime]
    created_at: Optional[datetime]
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


class CuestionarioDetailResponse(CuestionarioResponse):
    preguntas: List[PreguntaCuestionarioResponse] = []


# ========== RESPUESTA ==========
class RespuestaPreguntaCreate(BaseModel):
    pregunta_id: str
    valor_texto: Optional[str] = None
    valor_numero: Optional[float] = None
    valor_boolean: Optional[bool] = None
    valor_fecha: Optional[datetime] = None
    valor_opcion: Optional[str] = None
    valor_opciones: Optional[List[str]] = []
    valor_matriz: Optional[Dict] = {}
    valor_archivo: Optional[str] = None
    valor_slider: Optional[float] = None
    valor_estrellas: Optional[int] = None
    valor_emocion: Optional[str] = None
    valor_ordenamiento: Optional[List] = []
    tiempo_respuesta: int = 0


class RespuestaCuestionarioCreate(BaseModel):
    cuestionario_id: str
    usuario_id: Optional[str] = None
    email: Optional[str] = None
    nombre: Optional[str] = None
    empresa: Optional[str] = None
    departamento: Optional[str] = None
    ip: Optional[str] = None
    user_agent: Optional[str] = None
    ubicacion: Optional[Dict] = None
    tiempo_total: int = 0
    fecha_inicio: Optional[datetime] = None
    password: Optional[str] = None
    respuestas: List[RespuestaPreguntaCreate]


class RespuestaPreguntaResponse(BaseModel):
    id: str
    respuesta_id: str
    pregunta_id: str
    valor_texto: Optional[str]
    valor_numero: Optional[float]
    valor_boolean: Optional[bool]
    valor_fecha: Optional[datetime]
    valor_opcion: Optional[str]
    valor_opciones: Optional[List[str]]
    valor_matriz: Optional[Dict]
    valor_archivo: Optional[str]
    valor_slider: Optional[float]
    valor_estrellas: Optional[int]
    valor_emocion: Optional[str]
    valor_ordenamiento: Optional[List]
    tiempo_respuesta: int
    created_at: Optional[datetime]

    class Config:
        from_attributes = True


class RespuestaCuestionarioResponse(BaseModel):
    id: str
    cuestionario_id: str
    usuario_id: Optional[str]
    email: Optional[str]
    nombre: Optional[str]
    empresa: Optional[str]
    departamento: Optional[str]
    ip: Optional[str]
    user_agent: Optional[str]
    ubicacion: Optional[Dict]
    tiempo_total: int
    completado: bool
    fecha_inicio: Optional[datetime]
    fecha_fin: Optional[datetime]
    created_at: Optional[datetime]
    respuestas_preguntas: List[RespuestaPreguntaResponse] = []

    class Config:
        from_attributes = True


class MensajeResponse(BaseModel):
    mensaje: str
    ok: bool = True