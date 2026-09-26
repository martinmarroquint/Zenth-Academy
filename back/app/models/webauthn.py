# app/models/webauthn.py
# ✅ WEBAUTHN / PASSKEYS: login con huella, Face ID o Windows Hello.
# El dispositivo verifica la biometría; el backend solo guarda la clave pública
# y verifica la firma. Nunca vemos ni almacenamos la huella.

from sqlalchemy import Column, String, Integer, DateTime, JSON, Text
from app.database import Base
from datetime import datetime, timezone
import uuid


class CredencialWebAuthn(Base):
    """Passkey registrada por un usuario en un dispositivo."""

    __tablename__ = "webauthn_credenciales"
    __table_args__ = {'extend_existing': True}

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    usuario_id = Column(String, nullable=False, index=True)
    # ID de la credencial (base64url) que envía el navegador
    credential_id = Column(String(600), unique=True, nullable=False, index=True)
    # Clave pública (base64url) con la que se verifica la firma
    public_key = Column(Text, nullable=False)
    sign_count = Column(Integer, default=0)
    transports = Column(JSON, default=list)
    nombre = Column(String(120), nullable=True)  # "iPhone de Juan"
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    last_used_at = Column(DateTime, nullable=True)


class WebAuthnChallenge(Base):
    """Challenge temporal del registro/login.

    Se guarda en la base (no en memoria) para que siga siendo válido aunque el
    backend corra en varios workers.
    """

    __tablename__ = "webauthn_challenges"
    __table_args__ = {'extend_existing': True}

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    usuario_id = Column(String, nullable=False, index=True)
    challenge = Column(String(300), nullable=False)
    tipo = Column(String(20), nullable=False)  # registro | login
    expira_en = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
