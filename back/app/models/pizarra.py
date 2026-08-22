# app/models/pizarra.py
# VERSION CORREGIDA - CON FOREIGN KEYS

from sqlalchemy import Column, String, Integer, Float, DateTime, JSON, Text, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base
from datetime import datetime, timezone


class Pizarra(Base):
    __tablename__ = "pizarras"
    __table_args__ = {'extend_existing': True}

    id = Column(String, primary_key=True)
    titulo = Column(String(300), nullable=False)
    descripcion = Column(Text)
    tipo = Column(String(50), default='blanca')
    estado = Column(String(20), default='ACTIVA')
    creado_por = Column(String, nullable=False)
    grupo_id = Column(String, nullable=True)
    empresa_id = Column(String, nullable=True)
    es_publica = Column(Boolean, default=False)
    configuracion = Column(JSON, default={})
    elementos = Column(JSON, default=[])
    capas = Column(JSON, default=['principal'])
    historial = Column(JSON, default=[])
    colaboradores_activos = Column(JSON, default=[])
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    ultima_actividad = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # ✅ RELACIÓN CON SESIONES
    sesiones = relationship("SesionPizarra", back_populates="pizarra", cascade="all, delete-orphan")


class SesionPizarra(Base):
    __tablename__ = "sesiones_pizarra"
    __table_args__ = {'extend_existing': True}

    id = Column(String, primary_key=True)
    pizarra_id = Column(String, ForeignKey("pizarras.id", ondelete="CASCADE"), nullable=False)  # ✅ FK
    usuario_id = Column(String, nullable=False)
    rol = Column(String(20), default='EDITOR')
    cursor_posicion = Column(JSON, default={'x': 0, 'y': 0})
    zoom = Column(Float, default=1.0)
    herramientas_activas = Column(JSON, default=[])
    seleccion = Column(JSON, default={})
    conectado = Column(Boolean, default=True)
    ultimo_latido = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    ip = Column(String(50))
    user_agent = Column(Text)
    fecha_inicio = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    fecha_fin = Column(DateTime, nullable=True)
    duracion = Column(Integer, default=0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # ✅ RELACIÓN CON PIZARRA
    pizarra = relationship("Pizarra", back_populates="sesiones")