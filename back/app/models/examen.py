# app/models/examen.py
# VERSIÓN CORREGIDA - CON RELACIONES RESTAURADAS Y IMPORTACIÓN DE hybrid_property

from sqlalchemy import Column, String, Integer, Float, DateTime, JSON, Text, Index, ForeignKey
from sqlalchemy.ext.hybrid import hybrid_property  # ✅ IMPORTACIÓN FALTANTE
from sqlalchemy.orm import relationship
from app.database import Base
from datetime import datetime, timezone


class Examen(Base):
    __tablename__ = "examenes"
    __table_args__ = (
        Index('idx_examen_grupo_id', 'grupo_id'),
        Index('idx_examen_estado', 'estado'),
        Index('idx_examen_created_at', 'created_at'),
        Index('idx_examen_estado_grupo', 'estado', 'grupo_id'),
        {'extend_existing': True}
    )

    id = Column(String, primary_key=True)
    codigo = Column(String(50), unique=True, nullable=False, index=True)
    titulo = Column(String(300), nullable=False)
    descripcion = Column(Text, default="")
    tiempo_limite = Column(Integer, nullable=False, default=60)
    puntaje_aprobacion = Column(Float, default=60.0)
    estado = Column(String(20), default='BORRADOR')
    configuracion = Column(JSON, default=dict)
    intentos_permitidos = Column(Integer, default=1)
    grupo_id = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # ✅ RELACIONES RESTAURADAS (uso de strings evita importaciones circulares)
    preguntas = relationship(
        "Pregunta",
        back_populates="examen",
        cascade="all, delete-orphan",
        order_by="Pregunta.orden"
    )

    @hybrid_property
    def total_preguntas(self):
        return len(self.preguntas) if self.preguntas else 0


class Pregunta(Base):
    __tablename__ = "preguntas"
    __table_args__ = (
        Index('idx_pregunta_examen_id', 'examen_id'),
        {'extend_existing': True}
    )

    id = Column(String, primary_key=True)
    examen_id = Column(String, ForeignKey("examenes.id", ondelete="CASCADE"), nullable=False, index=True)
    tipo = Column(String(30), nullable=False)
    enunciado = Column(Text, nullable=False)
    puntos = Column(Float, default=1.0)
    orden = Column(Integer, default=0)
    
    opcion_a = Column(Text, nullable=True)
    opcion_b = Column(Text, nullable=True)
    opcion_c = Column(Text, nullable=True)
    opcion_d = Column(Text, nullable=True)
    opcion_e = Column(Text, nullable=True)
    respuesta_correcta = Column(String(10), nullable=True)
    
    afirmaciones = Column(JSON, nullable=True)
    columna_a = Column(JSON, nullable=True)
    columna_b = Column(JSON, nullable=True)
    elementos = Column(JSON, nullable=True)
    segmentos = Column(JSON, nullable=True)
    frases = Column(JSON, nullable=True)
    respuesta_corta = Column(Text, nullable=True)
    respuestas_alternativas = Column(JSON, nullable=True)
    longitud_minima = Column(Integer, nullable=True)
    rubrica = Column(JSON, nullable=True)
    # Campos para tipos de encuesta (likert, estrellas, escala_numerica)
    escala_opciones = Column(Integer, nullable=True)
    escala_max = Column(Integer, nullable=True)
    escala_min = Column(Integer, nullable=True)
    escala_paso = Column(Integer, nullable=True)
    escala_min_label = Column(String(100), nullable=True)
    escala_max_label = Column(String(100), nullable=True)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # ✅ RELACIÓN RESTAURADA
    examen = relationship("Examen", back_populates="preguntas")