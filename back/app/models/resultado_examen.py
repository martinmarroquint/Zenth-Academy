# app/models/resultado_examen.py
# VERSIÓN CORREGIDA - SIN RELACIONES

from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, JSON
from app.database import Base
from datetime import datetime, timezone


class ResultadoExamen(Base):
    __tablename__ = "resultados_examenes"
    __table_args__ = {'extend_existing': True}

    id = Column(String, primary_key=True)
    examen_id = Column(String, nullable=False, index=True)
    alumno_id = Column(String, nullable=False, index=True)
    alumno_id_unificado = Column(String, nullable=True)
    
    alumno_nombre = Column(String(300), default="")
    alumno_grado = Column(String(50), default="")
    alumno_dni = Column(String(20), default="")

    respuestas = Column(JSON, nullable=False)
    
    calificacion = Column(Float, default=0.0)
    correctas = Column(Integer, default=0)
    total_preguntas = Column(Integer, default=0)
    puntos_obtenidos = Column(Float, default=0.0)
    total_puntos = Column(Float, default=0.0)
    
    tiempo_usado = Column(Integer, default=0)
    tiempo_restante = Column(Integer, default=0)
    violaciones = Column(Integer, default=0)
    eventos_seguridad = Column(JSON, nullable=True)
    
    entregado_por_tiempo = Column(Boolean, default=False)
    estado = Column(String(20), default='COMPLETADO')
    detalle_respuestas = Column(JSON, default=list)
    
    entregado_en = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    # ❌ RELACIONES ELIMINADAS
    # examen = relationship(...)
    # alumno = relationship(...)