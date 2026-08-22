# app/api/config/cliente.py
# ENDPOINT DE CONFIGURACIÓN DE CLIENTE

from fastapi import APIRouter, Query

router = APIRouter()


@router.get("/publico")
async def get_cliente_config_publico(
    subdominio: str = Query("default", description="Subdominio del cliente")
):
    """
    Obtiene la configuración pública de un cliente por subdominio.
    """
    return {
        "id": "default",
        "nombre": "Zenth Academy",
        "subdominio": subdominio,
        "logo_url": None,
        "favicon_url": None,
        "color_primario": "#188C5D",
        "color_secundario": "#065F46",
        "color_acento": "#4F46E5",
        "modulos": {
            "examenes": True,
            "carpeta_docente": True,
            "cuestionarios": True,
            "pizarra": True,
            "integraciones": True,
            "cursos": True,
            "foro": True,
            "certificados": True
        },
        "mensaje_bienvenida": "Bienvenido a Zenth Academy - Ecosistema Educativo",
        "features": {
            "allow_registration": True,
            "allow_guest_access": True,
            "max_users": 100,
            "max_storage": "1GB"
        },
        "social": {
            "facebook": None,
            "twitter": None,
            "instagram": None,
            "youtube": None
        },
        "contacto": {
            "email": "soporte@zenthacademy.com",
            "telefono": None,
            "direccion": None
        }
    }