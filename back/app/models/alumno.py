# app/models/alumno.py
# VERSIÓN CORREGIDA - CON RECARGA FORZADA DE METADATOS
# MODELO PRINCIPAL UNIFICADO DE ALUMNOS

from sqlalchemy import Column, String, Integer, DateTime, Text, Boolean
from sqlalchemy.ext.declarative import declarative_base
from app.database import Base
from datetime import datetime, timezone
import uuid


class Alumno(Base):
    __tablename__ = "alumnos"
    # ✅ FORZAR RECARGA DE METADATOS - SOLUCIONA EL ERROR DE COLUMNA FALTANTE
    # extend_existing: Permite extender la tabla existente
    # keep_existing: False para forzar recarga de columnas
    __table_args__ = {'extend_existing': True, 'keep_existing': False}

    # =============================================
    # IDENTIFICADOR PRINCIPAL
    # =============================================
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # =============================================
    # FASE F: PUENTE CON USUARIOS REGISTRADOS
    # Para un estudiante registrado en la plataforma, alumno.id == usuario.id
    # usuario_id queda como referencia explícita para consultas
    # =============================================
    usuario_id = Column(String(100), nullable=True, index=True)
    
    # =============================================
    # DATOS PERSONALES
    # =============================================
    nombres = Column(String(200), nullable=False)
    apellidos = Column(String(200), nullable=False)
    dni = Column(String(20), unique=True, nullable=True, index=True)
    email = Column(String(200), nullable=True)
    telefono = Column(String(20), nullable=True)
    
    # =============================================
    # DATOS ACADÉMICOS
    # =============================================
    grado = Column(String(50), nullable=True)
    grupo = Column(String(100), nullable=True)
    grupo_id = Column(String(100), nullable=True, index=True)
    nivel = Column(String(50), nullable=True)
    institucion = Column(String(200), nullable=True)
    
    # =============================================
    # DATOS ADICIONALES
    # =============================================
    direccion = Column(Text, nullable=True)
    fecha_nacimiento = Column(DateTime, nullable=True)
    genero = Column(String(20), nullable=True)
    
    # =============================================
    # ESTADO Y AUDITORÍA
    # =============================================
    activo = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    created_by = Column(String, nullable=True)
    
    # =============================================
    # PROPIEDADES CALCULADAS
    # =============================================
    
    @property
    def nombre_completo(self):
        """Retorna el nombre completo: Apellidos, Nombres"""
        return f"{self.apellidos}, {self.nombres}"
    
    @property
    def nombre_corto(self):
        """Retorna el nombre corto: Nombres Apellidos"""
        return f"{self.nombres} {self.apellidos}"
    
    @property
    def iniciales(self):
        """Retorna las iniciales del alumno"""
        if self.nombres and self.apellidos:
            nombres_partes = self.nombres.split()
            apellidos_partes = self.apellidos.split()
            iniciales = ""
            if nombres_partes:
                iniciales += nombres_partes[0][0]
            if apellidos_partes:
                iniciales += apellidos_partes[0][0]
            return iniciales.upper()
        return ""
    
    # =============================================
    # MÉTODOS DE REPRESENTACIÓN
    # =============================================
    
    def __repr__(self):
        return f"<Alumno {self.nombre_completo} (ID: {self.id})>"
    
    def __str__(self):
        return self.nombre_completo
    
    def to_dict(self):
        """Convierte el alumno a diccionario para respuestas API"""
        return {
            "id": self.id,
            "usuario_id": self.usuario_id,
            "nombres": self.nombres,
            "apellidos": self.apellidos,
            "nombre_completo": self.nombre_completo,
            "nombre_corto": self.nombre_corto,
            "iniciales": self.iniciales,
            "dni": self.dni,
            "email": self.email,
            "telefono": self.telefono,
            "grado": self.grado,
            "grupo": self.grupo,
            "grupo_id": self.grupo_id,
            "nivel": self.nivel,
            "institucion": self.institucion,
            "direccion": self.direccion,
            "fecha_nacimiento": self.fecha_nacimiento.isoformat() if self.fecha_nacimiento else None,
            "genero": self.genero,
            "activo": self.activo,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "created_by": self.created_by
        }