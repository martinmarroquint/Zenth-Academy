# app/api/pizarra.py
# ROUTER PARA PIZARRA INTERACTIVA

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
import uuid
from datetime import datetime, timezone

from app.database import get_db
from app.core.dependencies import require_docente
from app.models.pizarra import Pizarra, SesionPizarra
from app.schemas.pizarra import (
    PizarraCreate, PizarraUpdate, PizarraResponse,
    SesionPizarraCreate, SesionPizarraResponse,
    MensajeResponse
)

router = APIRouter(dependencies=[Depends(require_docente)])


@router.get("/", response_model=List[PizarraResponse])
def listar_pizarras(
    tipo: Optional[str] = Query(None),
    estado: Optional[str] = Query(None),
    grupo_id: Optional[str] = Query(None),
    empresa_id: Optional[str] = Query(None),
    creado_por: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """Lista todas las pizarras, con filtro opcional por creado_por"""
    query = db.query(Pizarra)
    if creado_por:
        query = query.filter(Pizarra.creado_por == creado_por)
    if tipo:
        query = query.filter(Pizarra.tipo == tipo)
    if estado:
        query = query.filter(Pizarra.estado == estado)
    if grupo_id:
        query = query.filter(Pizarra.grupo_id == grupo_id)
    if empresa_id:
        query = query.filter(Pizarra.empresa_id == empresa_id)
    return query.order_by(Pizarra.created_at.desc()).all()


@router.post("/", response_model=PizarraResponse, status_code=201)
def crear_pizarra(data: PizarraCreate, db: Session = Depends(get_db)):
    """Crea una nueva pizarra"""
    pizarra = Pizarra(
        id=str(uuid.uuid4()),
        titulo=data.titulo,
        descripcion=data.descripcion,
        tipo=data.tipo,
        configuracion=data.configuracion,
        creado_por=data.creado_por,
        grupo_id=data.grupo_id,
        empresa_id=data.empresa_id,
        es_publica=data.es_publica
    )
    db.add(pizarra)
    db.commit()
    db.refresh(pizarra)
    return pizarra


@router.get("/{pizarra_id}", response_model=PizarraResponse)
def obtener_pizarra(pizarra_id: str, db: Session = Depends(get_db)):
    """Obtiene una pizarra"""
    pizarra = db.query(Pizarra).filter(Pizarra.id == pizarra_id).first()
    if not pizarra:
        raise HTTPException(status_code=404, detail="Pizarra no encontrada")
    return pizarra


@router.put("/{pizarra_id}", response_model=PizarraResponse)
def actualizar_pizarra(
    pizarra_id: str,
    data: PizarraUpdate,
    db: Session = Depends(get_db)
):
    """Actualiza una pizarra"""
    pizarra = db.query(Pizarra).filter(Pizarra.id == pizarra_id).first()
    if not pizarra:
        raise HTTPException(status_code=404, detail="Pizarra no encontrada")
    
    if data.titulo is not None:
        pizarra.titulo = data.titulo
    if data.descripcion is not None:
        pizarra.descripcion = data.descripcion
    if data.configuracion is not None:
        pizarra.configuracion = data.configuracion
    if data.estado is not None:
        pizarra.estado = data.estado
    if data.elementos is not None:
        pizarra.elementos = data.elementos
    
    pizarra.updated_at = datetime.now(timezone.utc)
    pizarra.ultima_actividad = datetime.now(timezone.utc)
    db.commit()
    db.refresh(pizarra)
    return pizarra


@router.post("/{pizarra_id}/sesion", response_model=SesionPizarraResponse)
def iniciar_sesion(pizarra_id: str, data: SesionPizarraCreate, db: Session = Depends(get_db)):
    """Inicia una sesión en la pizarra"""
    pizarra = db.query(Pizarra).filter(Pizarra.id == pizarra_id).first()
    if not pizarra:
        raise HTTPException(status_code=404, detail="Pizarra no encontrada")
    
    sesion = SesionPizarra(
        id=str(uuid.uuid4()),
        pizarra_id=pizarra_id,
        usuario_id=data.usuario_id,
        rol=data.rol or 'EDITOR',
        ip=data.ip,
        user_agent=data.user_agent
    )
    db.add(sesion)
    pizarra.ultima_actividad = datetime.now(timezone.utc)
    db.commit()
    db.refresh(sesion)
    return sesion


@router.put("/sesion/{sesion_id}/finalizar", response_model=MensajeResponse)
def finalizar_sesion(sesion_id: str, db: Session = Depends(get_db)):
    """Finaliza una sesión de pizarra"""
    sesion = db.query(SesionPizarra).filter(SesionPizarra.id == sesion_id).first()
    if not sesion:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")
    
    sesion.fecha_fin = datetime.now(timezone.utc)
    sesion.duracion = int((sesion.fecha_fin - sesion.fecha_inicio).total_seconds())
    sesion.conectado = False
    db.commit()
    return {"mensaje": "Sesión finalizada", "ok": True}


@router.get("/{pizarra_id}/elementos")
def obtener_elementos(pizarra_id: str, db: Session = Depends(get_db)):
    """Obtiene los elementos de una pizarra"""
    pizarra = db.query(Pizarra).filter(Pizarra.id == pizarra_id).first()
    if not pizarra:
        raise HTTPException(status_code=404, detail="Pizarra no encontrada")
    return {"elementos": pizarra.elementos or []}


@router.post("/{pizarra_id}/elementos")
def actualizar_elementos(pizarra_id: str, data: dict, db: Session = Depends(get_db)):
    """Actualiza los elementos de una pizarra"""
    pizarra = db.query(Pizarra).filter(Pizarra.id == pizarra_id).first()
    if not pizarra:
        raise HTTPException(status_code=404, detail="Pizarra no encontrada")
    
    pizarra.elementos = data.get('elementos', [])
    pizarra.ultima_actividad = datetime.now(timezone.utc)
    pizarra.updated_at = datetime.now(timezone.utc)
    db.commit()
    return {"mensaje": "Elementos actualizados", "ok": True}


@router.delete("/{pizarra_id}", response_model=MensajeResponse)
def eliminar_pizarra(pizarra_id: str, db: Session = Depends(get_db)):
    """Elimina una pizarra"""
    pizarra = db.query(Pizarra).filter(Pizarra.id == pizarra_id).first()
    if not pizarra:
        raise HTTPException(status_code=404, detail="Pizarra no encontrada")
    db.delete(pizarra)
    db.commit()
    return {"mensaje": "Pizarra eliminada", "ok": True}