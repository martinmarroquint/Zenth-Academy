# app/models/cuestionario.py
# VERSION CORREGIDA - CON FOREIGN KEYS

from sqlalchemy import Column, String, Integer, Float, DateTime, JSON, Text, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base
from datetime import datetime, timezone


class Cuestionario(Base):
    __tablename__ = "cuestionarios"
    __table_args__ = {'extend_existing': True}

    id = Column(String, primary_key=True)
    titulo = Column(String(300), nullable=False)
    descripcion = Column(Text)
    tipo = Column(String(50), nullable=False)
    estado = Column(String(20), default='BORRADOR')
    configuracion = Column(JSON, default={})
    es_anonimo = Column(Boolean, default=False)
    permite_editar = Column(Boolean, default=True)
    mostrar_resultados = Column(Boolean, default=False)
    limite_respuestas = Column(Integer, default=0)
    empresa_id = Column(String, nullable=True)
    departamento = Column(String(100))
    publico_objetivo = Column(String(50))
    password = Column(String(100), nullable=True)
    url_publica = Column(String(200), unique=True, nullable=True)
    fecha_inicio = Column(DateTime, nullable=True)
    fecha_fin = Column(DateTime, nullable=True)
    creado_por = Column(String, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # ✅ RELACIONES CON FOREIGN KEY
    preguntas = relationship("PreguntaCuestionario", back_populates="cuestionario", cascade="all, delete-orphan")
    respuestas = relationship("RespuestaCuestionario", back_populates="cuestionario", cascade="all, delete-orphan")


class PreguntaCuestionario(Base):
    __tablename__ = "preguntas_cuestionario"
    __table_args__ = {'extend_existing': True}

    id = Column(String, primary_key=True)
    cuestionario_id = Column(String, ForeignKey("cuestionarios.id", ondelete="CASCADE"), nullable=False)  # ✅ FK
    tipo = Column(String(50), nullable=False)
    orden = Column(Integer, default=0)
    seccion = Column(String(100), nullable=True)
    titulo = Column(Text, nullable=False)
    descripcion = Column(Text)
    obligatoria = Column(Boolean, default=True)
    visible = Column(Boolean, default=True)
    opciones = Column(JSON, default=[])
    configuracion = Column(JSON, default={})
    condicion = Column(JSON, nullable=True)
    validaciones = Column(JSON, nullable=True)
    puntaje = Column(Float, default=0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # ✅ RELACIONES
    cuestionario = relationship("Cuestionario", back_populates="preguntas")
    respuestas = relationship("RespuestaPregunta", back_populates="pregunta", cascade="all, delete-orphan")


class RespuestaCuestionario(Base):
    __tablename__ = "respuestas_cuestionario"
    __table_args__ = {'extend_existing': True}

    id = Column(String, primary_key=True)
    cuestionario_id = Column(String, ForeignKey("cuestionarios.id", ondelete="CASCADE"), nullable=False)  # ✅ FK
    usuario_id = Column(String, nullable=True)
    email = Column(String(200))
    nombre = Column(String(200))
    empresa = Column(String(200))
    departamento = Column(String(100))
    ip = Column(String(50))
    user_agent = Column(Text)
    ubicacion = Column(JSON, nullable=True)
    tiempo_total = Column(Integer, default=0)
    completado = Column(Boolean, default=True)
    puntaje_total = Column(Float, default=0)
    porcentaje = Column(Float, default=0)
    fecha_inicio = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    fecha_fin = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # ✅ RELACIONES
    cuestionario = relationship("Cuestionario", back_populates="respuestas")
    respuestas_preguntas = relationship("RespuestaPregunta", back_populates="respuesta", cascade="all, delete-orphan")


class RespuestaPregunta(Base):
    __tablename__ = "respuestas_preguntas"
    __table_args__ = {'extend_existing': True}

    id = Column(String, primary_key=True)
    respuesta_id = Column(String, ForeignKey("respuestas_cuestionario.id", ondelete="CASCADE"), nullable=False)  # ✅ FK
    pregunta_id = Column(String, ForeignKey("preguntas_cuestionario.id", ondelete="CASCADE"), nullable=False)  # ✅ FK
    valor_texto = Column(Text)
    valor_numero = Column(Float)
    valor_boolean = Column(Boolean)
    valor_fecha = Column(DateTime)
    valor_opcion = Column(String)
    valor_opciones = Column(JSON, default=[])
    valor_matriz = Column(JSON, default={})
    valor_archivo = Column(String(500))
    valor_slider = Column(Float)
    valor_estrellas = Column(Integer)
    valor_emocion = Column(String(50))
    valor_ordenamiento = Column(JSON, default=[])
    es_correcta = Column(Boolean, default=False)
    puntaje_obtenido = Column(Float, default=0)
    tiempo_respuesta = Column(Integer, default=0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # ✅ RELACIONES
    respuesta = relationship("RespuestaCuestionario", back_populates="respuestas_preguntas")
    pregunta = relationship("PreguntaCuestionario", back_populates="respuestas")