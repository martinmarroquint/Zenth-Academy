# app/api/geo_analytics.py
# ENDPOINTS DE ANALYTICS GEOGRAFICOS
# Panel admin para visualizar distribucion de usuarios por region

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from typing import Optional
from datetime import datetime, timedelta, timezone

from app.database import get_db
from app.models.login_geo_log import LoginGeoLog
from app.core.dependencies import require_admin

router = APIRouter()


@router.get("/stats")
def get_geo_stats(
    days: int = Query(30, ge=1, le=365, description="Dias hacia atras"),
    admin=Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Estadisticas geograficas de logins.
    Retorna: paises, ciudades, usuarios unicos, logins totales.
    """
    desde = datetime.now(timezone.utc) - timedelta(days=days)
    
    # Logins por pais
    por_pais = (
        db.query(
            LoginGeoLog.pais,
            LoginGeoLog.pais_code,
            func.count(LoginGeoLog.id).label("logins"),
            func.count(func.distinct(LoginGeoLog.user_id)).label("usuarios_unicos")
        )
        .filter(LoginGeoLog.created_at >= desde)
        .filter(LoginGeoLog.pais.isnot(None))
        .group_by(LoginGeoLog.pais, LoginGeoLog.pais_code)
        .order_by(desc("logins"))
        .all()
    )
    
    # Logins por ciudad (top 20)
    por_ciudad = (
        db.query(
            LoginGeoLog.ciudad,
            LoginGeoLog.pais,
            func.count(LoginGeoLog.id).label("logins"),
            func.count(func.distinct(LoginGeoLog.user_id)).label("usuarios_unicos")
        )
        .filter(LoginGeoLog.created_at >= desde)
        .filter(LoginGeoLog.ciudad.isnot(None))
        .filter(LoginGeoLog.ciudad != "localhost")
        .group_by(LoginGeoLog.ciudad, LoginGeoLog.pais)
        .order_by(desc("logins"))
        .limit(20)
        .all()
    )
    
    # Logins por ISP (top 10)
    por_isp = (
        db.query(
            LoginGeoLog.isp,
            func.count(LoginGeoLog.id).label("logins"),
            func.count(func.distinct(LoginGeoLog.user_id)).label("usuarios_unicos")
        )
        .filter(LoginGeoLog.created_at >= desde)
        .filter(LoginGeoLog.isp.isnot(None))
        .filter(LoginGeoLog.isp != "Local")
        .group_by(LoginGeoLog.isp)
        .order_by(desc("logins"))
        .limit(10)
        .all()
    )
    
    # Logins por dia (ultimos 30 dias)
    por_dia = (
        db.query(
            func.date(LoginGeoLog.created_at).label("fecha"),
            func.count(LoginGeoLog.id).label("logins"),
            func.count(func.distinct(LoginGeoLog.user_id)).label("usuarios_unicos")
        )
        .filter(LoginGeoLog.created_at >= desde)
        .group_by(func.date(LoginGeoLog.created_at))
        .order_by("fecha")
        .all()
    )
    
    # Totales generales
    total_logins = (
        db.query(func.count(LoginGeoLog.id))
        .filter(LoginGeoLog.created_at >= desde)
        .scalar() or 0
    )
    
    total_usuarios_unicos = (
        db.query(func.count(func.distinct(LoginGeoLog.user_id)))
        .filter(LoginGeoLog.created_at >= desde)
        .scalar() or 0
    )
    
    total_paises = (
        db.query(func.count(func.distinct(LoginGeoLog.pais)))
        .filter(LoginGeoLog.created_at >= desde)
        .filter(LoginGeoLog.pais.isnot(None))
        .filter(LoginGeoLog.pais != "Local")
        .scalar() or 0
    )
    
    return {
        "resumen": {
            "total_logins": total_logins,
            "usuarios_unicos": total_usuarios_unicos,
            "paises_activos": total_paises,
            "periodo_dias": days
        },
        "por_pais": [
            {
                "pais": p.pais,
                "pais_code": p.pais_code,
                "logins": p.logins,
                "usuarios_unicos": p.usuarios_unicos
            }
            for p in por_pais
        ],
        "por_ciudad": [
            {
                "ciudad": c.ciudad,
                "pais": c.pais,
                "logins": c.logins,
                "usuarios_unicos": c.usuarios_unicos
            }
            for c in por_ciudad
        ],
        "por_isp": [
            {
                "isp": i.isp,
                "logins": i.logins,
                "usuarios_unicos": i.usuarios_unicos
            }
            for i in por_isp
        ],
        "por_dia": [
            {
                "fecha": str(d.fecha),
                "logins": d.logins,
                "usuarios_unicos": d.usuarios_unicos
            }
            for d in por_dia
        ]
    }


@router.get("/map-points")
def get_map_points(
    days: int = Query(30, ge=1, le=365),
    admin=Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Puntos para mapa geografico (lat/lon de cada login).
    Retorna lista de coordenadas con metadata.
    """
    desde = datetime.now(timezone.utc) - timedelta(days=days)
    
    puntos = (
        db.query(
            LoginGeoLog.lat,
            LoginGeoLog.lon,
            LoginGeoLog.pais,
            LoginGeoLog.ciudad,
            LoginGeoLog.email
        )
        .filter(LoginGeoLog.created_at >= desde)
        .filter(LoginGeoLog.lat.isnot(None))
        .filter(LoginGeoLog.lon.isnot(None))
        .order_by(desc(LoginGeoLog.created_at))
        .limit(500)
        .all()
    )
    
    return {
        "puntos": [
            {
                "lat": p.lat,
                "lon": p.lon,
                "pais": p.pais,
                "ciudad": p.ciudad,
                "email": p.email
            }
            for p in puntos
        ]
    }


@router.get("/recent-logins")
def get_recent_logins(
    limit: int = Query(50, ge=1, le=200),
    admin=Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Logins recientes con datos geograficos.
    """
    logins = (
        db.query(LoginGeoLog)
        .order_by(desc(LoginGeoLog.created_at))
        .limit(limit)
        .all()
    )
    
    return {
        "logins": [
            {
                "id": l.id,
                "email": l.email,
                "ip_address": l.ip_address,
                "pais": l.pais,
                "pais_code": l.pais_code,
                "region": l.region,
                "ciudad": l.ciudad,
                "isp": l.isp,
                "created_at": l.created_at.isoformat() if l.created_at else None
            }
            for l in logins
        ]
    }
