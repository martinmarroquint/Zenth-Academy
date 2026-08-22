# app/schemas/curso.py
# SCHEMAS COMPLETOS - CURSOS, PAGOS, SOLICITUDES, BLOQUEOS, EVALUACIONES

from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Any
from datetime import datetime
from decimal import Decimal
import enum


# =============================================
# TIPOS DE LECCIÓN (enum validado)
# =============================================

class TipoLeccion(str, enum.Enum):
    VIDEO = "video"
    TEXTO = "texto"
    QUIZ = "quiz"
    EXAMEN = "examen"
    RECURSO = "recurso"
    PIZARRA = "pizarra"

    @classmethod
    def valores(cls) -> List[str]:
        return [t.value for t in cls]

    @classmethod
    def validar(cls, valor: Any) -> Any:
        if valor is None:
            return valor
        return cls(valor).value


def _normalizar_modulos(modulos: Optional[List]) -> List:
    """Normaliza y valida la estructura de módulos/lecciones.
    
    - Garantiza ids únicos (genera si faltan).
    - Valida el tipo de cada lección contra TipoLeccion.
    - Asegura campos mínimos (titulo, tipo).
    - Normaliza 'cuestionario' → 'quiz' (alias legacy).
    """
    if not modulos:
        return []
    if not isinstance(modulos, list):
        raise ValueError("'modulos' debe ser una lista de módulos")

    import uuid as _uuid
    normalizados = []
    for idx, modulo in enumerate(modulos):
        if not isinstance(modulo, dict):
            raise ValueError(f"Módulo {idx} no es un objeto válido")
        mod = dict(modulo)
        mod.setdefault("id", str(_uuid.uuid4()))
        mod.setdefault("titulo", f"Módulo {idx + 1}")

        lecciones = mod.get("lecciones")
        if lecciones is None:
            lecciones = []
        if not isinstance(lecciones, list):
            raise ValueError(f"Las lecciones del módulo '{mod.get('titulo')}' deben ser una lista")

        lecciones_norm = []
        for l_idx, leccion in enumerate(lecciones):
            if not isinstance(leccion, dict):
                raise ValueError(f"Lección {l_idx} del módulo '{mod.get('titulo')}' no es válida")
            lec = dict(leccion)
            lec.setdefault("id", str(_uuid.uuid4()))
            lec.setdefault("titulo", f"Lección {l_idx + 1}")

            tipo = lec.get("tipo")
            # Alias legacy: 'cuestionario' → 'quiz'
            if isinstance(tipo, str) and tipo.lower() == "cuestionario":
                tipo = "quiz"
            if tipo is None:
                tipo = "texto"
            if not isinstance(tipo, str) or tipo.lower() not in TipoLeccion.valores():
                raise ValueError(
                    f"Tipo de lección inválido '{tipo}' en '{lec.get('titulo')}'. "
                    f"Válidos: {', '.join(TipoLeccion.valores())}"
                )
            lec["tipo"] = tipo.lower()
            lecciones_norm.append(lec)

        mod["lecciones"] = lecciones_norm
        normalizados.append(mod)
    return normalizados


# =============================================
# SCHEMAS DE CURSO
# =============================================

class CursoBase(BaseModel):
    titulo: str
    descripcion: Optional[str] = None
    categoria: Optional[str] = "general"
    nivel: Optional[str] = "principiante"
    duracion: Optional[str] = None
    precio_tipo: Optional[str] = "gratis"
    precio_monto: Optional[Decimal] = Field(None, ge=0, decimal_places=2)
    moneda: Optional[str] = "PEN"
    metodo_pago: Optional[str] = None
    numero_pago: Optional[str] = None
    instrucciones_pago: Optional[str] = None
    instructor: Optional[str] = None
    docente_id: Optional[str] = None
    imagen_url: Optional[str] = None
    modulos: Optional[List] = []
    etiquetas: Optional[List[str]] = []
    requisitos: Optional[List[str]] = []
    objetivos: Optional[List[str]] = []
    publico_objetivo: Optional[str] = None
    tipo_bloqueo: Optional[str] = "ninguno"
    bloqueo_config: Optional[dict] = {}
    certificado_habilitado: Optional[bool] = True
    certificado_nota_minima: Optional[Decimal] = None

    @field_validator("modulos")
    @classmethod
    def validar_modulos(cls, v):
        return _normalizar_modulos(v)

    @field_validator("tipo_bloqueo")
    @classmethod
    def validar_tipo_bloqueo(cls, v):
        if v is None:
            return v
        v = str(v).lower()
        validos = ["ninguno", "fecha", "secuencial", "desempeno", "mixto"]
        if v not in validos:
            raise ValueError(f"tipo_bloqueo inválido '{v}'. Válidos: {', '.join(validos)}")
        return v

class CursoCreate(CursoBase):
    pass

class CursoUpdate(BaseModel):
    titulo: Optional[str] = None
    descripcion: Optional[str] = None
    categoria: Optional[str] = None
    nivel: Optional[str] = None
    duracion: Optional[str] = None
    precio_tipo: Optional[str] = None
    precio_monto: Optional[Decimal] = None
    moneda: Optional[str] = None
    metodo_pago: Optional[str] = None
    numero_pago: Optional[str] = None
    instrucciones_pago: Optional[str] = None
    instructor: Optional[str] = None
    imagen_url: Optional[str] = None
    estado: Optional[str] = None
    modulos: Optional[List] = None
    etiquetas: Optional[List[str]] = None
    requisitos: Optional[List[str]] = None
    objetivos: Optional[List[str]] = None
    publico_objetivo: Optional[str] = None
    tipo_bloqueo: Optional[str] = None
    bloqueo_config: Optional[dict] = None
    certificado_habilitado: Optional[bool] = None
    certificado_nota_minima: Optional[Decimal] = None

    @field_validator("modulos")
    @classmethod
    def validar_modulos_update(cls, v):
        if v is None:
            return v
        return _normalizar_modulos(v)

    @field_validator("tipo_bloqueo")
    @classmethod
    def validar_tipo_bloqueo_update(cls, v):
        if v is None:
            return v
        v = str(v).lower()
        validos = ["ninguno", "fecha", "secuencial", "desempeno", "mixto"]
        if v not in validos:
            raise ValueError(f"tipo_bloqueo inválido '{v}'. Válidos: {', '.join(validos)}")
        return v


class CursoResponse(BaseModel):
    id: str
    titulo: str
    descripcion: Optional[str]
    categoria: Optional[str]
    nivel: Optional[str]
    docente_id: Optional[str]
    docente_nombre: Optional[str]
    duracion: Optional[str]
    precio_tipo: Optional[str] = "gratis"
    precio_monto: Optional[Decimal] = None
    moneda: Optional[str] = "PEN"
    metodo_pago: Optional[str] = None
    numero_pago: Optional[str] = None
    instrucciones_pago: Optional[str] = None
    imagen_url: Optional[str]
    estado: str
    modulos: Optional[List]
    estudiantes_count: int
    rating: int
    rating_count: int
    etiquetas: Optional[List[str]] = []
    requisitos: Optional[List[str]] = []
    objetivos: Optional[List[str]] = []
    publico_objetivo: Optional[str] = None
    tipo_bloqueo: Optional[str] = "ninguno"
    bloqueo_config: Optional[dict] = {}
    certificado_habilitado: Optional[bool] = True
    certificado_nota_minima: Optional[Decimal] = None
    tiene_acceso: Optional[bool] = False
    tiene_solicitud_pendiente: Optional[bool] = False
    created_at: Optional[datetime]
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


# =============================================
# SCHEMAS DE SOLICITUDES DE ACCESO
# =============================================

class SolicitudAccesoCreate(BaseModel):
    curso_id: Optional[str] = None
    mensaje_estudiante: Optional[str] = None
    metodo_pago: Optional[str] = None
    referencia_pago: Optional[str] = None


class SolicitudAccesoUpdate(BaseModel):
    estado: str  # aprobado | rechazado
    comentario_docente: Optional[str] = None


class SolicitudAccesoResponse(BaseModel):
    id: str
    curso_id: str
    estudiante_id: str
    estudiante_nombre: Optional[str]
    estudiante_email: Optional[str]
    estudiante_telefono: Optional[str]
    estado: str
    mensaje_estudiante: Optional[str]
    comentario_docente: Optional[str]
    metodo_pago: Optional[str]
    referencia_pago: Optional[str]
    curso_titulo: Optional[str]
    created_at: Optional[datetime]
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


# =============================================
# SCHEMAS DE ACCESO
# =============================================

class AccesoCursoCreate(BaseModel):
    estudiante_id: str
    tipo_acceso: Optional[str] = "vitalicio"
    sesiones_restantes: Optional[int] = None
    fecha_expiracion: Optional[datetime] = None
    comentario: Optional[str] = None


class AccesoCursoUpdate(BaseModel):
    activo: Optional[bool] = None
    tipo_acceso: Optional[str] = None
    sesiones_restantes: Optional[int] = None
    fecha_expiracion: Optional[datetime] = None
    comentario: Optional[str] = None


class AccesoCursoResponse(BaseModel):
    id: str
    curso_id: str
    estudiante_id: str
    estudiante_nombre: Optional[str]
    activo: bool
    tipo_acceso: str
    sesiones_restantes: Optional[int]
    fecha_inicio: Optional[datetime]
    fecha_expiracion: Optional[datetime]
    ultimo_acceso: Optional[datetime]
    activado_por: Optional[str]
    comentario: Optional[str]
    created_at: Optional[datetime]
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


# =============================================
# SCHEMAS DE PROGRESO DE LECCIÓN
# =============================================

class ProgresoLeccionResponse(BaseModel):
    id: str
    curso_id: str
    estudiante_id: str
    leccion_id: str
    modulo_id: Optional[str]
    completado: bool
    fecha_completado: Optional[datetime]
    tiempo_invertido: int
    nota: Optional[Decimal]
    aprobado: bool
    intentos: int
    fecha_ultimo_intento: Optional[datetime]
    fecha_liberacion: Optional[datetime]
    desbloqueado: bool

    class Config:
        from_attributes = True


class ProgresoLeccionUpdate(BaseModel):
    completado: Optional[bool] = None
    tiempo_invertido: Optional[int] = None
    nota: Optional[Decimal] = None
    aprobado: Optional[bool] = None


# =============================================
# SCHEMAS DE EVALUACIÓN DE LECCIÓN
# =============================================

class EvaluacionLeccionCreate(BaseModel):
    leccion_id: str
    tipo: str = "examen"
    entidad_id: str
    nota_minima: Decimal = Field(default=3.0, ge=0, le=5)
    intentos_maximos: int = Field(default=3, ge=1)
    tiempo_limite: Optional[int] = None


class EvaluacionLeccionResponse(BaseModel):
    id: str
    curso_id: str
    leccion_id: str
    tipo: str
    entidad_id: str
    nota_minima: Decimal
    intentos_maximos: int
    tiempo_limite: Optional[int]
    created_at: Optional[datetime]

    class Config:
        from_attributes = True


# =============================================
# SCHEMAS DE RESPUESTA PARA LECCIONES BLOQUEADAS
# =============================================

class LeccionBloqueadaResponse(BaseModel):
    bloqueada: bool
    tipo_bloqueo: str
    razon: str
    fecha_liberacion: Optional[datetime]
    evaluacion_pendiente: Optional[bool]
    lecciones_requeridas: Optional[List[str]]


# =============================================
# SCHEMAS DE INSCRIPCIÓN Y PROGRESO
# =============================================

class InscripcionCursoCreate(BaseModel):
    curso_id: str
    estudiante_id: str
    estudiante_nombre: Optional[str] = None


class InscripcionCursoResponse(BaseModel):
    id: str
    curso_id: str
    estudiante_id: str
    estudiante_nombre: Optional[str]
    progreso: int
    completado: bool
    lecciones_completadas: Optional[List]
    fecha_inscripcion: Optional[datetime]
    fecha_completado: Optional[datetime]
    created_at: Optional[datetime]

    class Config:
        from_attributes = True


class ProgresoCursoResponse(BaseModel):
    curso_id: str
    usuario_id: str
    progreso: int = 0
    lecciones_completadas: Optional[List] = []
    completado: bool = False
    mensaje: Optional[str] = None


class LeccionCompletarRequest(BaseModel):
    usuario_id: str
    modulo_id: Optional[str] = None
    leccion_id: Optional[str] = None
    tiempo_invertido: Optional[int] = None
    # FASE F: nota/aprobado de la evaluación embebida (escala 0-20)
    nota: Optional[float] = None
    aprobado: Optional[bool] = None


class AsignarNotaRequest(BaseModel):
    """Docente asigna nota manual a una lección de un estudiante"""
    modulo_id: Optional[str] = None
    nota: Optional[float] = None
    aprobado: Optional[bool] = None
    completado: Optional[bool] = None


class MensajeResponse(BaseModel):
    mensaje: str
    ok: bool = True