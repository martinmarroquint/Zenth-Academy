# back/tests/test_security.py
# =====================================================
# TESTS DE SEGURIDAD (INTEGRACIÓN)
# Verifican los fixes de seguridad del backend:
#   - Tipos de token (access vs refresh)
#   - Aislamiento por rol y por ownership
#   - Prevención de auto-calificación y suplantación
# =====================================================

import uuid
from datetime import datetime, timedelta, timezone

import pytest
from jose import jwt

from app.core.security import SECRET_KEY, ALGORITHM
from app.models.curso import Curso, ProgresoLeccion
from app.models.examen import Examen


# =====================================================
# HELPERS PARA DATOS DE PRUEBA
# =====================================================

def _crear_examen(db, docente_id, estado="PUBLICADO", titulo="Examen de prueba"):
    """Inserta un Examen directamente en la BD de test."""
    examen = Examen(
        id=str(uuid.uuid4()),
        codigo=f"EXA-TEST-{uuid.uuid4().hex[:8]}",
        titulo=titulo,
        descripcion="",
        tiempo_limite=60,
        puntaje_aprobacion=60.0,
        estado=estado,
        configuracion={},
        intentos_permitidos=1,
        grupo_id=None,
        docente_id=str(docente_id) if docente_id else None,
    )
    db.add(examen)
    db.commit()
    db.refresh(examen)
    return examen


def _crear_curso(db, docente_id, leccion_id="leccion-1"):
    """Inserta un Curso con una lección embebida en `modulos`."""
    curso = Curso(
        id=str(uuid.uuid4()),
        titulo="Curso de prueba",
        descripcion="",
        docente_id=str(docente_id) if docente_id else None,
        estado="publicado",
        modulos=[
            {
                "id": "modulo-1",
                "titulo": "Módulo 1",
                "lecciones": [
                    {"id": leccion_id, "titulo": "Lección 1", "tipo": "video"}
                ],
            }
        ],
    )
    db.add(curso)
    db.commit()
    db.refresh(curso)
    return curso


# =====================================================
# 1. REFRESH TOKEN NO SIRVE COMO ACCESS TOKEN
# =====================================================

@pytest.mark.security
@pytest.mark.integration
def test_refresh_token_no_sirve_como_access_token(
    client, estudiante_user, refresh_token_para
):
    """Un refresh token usado como Bearer debe ser rechazado (401)."""
    token = refresh_token_para(estudiante_user)
    resp = client.get(
        "/api/v1/cursos/mis-cursos",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 401, resp.text


# =====================================================
# 2. TOKEN MALFORMADO
# =====================================================

@pytest.mark.security
@pytest.mark.integration
def test_token_malformado_devuelve_401(client):
    """Un Bearer que no es un JWT debe devolver 401."""
    resp = client.get(
        "/api/v1/cursos/mis-cursos",
        headers={"Authorization": "Bearer esto.no.es.un.jwt"},
    )
    assert resp.status_code == 401, resp.text


# =====================================================
# 3. TOKEN SIN CAMPO `type`
# =====================================================

@pytest.mark.security
@pytest.mark.integration
def test_token_sin_type_devuelve_401(client, estudiante_user):
    """Un JWT válido pero sin `type` debe ser rechazado (401)."""
    payload = {
        "sub": str(estudiante_user.id),
        "rol": estudiante_user.rol,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=5),
    }
    token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
    resp = client.get(
        "/api/v1/cursos/mis-cursos",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 401, resp.text


# =====================================================
# 4. ESTUDIANTE NO PUEDE ENVIAR RESULTADO COMO OTRO ALUMNO
# =====================================================

@pytest.mark.security
@pytest.mark.integration
def test_estudiante_no_puede_enviar_resultado_como_otro(
    client, db, docente_user, estudiante_user, estudiante_headers
):
    """POST /resultados con alumno_id ajeno debe dar 403 (anti-suplantación)."""
    examen = _crear_examen(db, docente_user.id, estado="PUBLICADO")
    otro_alumno_id = str(uuid.uuid4())

    resp = client.post(
        "/api/v1/examenes/resultados",
        headers=estudiante_headers,
        json={
            "examen_id": examen.id,
            "alumno_id": otro_alumno_id,
            "alumno_nombre": "Otro Alumno",
            "respuestas": {},
        },
    )
    assert resp.status_code == 403, resp.text


# =====================================================
# 5. ESTUDIANTE NO PUEDE VER RESULTADOS DE OTRO ALUMNO
# =====================================================

@pytest.mark.security
@pytest.mark.integration
def test_estudiante_no_puede_ver_resultados_de_otro(
    client, estudiante_headers
):
    """GET /resultados/alumno/{otro_id} debe dar 403."""
    otro_alumno_id = str(uuid.uuid4())
    resp = client.get(
        f"/api/v1/examenes/resultados/alumno/{otro_alumno_id}",
        headers=estudiante_headers,
    )
    assert resp.status_code == 403, resp.text


# =====================================================
# 6. DOCENTE NO PUEDE MODIFICAR EXAMEN DE OTRO DOCENTE
# =====================================================

@pytest.mark.security
@pytest.mark.integration
def test_docente_no_modifica_examen_de_otro_put(
    client, db, otro_docente_user, docente_headers
):
    examen = _crear_examen(db, otro_docente_user.id, estado="BORRADOR")
    resp = client.put(
        f"/api/v1/examenes/{examen.id}",
        headers=docente_headers,
        json={"titulo": "Hackeado", "preguntas": []},
    )
    assert resp.status_code == 403, resp.text


@pytest.mark.security
@pytest.mark.integration
def test_docente_no_modifica_examen_de_otro_delete(
    client, db, otro_docente_user, docente_headers
):
    examen = _crear_examen(db, otro_docente_user.id, estado="BORRADOR")
    resp = client.delete(
        f"/api/v1/examenes/{examen.id}",
        headers=docente_headers,
    )
    assert resp.status_code == 403, resp.text


@pytest.mark.security
@pytest.mark.integration
def test_docente_no_modifica_estado_de_examen_de_otro(
    client, db, otro_docente_user, docente_headers
):
    examen = _crear_examen(db, otro_docente_user.id, estado="BORRADOR")
    resp = client.put(
        f"/api/v1/examenes/{examen.id}/estado",
        headers=docente_headers,
        params={"estado": "PUBLICADO"},
    )
    assert resp.status_code == 403, resp.text


# =====================================================
# 7. ADMIN SÍ PUEDE MODIFICAR CUALQUIER EXAMEN
# =====================================================

@pytest.mark.security
@pytest.mark.integration
def test_admin_si_modifica_examen_de_cualquier_docente(
    client, db, otro_docente_user, admin_headers
):
    examen = _crear_examen(db, otro_docente_user.id, estado="BORRADOR")
    resp = client.put(
        f"/api/v1/examenes/{examen.id}",
        headers=admin_headers,
        json={"titulo": "Editado por admin", "preguntas": []},
    )
    assert resp.status_code != 403, resp.text
    assert resp.status_code == 200, resp.text


# =====================================================
# 8. ESTUDIANTE NO PUEDE AUTO-CALIFICARSE
# =====================================================

@pytest.mark.security
@pytest.mark.integration
def test_estudiante_no_puede_auto_calificarse(
    client, db, docente_user, estudiante_user, estudiante_headers
):
    """La nota/aprobado enviados por un estudiante NO deben persistirse."""
    leccion_id = "leccion-auto-nota"
    curso = _crear_curso(db, docente_user.id, leccion_id=leccion_id)

    resp = client.post(
        f"/api/v1/cursos/{curso.id}/lecciones/{leccion_id}/progreso",
        headers=estudiante_headers,
        json={"nota": 20, "aprobado": True},
    )
    assert resp.status_code == 200, resp.text

    db.expire_all()
    progreso = (
        db.query(ProgresoLeccion)
        .filter(
            ProgresoLeccion.curso_id == curso.id,
            ProgresoLeccion.estudiante_id == str(estudiante_user.id),
            ProgresoLeccion.leccion_id == leccion_id,
        )
        .first()
    )
    assert progreso is not None, "El endpoint debió crear el registro de progreso"
    assert progreso.nota is None, "El estudiante NO debe poder fijar su propia nota"
    assert progreso.aprobado is False, "El estudiante NO debe poder auto-aprobarse"


# =====================================================
# 9. ENDPOINTS PROTEGIDOS RECHAZAN SIN TOKEN
# =====================================================

@pytest.mark.security
@pytest.mark.integration
@pytest.mark.parametrize(
    "method,url",
    [
        ("get", "/api/v1/cursos/mis-cursos"),
        ("get", "/api/v1/examenes/"),
        ("post", "/api/v1/examenes/"),
        ("post", "/api/v1/cursos/"),
        ("get", "/api/v1/examenes/resultados/alumno/algun-id"),
        ("get", "/api/v1/examenes/grupos"),
    ],
)
def test_endpoints_protegidos_rechazan_sin_token(client, method, url):
    resp = getattr(client, method)(url)
    assert resp.status_code == 401, resp.text


# =====================================================
# 10. ESTUDIANTE NO PUEDE ACCEDER A ENDPOINTS DE DOCENTE
# =====================================================

@pytest.mark.security
@pytest.mark.integration
def test_estudiante_no_puede_crear_curso(client, estudiante_headers):
    resp = client.post(
        "/api/v1/cursos/",
        headers=estudiante_headers,
        json={"titulo": "Curso del estudiante"},
    )
    assert resp.status_code == 403, resp.text


@pytest.mark.security
@pytest.mark.integration
def test_estudiante_no_puede_crear_examen(client, estudiante_headers):
    resp = client.post(
        "/api/v1/examenes/",
        headers=estudiante_headers,
        json={"titulo": "Examen del estudiante", "preguntas": []},
    )
    assert resp.status_code == 403, resp.text
