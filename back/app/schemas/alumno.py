# app/schemas/alumno.py
# ESQUEMAS DE ALUMNO UNIFICADO

from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List  # ✅ AGREGAR List
from datetime import datetime


class AlumnoBase(BaseModel):
    nombres: str = Field(..., min_length=2, max_length=200)
    apellidos: str = Field(..., min_length=2, max_length=200)
    dni: Optional[str] = Field(None, max_length=20)
    email: Optional[EmailStr] = None
    telefono: Optional[str] = Field(None, max_length=20)
    grado: Optional[str] = Field(None, max_length=50)
    grupo: Optional[str] = Field(None, max_length=100)
    grupo_id: Optional[str] = Field(None, max_length=100)
    nivel: Optional[str] = Field(None, max_length=50)
    institucion: Optional[str] = Field(None, max_length=200)
    direccion: Optional[str] = None
    fecha_nacimiento: Optional[datetime] = None
    genero: Optional[str] = Field(None, max_length=20)


class AlumnoCreate(AlumnoBase):
    pass


class AlumnoUpdate(BaseModel):
    nombres: Optional[str] = Field(None, min_length=2, max_length=200)
    apellidos: Optional[str] = Field(None, min_length=2, max_length=200)
    dni: Optional[str] = Field(None, max_length=20)
    email: Optional[EmailStr] = None
    telefono: Optional[str] = Field(None, max_length=20)
    grado: Optional[str] = Field(None, max_length=50)
    grupo: Optional[str] = Field(None, max_length=100)
    grupo_id: Optional[str] = Field(None, max_length=100)
    nivel: Optional[str] = Field(None, max_length=50)
    institucion: Optional[str] = Field(None, max_length=200)
    direccion: Optional[str] = None
    fecha_nacimiento: Optional[datetime] = None
    genero: Optional[str] = Field(None, max_length=20)
    activo: Optional[bool] = None


class AlumnoResponse(AlumnoBase):
    id: str
    nombre_completo: str
    activo: bool
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class AlumnoListResponse(BaseModel):
    total: int
    alumnos: List[AlumnoResponse]  # ✅ Ahora List está definido


class MensajeResponse(BaseModel):
    mensaje: str
    ok: bool = True