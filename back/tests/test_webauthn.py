# back/tests/test_webauthn.py
# =====================================================
# TESTS DE WEBAUTHN (huella / Face ID / Windows Hello)
# La ceremonia criptográfica necesita un autenticador real (navegador), así que
# aquí se cubren: shape de las opciones, permisos, desafíos de un solo uso,
# gestión de credenciales y rechazo de firmas inválidas.
# =====================================================

import uuid

import pytest

from app.models.webauthn import CredencialWebAuthn, WebAuthnChallenge


# =====================================================
# HELPERS
# =====================================================

def _crear_credencial(db, usuario, *, credential_id="cred-test-1", nombre="Dispositivo de prueba"):
    cred = CredencialWebAuthn(
        id=str(uuid.uuid4()),
        usuario_id=str(usuario.id),
        credential_id=credential_id,
        public_key="cHVibGljLWtleS1kZS1wdWViYQ",  # base64url de "public-key-de-prueba"
        sign_count=0,
        transports=["internal"],
        nombre=nombre,
    )
    db.add(cred)
    db.commit()
    db.refresh(cred)
    return cred


# =====================================================
# 1. ESTADO Y GESTIÓN
# =====================================================

@pytest.mark.integration
def test_estado_requiere_sesion(client, estudiante_headers, estudiante_user, db):
    assert client.get("/api/v1/webauthn/estado").status_code == 401

    _crear_credencial(db, estudiante_user)

    resp = client.get("/api/v1/webauthn/estado", headers=estudiante_headers)
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["habilitado"] is True
    assert data["credenciales"] == 1
    assert data["rp_id"]


@pytest.mark.integration
def test_listar_y_eliminar_credenciales(
    client, db, docente_user, estudiante_user, docente_headers, estudiante_headers
):
    cred = _crear_credencial(db, docente_user, nombre="iPhone de Juan")

    # El dueño la ve
    listado = client.get("/api/v1/webauthn/credenciales", headers=docente_headers)
    assert listado.status_code == 200, listado.text
    assert [c["nombre"] for c in listado.json()] == ["iPhone de Juan"]

    # Otro usuario no la ve
    ajeno = client.get("/api/v1/webauthn/credenciales", headers=estudiante_headers)
    assert ajeno.json() == []

    # Otro usuario no puede borrarla
    borrado_ajeno = client.delete(
        f"/api/v1/webauthn/credenciales/{cred.id}", headers=estudiante_headers
    )
    assert borrado_ajeno.status_code == 404, borrado_ajeno.text

    # El dueño sí
    borrado = client.delete(
        f"/api/v1/webauthn/credenciales/{cred.id}", headers=docente_headers
    )
    assert borrado.status_code == 200, borrado.text

    db.expire_all()
    assert db.query(CredencialWebAuthn).filter(
        CredencialWebAuthn.id == cred.id
    ).first() is None


# =====================================================
# 2. REGISTRO
# =====================================================

@pytest.mark.integration
def test_registro_iniciar_devuelve_opciones(client, db, estudiante_user, estudiante_headers):
    resp = client.post(
        "/api/v1/webauthn/registro/iniciar",
        json={"nombre": "Mi celular"},
        headers=estudiante_headers,
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()

    assert data.get("challenge"), data
    assert data["rp"]["name"] == "Zenth Academy"
    assert data["user"]["name"] == estudiante_user.email
    assert data.get("pubKeyCredParams"), data
    # La verificación biométrica es obligatoria
    assert data["authenticatorSelection"]["userVerification"] == "required"

    # El challenge queda guardado (un solo uso) para ese usuario
    fila = db.query(WebAuthnChallenge).filter(
        WebAuthnChallenge.usuario_id == str(estudiante_user.id),
        WebAuthnChallenge.tipo == "registro",
    ).first()
    assert fila is not None


@pytest.mark.security
@pytest.mark.integration
def test_registro_requiere_sesion(client):
    resp = client.post("/api/v1/webauthn/registro/iniciar", json={})
    assert resp.status_code == 401


@pytest.mark.integration
def test_registro_completar_con_firma_invalida_400(client, estudiante_headers):
    client.post(
        "/api/v1/webauthn/registro/iniciar", json={}, headers=estudiante_headers
    )

    resp = client.post(
        "/api/v1/webauthn/registro/completar",
        json={
            "credential": {
                "id": "cred-falsa",
                "rawId": "cred-falsa",
                "type": "public-key",
                "response": {
                    "clientDataJSON": "aW52YWxpZG8",
                    "attestationObject": "aW52YWxpZG8",
                },
            },
            "nombre": "Falsa",
        },
        headers=estudiante_headers,
    )
    assert resp.status_code == 400, resp.text


# =====================================================
# 3. LOGIN CON HUELLA
# =====================================================

@pytest.mark.integration
def test_login_iniciar_cuenta_sin_passkey_400(client, estudiante_user):
    resp = client.post(
        "/api/v1/webauthn/login/iniciar", json={"email": estudiante_user.email}
    )
    assert resp.status_code == 400, resp.text
    assert "huella" in resp.json()["detail"].lower()


@pytest.mark.integration
def test_login_iniciar_cuenta_inexistente_404(client):
    resp = client.post(
        "/api/v1/webauthn/login/iniciar", json={"email": "nadie@zenth.test"}
    )
    assert resp.status_code == 404, resp.text


@pytest.mark.integration
def test_login_iniciar_devuelve_challenge_y_credenciales(
    client, db, estudiante_user
):
    _crear_credencial(db, estudiante_user, credential_id="cred-login-1")

    resp = client.post(
        "/api/v1/webauthn/login/iniciar", json={"email": estudiante_user.email}
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()

    assert data.get("challenge"), data
    assert data.get("challenge_id"), data
    assert len(data.get("allowCredentials") or []) == 1
    assert data["userVerification"] == "required"


@pytest.mark.integration
def test_rp_id_se_deriva_del_origen_del_front(client, db, estudiante_user):
    """✅ El rpId debe ser el dominio del SITIO (frontend), no el del backend.

    Si se usara el host del backend, en producción (API en otro dominio) el
    navegador rechazaría la ceremonia con SecurityError.
    """
    _crear_credencial(db, estudiante_user, credential_id="Y3JlZC1ycC0x")

    resp = client.post(
        "/api/v1/webauthn/login/iniciar",
        json={"email": estudiante_user.email},
        headers={"Origin": "http://localhost:5173"},
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["rpId"] == "localhost", resp.json()

    resp_prod = client.post(
        "/api/v1/webauthn/login/iniciar",
        json={"email": estudiante_user.email},
        headers={"Origin": "https://zenthacademy.com"},
    )
    assert resp_prod.status_code == 200, resp_prod.text
    assert resp_prod.json()["rpId"] == "zenthacademy.com", resp_prod.json()


@pytest.mark.integration
def test_login_usernameless_sin_email(client, db):
    """✅ Sin correo: el navegador mostrará el selector de passkeys."""
    resp = client.post("/api/v1/webauthn/login/iniciar", json={})
    assert resp.status_code == 200, resp.text
    data = resp.json()

    assert data.get("challenge"), data
    assert data.get("challenge_id"), data
    assert data.get("allowCredentials") == [], data
    assert data["userVerification"] == "required"

    # El challenge queda sin usuario hasta que el dispositivo firme
    fila = db.query(WebAuthnChallenge).filter(
        WebAuthnChallenge.id == data["challenge_id"]
    ).first()
    assert fila is not None
    assert fila.usuario_id == ""


@pytest.mark.integration
def test_login_usernameless_resuelve_por_credencial(client, db, estudiante_user):
    """Sin correo, el usuario se resuelve por la credencial firmada."""
    _crear_credencial(db, estudiante_user, credential_id="cred-userless-1")
    opciones = client.post("/api/v1/webauthn/login/iniciar", json={}).json()

    resp = client.post(
        "/api/v1/webauthn/login/completar",
        json={
            "challenge_id": opciones["challenge_id"],
            "credential": {
                "id": "cred-userless-1",
                "rawId": "cred-userless-1",
                "type": "public-key",
                "response": {
                    "clientDataJSON": "aW52YWxpZG8",
                    "authenticatorData": "aW52YWxpZG8",
                    "signature": "aW52YWxpZG8",
                },
            },
        },
    )
    # La credencial se encuentra, pero la firma inválida no autentica
    assert resp.status_code == 401, resp.text


@pytest.mark.integration
def test_login_credencial_desconocida_400(client):
    opciones = client.post("/api/v1/webauthn/login/iniciar", json={}).json()

    resp = client.post(
        "/api/v1/webauthn/login/completar",
        json={
            "challenge_id": opciones["challenge_id"],
            "credential": {"id": "no-existe", "type": "public-key", "response": {}},
        },
    )
    assert resp.status_code == 400, resp.text


@pytest.mark.integration
def test_login_completar_con_challenge_invalido_400(client, db, estudiante_user):
    _crear_credencial(db, estudiante_user, credential_id="cred-login-2")

    resp = client.post(
        "/api/v1/webauthn/login/completar",
        json={
            "challenge_id": "no-existe",
            "credential": {"id": "cred-login-2", "type": "public-key", "response": {}},
        },
    )
    assert resp.status_code == 400, resp.text


@pytest.mark.integration
def test_login_completar_con_firma_invalida_401(client, db, estudiante_user):
    _crear_credencial(db, estudiante_user, credential_id="cred-login-3")
    opciones = client.post(
        "/api/v1/webauthn/login/iniciar", json={"email": estudiante_user.email}
    ).json()

    resp = client.post(
        "/api/v1/webauthn/login/completar",
        json={
            "challenge_id": opciones["challenge_id"],
            "credential": {
                "id": "cred-login-3",
                "rawId": "cred-login-3",
                "type": "public-key",
                "response": {
                    "clientDataJSON": "aW52YWxpZG8",
                    "authenticatorData": "aW52YWxpZG8",
                    "signature": "aW52YWxpZG8",
                },
            },
        },
    )
    assert resp.status_code == 401, resp.text
