# app/api/materiales.py
# CRUD DE MATERIALES - SOLO PARA EL DOCENTE

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
import uuid
import secrets
import logging
from datetime import datetime, timezone

from app.database import get_db
from app.core.dependencies import require_docente
from app.models.usuario import Usuario
from app.models.material_compartido import MaterialCompartido
from app.schemas.material_compartido import (
    MaterialCreate,
    MaterialUpdate,
    MaterialResponse,
    MensajeResponse
)

logger = logging.getLogger(__name__)
router = APIRouter()


def _generar_token() -> str:
    return secrets.token_urlsafe(16)


def _material_to_dict(m: MaterialCompartido) -> dict:
    return {
        "id": str(m.id),
        "titulo": m.titulo,
        "descripcion": m.descripcion,
        "tipo": m.tipo or "enlace",
        "contenido": m.contenido,
        "nombre_archivo": m.nombre_archivo,
        "url_archivo": m.url_archivo,
        "activo": bool(m.activo) if m.activo is not None else True,
        "visitas": m.visitas or 0,
        "created_at": m.created_at.isoformat() if m.created_at else None,
        "updated_at": m.updated_at.isoformat() if m.updated_at else None,
    }


@router.get("/", response_model=List[MaterialResponse])
async def listar_materiales(
    activo: Optional[bool] = Query(None),
    busqueda: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_docente)
):
    try:
        query = db.query(MaterialCompartido).filter(
            MaterialCompartido.docente_id == str(current_user.id)
        )
        
        if activo is not None:
            query = query.filter(MaterialCompartido.activo == activo)
        if busqueda:
            like = f"%{busqueda}%"
            query = query.filter(MaterialCompartido.titulo.ilike(like))
        
        materiales = query.order_by(
            MaterialCompartido.created_at.desc()
        ).offset(offset).limit(limit).all()
        
        return [_material_to_dict(m) for m in materiales]
    except Exception as e:
        logger.error(f"Error listando materiales: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{id}", response_model=MaterialResponse)
async def obtener_material(
    id: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_docente)
):
    try:
        material = db.query(MaterialCompartido).filter(
            MaterialCompartido.id == id,
            MaterialCompartido.docente_id == str(current_user.id)
        ).first()
        if not material:
            raise HTTPException(status_code=404, detail="Material no encontrado")
        return _material_to_dict(material)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error obteniendo material: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/", response_model=MaterialResponse, status_code=201)
async def crear_material(
    data: MaterialCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_docente)
):
    try:
        material = MaterialCompartido(
            id=str(uuid.uuid4()),
            docente_id=str(current_user.id),
            docente_nombre=current_user.nombre_completo or None,
            titulo=data.titulo,
            descripcion=data.descripcion,
            tipo=data.tipo or "enlace",
            contenido=data.contenido,
            nombre_archivo=data.nombre_archivo,
            url_archivo=data.url_archivo,
            token=_generar_token(),
            activo=True,
            visitas=0,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        db.add(material)
        db.commit()
        db.refresh(material)
        logger.info(f"Material creado: {material.titulo}")
        return _material_to_dict(material)
    except Exception as e:
        db.rollback()
        logger.error(f"Error creando material: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{id}", response_model=MaterialResponse)
async def actualizar_material(
    id: str,
    data: MaterialUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_docente)
):
    try:
        material = db.query(MaterialCompartido).filter(
            MaterialCompartido.id == id,
            MaterialCompartido.docente_id == str(current_user.id)
        ).first()
        if not material:
            raise HTTPException(status_code=404, detail="Material no encontrado")
        
        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(material, field, value)
        
        material.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(material)
        logger.info(f"Material actualizado: {material.titulo}")
        return _material_to_dict(material)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error actualizando material: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{id}", response_model=MensajeResponse)
async def eliminar_material(
    id: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_docente)
):
    try:
        material = db.query(MaterialCompartido).filter(
            MaterialCompartido.id == id,
            MaterialCompartido.docente_id == str(current_user.id)
        ).first()
        if not material:
            raise HTTPException(status_code=404, detail="Material no encontrado")
        
        db.delete(material)
        db.commit()
        logger.info(f"Material eliminado: {material.titulo}")
        return {"mensaje": "Material eliminado correctamente", "ok": True}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error eliminando material: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/{id}/toggle", response_model=MaterialResponse)
async def toggle_material(
    id: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_docente)
):
    try:
        material = db.query(MaterialCompartido).filter(
            MaterialCompartido.id == id,
            MaterialCompartido.docente_id == str(current_user.id)
        ).first()
        if not material:
            raise HTTPException(status_code=404, detail="Material no encontrado")
        
        material.activo = not material.activo
        material.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(material)
        estado = "activado" if material.activo else "desactivado"
        logger.info(f"Material {estado}: {material.titulo}")
        return _material_to_dict(material)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error togglando material: {e}")
        raise HTTPException(status_code=500, detail=str(e))