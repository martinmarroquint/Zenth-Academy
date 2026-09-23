# back/tests/test_certificados.py
# =====================================================
# TESTS DE INTEGRACIÓN: CERTIFICADOS
#   - CRUD (crear/listar/obtener/actualizar/cancelar)
#   - Listado de certificados propios por estudiante
#   - Emisión automática al completar un curso
# =====================================================

import uuid
from datetime import datetime, timezone

import pytest

from app.models.certificado import Certificado
from app.models.curso import Curso, InscripcionCurso, ProgresoLeccion

MODULOS_2_LECCIONES = [
    {
        "id": "m1",
        "titulo": "Módulo 1",
        "lecciones": [
            {"id": "l1", "titulo": "Lección 1", "tipo": "texto"},
            {"id": "l2", "titulo": "Lección 2", "tipo": "texto"},
        ],
    }
]


# =====================================================
# HELPERS
# =====================================================

def _crear_certificado(
    db,
    *,
    codigo=None,
    estudiante_id,
    estudiante_nombre="Estudiante Test",
    curso_id="curso-1",
    curso_titulo="Curso de prueba",
    docente_id="doc-1",
    docente_nombre="Docente Test",
    estado="emitido",
    url=None,
):
    cert = Certificado(
        id=str(uuid.uuid4()),
        codigo=codigo or f"CERT-TEST-{uuid.uuid4().hex[:8].upper()}",
        estudiante_id=str(estudiante_id),
        estudiante_nombre=estudiante_nombre,
        curso_id=str(curso_id),
        curso_titulo=curso_titulo,
        docente_id=str(docente_id),
        docente_nombre=docente_nombre,
        estado=estado,
        url=url,
        fecha_emision=datetime.now(timezone.utc),
    )
    db.add(cert)
    db.commit()
    db.refresh(cert)
    return cert


def _crear_curso_certificable(db, docente, *, certificado_habilitado=True, certificado_nota_minima=None):
    curso = Curso(
        id=str(uuid.uuid4()),
        titulo="Curso certificable",
        descripcion="",
        categoria="general",
        nivel="principiante",
        docente_id=str(docente.id),
        docente_nombre=docente.nombre_completo,
        precio_tipo="gratis",
        estado="PUBLICADO",
        modulos=MODULOS_2_LECCIONES,
        certificado_habilitado=certificado_habilitado,
        certificado_nota_minima=certificado_nota_minima,
        tipo_bloqueo="ninguno",
        bloqueo_config={},
        etiquetas=[],
        requisitos=[],
        objetivos=[],
    )
    db.add(curso)
    db.commit()
    db.refresh(curso)
    return curso


# =====================================================
# 1. CRUD
# =====================================================

@pytest.mark.integration
def test_docente_crea_certificado_201(client, docente_user, docente_headers):
    payload = {
        "estudiante_id": "est-1",
        "estudiante_nombre": "Ana Pérez",
        "curso_id": "curso-1",
        "curso_titulo": "Curso de Python",
        "docente_id": str(docente_user.id),
        "docente_nombre": docente_user.nombre_completo,
    }

    resp = client.post("/api/v1/certificados/", json=payload, headers=docente_headers)

    assert resp.status_code == 201, resp.text
    data = resp.json()
    assert data["estudiante_id"] == "est-1"
    assert data["curso_titulo"] == "Curso de Python"
    assert data["estado"] == "emitido"
    assert data["codigo"].startswith("CERT-")
    # ✅ DEBE incluir firma HMAC
    assert data.get("firma"), "El certificado debe incluir firma HMAC"


@pytest.mark.security
@pytest.mark.integration
def test_estudiante_no_puede_crear_certificado(client, estudiante_headers):
    resp = client.post(
        "/api/v1/certificados/",
        json={
            "estudiante_id": "est-1",
            "estudiante_nombre": "Ana",
            "curso_id": "c-1",
            "curso_titulo": "Curso",
            "docente_id": "doc-1",
        },
        headers=estudiante_headers,
    )
    assert resp.status_code == 403, resp.text


@pytest.mark.integration
def test_listar_certificados(client, db, docente_user, docente_headers):
    _crear_certificado(db, estudiante_id="est-1", curso_titulo="Curso A", docente_id=docente_user.id)
    _crear_certificado(db, estudiante_id="est-2", curso_titulo="Curso B", docente_id=docente_user.id)

    resp = client.get("/api/v1/certificados/", headers=docente_headers)

    assert resp.status_code == 200, resp.text
    titulos = [c["curso_titulo"] for c in resp.json()]
    assert "Curso A" in titulos
    assert "Curso B" in titulos


@pytest.mark.integration
def test_obtener_certificado_por_id(client, db, docente_user, docente_headers):
    cert = _crear_certificado(db, estudiante_id="est-1", curso_titulo="Curso A", docente_id=docente_user.id)

    resp = client.get(f"/api/v1/certificados/{cert.id}", headers=docente_headers)

    assert resp.status_code == 200, resp.text
    assert resp.json()["id"] == str(cert.id)


@pytest.mark.integration
def test_obtener_certificado_inexistente_404(client, docente_headers):
    resp = client.get("/api/v1/certificados/no-existe", headers=docente_headers)
    assert resp.status_code == 404, resp.text


@pytest.mark.integration
def test_actualizar_certificado(client, db, docente_user, docente_headers):
    cert = _crear_certificado(db, estudiante_id="est-1", curso_titulo="Curso A", docente_id=docente_user.id)

    resp = client.put(
        f"/api/v1/certificados/{cert.id}",
        json={"curso_titulo": "Curso A (actualizado)", "url": "https://example.com/cert.pdf"},
        headers=docente_headers,
    )

    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["curso_titulo"] == "Curso A (actualizado)"
    assert data["url"] == "https://example.com/cert.pdf"


@pytest.mark.integration
def test_eliminar_certificado_soft_delete(client, db, docente_user, docente_headers):
    cert = _crear_certificado(db, estudiante_id="est-1", docente_id=docente_user.id)

    resp = client.delete(f"/api/v1/certificados/{cert.id}", headers=docente_headers)

    assert resp.status_code == 200, resp.text
    assert resp.json()["ok"] is True

    db.expire_all()
    actualizado = db.query(Certificado).filter(Certificado.id == cert.id).first()
    assert actualizado is not None, "El soft-delete no debe borrar el registro"
    assert actualizado.estado == "cancelado"


# =====================================================
# 2. ESTUDIANTE LISTA SUS CERTIFICADOS
# =====================================================

@pytest.mark.integration
def test_estudiante_lista_sus_certificados(
    client, db, docente_user, estudiante_user, otro_docente_user, estudiante_headers
):
    _crear_certificado(db, estudiante_id=estudiante_user.id, curso_titulo="Mi Curso")
    _crear_certificado(db, estudiante_id=otro_docente_user.id, curso_titulo="Curso Ajeno")

    resp = client.get(
        f"/api/v1/certificados/?estudiante_id={estudiante_user.id}",
        headers=estudiante_headers,
    )

    assert resp.status_code == 200, resp.text
    cursos = [c["curso_titulo"] for c in resp.json()]
    assert "Mi Curso" in cursos
    assert "Curso Ajeno" not in cursos


@pytest.mark.security
@pytest.mark.integration
def test_estudiante_no_puede_listar_certificados_de_otro(
    client, db, otro_docente_user, estudiante_headers
):
    _crear_certificado(db, estudiante_id=otro_docente_user.id, curso_titulo="Curso Ajeno")

    resp = client.get(
        f"/api/v1/certificados/?estudiante_id={otro_docente_user.id}",
        headers=estudiante_headers,
    )

    assert resp.status_code == 403, resp.text


# =====================================================
# 3. EMISIÓN AUTOMÁTICA
# =====================================================

@pytest.mark.integration
def test_emision_automatica_al_completar_todas_las_lecciones(
    client, db, docente_user, estudiante_user
):
    """Al completar todas las lecciones de un curso certificable se emite un certificado."""
    from app.api.cursos import _actualizar_progreso_curso

    curso = _crear_curso_certificable(db, docente_user, certificado_habilitado=True)

    db.add(InscripcionCurso(
        id=str(uuid.uuid4()),
        curso_id=str(curso.id),
        estudiante_id=str(estudiante_user.id),
        estudiante_nombre=estudiante_user.nombre_completo,
        progreso=0,
        completado=False,
        lecciones_completadas=[],
    ))
    for leccion_id in ("l1", "l2"):
        db.add(ProgresoLeccion(
            id=str(uuid.uuid4()),
            curso_id=str(curso.id),
            estudiante_id=str(estudiante_user.id),
            leccion_id=leccion_id,
            modulo_id="m1",
            completado=True,
            fecha_completado=datetime.now(timezone.utc),
        ))
    db.commit()

    _actualizar_progreso_curso(db, str(curso.id), str(estudiante_user.id))

    db.expire_all()
    cert = db.query(Certificado).filter(
        Certificado.curso_id == str(curso.id),
        Certificado.estudiante_id == str(estudiante_user.id),
    ).first()
    assert cert is not None, "Debió emitirse un certificado automático"
    assert cert.estado == "emitido"

    inscripcion = db.query(InscripcionCurso).filter(
        InscripcionCurso.curso_id == str(curso.id),
        InscripcionCurso.estudiante_id == str(estudiante_user.id),
    ).first()
    assert inscripcion.completado is True
    assert inscripcion.progreso == 100


@pytest.mark.integration
def test_no_emite_certificado_si_esta_deshabilitado(
    client, db, docente_user, estudiante_user
):
    from app.api.cursos import _actualizar_progreso_curso

    curso = _crear_curso_certificable(db, docente_user, certificado_habilitado=False)
    db.add(InscripcionCurso(
        id=str(uuid.uuid4()),
        curso_id=str(curso.id),
        estudiante_id=str(estudiante_user.id),
        estudiante_nombre=estudiante_user.nombre_completo,
        progreso=0,
        completado=False,
        lecciones_completadas=[],
    ))
    for leccion_id in ("l1", "l2"):
        db.add(ProgresoLeccion(
            id=str(uuid.uuid4()),
            curso_id=str(curso.id),
            estudiante_id=str(estudiante_user.id),
            leccion_id=leccion_id,
            modulo_id="m1",
            completado=True,
            fecha_completado=datetime.now(timezone.utc),
        ))
    db.commit()

    _actualizar_progreso_curso(db, str(curso.id), str(estudiante_user.id))

    db.expire_all()
    cert = db.query(Certificado).filter(
        Certificado.curso_id == str(curso.id),
        Certificado.estudiante_id == str(estudiante_user.id),
    ).first()
    assert cert is None


# =====================================================
# 4. VALIDACIÓN PÚBLICA (SIN LOGIN)
# =====================================================

@pytest.mark.integration
def test_validacion_publica_sin_login(client, db, docente_user):
    """Cualquier persona (sin token) puede validar un certificado por código."""
    from app.core.certificado_firma import calcular_firma

    fecha = datetime.now(timezone.utc)
    cert = _crear_certificado(db, estudiante_id="est-1", curso_titulo="Curso Python", docente_id=docente_user.id)
    cert.firma = calcular_firma(cert.codigo, cert.estudiante_id, cert.curso_id, cert.fecha_emision)
    db.commit()

    resp = client.get(f"/api/v1/certificados/validar/{cert.codigo}")  # SIN headers

    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["valido"] is True
    assert data["codigo"] == cert.codigo
    assert data["estudiante_nombre"] == "Estudiante Test"
    assert data["curso_titulo"] == "Curso Python"
    assert data["firma_verificada"] is True
    assert "emitido_por" in data
    # ✅ NO debe exponer IDs internos
    assert "estudiante_id" not in data
    assert "docente_id" not in data
    assert "id" not in data


@pytest.mark.integration
def test_validacion_publica_no_encontrado(client):
    resp = client.get("/api/v1/certificados/validar/CERT-NOEXISTE-999")
    assert resp.status_code == 200
    data = resp.json()
    assert data["valido"] is False
    assert "no encontrado" in data["motivo"].lower()


@pytest.mark.security
@pytest.mark.integration
def test_validacion_publica_certificado_cancelado(client, db, docente_user):
    cert = _crear_certificado(
        db, estudiante_id="est-1", docente_id=docente_user.id, estado="cancelado"
    )
    resp = client.get(f"/api/v1/certificados/validar/{cert.codigo}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["valido"] is False
    assert "cancelado" in data["motivo"].lower()


@pytest.mark.security
@pytest.mark.integration
def test_validacion_publica_firma_invalida(client, db, docente_user):
    """Un certificado con firma alterada no debe validar."""
    cert = _crear_certificado(db, estudiante_id="est-1", docente_id=docente_user.id)
    cert.firma = "a" * 64  # firma falsa
    db.commit()

    resp = client.get(f"/api/v1/certificados/validar/{cert.codigo}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["valido"] is False
    assert data["firma_verificada"] is False


@pytest.mark.integration
def test_firma_hmac_unica_por_certificado():
    """Dos certificados con distinto código deben tener firmas distintas."""
    from app.core.certificado_firma import calcular_firma

    f1 = calcular_firma("CERT-A", "est-1", "curso-1", "2026-01-01T00:00:00")
    f2 = calcular_firma("CERT-B", "est-1", "curso-1", "2026-01-01T00:00:00")
    f1b = calcular_firma("CERT-A", "est-1", "curso-1", "2026-01-01T00:00:00")

    assert f1 != f2, "Distinto código → distinta firma"
    assert f1 == f1b, "Mismos datos → misma firma (determinista)"
    assert len(f1) == 64, "SHA256 hex = 64 chars"


@pytest.mark.integration
def test_emision_automatica_incluye_firma(client, db, docente_user, estudiante_user):
    """La emisión automática al completar curso también debe firmar."""
    from app.api.cursos import _actualizar_progreso_curso

    curso = _crear_curso_certificable(db, docente_user, certificado_habilitado=True)
    db.add(InscripcionCurso(
        id=str(uuid.uuid4()),
        curso_id=str(curso.id),
        estudiante_id=str(estudiante_user.id),
        estudiante_nombre=estudiante_user.nombre_completo,
        progreso=0,
        completado=False,
        lecciones_completadas=[],
    ))
    for leccion_id in ("l1", "l2"):
        db.add(ProgresoLeccion(
            id=str(uuid.uuid4()),
            curso_id=str(curso.id),
            estudiante_id=str(estudiante_user.id),
            leccion_id=leccion_id,
            modulo_id="m1",
            completado=True,
            fecha_completado=datetime.now(timezone.utc),
        ))
    db.commit()

    _actualizar_progreso_curso(db, str(curso.id), str(estudiante_user.id))
    db.expire_all()

    cert = db.query(Certificado).filter(
        Certificado.curso_id == str(curso.id),
        Certificado.estudiante_id == str(estudiante_user.id),
    ).first()
    assert cert is not None
    assert cert.firma, "La emisión automática debe incluir firma HMAC"
