# back/tests/test_solicitudes_docente.py
# =====================================================
# TESTS DE SOLICITUDES DE DOCENTE (validación por el admin)
#   - El front manda SOLO el comentario: no debe romper (antes daba 422)
#   - Al aprobar, el usuario CAMBIA de rol a docente (antes un refresh previo
#     al commit descartaba el cambio)
# =====================================================

import pytest

from app.models.usuario import Usuario


# =====================================================
# HELPERS
# =====================================================

def _crear_solicitud(client, estudiante_headers, *, especialidad="Matemática"):
    resp = client.post(
        "/api/v1/solicitudes-docente/",
        json={
            "especialidad": especialidad,
            "institucion": "Colegio X",
            "motivacion": "Quiero enseñar",
        },
        headers=estudiante_headers,
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


def _rol_en_bd(db, usuario_id) -> str:
    db.expire_all()
    return db.query(Usuario).filter(Usuario.id == str(usuario_id)).first().rol


# =====================================================
# 1. CREACIÓN Y LISTADO
# =====================================================

@pytest.mark.integration
def test_estudiante_crea_solicitud(client, estudiante_headers):
    data = _crear_solicitud(client, estudiante_headers)

    assert data["estado"] == "pendiente"
    assert data["especialidad"] == "Matemática"
    assert data["usuario_nombre"]


@pytest.mark.integration
def test_admin_lista_y_cuenta_pendientes(client, admin_headers, estudiante_headers):
    _crear_solicitud(client, estudiante_headers)

    listado = client.get("/api/v1/solicitudes-docente/", headers=admin_headers)
    assert listado.status_code == 200, listado.text
    assert listado.json()["total"] == 1
    assert listado.json()["solicitudes"][0]["usuario_email"]

    conteo = client.get(
        "/api/v1/solicitudes-docente/pendientes/count", headers=admin_headers
    )
    assert conteo.status_code == 200, conteo.text
    assert conteo.json()["pendientes"] == 1


# =====================================================
# 2. APROBAR: EL ROL CAMBIA DE VERDAD
# =====================================================

@pytest.mark.integration
def test_aprobar_solicitud_cambia_el_rol(
    client, db, admin_headers, estudiante_user, estudiante_headers
):
    """✅ El admin aprueba mandando SOLO el comentario (como el front)."""
    solicitud = _crear_solicitud(client, estudiante_headers)

    resp = client.post(
        f"/api/v1/solicitudes-docente/{solicitud['id']}/aprobar",
        json={"comentario_admin": "Bienvenido"},
        headers=admin_headers,
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["estado"] == "aprobado"
    assert data["comentario_admin"] == "Bienvenido"

    # ✅ El usuario pasó a docente en la base
    assert _rol_en_bd(db, estudiante_user.id) == "docente"


@pytest.mark.integration
def test_aprobar_sin_body(
    client, db, admin_headers, estudiante_user, estudiante_headers
):
    solicitud = _crear_solicitud(client, estudiante_headers)

    resp = client.post(
        f"/api/v1/solicitudes-docente/{solicitud['id']}/aprobar",
        headers=admin_headers,
    )
    assert resp.status_code == 200, resp.text
    assert _rol_en_bd(db, estudiante_user.id) == "docente"


@pytest.mark.integration
def test_aprobar_guarda_especialidad_e_institucion(
    client, db, admin_headers, estudiante_user, estudiante_headers
):
    solicitud = _crear_solicitud(client, estudiante_headers)
    client.post(
        f"/api/v1/solicitudes-docente/{solicitud['id']}/aprobar",
        json={},
        headers=admin_headers,
    )

    db.expire_all()
    usuario = db.query(Usuario).filter(Usuario.id == str(estudiante_user.id)).first()
    assert usuario.especialidad == "Matemática"
    assert usuario.institucion == "Colegio X"


# =====================================================
# 3. RECHAZAR Y ESTADOS
# =====================================================

@pytest.mark.integration
def test_rechazar_no_cambia_el_rol(
    client, db, admin_headers, estudiante_user, estudiante_headers
):
    solicitud = _crear_solicitud(client, estudiante_headers)

    resp = client.post(
        f"/api/v1/solicitudes-docente/{solicitud['id']}/rechazar",
        json={"comentario_admin": "Falta documentación"},
        headers=admin_headers,
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["estado"] == "rechazado"
    assert _rol_en_bd(db, estudiante_user.id) == "estudiante"


@pytest.mark.integration
def test_marcar_en_revision(client, admin_headers, estudiante_headers):
    solicitud = _crear_solicitud(client, estudiante_headers)

    resp = client.post(
        f"/api/v1/solicitudes-docente/{solicitud['id']}/en-revision",
        headers=admin_headers,
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["estado"] == "en_revision"


@pytest.mark.integration
def test_solicitud_ya_procesada_400(client, admin_headers, estudiante_headers):
    solicitud = _crear_solicitud(client, estudiante_headers)
    client.post(
        f"/api/v1/solicitudes-docente/{solicitud['id']}/aprobar",
        json={},
        headers=admin_headers,
    )

    resp = client.post(
        f"/api/v1/solicitudes-docente/{solicitud['id']}/aprobar",
        json={},
        headers=admin_headers,
    )
    assert resp.status_code == 400, resp.text


# =====================================================
# 4. PERMISOS
# =====================================================

@pytest.mark.security
@pytest.mark.integration
def test_solo_admin_gestiona_solicitudes(client, estudiante_headers):
    solicitud = _crear_solicitud(client, estudiante_headers)

    assert client.get(
        "/api/v1/solicitudes-docente/", headers=estudiante_headers
    ).status_code == 403
    assert client.post(
        f"/api/v1/solicitudes-docente/{solicitud['id']}/aprobar",
        json={},
        headers=estudiante_headers,
    ).status_code == 403


@pytest.mark.integration
def test_estudiante_duplicado_400(client, estudiante_headers):
    _crear_solicitud(client, estudiante_headers)

    resp = client.post(
        "/api/v1/solicitudes-docente/",
        json={"especialidad": "Física"},
        headers=estudiante_headers,
    )
    assert resp.status_code == 400, resp.text
