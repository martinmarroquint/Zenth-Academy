# back/tests/test_comentarios_leccion.py
# Tests de integración para comentarios por lección:
# acceso (docente/admin vs estudiante), CRUD, likes y limpieza al borrar curso.

import uuid
from datetime import datetime, timezone

import pytest

from app.models.curso import AccesoCurso, Curso
from app.models.comentario_leccion import ComentarioLeccion, LikeComentarioLeccion

MODULOS_2_LECCIONES = [
    {
        "id": "m1",
        "titulo": "Módulo 1",
        "lecciones": [
            {"id": "l1", "titulo": "Lección 1", "tipo": "texto"},
            {"id": "l2", "titulo": "Lección 2", "tipo": "texto"},
        ],
    }
]


def _crear_curso(db, docente, *, precio_tipo="gratis", modulos=None):
    curso = Curso(
        id=str(uuid.uuid4()),
        titulo="Curso de comentarios",
        descripcion="Curso generado en tests",
        categoria="general",
        nivel="principiante",
        docente_id=str(docente.id),
        docente_nombre=docente.nombre_completo,
        precio_tipo=precio_tipo,
        moneda="PEN",
        estado="PUBLICADO",
        modulos=modulos if modulos is not None else MODULOS_2_LECCIONES,
        tipo_bloqueo="ninguno",
        bloqueo_config={},
        estudiantes_count=0,
        rating=0,
        rating_count=0,
        etiquetas=[],
        requisitos=[],
        objetivos=[],
    )
    db.add(curso)
    db.commit()
    db.refresh(curso)
    return curso


def _dar_acceso(db, curso, estudiante):
    acceso = AccesoCurso(
        id=str(uuid.uuid4()),
        curso_id=str(curso.id),
        estudiante_id=str(estudiante.id),
        estudiante_nombre=estudiante.nombre_completo,
        activo=True,
        tipo_acceso="vitalicio",
        fecha_inicio=datetime.now(timezone.utc),
    )
    db.add(acceso)
    db.commit()
    return acceso


def _crear_estudiante_extra(db, email="otro.estudiante@zenth.test"):
    """Crea un segundo estudiante y devuelve (usuario, headers)."""
    from app.models.usuario import Usuario
    from app.core.security import create_access_token

    user = Usuario(
        id=str(uuid.uuid4()),
        email=email,
        nombres="Otro",
        apellidos="Estudiante",
        rol="estudiante",
        empresa_id="test-empresa",
        activo=True,
        email_verificado=True,
        fecha_registro=datetime.now(timezone.utc),
    )
    user.set_password("Test1234!")
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_access_token({"sub": str(user.id), "rol": user.rol})
    return user, {"Authorization": f"Bearer {token}"}


def _url(curso_id, leccion_id, comentario_id=None, like=False):
    base = f"/api/v1/cursos/{curso_id}/lecciones/{leccion_id}/comentarios"
    if comentario_id:
        base += f"/{comentario_id}"
    if like:
        base += "/like"
    return base


# =============================================
# ACCESO
# =============================================

@pytest.mark.integration
def test_docente_del_curso_puede_comentar_sin_acceso(client, db, docente_user, docente_headers):
    curso = _crear_curso(db, docente_user)

    resp = client.post(_url(curso.id, "l1"), json={"contenido": "Hola desde el docente"}, headers=docente_headers)

    assert resp.status_code == 201, resp.text
    data = resp.json()
    assert data["contenido"] == "Hola desde el docente"
    assert data["usuario_rol"] == "docente"
    assert data["es_mio"] is True
    assert data["puede_eliminar"] is True


@pytest.mark.integration
def test_estudiante_sin_acceso_no_puede_listar(client, db, docente_user, estudiante_headers):
    curso = _crear_curso(db, docente_user, precio_tipo="pago")

    resp = client.get(_url(curso.id, "l1"), headers=estudiante_headers)

    assert resp.status_code == 403, resp.text


@pytest.mark.integration
def test_estudiante_con_acceso_puede_comentar_y_listar(client, db, docente_user, estudiante_user, estudiante_headers):
    curso = _crear_curso(db, docente_user)
    _dar_acceso(db, curso, estudiante_user)

    created = client.post(_url(curso.id, "l1"), json={"contenido": "Mi comentario"}, headers=estudiante_headers)
    assert created.status_code == 201, created.text
    assert created.json()["usuario_rol"] == "estudiante"

    listed = client.get(_url(curso.id, "l1"), headers=estudiante_headers)
    assert listed.status_code == 200, listed.text
    items = listed.json()
    assert len(items) == 1
    assert items[0]["contenido"] == "Mi comentario"
    assert items[0]["es_mio"] is True
    assert items[0]["puede_eliminar"] is True
    assert items[0]["liked_by_me"] is False


# =============================================
# VALIDACIONES
# =============================================

@pytest.mark.integration
def test_curso_inexistente_devuelve_404(client, docente_headers):
    resp = client.get(_url("no-existe", "l1"), headers=docente_headers)
    assert resp.status_code == 404, resp.text


@pytest.mark.integration
def test_leccion_inexistente_devuelve_404(client, db, docente_user, docente_headers):
    curso = _crear_curso(db, docente_user)

    resp = client.post(_url(curso.id, "l-no-existe"), json={"contenido": "x"}, headers=docente_headers)
    assert resp.status_code == 404, resp.text


@pytest.mark.integration
def test_contenido_solo_espacios_devuelve_400(client, db, docente_user, docente_headers):
    curso = _crear_curso(db, docente_user)

    resp = client.post(_url(curso.id, "l1"), json={"contenido": "   "}, headers=docente_headers)
    assert resp.status_code == 400, resp.text


# =============================================
# ELIMINACIÓN / AUTORIZACIÓN
# =============================================

@pytest.mark.integration
def test_autor_puede_eliminar_su_comentario(client, db, docente_user, estudiante_user, estudiante_headers):
    curso = _crear_curso(db, docente_user)
    _dar_acceso(db, curso, estudiante_user)

    comentario = client.post(_url(curso.id, "l1"), json={"contenido": "borrar"}, headers=estudiante_headers).json()

    resp = client.delete(_url(curso.id, "l1", comentario["id"]), headers=estudiante_headers)
    assert resp.status_code == 200, resp.text

    listed = client.get(_url(curso.id, "l1"), headers=estudiante_headers).json()
    assert listed == []


@pytest.mark.integration
def test_otro_estudiante_no_puede_eliminar(client, db, docente_user, estudiante_user, estudiante_headers):
    curso = _crear_curso(db, docente_user)
    _dar_acceso(db, curso, estudiante_user)

    comentario = client.post(_url(curso.id, "l1"), json={"contenido": "ajeno"}, headers=estudiante_headers).json()

    otro_user, otro_headers = _crear_estudiante_extra(db)
    # Aun con acceso al curso, un tercero no puede borrar el comentario de otro.
    _dar_acceso(db, curso, otro_user)

    resp = client.delete(_url(curso.id, "l1", comentario["id"]), headers=otro_headers)
    assert resp.status_code == 403, resp.text


@pytest.mark.integration
def test_docente_dueno_puede_eliminar_comentario_de_estudiante(
    client, db, docente_user, docente_headers, estudiante_user, estudiante_headers
):
    curso = _crear_curso(db, docente_user)
    _dar_acceso(db, curso, estudiante_user)

    comentario = client.post(_url(curso.id, "l1"), json={"contenido": "moderar"}, headers=estudiante_headers).json()

    resp = client.delete(_url(curso.id, "l1", comentario["id"]), headers=docente_headers)
    assert resp.status_code == 200, resp.text


@pytest.mark.integration
def test_admin_puede_eliminar_cualquier_comentario(
    client, db, docente_user, admin_headers, estudiante_user, estudiante_headers
):
    curso = _crear_curso(db, docente_user)
    _dar_acceso(db, curso, estudiante_user)

    comentario = client.post(_url(curso.id, "l1"), json={"contenido": "admin"}, headers=estudiante_headers).json()

    resp = client.delete(_url(curso.id, "l1", comentario["id"]), headers=admin_headers)
    assert resp.status_code == 200, resp.text


# =============================================
# LIKES
# =============================================

@pytest.mark.integration
def test_like_toggle(client, db, docente_user, estudiante_user, estudiante_headers):
    curso = _crear_curso(db, docente_user)
    _dar_acceso(db, curso, estudiante_user)

    comentario = client.post(_url(curso.id, "l1"), json={"contenido": "likeame"}, headers=estudiante_headers).json()
    cid = comentario["id"]

    like = client.post(_url(curso.id, "l1", cid, like=True), headers=estudiante_headers)
    assert like.status_code == 200, like.text
    assert like.json() == {"comentario_id": cid, "liked": True, "likes_count": 1}

    listed = client.get(_url(curso.id, "l1"), headers=estudiante_headers).json()
    assert listed[0]["liked_by_me"] is True
    assert listed[0]["likes_count"] == 1

    unlike = client.post(_url(curso.id, "l1", cid, like=True), headers=estudiante_headers)
    assert unlike.json() == {"comentario_id": cid, "liked": False, "likes_count": 0}


# =============================================
# LIMPIEZA AL ELIMINAR CURSO
# =============================================

@pytest.mark.integration
def test_eliminar_curso_limpia_comentarios_y_likes(client, db, docente_user, docente_headers, estudiante_user, estudiante_headers):
    curso = _crear_curso(db, docente_user)
    _dar_acceso(db, curso, estudiante_user)

    comentario = client.post(_url(curso.id, "l1"), json={"contenido": "se va"}, headers=estudiante_headers).json()
    client.post(_url(curso.id, "l1", comentario["id"], like=True), headers=estudiante_headers)

    assert db.query(ComentarioLeccion).count() == 1
    assert db.query(LikeComentarioLeccion).count() == 1

    resp = client.delete(f"/api/v1/cursos/{curso.id}", headers=docente_headers)
    assert resp.status_code == 200, resp.text

    assert db.query(ComentarioLeccion).count() == 0
    assert db.query(LikeComentarioLeccion).count() == 0
