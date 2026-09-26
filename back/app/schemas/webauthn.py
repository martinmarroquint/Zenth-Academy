# app/schemas/webauthn.py
# SCHEMAS DE WEBAUTHN (huella / Face ID / Windows Hello)

from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime


class RegistroIniciarRequest(BaseModel):
    nombre: Optional[str] = None


class RegistroCompletarRequest(BaseModel):
    credential: Dict[str, Any]
    nombre: Optional[str] = None


class LoginIniciarRequest(BaseModel):
    email: str


class LoginCompletarRequest(BaseModel):
    challenge_id: str
    credential: Dict[str, Any]


class CredencialResponse(BaseModel):
    id: str
    nombre: Optional[str]
    created_at: Optional[datetime]
    last_used_at: Optional[datetime]


class EstadoWebAuthnResponse(BaseModel):
    habilitado: bool
    credenciales: int
    rp_id: str


class MensajeResponse(BaseModel):
    mensaje: str
    ok: bool = True
