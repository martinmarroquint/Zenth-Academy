# back/tests/test_compartir.py
# =====================================================
# TESTS: COMPARTIR EN CLASE (SALAS + EMPAREJAMIENTO DE PANTALLA POR QR)
#   - Rate limit del estado público (MEDIA 5)
#   - Emparejamiento: token de un solo uso + secreto de pantalla
#   - El contenido solo llega a la pantalla vinculada
#   - Revocación, expiración y auditoría
# =====================================================

from datetime import datetime, timedelta, timezone

import pytest

from app.models.historial_comparticion import HistorialComparticion


SECRET_PANTALLA = "secreto-pantalla-de-prueba-123456"
HEADER_PANTALLA = {"X-Pantalla-Secret": SECRET_PANTALLA}


# =====================================================
# HELPERS
# =====================================================

def _crear_sala(client, headers):
    resp = client.post("/api/v1/compartir/salas", headers=headers)
    assert resp.status_code == 201, resp.text
    return resp.json()


def _qr_actual(client, codigo):
    resp = client.get(f"/api/v1/compartir/{codigo}")
    assert resp.status_code == 200, resp.text
    return resp.json().get("qr_token")


def _vincular(client, codigo, headers, *, token=None, secret=SECRET_PANTALLA):
    token = token if token is not None else _qr_actual(client, codigo)
    return client.post(
        f"/api/v1/compartir/{codigo}/vincular",
        json={"qr_token": token, "pantalla_secret": secret},
        headers=headers,
    )


def _crear_material(client, headers, *, titulo="Material de clase"):
    resp = client.post(
        "/api/v1/materiales/",
        json={"titulo": titulo, "tipo": "enlace", "contenido": "https://example.com/x"},
        headers=headers,
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


def _mostrar_material(client, codigo, material, headers):
    resp = client.post(
        f"/api/v1/compartir/{codigo}/material",
        json={"material_id": material["id"]},
        headers=headers,
    )
    assert resp.status_code == 200, resp.text
    return resp.json()


def _fila_sala(db, codigo):
    return db.query(HistorialComparticion).filter(
        HistorialComparticion.session_id == codigo
    ).first()


# =====================================================
# 1. RATE LIMIT DEL ESTADO PÚBLICO (MEDIA 5)
# =====================================================

@pytest.mark.security
@pytest.mark.integration
def test_estado_sala_publico_tiene_rate_limit(client):
    """✅ MEDIA 5: el endpoint público de estado está limitado (60/min)."""
    url = "/api/v1/compartir/NOEXISTE"

    for _ in range(60):
        assert client.get(url).status_code == 404

    assert client.get(url).status_code == 429


# =====================================================
# 2. SOLO EL DUEÑO PUEDE VINCULAR
# =====================================================

@pytest.mark.security
@pytest.mark.integration
def test_vincular_no_dueno_no_recibe_sala(client, docente_headers, estudiante_headers):
    sala = _crear_sala(client, docente_headers)

    resp = client.post(
        f"/api/v1/compartir/{sala['codigo']}/vincular",
        json={},
        headers=estudiante_headers,
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["ok"] is False, data
    assert data["es_dueño"] is False, data
    assert data["sala"] is None, data


@pytest.mark.security
@pytest.mark.integration
def test_vincular_docente_ajeno_no_recibe_sala(
    client, docente_headers, otro_docente_headers
):
    sala = _crear_sala(client, docente_headers)

    resp = client.post(
        f"/api/v1/compartir/{sala['codigo']}/vincular",
        json={},
        headers=otro_docente_headers,
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["ok"] is False, data
    assert data["sala"] is None, data


# =====================================================
# 3. EMPAREJAMIENTO (QR + SECRETO DE PANTALLA)
# =====================================================

@pytest.mark.integration
def test_vincular_con_qr_y_secreto_empareja_pantalla(client, docente_headers):
    sala = _crear_sala(client, docente_headers)

    resp = _vincular(client, sala["codigo"], docente_headers)
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["ok"] is True, data
    assert data["pantalla_vinculada"] is True, data
    assert data["pantalla_expira"], data
    assert data["sala"]["pantalla_vinculada"] is True, data

    # El QR es de un solo uso: ya no existe
    assert _qr_actual(client, sala["codigo"]) is None


@pytest.mark.security
@pytest.mark.integration
def test_vincular_sin_secreto_400(client, docente_headers):
    sala = _crear_sala(client, docente_headers)

    resp = _vincular(client, sala["codigo"], docente_headers, secret=None)
    assert resp.status_code == 400, resp.text


@pytest.mark.security
@pytest.mark.integration
def test_vincular_con_token_invalido_400(client, docente_headers):
    sala = _crear_sala(client, docente_headers)

    resp = _vincular(client, sala["codigo"], docente_headers, token="token-falso")
    assert resp.status_code == 400, resp.text


@pytest.mark.security
@pytest.mark.integration
def test_token_de_qr_es_de_un_solo_uso(client, docente_headers):
    sala = _crear_sala(client, docente_headers)
    token = _qr_actual(client, sala["codigo"])

    assert _vincular(client, sala["codigo"], docente_headers, token=token).status_code == 200

    # Reutilizar el mismo token debe fallar
    resp2 = _vincular(client, sala["codigo"], docente_headers, token=token)
    assert resp2.status_code == 400, resp2.text


@pytest.mark.security
@pytest.mark.integration
def test_vincular_con_qr_expirado_400(client, db, docente_headers):
    sala = _crear_sala(client, docente_headers)
    token = _qr_actual(client, sala["codigo"])

    fila = _fila_sala(db, sala["codigo"])
    fila.qr_expira = datetime.now(timezone.utc) - timedelta(seconds=120)
    db.commit()

    resp = _vincular(client, sala["codigo"], docente_headers, token=token)
    assert resp.status_code == 400, resp.text


@pytest.mark.integration
def test_pantalla_guarda_auditoria(client, db, docente_headers):
    sala = _crear_sala(client, docente_headers)
    assert _vincular(client, sala["codigo"], docente_headers).status_code == 200

    db.expire_all()
    fila = _fila_sala(db, sala["codigo"])
    assert fila.pantalla_vinculada_en is not None
    assert fila.pantalla_expira is not None
    assert fila.pantalla_ip  # TestClient reporta una IP
    assert fila.pantalla_user_agent  # httpx envía User-Agent


# =====================================================
# 4. EL CONTENIDO SOLO LLEGA A LA PANTALLA VINCULADA
# =====================================================

@pytest.mark.security
@pytest.mark.integration
def test_pantalla_sin_secreto_no_recibe_material(client, docente_headers):
    """✅ El material no se expone a quien no sea la pantalla emparejada."""
    sala = _crear_sala(client, docente_headers)
    material = _crear_material(client, docente_headers)
    _mostrar_material(client, sala["codigo"], material, docente_headers)

    # Sin secreto
    estado = client.get(f"/api/v1/compartir/{sala['codigo']}").json()
    assert estado["material_activo"] is None, estado

    # Con secreto inválido
    estado2 = client.get(
        f"/api/v1/compartir/{sala['codigo']}",
        headers={"X-Pantalla-Secret": "secreto-equivocado"},
    ).json()
    assert estado2["material_activo"] is None, estado2


@pytest.mark.integration
def test_pantalla_vinculada_recibe_material(client, docente_headers):
    sala = _crear_sala(client, docente_headers)
    material = _crear_material(client, docente_headers)
    _mostrar_material(client, sala["codigo"], material, docente_headers)

    assert _vincular(client, sala["codigo"], docente_headers).status_code == 200

    estado = client.get(
        f"/api/v1/compartir/{sala['codigo']}", headers=HEADER_PANTALLA
    ).json()
    assert estado["pantalla_vinculada"] is True, estado
    assert estado["material_activo"] is not None, estado
    assert estado["material_activo"]["titulo"] == "Material de clase", estado
    # Ya vinculada: no se emite más QR
    assert estado["qr_token"] is None, estado


# =====================================================
# 5. REVOCACIÓN Y EXPIRACIÓN
# =====================================================

@pytest.mark.security
@pytest.mark.integration
def test_revocar_pantalla_corta_el_acceso(client, docente_headers):
    sala = _crear_sala(client, docente_headers)
    material = _crear_material(client, docente_headers)
    _mostrar_material(client, sala["codigo"], material, docente_headers)
    assert _vincular(client, sala["codigo"], docente_headers).status_code == 200

    rev = client.post(
        f"/api/v1/compartir/{sala['codigo']}/pantalla/revocar",
        headers=docente_headers,
    )
    assert rev.status_code == 200, rev.text

    estado = client.get(
        f"/api/v1/compartir/{sala['codigo']}", headers=HEADER_PANTALLA
    ).json()
    assert estado["pantalla_vinculada"] is False, estado
    assert estado["material_activo"] is None, estado
    # Vuelve a ofrecer QR para emparejar otra pantalla
    assert estado["qr_token"], estado


@pytest.mark.security
@pytest.mark.integration
def test_revocar_pantalla_ajena_403(client, docente_headers, otro_docente_headers):
    sala = _crear_sala(client, docente_headers)

    resp = client.post(
        f"/api/v1/compartir/{sala['codigo']}/pantalla/revocar",
        headers=otro_docente_headers,
    )
    assert resp.status_code == 403, resp.text


@pytest.mark.integration
def test_pantalla_expirada_pierde_acceso(client, db, docente_headers):
    sala = _crear_sala(client, docente_headers)
    material = _crear_material(client, docente_headers)
    _mostrar_material(client, sala["codigo"], material, docente_headers)
    assert _vincular(client, sala["codigo"], docente_headers).status_code == 200

    fila = _fila_sala(db, sala["codigo"])
    fila.pantalla_expira = datetime.now(timezone.utc) - timedelta(minutes=1)
    db.commit()

    estado = client.get(
        f"/api/v1/compartir/{sala['codigo']}", headers=HEADER_PANTALLA
    ).json()
    assert estado["pantalla_vinculada"] is False, estado
    assert estado["material_activo"] is None, estado

    db.expire_all()
    assert _fila_sala(db, sala["codigo"]).pantalla_secret_hash is None


# =====================================================
# 6. PANEL DEL DOCENTE
# =====================================================

@pytest.mark.integration
def test_enviar_material_no_marca_la_pantalla_como_vinculada(client, docente_headers):
    sala = _crear_sala(client, docente_headers)
    material = _crear_material(client, docente_headers)
    _mostrar_material(client, sala["codigo"], material, docente_headers)

    data = client.get("/api/v1/compartir/salas/activa", headers=docente_headers).json()
    assert data["pantalla_vinculada"] is False, data
    assert data["estado"] == "ESPERANDO", data
    assert data["material_activo"]["titulo"] == "Material de clase", data


@pytest.mark.integration
def test_sala_activa_refleja_el_emparejamiento(client, docente_headers):
    sala = _crear_sala(client, docente_headers)

    antes = client.get("/api/v1/compartir/salas/activa", headers=docente_headers).json()
    assert antes["pantalla_vinculada"] is False

    assert _vincular(client, sala["codigo"], docente_headers).status_code == 200

    despues = client.get("/api/v1/compartir/salas/activa", headers=docente_headers).json()
    assert despues["pantalla_vinculada"] is True, despues
    assert despues["pantalla_expira"], despues
    assert despues["pantalla_vinculada_en"], despues


# =====================================================
# 7. PANTALLA DEL AULA SIN CÓDIGO (/proyectar)
#    URL fija → QR → escanear. Sin códigos ni credenciales.
# =====================================================

def _crear_pantalla(client, *, secret=SECRET_PANTALLA, headers=None):
    return client.post(
        "/api/v1/compartir/pantallas",
        json={"pantalla_secret": secret},
        headers=headers or {},
    )


@pytest.mark.integration
def test_vincular_sin_sesion_pide_iniciar_sesion(client):
    """Un visitante anónimo (celular sin sesión) recibe un mensaje claro, no un 401."""
    pantalla = _crear_pantalla(client).json()

    resp = client.post(
        f"/api/v1/compartir/{pantalla['codigo']}/vincular",
        json={"qr_token": pantalla["qr_token"], "pantalla_secret": SECRET_PANTALLA},
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["ok"] is False, data
    assert "inici" in (data["mensaje"] or "").lower(), data


@pytest.mark.integration
def test_pantalla_nace_pendiente_con_qr(client):
    """Sin sesión: la pantalla nace pendiente y muestra un QR para escanear."""
    resp = _crear_pantalla(client)
    assert resp.status_code == 201, resp.text
    data = resp.json()
    assert data["codigo"], data
    assert data["qr_token"], data
    assert data["pantalla_vinculada"] is False, data
    assert data["material_activo"] is None, data


@pytest.mark.integration
def test_docente_reclama_la_pantalla_escaneando(client, docente_headers):
    """El docente que escanea el QR reclama la pantalla pendiente."""
    pantalla = _crear_pantalla(client).json()

    resp = client.post(
        f"/api/v1/compartir/{pantalla['codigo']}/vincular",
        json={"qr_token": pantalla["qr_token"], "pantalla_secret": SECRET_PANTALLA},
        headers=docente_headers,
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["ok"] is True, data
    assert data["pantalla_vinculada"] is True, data

    estado = client.get(
        f"/api/v1/compartir/{pantalla['codigo']}", headers=HEADER_PANTALLA
    ).json()
    assert estado["pantalla_vinculada"] is True, estado
    # La pantalla muestra a quién quedó vinculada
    assert estado["pantalla_docente_nombre"], estado


@pytest.mark.security
@pytest.mark.integration
def test_estudiante_no_puede_reclamar_la_pantalla(client, estudiante_headers):
    pantalla = _crear_pantalla(client).json()

    resp = client.post(
        f"/api/v1/compartir/{pantalla['codigo']}/vincular",
        json={"qr_token": pantalla["qr_token"], "pantalla_secret": SECRET_PANTALLA},
        headers=estudiante_headers,
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["ok"] is False, data
    assert data["pantalla_vinculada"] is False, data


@pytest.mark.integration
def test_pantalla_con_sesion_de_docente_se_vincula_directo(client, docente_headers):
    """Si el equipo ya tiene sesión de docente, no hace falta escanear nada."""
    resp = _crear_pantalla(client, headers=docente_headers)
    assert resp.status_code == 201, resp.text
    data = resp.json()
    assert data["pantalla_vinculada"] is True, data
    assert data["qr_token"] is None, data
    assert data["pantalla_docente_nombre"], data

    # Y ya recibe material sin haber escaneado
    material = _crear_material(client, docente_headers)
    _mostrar_material(client, data["codigo"], material, docente_headers)

    estado = client.get(
        f"/api/v1/compartir/{data['codigo']}", headers=HEADER_PANTALLA
    ).json()
    assert estado["material_activo"] is not None, estado


@pytest.mark.integration
def test_pantalla_pendiente_aparece_en_el_panel_al_reclamarse(client, docente_headers):
    pantalla = _crear_pantalla(client).json()

    antes = client.get("/api/v1/compartir/salas/activa", headers=docente_headers).json()
    assert antes is None, antes

    client.post(
        f"/api/v1/compartir/{pantalla['codigo']}/vincular",
        json={"qr_token": pantalla["qr_token"], "pantalla_secret": SECRET_PANTALLA},
        headers=docente_headers,
    )

    despues = client.get("/api/v1/compartir/salas/activa", headers=docente_headers).json()
    assert despues is not None, despues
    assert despues["codigo"] == pantalla["codigo"], despues
    assert despues["pantalla_vinculada"] is True, despues
