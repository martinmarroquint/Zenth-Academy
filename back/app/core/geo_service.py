# app/core/geo_service.py
# SERVICIO DE GEOLOCALIZACION POR IP
# Usa ip-api.com (gratis, sin API key) para resolver la ubicacion geografica

import ipaddress
import logging
import httpx
from typing import Optional, Dict

logger = logging.getLogger(__name__)

# API de geolocalizacion (gratis, sin key)
GEO_API_URL = "http://ip-api.com/json/{ip}?fields=status,country,countryCode,regionName,city,lat,lon,timezone,isp"
GEO_TIMEOUT = 5  # segundos


def is_private_ip(ip: str) -> bool:
    """Verifica si una IP es local, privada o reservada"""
    try:
        addr = ipaddress.ip_address(ip)
        return addr.is_private or addr.is_loopback or addr.is_reserved or addr.is_link_local
    except ValueError:
        return True  # IP malformada = tratar como privada


async def resolve_geo_from_ip(ip: str) -> Optional[Dict]:
    """
    Resuelve la ubicacion geografica a partir de una IP.
    
    Args:
        ip: Direccion IP del usuario
        
    Returns:
        dict con datos geograficos o None si falla
    """
    # Saltar IPs privadas/locales
    if is_private_ip(ip):
        return {
            "pais": "Local",
            "pais_code": "LOCAL",
            "region": "Desarrollo",
            "ciudad": "localhost",
            "lat": 0.0,
            "lon": 0.0,
            "timezone_geo": "UTC",
            "isp": "Local"
        }
    
    try:
        async with httpx.AsyncClient(timeout=GEO_TIMEOUT) as client:
            response = await client.get(GEO_API_URL.format(ip=ip))
            
            if response.status_code != 200:
                logger.warning(f"Geo API respondio con status {response.status_code}")
                return None
            
            data = response.json()
            
            if data.get("status") == "fail":
                logger.warning(f"Geo API fallo para IP {ip}: {data.get('message', 'unknown')}")
                return None
            
            return {
                "pais": data.get("country"),
                "pais_code": data.get("countryCode"),
                "region": data.get("regionName"),
                "ciudad": data.get("city"),
                "lat": data.get("lat"),
                "lon": data.get("lon"),
                "timezone_geo": data.get("timezone"),
                "isp": data.get("isp")
            }
    
    except httpx.TimeoutException:
        logger.warning(f"Geo API timeout para IP {ip}")
        return None
    except httpx.RequestError as e:
        logger.warning(f"Geo API error de conexion para IP {ip}: {e}")
        return None
    except Exception as e:
        logger.error(f"Error inesperado en geo lookup para IP {ip}: {e}")
        return None


async def log_login_geo(
    db_session,
    user_id: str,
    email: str,
    ip_address: str,
    user_agent: Optional[str] = None
):
    """
    Registra la geolocalizacion de un login en la base de datos.
    Fire-and-forget: no bloquea el login del usuario.
    
    Args:
        db_session: Session de SQLAlchemy
        user_id: ID del usuario
        email: Email del usuario
        ip_address: IP del cliente
        user_agent: User-Agent del navegador
    """
    from app.models.login_geo_log import LoginGeoLog
    
    try:
        geo_data = await resolve_geo_from_ip(ip_address)
        
        log_entry = LoginGeoLog(
            user_id=user_id,
            email=email,
            ip_address=ip_address,
            user_agent=user_agent,
            pais=geo_data.get("pais") if geo_data else None,
            pais_code=geo_data.get("pais_code") if geo_data else None,
            region=geo_data.get("region") if geo_data else None,
            ciudad=geo_data.get("ciudad") if geo_data else None,
            lat=geo_data.get("lat") if geo_data else None,
            lon=geo_data.get("lon") if geo_data else None,
            timezone_geo=geo_data.get("timezone_geo") if geo_data else None,
            isp=geo_data.get("isp") if geo_data else None,
        )
        
        db_session.add(log_entry)
        db_session.commit()
        
        logger.info(f"Geo login registrado: {email} -> {geo_data.get('ciudad', '?')}, {geo_data.get('pais', '?')}")
        
    except Exception as e:
        logger.error(f"Error guardando geo log para {email}: {e}")
        try:
            db_session.rollback()
        except Exception:
            pass
