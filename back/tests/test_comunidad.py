# back/tests/test_comunidad.py
# =====================================================
# TESTS DE SEGURIDAD: FORO / COMUNIDAD
#   - Visibilidad de publicaciones por rol/curso/estado (MEDIA 3, 4, 8)
#   - Sin publicación en cursos ajenos (MEDIA 9)
#   - Sin mass assignment de estado/curso (BAJA 11)
# =====================================================

import uuid

import pytest

from app.models.curso import Curso, InscripcionCurso
from app.models.post import Post


# =====================================================
# HELPERS
# =====================================================

def _crear_curso(db, docente, *, titulo="Curso foro"):
    curso = Curso(
        id=str(uuid.uuid4()),
        titulo=titulo,
        descripcion="",
        categoria="general",
        nivel="principiante",
        docente_id=str(docente.id),
        docente_nombre=docente.nombre_completo,
        precio_tipo="gratis",
        estado="PUBLICADO",
        modulos=[],
        tipo_bloqueo="ninguno",
        bloqueo_config={},
        etiquetas=[],
        requisitos=[],
        objetivos=[],
        certificado_habilitado=True,
        certificado_nota_minima=None,
    )
    db.add(curso)
    db.commit()
    db.refresh(curso)
    return curso


def _inscribir(db, curso, estudiante):
    db.add(InscripcionCurso(
        id=str(uuid.uuid4()),
        curso_id=str(curso.id),
        estudiante_id=str(estudiante.id),
        estudiante_nombre=estudiante.nombre_completo,
        progreso=0,
        completado=False,
        lecciones_completadas=[],
    ))
    db.commit()


def _crear_post_db(db, docente, *, titulo="Post", estado="publicado", curso_id=None):
    post = Post(
        id=str(uuid.uuid4()),
        titulo=titulo,
        contenido="contenido de prueba",
        categoria="general",
        curso_id=str(curso_id) if curso_id else None,
        docente_id=str(docente.id),
        docente_nombre=None,
        destacado=False,
        estado=estado,
        comentarios_count=0,
        likes_count=0,
        vistas_count=0,
        tags=[],
    )
    db.add(post)
    db.commit()
    db.refresh(post)
    return post


# =====================================================
# 1. VISIBILIDAD DE PUBLICACIONES (MEDIA 3 / MEDIA 4)
# =====================================================

@pytest.mark.security
@pytest.mark.integration
def test_estudiante_no_ve_foro_de_curso_ajeno(
    client, db, docente_user, estudiante_headers
):
    curso = _crear_curso(db, docente_user)
    _crear_post_db(db, docente_user, titulo="Del curso ajeno", curso_id=curso.id)

    resp = client.get(
        f"/api/v1/foro/?curso_id={curso.id}", headers=estudiante_headers
    )
    assert resp.status_code == 403, resp.text


@pytest.mark.integration
def test_estudiante_inscrito_ve_foro_de_su_curso(
    client, db, docente_user, estudiante_user, estudiante_headers
):
    curso = _crear_curso(db, docente_user)
    _inscribir(db, curso, estudiante_user)
    _crear_post_db(db, docente_user, titulo="De mi curso", curso_id=curso.id)

    resp = client.get(
        f"/api/v1/foro/?curso_id={curso.id}", headers=estudiante_headers
    )
    assert resp.status_code == 200, resp.text
    assert "De mi curso" in [p["titulo"] for p in resp.json()]


@pytest.mark.integration
def test_estudiante_ve_post_publicado_global(
    client, db, docente_user, estudiante_headers
):
    post = _crear_post_db(db, docente_user, titulo="Global publicado")

    lista = client.get("/api/v1/foro/", headers=estudiante_headers)
    assert lista.status_code == 200, lista.text
    assert "Global publicado" in [p["titulo"] for p in lista.json()]

    detalle = client.get(f"/api/v1/foro/{post.id}", headers=estudiante_headers)
    assert detalle.status_code == 200, detalle.text


@pytest.mark.security
@pytest.mark.integration
def test_estudiante_no_ve_post_archivado(
    client, db, docente_user, docente_headers, estudiante_headers
):
    _crear_post_db(db, docente_user, titulo="Archivado", estado="archivado")

    resp_est = client.get("/api/v1/foro/", headers=estudiante_headers)
    assert resp_est.status_code == 200, resp_est.text
    assert "Archivado" not in [p["titulo"] for p in resp_est.json()]

    # El docente dueño sí lo ve
    resp_doc = client.get("/api/v1/foro/", headers=docente_headers)
    assert resp_doc.status_code == 200, resp_doc.text
    assert "Archivado" in [p["titulo"] for p in resp_doc.json()]


@pytest.mark.security
@pytest.mark.integration
def test_estudiante_no_puede_obtener_post_archivado(
    client, db, docente_user, estudiante_headers
):
    post = _crear_post_db(db, docente_user, titulo="Archivado", estado="archivado")

    resp = client.get(f"/api/v1/foro/{post.id}", headers=estudiante_headers)
    assert resp.status_code == 403, resp.text


# =====================================================
# 2. COMENTARIOS Y LIKES (MEDIA 8)
# =====================================================

@pytest.mark.security
@pytest.mark.integration
def test_estudiante_no_puede_comentar_post_archivado(
    client, db, docente_user, estudiante_headers
):
    post = _crear_post_db(db, docente_user, titulo="Archivado", estado="archivado")

    resp = client.post(
        f"/api/v1/foro/{post.id}/comentarios",
        json={"contenido": "no debería poder"},
        headers=estudiante_headers,
    )
    assert resp.status_code == 403, resp.text


@pytest.mark.security
@pytest.mark.integration
def test_estudiante_no_puede_dar_like_a_post_archivado(
    client, db, docente_user, estudiante_headers
):
    post = _crear_post_db(db, docente_user, titulo="Archivado", estado="archivado")

    resp = client.post(f"/api/v1/foro/{post.id}/like", headers=estudiante_headers)
    assert resp.status_code == 403, resp.text


# =====================================================
# 3. ME GUSTA EN EL FORO
# =====================================================

@pytest.mark.integration
def test_like_toggle_y_liked_by_me(client, db, docente_user, estudiante_headers):
    """✅ El like alterna y el backend dice si YO ya di like."""
    post = _crear_post_db(db, docente_user, titulo="Para likear")

    detalle = client.get(f"/api/v1/foro/{post.id}", headers=estudiante_headers).json()
    assert detalle["likes_count"] == 0
    assert detalle["liked_by_me"] is False

    resp = client.post(f"/api/v1/foro/{post.id}/like", headers=estudiante_headers)
    assert resp.status_code == 200, resp.text
    assert resp.json()["liked"] is True
    assert resp.json()["likes_count"] == 1

    detalle2 = client.get(f"/api/v1/foro/{post.id}", headers=estudiante_headers).json()
    assert detalle2["likes_count"] == 1
    assert detalle2["liked_by_me"] is True

    listado = client.get("/api/v1/foro/", headers=estudiante_headers).json()
    fila = [p for p in listado if p["id"] == str(post.id)][0]
    assert fila["likes_count"] == 1
    assert fila["liked_by_me"] is True

    # Quitar el me gusta
    resp2 = client.post(f"/api/v1/foro/{post.id}/like", headers=estudiante_headers)
    assert resp2.status_code == 200, resp2.text
    assert resp2.json()["liked"] is False
    assert resp2.json()["likes_count"] == 0

    detalle3 = client.get(f"/api/v1/foro/{post.id}", headers=estudiante_headers).json()
    assert detalle3["liked_by_me"] is False


@pytest.mark.integration
def test_liked_by_me_es_por_usuario(
    client, db, docente_user, docente_headers, estudiante_headers
):
    """El like de otra persona suma al contador pero no marca el mío."""
    post = _crear_post_db(db, docente_user, titulo="Compartido")

    client.post(f"/api/v1/foro/{post.id}/like", headers=docente_headers)

    detalle = client.get(f"/api/v1/foro/{post.id}", headers=estudiante_headers).json()
    assert detalle["likes_count"] == 1
    assert detalle["liked_by_me"] is False

    # El docente sí ve su propio like
    detalle_doc = client.get(f"/api/v1/foro/{post.id}", headers=docente_headers).json()
    assert detalle_doc["liked_by_me"] is True


# =====================================================
# 4. PUBLICAR EN CURSOS AJENOS (MEDIA 9 / BAJA 11)
# =====================================================

@pytest.mark.security
@pytest.mark.integration
def test_docente_no_publica_en_curso_ajeno_403(
    client, db, docente_user, otro_docente_headers
):
    curso = _crear_curso(db, docente_user)

    resp = client.post(
        "/api/v1/foro/",
        json={"titulo": "Intruso", "contenido": "x", "curso_id": str(curso.id)},
        headers=otro_docente_headers,
    )
    assert resp.status_code == 403, resp.text


@pytest.mark.integration
def test_docente_publica_en_su_curso_201(client, db, docente_user, docente_headers):
    curso = _crear_curso(db, docente_user)

    resp = client.post(
        "/api/v1/foro/",
        json={"titulo": "Propio", "contenido": "x", "curso_id": str(curso.id)},
        headers=docente_headers,
    )
    assert resp.status_code == 201, resp.text


@pytest.mark.security
@pytest.mark.integration
def test_docente_no_mueve_post_a_curso_ajeno_403(
    client, db, docente_user, docente_headers, otro_docente_user
):
    curso_ajeno = _crear_curso(db, otro_docente_user, titulo="Curso ajeno")
    post = _crear_post_db(db, docente_user, titulo="Mío")

    resp = client.put(
        f"/api/v1/foro/{post.id}",
        json={"curso_id": str(curso_ajeno.id)},
        headers=docente_headers,
    )
    assert resp.status_code == 403, resp.text


@pytest.mark.integration
def test_actualizar_post_rechaza_estado_invalido(client, db, docente_user, docente_headers):
    post = _crear_post_db(db, docente_user, titulo="Estados")

    resp_malo = client.put(
        f"/api/v1/foro/{post.id}",
        json={"estado": "HACKEADO"},
        headers=docente_headers,
    )
    assert resp_malo.status_code == 400, resp_malo.text

    resp_ok = client.put(
        f"/api/v1/foro/{post.id}",
        json={"estado": "archivado"},
        headers=docente_headers,
    )
    assert resp_ok.status_code == 200, resp_ok.text
    assert resp_ok.json()["estado"] == "archivado"
