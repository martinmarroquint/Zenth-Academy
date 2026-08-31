# app/core/security_logger.py
# LOGGING DE SEGURIDAD - REGISTRO DE EVENTOS CRÍTICOS

import logging
from datetime import datetime, timezone
from typing import Optional
from fastapi import Request

# Logger específico para seguridad
security_logger = logging.getLogger("security")
security_logger.setLevel(logging.INFO)

# Handler para archivo de seguridad (si se desea)
# from logging.handlers import RotatingFileHandler
# handler = RotatingFileHandler("logs/security.log", maxBytes=10*1024*1024, backupCount=5)
# security_logger.addHandler(handler)


def log_login_attempt(
    email: str,
    success: bool,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
    reason: Optional[str] = None
):
    """
    Registra un intento de login.
    
    Args:
        email: Email del usuario
        success: Si el login fue exitoso
        ip_address: IP del cliente
        user_agent: User-Agent del navegador
        reason: Razón del fallo (opcional)
    """
    event = {
        "event": "login_attempt",
        "email": email,
        "success": success,
        "ip_address": ip_address,
        "user_agent": user_agent,
        "reason": reason,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    
    if success:
        security_logger.info(f"LOGIN_EXITOSO: {email} desde {ip_address}")
    else:
        security_logger.warning(f"LOGIN_FALLIDO: {email} desde {ip_address} - {reason}")


def log_unauthorized_access(
    endpoint: str,
    user_id: Optional[str] = None,
    ip_address: Optional[str] = None,
    reason: str = "No autorizado"
):
    """
    Registra un intento de acceso no autorizado.
    
    Args:
        endpoint: Endpoint intentado
        user_id: ID del usuario (si está autenticado)
        ip_address: IP del cliente
        reason: Razón del acceso denegado
    """
    security_logger.warning(
        f"ACCESO_NO_AUTORIZADO: {endpoint} "
        f"user={user_id} ip={ip_address} reason={reason}"
    )


def log_role_escalation_attempt(
    user_id: str,
    attempted_role: str,
    current_role: str,
    ip_address: Optional[str] = None
):
    """
    Registra un intento de escalada de privilegios.
    
    Args:
        user_id: ID del usuario
        attempted_role: Rol intentado
        current_role: Rol actual del usuario
        ip_address: IP del cliente
    """
    security_logger.critical(
        f"INTENTO_ESCALADA: user={user_id} "
        f"attempted={attempted_role} current={current_role} ip={ip_address}"
    )


def log_suspicious_activity(
    activity_type: str,
    details: str,
    ip_address: Optional[str] = None,
    user_id: Optional[str] = None
):
    """
    Registra actividad sospechosa general.
    
    Args:
        activity_type: Tipo de actividad
        details: Detalles de la actividad
        ip_address: IP del cliente
        user_id: ID del usuario (si aplica)
    """
    security_logger.warning(
        f"ACTIVIDAD SOSPECHOSA: {activity_type} "
        f"details={details} ip={ip_address} user={user_id}"
    )


def log_password_change(
    user_id: str,
    success: bool,
    ip_address: Optional[str] = None
):
    """
    Registra un cambio de contraseña.
    
    Args:
        user_id: ID del usuario
        success: Si el cambio fue exitoso
        ip_address: IP del cliente
    """
    event = "CAMBIO_PASSWORD_EXITOSO" if success else "CAMBIO_PASSWORD_FALLIDO"
    security_logger.info(f"{event}: user={user_id} ip={ip_address}")


def log_account_lockout(
    identifier: str,
    attempts: int,
    ip_address: Optional[str] = None
):
    """
    Registra un bloqueo de cuenta por intentos fallidos.
    
    Args:
        identifier: Email o IP bloqueado
        attempts: Número de intentos
        ip_address: IP del cliente
    """
    security_logger.warning(
        f"BLOQUEO_CUENTA: identifier={identifier} "
        f"attempts={attempts} ip={ip_address}"
    )


def log_rate_limit_exceeded(
    endpoint: str,
    ip_address: Optional[str] = None,
    user_id: Optional[str] = None
):
    """
    Registra cuando se excede el rate limit.
    
    Args:
        endpoint: Endpoint afectado
        ip_address: IP del cliente
        user_id: ID del usuario (si está autenticado)
    """
    security_logger.warning(
        f"RATE_LIMIT_EXCEDIDO: endpoint={endpoint} "
        f"ip={ip_address} user={user_id}"
    )
