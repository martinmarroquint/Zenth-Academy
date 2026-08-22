# app/api/historial.py
# VERSION CON LOGS PARA DEPURAR

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
import uuid
import logging
from datetime import datetime, timezone

from app.database import get_db
from app.core.dependencies import require_docente
from app.models.historial_comparticion import HistorialComparticion
from app.schemas.examenes import (
    HistorialComparticionCreate,
    HistorialComparticionResponse,
    MensajeResponse
)

logger = logging.getLogger(__name__)
router = APIRouter(dependencies=[Depends(require_docente)])


@router.get("/comparticiones", response_model=List[HistorialComparticionResponse])
def listar_historial(
    docente_id: Optional[str] = Query(None),
    estado: Optional[str] = Query(None),
    fecha_desde: Optional[str] = Query(None),
    fecha_hasta: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """Lista el historial de comparticiones"""
    try:
        query = db.query(HistorialComparticion)
        
        if docente_id:
            query = query.filter(HistorialComparticion.docente_id == docente_id)
        if estado:
            query = query.filter(HistorialComparticion.estado == estado.upper())
        if fecha_desde:
            query = query.filter(HistorialComparticion.fecha_inicio >= fecha_desde)
        if fecha_hasta:
            query = query.filter(HistorialComparticion.fecha_inicio <= fecha_hasta)
        
        return query.order_by(HistorialComparticion.fecha_inicio.desc()).all()
    except Exception as e:
        logger.error(f"Error en listar_historial: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/comparticiones/{comparticion_id}", response_model=HistorialComparticionResponse)
def obtener_historial(comparticion_id: str, db: Session = Depends(get_db)):
    """Obtiene detalle de una compartición"""
    try:
        historial = db.query(HistorialComparticion).filter(
            HistorialComparticion.id == comparticion_id
        ).first()
        if not historial:
            raise HTTPException(status_code=404, detail="No encontrado")
        return historial
    except Exception as e:
        logger.error(f"Error en obtener_historial: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/comparticiones", response_model=HistorialComparticionResponse, status_code=201)
def crear_historial(data: HistorialComparticionCreate, db: Session = Depends(get_db)):
    """Registra una nueva compartición"""
    try:
        historial = HistorialComparticion(
            id=str(uuid.uuid4()),
            docente_id=data.docente_id,
            grupo_id=data.grupo_id,
            grupo_nombre=data.grupo_nombre,
            recursos_compartidos=data.recursos or [],
            cantidad_recursos=len(data.recursos or []),
            alumnos_ids=data.alumnos_ids or [],
            cantidad_alumnos=len(data.alumnos_ids or []),
            session_id=data.session_id,
            estado='ACTIVO'
        )
        db.add(historial)
        db.commit()
        db.refresh(historial)
        return historial
    except Exception as e:
        db.rollback()
        logger.error(f"Error en crear_historial: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/comparticiones/{comparticion_id}/cerrar", response_model=MensajeResponse)
def cerrar_historial(comparticion_id: str, db: Session = Depends(get_db)):
    """Cierra una compartición activa"""
    try:
        logger.info(f"🔍 Buscando historial con ID: {comparticion_id}")
        
        # Buscar el historial
        historial = db.query(HistorialComparticion).filter(
            HistorialComparticion.id == comparticion_id
        ).first()
        
        # Si no existe, devolver error
        if not historial:
            logger.warning(f"❌ Historial no encontrado: {comparticion_id}")
            raise HTTPException(status_code=404, detail=f"Historial no encontrado: {comparticion_id}")
        
        logger.info(f"📊 Historial encontrado: estado={historial.estado}, fecha_inicio={historial.fecha_inicio}")
        
        # Verificar que esté activo
        if historial.estado != 'ACTIVO':
            logger.warning(f"⚠️ Historial no está activo: estado={historial.estado}")
            raise HTTPException(status_code=400, detail=f"El historial no está activo (estado: {historial.estado})")
        
        # Calcular duración
        now = datetime.now(timezone.utc)
        historial.fecha_fin = now
        historial.duracion_segundos = int(
            (now - historial.fecha_inicio).total_seconds()
        )
        historial.estado = 'CERRADO'
        historial.actualizado_en = now
        
        logger.info(f"✅ Cerrando historial: duracion={historial.duracion_segundos}s")
        
        db.commit()
        
        return {"mensaje": "Compartición cerrada correctamente", "ok": True}
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Error en cerrar_historial: {e}")
        raise HTTPException(status_code=500, detail=str(e))