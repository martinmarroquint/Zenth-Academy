# app/api/webauthn.py
# ✅ WEBAUTHN / PASSKEYS: registro y login con huella, Face ID o Windows Hello.
#
# Cómo funciona (y por qué es seguro):
#   1. El backend genera un "challenge" aleatorio y lo guarda (5 min, un solo uso).
#   2. El navegador pide la biometría al dispositivo y firma el challenge.
#   3. El backend verifica la firma con la CLAVE PÚBLICA guardada.
# La huella nunca sale del dispositivo ni llega al servidor.

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import func
from sqlalchemy.orm import Session
from typing import List, Optional
import uuid
import json
import logging
from datetime import datetime, timezone, timedelta
from urllib.parse import urlparse

from webauthn import (
    generate_registration_options,
    verify_registration_response,
    generate_authentication_options,
    verify_authentication_response,
)
from webauthn.helpers import options_to_json, base64url_to_bytes, bytes_to_base64url
from webauthn.helpers.structs import (
    AuthenticatorSelectionCriteria,
    PublicKeyCredentialDescriptor,
    ResidentKeyRequirement,
    UserVerificationRequirement,
)

from app.config import settings
from app.database import get_db
from app.core.dependencies import get_current_active_user
from app.core.errors import error_interno
from app.core.ratelimit import rate_limit
from app.models.usuario import Usuario
from app.models.webauthn import CredencialWebAuthn, WebAuthnChallenge
from app.schemas.webauthn import (
    RegistroIniciarRequest,
    RegistroCompletarRequest,
    LoginIniciarRequest,
    LoginCompletarRequest,
    CredencialResponse,
    EstadoWebAuthnResponse,
    MensajeResponse,
)

logger = logging.getLogger(__name__)
router = APIRouter()

CHALLENGE_TTL_MINUTOS = 5


# =============================================
# UTILIDADES
# =============================================

def _aware(dt):
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def _rp_id(request: Request) -> str:
    """✅ RP ID = dominio del SITIO (el frontend), sin puerto.

    Regla de WebAuthn: el `rpId` debe ser igual al dominio del origen o un
    sufijo registrable de él. Por eso se toma del header `Origin` que envía el
    navegador (el del frontend), NO del host del backend: en producción el API
    vive en otro dominio y usar el host del backend hacía que el navegador
    rechazara la ceremonia con `SecurityError`.
    """
    configurado = (settings.WEBAUTHN_RP_ID or "").strip()
    if configurado and configurado != "localhost":
        return configurado

    origen = request.headers.get("origin")
    if origen:
        host = urlparse(origen).hostname
        if host:
            return host

    referer = request.headers.get("referer")
    if referer:
        host = urlparse(referer).hostname
        if host:
            return host

    host = (request.headers.get("host") or "localhost").split(":")[0]
    return host or "localhost"


def _origins(request: Request) -> List[str]:
    """Orígenes aceptados: los configurados + el Origin real de la petición."""
    origenes = list(settings.webauthn_origins_lista)
    origen = request.headers.get("origin")
    if origen and origen not in origenes:
        origenes.append(origen)
    return origenes


def _guardar_challenge(db: Session, usuario_id: str, challenge: str, tipo: str) -> str:
    """Guarda el challenge (un solo uso) y devuelve su id."""
    db.query(WebAuthnChallenge).filter(
        WebAuthnChallenge.usuario_id == str(usuario_id),
        WebAuthnChallenge.tipo == tipo,
    ).delete(synchronize_session=False)

    fila = WebAuthnChallenge(
        id=str(uuid.uuid4()),
        usuario_id=str(usuario_id),
        challenge=challenge,
        tipo=tipo,
        expira_en=datetime.now(timezone.utc) + timedelta(minutes=CHALLENGE_TTL_MINUTOS),
    )
    db.add(fila)
    db.commit()
    return str(fila.id)


def _challenge_valido(fila: Optional[WebAuthnChallenge]) -> bool:
    if not fila:
        return False
    expira = _aware(fila.expira_en)
    return bool(expira and expira > datetime.now(timezone.utc))


def _cred_a_dict(cred: CredencialWebAuthn) -> dict:
    return {
        "id": str(cred.id),
        "nombre": cred.nombre,
        "created_at": cred.created_at,
        "last_used_at": cred.last_used_at,
    }


def _descriptor(credential_id: str):
    """Descriptor seguro para las opciones: si el id guardado estuviera corrupto
    se ignora (con aviso) en lugar de romper todo el login."""
    try:
        return PublicKeyCredentialDescriptor(id=base64url_to_bytes(str(credential_id)))
    except Exception:
        logger.warning(f"Credencial con id inválido ignorada: {credential_id!r}")
        return None


def _descriptores(credenciales: List[CredencialWebAuthn]) -> List[PublicKeyCredentialDescriptor]:
    return [d for d in (_descriptor(c.credential_id) for c in credenciales) if d]


# =============================================
# ESTADO Y GESTIÓN DE PASSKEYS
# =============================================

@router.get("/estado", response_model=EstadoWebAuthnResponse)
def estado(
    request: Request,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user),
):
    """Cuántas passkeys tiene el usuario y con qué RP ID se está trabajando."""
    total = db.query(func.count(CredencialWebAuthn.id)).filter(
        CredencialWebAuthn.usuario_id == str(current_user.id)
    ).scalar() or 0
    return {"habilitado": True, "credenciales": int(total), "rp_id": _rp_id(request)}


@router.get("/credenciales", response_model=List[CredencialResponse])
def listar_credenciales(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user),
):
    creds = db.query(CredencialWebAuthn).filter(
        CredencialWebAuthn.usuario_id == str(current_user.id)
    ).order_by(CredencialWebAuthn.created_at.desc()).all()
    return [_cred_a_dict(c) for c in creds]


@router.delete("/credenciales/{credencial_id}", response_model=MensajeResponse)
def eliminar_credencial(
    credencial_id: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user),
):
    cred = db.query(CredencialWebAuthn).filter(
        CredencialWebAuthn.id == credencial_id,
        CredencialWebAuthn.usuario_id == str(current_user.id),
    ).first()
    if not cred:
        raise HTTPException(status_code=404, detail="Credencial no encontrada")

    db.delete(cred)
    db.commit()
    logger.info(f"Passkey eliminada por {current_user.id}")
    return {"mensaje": "Huella/Face ID eliminado de este dispositivo", "ok": True}


# =============================================
# REGISTRO (usuario ya logueado)
# =============================================

@router.post("/registro/iniciar")
def registro_iniciar(
    request: Request,
    data: Optional[RegistroIniciarRequest] = None,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user),
):
    """Genera las opciones para que el dispositivo cree la passkey."""
    try:
        credenciales = db.query(CredencialWebAuthn).filter(
            CredencialWebAuthn.usuario_id == str(current_user.id)
        ).all()

        opciones = generate_registration_options(
            rp_id=_rp_id(request),
            rp_name=settings.WEBAUTHN_RP_NAME,
            user_id=str(current_user.id).encode("utf-8"),
            user_name=current_user.email,
            user_display_name=current_user.nombre_completo or current_user.email,
            exclude_credentials=_descriptores(credenciales),
            authenticator_selection=AuthenticatorSelectionCriteria(
                user_verification=UserVerificationRequirement.REQUIRED,
                resident_key=ResidentKeyRequirement.PREFERRED,
            ),
        )

        _guardar_challenge(
            db, str(current_user.id), bytes_to_base64url(opciones.challenge), "registro"
        )
        return json.loads(options_to_json(opciones))
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=error_interno(e, "Error iniciando el registro"))


@router.post("/registro/completar", response_model=MensajeResponse)
def registro_completar(
    request: Request,
    data: RegistroCompletarRequest,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user),
):
    """Verifica la credencial creada por el dispositivo y la guarda."""
    try:
        fila = db.query(WebAuthnChallenge).filter(
            WebAuthnChallenge.usuario_id == str(current_user.id),
            WebAuthnChallenge.tipo == "registro",
        ).order_by(WebAuthnChallenge.created_at.desc()).first()

        if not _challenge_valido(fila):
            raise HTTPException(
                status_code=400,
                detail="El registro expiró. Intentá de nuevo.",
            )

        try:
            verificacion = verify_registration_response(
                credential=data.credential,
                expected_challenge=base64url_to_bytes(fila.challenge),
                expected_rp_id=_rp_id(request),
                expected_origin=_origins(request),
                require_user_verification=True,
            )
        except Exception as e:
            logger.warning(f"Registro WebAuthn rechazado: {e}")
            raise HTTPException(
                status_code=400,
                detail="No se pudo verificar la huella/Face ID. Intentá de nuevo.",
            )

        credential_id = bytes_to_base64url(verificacion.credential_id)
        existe = db.query(CredencialWebAuthn).filter(
            CredencialWebAuthn.credential_id == credential_id
        ).first()
        if existe:
            raise HTTPException(status_code=400, detail="Este dispositivo ya está registrado")

        cred = CredencialWebAuthn(
            id=str(uuid.uuid4()),
            usuario_id=str(current_user.id),
            credential_id=credential_id,
            public_key=bytes_to_base64url(verificacion.credential_public_key),
            sign_count=int(verificacion.sign_count or 0),
            transports=(data.credential.get("transports") or []),
            nombre=(data.nombre or "Dispositivo"),
        )
        db.delete(fila)
        db.add(cred)
        db.commit()

        logger.info(f"Passkey registrada para {current_user.email}")
        return {"mensaje": "Huella/Face ID activado correctamente", "ok": True}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=error_interno(e, "Error completando el registro"))


# =============================================
# LOGIN CON HUELLA (público)
# =============================================

@router.post("/login/iniciar")
def login_iniciar(
    request: Request,
    data: LoginIniciarRequest,
    db: Session = Depends(get_db),
    _rate_limited=Depends(rate_limit(20, 60)),
):
    """Genera el challenge de login.

    - Con `email`: busca las passkeys de esa cuenta (flujo clásico).
    - Sin `email`: **sin usuario** (usernameless): el navegador muestra el
      selector de passkeys y el usuario se resuelve en `login/completar` desde
      el `userHandle` que firma el dispositivo.
    """
    try:
        email = (data.email or "").strip().lower()

        if not email:
            # ✅ Usernameless: no sabemos quién es hasta que firma
            opciones = generate_authentication_options(
                rp_id=_rp_id(request),
                allow_credentials=[],
                user_verification=UserVerificationRequirement.REQUIRED,
            )
            challenge_id = _guardar_challenge(
                db, "", bytes_to_base64url(opciones.challenge), "login"
            )
            payload = json.loads(options_to_json(opciones))
            payload["challenge_id"] = challenge_id
            return payload

        usuario = db.query(Usuario).filter(
            func.lower(Usuario.email) == email,
            Usuario.activo == True,  # noqa: E712
        ).first()
        if not usuario:
            raise HTTPException(
                status_code=404,
                detail="No encontramos una cuenta activa con ese correo",
            )

        credenciales = db.query(CredencialWebAuthn).filter(
            CredencialWebAuthn.usuario_id == str(usuario.id)
        ).all()
        descriptores = _descriptores(credenciales)
        if not descriptores:
            raise HTTPException(
                status_code=400,
                detail="Esta cuenta todavía no tiene huella/Face ID registrado",
            )

        opciones = generate_authentication_options(
            rp_id=_rp_id(request),
            allow_credentials=descriptores,
            user_verification=UserVerificationRequirement.REQUIRED,
        )

        challenge_id = _guardar_challenge(
            db, str(usuario.id), bytes_to_base64url(opciones.challenge), "login"
        )

        payload = json.loads(options_to_json(opciones))
        payload["challenge_id"] = challenge_id
        return payload
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=error_interno(e, "Error iniciando el login"))


@router.post("/login/completar")
def login_completar(
    request: Request,
    data: LoginCompletarRequest,
    db: Session = Depends(get_db),
    _rate_limited=Depends(rate_limit(20, 60)),
):
    """Verifica la firma del dispositivo y devuelve los tokens de sesión."""
    try:
        fila = db.query(WebAuthnChallenge).filter(
            WebAuthnChallenge.id == data.challenge_id,
            WebAuthnChallenge.tipo == "login",
        ).first()
        if not _challenge_valido(fila):
            raise HTTPException(
                status_code=400,
                detail="La solicitud expiró. Intentá de nuevo.",
            )

        credential_id = str(data.credential.get("id") or "")
        if not credential_id:
            raise HTTPException(status_code=400, detail="Credencial inválida")

        # ✅ Con email: la credencial debe ser de ese usuario.
        # ✅ Sin email (usernameless): se busca por la credencial firmada.
        if fila.usuario_id:
            cred = db.query(CredencialWebAuthn).filter(
                CredencialWebAuthn.usuario_id == str(fila.usuario_id),
                CredencialWebAuthn.credential_id == credential_id,
            ).first()
        else:
            cred = db.query(CredencialWebAuthn).filter(
                CredencialWebAuthn.credential_id == credential_id
            ).first()

        if not cred:
            raise HTTPException(
                status_code=400,
                detail="Esta credencial no está registrada en tu cuenta",
            )

        # ✅ Si el dispositivo devuelve userHandle, debe coincidir con el dueño
        user_handle_b64 = (data.credential.get("response") or {}).get("userHandle")
        if user_handle_b64:
            try:
                user_handle_id = base64url_to_bytes(str(user_handle_b64)).decode("utf-8")
            except Exception:
                user_handle_id = None
            if user_handle_id and str(user_handle_id) != str(cred.usuario_id):
                logger.warning("userHandle no coincide con el dueño de la credencial")
                raise HTTPException(status_code=401, detail="Credencial rechazada")

        usuario = db.query(Usuario).filter(
            Usuario.id == cred.usuario_id,
            Usuario.activo == True,  # noqa: E712
        ).first()
        if not usuario:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")

        try:
            verificacion = verify_authentication_response(
                credential=data.credential,
                expected_challenge=base64url_to_bytes(fila.challenge),
                expected_rp_id=_rp_id(request),
                expected_origin=_origins(request),
                credential_public_key=base64url_to_bytes(cred.public_key),
                credential_current_sign_count=int(cred.sign_count or 0),
                require_user_verification=True,
            )
        except Exception as e:
            logger.warning(f"Login WebAuthn rechazado para {usuario.email}: {e}")
            raise HTTPException(
                status_code=401,
                detail="No pudimos verificar tu huella/Face ID",
            )

        # ✅ Anti-replay: el contador de firmas nunca debe retroceder
        nuevo_contador = int(verificacion.new_sign_count or 0)
        if nuevo_contador and nuevo_contador < int(cred.sign_count or 0):
            logger.warning(f"Posible replay de credencial para {usuario.email}")
            raise HTTPException(status_code=401, detail="Credencial rechazada")

        ahora = datetime.now(timezone.utc)
        cred.sign_count = nuevo_contador or int(cred.sign_count or 0)
        cred.last_used_at = ahora
        usuario.ultimo_acceso = ahora
        db.delete(fila)
        db.commit()

        client_ip = request.client.host if request.client else "unknown"
        user_agent = request.headers.get("user-agent")
        log_login_attempt(
            email=usuario.email,
            success=True,
            ip_address=client_ip,
            user_agent=user_agent,
            reason="Login con huella/Face ID",
        )

        # Geolocalización fire-and-forget (igual que el login normal)
        try:
            import asyncio
            from app.core.geo_service import log_login_geo
            asyncio.create_task(
                log_login_geo(
                    db_session=db,
                    user_id=str(usuario.id),
                    email=usuario.email,
                    ip_address=client_ip,
                    user_agent=user_agent,
                )
            )
        except Exception:
            pass

        # Mismos tokens que el login tradicional
        from app.api.auth import _crear_tokens, _user_dict
        tokens = _crear_tokens(db, usuario)
        logger.info(f"Login con passkey: {usuario.email}")
        return {
            "access_token": tokens["access_token"],
            "refresh_token": tokens["refresh_token"],
            "expires_in": tokens["expires_in"],
            "token_type": "bearer",
            "user": _user_dict(usuario),
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=error_interno(e, "Error verificando la huella"))
