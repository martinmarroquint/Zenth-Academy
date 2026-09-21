# back/tests/test_seguridad_extra.py
# =====================================================
# TESTS DE REGRESIÓN DE SEGURIDAD (endurecimiento)
#   - No escalada de privilegios en PUT /auth/me
#   - La contraseña del examen no se expone a estudiantes/público
#   - Endpoints de diagnóstico y media requieren admin
#   - Aislamiento por docente en certificados
# =====================================================

import uuid

import pytest

from app.models.certificado import Certificado
from app.models.examen import Examen


# =====================================================
# 1. ESCALADA DE PRIVILEGIOS
# =====================================================

@pytest.mark.security
@pytest.mark.integration
def test_estudiante_no_puede_autopromocionarse_a_admin(client, estudiante_headers):
    """CRÍTICO: PUT /auth/me no debe permitir cambiar el propio rol."""
    resp = client.put("/api/v1/auth/me", json={"rol": "admin"}, headers=estudiante_headers)
    assert resp.status_code == 200, resp.text
    assert resp.json()["rol"] == "estudiante", resp.text

    # Confirmar que sigue siendo estudiante
    me = client.get("/api/v1/auth/me", headers=estudiante_headers)
    assert me.json()["rol"] == "estudiante"


@pytest.mark.security
@pytest.mark.integration
def test_estudiante_no_puede_activarse_ni_cambiar_empresa(client, estudiante_headers):
    resp = client.put(
        "/api/v1/auth/me",
        json={"activo": False, "empresa_id": "otra", "rol": "docente"},
        headers=estudiante_headers,
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["rol"] == "estudiante"
    assert data["activo"] is True


@pytest.mark.integration
def test_usuario_si_puede_editar_su_perfil(client, estudiante_headers):
    """El whitelist debe seguir permitiendo editar datos personales."""
    resp = client.put(
        "/api/v1/auth/me",
        json={"nombres": "Nuevo Nombre", "telefono": "999888777"},
        headers=estudiante_headers,
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["nombres"] == "Nuevo Nombre"
    assert resp.json()["telefono"] == "999888777"


# =====================================================
# 2. CONTRASEÑA DEL EXAMEN
# =====================================================

def _examen_con_password(db, docente, password="secreto"):
    examen = Examen(
        id=str(uuid.uuid4()),
        codigo=f"EXA-SEC-{uuid.uuid4().hex[:8]}",
        titulo="Examen con password",
        descripcion="",
        tiempo_limite=60,
        puntaje_aprobacion=60,
        estado="PUBLICADO",
        configuracion={"acceso_publico": True, "password_examen": password},
        intentos_permitidos=5,
        docente_id=str(docente.id),
    )
    db.add(examen)
    db.commit()
    db.refresh(examen)
    return examen


@pytest.mark.security
@pytest.mark.integration
def test_password_examen_no_se_expone_a_estudiante(client, db, docente_user, estudiante_headers):
    examen = _examen_con_password(db, docente_user)

    resp = client.get(f"/api/v1/examenes/{examen.id}", headers=estudiante_headers)
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert "password_examen" not in (data.get("configuracion") or {}), data
    assert data.get("requiere_password") is True


@pytest.mark.security
@pytest.mark.integration
def test_password_examen_no_se_expone_en_publico(client, db, docente_user):
    examen = _examen_con_password(db, docente_user)

    resp = client.get(f"/api/v1/examenes/publico/{examen.codigo}")
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert "password_examen" not in (data.get("configuracion") or {}), data
    assert data.get("requiere_password") is True


# =====================================================
# 3. DIAGNÓSTICO Y MEDIA (solo admin)
# =====================================================

@pytest.mark.security
@pytest.mark.integration
def test_diagnostico_requiere_admin(client, estudiante_headers):
    assert client.get("/info", headers=estudiante_headers).status_code == 403
    assert client.get("/db-check", headers=estudiante_headers).status_code == 403


@pytest.mark.security
@pytest.mark.integration
def test_media_cache_requiere_admin(client, estudiante_headers, admin_headers):
    assert client.get("/api/v1/media/drive/estado", headers=estudiante_headers).status_code == 403
    assert client.delete("/api/v1/media/drive/cache", headers=estudiante_headers).status_code == 403
    assert client.get("/api/v1/media/drive/estado", headers=admin_headers).status_code == 200


# =====================================================
# 4. AISLAMIENTO POR DOCENTE (certificados)
# =====================================================

def _crear_cert(db, docente_id):
    cert = Certificado(
        id=str(uuid.uuid4()),
        codigo=f"CERT-{uuid.uuid4().hex[:8].upper()}",
        estudiante_id="est-1",
        estudiante_nombre="Alumno",
        curso_id="curso-1",
        curso_titulo="Curso",
        docente_id=str(docente_id),
        estado="emitido",
    )
    db.add(cert)
    db.commit()
    db.refresh(cert)
    return cert


@pytest.mark.security
@pytest.mark.integration
def test_docente_no_gestiona_certificado_de_otro(client, db, docente_user, otro_docente_headers):
    cert = _crear_cert(db, docente_user.id)

    assert client.get(f"/api/v1/certificados/{cert.id}", headers=otro_docente_headers).status_code == 403
    assert client.delete(f"/api/v1/certificados/{cert.id}", headers=otro_docente_headers).status_code == 403
    assert client.put(
        f"/api/v1/certificados/{cert.id}", json={"curso_titulo": "hack"}, headers=otro_docente_headers
    ).status_code == 403
