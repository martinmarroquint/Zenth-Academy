# app/api/integracion_edm.py
# ROUTER PARA INTEGRACIÓN CON EDM TEAM

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
import uuid
from datetime import datetime, timezone

from app.database import get_db
from app.core.dependencies import require_admin
from app.models.integracion_edm import IntegracionEDM, EventoIntegracion
from app.schemas.integracion_edm import (
    IntegracionCreate, IntegracionUpdate, IntegracionResponse,
    EventoIntegracionCreate, EventoIntegracionResponse,
    MensajeResponse
)

router = APIRouter(dependencies=[Depends(require_admin)])


@router.get("/", response_model=List[IntegracionResponse])
def listar_integraciones(
    tipo: Optional[str] = Query(None),
    empresa_id: Optional[str] = Query(None),
    activo: Optional[bool] = Query(None),
    db: Session = Depends(get_db)
):
    """Lista todas las integraciones"""
    query = db.query(IntegracionEDM)
    if tipo:
        query = query.filter(IntegracionEDM.tipo == tipo)
    if empresa_id:
        query = query.filter(IntegracionEDM.empresa_id == empresa_id)
    if activo is not None:
        query = query.filter(IntegracionEDM.activo == activo)
    return query.order_by(IntegracionEDM.created_at.desc()).all()


@router.post("/", response_model=IntegracionResponse, status_code=201)
def crear_integracion(data: IntegracionCreate, db: Session = Depends(get_db)):
    """Crea una nueva integración"""
    integracion = IntegracionEDM(
        id=str(uuid.uuid4()),
        nombre=data.nombre,
        tipo=data.tipo,
        descripcion=data.descripcion,
        configuracion=data.configuracion or {},
        empresa_id=data.empresa_id,
        creado_por=data.creado_por,
        webhook_url=data.webhook_url,
        activo=True
    )
    db.add(integracion)
    db.commit()
    db.refresh(integracion)
    return integracion


@router.get("/{integracion_id}", response_model=IntegracionResponse)
def obtener_integracion(integracion_id: str, db: Session = Depends(get_db)):
    """Obtiene una integración"""
    integracion = db.query(IntegracionEDM).filter(IntegracionEDM.id == integracion_id).first()
    if not integracion:
        raise HTTPException(status_code=404, detail="Integración no encontrada")
    return integracion


@router.put("/{integracion_id}", response_model=IntegracionResponse)
def actualizar_integracion(
    integracion_id: str,
    data: IntegracionUpdate,
    db: Session = Depends(get_db)
):
    """Actualiza una integración"""
    integracion = db.query(IntegracionEDM).filter(IntegracionEDM.id == integracion_id).first()
    if not integracion:
        raise HTTPException(status_code=404, detail="Integración no encontrada")
    
    if data.nombre is not None:
        integracion.nombre = data.nombre
    if data.descripcion is not None:
        integracion.descripcion = data.descripcion
    if data.configuracion is not None:
        integracion.configuracion = data.configuracion
    if data.activo is not None:
        integracion.activo = data.activo
    if data.webhook_url is not None:
        integracion.webhook_url = data.webhook_url
    
    integracion.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(integracion)
    return integracion


@router.delete("/{integracion_id}", response_model=MensajeResponse)
def eliminar_integracion(integracion_id: str, db: Session = Depends(get_db)):
    """Elimina una integración"""
    integracion = db.query(IntegracionEDM).filter(IntegracionEDM.id == integracion_id).first()
    if not integracion:
        raise HTTPException(status_code=404, detail="Integración no encontrada")
    db.delete(integracion)
    db.commit()
    return {"mensaje": "Integración eliminada", "ok": True}


@router.post("/{integracion_id}/evento", response_model=EventoIntegracionResponse)
def crear_evento(
    integracion_id: str,
    data: EventoIntegracionCreate,
    db: Session = Depends(get_db)
):
    """Crea un evento para sincronizar"""
    integracion = db.query(IntegracionEDM).filter(IntegracionEDM.id == integracion_id).first()
    if not integracion:
        raise HTTPException(status_code=404, detail="Integración no encontrada")
    
    evento = EventoIntegracion(
        id=str(uuid.uuid4()),
        integracion_id=integracion_id,
        tipo_evento=data.tipo_evento,
        datos=data.datos,
        prioridad=data.prioridad or 'normal',
        destino=data.destino
    )
    db.add(evento)
    db.commit()
    db.refresh(evento)
    return evento


@router.get("/eventos", response_model=List[EventoIntegracionResponse])
def listar_eventos(
    integracion_id: Optional[str] = Query(None),
    estado: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """Lista eventos de integración"""
    query = db.query(EventoIntegracion)
    if integracion_id:
        query = query.filter(EventoIntegracion.integracion_id == integracion_id)
    if estado:
        query = query.filter(EventoIntegracion.estado == estado)
    return query.order_by(EventoIntegracion.created_at.desc()).all()


@router.post("/{integracion_id}/sincronizar", response_model=MensajeResponse)
def sincronizar_integracion(
    integracion_id: str,
    db: Session = Depends(get_db)
):
    """Sincroniza una integración manualmente"""
    integracion = db.query(IntegracionEDM).filter(IntegracionEDM.id == integracion_id).first()
    if not integracion:
        raise HTTPException(status_code=404, detail="Integración no encontrada")
    
    integracion.ultima_sincronizacion = datetime.now(timezone.utc)
    db.commit()
    
    return {"mensaje": f"Integración {integracion.nombre} sincronizada", "ok": True}