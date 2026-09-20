# app/core/security.py
# CONFIGURACIÓN DE SEGURIDAD - JWT ACCESS + REFRESH CON ROTACIÓN

import uuid
import hashlib
import secrets
import sys
import os
from datetime import datetime, timedelta, timezone
from jose import jwt
from typing import Optional

# =============================================
# CONFIGURACIÓN - UNIFICADA Y SEGURA
# =============================================

# ✅ FIX CRÍTICO: usar settings (que SÍ lee el .env vía pydantic-settings),
# NO os.getenv() (que ignora el .env y generaba una clave aleatoria por reinicio).
from app.config import settings

SECRET_KEY = settings.JWT_SECRET_KEY

if not SECRET_KEY or len(SECRET_KEY) < 16:
    print(
        "ERROR: JWT_SECRET_KEY ausente o demasiado corta. "
        "Defina una clave segura (>=16 chars) en .env",
        file=sys.stderr
    )
    raise RuntimeError("JWT_SECRET_KEY inválida o no configurada")

ALGORITHM = settings.JWT_ALGORITHM

# Access token de corta duración (por defecto 60 min)
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.environ.get("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))
# Refresh token de larga duración (por defecto 7 días)
REFRESH_TOKEN_EXPIRE_MINUTES = int(os.environ.get("REFRESH_TOKEN_EXPIRE_MINUTES", "10080"))


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
