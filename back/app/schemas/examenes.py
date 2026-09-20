# app/schemas/examenes.py
# VERSION ACTUALIZADA - CON HISTORIAL Y COMPARTIR

from pydantic import BaseModel, Field, AliasChoices
from typing import Optional, List, Any, Dict
from datetime import datetime


# ========== GRUPOS ==========
class AlumnoGrupoSchema(BaseModel):
    id: str
    nombre: str
    dni: Optional[str] = None

class AsistenciaGrupoSchema(BaseModel):
    alumno_id: str
    fecha: str
    presente: bool = True

class AsistenciaItem(BaseModel):
    """Item de asistencia tal como lo envía el cliente.
    Campos opcionales y extra permitido para no alterar el
    diccionario que se persiste en Grupo.asistencias."""
    alumno_id: Optional[str] = None
    fecha: Optional[str] = None
    presente: bool = True

    class Config:
        extra = "allow"

class AlumnoGuardarItem(BaseModel):
    """Item de la lista de /examenes/alumnos."""
    id: Optional[str] = None
    dni: Optional[str] = None
    nombres: Optional[str] = None
    apellidos: Optional[str] = None
    grado: Optional[str] = None
    email: Optional[str] = None
    grupo: Optional[str] = None
    grupo_id: Optional[str] = None

    class Config:
        extra = "allow"

class GrupoCreate(BaseModel):
    nombre: str
    docente_id: str = "default"

class GrupoUpdate(BaseModel):
    nombre: Optional[str] = None
    alumnos: Optional[List[dict]] = None
    asistencias: Optional[List[dict]] = None
    recursos: Optional[List[dict]] = None
    compartir_con_todos: Optional[bool] = None

class GrupoResponse(BaseModel):
    id: str
    nombre: str
    docente_id: str
    alumnos: Optional[List[dict]] = []
    asistencias: Optional[List[dict]] = []
    recursos: Optional[List[dict]] = []
    session_activo: Optional[str] = None
    compartir_con_todos: Optional[bool] = True
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class RecursoGrupoCreate(BaseModel):
    """Body de /examenes/grupos/{grupo_id}/recursos."""
    tipo: str = "link"
    nombre: str = "Sin nombre"
    descripcion: str = ""
    url: Optional[str] = None
    contenido: str = ""


# ========== PREGUNTA ==========
class AfirmacionVF(BaseModel):
    id: str
    texto: str
    esVerdadero: bool

class SegmentoCompletar(BaseModel):
    id: str
    tipo: str
    texto: Optional[str] = ""
    respuesta: Optional[str] = ""
    puntos: Optional[float] = 1.0

class FraseCompletar(BaseModel):
    id: str
    segmentos: Optional[List[SegmentoCompletar]] = []
    puntos: Optional[float] = 1.0

class PreguntaBase(BaseModel):
    tipo: str
    enunciado: str
    puntos: float = 1.0
    orden: int = 0
    opcion_a: Optional[str] = ""
    opcion_b: Optional[str] = ""
    opcion_c: Optional[str] = ""
    opcion_d: Optional[str] = ""
    opcion_e: Optional[str] = ""
    respuesta_correcta: Optional[int] = None
    afirmaciones: Optional[List[AfirmacionVF]] = None
    columna_a: Optional[List[str]] = None
    columna_b: Optional[List[str]] = None
    elementos: Optional[List[str]] = None
    segmentos: Optional[List[SegmentoCompletar]] = None
    frases: Optional[List[FraseCompletar]] = None
    respuesta_corta: Optional[str] = ""
    respuestas_alternativas: Optional[List[str]] = None
    longitud_minima: Optional[int] = 100
    rubrica: Optional[str] = ""
    # Campos para tipos de encuesta (likert, estrellas, escala_numerica)
    escala_opciones: Optional[int] = 5
    escala_max: Optional[int] = 5
    escala_min: Optional[int] = 1
    escala_paso: Optional[int] = 1
    escala_min_label: Optional[str] = ""
    escala_max_label: Optional[str] = ""

class PreguntaCreate(PreguntaBase):
    pass

class PreguntaResponse(PreguntaBase):
    id: str
    examen_id: str
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ========== EXAMEN ==========
class ConfiguracionExamen(BaseModel):
    # ✅ FIX: los nombres se alinearon a snake_case, que es lo que envía el
    # frontend (CONFIGURACION_EXAMEN_DEFAULT) y lo que lee ExamenActivo.
    # Antes 6 campos estaban en camelCase, así que Pydantic los descartaba y
    # los ajustes de aleatorización / una-pregunta-por-vez nunca se guardaban.
    # Se aceptan además los nombres legacy camelCase por compatibilidad.
    aleatorizar_preguntas: bool = Field(
        False, validation_alias=AliasChoices("aleatorizar_preguntas", "aleatorizarPreguntas")
    )
    aleatorizar_opciones: bool = Field(
        False, validation_alias=AliasChoices("aleatorizar_opciones", "aleatorizarOpciones")
    )
    preguntas_por_examen: int = Field(
        0, validation_alias=AliasChoices("preguntas_por_examen", "preguntasPorExamen")
    )
    mostrar_una_sola_pregunta: bool = Field(
        False, validation_alias=AliasChoices("mostrar_una_sola_pregunta", "mostrarUnaSolaPregunta")
    )
    mostrar_resultados: bool = True
    mostrar_respuestas: bool = False
    detectar_copy_paste: bool = False
    detectar_tab_change: bool = False
    mostrar_mejor_nota: bool = False
    fecha_inicio: Optional[str] = None
    fecha_fin: Optional[str] = None
    limite_violaciones: int = 3
    accion_violaciones: str = "anular"
    password_examen: Optional[str] = None
    modo_estricto: bool = Field(
        True, validation_alias=AliasChoices("modo_estricto", "modoEstricto")
    )
    umbral_trampa: int = Field(
        3, validation_alias=AliasChoices("umbral_trampa", "umbralTrampa")
    )
    acceso_publico: bool = False
    anonimo: bool = False

class ExamenCreate(BaseModel):
    titulo: str
    descripcion: str = ""
    tiempo_limite: int = 60
    puntaje_aprobacion: float = 60.0
    intentos_permitidos: int = 1
    configuracion: ConfiguracionExamen = ConfiguracionExamen()
    preguntas: List[PreguntaCreate] = []
    grupo_id: Optional[str] = None

class ExamenUpdate(BaseModel):
    titulo: Optional[str] = None
    descripcion: Optional[str] = None
    tiempo_limite: Optional[int] = None
    puntaje_aprobacion: Optional[float] = None
    estado: Optional[str] = None
    intentos_permitidos: Optional[int] = None
    configuracion: Optional[ConfiguracionExamen] = None

class ExamenResponse(BaseModel):
    id: str
    codigo: str
    titulo: str
    descripcion: str
    tiempo_limite: int
    puntaje_aprobacion: float
    estado: str
    configuracion: Optional[Dict] = None
    total_preguntas: int = 0
    intentos_permitidos: int = 1
    grupo_id: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class ExamenDetailResponse(ExamenResponse):
    preguntas: List[PreguntaResponse] = []


# ========== RESULTADO ==========
class ResultadoCreate(BaseModel):
    examen_id: str
    alumno_id: str
    alumno_nombre: str = ""
    alumno_grado: str = ""
    alumno_dni: str = ""
    respuestas: Dict[str, Any]
    calificacion: float = 0.0
    correctas: int = 0
    total_preguntas: int = 0
    puntos_obtenidos: float = 0.0
    total_puntos: float = 0.0
    tiempo_usado: int = 0
    tiempo_restante: int = 0
    violaciones: int = 0
    eventos_seguridad: Optional[List[Dict]] = None
    entregado_por_tiempo: bool = False
    estado: str = 'COMPLETADO'
    # ✅ Autoridad de tiempo: id del intento iniciado en el servidor.
    intento_id: Optional[str] = None

class ResultadoResponse(BaseModel):
    id: str
    examen_id: str
    alumno_id: str
    alumno_nombre: str
    alumno_grado: str
    alumno_dni: str
    respuestas: Dict
    calificacion: float
    correctas: int
    total_preguntas: int
    puntos_obtenidos: float
    total_puntos: float
    tiempo_usado: int
    tiempo_restante: int = 0
    violaciones: int
    estado: str
    entregado_por_tiempo: bool = False
    entregado_en: Optional[datetime] = None

    class Config:
        from_attributes = True


# ========== ACCESO PÚBLICO A EXÁMENES ==========
class VerificarPasswordRequest(BaseModel):
    """Body de /examenes/publico/{codigo}/verificar-password."""
    password: Optional[str] = None


class ResultadoPublicoRequest(BaseModel):
    """Body de /examenes/publico/{codigo}/resultado (sin login)."""
    password: Optional[str] = None
    respuestas: Dict[str, Any] = {}
    alumno_nombre: str = 'Participante'
    alumno_id: Optional[str] = 'publico'
    alumno_grado: str = ''
    alumno_dni: str = ''
    tiempo_usado: int = 0
    violaciones: int = 0
    intento_id: Optional[str] = None


class IntentoExamenResponse(BaseModel):
    """Respuesta al iniciar/reanudar un intento."""
    intento_id: str
    examen_id: str
    expira_en: datetime
    segundos_restantes: int
    tiempo_limite: int
    intentos_permitidos: int
    intentos_usados: int


# ========== HISTORIAL DE COMPARTICIONES ==========
class HistorialComparticionCreate(BaseModel):
    docente_id: str
    grupo_id: Optional[str] = None
    grupo_nombre: Optional[str] = None
    recursos: Optional[List[dict]] = []
    alumnos_ids: Optional[List[str]] = []
    session_id: str

class HistorialComparticionResponse(BaseModel):
    id: str
    docente_id: str
    grupo_id: Optional[str] = None
    grupo_nombre: Optional[str] = None
    recursos_compartidos: List[dict] = []
    cantidad_recursos: int = 0
    alumnos_ids: List[str] = []
    cantidad_alumnos: int = 0
    session_id: str
    fecha_inicio: datetime
    fecha_fin: Optional[datetime] = None
    duracion_segundos: int = 0
    estado: str = 'ACTIVO'
    creado_en: datetime
    actualizado_en: datetime

    class Config:
        from_attributes = True


# ========== COMPARTIR CON ALUMNOS ==========
class CompartirAlumnosRequest(BaseModel):
    grupo_id: str
    alumnos_ids: List[str]
    session_id: str


class VincularGrupoCarpetaRequest(BaseModel):
    """Body de /examenes/sincronizar/vincular."""
    session_id: Optional[str] = None
    grupo_id: Optional[str] = None


class SincronizarIniciarRequest(BaseModel):
    """Body de /examenes/sincronizar/iniciar."""
    session_id: Optional[str] = None


# ========== ALUMNOS CONECTADOS ==========
class AlumnoConectadoResponse(BaseModel):
    id: str
    nombre: str
    grado: Optional[str] = None
    conectado_desde: datetime


# ========== MENSAJE ==========
class MensajeResponse(BaseModel):
    mensaje: str
    ok: bool = True