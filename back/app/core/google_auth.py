# app/core/google_auth.py
# =====================================================
# LOGIN CON GOOGLE (validación de ID token)
#
# El frontend obtiene un ID token (JWT) con Google Identity Services y lo
# envía al backend. Aquí verificamos que sea auténtico usando las CLAVES
# PÚBLICAS de Google (JWKS), no nuestro secreto. Si es válido, el backend
# emite NUESTRO JWT (roles/empresa intactos).
#
# Validaciones: firma RS256 (kid de JWKS) + aud == GOOGLE_CLIENT_ID + iss + exp.
# =====================================================

import logging
import time

import httpx
from jose import jwt, jwk, JWTError

from app.config import settings

logger = logging.getLogger(__name__)

_JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs"
_ISSUERS = ("accounts.google.com", "https://accounts.google.com")
_CACHE_TTL = 3600

# Caché simple en memoria de las claves públicas (se refresca si no hay match)
_cache = {"keys": None, "exp": 0.0}


def _obtener_claves(forzar: bool = False):
    ahora = time.time()
    if not forzar and _cache["keys"] and _cache["exp"] > ahora:
        return _cache["keys"]
    resp = httpx.get(_JWKS_URL, timeout=10.0)
    resp.raise_for_status()
    claves = resp.json().get("keys", [])
    _cache["keys"] = claves
    _cache["exp"] = ahora + _CACHE_TTL
    return claves


def verificar_id_token_google(id_token: str) -> dict:
    """Valida un ID token de Google y devuelve su payload.

    Lanza ValueError si el token es inválido o Google no está configurado.
    """
    client_id = settings.GOOGLE_CLIENT_ID
    if not client_id:
        raise ValueError("Login con Google no está configurado (falta GOOGLE_CLIENT_ID)")

    try:
        header = jwt.get_unverified_header(id_token)
    except JWTError:
        raise ValueError("Token de Google con formato inválido")

    kid = header.get("kid")
    jwk_dict = next((k for k in _obtener_claves() if k.get("kid") == kid), None)
    if not jwk_dict:
        # La clave pudo rotar: forzar refresco una vez
        jwk_dict = next((k for k in _obtener_claves(forzar=True) if k.get("kid") == kid), None)
    if not jwk_dict:
        raise ValueError("No se encontró la clave pública de Google para este token")

    try:
        clave = jwk.construct(jwk_dict, algorithm="RS256")
        payload = jwt.decode(
            id_token,
            clave,
            algorithms=["RS256"],
            audience=client_id,
            options={"verify_at_hash": False},
        )
    except JWTError as e:
        logger.warning(f"ID token de Google inválido: {e}")
        raise ValueError("Token de Google inválido")

    if payload.get("iss") not in _ISSUERS:
        raise ValueError("Emisor del token de Google inválido")

    return payload
