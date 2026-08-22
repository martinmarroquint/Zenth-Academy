# app/models/historial_comparticion.py
# VERSIÓN CORREGIDA - CON RECARGA FORZADA

from sqlalchemy import Column, String, Integer, DateTime, JSON, Text, Boolean
from app.database import Base
from datetime import datetime, timezone


class HistorialComparticion(Base):
    __tablename__ = "historial_comparticiones"
    # ✅ FORZAR RECARGA DE METADATOS
    __table_args__ = {'extend_existing': True, 'keep_existing': False}

    id = Column(String, primary_key=True)
    docente_id = Column(String, nullable=False, index=True)
    grupo_id = Column(String, nullable=True)
    grupo_nombre = Column(String(200), nullable=True)
    recursos_compartidos = Column(JSON, default=list)
    cantidad_recursos = Column(Integer, default=0)
    alumnos_ids = Column(JSON, default=list)
    cantidad_alumnos = Column(Integer, default=0)
    session_id = Column(String, index=True)
    
    # ✅ QR EXPIRACIÓN
    qr_token = Column(String, nullable=True)
    qr_expira = Column(DateTime, nullable=True)
    
    fecha_inicio = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    fecha_fin = Column(DateTime, nullable=True)
    duracion_segundos = Column(Integer, default=0)
    estado = Column(String(20), default='ACTIVO')
    creado_en = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    actualizado_en = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))