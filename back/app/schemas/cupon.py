# app/schemas/cupon.py
# SCHEMAS DEL MÓDULO DE CUPONES Y PROMOCIONES

from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class CuponBase(BaseModel):
    codigo: str
    descripcion: Optional[str] = None
    tipo: str = "porcentaje"  # porcentaje | monto
    valor: float = 0.0
    curso_id: Optional[str] = None  # None = todos los cursos
    max_usos: Optional[int] = None  # None = ilimitado
    usos_por_usuario: Optional[int] = 1
    fecha_inicio: Optional[datetime] = None
    fecha_fin: Optional[datetime] = None
    activo: bool = True


class CuponCreate(CuponBase):
    pass


class CuponUpdate(BaseModel):
    descripcion: Optional[str] = None
    tipo: Optional[str] = None
    valor: Optional[float] = None
    curso_id: Optional[str] = None
    max_usos: Optional[int] = None
    usos_por_usuario: Optional[int] = None
    fecha_inicio: Optional[datetime] = None
    fecha_fin: Optional[datetime] = None
    activo: Optional[bool] = None


class CuponResponse(BaseModel):
    id: str
    codigo: str
    descripcion: Optional[str]
    tipo: str
    valor: float
    curso_id: Optional[str]
    curso_titulo: Optional[str] = None
    max_usos: Optional[int]
    usos: int
    usos_por_usuario: Optional[int]
    fecha_inicio: Optional[datetime]
    fecha_fin: Optional[datetime]
    activo: bool
    # vigente | programado | expirado | agotado | inactivo
    vigencia: str
    created_at: Optional[datetime]
    updated_at: Optional[datetime]


class ValidarCuponRequest(BaseModel):
    codigo: str
    curso_id: Optional[str] = None


class ValidarCuponResponse(BaseModel):
    valido: bool
    motivo: Optional[str] = None
    codigo: Optional[str] = None
    tipo: Optional[str] = None
    valor: Optional[float] = None
    monto_base: Optional[float] = None
    monto_descuento: Optional[float] = None
    monto_final: Optional[float] = None


class CuponUsoResponse(BaseModel):
    id: str
    codigo: Optional[str]
    usuario_id: str
    usuario_nombre: Optional[str]
    curso_titulo: Optional[str]
    monto_base: float
    monto_descuento: float
    monto_final: float
    created_at: Optional[datetime]


class MensajeResponse(BaseModel):
    mensaje: str
    ok: bool = True
