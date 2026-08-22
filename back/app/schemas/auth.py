# app/schemas/auth.py
# ESQUEMAS DE AUTENTICACIÓN - CON EMPRESA_ID

from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import Optional, List
from datetime import datetime


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: Optional[str] = None
    expires_in: Optional[int] = None
    token_type: str = "bearer"
    user: "UserResponse"


class TokenRefreshResponse(BaseModel):
    access_token: str
    refresh_token: str
    expires_in: int
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str = Field(..., min_length=10)


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=100)
    nombres: Optional[str] = Field(None, max_length=200)
    apellidos: Optional[str] = Field(None, max_length=200)
    telefono: Optional[str] = Field(None, max_length=20)
    rol: str = Field("estudiante", pattern="^(admin|docente|estudiante)$")
    institucion: Optional[str] = Field(None, max_length=200)
    especialidad: Optional[str] = Field(None, max_length=200)


class RegisterResponse(BaseModel):
    id: str
    email: str
    nombres: Optional[str] = None
    apellidos: Optional[str] = None
    rol: str
    empresa_id: Optional[str] = None
    activo: bool
    fecha_registro: Optional[datetime] = None


class UserResponse(BaseModel):
    id: str
    email: str
    nombres: Optional[str] = None
    apellidos: Optional[str] = None
    nombre_completo: Optional[str] = None
    rol: str
    empresa_id: Optional[str] = None
    activo: bool
    email_verificado: bool
    telefono: Optional[str] = None
    foto_url: Optional[str] = None
    especialidad: Optional[str] = None
    biografia: Optional[str] = None
    institucion: Optional[str] = None
    ultimo_acceso: Optional[datetime] = None
    fecha_registro: Optional[datetime] = None
    
    model_config = ConfigDict(from_attributes=True)


class UserUpdateRequest(BaseModel):
    nombres: Optional[str] = Field(None, max_length=200)
    apellidos: Optional[str] = Field(None, max_length=200)
    telefono: Optional[str] = Field(None, max_length=20)
    foto_url: Optional[str] = Field(None, max_length=500)
    especialidad: Optional[str] = Field(None, max_length=200)
    biografia: Optional[str] = None
    institucion: Optional[str] = Field(None, max_length=200)
    rol: Optional[str] = Field(None, pattern="^(admin|docente|estudiante)$")


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(..., min_length=6)
    new_password: str = Field(..., min_length=6)


class UserCreateRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)
    nombres: Optional[str] = Field(None, max_length=200)
    apellidos: Optional[str] = Field(None, max_length=200)
    rol: str = Field("estudiante", pattern="^(admin|docente|estudiante)$")


class UserListResponse(BaseModel):
    total: int
    usuarios: List[UserResponse]


class MensajeResponse(BaseModel):
    mensaje: str
    ok: bool = True