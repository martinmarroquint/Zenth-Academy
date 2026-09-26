# back/tests/test_biblioteca.py
# =====================================================
# TESTS DE LA BIBLIOTECA INDEPENDIENTE
#   - Abierta para todos los alumnos (sin cursos ni inscripciones)
#   - Docentes publican recursos y tareas; solo el autor gestiona lo suyo
#   - Favoritos, completados y link público por token
# =====================================================

from datetime import datetime, timedelta, timezone

import pytest

from app.models.biblioteca import RecursoBiblioteca, BibliotecaInteraccion


# =====================================================
# HELPERS
# =====================================================

def _crear_recurso(client, headers, *, titulo="Recurso de prueba", **extra):
    payload = {"titulo": titulo, **extra}
    resp = client.post("/api/v1/biblioteca/", json=payload, headers=headers)
    assert resp.status_code == 201, resp.text
    return resp.json()


def _listar(client, headers, **params):
    resp = client.get("/api/v1/biblioteca/", params=params, headers=headers)
    assert resp.status_code == 200, resp.text
    return resp.json()


# =====================================================
# 1. BIBLIOTECA ABIERTA (independiente de cursos)
# =====================================================

@pytest.mark.integration
def test_estudiante_ve_la_biblioteca_sin_cursos(client, docente_headers, estudiante_headers):
    """✅ Cualquier alumno ve los recursos publicados sin estar inscrito en nada."""
    _crear_recurso(client, docente_headers, titulo="Álgebra básica", tipo="libro")

    recursos = _listar(client, estudiante_headers)
    assert "Álgebra básica" in [r["titulo"] for r in recursos]


@pytest.mark.integration
def test_estudiante_puede_ver_el_detalle(client, docente_headers, estudiante_headers):
    recurso = _crear_recurso(client, docente_headers, titulo="Artículo de historia")

    resp = client.get(f"/api/v1/biblioteca/{recurso['id']}", headers=estudiante_headers)
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["titulo"] == "Artículo de historia"
    assert data["es_autor"] is False
    assert data["visitas"] >= 1


@pytest.mark.integration
def test_busqueda_y_filtros(client, docente_headers, estudiante_headers):
    _crear_recurso(client, docente_headers, titulo="Cálculo diferencial", tema="Matemática", tipo="libro")
    _crear_recurso(client, docente_headers, titulo="Biología celular", tema="Ciencias", tipo="video")

    por_texto = _listar(client, estudiante_headers, q="Cálculo")
    assert [r["titulo"] for r in por_texto] == ["Cálculo diferencial"]

    por_tipo = _listar(client, estudiante_headers, tipo="video")
    assert [r["titulo"] for r in por_tipo] == ["Biología celular"]

    por_tema = _listar(client, estudiante_headers, tema="matemática")
    assert [r["titulo"] for r in por_tema] == ["Cálculo diferencial"]

    temas = client.get("/api/v1/biblioteca/temas", headers=estudiante_headers)
    assert temas.status_code == 200, temas.text
    assert {t["tema"] for t in temas.json()} == {"Matemática", "Ciencias"}


# =====================================================
# 2. PERMISOS DE PUBLICACIÓN
# =====================================================

@pytest.mark.security
@pytest.mark.integration
def test_estudiante_no_puede_publicar(client, estudiante_headers):
    resp = client.post(
        "/api/v1/biblioteca/",
        json={"titulo": "Intruso", "tipo": "articulo"},
        headers=estudiante_headers,
    )
    assert resp.status_code == 403, resp.text


@pytest.mark.security
@pytest.mark.integration
def test_docente_ajeno_no_edita_ni_borra(client, docente_headers, otro_docente_headers):
    recurso = _crear_recurso(client, docente_headers, titulo="Mío")

    resp_put = client.put(
        f"/api/v1/biblioteca/{recurso['id']}",
        json={"titulo": "Hackeado"},
        headers=otro_docente_headers,
    )
    assert resp_put.status_code == 403, resp_put.text

    resp_del = client.delete(
        f"/api/v1/biblioteca/{recurso['id']}", headers=otro_docente_headers
    )
    assert resp_del.status_code == 403, resp_del.text


@pytest.mark.integration
def test_autor_edita_y_despublica(client, docente_headers, estudiante_headers):
    recurso = _crear_recurso(client, docente_headers, titulo="Original")

    editado = client.put(
        f"/api/v1/biblioteca/{recurso['id']}",
        json={"titulo": "Actualizado", "tema": "Historia"},
        headers=docente_headers,
    )
    assert editado.status_code == 200, editado.text
    assert editado.json()["titulo"] == "Actualizado"

    borrado = client.delete(
        f"/api/v1/biblioteca/{recurso['id']}", headers=docente_headers
    )
    assert borrado.status_code == 200, borrado.text

    # Ya no aparece en el listado del alumno
    assert "Actualizado" not in [r["titulo"] for r in _listar(client, estudiante_headers)]


@pytest.mark.security
@pytest.mark.integration
def test_tipo_invalido_400(client, docente_headers):
    resp = client.post(
        "/api/v1/biblioteca/",
        json={"titulo": "Raro", "tipo": "no-existe"},
        headers=docente_headers,
    )
    assert resp.status_code == 400, resp.text


# =====================================================
# 3. TAREAS (fecha límite + completados)
# =====================================================

@pytest.mark.integration
def test_tarea_con_fecha_limite_y_completados(
    client, docente_headers, estudiante_headers
):
    limite = (datetime.now(timezone.utc) + timedelta(days=3)).isoformat()
    tarea = _crear_recurso(
        client, docente_headers,
        titulo="Leer capítulo 3", tipo="tarea", fecha_limite=limite,
        descripcion="Resumir en 10 líneas",
    )
    assert tarea["tipo"] == "tarea"
    assert tarea["fecha_limite"]
    assert tarea["vencida"] is False

    # El alumno la marca como completada con un comentario
    resp = client.post(
        f"/api/v1/biblioteca/{tarea['id']}/completar",
        json={"comentario": "Listo, profe"},
        headers=estudiante_headers,
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["activo"] is True
    assert data["completados_count"] == 1

    # El docente (autor) ve quién la completó
    completados = client.get(
        f"/api/v1/biblioteca/{tarea['id']}/completados", headers=docente_headers
    )
    assert completados.status_code == 200, completados.text
    filas = completados.json()
    assert len(filas) == 1
    assert filas[0]["comentario"] == "Listo, profe"

    # El alumno ve su estado en el listado
    listado = _listar(client, estudiante_headers, tipo="tarea")
    assert listado[0]["completado"] is True
    assert listado[0]["completados_count"] == 1


@pytest.mark.security
@pytest.mark.integration
def test_completados_solo_para_el_autor(
    client, docente_headers, otro_docente_headers
):
    tarea = _crear_recurso(client, docente_headers, titulo="Tarea", tipo="tarea")

    resp = client.get(
        f"/api/v1/biblioteca/{tarea['id']}/completados", headers=otro_docente_headers
    )
    assert resp.status_code == 403, resp.text


@pytest.mark.integration
def test_fecha_limite_solo_en_tareas(client, docente_headers):
    """Un recurso que no es tarea no conserva fecha límite."""
    recurso = _crear_recurso(
        client, docente_headers,
        titulo="Artículo", tipo="articulo",
        fecha_limite=(datetime.now(timezone.utc) + timedelta(days=1)).isoformat(),
    )
    assert recurso["fecha_limite"] is None


# =====================================================
# 4. FAVORITOS
# =====================================================

@pytest.mark.integration
def test_favoritos_toggle(client, docente_headers, estudiante_headers):
    recurso = _crear_recurso(client, docente_headers, titulo="Favorito")

    marcar = client.post(
        f"/api/v1/biblioteca/{recurso['id']}/favorito", headers=estudiante_headers
    )
    assert marcar.status_code == 200, marcar.text
    assert marcar.json()["activo"] is True

    solo_favoritos = _listar(client, estudiante_headers, favoritos=True)
    assert [r["titulo"] for r in solo_favoritos] == ["Favorito"]
    assert solo_favoritos[0]["favorito"] is True

    desmarcar = client.post(
        f"/api/v1/biblioteca/{recurso['id']}/favorito", headers=estudiante_headers
    )
    assert desmarcar.json()["activo"] is False
    assert _listar(client, estudiante_headers, favoritos=True) == []


# =====================================================
# 5. LINK PÚBLICO POR TOKEN (sin login)
# =====================================================

@pytest.mark.integration
def test_link_publico_por_token(client, docente_headers):
    recurso = _crear_recurso(
        client, docente_headers, titulo="Compartible", tipo="libro",
        url="https://example.com/libro.pdf", tema="Matemática",
    )

    resp = client.get(f"/api/v1/biblioteca/publico/{recurso['token']}")
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["titulo"] == "Compartible"
    assert data["autor_nombre"] is not None
    # ✅ No expone IDs internos ni datos de usuarios
    assert "id" not in data
    assert "autor_id" not in data
    assert "token" not in data


@pytest.mark.security
@pytest.mark.integration
def test_link_publico_token_invalido_404(client):
    resp = client.get("/api/v1/biblioteca/publico/token-que-no-existe")
    assert resp.status_code == 404, resp.text
