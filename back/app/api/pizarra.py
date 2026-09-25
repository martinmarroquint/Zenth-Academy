# app/api/pizarra.py
# ROUTER PARA PIZARRA INTERACTIVA

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import or_
from sqlalchemy.orm import Session
from typing import List, Optional
import uuid
import logging
from datetime import datetime, timezone

from app.database import get_db
from app.core.dependencies import require_docente
from app.models.pizarra import Pizarra, SesionPizarra
from app.models.usuario import Usuario
from app.schemas.pizarra import (
    PizarraCreate, PizarraUpdate, PizarraResponse,
    SesionPizarraCreate, SesionPizarraResponse,
    ElementosPizarraUpdate,
    MensajeResponse
)

logger = logging.getLogger(__name__)

router = APIRouter(dependencies=[Depends(require_docente)])

# ✅ SEGURIDAD (ALTA 2): listas blancas para campos que antes aceptaban
# cualquier valor del cliente.
ESTADOS_PIZARRA_VALIDOS = {"ACTIVA", "CERRADA", "ARCHIVADA"}
ROLES_SESION_VALIDOS = {"EDITOR", "LECTOR"}


def _aware_utc(dt):
    """Normaliza a datetime UTC-aware (las columnas DateTime sin timezone
    devuelven naive tanto en SQLite como en PostgreSQL)."""
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def _verificar_ownership_pizarra(
    pizarra: Pizarra, current_user: Usuario, *, solo_lectura: bool = False
) -> None:
    """✅ SEGURIDAD (ALTA 1): aísla las pizarras por docente (admin siempre puede).
    `solo_lectura=True` permite además el acceso a pizarras marcadas como públicas."""
    if current_user.rol == 'admin':
        return
    if solo_lectura and pizarra.es_publica:
        return
    # Pizarras legacy sin dueño real ("default") se permiten para no romper datos previos
    if not pizarra.creado_por or pizarra.creado_por == 'default':
        return
    if str(pizarra.creado_por) != str(current_user.id):
        logger.warning(
            f"Acceso denegado: usuario {current_user.id} intentó gestionar "
            f"pizarra {pizarra.id} propiedad de {pizarra.creado_por}"
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permiso para gestionar esta pizarra",
        )


@router.get("/", response_model=List[PizarraResponse])
def listar_pizarras(
    tipo: Optional[str] = Query(None),
    estado: Optional[str] = Query(None),
    grupo_id: Optional[str] = Query(None),
    empresa_id: Optional[str] = Query(None),
    creado_por: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_docente)
):
    """Lista las pizarras del docente (admin: todas), con filtros opcionales."""
    query = db.query(Pizarra)
    # ✅ SEGURIDAD (ALTA 1): antes cualquier docente listaba TODAS las pizarras
    # (con sus `elementos`). Ahora solo las propias + legacy 'default' +
    # las marcadas como públicas.
    if current_user.rol != 'admin':
        query = query.filter(
            or_(
                Pizarra.creado_por == str(current_user.id),
                Pizarra.creado_por == 'default',
                Pizarra.creado_por.is_(None),
                Pizarra.es_publica.is_(True),
            )
        )
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
def crear_pizarra(
    data: PizarraCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_docente)
):
    """Crea una nueva pizarra. El dueño es SIEMPRE el usuario autenticado
    (admin puede asignarlo explícitamente)."""
    # ✅ SEGURIDAD (ALTA 2): antes `creado_por` venía del body y permitía
    # crear pizarras a nombre de otro docente (suplantación de dueño).
    creado_por_final = str(current_user.id)
    if current_user.rol == 'admin' and data.creado_por and data.creado_por != 'default':
        creado_por_final = data.creado_por

    pizarra = Pizarra(
        id=str(uuid.uuid4()),
        titulo=data.titulo,
        descripcion=data.descripcion,
        tipo=data.tipo,
        configuracion=data.configuracion,
        creado_por=creado_por_final,
        grupo_id=data.grupo_id,
        empresa_id=data.empresa_id,
        es_publica=data.es_publica
    )
    db.add(pizarra)
    db.commit()
    db.refresh(pizarra)
    return pizarra


@router.get("/{pizarra_id}", response_model=PizarraResponse)
def obtener_pizarra(
    pizarra_id: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_docente)
):
    """Obtiene una pizarra (dueño, admin o cualquiera si es pública)."""
    pizarra = db.query(Pizarra).filter(Pizarra.id == pizarra_id).first()
    if not pizarra:
        raise HTTPException(status_code=404, detail="Pizarra no encontrada")
    # ✅ SEGURIDAD (ALTA 1)
    _verificar_ownership_pizarra(pizarra, current_user, solo_lectura=True)
    return pizarra


@router.put("/{pizarra_id}", response_model=PizarraResponse)
def actualizar_pizarra(
    pizarra_id: str,
    data: PizarraUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_docente)
):
    """Actualiza una pizarra (solo el dueño o admin)"""
    pizarra = db.query(Pizarra).filter(Pizarra.id == pizarra_id).first()
    if not pizarra:
        raise HTTPException(status_code=404, detail="Pizarra no encontrada")
    # ✅ SEGURIDAD (ALTA 1)
    _verificar_ownership_pizarra(pizarra, current_user)

    if data.titulo is not None:
        pizarra.titulo = data.titulo
    if data.descripcion is not None:
        pizarra.descripcion = data.descripcion
    if data.configuracion is not None:
        pizarra.configuracion = data.configuracion
    if data.estado is not None:
        # ✅ SEGURIDAD (ALTA 2): lista blanca de estados
        if str(data.estado).upper() not in ESTADOS_PIZARRA_VALIDOS:
            raise HTTPException(status_code=400, detail="Estado de pizarra inválido")
        pizarra.estado = str(data.estado).upper()
    if data.elementos is not None:
        pizarra.elementos = data.elementos

    pizarra.updated_at = datetime.now(timezone.utc)
    pizarra.ultima_actividad = datetime.now(timezone.utc)
    db.commit()
    db.refresh(pizarra)
    return pizarra


@router.post("/{pizarra_id}/sesion", response_model=SesionPizarraResponse)
def iniciar_sesion(
    pizarra_id: str,
    data: SesionPizarraCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_docente)
):
    """Inicia una sesión en la pizarra (colaboración)."""
    pizarra = db.query(Pizarra).filter(Pizarra.id == pizarra_id).first()
    if not pizarra:
        raise HTTPException(status_code=404, detail="Pizarra no encontrada")
    # ✅ SEGURIDAD (ALTA 1): solo el dueño/admin (o pizarra pública)
    _verificar_ownership_pizarra(pizarra, current_user, solo_lectura=True)

    # ✅ SEGURIDAD (ALTA 2): la sesión pertenece SIEMPRE al usuario autenticado,
    # el rol se normaliza a lista blanca y la IP/user-agent se derivan del
    # request (antes el cliente podía fijar `usuario_id`, `rol`, `ip`).
    rol_final = str(data.rol or 'EDITOR').upper()
    if rol_final not in ROLES_SESION_VALIDOS:
        rol_final = 'EDITOR'

    sesion = SesionPizarra(
        id=str(uuid.uuid4()),
        pizarra_id=pizarra_id,
        usuario_id=str(current_user.id),
        rol=rol_final,
        ip=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent")
    )
    db.add(sesion)
    pizarra.ultima_actividad = datetime.now(timezone.utc)
    db.commit()
    db.refresh(sesion)
    return sesion


@router.put("/sesion/{sesion_id}/finalizar", response_model=MensajeResponse)
def finalizar_sesion(
    sesion_id: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_docente)
):
    """Finaliza una sesión de pizarra (dueño de la sesión, de la pizarra o admin)"""
    sesion = db.query(SesionPizarra).filter(SesionPizarra.id == sesion_id).first()
    if not sesion:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")

    # ✅ SEGURIDAD (BAJA 10): antes cualquiera podía cerrar la sesión de otro.
    if str(sesion.usuario_id) != str(current_user.id):
        pizarra = db.query(Pizarra).filter(Pizarra.id == sesion.pizarra_id).first()
        if pizarra:
            _verificar_ownership_pizarra(pizarra, current_user)

    # ✅ FIX: fecha_inicio viene naive de la BD; restar naive - aware lanzaba
    # TypeError (500). Se normaliza antes de calcular la duración.
    fin = datetime.now(timezone.utc)
    inicio = _aware_utc(sesion.fecha_inicio)
    sesion.fecha_fin = fin
    sesion.duracion = int((fin - inicio).total_seconds()) if inicio else 0
    sesion.conectado = False
    db.commit()
    return {"mensaje": "Sesión finalizada", "ok": True}


@router.get("/{pizarra_id}/elementos")
def obtener_elementos(
    pizarra_id: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_docente)
):
    """Obtiene los elementos de una pizarra (dueño, admin o pública)"""
    pizarra = db.query(Pizarra).filter(Pizarra.id == pizarra_id).first()
    if not pizarra:
        raise HTTPException(status_code=404, detail="Pizarra no encontrada")
    # ✅ SEGURIDAD (ALTA 1)
    _verificar_ownership_pizarra(pizarra, current_user, solo_lectura=True)
    return {"elementos": pizarra.elementos or []}


@router.post("/{pizarra_id}/elementos")
def actualizar_elementos(
    pizarra_id: str,
    data: ElementosPizarraUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_docente)
):
    """Actualiza los elementos de una pizarra (solo el dueño o admin)"""
    pizarra = db.query(Pizarra).filter(Pizarra.id == pizarra_id).first()
    if not pizarra:
        raise HTTPException(status_code=404, detail="Pizarra no encontrada")
    # ✅ SEGURIDAD (ALTA 1)
    _verificar_ownership_pizarra(pizarra, current_user)

    pizarra.elementos = data.elementos
    pizarra.ultima_actividad = datetime.now(timezone.utc)
    pizarra.updated_at = datetime.now(timezone.utc)
    db.commit()
    return {"mensaje": "Elementos actualizados", "ok": True}


@router.delete("/{pizarra_id}", response_model=MensajeResponse)
def eliminar_pizarra(
    pizarra_id: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_docente)
):
    """Elimina una pizarra (solo el dueño o admin)"""
    pizarra = db.query(Pizarra).filter(Pizarra.id == pizarra_id).first()
    if not pizarra:
        raise HTTPException(status_code=404, detail="Pizarra no encontrada")
    # ✅ SEGURIDAD (ALTA 1)
    _verificar_ownership_pizarra(pizarra, current_user)
    db.delete(pizarra)
    db.commit()
    return {"mensaje": "Pizarra eliminada", "ok": True}