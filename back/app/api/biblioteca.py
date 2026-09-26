# app/api/biblioteca.py
# BIBLIOTECA INDEPENDIENTE — recursos y tareas visibles para TODOS los alumnos.
# No depende de cursos ni inscripciones: cualquier usuario autenticado ve todo
# lo publicado y activo. Solo el autor (o admin) gestiona lo suyo.

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_
from sqlalchemy.orm import Session
from typing import List, Optional
import uuid
import secrets
import logging
from datetime import datetime, timezone

from app.database import get_db
from app.core.dependencies import require_docente, get_current_active_user
from app.core.errors import error_interno
from app.core.ratelimit import rate_limit
from app.models.usuario import Usuario
from app.models.biblioteca import RecursoBiblioteca, BibliotecaInteraccion
from app.schemas.biblioteca import (
    RecursoBibliotecaCreate,
    RecursoBibliotecaUpdate,
    RecursoBibliotecaResponse,
    RecursoPublicoResponse,
    InteraccionRequest,
    InteraccionResponse,
    CompletadoResponse,
    TemaResponse,
)

logger = logging.getLogger(__name__)
router = APIRouter()

TIPOS_VALIDOS = {"articulo", "libro", "video", "documento", "enlace", "tarea"}
TIPO_FAVORITO = "favorito"
TIPO_COMPLETADO = "completado"


# =============================================
# UTILIDADES
# =============================================

def _aware_utc(dt):
    """Normaliza a UTC-aware (las columnas DateTime devuelven naive)."""
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def _generar_token() -> str:
    return secrets.token_urlsafe(16)


def _verificar_ownership_recurso(
    recurso: RecursoBiblioteca, current_user: Usuario
) -> None:
    """✅ SEGURIDAD: admin puede todo; cada autor gestiona solo lo suyo."""
    if current_user.rol == "admin":
        return
    if str(recurso.autor_id) != str(current_user.id):
        logger.warning(
            f"Acceso denegado: usuario {current_user.id} intentó gestionar "
            f"el recurso {recurso.id} de {recurso.autor_id}"
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permiso sobre este recurso",
        )


def _obtener_activo(db: Session, recurso_id: str) -> RecursoBiblioteca:
    recurso = db.query(RecursoBiblioteca).filter(
        RecursoBiblioteca.id == recurso_id
    ).first()
    if not recurso or not recurso.activo:
        raise HTTPException(status_code=404, detail="Recurso no encontrado")
    return recurso


def _vencida(recurso: RecursoBiblioteca, ahora: datetime) -> bool:
    limite = _aware_utc(recurso.fecha_limite)
    return bool(limite and limite < ahora)


def _recurso_a_dict(
    recurso: RecursoBiblioteca,
    current_user: Usuario,
    *,
    favoritos: set,
    completados: set,
    completados_count: int,
    ahora: datetime,
) -> dict:
    return {
        "id": str(recurso.id),
        "autor_id": str(recurso.autor_id),
        "autor_nombre": recurso.autor_nombre,
        "tipo": recurso.tipo or "articulo",
        "titulo": recurso.titulo,
        "descripcion": recurso.descripcion,
        "contenido": recurso.contenido,
        "url": recurso.url,
        "portada_url": recurso.portada_url,
        "tema": recurso.tema,
        "etiquetas": recurso.etiquetas or [],
        "fecha_limite": recurso.fecha_limite,
        "token": recurso.token,
        "activo": bool(recurso.activo),
        "destacado": bool(recurso.destacado),
        "visitas": recurso.visitas or 0,
        "created_at": recurso.created_at,
        "updated_at": recurso.updated_at,
        "favorito": str(recurso.id) in favoritos,
        "completado": str(recurso.id) in completados,
        "completados_count": completados_count,
        "es_autor": str(recurso.autor_id) == str(current_user.id),
        "vencida": _vencida(recurso, ahora),
    }


# =============================================
# TEMAS (debe ir antes de /{recurso_id})
# =============================================

@router.get("/temas", response_model=List[TemaResponse])
def listar_temas(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user),
):
    """Temas disponibles para filtrar la biblioteca."""
    try:
        filas = db.query(
            RecursoBiblioteca.tema, func.count(RecursoBiblioteca.id)
        ).filter(
            RecursoBiblioteca.activo == True,  # noqa: E712
            RecursoBiblioteca.tema.isnot(None),
            RecursoBiblioteca.tema != "",
        ).group_by(RecursoBiblioteca.tema).order_by(
            func.count(RecursoBiblioteca.id).desc()
        ).all()
        return [{"tema": str(t), "total": int(n or 0)} for t, n in filas]
    except Exception as e:
        raise HTTPException(status_code=500, detail=error_interno(e, "Error listando temas"))


# =============================================
# LINK PÚBLICO POR TOKEN (sin login)
# =============================================

@router.get("/publico/{token}", response_model=RecursoPublicoResponse)
def obtener_recurso_publico(
    token: str,
    db: Session = Depends(get_db),
    # ✅ Endpoint público → rate limit
    _rate_limited = Depends(rate_limit(60, 60)),
):
    """Recurso compartido por link/QR: solo los datos del recurso."""
    try:
        recurso = db.query(RecursoBiblioteca).filter(
            RecursoBiblioteca.token == token,
            RecursoBiblioteca.activo == True,  # noqa: E712
        ).first()
        if not recurso:
            raise HTTPException(status_code=404, detail="Recurso no encontrado")

        recurso.visitas = (recurso.visitas or 0) + 1
        db.commit()
        db.refresh(recurso)

        return {
            "tipo": recurso.tipo or "articulo",
            "titulo": recurso.titulo,
            "descripcion": recurso.descripcion,
            "contenido": recurso.contenido,
            "url": recurso.url,
            "portada_url": recurso.portada_url,
            "tema": recurso.tema,
            "autor_nombre": recurso.autor_nombre,
            "fecha_limite": recurso.fecha_limite,
            "created_at": recurso.created_at,
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=error_interno(e, "Error obteniendo el recurso"))


# =============================================
# LISTADO Y CRUD
# =============================================

@router.get("/", response_model=List[RecursoBibliotecaResponse])
def listar_recursos(
    q: Optional[str] = Query(None, description="Búsqueda por título/descripción/tema"),
    tipo: Optional[str] = Query(None),
    tema: Optional[str] = Query(None),
    favoritos: bool = Query(False, description="Solo mis favoritos"),
    destacados: bool = Query(False),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user),
):
    """✅ Biblioteca abierta: cualquier usuario autenticado ve todo lo publicado,
    sin necesidad de estar inscrito en ningún curso."""
    try:
        ahora = datetime.now(timezone.utc)
        query = db.query(RecursoBiblioteca).filter(
            RecursoBiblioteca.activo == True  # noqa: E712
        )

        if tipo:
            query = query.filter(RecursoBiblioteca.tipo == tipo)
        if tema:
            query = query.filter(RecursoBiblioteca.tema.ilike(f"%{tema}%"))
        if destacados:
            query = query.filter(RecursoBiblioteca.destacado == True)  # noqa: E712
        if q:
            like = f"%{q}%"
            query = query.filter(
                or_(
                    RecursoBiblioteca.titulo.ilike(like),
                    RecursoBiblioteca.descripcion.ilike(like),
                    RecursoBiblioteca.tema.ilike(like),
                )
            )

        usuario_id = str(current_user.id)
        favoritos_ids = {
            str(r[0]) for r in db.query(BibliotecaInteraccion.recurso_id).filter(
                BibliotecaInteraccion.usuario_id == usuario_id,
                BibliotecaInteraccion.tipo == TIPO_FAVORITO,
            ).all()
        }
        if favoritos:
            if not favoritos_ids:
                return []
            query = query.filter(RecursoBiblioteca.id.in_(favoritos_ids))

        recursos = query.order_by(
            RecursoBiblioteca.destacado.desc(),
            RecursoBiblioteca.created_at.desc(),
        ).offset(offset).limit(limit).all()

        ids = [str(r.id) for r in recursos]
        completados_ids = set()
        conteos = {}
        if ids:
            completados_ids = {
                str(r[0]) for r in db.query(BibliotecaInteraccion.recurso_id).filter(
                    BibliotecaInteraccion.usuario_id == usuario_id,
                    BibliotecaInteraccion.tipo == TIPO_COMPLETADO,
                    BibliotecaInteraccion.recurso_id.in_(ids),
                ).all()
            }
            conteos = {
                str(r[0]): int(r[1] or 0) for r in db.query(
                    BibliotecaInteraccion.recurso_id,
                    func.count(BibliotecaInteraccion.id),
                ).filter(
                    BibliotecaInteraccion.tipo == TIPO_COMPLETADO,
                    BibliotecaInteraccion.recurso_id.in_(ids),
                ).group_by(BibliotecaInteraccion.recurso_id).all()
            }

        return [
            _recurso_a_dict(
                r, current_user,
                favoritos=favoritos_ids,
                completados=completados_ids,
                completados_count=conteos.get(str(r.id), 0),
                ahora=ahora,
            )
            for r in recursos
        ]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=error_interno(e, "Error listando la biblioteca"))


@router.post("/", response_model=RecursoBibliotecaResponse, status_code=201)
def crear_recurso(
    data: RecursoBibliotecaCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_docente),
):
    """✅ Docentes y admin publican recursos y tareas en la biblioteca."""
    try:
        tipo = (data.tipo or "articulo").lower()
        if tipo not in TIPOS_VALIDOS:
            raise HTTPException(status_code=400, detail="Tipo de recurso inválido")

        recurso = RecursoBiblioteca(
            id=str(uuid.uuid4()),
            autor_id=str(current_user.id),
            autor_nombre=current_user.nombre_completo,
            tipo=tipo,
            titulo=data.titulo,
            descripcion=data.descripcion,
            contenido=data.contenido,
            url=data.url,
            portada_url=data.portada_url,
            tema=data.tema,
            etiquetas=data.etiquetas or [],
            fecha_limite=data.fecha_limite if tipo == "tarea" else None,
            token=_generar_token(),
            activo=True,
            destacado=bool(data.destacado),
            visitas=0,
        )
        db.add(recurso)
        db.commit()
        db.refresh(recurso)
        logger.info(f"Recurso de biblioteca creado: {recurso.id} ({tipo})")
        return _recurso_a_dict(
            recurso, current_user,
            favoritos=set(), completados=set(), completados_count=0,
            ahora=datetime.now(timezone.utc),
        )
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=error_interno(e, "Error creando el recurso"))


@router.get("/{recurso_id}", response_model=RecursoBibliotecaResponse)
def obtener_recurso(
    recurso_id: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user),
):
    try:
        recurso = _obtener_activo(db, recurso_id)
        recurso.visitas = (recurso.visitas or 0) + 1
        db.commit()
        db.refresh(recurso)

        usuario_id = str(current_user.id)
        favorito = db.query(BibliotecaInteraccion).filter(
            BibliotecaInteraccion.recurso_id == recurso_id,
            BibliotecaInteraccion.usuario_id == usuario_id,
            BibliotecaInteraccion.tipo == TIPO_FAVORITO,
        ).first() is not None
        completado = db.query(BibliotecaInteraccion).filter(
            BibliotecaInteraccion.recurso_id == recurso_id,
            BibliotecaInteraccion.usuario_id == usuario_id,
            BibliotecaInteraccion.tipo == TIPO_COMPLETADO,
        ).first() is not None
        conteo = db.query(func.count(BibliotecaInteraccion.id)).filter(
            BibliotecaInteraccion.recurso_id == recurso_id,
            BibliotecaInteraccion.tipo == TIPO_COMPLETADO,
        ).scalar() or 0

        return _recurso_a_dict(
            recurso, current_user,
            favoritos={recurso_id} if favorito else set(),
            completados={recurso_id} if completado else set(),
            completados_count=int(conteo),
            ahora=datetime.now(timezone.utc),
        )
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=error_interno(e, "Error obteniendo el recurso"))


@router.put("/{recurso_id}", response_model=RecursoBibliotecaResponse)
def actualizar_recurso(
    recurso_id: str,
    data: RecursoBibliotecaUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_docente),
):
    try:
        recurso = db.query(RecursoBiblioteca).filter(
            RecursoBiblioteca.id == recurso_id
        ).first()
        if not recurso:
            raise HTTPException(status_code=404, detail="Recurso no encontrado")
        _verificar_ownership_recurso(recurso, current_user)

        update_data = data.model_dump(exclude_unset=True)
        if "tipo" in update_data and update_data["tipo"] is not None:
            tipo_nuevo = str(update_data["tipo"]).lower()
            if tipo_nuevo not in TIPOS_VALIDOS:
                raise HTTPException(status_code=400, detail="Tipo de recurso inválido")
            update_data["tipo"] = tipo_nuevo

        for field, value in update_data.items():
            setattr(recurso, field, value)

        # ✅ La fecha límite solo aplica a tareas
        if recurso.tipo != "tarea":
            recurso.fecha_limite = None

        db.commit()
        db.refresh(recurso)
        return _recurso_a_dict(
            recurso, current_user,
            favoritos=set(), completados=set(), completados_count=0,
            ahora=datetime.now(timezone.utc),
        )
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=error_interno(e, "Error actualizando el recurso"))


@router.delete("/{recurso_id}", response_model=dict)
def eliminar_recurso(
    recurso_id: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_docente),
):
    """Despublica el recurso (soft delete: se conserva el histórico)."""
    try:
        recurso = db.query(RecursoBiblioteca).filter(
            RecursoBiblioteca.id == recurso_id
        ).first()
        if not recurso:
            raise HTTPException(status_code=404, detail="Recurso no encontrado")
        _verificar_ownership_recurso(recurso, current_user)

        recurso.activo = False
        db.commit()
        logger.info(f"Recurso de biblioteca despublicado: {recurso_id}")
        return {"mensaje": "Recurso despublicado", "ok": True}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=error_interno(e, "Error eliminando el recurso"))


# =============================================
# INTERACCIONES DEL ALUMNO
# =============================================

@router.post("/{recurso_id}/favorito", response_model=InteraccionResponse)
def alternar_favorito(
    recurso_id: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user),
):
    """Marca/desmarca el recurso como favorito del usuario actual."""
    try:
        _obtener_activo(db, recurso_id)
        usuario_id = str(current_user.id)

        existente = db.query(BibliotecaInteraccion).filter(
            BibliotecaInteraccion.recurso_id == recurso_id,
            BibliotecaInteraccion.usuario_id == usuario_id,
            BibliotecaInteraccion.tipo == TIPO_FAVORITO,
        ).first()

        if existente:
            db.delete(existente)
            db.commit()
            activo = False
        else:
            db.add(BibliotecaInteraccion(
                id=str(uuid.uuid4()),
                recurso_id=recurso_id,
                usuario_id=usuario_id,
                tipo=TIPO_FAVORITO,
            ))
            db.commit()
            activo = True

        return {"recurso_id": recurso_id, "tipo": TIPO_FAVORITO, "activo": activo}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=error_interno(e, "Error guardando el favorito"))


@router.post("/{recurso_id}/completar", response_model=InteraccionResponse)
def alternar_completado(
    recurso_id: str,
    data: Optional[InteraccionRequest] = None,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user),
):
    """Marca/desmarca una tarea o recurso como completado (con comentario opcional)."""
    try:
        recurso = _obtener_activo(db, recurso_id)
        usuario_id = str(current_user.id)
        payload = data or InteraccionRequest()

        existente = db.query(BibliotecaInteraccion).filter(
            BibliotecaInteraccion.recurso_id == recurso_id,
            BibliotecaInteraccion.usuario_id == usuario_id,
            BibliotecaInteraccion.tipo == TIPO_COMPLETADO,
        ).first()

        if existente:
            db.delete(existente)
            db.commit()
            activo = False
        else:
            db.add(BibliotecaInteraccion(
                id=str(uuid.uuid4()),
                recurso_id=recurso_id,
                usuario_id=usuario_id,
                tipo=TIPO_COMPLETADO,
                comentario=(payload.comentario or None),
            ))
            db.commit()
            activo = True

        conteo = db.query(func.count(BibliotecaInteraccion.id)).filter(
            BibliotecaInteraccion.recurso_id == recurso_id,
            BibliotecaInteraccion.tipo == TIPO_COMPLETADO,
        ).scalar() or 0

        logger.info(
            f"Recurso {recurso_id} {'completado' if activo else 'desmarcado'} "
            f"por {usuario_id} (tipo={recurso.tipo})"
        )
        return {
            "recurso_id": recurso_id,
            "tipo": TIPO_COMPLETADO,
            "activo": activo,
            "completados_count": int(conteo),
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=error_interno(e, "Error guardando el progreso"))


@router.get("/{recurso_id}/completados", response_model=List[CompletadoResponse])
def listar_completados(
    recurso_id: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_docente),
):
    """✅ Solo el autor (o admin) ve quién completó su tarea/recurso."""
    try:
        recurso = _obtener_activo(db, recurso_id)
        _verificar_ownership_recurso(recurso, current_user)

        filas = db.query(BibliotecaInteraccion, Usuario).outerjoin(
            Usuario, Usuario.id == BibliotecaInteraccion.usuario_id
        ).filter(
            BibliotecaInteraccion.recurso_id == recurso_id,
            BibliotecaInteraccion.tipo == TIPO_COMPLETADO,
        ).order_by(BibliotecaInteraccion.created_at.desc()).all()

        return [
            {
                "usuario_id": str(inter.usuario_id),
                "usuario_nombre": (usuario.nombre_completo if usuario else None),
                "comentario": inter.comentario,
                "completado_en": inter.created_at,
            }
            for inter, usuario in filas
        ]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=error_interno(e, "Error listando completados"))
