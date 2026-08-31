# app/core/security_headers.py
# MIDDLEWARE DE HEADERS DE SEGURIDAD
# Protege contra XSS, clickjacking, MIME sniffing, etc.

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from typing import Callable


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Middleware que agrega headers de seguridad a todas las respetas.
    
    Headers incluidos:
    - X-Content-Type-Options: Previene MIME sniffing
    - X-Frame-Options: Previene clickjacking
    - X-XSS-Protection: Protección XSS legacy
    - Strict-Transport-Security: Fuerza HTTPS
    - Referrer-Policy: Control de referrer
    - Permissions-Policy: Restringe features del navegador
    - Content-Security-Policy: Previene XSS y data injection
    """
    
    def __init__(self, app, environment: str = "production"):
        super().__init__(app)
        self.environment = environment
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        response = await call_next(request)
        
        # Headers de seguridad comunes
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=(), payment=()"
        
        # HSTS solo en producción (HTTPS)
        if self.environment == "production":
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        
        # Content Security Policy
        csp_directives = [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://unpkg.com",
            "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://unpkg.com https://fonts.googleapis.com",
            "font-src 'self' https://fonts.gstatic.com https://cdn.jsdelivr.net",
            "img-src 'self' data: blob: https:",
            "connect-src 'self' https://*.supabase.co https://*.supabase.in wss://*.supabase.co",
            "media-src 'self'",
            "object-src 'none'",
            "frame-ancestors 'none'",
            "base-uri 'self'",
            "form-action 'self'",
        ]
        
        # En desarrollo, relajar CSP para Vite
        if self.environment == "development":
            csp_directives[1] = "script-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:*"
            csp_directives[2] = "style-src 'self' 'unsafe-inline' http://localhost:*"
            csp_directives[5] = "connect-src 'self' http://localhost:* https://*.supabase.co"
        
        response.headers["Content-Security-Policy"] = "; ".join(csp_directives)
        
        # Header personalizado para identificar el servidor
        response.headers["X-Powered-By"] = "Zenth Academy"
        
        return response
