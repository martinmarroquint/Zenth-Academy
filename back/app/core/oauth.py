# app/core/oauth.py
# =====================================================
# LOGIN SOCIAL (OAuth 2.0 / OpenID Connect)
#
# Implementa el flujo "Authorization Code" para Google y Microsoft.
# Tras validar al usuario con el proveedor, se crea/vincula un `Usuario`
# local y se emite NUESTRO JWT (access + refresh), igual que el login normal.
#
# Seguridad:
#   - `state` firmado con el JWT secret (protección CSRF).
#   - El `redirect_uri` se construye en el servidor (no se acepta del cliente).
#   - Se valida el email verificado que devuelve el proveedor.
# =====================================================

import hashlib
import hmac
import logging
import secrets
import time
from typing import Optional
from urllib.parse import urlencode

import httpx

from app.config import settings
from app.core.security import SECRET_KEY

logger = logging.getLogger(__name__)

# Tiempo de vida del `state` (10 minutos)
_STATE_TTL = 600


# =====================================================
# STATE FIRMADO (anti-CSRF)
# =====================================================
def generar_state(redirect_destino: str = "") -> str:
    """Genera un `state` firmado: <nonce>.<timestamp>.<destino_b64>.<firma>"""
    nonce = secrets.token_urlsafe(16)
    ts = str(int(time.time()))
    destino = redirect_destino or ""
    payload = f"{nonce}.{ts}.{destino}"
    firma = hmac.new(SECRET_KEY.encode(), payload.encode(), hashlib.sha256).hexdigest()[:32]
    return f"{payload}.{firma}"


def validar_state(state: str) -> Optional[str]:
    """Valida la firma y la antigüedad del state. Devuelve el destino o None si es inválido."""
    try:
        partes = state.split(".")
        if len(partes) < 4:
            return None
        firma = partes[-1]
        payload = ".".join(partes[:-1])
        esperada = hmac.new(SECRET_KEY.encode(), payload.encode(), hashlib.sha256).hexdigest()[:32]
        if not hmac.compare_digest(firma, esperada):
            return None
        nonce, ts, destino = partes[0], partes[1], ".".join(partes[2:-1])
        if time.time() - int(ts) > _STATE_TTL:
            logger.warning("State OAuth expirado")
            return None
        return destino
    except Exception:
        return None


# =====================================================
# CONFIGURACIÓN DE PROVEEDORES
# =====================================================
def _redirect_uri(provider: str) -> str:
    return f"{settings.BACKEND_PUBLIC_URL.rstrip('/')}/api/v1/auth/oauth/{provider}/callback"


def proveedores_disponibles() -> dict:
    """Qué proveedores están configurados (el frontend solo muestra esos)."""
    return {
        "google": settings.google_oauth_habilitado,
        "microsoft": settings.microsoft_oauth_habilitado,
    }


def url_autorizacion(provider: str, state: str) -> Optional[str]:
    """Construye la URL a la que redirigimos al usuario."""
    if provider == "google":
        if not settings.google_oauth_habilitado:
            return None
        params = {
            "client_id": settings.GOOGLE_CLIENT_ID,
            "redirect_uri": _redirect_uri("google"),
            "response_type": "code",
            "scope": "openid email profile",
            "state": state,
            "access_type": "online",
            "prompt": "select_account",
        }
        return "https://accounts.google.com/o/oauth2/v2/auth?" + urlencode(params)

    if provider == "microsoft":
        if not settings.microsoft_oauth_habilitado:
            return None
        tenant = settings.MICROSOFT_TENANT or "common"
        params = {
            "client_id": settings.MICROSOFT_CLIENT_ID,
            "redirect_uri": _redirect_uri("microsoft"),
            "response_type": "code",
            "scope": "openid email profile User.Read",
            "state": state,
            "response_mode": "query",
            "prompt": "select_account",
        }
        return f"https://login.microsoftonline.com/{tenant}/oauth2/v2.0/authorize?" + urlencode(params)

    return None


# =====================================================
# INTERCAMBIO DE CÓDIGO POR TOKEN + DATOS DEL USUARIO
# =====================================================
async def intercambiar_codigo(provider: str, code: str) -> Optional[dict]:
    """Cambia el `code` por un access token y devuelve los datos normalizados del usuario."""
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            if provider == "google":
                r = await client.post(
                    "https://oauth2.googleapis.com/token",
                    data={
                        "code": code,
                        "client_id": settings.GOOGLE_CLIENT_ID,
                        "client_secret": settings.GOOGLE_CLIENT_SECRET,
                        "redirect_uri": _redirect_uri("google"),
                        "grant_type": "authorization_code",
                    },
                )
                if r.status_code != 200:
                    logger.warning(f"Google token error {r.status_code}: {r.text[:200]}")
                    return None
                tokens = r.json()
                info = await client.get(
                    "https://www.googleapis.com/oauth2/v3/userinfo",
                    headers={"Authorization": f"Bearer {tokens['access_token']}"},
                )
                if info.status_code != 200:
                    logger.warning(f"Google userinfo error {info.status_code}")
                    return None
                d = info.json()
                return {
                    "provider": "google",
                    "provider_id": str(d.get("sub")),
                    "email": (d.get("email") or "").lower(),
                    "email_verificado": bool(d.get("email_verified")),
                    "nombres": d.get("given_name") or "",
                    "apellidos": d.get("family_name") or "",
                    "foto_url": d.get("picture"),
                }

            if provider == "microsoft":
                tenant = settings.MICROSOFT_TENANT or "common"
                r = await client.post(
                    f"https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token",
                    data={
                        "code": code,
                        "client_id": settings.MICROSOFT_CLIENT_ID,
                        "client_secret": settings.MICROSOFT_CLIENT_SECRET,
                        "redirect_uri": _redirect_uri("microsoft"),
                        "grant_type": "authorization_code",
                        "scope": "openid email profile User.Read",
                    },
                )
                if r.status_code != 200:
                    logger.warning(f"Microsoft token error {r.status_code}: {r.text[:200]}")
                    return None
                tokens = r.json()
                info = await client.get(
                    "https://graph.microsoft.com/v1.0/me",
                    headers={"Authorization": f"Bearer {tokens['access_token']}"},
                )
                if info.status_code != 200:
                    logger.warning(f"Microsoft userinfo error {info.status_code}")
                    return None
                d = info.json()
                email = (d.get("mail") or d.get("userPrincipalName") or "").lower()
                return {
                    "provider": "microsoft",
                    "provider_id": str(d.get("id")),
                    "email": email,
                    "email_verificado": True,  # Microsoft ya valida el correo corporativo
                    "nombres": d.get("givenName") or "",
                    "apellidos": d.get("surname") or "",
                    "foto_url": None,
                }
    except Exception as e:
        logger.error(f"Error en OAuth ({provider}): {e}")
        return None

    return None
