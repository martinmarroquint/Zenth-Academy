# app/api/certificados.py
# ROUTER DE CERTIFICADOS

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
import uuid
import logging

from app.database import get_db
from app.core.dependencies import require_roles
from app.core.errors import error_interno
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


def _verificar_ownership_certificado(cert: Certificado, current_user) -> None:
    """✅ SEGURIDAD: admin puede todo; un docente solo los certificados que emitió."""
    if current_user.rol == "admin":
        return
    if str(cert.docente_id) != str(current_user.id):
        logger.warning(
            f"Acceso denegado: docente {current_user.id} intentó gestionar "
            f"certificado {cert.id} de {cert.docente_id}"
        )
        raise HTTPException(status_code=403, detail="No tienes permiso sobre este certificado")


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
        # ✅ SEGURIDAD: un estudiante SOLO puede ver sus propios certificados.
        # Antes podía pasar ?estudiante_id=<otro> y listar certificados ajenos (IDOR).
        if current_user.rol == "estudiante":
            if estudiante_id and str(estudiante_id) != str(current_user.id):
                logger.warning(
                    f"Acceso denegado: estudiante {current_user.id} intentó listar "
                    f"certificados de estudiante_id={estudiante_id}"
                )
                raise HTTPException(
                    status_code=403,
                    detail="No tienes permiso para ver los certificados de otro estudiante"
                )
            query = query.filter(Certificado.estudiante_id == str(current_user.id))
        elif current_user.rol == "docente":
            # ✅ SEGURIDAD: un docente solo ve los certificados que él emitió.
            query = query.filter(Certificado.docente_id == str(current_user.id))
        elif estudiante_id:
            query = query.filter(Certificado.estudiante_id == estudiante_id)
        if curso_id:
            query = query.filter(Certificado.curso_id == curso_id)
        if estado:
            query = query.filter(Certificado.estado == estado)
        certificados = query.order_by(Certificado.created_at.desc()).offset(offset).limit(limit).all()
        return [_cert_to_dict(c) for c in certificados]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=error_interno(e, "Error listando certificados"))


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
        # ✅ SEGURIDAD: un estudiante solo puede ver SU certificado
        if current_user.rol == "estudiante" and str(certificado.estudiante_id) != str(current_user.id):
            raise HTTPException(
                status_code=403,
                detail="No tienes permiso para ver este certificado"
            )
        # ✅ SEGURIDAD: un docente solo los que él emitió
        if current_user.rol == "docente":
            _verificar_ownership_certificado(certificado, current_user)
        return _cert_to_dict(certificado)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=error_interno(e, "Error obteniendo certificado"))


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
        # ✅ SEGURIDAD: el emisor es SIEMPRE el usuario autenticado (admin puede indicar otro).
        docente_id_final = data.docente_id if current_user.rol == "admin" and data.docente_id else str(current_user.id)
        certificado = Certificado(
            id=str(uuid.uuid4()),
            codigo=codigo,
            estudiante_id=data.estudiante_id,
            estudiante_nombre=data.estudiante_nombre,
            curso_id=data.curso_id,
            curso_titulo=data.curso_titulo,
            docente_id=docente_id_final,
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
        raise HTTPException(status_code=500, detail=error_interno(e, "Error creando certificado"))


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
        _verificar_ownership_certificado(certificado, current_user)
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
        raise HTTPException(status_code=500, detail=error_interno(e, "Error actualizando certificado"))


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
        _verificar_ownership_certificado(certificado, current_user)
        certificado.estado = "cancelado"
        db.commit()
        return {"mensaje": "Certificado cancelado correctamente", "ok": True}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=error_interno(e, "Error cancelando certificado"))