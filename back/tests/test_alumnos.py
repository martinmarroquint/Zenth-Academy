# back/tests/test_alumnos.py
# =====================================================
# TESTS DE CATÁLOGO DE ALUMNOS (carga masiva)
#   - El front y las cargas por CSV mandan email: '' (no null).
#     Antes EmailStr lo rechazaba → 422 en TODO el lote y la UI lo
#     escondía como "modo offline": el admin creía que había guardado.
# =====================================================

import pytest


@pytest.mark.integration
def test_carga_masiva_acepta_email_vacio(client, db, admin_headers):
    payload = [
        {"nombres": "Ana", "apellidos": "Torres", "email": ""},
        {"nombres": "Luis", "apellidos": "Rios", "email": None},
        {"nombres": "Maria", "apellidos": "Paz", "email": "maria@ejemplo.com"},
    ]

    resp = client.post("/api/v1/alumnos/masivo", json=payload, headers=admin_headers)

    assert resp.status_code == 201, resp.text

    listado = client.get("/api/v1/alumnos/", headers=admin_headers)
    assert listado.status_code == 200, listado.text
    datos = listado.json()
    filas = datos["alumnos"] if isinstance(datos, dict) else datos
    nombres = {a["nombres"] for a in filas}
    assert {"ANA", "LUIS", "MARIA"} <= nombres, nombres


@pytest.mark.integration
def test_carga_masiva_sin_nombre_rechazada(client, admin_headers):
    """Un registro sin nombres no debe tumbar el lote completo sin explicación."""
    resp = client.post(
        "/api/v1/alumnos/masivo",
        json=[{"nombres": "", "apellidos": "Torres"}],
        headers=admin_headers,
    )
    assert resp.status_code == 422, resp.text


@pytest.mark.security
@pytest.mark.integration
def test_carga_masiva_solo_admin(client, estudiante_headers):
    resp = client.post(
        "/api/v1/alumnos/masivo",
        json=[{"nombres": "Ana", "apellidos": "Torres"}],
        headers=estudiante_headers,
    )
    assert resp.status_code == 403, resp.text
