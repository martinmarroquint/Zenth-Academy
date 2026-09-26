# app/models/cupon.py
# MÓDULO DE CUPONES Y PROMOCIONES
# Los cupones se aplican a la solicitud de acceso de cursos de pago.

from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, Text
from app.database import Base
from datetime import datetime, timezone
import uuid


class Cupon(Base):
    __tablename__ = "cupones"
    __table_args__ = {'extend_existing': True}

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    codigo = Column(String(40), unique=True, nullable=False, index=True)
    descripcion = Column(Text, nullable=True)
    # tipo: porcentaje | monto
    tipo = Column(String(20), default="porcentaje")
    valor = Column(Float, default=0.0)
    # curso_id NULL = aplica a cualquier curso
    curso_id = Column(String, nullable=True, index=True)
    max_usos = Column(Integer, nullable=True)  # NULL = ilimitado
    usos = Column(Integer, default=0)
    usos_por_usuario = Column(Integer, default=1)
    fecha_inicio = Column(DateTime, nullable=True)
    fecha_fin = Column(DateTime, nullable=True)
    activo = Column(Boolean, default=True, index=True)
    creado_por = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )


class CuponUso(Base):
    """Historial de uso de cada cupón (auditoría de descuentos)."""

    __tablename__ = "cupon_usos"
    __table_args__ = {'extend_existing': True}

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    cupon_id = Column(String, nullable=False, index=True)
    codigo = Column(String(40), nullable=True)
    usuario_id = Column(String, nullable=False, index=True)
    usuario_nombre = Column(String(200), nullable=True)
    curso_id = Column(String, nullable=True, index=True)
    curso_titulo = Column(String(300), nullable=True)
    monto_base = Column(Float, default=0.0)
    monto_descuento = Column(Float, default=0.0)
    monto_final = Column(Float, default=0.0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
