# app/models/integracion_edm.py
# VERSION CORREGIDA - CON FOREIGN KEYS

from sqlalchemy import Column, String, Integer, DateTime, JSON, Text, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base
from datetime import datetime, timezone


class IntegracionEDM(Base):
    __tablename__ = "integraciones_edm"
    __table_args__ = {'extend_existing': True}

    id = Column(String, primary_key=True)
    nombre = Column(String(200), nullable=False)
    tipo = Column(String(50), nullable=False)
    descripcion = Column(Text)
    cliente_id = Column(String(200))
    cliente_secreto = Column(String(500))
    access_token = Column(String(500))
    refresh_token = Column(String(500))
    token_expiracion = Column(DateTime)
    configuracion = Column(JSON, default={})
    activo = Column(Boolean, default=True)
    ultima_sincronizacion = Column(DateTime)
    ultimo_error = Column(Text)
    webhook_url = Column(String(500))
    empresa_id = Column(String, nullable=True)
    creado_por = Column(String, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # ✅ RELACIÓN CON EVENTOS
    eventos = relationship("EventoIntegracion", back_populates="integracion", cascade="all, delete-orphan")


class EventoIntegracion(Base):
    __tablename__ = "eventos_integracion"
    __table_args__ = {'extend_existing': True}

    id = Column(String, primary_key=True)
    integracion_id = Column(String, ForeignKey("integraciones_edm.id", ondelete="CASCADE"), nullable=False)  # ✅ FK
    tipo_evento = Column(String(50), nullable=False)
    datos = Column(JSON, default={})
    prioridad = Column(String(20), default='normal')
    estado = Column(String(20), default='PENDIENTE')
    error = Column(Text)
    intentos = Column(Integer, default=0)
    max_intentos = Column(Integer, default=3)
    proximo_intento = Column(DateTime)
    tiempo_procesamiento = Column(Integer, default=0)
    destino = Column(String(200))
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    enviado_en = Column(DateTime, nullable=True)

    # ✅ RELACIÓN CON INTEGRACION
    integracion = relationship("IntegracionEDM", back_populates="eventos")