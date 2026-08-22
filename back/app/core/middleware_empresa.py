# app/core/middleware_empresa.py
# VERSION CORREGIDA - IGNORA TODAS LAS OPTIONS

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from app.core.security import decode_token
from typing import List

# Endpoints que NO requieren contexto de empresa
EXCLUDED_PATHS: List[str] = [
    "/api/v1/auth/login",
    "/api/v1/auth/verificar",
    "/api/v1/config/cliente/publico",
    "/docs",
    "/redoc",
    "/openapi.json",
    "/health",
    "/ready",
    "/db-check",
    "/info",
    "/",
]


class EmpresaContextMiddleware(BaseHTTPMiddleware):
    """
    Middleware que extrae la informacion de empresa del JWT
    y la almacena en request.state para uso en toda la aplicacion.
    """
    
    async def dispatch(self, request: Request, call_next):
        # ✅ LO MAS IMPORTANTE: Ignorar TODAS las peticiones OPTIONS
        if request.method == "OPTIONS":
            return await call_next(request)
        
        # Inicializar valores por defecto
        request.state.empresa_id = None
        request.state.rol_global = "usuario"
        request.state.user_id = None
        request.state.roles = []
        
        # Excluir endpoints publicos
        path = request.url.path
        if any(path.startswith(excluded) for excluded in EXCLUDED_PATHS):
            return await call_next(request)
        
        # Extraer token del header Authorization
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.replace("Bearer ", "")
            payload = decode_token(token)
            
            if payload:
                # Inyectar datos en request.state
                request.state.empresa_id = payload.get("empresa_id")
                request.state.rol_global = payload.get("rol_global", "usuario")
                request.state.user_id = payload.get("user_id")
                request.state.personal_id = payload.get("personal_id")
                request.state.roles = payload.get("roles", [])
                request.state.area = payload.get("area")
        
        return await call_next(request)


def get_empresa_id_from_request(request: Request) -> str:
    return getattr(request.state, "empresa_id", None)


def get_rol_global_from_request(request: Request) -> str:
    return getattr(request.state, "rol_global", "usuario")


def get_current_context(request: Request) -> dict:
    return {
        "empresa_id": getattr(request.state, "empresa_id", None),
        "rol_global": getattr(request.state, "rol_global", "usuario"),
        "user_id": getattr(request.state, "user_id", None),
        "personal_id": getattr(request.state, "personal_id", None),
        "roles": getattr(request.state, "roles", []),
        "area": getattr(request.state, "area", None),
    }