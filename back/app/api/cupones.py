# app/api/cupones.py
# MÓDULO DE CUPONES Y PROMOCIONES
# Admin: CRUD completo + historial de usos.
# Alumno: validación del cupón al solicitar acceso a un curso de pago.

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, or_
from sqlalchemy.orm import Session
from typing import List, Optional
import uuid
import logging
from datetime import datetime, timezone

from app.database import get_db
from app.core.dependencies import require_admin, get_current_active_user
from app.core.errors import error_interno
from app.models.cupon import Cupon, CuponUso
from app.models.curso import Curso
from app.models.usuario import Usuario
from app.schemas.cupon import (
    CuponCreate,
    CuponUpdate,
    CuponResponse,
    ValidarCuponRequest,
    ValidarCuponResponse,
    CuponUsoResponse,
    MensajeResponse,
)

logger = logging.getLogger(__name__)
router = APIRouter()

TIPOS_VALIDOS = {"porcentaje", "monto"}


# =============================================
# UTILIDADES
# =============================================

def _aware(dt):
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def vigencia_cupon(cupon: Cupon, ahora: datetime) -> str:
    """✅ Estado real del cupón (para el panel y para la validación)."""
    if not cupon.activo:
        return "inactivo"
    inicio = _aware(cupon.fecha_inicio)
    fin = _aware(cupon.fecha_fin)
    if inicio and inicio > ahora:
        return "programado"
    if fin and fin < ahora:
        return "expirado"
    if cupon.max_usos is not None and (cupon.usos or 0) >= cupon.max_usos:
        return "agotado"
    return "vigente"


def _cupon_a_dict(cupon: Cupon, curso_titulo: Optional[str] = None) -> dict:
    ahora = datetime.now(timezone.utc)
    return {
        "id": str(cupon.id),
        "codigo": cupon.codigo,
        "descripcion": cupon.descripcion,
        "tipo": cupon.tipo or "porcentaje",
        "valor": float(cupon.valor or 0),
        "curso_id": str(cupon.curso_id) if cupon.curso_id else None,
        "curso_titulo": curso_titulo,
        "max_usos": cupon.max_usos,
        "usos": int(cupon.usos or 0),
        "usos_por_usuario": cupon.usos_por_usuario,
        "fecha_inicio": cupon.fecha_inicio,
        "fecha_fin": cupon.fecha_fin,
        "activo": bool(cupon.activo),
        "vigencia": vigencia_cupon(cupon, ahora),
        "created_at": cupon.created_at,
        "updated_at": cupon.updated_at,
    }


def calcular_cupon(
    db: Session,
    codigo: Optional[str],
    curso: Curso,
    usuario_id: Optional[str],
    *,
    consumir: bool = False,
    usuario: Optional[Usuario] = None,
) -> dict:
    """✅ Valida el cupón y calcula el descuento sobre el precio del curso.

    Con `consumir=True` registra el uso (historial) y suma el contador.
    Devuelve siempre un dict con `valido`, `motivo` y los montos.
    """
    codigo_norm = (codigo or "").strip().upper()
    if not codigo_norm:
        return {"valido": False, "motivo": "Ingresá un código de cupón"}

    cupon = db.query(Cupon).filter(func.upper(Cupon.codigo) == codigo_norm).first()
    if not cupon:
        return {"valido": False, "motivo": "El cupón no existe"}

    ahora = datetime.now(timezone.utc)
    estado = vigencia_cupon(cupon, ahora)
    if estado == "inactivo":
        return {"valido": False, "motivo": "El cupón está desactivado"}
    if estado == "programado":
        return {"valido": False, "motivo": "El cupón todavía no está vigente"}
    if estado == "expirado":
        return {"valido": False, "motivo": "El cupón expiró"}
    if estado == "agotado":
        return {"valido": False, "motivo": "El cupón alcanzó su límite de usos"}

    if cupon.curso_id and str(cupon.curso_id) != str(curso.id):
        return {"valido": False, "motivo": "El cupón no aplica a este curso"}

    if usuario_id and cupon.usos_por_usuario:
        usos_usuario = int(
            db.query(func.count(CuponUso.id)).filter(
                CuponUso.cupon_id == cupon.id,
                CuponUso.usuario_id == str(usuario_id),
            ).scalar() or 0
        )
        if usos_usuario >= int(cupon.usos_por_usuario):
            return {"valido": False, "motivo": "Ya usaste este cupón"}

    base = float(curso.precio_monto or 0)
    if (cupon.tipo or "porcentaje") == "porcentaje":
        descuento = base * (float(cupon.valor or 0) / 100.0)
    else:
        descuento = float(cupon.valor or 0)
    descuento = round(max(0.0, min(descuento, base)), 2)

    if consumir:
        cupon.usos = int(cupon.usos or 0) + 1
        db.add(CuponUso(
            id=str(uuid.uuid4()),
            cupon_id=str(cupon.id),
            codigo=cupon.codigo,
            usuario_id=str(usuario_id),
            usuario_nombre=(usuario.nombre_completo if usuario else None),
            curso_id=str(curso.id),
            curso_titulo=curso.titulo,
            monto_base=base,
            monto_descuento=descuento,
            monto_final=round(base - descuento, 2),
        ))

    return {
        "valido": True,
        "motivo": None,
        "codigo": cupon.codigo,
        "tipo": cupon.tipo or "porcentaje",
        "valor": float(cupon.valor or 0),
        "monto_base": base,
        "monto_descuento": descuento,
        "monto_final": round(base - descuento, 2),
    }


# =============================================
# VALIDACIÓN (ALUMNO)
# =============================================

@router.post("/validar", response_model=ValidarCuponResponse)
def validar_cupon(
    data: ValidarCuponRequest,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user),
):
    """✅ Valida un cupón contra un curso SIN consumirlo (para mostrar el precio)."""
    try:
        if not data.curso_id:
            raise HTTPException(status_code=400, detail="Falta el curso")

        curso = db.query(Curso).filter(Curso.id == str(data.curso_id)).first()
        if not curso:
            raise HTTPException(status_code=404, detail="Curso no encontrado")

        return calcular_cupon(db, data.codigo, curso, str(current_user.id))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=error_interno(e, "Error validando el cupón"))


# =============================================
# ADMINISTRACIÓN (solo admin)
# =============================================

@router.get("/", response_model=List[CuponResponse])
def listar_cupones(
    q: Optional[str] = Query(None, description="Buscar por código o descripción"),
    activo: Optional[bool] = Query(None),
    solo_vigentes: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_admin),
):
    try:
        query = db.query(Cupon)
        if q:
            like = f"%{q}%"
            query = query.filter(or_(Cupon.codigo.ilike(like), Cupon.descripcion.ilike(like)))
        if activo is not None:
            query = query.filter(Cupon.activo == activo)

        cupones = query.order_by(Cupon.created_at.desc()).all()

        cursos = {}
        ids = {str(c.curso_id) for c in cupones if c.curso_id}
        if ids:
            cursos = {
                str(c.id): c.titulo for c in db.query(Curso).filter(Curso.id.in_(ids)).all()
            }

        datos = [_cupon_a_dict(c, cursos.get(str(c.curso_id))) for c in cupones]
        if solo_vigentes:
            datos = [d for d in datos if d["vigencia"] == "vigente"]
        return datos
    except Exception as e:
        raise HTTPException(status_code=500, detail=error_interno(e, "Error listando cupones"))


@router.post("/", response_model=CuponResponse, status_code=201)
def crear_cupon(
    data: CuponCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_admin),
):
    try:
        codigo = (data.codigo or "").strip().upper()
        if not codigo:
            raise HTTPException(status_code=400, detail="El código es obligatorio")
        if (data.tipo or "porcentaje") not in TIPOS_VALIDOS:
            raise HTTPException(status_code=400, detail="Tipo de cupón inválido")
        if float(data.valor or 0) <= 0:
            raise HTTPException(status_code=400, detail="El valor del descuento debe ser mayor a 0")
        if (data.tipo or "porcentaje") == "porcentaje" and float(data.valor or 0) > 100:
            raise HTTPException(status_code=400, detail="El porcentaje no puede superar 100")

        existe = db.query(Cupon).filter(func.upper(Cupon.codigo) == codigo).first()
        if existe:
            raise HTTPException(status_code=400, detail="Ya existe un cupón con ese código")

        if data.curso_id:
            curso = db.query(Curso).filter(Curso.id == str(data.curso_id)).first()
            if not curso:
                raise HTTPException(status_code=404, detail="El curso indicado no existe")

        cupon = Cupon(
            id=str(uuid.uuid4()),
            codigo=codigo,
            descripcion=data.descripcion,
            tipo=data.tipo or "porcentaje",
            valor=float(data.valor or 0),
            curso_id=str(data.curso_id) if data.curso_id else None,
            max_usos=data.max_usos,
            usos=0,
            usos_por_usuario=data.usos_por_usuario,
            fecha_inicio=data.fecha_inicio,
            fecha_fin=data.fecha_fin,
            activo=bool(data.activo),
            creado_por=str(current_user.id),
        )
        db.add(cupon)
        db.commit()
        db.refresh(cupon)
        logger.info(f"Cupón creado: {cupon.codigo} por {current_user.id}")
        return _cupon_a_dict(cupon)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=error_interno(e, "Error creando el cupón"))


@router.put("/{cupon_id}", response_model=CuponResponse)
def actualizar_cupon(
    cupon_id: str,
    data: CuponUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_admin),
):
    try:
        cupon = db.query(Cupon).filter(Cupon.id == cupon_id).first()
        if not cupon:
            raise HTTPException(status_code=404, detail="Cupón no encontrado")

        update_data = data.model_dump(exclude_unset=True)

        if "tipo" in update_data and update_data["tipo"] not in TIPOS_VALIDOS:
            raise HTTPException(status_code=400, detail="Tipo de cupón inválido")
        if update_data.get("valor") is not None and float(update_data["valor"]) <= 0:
            raise HTTPException(status_code=400, detail="El valor del descuento debe ser mayor a 0")
        if update_data.get("curso_id"):
            curso = db.query(Curso).filter(Curso.id == str(update_data["curso_id"])).first()
            if not curso:
                raise HTTPException(status_code=404, detail="El curso indicado no existe")

        for campo, valor in update_data.items():
            if campo == "curso_id" and valor is None:
                setattr(cupon, campo, None)
                continue
            setattr(cupon, campo, valor)

        db.commit()
        db.refresh(cupon)
        logger.info(f"Cupón actualizado: {cupon.codigo}")
        return _cupon_a_dict(cupon)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=error_interno(e, "Error actualizando el cupón"))


@router.delete("/{cupon_id}", response_model=MensajeResponse)
def desactivar_cupon(
    cupon_id: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_admin),
):
    """Desactiva el cupón (soft delete: se conserva el historial de usos)."""
    try:
        cupon = db.query(Cupon).filter(Cupon.id == cupon_id).first()
        if not cupon:
            raise HTTPException(status_code=404, detail="Cupón no encontrado")

        cupon.activo = False
        db.commit()
        logger.info(f"Cupón desactivado: {cupon.codigo}")
        return {"mensaje": "Cupón desactivado", "ok": True}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=error_interno(e, "Error desactivando el cupón"))


@router.get("/{cupon_id}/usos", response_model=List[CuponUsoResponse])
def listar_usos(
    cupon_id: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_admin),
):
    try:
        cupon = db.query(Cupon).filter(Cupon.id == cupon_id).first()
        if not cupon:
            raise HTTPException(status_code=404, detail="Cupón no encontrado")

        usos = db.query(CuponUso).filter(
            CuponUso.cupon_id == cupon_id
        ).order_by(CuponUso.created_at.desc()).all()

        return [
            {
                "id": str(u.id),
                "codigo": u.codigo,
                "usuario_id": str(u.usuario_id),
                "usuario_nombre": u.usuario_nombre,
                "curso_titulo": u.curso_titulo,
                "monto_base": float(u.monto_base or 0),
                "monto_descuento": float(u.monto_descuento or 0),
                "monto_final": float(u.monto_final or 0),
                "created_at": u.created_at,
            }
            for u in usos
        ]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=error_interno(e, "Error listando usos"))
