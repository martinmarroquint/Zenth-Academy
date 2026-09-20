# app/models/intento_examen.py
# =====================================================
# INTENTO DE EXAMEN (autoridad de tiempo en el servidor)
#
# Registra el inicio de un intento para que el backend —y no el navegador—
# controle el tiempo límite. El cliente ya no puede otorgarse tiempo extra:
# el servidor calcula el tiempo transcurrido y si la entrega llegó tarde.
# =====================================================

from sqlalchemy import Column, String, Integer, Boolean, DateTime
from app.database import Base
from datetime import datetime, timezone
import uuid


class IntentoExamen(Base):
    __tablename__ = "intentos_examen"
    __table_args__ = {'extend_existing': True}

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    examen_id = Column(String, nullable=False, index=True)
    usuario_id = Column(String, nullable=True, index=True)  # NULL en exámenes públicos
    alumno_nombre = Column(String(300), default="")
    es_publico = Column(Boolean, default=False)
    codigo_publico = Column(String(50), nullable=True, index=True)
    iniciado_en = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    expira_en = Column(DateTime, nullable=False)
    entregado_en = Column(DateTime, nullable=True)
    estado = Column(String(20), default="EN_CURSO")  # EN_CURSO | COMPLETADO | EXPIRADO | TRAMPA
    violaciones = Column(Integer, default=0)
