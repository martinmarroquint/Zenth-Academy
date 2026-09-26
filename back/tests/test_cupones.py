# back/tests/test_cupones.py
# =====================================================
# TESTS DEL MÓDULO DE CUPONES Y PROMOCIONES
#   - CRUD (solo admin) con validaciones
#   - Validación de vigencia, curso y usos
#   - Aplicación real al solicitar acceso a un curso de pago
# =====================================================

import uuid
from datetime import datetime, timedelta, timezone

import pytest

from app.models.cupon import Cupon, CuponUso
from app.models.curso import Curso


# =====================================================
# HELPERS
# =====================================================

def _crear_curso_pago(db, docente, *, titulo="Curso de pago", precio=200.0):
    curso = Curso(
        id=str(uuid.uuid4()),
        titulo=titulo,
        descripcion="",
        categoria="general",
        nivel="principiante",
        docente_id=str(docente.id),
        docente_nombre=docente.nombre_completo,
        precio_tipo="pago",
        precio_monto=precio,
        estado="PUBLICADO",
        modulos=[],
        tipo_bloqueo="ninguno",
        bloqueo_config={},
        etiquetas=[],
        requisitos=[],
        objetivos=[],
        certificado_habilitado=True,
        certificado_nota_minima=None,
    )
    db.add(curso)
    db.commit()
    db.refresh(curso)
    return curso


def _crear_cupon(client, headers, *, codigo="PROMO25", tipo="porcentaje", valor=25, **extra):
    payload = {"codigo": codigo, "tipo": tipo, "valor": valor, **extra}
    resp = client.post("/api/v1/cupones/", json=payload, headers=headers)
    assert resp.status_code == 201, resp.text
    return resp.json()


# =====================================================
# 1. CRUD Y PERMISOS
# =====================================================

@pytest.mark.integration
def test_admin_crea_cupon(client, admin_headers):
    cupon = _crear_cupon(client, admin_headers, codigo="promo25", valor=25)

    assert cupon["codigo"] == "PROMO25"  # se normaliza a mayúsculas
    assert cupon["vigencia"] == "vigente"
    assert cupon["usos"] == 0
    assert cupon["activo"] is True


@pytest.mark.security
@pytest.mark.integration
def test_solo_admin_gestiona_cupones(client, docente_headers, estudiante_headers):
    assert client.get("/api/v1/cupones/", headers=docente_headers).status_code == 403
    assert client.get("/api/v1/cupones/", headers=estudiante_headers).status_code == 403
    assert client.post(
        "/api/v1/cupones/", json={"codigo": "X", "valor": 10}, headers=docente_headers
    ).status_code == 403
    # Validar sí requiere sesión (cualquier rol autenticado)
    assert client.post(
        "/api/v1/cupones/validar", json={"codigo": "X", "curso_id": "c"}
    ).status_code == 401


@pytest.mark.integration
def test_codigo_duplicado_400(client, admin_headers):
    _crear_cupon(client, admin_headers, codigo="UNICO")

    resp = client.post(
        "/api/v1/cupones/",
        json={"codigo": "unico", "tipo": "monto", "valor": 10},
        headers=admin_headers,
    )
    assert resp.status_code == 400, resp.text


@pytest.mark.integration
def test_valores_invalidos_400(client, admin_headers):
    cero = client.post(
        "/api/v1/cupones/",
        json={"codigo": "CERO", "tipo": "porcentaje", "valor": 0},
        headers=admin_headers,
    )
    assert cero.status_code == 400, cero.text

    excesivo = client.post(
        "/api/v1/cupones/",
        json={"codigo": "EXCESIVO", "tipo": "porcentaje", "valor": 150},
        headers=admin_headers,
    )
    assert excesivo.status_code == 400, excesivo.text


@pytest.mark.integration
def test_desactivar_cupon(client, admin_headers):
    cupon = _crear_cupon(client, admin_headers, codigo="TEMP")

    resp = client.delete(f"/api/v1/cupones/{cupon['id']}", headers=admin_headers)
    assert resp.status_code == 200, resp.text

    listado = client.get("/api/v1/cupones/", headers=admin_headers).json()
    assert listado[0]["activo"] is False
    assert listado[0]["vigencia"] == "inactivo"


# =====================================================
# 2. VALIDACIÓN (sin consumir)
# =====================================================

@pytest.mark.integration
def test_validar_cupon_porcentaje(client, db, admin_headers, docente_user, estudiante_headers):
    curso = _crear_curso_pago(db, docente_user, precio=200.0)
    _crear_cupon(client, admin_headers, codigo="PROMO25", valor=25)

    resp = client.post(
        "/api/v1/cupones/validar",
        json={"codigo": "promo25", "curso_id": str(curso.id)},
        headers=estudiante_headers,
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["valido"] is True, data
    assert data["monto_base"] == pytest.approx(200.0)
    assert data["monto_descuento"] == pytest.approx(50.0)
    assert data["monto_final"] == pytest.approx(150.0)


@pytest.mark.integration
def test_validar_cupon_monto_fijo(client, db, admin_headers, docente_user, estudiante_headers):
    curso = _crear_curso_pago(db, docente_user, precio=200.0)
    _crear_cupon(client, admin_headers, codigo="MENOS50", tipo="monto", valor=50)

    data = client.post(
        "/api/v1/cupones/validar",
        json={"codigo": "MENOS50", "curso_id": str(curso.id)},
        headers=estudiante_headers,
    ).json()
    assert data["monto_final"] == pytest.approx(150.0)


@pytest.mark.integration
def test_cupon_no_existe(client, db, docente_user, estudiante_headers):
    curso = _crear_curso_pago(db, docente_user)

    data = client.post(
        "/api/v1/cupones/validar",
        json={"codigo": "NOEXISTE", "curso_id": str(curso.id)},
        headers=estudiante_headers,
    ).json()
    assert data["valido"] is False
    assert "no existe" in data["motivo"].lower()


@pytest.mark.integration
def test_cupon_expirado(client, db, admin_headers, docente_user, estudiante_headers):
    curso = _crear_curso_pago(db, docente_user)
    _crear_cupon(
        client, admin_headers, codigo="VIEJO",
        fecha_fin=(datetime.now(timezone.utc) - timedelta(days=1)).isoformat(),
    )

    data = client.post(
        "/api/v1/cupones/validar",
        json={"codigo": "VIEJO", "curso_id": str(curso.id)},
        headers=estudiante_headers,
    ).json()
    assert data["valido"] is False
    assert "expir" in data["motivo"].lower()


@pytest.mark.integration
def test_cupon_de_otro_curso(client, db, admin_headers, docente_user, estudiante_headers):
    curso_a = _crear_curso_pago(db, docente_user, titulo="Curso A")
    curso_b = _crear_curso_pago(db, docente_user, titulo="Curso B")
    _crear_cupon(client, admin_headers, codigo="SOLOA", curso_id=str(curso_a.id))

    data = client.post(
        "/api/v1/cupones/validar",
        json={"codigo": "SOLOA", "curso_id": str(curso_b.id)},
        headers=estudiante_headers,
    ).json()
    assert data["valido"] is False
    assert "no aplica" in data["motivo"].lower()


# =====================================================
# 3. APLICACIÓN REAL AL SOLICITAR ACCESO
# =====================================================

@pytest.mark.integration
def test_solicitar_acceso_con_cupon_aplica_descuento(
    client, db, admin_headers, docente_user, estudiante_user, estudiante_headers
):
    curso = _crear_curso_pago(db, docente_user, precio=200.0)
    cupon = _crear_cupon(client, admin_headers, codigo="PROMO25", valor=25)

    resp = client.post(
        f"/api/v1/cursos/{curso.id}/solicitar-acceso",
        json={"mensaje_estudiante": "Ya pagué", "cupon_codigo": "promo25"},
        headers=estudiante_headers,
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["cupon_codigo"] == "PROMO25"
    assert data["monto_base"] == pytest.approx(200.0)
    assert data["monto_descuento"] == pytest.approx(50.0)
    assert data["monto_final"] == pytest.approx(150.0)

    # ✅ El cupón se consumió y quedó el historial
    db.expire_all()
    fila = db.query(Cupon).filter(Cupon.id == cupon["id"]).first()
    assert fila.usos == 1
    uso = db.query(CuponUso).filter(CuponUso.cupon_id == cupon["id"]).first()
    assert uso is not None
    assert uso.monto_final == pytest.approx(150.0)
    assert uso.usuario_id == str(estudiante_user.id)

    # El panel admin ve el uso
    usos = client.get(f"/api/v1/cupones/{cupon['id']}/usos", headers=admin_headers)
    assert usos.status_code == 200, usos.text
    assert len(usos.json()) == 1


@pytest.mark.integration
def test_solicitar_acceso_con_cupon_invalido_400(
    client, db, docente_user, estudiante_headers
):
    curso = _crear_curso_pago(db, docente_user, precio=100.0)

    resp = client.post(
        f"/api/v1/cursos/{curso.id}/solicitar-acceso",
        json={"cupon_codigo": "NOEXISTE"},
        headers=estudiante_headers,
    )
    assert resp.status_code == 400, resp.text


@pytest.mark.integration
def test_cupon_no_reutilizable_por_el_mismo_usuario(
    client, db, admin_headers, docente_user, estudiante_headers
):
    """Con usos_por_usuario=1 el mismo alumno no puede repetirlo."""
    curso = _crear_curso_pago(db, docente_user, precio=100.0)
    _crear_cupon(client, admin_headers, codigo="UNICOXALUMNO", valor=10, usos_por_usuario=1)

    primero = client.post(
        f"/api/v1/cursos/{curso.id}/solicitar-acceso",
        json={"cupon_codigo": "UNICOXALUMNO"},
        headers=estudiante_headers,
    )
    assert primero.status_code == 200, primero.text

    segundo = client.post(
        "/api/v1/cupones/validar",
        json={"codigo": "UNICOXALUMNO", "curso_id": str(curso.id)},
        headers=estudiante_headers,
    ).json()
    assert segundo["valido"] is False
    assert "ya usaste" in segundo["motivo"].lower()


@pytest.mark.integration
def test_cupon_agotado_por_limite_global(
    client, db, admin_headers, docente_user, estudiante_headers
):
    """Al llegar al límite global el cupón queda agotado (visible en el panel)."""
    curso = _crear_curso_pago(db, docente_user, precio=100.0)
    cupon = _crear_cupon(
        client, admin_headers, codigo="UNUSO", valor=10, max_usos=1, usos_por_usuario=5
    )

    primero = client.post(
        f"/api/v1/cursos/{curso.id}/solicitar-acceso",
        json={"cupon_codigo": "UNUSO"},
        headers=estudiante_headers,
    )
    assert primero.status_code == 200, primero.text

    otro_intento = client.post(
        "/api/v1/cupones/validar",
        json={"codigo": "UNUSO", "curso_id": str(curso.id)},
        headers=estudiante_headers,
    ).json()
    assert otro_intento["valido"] is False
    assert "límite" in otro_intento["motivo"].lower() or "limite" in otro_intento["motivo"].lower()

    db.expire_all()
    listado = client.get("/api/v1/cupones/", headers=admin_headers).json()
    agotado = [c for c in listado if c["id"] == cupon["id"]][0]
    assert agotado["usos"] == 1
    assert agotado["vigencia"] == "agotado"
