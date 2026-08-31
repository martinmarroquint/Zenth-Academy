# app/core/login_attempts.py
# TRACKING DE INTENTOS DE LOGIN - PROTECCIÓN CONTRA FUERZA BRUTA

import time
import threading
from collections import defaultdict
from typing import Optional
from fastapi import HTTPException, status
import logging

logger = logging.getLogger(__name__)

# =============================================
# CONFIGURACIÓN
# =============================================

MAX_LOGIN_ATTEMPTS = 5        # Intentos máximos antes de bloquear
LOGIN_TIMEOUT_MINUTES = 15    # Minutos de bloqueo
LOCKOUT_DURATION_SECONDS = LOGIN_TIMEOUT_MINUTES * 60

# =============================================
# ALMACÉN EN MEMORIA (con lock para thread-safety)
# =============================================

_lock = threading.Lock()
_login_attempts = defaultdict(lambda: {
    "count": 0,
    "first_attempt": 0,
    "last_attempt": 0,
    "locked_until": 0
})


def _get_key(identifier: str) -> str:
    """Genera una clave única para el tracking"""
    return identifier.lower().strip()


def record_failed_attempt(identifier: str) -> dict:
    """
    Registra un intento fallido de login.
    
    Args:
        identifier: Email o IP del usuario
    
    Returns:
        dict con estado del bloqueo
    """
    key = _get_key(identifier)
    now = time.time()
    
    with _lock:
        data = _login_attempts[key]
        
        # Si está bloqueado, verificar si ya pasó el tiempo
        if data["locked_until"] > now:
            remaining = int((data["locked_until"] - now) / 60) + 1
            return {
                "blocked": True,
                "attempts": data["count"],
                "remaining_minutes": remaining,
                "message": f"Cuenta bloqueada. Intenta de nuevo en {remaining} minuto(s)."
            }
        
        # Si no está bloqueado o ya pasó el tiempo, registrar intento
        if data["count"] == 0 or (now - data["first_attempt"]) > LOCKOUT_DURATION_SECONDS:
            # Resetear contador si pasó el tiempo de bloqueo
            data["count"] = 1
            data["first_attempt"] = now
        else:
            data["count"] += 1
        
        data["last_attempt"] = now
        
        # Verificar si alcanzó el máximo
        if data["count"] >= MAX_LOGIN_ATTEMPTS:
            data["locked_until"] = now + LOCKOUT_DURATION_SECONDS
            logger.warning(f"Login bloqueado para {key}: {data['count']} intentos fallidos")
            return {
                "blocked": True,
                "attempts": data["count"],
                "remaining_minutes": LOGIN_TIMEOUT_MINUTES,
                "message": f"Cuenta bloqueada por {LOGIN_TIMEOUT_MINUTES} minutos por múltiples intentos fallidos."
            }
        
        remaining_attempts = MAX_LOGIN_ATTEMPTS - data["count"]
        return {
            "blocked": False,
            "attempts": data["count"],
            "remaining_attempts": remaining_attempts,
            "message": f"Intento fallido. Te quedan {remaining_attempts} intento(s)."
        }


def record_successful_login(identifier: str):
    """
    Registra un login exitoso y resetea el contador.
    
    Args:
        identifier: Email o IP del usuario
    """
    key = _get_key(identifier)
    
    with _lock:
        if key in _login_attempts:
            del _login_attempts[key]
            logger.info(f"Login exitoso para {key}: contador reseteado")


def is_blocked(identifier: str) -> dict:
    """
    Verifica si un identifier está bloqueado.
    
    Args:
        identifier: Email o IP del usuario
    
    Returns:
        dict con estado del bloqueo
    """
    key = _get_key(identifier)
    now = time.time()
    
    with _lock:
        data = _login_attempts[key]
        
        if data["locked_until"] > now:
            remaining = int((data["locked_until"] - now) / 60) + 1
            return {
                "blocked": True,
                "remaining_minutes": remaining,
                "message": f"Cuenta bloqueada. Intenta de nuevo en {remaining} minuto(s)."
            }
        
        return {"blocked": False}


def check_login_allowed(identifier: str):
    """
    Verifica si se permite el login. Lanza excepción si está bloqueado.
    
    Args:
        identifier: Email o IP del usuario
    
    Raises:
        HTTPException 429 si está bloqueado
    """
    status_check = is_blocked(identifier)
    if status_check["blocked"]:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=status_check["message"]
        )


def clear_lockout(identifier: str):
    """
    Limpia el bloqueo de un identifier (solo admin).
    
    Args:
        identifier: Email o IP del usuario
    """
    key = _get_key(identifier)
    
    with _lock:
        if key in _login_attempts:
            del _login_attempts[key]
            logger.info(f"Bloqueo limpiado para {key}")


def get_attempt_stats(identifier: str) -> dict:
    """
    Obtiene estadísticas de intentos para un identifier.
    
    Args:
        identifier: Email o IP del usuario
    
    Returns:
        dict con estadísticas
    """
    key = _get_key(identifier)
    now = time.time()
    
    with _lock:
        data = _login_attempts[key]
        
        if data["count"] == 0:
            return {"attempts": 0, "blocked": False}
        
        is_currently_blocked = data["locked_until"] > now
        remaining = int((data["locked_until"] - now) / 60) + 1 if is_currently_blocked else 0
        
        return {
            "attempts": data["count"],
            "blocked": is_currently_blocked,
            "remaining_minutes": remaining,
            "first_attempt": data["first_attempt"],
            "last_attempt": data["last_attempt"]
        }
