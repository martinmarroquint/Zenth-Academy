# app/api/comunidad.py
# ROUTER DE FORO / COMUNIDAD

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_, and_, cast, String
from sqlalchemy.orm import Session
from typing import List, Optional
import uuid
import logging

from app.database import get_db
from app.core.dependencies import require_roles, get_current_user_id
from app.core.errors import error_interno
from app.models.post import Post, Comentario, LikePost
from app.schemas.post import (
    PostCreate, PostUpdate, PostResponse,
    ComentarioCreate, ComentarioResponse,
    LikeResponse, MensajeResponse
)

logger = logging.getLogger(__name__)
router = APIRouter()

# ✅ SEGURIDAD (BAJA 11): lista blanca de estados de publicación
ESTADOS_POST_VALIDOS = {"publicado", "archivado", "borrador"}


def _docente_puede_gestionar_curso(db: Session, curso_id, current_user) -> bool:
    """✅ SEGURIDAD (MEDIA 9 / BAJA 11): un docente solo publica/edita foros de
    cursos que le pertenecen (admin: cualquiera). El foro global siempre se permite."""
    if current_user.rol == "admin":
        return True
    if not curso_id:
        return True
    from app.models.curso import Curso

    curso = db.query(Curso).filter(Curso.id == str(curso_id)).first()
    if not curso:
        return False
    if not curso.docente_id:
        return True  # curso legacy sin dueño
    return str(curso.docente_id) == str(current_user.id)


def _puede_ver_post(db: Session, post: Post, current_user) -> bool:
    """✅ SEGURIDAD (MEDIA 3/4/8): visibilidad de una publicación.
    - admin: todo.
    - docente: lo propio (cualquier estado) + lo PUBLICADO global o de sus cursos.
    - estudiante: solo PUBLICADO del foro global o de cursos donde está inscrito.
    """
    if current_user.rol == "admin":
        return True
    publicado = (post.estado or "publicado") == "publicado"
    if current_user.rol == "docente":
        if str(post.docente_id) == str(current_user.id):
            return True
        if not publicado:
            return False
        return _docente_puede_gestionar_curso(db, post.curso_id, current_user)
    # estudiante
    if not publicado:
        return False
    if not post.curso_id:
        return True
    from app.api.cursos import _esta_inscrito

    return _esta_inscrito(db, str(post.curso_id), str(current_user.id))


def _post_to_dict(db: Session, post: Post, likes_usuario: Optional[set] = None) -> dict:
    """`likes_usuario` = set con los post_id que el usuario actual ya likeó
    (se calcula en bloque para los listados y evita N+1)."""
    return {
        "id": str(post.id),
        "titulo": post.titulo,
        "contenido": post.contenido,
        "categoria": post.categoria,
        "curso_id": str(post.curso_id) if post.curso_id else None,
        "docente_id": str(post.docente_id),
        "docente_nombre": post.docente_nombre,
        "destacado": post.destacado or False,
        "estado": post.estado or "publicado",
        "comentarios_count": post.comentarios_count or 0,
        "likes_count": post.likes_count or 0,
        # ✅ Para pintar el corazón en el front
        "liked_by_me": str(post.id) in (likes_usuario or set()),
        "vistas_count": post.vistas_count or 0,
        "tags": post.tags or [],
        "created_at": post.created_at.isoformat() if post.created_at else None,
        "updated_at": post.updated_at.isoformat() if post.updated_at else None,
        "comentarios": []
    }


def _mis_likes(db: Session, usuario_id, post_ids: list) -> set:
    """✅ post_id que el usuario ya likeó (una sola consulta)."""
    if not usuario_id or not post_ids:
        return set()
    return {
        str(r[0]) for r in db.query(LikePost.post_id).filter(
            LikePost.docente_id == str(usuario_id),
            LikePost.post_id.in_([str(p) for p in post_ids]),
        ).all()
    }


def _verificar_ownership_post(post: Post, current_user) -> None:
    """✅ SEGURIDAD: admin puede todo; el autor solo su propia publicación."""
    if current_user.rol == "admin":
        return
    if str(post.docente_id) != str(current_user.id):
        logger.warning(
            f"Acceso denegado: usuario {current_user.id} intentó gestionar "
            f"publicación {post.id} de {post.docente_id}"
        )
        raise HTTPException(status_code=403, detail="No tienes permiso sobre esta publicación")


@router.get("/", response_model=List[PostResponse])
async def listar_posts(
    categoria: Optional[str] = Query(None),
    estado: Optional[str] = Query(None),
    docente_id: Optional[str] = Query(None),
    curso_id: Optional[str] = Query(None, description="Filtrar por curso. Usar 'global' para solo foro global, o el ID de un curso"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(["admin", "docente", "estudiante"]))
):
    try:
        query = db.query(Post)
        # ✅ SEGURIDAD (MEDIA 3): visibilidad por rol. Antes cualquier autenticado
        # podía leer foros de cursos ajenos y publicaciones archivadas.
        if current_user.rol == "estudiante":
            query = query.filter(or_(Post.estado == "publicado", Post.estado.is_(None)))
            if curso_id and curso_id.lower() != "global":
                from app.api.cursos import _esta_inscrito
                if not _esta_inscrito(db, str(curso_id), str(current_user.id)):
                    logger.warning(
                        f"Acceso denegado: estudiante {current_user.id} intentó leer "
                        f"el foro del curso {curso_id}"
                    )
                    raise HTTPException(status_code=403, detail="No tienes acceso a este foro")
        elif current_user.rol == "docente":
            from app.models.curso import Curso
            cursos_propios = [
                str(c[0]) for c in db.query(Curso.id).filter(
                    cast(Curso.docente_id, String) == str(current_user.id)
                ).all()
            ]
            visibles_curso = (
                Post.curso_id.in_(cursos_propios) if cursos_propios else Post.curso_id.is_(None)
            )
            query = query.filter(
                or_(
                    Post.docente_id == str(current_user.id),
                    and_(
                        or_(Post.estado == "publicado", Post.estado.is_(None)),
                        or_(Post.curso_id.is_(None), visibles_curso),
                    ),
                )
            )
        if categoria:
            query = query.filter(Post.categoria == categoria)
        if estado:
            query = query.filter(Post.estado == estado)
        if docente_id:
            query = query.filter(Post.docente_id == docente_id)
        if curso_id:
            if curso_id.lower() == "global":
                query = query.filter(Post.curso_id.is_(None))
            else:
                query = query.filter(Post.curso_id == curso_id)
        else:
            # Sin filtro de curso: mostrar solo foro global (comportamiento por defecto para compatibilidad)
            query = query.filter(Post.curso_id.is_(None))
        posts = query.order_by(Post.created_at.desc()).offset(offset).limit(limit).all()
        # ✅ Likes del usuario actual para todos los posts del listado
        mis_likes = _mis_likes(db, current_user.id, [p.id for p in posts])
        return [_post_to_dict(db, p, mis_likes) for p in posts]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=error_interno(e, "Error listando posts"))


@router.get("/{id}", response_model=PostResponse)
async def obtener_post(
    id: str,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(["admin", "docente", "estudiante"]))
):
    try:
        post = db.query(Post).filter(Post.id == id).first()
        if not post:
            raise HTTPException(status_code=404, detail="Publicacion no encontrada")
        # ✅ SEGURIDAD (MEDIA 4): antes cualquier autenticado leía cualquier post
        # (incluso archivado o de cursos ajenos) e inflaba las vistas.
        if not _puede_ver_post(db, post, current_user):
            logger.warning(
                f"Acceso denegado: usuario {current_user.id} intentó ver la "
                f"publicación {post.id}"
            )
            raise HTTPException(status_code=403, detail="No tienes permiso para ver esta publicación")
        post.vistas_count = (post.vistas_count or 0) + 1
        db.commit()
        comentarios = db.query(Comentario).filter(Comentario.post_id == id).order_by(Comentario.created_at.asc()).all()
        data = _post_to_dict(db, post, _mis_likes(db, current_user.id, [post.id]))
        data["comentarios"] = [{
            "id": str(c.id),
            "post_id": str(c.post_id),
            "docente_id": str(c.docente_id),
            "docente_nombre": c.docente_nombre,
            "contenido": c.contenido,
            "likes_count": c.likes_count or 0,
            "created_at": c.created_at.isoformat() if c.created_at else None,
            "updated_at": c.updated_at.isoformat() if c.updated_at else None,
        } for c in comentarios]
        return data
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=error_interno(e, "Error obteniendo post"))


@router.post("/", response_model=PostResponse, status_code=201)
async def crear_post(
    data: PostCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(["admin", "docente"]))
):
    try:
        # ✅ SEGURIDAD (MEDIA 9): si publica en el foro de un curso, debe poder
        # gestionarlo (dueño o admin). Antes se podía publicar en cursos ajenos.
        if data.curso_id and not _docente_puede_gestionar_curso(db, data.curso_id, current_user):
            logger.warning(
                f"Acceso denegado: docente {current_user.id} intentó publicar en "
                f"el curso {data.curso_id}"
            )
            raise HTTPException(status_code=403, detail="No tienes permiso sobre este curso")
        post = Post(
            id=str(uuid.uuid4()),
            titulo=data.titulo,
            contenido=data.contenido,
            categoria=data.categoria or "general",
            curso_id=data.curso_id if data.curso_id else None,
            docente_id=str(current_user.id),
            docente_nombre=None,
            destacado=False,
            estado="publicado",
            comentarios_count=0,
            likes_count=0,
            vistas_count=0,
            tags=data.tags or []
        )
        db.add(post)
        db.commit()
        db.refresh(post)
        logger.info(f"Post creado: {post.id} - {post.titulo[:50]}")
        return _post_to_dict(db, post)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=error_interno(e, "Error creando post"))


@router.put("/{id}", response_model=PostResponse)
async def actualizar_post(
    id: str,
    data: PostUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(["admin", "docente"]))
):
    try:
        post = db.query(Post).filter(Post.id == id).first()
        if not post:
            raise HTTPException(status_code=404, detail="Publicacion no encontrada")
        _verificar_ownership_post(post, current_user)
        update_data = data.model_dump(exclude_unset=True)
        # ✅ SEGURIDAD (BAJA 11): `estado` con lista blanca y `curso_id` validado
        # (antes el autor podía reabrir un post archivado o moverlo a un curso ajeno).
        if update_data.get("estado") is not None:
            estado_nuevo = str(update_data["estado"]).lower()
            if estado_nuevo not in ESTADOS_POST_VALIDOS:
                raise HTTPException(status_code=400, detail="Estado de publicación inválido")
            update_data["estado"] = estado_nuevo
        if update_data.get("curso_id") and not _docente_puede_gestionar_curso(
            db, update_data["curso_id"], current_user
        ):
            raise HTTPException(status_code=403, detail="No tienes permiso sobre este curso")
        for field, value in update_data.items():
            setattr(post, field, value)
        db.commit()
        db.refresh(post)
        return _post_to_dict(db, post)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=error_interno(e, "Error actualizando post"))


@router.delete("/{id}", response_model=MensajeResponse)
async def eliminar_post(
    id: str,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(["admin", "docente"]))
):
    try:
        post = db.query(Post).filter(Post.id == id).first()
        if not post:
            raise HTTPException(status_code=404, detail="Publicacion no encontrada")
        _verificar_ownership_post(post, current_user)
        db.delete(post)
        db.commit()
        return {"mensaje": "Publicacion eliminada correctamente", "ok": True}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=error_interno(e, "Error eliminando post"))


@router.post("/{id}/comentarios", response_model=ComentarioResponse, status_code=201)
async def crear_comentario(
    id: str,
    data: ComentarioCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(["admin", "docente", "estudiante"]))
):
    try:
        post = db.query(Post).filter(Post.id == id).first()
        if not post:
            raise HTTPException(status_code=404, detail="Publicacion no encontrada")
        # ✅ SEGURIDAD (MEDIA 8): solo se comenta lo que se puede ver
        if not _puede_ver_post(db, post, current_user):
            logger.warning(
                f"Acceso denegado: usuario {current_user.id} intentó comentar la "
                f"publicación {post.id}"
            )
            raise HTTPException(status_code=403, detail="No tienes permiso para comentar esta publicación")
        comentario = Comentario(
            id=str(uuid.uuid4()),
            post_id=id,
            docente_id=str(current_user.id),
            docente_nombre=None,
            contenido=data.contenido,
            likes_count=0
        )
        db.add(comentario)
        post.comentarios_count = (post.comentarios_count or 0) + 1
        db.commit()
        db.refresh(comentario)
        return {
            "id": str(comentario.id),
            "post_id": str(comentario.post_id),
            "docente_id": str(comentario.docente_id),
            "docente_nombre": comentario.docente_nombre,
            "contenido": comentario.contenido,
            "likes_count": comentario.likes_count or 0,
            "created_at": comentario.created_at.isoformat() if comentario.created_at else None,
            "updated_at": comentario.updated_at.isoformat() if comentario.updated_at else None,
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=error_interno(e, "Error creando comentario"))


@router.post("/{id}/like", response_model=LikeResponse)
async def dar_like(
    id: str,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(["admin", "docente", "estudiante"]))
):
    try:
        post = db.query(Post).filter(Post.id == id).first()
        if not post:
            raise HTTPException(status_code=404, detail="Publicacion no encontrada")
        # ✅ SEGURIDAD (MEDIA 4): no se puede reaccionar a lo que no se puede ver
        if not _puede_ver_post(db, post, current_user):
            raise HTTPException(status_code=403, detail="No tienes permiso sobre esta publicación")
        usuario_id = str(current_user.id)
        like_existente = db.query(LikePost).filter(
            LikePost.post_id == id,
            LikePost.docente_id == usuario_id
        ).first()
        if like_existente:
            db.delete(like_existente)
            post.likes_count = max((post.likes_count or 0) - 1, 0)
            db.commit()
            return {"post_id": id, "liked": False, "likes_count": post.likes_count or 0}
        like = LikePost(
            id=str(uuid.uuid4()),
            post_id=id,
            docente_id=usuario_id
        )
        db.add(like)
        post.likes_count = (post.likes_count or 0) + 1
        db.commit()
        return {"post_id": id, "liked": True, "likes_count": post.likes_count or 0}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=error_interno(e, "Error dando like"))