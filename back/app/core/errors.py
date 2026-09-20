# app/core/errors.py
# Helper centralizado para manejo de errores internos

import logging

from app.config import settings

logger = logging.getLogger(__name__)


def error_interno(e: Exception, contexto: str = "Error interno") -> str:
    """Loguea el error completo y devuelve detalle solo en desarrollo."""
    logger.error(f"{contexto}: {e}", exc_info=True)
    return str(e) if settings.DEBUG else "Error interno del servidor. Contacte al administrador."
