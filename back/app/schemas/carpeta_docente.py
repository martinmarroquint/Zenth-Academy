# app/schemas/carpeta_docente.py
# SCHEMAS PARA CARPETA DOCENTE

from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime


class CarpetaDocenteCreate(BaseModel):
    nombre: Optional[str] = "Mi Carpeta"
    docente_id: Optional[str] = None
    archivos: Optional[List[Dict]] = []
    recursos: Optional[List[Dict]] = []


class CarpetaDocenteUpdate(BaseModel):
    nombre: Optional[str] = None
    archivos: Optional[List[Dict]] = None
    recursos: Optional[List[Dict]] = None


class CarpetaDocenteResponse(BaseModel):
    id: str
    nombre: str
    docente_id: Optional[str]
    archivos: Optional[List[Dict]]
    recursos: Optional[List[Dict]]
    created_at: Optional[datetime]
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


class CarpetaSyncRequest(BaseModel):
    carpeta_id: Optional[str] = None
    docente_id: str
    data: Optional[Any] = None
    encrypted: Optional[bool] = False


class MensajeResponse(BaseModel):
    mensaje: str
    ok: bool = True