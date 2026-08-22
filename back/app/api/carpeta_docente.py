# app/api/carpeta_docente.py
# ROUTER DE CARPETA DOCENTE

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
import uuid
import logging

from app.database import get_db
from app.core.dependencies import require_docente
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


@router.get("/{docente_id}", response_model=CarpetaDocenteResponse)
async def obtener_carpeta(
    docente_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(require_docente)  # ✅ Roles: admin | docente
):
    try:
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
        logger.error(f"Error obteniendo carpeta: {e}")
        raise HTTPException(status_code=500, detail=str(e))


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
        logger.error(f"Error actualizando carpeta: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{docente_id}/sync", response_model=CarpetaDocenteResponse)
async def sincronizar_carpeta(
    docente_id: str,
    data: CarpetaSyncRequest,
    db: Session = Depends(get_db),
    current_user=Depends(require_docente)  # ✅ Roles: admin | docente
):
    try:
        carpeta = None
        if data.carpeta_id:
            carpeta = db.query(CarpetaDocente).filter(
                CarpetaDocente.id == data.carpeta_id
            ).first()
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
        logger.error(f"Error sincronizando carpeta: {e}")
        raise HTTPException(status_code=500, detail=str(e))


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
        db.delete(carpeta)
        db.commit()
        return {"mensaje": "Carpeta eliminada correctamente", "ok": True}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error eliminando carpeta: {e}")
        raise HTTPException(status_code=500, detail=str(e))