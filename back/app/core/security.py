# app/core/security.py
# CONFIGURACIÓN DE SEGURIDAD - JWT ACCESS + REFRESH CON ROTACIÓN

import os
import uuid
import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from jose import jwt
from typing import Optional

# =============================================
# CONFIGURACIÓN - UNIFICADA Y SEGURA
# =============================================

# Usar JWT_SECRET_KEY de config (requerido) o generar uno seguro
# En producción, SIEMPRE debe estar definido en .env
_jwt_secret = os.getenv("JWT_SECRET_KEY")

if not _jwt_secret:
    # En desarrollo, generar uno temporal (se pierde al reiniciar)
    _jwt_secret = secrets.token_hex(32)
    import sys
    print("ADVERTENCIA: JWT_SECRET_KEY no definido. Usando clave temporal.", file=sys.stderr)
    print("  Define JWT_SECRET_KEY en .env para produccion.", file=sys.stderr)

SECRET_KEY = _jwt_secret
ALGORITHM = "HS256"

# Access token de corta duración (por defecto 60 min)
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))
# Refresh token de larga duración (por defecto 7 días)
REFRESH_TOKEN_EXPIRE_MINUTES = int(os.getenv("REFRESH_TOKEN_EXPIRE_MINUTES", "10080"))


# =============================================
# FUNCIONES DE TOKEN
# =============================================

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Crea un token JWT de acceso (tipo access)"""
    to_encode = data.copy()
    to_encode["type"] = "access"
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def create_refresh_token(data: dict, expires_delta: Optional[timedelta] = None) -> tuple:
    """Crea un refresh token JWT con jti único.

    Devuelve (token, jti). El jti se almacena hasheado en BD para permitir
    rotación y revocación.
    """
    jti = uuid.uuid4().hex
    to_encode = data.copy()
    to_encode.update({"type": "refresh", "jti": jti})
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=REFRESH_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    token = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return token, jti


def decode_token(token: str) -> Optional[dict]:
    """Decodifica un token JWT, devuelve None si es inválido/expirado"""
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.JWTError:
        return None


def hash_token(value: str) -> str:
    """Hash SHA-256 de un jti/token para almacenamiento seguro en BD"""
    return hashlib.sha256(value.encode("utf-8")).hexdigest()
