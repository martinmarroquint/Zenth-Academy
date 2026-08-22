# app/models/usuario.py
# VERSIÓN COMPLETA - CON EMPRESA_ID

from sqlalchemy import Column, String, Boolean, DateTime, Text
from app.database import Base
from datetime import datetime, timezone
import uuid
from passlib.context import CryptContext

# ✅ Usar Argon2
pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")


class Usuario(Base):
    __tablename__ = "usuarios"
    __table_args__ = {'extend_existing': True}

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # Credenciales
    email = Column(String(200), unique=True, nullable=False, index=True)
    password_hash = Column(String(200), nullable=False)
    
    # Datos personales
    nombres = Column(String(200), nullable=True)
    apellidos = Column(String(200), nullable=True)
    telefono = Column(String(20), nullable=True)
    foto_url = Column(String(500), nullable=True)
    
    # ✅ EMPRESA - Para multi-tenencia
    empresa_id = Column(String, nullable=True, index=True)
    
    # ✅ ROL EDUCATIVO
    rol = Column(String(20), default="estudiante")  # admin, docente, estudiante
    
    # ✅ ROL GLOBAL (para compatibilidad)
    rol_global = Column(String(20), default="usuario")
    
    # Estado
    activo = Column(Boolean, default=True)
    email_verificado = Column(Boolean, default=False)
    
    # Datos adicionales
    especialidad = Column(String(200), nullable=True)
    biografia = Column(Text, nullable=True)
    institucion = Column(String(200), nullable=True)
    
    # Metadatos
    ultimo_acceso = Column(DateTime, nullable=True)
    fecha_registro = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    @property
    def nombre_completo(self):
        if self.nombres and self.apellidos:
            return f"{self.nombres} {self.apellidos}"
        return self.nombres or self.email
    
    @property
    def es_admin(self):
        return self.rol == "admin"
    
    @property
    def es_docente(self):
        return self.rol in ["admin", "docente"]
    
    @property
    def es_estudiante(self):
        return self.rol == "estudiante"
    
    def set_password(self, password: str):
        """Hashea la contraseña usando ARGON2"""
        self.password_hash = pwd_context.hash(password)
    
    def verify_password(self, password: str) -> bool:
        """Verifica la contraseña usando ARGON2"""
        if not self.password_hash:
            return False
        try:
            return pwd_context.verify(password, self.password_hash)
        except Exception:
            return False
    
    def __repr__(self):
        return f"<Usuario {self.email} ({self.rol})>"