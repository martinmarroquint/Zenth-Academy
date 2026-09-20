# back/tests/test_auth.py
# Tests de integración para autenticación:
# login, registro, refresh con rotación y uso del access token.

import pytest

from app.api.auth import EMPRESA_ID_DEFAULT
from app.core import login_attempts, ratelimit

PASSWORD = "Test1234!"


@pytest.fixture(autouse=True)
def _limpiar_estado_global():
    """Aísla el rate limiting y el bloqueo de intentos (estado en memoria global).

    Sin esto, los logins acumulados entre tests podrían disparar un 429.
    """
    ratelimit._hits.clear()
    login_attempts._login_attempts.clear()
    yield
    ratelimit._hits.clear()
    login_attempts._login_attempts.clear()


def _en_empresa(db, user, empresa_id: str = EMPRESA_ID_DEFAULT):
    """Alinea la empresa del usuario con la de por defecto.

    NOTA: ya NO es necesario para que el login funcione (el login busca solo por
    email, que es único). Se mantiene por compatibilidad con tests existentes.
    """
    user.empresa_id = empresa_id
    db.commit()
    db.refresh(user)
    return user


def _login(client, email: str, password: str = PASSWORD):
    # El endpoint usa OAuth2PasswordRequestForm -> form data, no JSON.
    return client.post(
        "/api/v1/auth/login",
        data={"username": email, "password": password},
    )


# =============================================
# LOGIN
# =============================================

@pytest.mark.integration
def test_regresion_login_con_empresa_distinta(client, db, estudiante_user):
    """REGRESIÓN: un usuario con empresa_id distinto (o NULL) debe poder loguearse.

    Bug corregido: el login filtraba por `empresa_id == EMPRESA_ID_DEFAULT`, lo que
    dejaba fuera a usuarios legítimos (ej: docente@zenth.com y estudiante@zenth.com
    tenían empresa_id NULL y no podían entrar).
    """
    estudiante_user.empresa_id = "otra-empresa-distinta"
    db.commit()

    resp = _login(client, estudiante_user.email)
    assert resp.status_code == 200, resp.text
    assert "access_token" in resp.json()


@pytest.mark.integration
def test_regresion_login_con_empresa_nula(client, db, estudiante_user):
    """REGRESIÓN: un usuario con empresa_id NULL debe poder loguearse."""
    estudiante_user.empresa_id = None
    db.commit()

    resp = _login(client, estudiante_user.email)
    assert resp.status_code == 200, resp.text


@pytest.mark.integration
def test_login_exitoso_devuelve_tokens(client, db, admin_user):
    _en_empresa(db, admin_user)

    resp = _login(client, admin_user.email)

    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["access_token"]
    assert data["refresh_token"]
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == admin_user.email


@pytest.mark.integration
def test_login_password_incorrecta_devuelve_401(client, db, admin_user):
    _en_empresa(db, admin_user)

    resp = _login(client, admin_user.email, password="ClaveEquivocada999!")

    assert resp.status_code == 401


@pytest.mark.integration
def test_login_email_inexistente_devuelve_401(client):
    resp = _login(client, "nadie.existe@zenth.test")

    assert resp.status_code == 401


@pytest.mark.integration
def test_login_usuario_inactivo_rechazado(client, db, estudiante_user):
    _en_empresa(db, estudiante_user)
    estudiante_user.activo = False
    db.commit()

    resp = _login(client, estudiante_user.email)

    assert resp.status_code in (401, 403), resp.text


# =============================================
# REGISTRO
# =============================================

@pytest.mark.integration
def test_registro_nuevo_usuario(client):
    payload = {
        "email": "nuevo.estudiante@example.com",
        "password": "Secreto123",
        "nombres": "Nuevo",
        "apellidos": "Estudiante",
    }

    resp = client.post("/api/v1/auth/register", json=payload)

    assert resp.status_code in (200, 201), resp.text
    data = resp.json()
    assert data["access_token"]
    assert data["refresh_token"]
    assert data["user"]["email"] == payload["email"]
    assert data["user"]["rol"] == "estudiante"


@pytest.mark.integration
def test_registro_email_duplicado_devuelve_400(client):
    payload = {
        "email": "duplicado@example.com",
        "password": "Secreto123",
        "nombres": "Dup",
        "apellidos": "Licado",
    }

    first = client.post("/api/v1/auth/register", json=payload)
    assert first.status_code in (200, 201), first.text

    second = client.post("/api/v1/auth/register", json=payload)
    assert second.status_code == 400, second.text


@pytest.mark.integration
def test_registro_password_debil_devuelve_422(client):
    resp = client.post(
        "/api/v1/auth/register",
        json={"email": "debil@example.com", "password": "123"},
    )

    assert resp.status_code == 422, resp.text


# =============================================
# REFRESH / ROTACIÓN
# =============================================

@pytest.mark.integration
def test_refresh_valido_genera_nuevo_access_token(client, db, admin_user):
    _en_empresa(db, admin_user)
    login = _login(client, admin_user.email).json()

    resp = client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": login["refresh_token"]},
    )

    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["access_token"]
    assert data["refresh_token"]
    # El refresh rota: el nuevo token debe ser distinto al usado.
    assert data["refresh_token"] != login["refresh_token"]


@pytest.mark.integration
def test_refresh_ya_usado_es_rechazado(client, db, admin_user):
    _en_empresa(db, admin_user)
    login = _login(client, admin_user.email).json()
    refresh_token = login["refresh_token"]

    first = client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": refresh_token},
    )
    assert first.status_code == 200, first.text

    # Reutilizar el mismo refresh token (ya rotado/revocado) debe fallar.
    second = client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": refresh_token},
    )
    assert second.status_code == 401, second.text


# =============================================
# ACCESS TOKEN
# =============================================

@pytest.mark.integration
def test_access_token_autentica_en_me(client, db, admin_user):
    _en_empresa(db, admin_user)
    login = _login(client, admin_user.email).json()

    resp = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {login['access_token']}"},
    )

    assert resp.status_code == 200, resp.text
    assert resp.json()["email"] == admin_user.email
