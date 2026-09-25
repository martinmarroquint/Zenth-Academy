# back/tests/test_compartir.py
# =====================================================
# TESTS DE SEGURIDAD: COMPARTIR EN CLASE (SALAS + QR)
#   - Rate limit del estado público (MEDIA 5)
#   - El estado de la sala solo se devuelve al dueño (MEDIA 6)
# =====================================================

import pytest


# =====================================================
# HELPERS
# =====================================================

def _crear_sala(client, headers):
    resp = client.post("/api/v1/compartir/salas", headers=headers)
    assert resp.status_code == 201, resp.text
    return resp.json()


# =====================================================
# 1. RATE LIMIT DEL ESTADO PÚBLICO (MEDIA 5)
# =====================================================

@pytest.mark.security
@pytest.mark.integration
def test_estado_sala_publico_tiene_rate_limit(client):
    """✅ MEDIA 5: el endpoint público de estado está limitado (60/min)."""
    url = "/api/v1/compartir/NOEXISTE"

    for _ in range(60):
        resp = client.get(url)
        assert resp.status_code == 404, resp.text

    resp_limite = client.get(url)
    assert resp_limite.status_code == 429, resp_limite.text


# =====================================================
# 2. VINCULAR: SOLO EL DUEÑO RECIBE EL ESTADO (MEDIA 6)
# =====================================================

@pytest.mark.security
@pytest.mark.integration
def test_vincular_no_dueno_no_recibe_sala(client, docente_headers, estudiante_headers):
    sala = _crear_sala(client, docente_headers)

    resp = client.post(
        f"/api/v1/compartir/{sala['codigo']}/vincular",
        headers=estudiante_headers,
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["ok"] is False, data
    assert data["es_dueño"] is False, data
    assert data["sala"] is None, data


@pytest.mark.integration
def test_vincular_dueno_si_recibe_sala(client, docente_headers):
    sala = _crear_sala(client, docente_headers)

    resp = client.post(
        f"/api/v1/compartir/{sala['codigo']}/vincular",
        headers=docente_headers,
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["ok"] is True, data
    assert data["sala"] is not None, data
    assert data["sala"]["codigo"] == sala["codigo"]


@pytest.mark.security
@pytest.mark.integration
def test_vincular_docente_ajeno_no_recibe_sala(
    client, docente_headers, otro_docente_headers
):
    sala = _crear_sala(client, docente_headers)

    resp = client.post(
        f"/api/v1/compartir/{sala['codigo']}/vincular",
        headers=otro_docente_headers,
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["ok"] is False, data
    assert data["sala"] is None, data
