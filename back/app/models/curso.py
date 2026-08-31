# app/models/curso.py
# VERSIÓN COMPLETA - CON SISTEMA DE SOLICITUDES Y ACCESO
# CORREGIDO: EvaluacionLeccion usa Base (SQLAlchemy), no BaseModel (Pydantic)

from sqlalchemy import Column, String, Integer, Boolean, DateTime, Text, JSON, Numeric, Enum
from app.database import Base
from datetime import datetime, timezone
import uuid
import enum


class TipoBloqueo(str, enum.Enum):
    NINGUNO = "ninguno"
    FECHA = "fecha"
    SECUENCIAL = "secuencial"
    DESEMPEÑO = "desempeno"
    MIXTO = "mixto"


class Curso(Base):
    __tablename__ = "cursos"
    __table_args__ = {'extend_existing': True}

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    titulo = Column(String(300), nullable=False)
    descripcion = Column(Text, nullable=True)
    categoria = Column(String(100), nullable=True)
    nivel = Column(String(50), default="principiante")
    docente_id = Column(String, nullable=True)
    docente_nombre = Column(String(200), nullable=True)
    instructor = Column(String(200), nullable=True)  # Nombre del instructor (ingresado manualmente)
    duracion = Column(String(100), nullable=True)
    
    # SISTEMA DE PAGOS
    precio_tipo = Column(String(20), default="gratis")
    precio_monto = Column(Numeric(10, 2), nullable=True)
    moneda = Column(String(10), default="PEN")
    metodo_pago = Column(String(50), nullable=True)
    numero_pago = Column(String(20), nullable=True)
    instrucciones_pago = Column(Text, nullable=True)
    
    # CONFIGURACIÓN DE BLOQUEO
    tipo_bloqueo = Column(String(20), default="ninguno")
    bloqueo_config = Column(JSON, default=dict)

    # CERTIFICADO
    certificado_habilitado = Column(Boolean, default=True)
    certificado_nota_minima = Column(Numeric(5, 2), nullable=True)
    
    imagen_url = Column(String(500), nullable=True)
    estado = Column(String(20), default="borrador")
    modulos = Column(JSON, default=list)
    estudiantes_count = Column(Integer, default=0)
    rating = Column(Integer, default=0)
    rating_count = Column(Integer, default=0)
    
    # METADATA
    etiquetas = Column(JSON, default=list)
    requisitos = Column(JSON, default=list)
    objetivos = Column(JSON, default=list)
    publico_objetivo = Column(String(200), nullable=True)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class InscripcionCurso(Base):
    __tablename__ = "inscripciones_cursos"
    __table_args__ = {'extend_existing': True}

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    curso_id = Column(String, nullable=False)
    estudiante_id = Column(String, nullable=False)
    estudiante_nombre = Column(String(200), nullable=True)
    progreso = Column(Integer, default=0)
    completado = Column(Boolean, default=False)
    lecciones_completadas = Column(JSON, default=list)
    fecha_inscripcion = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    fecha_completado = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class SolicitudAccesoCurso(Base):
    """Solicitud de acceso a un curso pago (estudiante reporta pago)"""
    __tablename__ = "solicitudes_acceso_curso"
    __table_args__ = {'extend_existing': True}

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    curso_id = Column(String, nullable=False)
    estudiante_id = Column(String, nullable=False)
    estudiante_nombre = Column(String(200), nullable=True)
    estudiante_email = Column(String(200), nullable=True)
    estudiante_telefono = Column(String(20), nullable=True)
    estado = Column(String(20), default="pendiente")
    mensaje_estudiante = Column(Text, nullable=True)
    comentario_docente = Column(Text, nullable=True)
    metodo_pago = Column(String(20), nullable=True)
    referencia_pago = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class AccesoCurso(Base):
    """Acceso activo de un estudiante a un curso"""
    __tablename__ = "accesos_cursos"
    __table_args__ = {'extend_existing': True}

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    curso_id = Column(String, nullable=False)
    estudiante_id = Column(String, nullable=False)
    estudiante_nombre = Column(String(200), nullable=True)
    activo = Column(Boolean, default=True)
    tipo_acceso = Column(String(20), default="vitalicio")
    sesiones_restantes = Column(Integer, nullable=True)
    fecha_inicio = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    fecha_expiracion = Column(DateTime, nullable=True)
    ultimo_acceso = Column(DateTime, nullable=True)
    activado_por = Column(String, nullable=True)
    comentario = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class ProgresoLeccion(Base):
    """Progreso individual de cada lección para un estudiante"""
    __tablename__ = "progreso_lecciones"
    __table_args__ = {'extend_existing': True}

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    curso_id = Column(String, nullable=False)
    estudiante_id = Column(String, nullable=False)
    leccion_id = Column(String, nullable=False)
    modulo_id = Column(String, nullable=True)
    completado = Column(Boolean, default=False)
    fecha_completado = Column(DateTime, nullable=True)
    tiempo_invertido = Column(Integer, default=0)
    nota = Column(Numeric(5, 2), nullable=True)
    aprobado = Column(Boolean, default=False)
    intentos = Column(Integer, default=0)
    fecha_ultimo_intento = Column(DateTime, nullable=True)
    fecha_liberacion = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    @property
    def desbloqueado(self) -> bool:
        """True si la lección fue liberada (manualmente o por aprobación de evaluación)"""
        return self.fecha_liberacion is not None


# ✅ CORREGIDO: Usa Base (SQLAlchemy), no BaseModel
class EvaluacionLeccion(Base):
    """Configuración de evaluación para una lección (bloqueo por desempeño)"""
    __tablename__ = "evaluaciones_lecciones"
    __table_args__ = {'extend_existing': True}

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    curso_id = Column(String, nullable=False)
    leccion_id = Column(String, nullable=False)
    tipo = Column(String(20), default="examen")
    entidad_id = Column(String, nullable=True)
    nota_minima = Column(Numeric(5, 2), default=3.0)
    intentos_maximos = Column(Integer, default=3)
    tiempo_limite = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))