# app/api/config/__init__.py
# INICIALIZADOR DEL MÓDULO DE CONFIGURACIÓN DE API

from app.api.config.cliente import router as cliente_router

__all__ = ['cliente_router']