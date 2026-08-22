# app/api/certificados.py
# ROUTER DE CERTIFICADOS

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
import uuid
import logging

from app.database import get_db
from app.core.dependencies import require_roles
from app.models.certificado import Certificado
from app.schemas.certificado import (
    CertificadoCreate, CertificadoUpdate, CertificadoResponse, MensajeResponse
)

logger = logging.getLogger(__name__)
router = APIRouter()

def _cert_to_dict(cert: Certificado) -> dict:
    return {
        "id": str(cert.id),
        "codigo": cert.codigo,
        "estudiante_id": str(cert.estudiante_id),
        "estudiante_nombre": cert.estudiante_nombre,
        "curso_id": str(cert.curso_id),
        "curso_titulo": cert.curso_titulo,
        "docente_id": str(cert.docente_id),
        "docente_nombre": cert.docente_nombre,
        "fecha_emision": cert.fecha_emision.isoformat() if cert.fecha_emision else None,
        "url": cert.url,
        "estado": cert.estado or "emitido",
        "created_at": cert.created_at.isoformat() if cert.created_at else None,
        "updated_at": cert.updated_at.isoformat() if cert.updated_at else None,
    }


@router.get("/", response_model=List[CertificadoResponse])
async def listar_certificados(
    estudiante_id: Optional[str] = Query(None),
    curso_id: Optional[str] = Query(None),
    estado: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(["admin", "docente", "estudiante"]))
):
    try:
        query = db.query(Certificado)
        if estudiante_id:
            query = query.filter(Certificado.estudiante_id == estudiante_id)
        if curso_id:
            query = query.filter(Certificado.curso_id == curso_id)
        if estado:
            query = query.filter(Certificado.estado == estado)
        certificados = query.order_by(Certificado.created_at.desc()).offset(offset).limit(limit).all()
        return [_cert_to_dict(c) for c in certificados]
    except Exception as e:
        logger.error(f"Error listando certificados: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{id}", response_model=CertificadoResponse)
async def obtener_certificado(
    id: str,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(["admin", "docente", "estudiante"]))
):
    try:
        certificado = db.query(Certificado).filter(Certificado.id == id).first()
        if not certificado:
            raise HTTPException(status_code=404, detail="Certificado no encontrado")
        return _cert_to_dict(certificado)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error obteniendo certificado: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/", response_model=CertificadoResponse, status_code=201)
async def crear_certificado(
    data: CertificadoCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(["admin", "docente"]))
):
    try:
        codigo = data.codigo or f"CERT-{uuid.uuid4().hex[:8].upper()}"
        existe = db.query(Certificado).filter(Certificado.codigo == codigo).first()
        if existe:
            raise HTTPException(status_code=400, detail="El codigo ya existe")
        certificado = Certificado(
            id=str(uuid.uuid4()),
            codigo=codigo,
            estudiante_id=data.estudiante_id,
            estudiante_nombre=data.estudiante_nombre,
            curso_id=data.curso_id,
            curso_titulo=data.curso_titulo,
            docente_id=data.docente_id,
            docente_nombre=data.docente_nombre,
            url=data.url,
            estado="emitido"
        )
        db.add(certificado)
        db.commit()
        db.refresh(certificado)
        logger.info(f"Certificado creado: {certificado.codigo}")
        return _cert_to_dict(certificado)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error creando certificado: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{id}", response_model=CertificadoResponse)
async def actualizar_certificado(
    id: str,
    data: CertificadoUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(["admin", "docente"]))
):
    try:
        certificado = db.query(Certificado).filter(Certificado.id == id).first()
        if not certificado:
            raise HTTPException(status_code=404, detail="Certificado no encontrado")
        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(certificado, field, value)
        db.commit()
        db.refresh(certificado)
        return _cert_to_dict(certificado)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error actualizando certificado: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{id}", response_model=MensajeResponse)
async def eliminar_certificado(
    id: str,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(["admin", "docente"]))
):
    """Elimina un certificado (solo docente o admin)"""
    try:
        certificado = db.query(Certificado).filter(Certificado.id == id).first()
        if not certificado:
            raise HTTPException(status_code=404, detail="Certificado no encontrado")
        certificado.estado = "cancelado"
        db.commit()
        return {"mensaje": "Certificado cancelado correctamente", "ok": True}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error cancelando certificado: {e}")
        raise HTTPException(status_code=500, detail=str(e))