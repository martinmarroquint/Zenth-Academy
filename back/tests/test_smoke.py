# back/tests/test_smoke.py
# Test de humo: verifica que la infraestructura de tests funciona.

import pytest


@pytest.mark.integration
def test_app_arranca(client):
    """La app responde en un endpoint público."""
    resp = client.get("/health")
    assert resp.status_code == 200, resp.text


@pytest.mark.integration
def test_endpoints_diagnostico_requieren_admin(client):
    """✅ SEGURIDAD: /info y /db-check exponen infraestructura → solo admin."""
    assert client.get("/info").status_code == 401
    assert client.get("/db-check").status_code == 401


@pytest.mark.integration
def test_fixtures_crean_usuarios(admin_user, docente_user, estudiante_user):
    """Las fixtures de usuarios crean registros válidos."""
    assert admin_user.rol == "admin"
    assert docente_user.rol == "docente"
    assert estudiante_user.rol == "estudiante"
    assert admin_user.id != docente_user.id


@pytest.mark.integration
def test_token_autentica(client, estudiante_headers):
    """Un token válido autentica correctamente."""
    resp = client.get("/api/v1/cursos/mis-cursos", headers=estudiante_headers)
    # 200 si el endpoint funciona; 401/403 indicarían fallo de auth
    assert resp.status_code == 200, resp.text


@pytest.mark.integration
def test_sin_token_rechaza(client):
    """Sin token, un endpoint protegido devuelve 401."""
    resp = client.get("/api/v1/cursos/mis-cursos")
    assert resp.status_code == 401
