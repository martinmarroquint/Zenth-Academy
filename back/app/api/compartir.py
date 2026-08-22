# app/api/compartir.py
# ROUTER "COMPARTIR EN CLASE" - CON QR DINAMICO Y EXPIRACION
# FLUJO: El docente crea sala -> QR visible 30s -> Expira y se renueva automaticamente

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Optional
import uuid
import secrets
import logging
from datetime import datetime, timezone, timedelta

from app.database import get_db
from app.core.dependencies import require_docente, get_current_user_optional
from app.models.usuario import Usuario
from app.models.material_compartido import MaterialCompartido
from app.models.historial_comparticion import HistorialComparticion
from app.schemas.compartir import (
    EnviarMaterialRequest,
    SalaEstadoResponse,
    VincularResponse,
    SalaDocenteResponse,
)
from app.schemas.material_compartido import MensajeResponse

logger = logging.getLogger(__name__)
router = APIRouter()

PUBLIC_BASE_URL = "https://zenthacademy.com"
ALFABETO_CODIGO = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"
QR_EXPIRATION_SECONDS = 30


# =============================================
# UTILIDADES
# =============================================

def _ahora_utc() -> datetime:
    """Retorna datetime actual con zona horaria UTC."""
    return datetime.now(timezone.utc)


def _generar_codigo() -> str:
    return "".join(secrets.choice(ALFABETO_CODIGO) for _ in range(8))


def _generar_qr_token() -> str:
    return secrets.token_urlsafe(16)


def _buscar_sala(db: Session, codigo: str) -> Optional[HistorialComparticion]:
    return db.query(HistorialComparticion).filter(
        HistorialComparticion.session_id == codigo
    ).first()


def _validar_dueño(sala: HistorialComparticion, user: Usuario):
    if str(sala.docente_id) != str(user.id) and user.rol != "admin":
        raise HTTPException(status_code=403, detail="Esta sala pertenece a otro docente")


def _qr_expirado(sala: HistorialComparticion, ahora: datetime) -> bool:
    """Verifica si el QR de la sala ha expirado."""
    if not sala.qr_expira:
        return True
    # Convertir a offset-aware si es necesario
    if sala.qr_expira.tzinfo is None:
        from datetime import timezone as tz
        qr_expira = sala.qr_expira.replace(tzinfo=tz.utc)
    else:
        qr_expira = sala.qr_expira
    return qr_expira < ahora


def _renovar_qr(sala: HistorialComparticion, ahora: datetime) -> dict:
    """Renueva el QR de una sala."""
    sala.qr_token = _generar_qr_token()
    sala.qr_expira = ahora + timedelta(seconds=QR_EXPIRATION_SECONDS)
    sala.actualizado_en = ahora
    return {
        "qr_token": sala.qr_token,
        "qr_expira": sala.qr_expira.isoformat(),
        "qr_restante": QR_EXPIRATION_SECONDS
    }


def _material_publico(m: MaterialCompartido) -> dict:
    return {
        "id": str(m.id),
        "titulo": m.titulo,
        "descripcion": m.descripcion,
        "tipo": m.tipo or "enlace",
        "contenido": m.contenido,
        "nombre_archivo": m.nombre_archivo,
        "url_archivo": m.url_archivo,
    }


def _estado_sala(sala: HistorialComparticion, ahora: datetime) -> dict:
    recursos = sala.recursos_compartidos or []
    material_activo = recursos[-1] if recursos else None
    
    qr_restante = 0
    if sala.qr_expira:
        if sala.qr_expira.tzinfo is None:
            from datetime import timezone as tz
            qr_expira = sala.qr_expira.replace(tzinfo=tz.utc)
        else:
            qr_expira = sala.qr_expira
        qr_restante = max(0, int((qr_expira - ahora).total_seconds()))
    
    return {
        "codigo": sala.session_id,
        "estado": sala.estado,
        "material_activo": material_activo,
        "fecha_inicio": sala.fecha_inicio.isoformat() if sala.fecha_inicio else None,
        "fecha_fin": sala.fecha_fin.isoformat() if sala.fecha_fin else None,
        "duracion_segundos": sala.duracion_segundos or 0,
        "qr_token": sala.qr_token,
        "qr_expira": sala.qr_expira.isoformat() if sala.qr_expira else None,
        "qr_restante": qr_restante,
    }


# =============================================
# CREAR SALA (con QR)
# =============================================

@router.post("/salas", response_model=SalaDocenteResponse, status_code=201)
def crear_sala(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_docente)
):
    """Crea una sala con QR valido por 30 segundos."""
    try:
        ahora = _ahora_utc()
        
        activa = db.query(HistorialComparticion).filter(
            HistorialComparticion.docente_id == str(current_user.id),
            HistorialComparticion.estado.in_(["ESPERANDO", "ACTIVO"])
        ).first()
        
        if activa:
            if _qr_expirado(activa, ahora):
                _renovar_qr(activa, ahora)
                db.commit()
                db.refresh(activa)
            
            recursos = activa.recursos_compartidos or []
            return {
                "codigo": activa.session_id,
                "url_publica": f"{PUBLIC_BASE_URL}/compartir/{activa.session_id}",
                "estado": activa.estado,
                "material_activo": recursos[-1] if recursos else None,
                "fecha_inicio": activa.fecha_inicio.isoformat() if activa.fecha_inicio else None,
                "qr_token": activa.qr_token,
                "qr_expira": activa.qr_expira.isoformat() if activa.qr_expira else None,
            }

        codigo = _generar_codigo()
        while _buscar_sala(db, codigo):
            codigo = _generar_codigo()

        sala = HistorialComparticion(
            id=str(uuid.uuid4()),
            docente_id=str(current_user.id),
            session_id=codigo,
            qr_token=_generar_qr_token(),
            qr_expira=ahora + timedelta(seconds=QR_EXPIRATION_SECONDS),
            estado="ESPERANDO",
            recursos_compartidos=[],
            cantidad_recursos=0,
            fecha_inicio=ahora,
        )
        db.add(sala)
        db.commit()
        db.refresh(sala)
        
        logger.info(f"Sala {codigo} creada - QR valido hasta {sala.qr_expira}")
        
        recursos = sala.recursos_compartidos or []
        return {
            "codigo": sala.session_id,
            "url_publica": f"{PUBLIC_BASE_URL}/compartir/{sala.session_id}",
            "estado": sala.estado,
            "material_activo": recursos[-1] if recursos else None,
            "fecha_inicio": sala.fecha_inicio.isoformat() if sala.fecha_inicio else None,
            "qr_token": sala.qr_token,
            "qr_expira": sala.qr_expira.isoformat() if sala.qr_expira else None,
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error creando sala: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/salas/activa", response_model=Optional[SalaDocenteResponse])
def sala_activa_docente(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_docente)
):
    try:
        ahora = _ahora_utc()
        
        activa = db.query(HistorialComparticion).filter(
            HistorialComparticion.docente_id == str(current_user.id),
            HistorialComparticion.estado.in_(["ESPERANDO", "ACTIVO"])
        ).first()
        if not activa:
            return None
        
        if _qr_expirado(activa, ahora):
            _renovar_qr(activa, ahora)
            db.commit()
            db.refresh(activa)
        
        recursos = activa.recursos_compartidos or []
        return {
            "codigo": activa.session_id,
            "url_publica": f"{PUBLIC_BASE_URL}/compartir/{activa.session_id}",
            "estado": activa.estado,
            "material_activo": recursos[-1] if recursos else None,
            "fecha_inicio": activa.fecha_inicio.isoformat() if activa.fecha_inicio else None,
            "qr_token": activa.qr_token,
            "qr_expira": activa.qr_expira.isoformat() if activa.qr_expira else None,
        }
    except Exception as e:
        logger.error(f"Error obteniendo sala activa: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =============================================
# ESTADO PUBLICO DE LA SALA (renueva QR automaticamente)
# =============================================

@router.get("/{codigo}", response_model=SalaEstadoResponse)
def estado_sala(
    codigo: str,
    db: Session = Depends(get_db)
):
    """Estado publico de la sala. Si el QR expiro, lo renueva automaticamente."""
    try:
        ahora = _ahora_utc()
        
        sala = _buscar_sala(db, codigo)
        if not sala:
            raise HTTPException(status_code=404, detail="Sala no encontrada")
        
        if sala.estado in ["ESPERANDO", "ACTIVO"]:
            if _qr_expirado(sala, ahora):
                _renovar_qr(sala, ahora)
                db.commit()
                db.refresh(sala)
                logger.info(f"QR renovado para sala {codigo}")
        
        return _estado_sala(sala, ahora)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error obteniendo estado: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =============================================
# VINCULAR (escanea QR)
# =============================================

@router.post("/{codigo}/vincular", response_model=VincularResponse)
def vincular_sala(
    codigo: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user_optional)
):
    """Vincula el docente a la sala. Verifica que el QR sea valido."""
    try:
        ahora = _ahora_utc()
        
        sala = _buscar_sala(db, codigo)
        if not sala:
            raise HTTPException(status_code=404, detail="Sala no encontrada")

        if current_user is None:
            return VincularResponse(ok=False, es_docente=False)

        es_docente = current_user.rol in ["admin", "docente"]
        es_dueño = str(sala.docente_id) == str(current_user.id) or current_user.rol == "admin"

        if es_dueño and sala.estado == "ESPERANDO":
            if _qr_expirado(sala, ahora):
                return VincularResponse(
                    ok=False,
                    es_docente=es_docente,
                    es_dueño=es_dueño,
                    sala=_estado_sala(sala, ahora),
                    mensaje="El QR ha expirado. La pantalla del aula generara uno nuevo."
                )
            
            sala.estado = "ACTIVO"
            sala.actualizado_en = ahora
            db.commit()
            logger.info(f"Sala {codigo} vinculada por docente {current_user.id}")

        return VincularResponse(
            ok=es_dueño,
            es_docente=es_docente,
            es_dueño=es_dueño,
            sala=_estado_sala(sala, ahora),
            mensaje="Vinculacion exitosa" if es_dueño else "No tienes permiso para vincular esta sala"
        )
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error vinculando sala: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =============================================
# ENVIAR MATERIAL
# =============================================

@router.post("/{codigo}/material", response_model=SalaEstadoResponse)
def enviar_material(
    codigo: str,
    data: EnviarMaterialRequest,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_docente)
):
    try:
        ahora = _ahora_utc()
        
        sala = _buscar_sala(db, codigo)
        if not sala:
            raise HTTPException(status_code=404, detail="Sala no encontrada")
        _validar_dueño(sala, current_user)
        if sala.estado == "CERRADO":
            raise HTTPException(status_code=400, detail="La sala ya fue cerrada")

        material = db.query(MaterialCompartido).filter(
            MaterialCompartido.id == data.material_id
        ).first()
        if not material:
            raise HTTPException(status_code=404, detail="Material no encontrado")
        if str(material.docente_id) != str(current_user.id) and current_user.rol != "admin":
            raise HTTPException(status_code=403, detail="El material no te pertenece")

        recursos = list(sala.recursos_compartidos or [])
        recursos.append(_material_publico(material))
        sala.recursos_compartidos = recursos
        sala.cantidad_recursos = len(recursos)
        sala.estado = "ACTIVO"
        sala.actualizado_en = ahora
        db.commit()
        db.refresh(sala)
        
        logger.info(f"Material enviado a sala {codigo}: {material.titulo[:40]}")
        return _estado_sala(sala, ahora)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error enviando material: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =============================================
# QUITAR MATERIAL
# =============================================

@router.post("/{codigo}/quitar", response_model=SalaEstadoResponse)
def quitar_material(
    codigo: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_docente)
):
    try:
        ahora = _ahora_utc()
        
        sala = _buscar_sala(db, codigo)
        if not sala:
            raise HTTPException(status_code=404, detail="Sala no encontrada")
        _validar_dueño(sala, current_user)

        sala.recursos_compartidos = []
        sala.cantidad_recursos = 0
        sala.actualizado_en = ahora
        db.commit()
        db.refresh(sala)
        return _estado_sala(sala, ahora)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error quitando material: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =============================================
# CERRAR SALA
# =============================================

@router.post("/{codigo}/cerrar", response_model=VincularResponse)
def cerrar_sala(
    codigo: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_docente)
):
    try:
        ahora = _ahora_utc()
        
        sala = _buscar_sala(db, codigo)
        if not sala:
            raise HTTPException(status_code=404, detail="Sala no encontrada")
        _validar_dueño(sala, current_user)
        
        if sala.estado == "CERRADO":
            return VincularResponse(
                ok=True,
                es_docente=True,
                es_dueño=True,
                sala=_estado_sala(sala, ahora),
                mensaje="La sala ya estaba cerrada"
            )

        sala.estado = "CERRADO"
        sala.fecha_fin = ahora
        sala.duracion_segundos = int((ahora - sala.fecha_inicio).total_seconds())
        sala.actualizado_en = ahora
        db.commit()
        db.refresh(sala)
        
        logger.info(f"Sala {codigo} cerrada. Duracion: {sala.duracion_segundos}s")
        return VincularResponse(
            ok=True,
            es_docente=True,
            es_dueño=True,
            sala=_estado_sala(sala, ahora),
            mensaje="Sesion terminada correctamente"
        )
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error cerrando sala: {e}")
        raise HTTPException(status_code=500, detail=str(e))