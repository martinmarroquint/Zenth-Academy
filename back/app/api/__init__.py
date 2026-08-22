# app/api/__init__.py
# PROYECTO EDUCATIVO - ROUTERS INDEPENDIENTES

from fastapi import APIRouter
from app.api import (
    auth,
    alumnos,
    examenes,
    cuestionarios,
    pizarra,
    integracion_edm,
    historial,
    cursos,
    comunidad,
    certificados,
    carpeta_docente,
    materiales,
    compartir,
)

# Configuracion publica de cliente (marca Zenth Academy)
from app.api.config.cliente import router as cliente_router

api_router = APIRouter()

# =============================================
# AUTENTICACIÓN
# =============================================
api_router.include_router(auth.router, prefix="/auth", tags=["Autenticacion"])

# =============================================
# ALUMNOS UNIFICADOS
# =============================================
api_router.include_router(alumnos.router, prefix="/alumnos", tags=["Alumnos"])

# =============================================
# EXÁMENES ONLINE (incluye grupos)
# =============================================
api_router.include_router(examenes.router, prefix="/examenes", tags=["Examenes"])

# =============================================
# CUESTIONARIOS DINÁMICOS
# =============================================
api_router.include_router(
    cuestionarios.router,
    prefix="/cuestionarios",
    tags=["Cuestionarios"]
)

# =============================================
# PIZARRA INTERACTIVA
# =============================================
api_router.include_router(
    pizarra.router,
    prefix="/pizarra",
    tags=["Pizarra"]
)

# =============================================
# INTEGRACIÓN CON EDM TEAM
# =============================================
api_router.include_router(
    integracion_edm.router,
    prefix="/integraciones/edm",
    tags=["EDM Team"]
)

# =============================================
# HISTORIAL DE COMPARTICIONES
# =============================================
api_router.include_router(
    historial.router,
    prefix="/historial",
    tags=["Historial"]
)

# =============================================
# CURSOS ONLINE
# =============================================
api_router.include_router(
    cursos.router,
    prefix="/cursos",
    tags=["Cursos"]
)

# =============================================
# FORO / COMUNIDAD
# =============================================
api_router.include_router(
    comunidad.router,
    prefix="/foro",
    tags=["Foro"]
)

# =============================================
# CERTIFICADOS
# =============================================
api_router.include_router(
    certificados.router,
    prefix="/certificados",
    tags=["Certificados"]
)

# =============================================
# CARPETA DOCENTE
# =============================================
api_router.include_router(
    carpeta_docente.router,
    prefix="/carpeta-docente",
    tags=["Carpeta Docente"]
)

# =============================================
# MATERIALES (CRUD completo)
# =============================================
api_router.include_router(
    materiales.router,
    prefix="/materiales",
    tags=["Materiales"]
)

# =============================================
# COMPARTIR EN CLASE (sala de proyección SOLO docente)
# =============================================
api_router.include_router(
    compartir.router,
    prefix="/compartir",
    tags=["Compartir en clase"]
)

# =============================================
# CONFIGURACIÓN DE CLIENTE (público)
# =============================================
api_router.include_router(
    cliente_router,
    prefix="/config/cliente",
    tags=["Configuracion"]
)

# =============================================
# EXPORTACIÓN
# =============================================
__all__ = [
    'auth',
    'alumnos',
    'examenes',
    'cuestionarios',
    'pizarra',
    'integracion_edm',
    'historial',
    'cursos',
    'comunidad',
    'certificados',
    'carpeta_docente',
    'materiales',
    'compartir',
    'api_router'
]