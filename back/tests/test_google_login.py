# back/tests/test_google_login.py
# =====================================================
# LOGIN CON GOOGLE (POST /auth/google)
#
# Se mockea `verificar_id_token_google` (no podemos generar un ID token real
# de Google en tests) y se verifica la creación/vinculación de usuarios y la
# emisión de NUESTRO JWT.
# =====================================================

from unittest.mock import patch

import pytest

from app.models.usuario import Usuario

_CRED = "x" * 40


def _info(email, sub="google-sub-1", verified=True):
    return {
        "sub": sub,
        "email": email,
        "email_verified": verified,
        "given_name": "Nuevo",
        "family_name": "Google",
        "picture": "https://example.com/foto.jpg",
    }


@pytest.mark.integration
def test_google_login_crea_usuario_estudiante(client, db):
    with patch("app.api.auth.verificar_id_token_google", return_value=_info("nuevo.google@zenth.test")):
        resp = client.post("/api/v1/auth/google", json={"credential": _CRED})

    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["access_token"]
    assert data["refresh_token"]
    assert data["user"]["rol"] == "estudiante"
    assert data["user"]["email"] == "nuevo.google@zenth.test"

    creado = db.query(Usuario).filter(Usuario.email == "nuevo.google@zenth.test").first()
    assert creado is not None
    assert creado.auth_provider == "google"
    assert creado.google_id == "google-sub-1"


@pytest.mark.integration
def test_google_login_vincula_email_existente(client, db, estudiante_user):
    with patch("app.api.auth.verificar_id_token_google", return_value=_info(estudiante_user.email, sub="google-sub-2")):
        resp = client.post("/api/v1/auth/google", json={"credential": _CRED})

    assert resp.status_code == 200, resp.text
    assert resp.json()["user"]["id"] == str(estudiante_user.id)

    db.expire_all()
    u = db.query(Usuario).filter(Usuario.id == estudiante_user.id).first()
    assert u.google_id == "google-sub-2"
    assert u.auth_provider == "google"
    # No se duplicó el usuario
    assert db.query(Usuario).filter(Usuario.email == estudiante_user.email).count() == 1


@pytest.mark.integration
def test_google_login_token_invalido_401(client):
    with patch("app.api.auth.verificar_id_token_google", side_effect=ValueError("Token de Google inválido")):
        resp = client.post("/api/v1/auth/google", json={"credential": _CRED})
    assert resp.status_code == 401, resp.text


@pytest.mark.integration
def test_google_login_email_no_verificado_401(client):
    with patch("app.api.auth.verificar_id_token_google", return_value=_info("sinverificar@zenth.test", verified=False)):
        resp = client.post("/api/v1/auth/google", json={"credential": _CRED})
    assert resp.status_code == 401, resp.text


@pytest.mark.integration
def test_google_login_sin_configurar_503(client):
    with patch("app.api.auth._settings.GOOGLE_CLIENT_ID", None):
        resp = client.post("/api/v1/auth/google", json={"credential": _CRED})
    assert resp.status_code == 503, resp.text
