# back/tests/test_grupos.py
# =====================================================
# TESTS DE INTEGRACIÓN: GRUPOS (dentro del router de exámenes)
#   - CRUD de grupos
#   - Guardado de asistencia
#   - Recursos de grupo
# =====================================================

import uuid

import pytest

from app.models.alumno import Alumno
from app.models.grupo import Grupo
from app.models.material_compartido import MaterialCompartido


# =====================================================
# HELPERS
# =====================================================

def _crear_grupo(db, docente, *, nombre="Grupo de prueba", alumnos=None, asistencias=None, recursos=None):
    grupo = Grupo(
        id=str(uuid.uuid4()),
        nombre=nombre,
        docente_id=str(docente.id) if docente else "default",
        alumnos=alumnos if alumnos is not None else [],
        asistencias=asistencias if asistencias is not None else [],
        recursos=recursos if recursos is not None else [],
        compartir_con_todos=True,
    )
    db.add(grupo)
    db.commit()
    db.refresh(grupo)
    return grupo


# =====================================================
# 1. CRUD
# =====================================================

@pytest.mark.integration
def test_docente_crea_grupo_201(client, docente_user, docente_headers):
    payload = {"nombre": "Sección A", "docente_id": str(docente_user.id)}

    resp = client.post("/api/v1/examenes/grupos", json=payload, headers=docente_headers)

    assert resp.status_code == 201, resp.text
    data = resp.json()
    assert data["nombre"] == "Sección A"
    assert data["docente_id"] == str(docente_user.id)


@pytest.mark.security
@pytest.mark.integration
def test_estudiante_no_puede_crear_grupo(client, estudiante_headers):
    resp = client.post(
        "/api/v1/examenes/grupos",
        json={"nombre": "Grupo del estudiante"},
        headers=estudiante_headers,
    )
    assert resp.status_code == 403, resp.text


@pytest.mark.integration
def test_listar_grupos(client, db, docente_user, docente_headers):
    _crear_grupo(db, docente_user, nombre="Grupo A")
    _crear_grupo(db, docente_user, nombre="Grupo B")

    resp = client.get("/api/v1/examenes/grupos", headers=docente_headers)

    assert resp.status_code == 200, resp.text
    nombres = [g["nombre"] for g in resp.json()]
    assert "Grupo A" in nombres
    assert "Grupo B" in nombres


@pytest.mark.integration
def test_obtener_grupo(client, db, docente_user, docente_headers):
    grupo = _crear_grupo(db, docente_user, nombre="Grupo único")

    resp = client.get(
        f"/api/v1/examenes/grupos/{grupo.id}", headers=docente_headers
    )

    assert resp.status_code == 200, resp.text
    assert resp.json()["id"] == str(grupo.id)
    assert resp.json()["nombre"] == "Grupo único"


@pytest.mark.integration
def test_obtener_grupo_inexistente_404(client, docente_headers):
    resp = client.get("/api/v1/examenes/grupos/no-existe", headers=docente_headers)
    assert resp.status_code == 404, resp.text


@pytest.mark.integration
def test_actualizar_grupo(client, db, docente_user, docente_headers):
    grupo = _crear_grupo(db, docente_user, nombre="Nombre viejo")

    resp = client.put(
        f"/api/v1/examenes/grupos/{grupo.id}",
        json={"nombre": "Nombre nuevo", "compartir_con_todos": False},
        headers=docente_headers,
    )

    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["nombre"] == "Nombre nuevo"
    assert data["compartir_con_todos"] is False


@pytest.mark.integration
def test_eliminar_grupo(client, db, docente_user, docente_headers):
    grupo = _crear_grupo(db, docente_user)

    resp = client.delete(
        f"/api/v1/examenes/grupos/{grupo.id}", headers=docente_headers
    )

    assert resp.status_code == 200, resp.text
    assert resp.json()["ok"] is True

    db.expire_all()
    assert db.query(Grupo).filter(Grupo.id == grupo.id).first() is None


@pytest.mark.integration
def test_crear_grupo_sin_docente_id_asigna_usuario_actual(client, docente_user, docente_headers):
    resp = client.post(
        "/api/v1/examenes/grupos",
        json={"nombre": "Grupo sin docente explícito"},
        headers=docente_headers,
    )

    assert resp.status_code == 201, resp.text
    assert resp.json()["docente_id"] == str(docente_user.id)


@pytest.mark.security
@pytest.mark.integration
def test_docente_ajeno_no_puede_actualizar_grupo(
    client, db, docente_user, otro_docente_headers
):
    grupo = _crear_grupo(db, docente_user, nombre="Original")

    resp = client.put(
        f"/api/v1/examenes/grupos/{grupo.id}",
        json={"nombre": "Hackeado"},
        headers=otro_docente_headers,
    )

    assert resp.status_code == 403, resp.text


@pytest.mark.security
@pytest.mark.integration
def test_docente_ajeno_no_puede_eliminar_grupo(
    client, db, docente_user, otro_docente_headers
):
    grupo = _crear_grupo(db, docente_user)

    resp = client.delete(
        f"/api/v1/examenes/grupos/{grupo.id}", headers=otro_docente_headers
    )

    assert resp.status_code == 403, resp.text


# =====================================================
# 2. ASISTENCIA
# =====================================================

@pytest.mark.integration
def test_guardar_asistencia(client, db, docente_user, docente_headers):
    grupo = _crear_grupo(db, docente_user)
    payload = [
        {"alumno_id": "a1", "fecha": "2026-01-01", "presente": True},
        {"alumno_id": "a2", "fecha": "2026-01-01", "presente": False},
    ]

    resp = client.post(
        f"/api/v1/examenes/grupos/{grupo.id}/asistencia",
        json=payload,
        headers=docente_headers,
    )

    assert resp.status_code == 200, resp.text
    assert resp.json()["ok"] is True

    db.expire_all()
    actualizado = db.query(Grupo).filter(Grupo.id == grupo.id).first()
    assert len(actualizado.asistencias) == 2
    assert {a["alumno_id"] for a in actualizado.asistencias} == {"a1", "a2"}


@pytest.mark.integration
def test_guardar_asistencia_grupo_inexistente_404(client, docente_headers):
    resp = client.post(
        "/api/v1/examenes/grupos/no-existe/asistencia",
        json=[{"alumno_id": "a1", "fecha": "2026-01-01", "presente": True}],
        headers=docente_headers,
    )
    assert resp.status_code == 404, resp.text


# =====================================================
# 3. RECURSOS
# =====================================================

@pytest.mark.integration
def test_agregar_recurso_a_grupo(client, db, docente_user, docente_headers):
    grupo = _crear_grupo(db, docente_user)

    resp = client.post(
        f"/api/v1/examenes/grupos/{grupo.id}/recursos",
        json={
            "tipo": "link",
            "nombre": "Guía de estudio",
            "descripcion": "PDF de repaso",
            "url": "https://example.com/guia.pdf",
        },
        headers=docente_headers,
    )

    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["ok"] is True
    assert data["recurso"]["nombre"] == "Guía de estudio"
    assert data["recurso"]["url"] == "https://example.com/guia.pdf"

    material = db.query(MaterialCompartido).filter(
        MaterialCompartido.grupo_id == str(grupo.id)
    ).first()
    assert material is not None


@pytest.mark.integration
def test_listar_recursos_de_grupo(client, db, docente_user, docente_headers):
    grupo = _crear_grupo(db, docente_user)
    client.post(
        f"/api/v1/examenes/grupos/{grupo.id}/recursos",
        json={"tipo": "link", "nombre": "Recurso 1", "url": "https://example.com/1"},
        headers=docente_headers,
    )
    client.post(
        f"/api/v1/examenes/grupos/{grupo.id}/recursos",
        json={"tipo": "texto", "nombre": "Recurso 2", "contenido": "Apuntes"},
        headers=docente_headers,
    )

    resp = client.get(
        f"/api/v1/examenes/grupos/{grupo.id}/recursos", headers=docente_headers
    )

    assert resp.status_code == 200, resp.text
    nombres = [r["nombre"] for r in resp.json()]
    assert "Recurso 1" in nombres
    assert "Recurso 2" in nombres


@pytest.mark.integration
def test_listar_recursos_grupo_inexistente_404(client, docente_headers):
    resp = client.get(
        "/api/v1/examenes/grupos/no-existe/recursos", headers=docente_headers
    )
    assert resp.status_code == 404, resp.text


# =====================================================
# 4. SINCRONIZACIÓN CARPETA DOCENTE (QR)
# =====================================================

@pytest.mark.integration
def test_iniciar_sincronizacion(client, docente_headers):
    resp = client.post(
        "/api/v1/examenes/sincronizar/iniciar",
        json={"session_id": "s1"},
        headers=docente_headers,
    )

    assert resp.status_code == 200, resp.text
    assert resp.json()["estado"] == "ESPERANDO"


@pytest.mark.integration
def test_iniciar_sincronizacion_sin_session_id_400(client, docente_headers):
    resp = client.post(
        "/api/v1/examenes/sincronizar/iniciar",
        json={},
        headers=docente_headers,
    )
    assert resp.status_code == 400, resp.text


@pytest.mark.integration
def test_estado_sincronizacion_esperando(client, docente_headers):
    resp = client.get("/api/v1/examenes/sincronizar/estado/s1", headers=docente_headers)

    assert resp.status_code == 200, resp.text
    assert resp.json()["sincronizado"] is False


@pytest.mark.integration
def test_vincular_grupo_y_estado_sincronizado(client, db, docente_user, docente_headers):
    grupo = _crear_grupo(db, docente_user, nombre="Grupo vinculado")

    vincular = client.post(
        "/api/v1/examenes/sincronizar/vincular",
        json={"session_id": "s1", "grupo_id": str(grupo.id)},
        headers=docente_headers,
    )
    assert vincular.status_code == 200, vincular.text
    assert vincular.json()["success"] is True

    estado = client.get("/api/v1/examenes/sincronizar/estado/s1", headers=docente_headers)
    assert estado.status_code == 200, estado.text
    data = estado.json()
    assert data["sincronizado"] is True
    assert data["carpeta"]["id"] == str(grupo.id)


@pytest.mark.integration
def test_escanear_qr_lista_grupos(client, db, docente_user, docente_headers):
    _crear_grupo(db, docente_user, nombre="Grupo escaneable")

    resp = client.get("/api/v1/examenes/sincronizar/escanear/s1", headers=docente_headers)

    assert resp.status_code == 200, resp.text
    nombres = [g["nombre"] for g in resp.json()["grupos_disponibles"]]
    assert "Grupo escaneable" in nombres


@pytest.mark.integration
def test_cerrar_sesion_sincronizacion(client, db, docente_user, docente_headers):
    grupo = _crear_grupo(db, docente_user)
    client.post(
        "/api/v1/examenes/sincronizar/vincular",
        json={"session_id": "s1", "grupo_id": str(grupo.id)},
        headers=docente_headers,
    )

    resp = client.delete("/api/v1/examenes/sincronizar/cerrar/s1", headers=docente_headers)

    assert resp.status_code == 200, resp.text
    assert resp.json()["success"] is True

    db.expire_all()
    actualizado = db.query(Grupo).filter(Grupo.id == grupo.id).first()
    assert actualizado.session_activo is None


# =====================================================
# 5. ALUMNOS
# =====================================================

def _crear_alumno(db, *, nombres="Ana", apellidos="Pérez", dni=None, grupo_id=None):
    alumno = Alumno(
        id=str(uuid.uuid4()),
        nombres=nombres,
        apellidos=apellidos,
        dni=dni,
        grupo_id=grupo_id,
    )
    db.add(alumno)
    db.commit()
    db.refresh(alumno)
    return alumno


@pytest.mark.integration
def test_listar_alumnos(client, db, docente_user, docente_headers):
    _crear_alumno(db, nombres="Ana", apellidos="Pérez")

    resp = client.get("/api/v1/examenes/alumnos", headers=docente_headers)

    assert resp.status_code == 200, resp.text
    nombres = [a["nombres"] for a in resp.json()]
    assert "Ana" in nombres


@pytest.mark.integration
def test_guardar_alumnos(client, db, docente_user, docente_headers):
    payload = [
        {"nombres": "Luis", "apellidos": "Gómez", "dni": "12345678", "grupo_id": "g1"},
        {"nombres": "María", "apellidos": "López", "dni": "87654321", "grupo_id": "g1"},
    ]

    resp = client.post("/api/v1/examenes/alumnos", json=payload, headers=docente_headers)

    assert resp.status_code == 201, resp.text
    assert resp.json()["ok"] is True

    db.expire_all()
    assert db.query(Alumno).filter(Alumno.grupo_id == "g1").count() == 2


@pytest.mark.integration
def test_guardar_alumnos_lista_vacia_400(client, docente_headers):
    resp = client.post("/api/v1/examenes/alumnos", json=[], headers=docente_headers)
    assert resp.status_code == 400, resp.text


@pytest.mark.integration
def test_eliminar_alumnos_por_grupo(client, db, docente_user, docente_headers):
    alumno = _crear_alumno(db, grupo_id="g1")

    resp = client.delete("/api/v1/examenes/alumnos/grupo/g1", headers=docente_headers)

    assert resp.status_code == 200, resp.text
    db.expire_all()
    actualizado = db.query(Alumno).filter(Alumno.id == alumno.id).first()
    assert actualizado is not None
    assert actualizado.grupo_id is None
