# app/api/solicitudes_docente.py
# ENDPOINTS PARA SOLICITUDES DE DOCENTE

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import cast, String
from typing import Optional, List
import uuid
import logging
from datetime import datetime, timezone

from app.database import get_db
from app.core.dependencies import get_current_active_user, require_admin, require_roles
from app.models.usuario import Usuario
from app.models.solicitud_docente import SolicitudDocente
from app.schemas.solicitud_docente import (
    SolicitudDocenteCreate, SolicitudDocenteUpdate, 
    SolicitudDocenteResponse, SolicitudDocenteListResponse,
    MensajeResponse
)

logger = logging.getLogger(__name__)
router = APIRouter()


def _solicitud_to_dict(solicitud: SolicitudDocente, usuario: Usuario = None) -> dict:
    """Serializa una solicitud a dict"""
    return {
        "id": str(solicitud.id),
        "usuario_id": str(solicitud.usuario_id),
        "usuario_nombre": usuario.nombre_completo if usuario else None,
        "usuario_email": usuario.email if usuario else None,
        "usuario_foto": usuario.foto_url if usuario else None,
        
        "especialidad": solicitud.especialidad,
        "institucion": solicitud.institucion,
        "experiencia_anos": solicitud.experiencia_anos,
        "experiencia_detalle": solicitud.experiencia_detalle,
        "motivacion": solicitud.motivacion,
        "portafolio_url": solicitud.portafolio_url,
        "documentos_url": solicitud.documentos_url,
        
        "estado": solicitud.estado,
        "comentario_admin": solicitud.comentario_admin,
        "admin_id": str(solicitud.admin_id) if solicitud.admin_id else None,
        "fecha_revision": solicitud.fecha_revision.isoformat() if solicitud.fecha_revision else None,
        
        "created_at": solicitud.created_at.isoformat() if solicitud.created_at else None,
        "updated_at": solicitud.updated_at.isoformat() if solicitud.updated_at else None,
    }


# =============================================
# ESTUDIANTE: Crear solicitud
# =============================================

@router.post("/", response_model=SolicitudDocenteResponse, status_code=201)
async def crear_solicitud(
    data: SolicitudDocenteCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """
    Estudiante: Crea una solicitud para ser docente.
    Solo usuarios con rol 'estudiante' pueden crear solicitudes.
    """
    try:
        # Verificar que el usuario sea estudiante
        if current_user.rol != "estudiante":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Solo los estudiantes pueden solicitar ser docente"
            )
        
        # Verificar que no tenga una solicitud pendiente
        solicitud_pendiente = db.query(SolicitudDocente).filter(
            SolicitudDocente.usuario_id == str(current_user.id),
            SolicitudDocente.estado.in_(["pendiente", "en_revision"])
        ).first()
        
        if solicitud_pendiente:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ya tienes una solicitud pendiente. Espera a que sea procesada."
            )
        
        # Crear la solicitud
        solicitud = SolicitudDocente(
            id=str(uuid.uuid4()),
            usuario_id=str(current_user.id),
            especialidad=data.especialidad,
            institucion=data.institucion,
            experiencia_anos=data.experiencia_anos,
            experiencia_detalle=data.experiencia_detalle,
            motivacion=data.motivacion,
            portafolio_url=data.portafolio_url,
            documentos_url=data.documentos_url,
            estado="pendiente",
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc)
        )
        
        db.add(solicitud)
        db.commit()
        db.refresh(solicitud)
        
        logger.info(f"Solicitud de docente creada por {current_user.id}: {solicitud.id}")
        
        return _solicitud_to_dict(solicitud, current_user)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creando solicitud de docente: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =============================================
# ESTUDIANTE: Ver mis solicitudes
# =============================================

@router.get("/mis-solicitudes", response_model=List[SolicitudDocenteResponse])
async def mis_solicitudes(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """
    Estudiante: Lista todas sus solicitudes de docente.
    """
    try:
        solicitudes = db.query(SolicitudDocente).filter(
            SolicitudDocente.usuario_id == str(current_user.id)
        ).order_by(SolicitudDocente.created_at.desc()).all()
        
        resultado = []
        for sol in solicitudes:
            resultado.append(_solicitud_to_dict(sol, current_user))
        
        return resultado
        
    except Exception as e:
        logger.error(f"Error listando solicitudes: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =============================================
# ADMIN: Ver todas las solicitudes
# =============================================

@router.get("/", response_model=SolicitudDocenteListResponse)
async def listar_solicitudes(
    estado: Optional[str] = Query(None, description="Filtrar por estado"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_admin)
):
    """
    Admin: Lista todas las solicitudes de docente.
    Puede filtrar por estado: pendiente, en_revision, aprobado, rechazado
    """
    try:
        query = db.query(SolicitudDocente)
        
        if estado:
            query = query.filter(SolicitudDocente.estado == estado)
        
        total = query.count()
        solicitudes = query.order_by(SolicitudDocente.created_at.desc()).offset(offset).limit(limit).all()
        
        # Obtener información de usuarios
        usuario_ids = [str(s.usuario_id) for s in solicitudes]
        usuarios = db.query(Usuario).filter(Usuario.id.in_(usuario_ids)).all() if usuario_ids else []
        usuarios_map = {str(u.id): u for u in usuarios}
        
        resultado = []
        for sol in solicitudes:
            usuario = usuarios_map.get(str(sol.usuario_id))
            resultado.append(_solicitud_to_dict(sol, usuario))
        
        return {
            "total": total,
            "solicitudes": resultado
        }
        
    except Exception as e:
        logger.error(f"Error listando solicitudes: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =============================================
# ADMIN: Contar solicitudes pendientes
# =============================================

@router.get("/pendientes/count")
async def contar_pendientes(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_admin)
):
    """
    Admin: Cuenta las solicitudes pendientes.
    """
    try:
        total = db.query(SolicitudDocente).filter(
            SolicitudDocente.estado.in_(["pendiente", "en_revision"])
        ).count()
        
        return {"pendientes": total}
        
    except Exception as e:
        logger.error(f"Error contando solicitudes: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =============================================
# ADMIN: Obtener solicitud por ID
# =============================================

@router.get("/{solicitud_id}", response_model=SolicitudDocenteResponse)
async def obtener_solicitud(
    solicitud_id: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_admin)
):
    """
    Admin: Obtiene el detalle de una solicitud.
    """
    try:
        solicitud = db.query(SolicitudDocente).filter(
            SolicitudDocente.id == solicitud_id
        ).first()
        
        if not solicitud:
            raise HTTPException(status_code=404, detail="Solicitud no encontrada")
        
        usuario = db.query(Usuario).filter(Usuario.id == solicitud.usuario_id).first()
        
        return _solicitud_to_dict(solicitud, usuario)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error obteniendo solicitud: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =============================================
# ADMIN: Aprobar solicitud
# =============================================

@router.post("/{solicitud_id}/aprobar", response_model=SolicitudDocenteResponse)
async def aprobar_solicitud(
    solicitud_id: str,
    data: SolicitudDocenteUpdate = None,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_admin)
):
    """
    Admin: Aprueba una solicitud de docente.
    Cambia el rol del usuario a 'docente'.
    """
    try:
        solicitud = db.query(SolicitudDocente).filter(
            SolicitudDocente.id == solicitud_id
        ).first()
        
        if not solicitud:
            raise HTTPException(status_code=404, detail="Solicitud no encontrada")
        
        if solicitud.estado not in ["pendiente", "en_revision"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"La solicitud ya fue procesada con estado: {solicitud.estado}"
            )
        
        # Actualizar solicitud
        solicitud.estado = "aprobado"
        solicitud.admin_id = str(current_user.id)
        solicitud.fecha_revision = datetime.now(timezone.utc)
        solicitud.comentario_admin = data.comentario_admin if data else None
        solicitud.updated_at = datetime.now(timezone.utc)
        
        # Cambiar rol del usuario a docente
        usuario = db.query(Usuario).filter(Usuario.id == solicitud.usuario_id).first()
        if usuario:
            usuario.rol = "docente"
            usuario.especialidad = solicitud.especialidad
            usuario.institucion = solicitud.institucion
            db.refresh(usuario)
        
        db.commit()
        db.refresh(solicitud)
        
        logger.info(f"Solicitud {solicitud_id} aprobada por admin {current_user.id}. Usuario {solicitud.usuario_id} ahora es docente.")
        
        return _solicitud_to_dict(solicitud, usuario)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error aprobando solicitud: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =============================================
# ADMIN: Rechazar solicitud
# =============================================

@router.post("/{solicitud_id}/rechazar", response_model=SolicitudDocenteResponse)
async def rechazar_solicitud(
    solicitud_id: str,
    data: SolicitudDocenteUpdate = None,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_admin)
):
    """
    Admin: Rechaza una solicitud de docente.
    """
    try:
        solicitud = db.query(SolicitudDocente).filter(
            SolicitudDocente.id == solicitud_id
        ).first()
        
        if not solicitud:
            raise HTTPException(status_code=404, detail="Solicitud no encontrada")
        
        if solicitud.estado not in ["pendiente", "en_revision"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"La solicitud ya fue procesada con estado: {solicitud.estado}"
            )
        
        # Actualizar solicitud
        solicitud.estado = "rechazado"
        solicitud.admin_id = str(current_user.id)
        solicitud.fecha_revision = datetime.now(timezone.utc)
        solicitud.comentario_admin = data.comentario_admin if data else "Solicitud rechazada"
        solicitud.updated_at = datetime.now(timezone.utc)
        
        db.commit()
        db.refresh(solicitud)
        
        logger.info(f"Solicitud {solicitud_id} rechazada por admin {current_user.id}")
        
        usuario = db.query(Usuario).filter(Usuario.id == solicitud.usuario_id).first()
        return _solicitud_to_dict(solicitud, usuario)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error rechazando solicitud: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =============================================
# ADMIN: Marcar en revisión
# =============================================

@router.post("/{solicitud_id}/en-revision", response_model=SolicitudDocenteResponse)
async def marcar_en_revision(
    solicitud_id: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_admin)
):
    """
    Admin: Marca una solicitud como 'en_revision'.
    """
    try:
        solicitud = db.query(SolicitudDocente).filter(
            SolicitudDocente.id == solicitud_id
        ).first()
        
        if not solicitud:
            raise HTTPException(status_code=404, detail="Solicitud no encontrada")
        
        if solicitud.estado != "pendiente":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Solo se pueden marcar en revisión solicitudes pendientes. Estado actual: {solicitud.estado}"
            )
        
        solicitud.estado = "en_revision"
        solicitud.admin_id = str(current_user.id)
        solicitud.updated_at = datetime.now(timezone.utc)
        
        db.commit()
        db.refresh(solicitud)
        
        logger.info(f"Solicitud {solicitud_id} marcada en revisión por admin {current_user.id}")
        
        usuario = db.query(Usuario).filter(Usuario.id == solicitud.usuario_id).first()
        return _solicitud_to_dict(solicitud, usuario)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error marcando solicitud en revisión: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =============================================
# ESTUDIANTE: Cancelar solicitud
# =============================================

@router.delete("/{solicitud_id}", response_model=MensajeResponse)
async def cancelar_solicitud(
    solicitud_id: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """
    Estudiante: Cancela una solicitud pendiente.
    """
    try:
        solicitud = db.query(SolicitudDocente).filter(
            SolicitudDocente.id == solicitud_id
        ).first()
        
        if not solicitud:
            raise HTTPException(status_code=404, detail="Solicitud no encontrada")
        
        # Solo el dueño puede cancelar
        if str(solicitud.usuario_id) != str(current_user.id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permiso para cancelar esta solicitud"
            )
        
        # Solo se pueden cancelar pendientes o en revisión
        if solicitud.estado not in ["pendiente", "en_revision"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"No se puede cancelar una solicitud con estado: {solicitud.estado}"
            )
        
        db.delete(solicitud)
        db.commit()
        
        logger.info(f"Solicitud {solicitud_id} cancelada por usuario {current_user.id}")
        
        return {"mensaje": "Solicitud cancelada exitosamente", "ok": True}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error cancelando solicitud: {e}")
        raise HTTPException(status_code=500, detail=str(e))
