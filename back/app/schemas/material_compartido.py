# app/schemas/material_compartido.py
# SCHEMAS PARA MATERIAL COMPARTIDO

from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime


class MaterialCreate(BaseModel):
    titulo: str
    descripcion: Optional[str] = None
    tipo: str
    contenido: Optional[str] = None
    nombre_archivo: Optional[str] = None
    url_archivo: Optional[str] = None


class MaterialUpdate(BaseModel):
    titulo: Optional[str] = None
    descripcion: Optional[str] = None
    tipo: Optional[str] = None
    contenido: Optional[str] = None
    nombre_archivo: Optional[str] = None
    url_archivo: Optional[str] = None
    activo: Optional[bool] = None


class MaterialResponse(BaseModel):
    id: str
    titulo: str
    descripcion: Optional[str] = None
    tipo: str
    contenido: Optional[str] = None
    nombre_archivo: Optional[str] = None
    url_archivo: Optional[str] = None
    activo: bool = True
    visitas: int = 0
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class MensajeResponse(BaseModel):
    mensaje: str
    ok: bool = True