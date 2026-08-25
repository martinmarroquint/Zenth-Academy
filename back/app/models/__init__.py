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
from app.models.certificado import Certificado
from app.models.historial_comparticion import HistorialComparticion
from app.models.carpeta_docente import CarpetaDocente
from app.models.integracion_edm import IntegracionEDM, EventoIntegracion
from app.models.empresa import Empresa
from app.models.cliente import Cliente
from app.models.personal import Personal
from app.models.material_compartido import MaterialCompartido  # ✅ NUEVO
from app.models.solicitud_docente import SolicitudDocente  # ✅ SOLICITUDES DOCENTE


__all__ = [
    "Usuario", "Empresa", "Cliente", "Personal",
    "Alumno",  # ✅ Modelo principal
    "AlumnoExamen",  # ✅ Legacy - solo lectura
    "Examen", "Pregunta", "ResultadoExamen", "Grupo",
    "Pizarra", "SesionPizarra",
    "Curso", "InscripcionCurso",
    "Post", "Comentario", "LikePost",
    "Certificado",
    "IntegracionEDM", "EventoIntegracion",
    "HistorialComparticion", "CarpetaDocente",
    "MaterialCompartido",  # ✅ NUEVO
    "SolicitudDocente",  # ✅ SOLICITUDES DOCENTE
]