# app/api/carpeta_docente.py
# ROUTER DE CARPETA DOCENTE

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
import uuid
import logging

from app.database import get_db
from app.core.dependencies import require_docente
from app.core.errors import error_interno
from app.models.carpeta_docente import CarpetaDocente
from app.schemas.carpeta_docente import (
    CarpetaDocenteCreate, CarpetaDocenteUpdate,
    CarpetaDocenteResponse, CarpetaSyncRequest, MensajeResponse
)

logger = logging.getLogger(__name__)
router = APIRouter()

def _carpeta_to_dict(carpeta: CarpetaDocente) -> dict:
    return {
        "id": str(carpeta.id),
        "nombre": carpeta.nombre or "Mi Carpeta",
        "docente_id": str(carpeta.docente_id) if carpeta.docente_id else None,
        "archivos": carpeta.archivos or [],
        "recursos": carpeta.recursos or [],
        "created_at": carpeta.created_at.isoformat() if carpeta.created_at else None,
        "updated_at": carpeta.updated_at.isoformat() if carpeta.updated_at else None,
    }


def _verificar_ownership_carpeta(carpeta: CarpetaDocente, current_user) -> None:
    """✅ SEGURIDAD: admin puede todo; un docente solo su propia carpeta."""
    if current_user.rol == "admin":
        return
    if str(carpeta.docente_id) != str(current_user.id):
        logger.warning(
            f"Acceso denegado: docente {current_user.id} intentó gestionar "
            f"carpeta {carpeta.id} de {carpeta.docente_id}"
        )
        raise HTTPException(status_code=403, detail="No tienes permiso sobre esta carpeta")


@router.get("/{docente_id}", response_model=CarpetaDocenteResponse)
async def obtener_carpeta(
    docente_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(require_docente)  # ✅ Roles: admin | docente
):
    try:
        # ✅ SEGURIDAD: un docente solo puede ver su propia carpeta.
        if current_user.rol != "admin" and str(docente_id) != str(current_user.id):
            raise HTTPException(status_code=403, detail="No tienes permiso sobre esta carpeta")
        carpeta = db.query(CarpetaDocente).filter(
            CarpetaDocente.docente_id == docente_id
        ).first()
        if not carpeta:
            carpeta = CarpetaDocente(
                id=str(uuid.uuid4()),
                nombre="Mi Carpeta",
                docente_id=docente_id,
                archivos=[],
                recursos=[]
            )
            db.add(carpeta)
            db.commit()
            db.refresh(carpeta)
        return _carpeta_to_dict(carpeta)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=error_interno(e, "Error obteniendo carpeta"))


@router.put("/{id}", response_model=CarpetaDocenteResponse)
async def actualizar_carpeta(
    id: str,
    data: CarpetaDocenteUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(require_docente)  # ✅ Roles: admin | docente
):
    try:
        carpeta = db.query(CarpetaDocente).filter(CarpetaDocente.id == id).first()
        if not carpeta:
            raise HTTPException(status_code=404, detail="Carpeta no encontrada")
        _verificar_ownership_carpeta(carpeta, current_user)
        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(carpeta, field, value)
        db.commit()
        db.refresh(carpeta)
        return _carpeta_to_dict(carpeta)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=error_interno(e, "Error actualizando carpeta"))


@router.post("/{docente_id}/sync", response_model=CarpetaDocenteResponse)
async def sincronizar_carpeta(
    docente_id: str,
    data: CarpetaSyncRequest,
    db: Session = Depends(get_db),
    current_user=Depends(require_docente)  # ✅ Roles: admin | docente
):
    try:
        # ✅ SEGURIDAD: el dueño es SIEMPRE el usuario autenticado (admin puede indicar otro).
        if current_user.rol != "admin":
            docente_id = str(current_user.id)

        carpeta = None
        if data.carpeta_id:
            carpeta = db.query(CarpetaDocente).filter(
                CarpetaDocente.id == data.carpeta_id
            ).first()
            if carpeta:
                _verificar_ownership_carpeta(carpeta, current_user)
        if not carpeta:
            carpeta = db.query(CarpetaDocente).filter(
                CarpetaDocente.docente_id == docente_id
            ).first()
        if not carpeta:
            carpeta = CarpetaDocente(
                id=str(uuid.uuid4()),
                nombre="Mi Carpeta",
                docente_id=docente_id,
                archivos=[],
                recursos=[]
            )
            db.add(carpeta)
        if isinstance(data.data, dict):
            carpeta.archivos = data.data.get("archivos") or carpeta.archivos or []
            carpeta.recursos = data.data.get("recursos") or carpeta.recursos or []
        db.commit()
        db.refresh(carpeta)
        return _carpeta_to_dict(carpeta)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=error_interno(e, "Error sincronizando carpeta"))


@router.delete("/{id}", response_model=MensajeResponse)
async def eliminar_carpeta(
    id: str,
    db: Session = Depends(get_db),
    current_user=Depends(require_docente)  # ✅ Roles: admin | docente
):
    try:
        carpeta = db.query(CarpetaDocente).filter(CarpetaDocente.id == id).first()
        if not carpeta:
            raise HTTPException(status_code=404, detail="Carpeta no encontrada")
        _verificar_ownership_carpeta(carpeta, current_user)
        db.delete(carpeta)
        db.commit()
        return {"mensaje": "Carpeta eliminada correctamente", "ok": True}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=error_interno(e, "Error eliminando carpeta"))