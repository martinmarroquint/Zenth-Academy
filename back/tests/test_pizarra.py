# back/tests/test_pizarra.py
# =====================================================
# TESTS DE SEGURIDAD: PIZARRA INTERACTIVA
#   - Aislamiento por dueño (ALTA 1)
#   - Sin mass assignment de identidad (ALTA 2)
#   - Sesiones: dueño forzado y cierre autorizado (BAJA 10)
# =====================================================

import pytest

from app.models.pizarra import Pizarra, SesionPizarra


# =====================================================
# HELPERS
# =====================================================

def _crear_pizarra(client, headers, *, titulo="Pizarra de prueba", **extra):
    payload = {"titulo": titulo, **extra}
    resp = client.post("/api/v1/pizarra/", json=payload, headers=headers)
    assert resp.status_code == 201, resp.text
    return resp.json()


def _crear_pizarra_db(db, creado_por, *, titulo="Pizarra directa", es_publica=False):
    import uuid

    pizarra = Pizarra(
        id=str(uuid.uuid4()),
        titulo=titulo,
        descripcion="",
        tipo="blanca",
        estado="ACTIVA",
        creado_por=str(creado_por),
        es_publica=es_publica,
        configuracion={},
        elementos=[],
    )
    db.add(pizarra)
    db.commit()
    db.refresh(pizarra)
    return pizarra


# =====================================================
# 1. AISLAMIENTO POR DUEÑO (ALTA 1)
# =====================================================

@pytest.mark.security
@pytest.mark.integration
def test_estudiante_no_puede_listar_pizarras(client, estudiante_headers):
    resp = client.get("/api/v1/pizarra/", headers=estudiante_headers)
    assert resp.status_code == 403, resp.text


@pytest.mark.security
@pytest.mark.integration
def test_listar_pizarras_solo_las_propias(
    client, docente_headers, otro_docente_headers
):
    _crear_pizarra(client, docente_headers, titulo="Pizarra propia")

    resp_ajeno = client.get("/api/v1/pizarra/", headers=otro_docente_headers)
    assert resp_ajeno.status_code == 200, resp_ajeno.text
    assert "Pizarra propia" not in [p["titulo"] for p in resp_ajeno.json()]

    resp_propio = client.get("/api/v1/pizarra/", headers=docente_headers)
    assert resp_propio.status_code == 200, resp_propio.text
    assert "Pizarra propia" in [p["titulo"] for p in resp_propio.json()]


@pytest.mark.security
@pytest.mark.integration
def test_docente_ajeno_no_obtiene_pizarra(client, docente_headers, otro_docente_headers):
    pizarra = _crear_pizarra(client, docente_headers, titulo="Privada")

    resp = client.get(f"/api/v1/pizarra/{pizarra['id']}", headers=otro_docente_headers)
    assert resp.status_code == 403, resp.text


@pytest.mark.security
@pytest.mark.integration
def test_docente_ajeno_no_edita_elementos(client, docente_headers, otro_docente_headers):
    pizarra = _crear_pizarra(client, docente_headers, titulo="Privada")

    resp = client.post(
        f"/api/v1/pizarra/{pizarra['id']}/elementos",
        json={"elementos": [{"tipo": "intruso"}]},
        headers=otro_docente_headers,
    )
    assert resp.status_code == 403, resp.text


@pytest.mark.security
@pytest.mark.integration
def test_docente_ajeno_no_elimina_pizarra(
    client, db, docente_headers, otro_docente_headers
):
    pizarra = _crear_pizarra(client, docente_headers, titulo="No borrar")

    resp = client.delete(
        f"/api/v1/pizarra/{pizarra['id']}", headers=otro_docente_headers
    )
    assert resp.status_code == 403, resp.text

    db.expire_all()
    assert db.query(Pizarra).filter(Pizarra.id == pizarra["id"]).first() is not None


@pytest.mark.integration
def test_pizarra_publica_es_legible_pero_no_editable(
    client, docente_headers, otro_docente_headers
):
    pizarra = _crear_pizarra(client, docente_headers, titulo="Pública", es_publica=True)

    resp_get = client.get(f"/api/v1/pizarra/{pizarra['id']}", headers=otro_docente_headers)
    assert resp_get.status_code == 200, resp_get.text

    resp_del = client.delete(
        f"/api/v1/pizarra/{pizarra['id']}", headers=otro_docente_headers
    )
    assert resp_del.status_code == 403, resp_del.text


# =====================================================
# 2. SIN MASS ASSIGNMENT DE IDENTIDAD (ALTA 2)
# =====================================================

@pytest.mark.security
@pytest.mark.integration
def test_crear_pizarra_ignora_creado_por_ajeno(
    client, docente_user, otro_docente_user, docente_headers
):
    pizarra = _crear_pizarra(
        client, docente_headers,
        titulo="Suplantación", creado_por=str(otro_docente_user.id),
    )
    assert pizarra["creado_por"] == str(docente_user.id), pizarra


@pytest.mark.security
@pytest.mark.integration
def test_sesion_fuerza_usuario_autenticado_y_rol_valido(
    client, docente_user, otro_docente_user, docente_headers
):
    pizarra = _crear_pizarra(client, docente_headers, titulo="Sesión")

    resp = client.post(
        f"/api/v1/pizarra/{pizarra['id']}/sesion",
        json={"usuario_id": str(otro_docente_user.id), "rol": "ADMIN"},
        headers=docente_headers,
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["usuario_id"] == str(docente_user.id), data
    assert data["rol"] == "EDITOR", data


@pytest.mark.integration
def test_actualizar_pizarra_rechaza_estado_invalido(client, docente_headers):
    pizarra = _crear_pizarra(client, docente_headers, titulo="Estados")

    resp_malo = client.put(
        f"/api/v1/pizarra/{pizarra['id']}",
        json={"estado": "HACKEADO"},
        headers=docente_headers,
    )
    assert resp_malo.status_code == 400, resp_malo.text

    resp_ok = client.put(
        f"/api/v1/pizarra/{pizarra['id']}",
        json={"estado": "CERRADA"},
        headers=docente_headers,
    )
    assert resp_ok.status_code == 200, resp_ok.text
    assert resp_ok.json()["estado"] == "CERRADA"


# =====================================================
# 3. SESIONES (BAJA 10)
# =====================================================

@pytest.mark.security
@pytest.mark.integration
def test_finalizar_sesion_ajena_403(
    client, db, docente_user, docente_headers, otro_docente_headers
):
    pizarra = _crear_pizarra(client, docente_headers, titulo="Sesiones")
    sesion = client.post(
        f"/api/v1/pizarra/{pizarra['id']}/sesion",
        json={},
        headers=docente_headers,
    ).json()

    resp_ajeno = client.put(
        f"/api/v1/pizarra/sesion/{sesion['id']}/finalizar",
        headers=otro_docente_headers,
    )
    assert resp_ajeno.status_code == 403, resp_ajeno.text

    db.expire_all()
    row = db.query(SesionPizarra).filter(SesionPizarra.id == sesion["id"]).first()
    assert row is not None and row.conectado is True

    # El dueño de la sesión sí puede finalizarla
    resp_propio = client.put(
        f"/api/v1/pizarra/sesion/{sesion['id']}/finalizar",
        headers=docente_headers,
    )
    assert resp_propio.status_code == 200, resp_propio.text


@pytest.mark.security
@pytest.mark.integration
def test_sesion_en_pizarra_ajena_privada_403(
    client, db, docente_user, docente_headers, otro_docente_headers
):
    pizarra = _crear_pizarra_db(db, docente_user.id, titulo="Ajena privada")

    resp = client.post(
        f"/api/v1/pizarra/{pizarra.id}/sesion",
        json={},
        headers=otro_docente_headers,
    )
    assert resp.status_code == 403, resp.text
