# app/models/__init__.py
# VERSIÓN CORREGIDA - CON TODOS LOS MODELOS IMPORTADOS

from app.models.usuario import Usuario
from app.models.alumno import Alumno  # ✅ Modelo principal
from app.models.examen import Examen, Pregunta
from app.models.resultado_examen import ResultadoExamen
from app.models.alumno_examen import AlumnoExamen  # ✅ Legacy - solo lectura
from app.models.grupo import Grupo
from app.models.curso import Curso, InscripcionCurso
from app.models.pizarra import Pizarra, SesionPizarra
from app.models.post import Post, Comentario, LikePost
from app.models.comentario_leccion import ComentarioLeccion, LikeComentarioLeccion  # ✅ COMENTARIOS POR LECCIÓN
from app.models.certificado import Certificado
from app.models.historial_comparticion import HistorialComparticion
from app.models.carpeta_docente import CarpetaDocente
from app.models.integracion_edm import IntegracionEDM, EventoIntegracion
from app.models.material_compartido import MaterialCompartido  # ✅ NUEVO
from app.models.solicitud_docente import SolicitudDocente  # ✅ SOLICITUDES DOCENTE
from app.models.login_geo_log import LoginGeoLog  # ✅ GEOLOCALIZACION
from app.models.refresh_token import RefreshToken  # ✅ REFRESH TOKENS (JWT)
from app.models.intento_examen import IntentoExamen  # ✅ INTENTOS DE EXAMEN (autoridad de tiempo)
from app.models.biblioteca import RecursoBiblioteca, BibliotecaInteraccion  # ✅ BIBLIOTECA


__all__ = [
    "Usuario",
    "Alumno",  # ✅ Modelo principal
    "AlumnoExamen",  # ✅ Legacy - solo lectura
    "Examen", "Pregunta", "ResultadoExamen", "Grupo",
    "Pizarra", "SesionPizarra",
    "Curso", "InscripcionCurso",
    "Post", "Comentario", "LikePost",
    "ComentarioLeccion", "LikeComentarioLeccion",  # ✅ COMENTARIOS POR LECCIÓN
    "Certificado",
    "IntegracionEDM", "EventoIntegracion",
    "HistorialComparticion", "CarpetaDocente",
    "MaterialCompartido",  # ✅ NUEVO
    "SolicitudDocente",  # ✅ SOLICITUDES DOCENTE
    "LoginGeoLog",  # ✅ GEOLOCALIZACION
    "RefreshToken",  # ✅ REFRESH TOKENS (JWT)
    "IntentoExamen",  # ✅ INTENTOS DE EXAMEN (autoridad de tiempo)
    "RecursoBiblioteca", "BibliotecaInteraccion",  # ✅ BIBLIOTECA
]