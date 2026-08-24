# app/schemas/__init__.py
# PROYECTO EDUCATIVO - SCHEMAS INDEPENDIENTES

from app.schemas.auth import *
from app.schemas.examenes import *
from app.schemas.pizarra import *
from app.schemas.integracion_edm import *
from app.schemas.curso import *
from app.schemas.post import *
from app.schemas.certificado import *
from app.schemas.carpeta_docente import *


__all__ = [
    # AUTH
    "Token",
    "TokenData",
    "LoginRequest",
    "UserProfile",
    "PasswordChange",

    # EXÁMENES ONLINE
    "ExamenCreate",
    "ExamenUpdate",
    "ExamenResponse",
    "ExamenDetailResponse",
    "PreguntaCreate",
    "PreguntaResponse",
    "ResultadoCreate",
    "ResultadoResponse",
    "GrupoCreate",
    "GrupoUpdate",
    "GrupoResponse",
    "HistorialComparticionCreate",
    "HistorialComparticionResponse",
    "CompartirAlumnosRequest",
    "AlumnoConectadoResponse",

    # PIZARRA
    "PizarraCreate",
    "PizarraUpdate",
    "PizarraResponse",
    "SesionPizarraCreate",
    "SesionPizarraResponse",

    # INTEGRACIÓN EDM
    "IntegracionCreate",
    "IntegracionUpdate",
    "IntegracionResponse",
    "EventoIntegracionCreate",
    "EventoIntegracionResponse",

    # CURSOS
    "CursoCreate",
    "CursoUpdate",
    "CursoResponse",
    "InscripcionCursoCreate",
    "InscripcionCursoResponse",
    "ProgresoCursoResponse",
    "LeccionCompletarRequest",
    "TipoLeccion",

    # FORO / COMUNIDAD
    "PostCreate",
    "PostUpdate",
    "PostResponse",
    "ComentarioCreate",
    "ComentarioResponse",
    "LikeResponse",

    # CERTIFICADOS
    "CertificadoCreate",
    "CertificadoUpdate",
    "CertificadoResponse",

    # CARPETA DOCENTE
    "CarpetaDocenteCreate",
    "CarpetaDocenteUpdate",
    "CarpetaDocenteResponse",
    "CarpetaSyncRequest",

    # MENSAJE GENÉRICO
    "MensajeResponse",
]