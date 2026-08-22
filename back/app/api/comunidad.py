# app/api/comunidad.py
# ROUTER DE FORO / COMUNIDAD

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
import uuid
import logging

from app.database import get_db
from app.core.dependencies import require_roles, get_current_user_id
from app.models.post import Post, Comentario, LikePost
from app.schemas.post import (
    PostCreate, PostUpdate, PostResponse,
    ComentarioCreate, ComentarioResponse,
    LikeResponse, MensajeResponse
)

logger = logging.getLogger(__name__)
router = APIRouter()

def _post_to_dict(db: Session, post: Post) -> dict:
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
        "vistas_count": post.vistas_count or 0,
        "tags": post.tags or [],
        "created_at": post.created_at.isoformat() if post.created_at else None,
        "updated_at": post.updated_at.isoformat() if post.updated_at else None,
        "comentarios": []
    }


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
        return [_post_to_dict(db, p) for p in posts]
    except Exception as e:
        logger.error(f"Error listando posts: {e}")
        raise HTTPException(status_code=500, detail=str(e))


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
        post.vistas_count = (post.vistas_count or 0) + 1
        db.commit()
        comentarios = db.query(Comentario).filter(Comentario.post_id == id).order_by(Comentario.created_at.asc()).all()
        data = _post_to_dict(db, post)
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
        logger.error(f"Error obteniendo post: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/", response_model=PostResponse, status_code=201)
async def crear_post(
    data: PostCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(["admin", "docente"]))
):
    try:
        post = Post(
            id=str(uuid.uuid4()),
            titulo=data.titulo,
            contenido=data.contenido,
            categoria=data.categoria or "general",
            curso_id=data.curso_id if data.curso_id else None,
            docente_id=data.docente_id or str(current_user.id),
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
    except Exception as e:
        db.rollback()
        logger.error(f"Error creando post: {e}")
        raise HTTPException(status_code=500, detail=str(e))


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
        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(post, field, value)
        db.commit()
        db.refresh(post)
        return _post_to_dict(db, post)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error actualizando post: {e}")
        raise HTTPException(status_code=500, detail=str(e))


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
        db.delete(post)
        db.commit()
        return {"mensaje": "Publicacion eliminada correctamente", "ok": True}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error eliminando post: {e}")
        raise HTTPException(status_code=500, detail=str(e))


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
        comentario = Comentario(
            id=str(uuid.uuid4()),
            post_id=id,
            docente_id=data.docente_id or str(current_user.id),
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
        logger.error(f"Error creando comentario: {e}")
        raise HTTPException(status_code=500, detail=str(e))


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
        logger.error(f"Error dando like: {e}")
        raise HTTPException(status_code=500, detail=str(e))