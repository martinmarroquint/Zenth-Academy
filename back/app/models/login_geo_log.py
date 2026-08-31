# app/models/login_geo_log.py
# MODELO DE REGISTRO GEOGRAFICO DE LOGINS
# Almacena la ubicacion geografica de cada login para analytics

from sqlalchemy import Column, String, Float, DateTime, Text
from app.database import Base
from datetime import datetime, timezone
import uuid


class LoginGeoLog(Base):
    __tablename__ = "login_geo_log"
    __table_args__ = {'extend_existing': True}

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # Datos del usuario
    user_id = Column(String, nullable=False, index=True)
    email = Column(String(200), nullable=False, index=True)
    
    # Datos de conexion
    ip_address = Column(String(45), nullable=False)  # IPv6 max 45 chars
    user_agent = Column(Text, nullable=True)
    
    # Datos geograficos (de ip-api.com)
    pais = Column(String(100), nullable=True)          # "Mexico"
    pais_code = Column(String(5), nullable=True)       # "MX"
    region = Column(String(200), nullable=True)        # "Jalisco"
    ciudad = Column(String(200), nullable=True)        # "Guadalajara"
    lat = Column(Float, nullable=True)
    lon = Column(Float, nullable=True)
    timezone_geo = Column(String(100), nullable=True)  # "America/Mexico_City"
    isp = Column(String(200), nullable=True)           # Proveedor de internet
    
    # Timestamps
    resolved_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
