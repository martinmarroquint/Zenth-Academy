# back/tests/test_materiales.py
# =====================================================
# TESTS DE SEGURIDAD: MATERIALES COMPARTIDOS
#   - Aislamiento por dueño + excepción de admin (BAJA 14)
# =====================================================

import pytest


# =====================================================
# HELPERS
# =====================================================

def _crear_material(client, headers, *, titulo="Material"):
    resp = client.post(
        "/api/v1/materiales/",
        json={"titulo": titulo, "tipo": "enlace", "contenido": "https://example.com/x"},
        headers=headers,
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


# =====================================================
# 1. AISLAMIENTO POR DUEÑO
# =====================================================

@pytest.mark.security
@pytest.mark.integration
def test_docente_no_ve_materiales_de_otro(client, docente_headers, otro_docente_headers):
    _crear_material(client, docente_headers, titulo="Propio")

    resp = client.get("/api/v1/materiales/", headers=otro_docente_headers)
    assert resp.status_code == 200, resp.text
    assert "Propio" not in [m["titulo"] for m in resp.json()]


@pytest.mark.security
@pytest.mark.integration
def test_docente_no_obtiene_material_ajeno(client, docente_headers, otro_docente_headers):
    material = _crear_material(client, docente_headers, titulo="Privado")

    resp = client.get(f"/api/v1/materiales/{material['id']}", headers=otro_docente_headers)
    assert resp.status_code == 404, resp.text


# =====================================================
# 2. EXCEPCIÓN DE ADMIN (BAJA 14)
# =====================================================

@pytest.mark.integration
def test_admin_ve_materiales_de_cualquier_docente(
    client, docente_headers, admin_headers
):
    _crear_material(client, docente_headers, titulo="Del docente")

    resp = client.get("/api/v1/materiales/", headers=admin_headers)
    assert resp.status_code == 200, resp.text
    assert "Del docente" in [m["titulo"] for m in resp.json()]


@pytest.mark.integration
def test_admin_puede_obtener_material_ajeno(client, docente_headers, admin_headers):
    material = _crear_material(client, docente_headers, titulo="Del docente")

    resp = client.get(f"/api/v1/materiales/{material['id']}", headers=admin_headers)
    assert resp.status_code == 200, resp.text
    assert resp.json()["titulo"] == "Del docente"
