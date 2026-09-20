# back/tests/test_e2e_cursos.py
# =====================================================
# TESTS END-TO-END DEL FLUJO COMPLETO DE CURSOS
# Simulan el recorrido de un usuario real usando SOLO la API HTTP
# (TestClient), igual que lo haría el frontend. Los modelos de BD solo
# se consultan al final para verificar persistencia, nunca para actuar.
# =====================================================

import pytest

from app.models.curso import (
    AccesoCurso,
    Curso,
    InscripcionCurso,
    ProgresoLeccion,
    SolicitudAccesoCurso,
)

pytestmark = [pytest.mark.integration, pytest.mark.e2e]

BASE = "/api/v1/cursos"


# =============================================
# HELPERS (todo pasa por HTTP)
# =============================================

def _modulos_2x2():
    """2 módulos con 2 lecciones cada uno: m1(l1,l2), m2(l3,l4)."""
    return [
        {
            "id": "m1",
            "titulo": "Módulo 1",
            "lecciones": [
                {"id": "l1", "titulo": "Lección 1", "tipo": "texto"},
                {"id": "l2", "titulo": "Lección 2", "tipo": "texto"},
            ],
        },
        {
            "id": "m2",
            "titulo": "Módulo 2",
            "lecciones": [
                {"id": "l3", "titulo": "Lección 3", "tipo": "texto"},
                {"id": "l4", "titulo": "Lección 4", "tipo": "texto"},
            ],
        },
    ]


def _modulos_1x2():
    """1 módulo con 2 lecciones: m1(l1,l2)."""
    return [
        {
            "id": "m1",
            "titulo": "Módulo 1",
            "lecciones": [
                {"id": "l1", "titulo": "Lección 1", "tipo": "texto"},
                {"id": "l2", "titulo": "Lección 2", "tipo": "texto"},
            ],
        }
    ]


def _crear_curso(client, headers, **overrides):
    payload = {
        "titulo": "Curso E2E",
        "descripcion": "Curso creado por el test end-to-end",
        "categoria": "programacion",
        "nivel": "principiante",
        "precio_tipo": "gratis",
        "modulos": _modulos_2x2(),
    }
    payload.update(overrides)
    return client.post(f"{BASE}/", json=payload, headers=headers)


def _publicar(client, curso_id, headers):
    return client.post(f"{BASE}/{curso_id}/publicar", headers=headers)


def _inscribir(client, curso_id, headers):
    return client.post(f"{BASE}/{curso_id}/inscribirse", headers=headers)


def _completar(client, curso_id, leccion_id, usuario_id, headers):
    return client.post(
        f"{BASE}/{curso_id}/lecciones/{leccion_id}/completar",
        json={"usuario_id": str(usuario_id)},
        headers=headers,
    )


def _progreso(client, curso_id, usuario_id, headers):
    return client.get(f"{BASE}/{curso_id}/progreso/{usuario_id}", headers=headers)


def _tiene_acceso(client, curso_id, usuario_id, headers):
    return client.get(f"{BASE}/{curso_id}/tiene-acceso/{usuario_id}", headers=headers)


def _estado_bloqueo(client, curso_id, leccion_id, headers):
    return client.get(f"{BASE}/{curso_id}/leccion/{leccion_id}/estado-bloqueo", headers=headers)


def _estudiantes(client, curso_id, headers):
    return client.get(f"{BASE}/{curso_id}/estudiantes", headers=headers)


# =============================================
# ESCENARIO PRINCIPAL (happy path completo)
# =============================================

def test_e2e_flujo_completo_curso_gratis(
    client, db, docente_user, estudiante_user, docente_headers, estudiante_headers
):
    # --- 1. Docente crea el curso (borrador) ---
    r = _crear_curso(client, docente_headers)
    assert r.status_code == 201, r.text
    curso = r.json()
    curso_id = curso["id"]
    assert curso["estado"] == "BORRADOR", curso
    assert curso["precio_tipo"] == "gratis", curso
    assert curso["docente_id"] == str(docente_user.id), curso
    assert len(curso["modulos"]) == 2, curso
    leccion_ids = [lec["id"] for m in curso["modulos"] for lec in m["lecciones"]]
    assert leccion_ids == ["l1", "l2", "l3", "l4"], leccion_ids

    # --- 2. Docente publica el curso ---
    r = _publicar(client, curso_id, docente_headers)
    assert r.status_code == 200, r.text
    assert r.json()["estado"] == "PUBLICADO", r.json()

    # --- 3. Estudiante ve el curso en el listado público ---
    r = client.get(f"{BASE}/", params={"estado": "publicado"}, headers=estudiante_headers)
    assert r.status_code == 200, r.text
    assert curso_id in [c["id"] for c in r.json()], "El curso publicado no aparece en el listado"

    # --- 4. Estudiante se inscribe ---
    r = _inscribir(client, curso_id, estudiante_headers)
    assert r.status_code == 200, r.text
    assert r.json()["progreso"] == 0, r.json()
    assert r.json()["completado"] is False, r.json()

    # --- 5. Verifica que tiene acceso ---
    r = _tiene_acceso(client, curso_id, estudiante_user.id, estudiante_headers)
    assert r.status_code == 200, r.text
    assert r.json()["tiene_acceso"] is True, r.json()

    # --- 6. Completa la lección l1 ---
    r = _completar(client, curso_id, "l1", estudiante_user.id, estudiante_headers)
    assert r.status_code == 200, r.text
    assert r.json()["completado"] is True, r.json()

    # --- 7. Progreso = 25% (1 de 4) ---
    r = _progreso(client, curso_id, estudiante_user.id, estudiante_headers)
    assert r.status_code == 200, r.text
    assert r.json()["progreso"] == 25, r.json()
    assert r.json()["completado"] is False, r.json()

    # --- 8. Completa el resto de lecciones ---
    for leccion_id in ["l2", "l3", "l4"]:
        r = _completar(client, curso_id, leccion_id, estudiante_user.id, estudiante_headers)
        assert r.status_code == 200, r.text
        assert r.json()["completado"] is True, r.json()

    # --- 9. Progreso = 100% y completado=True ---
    r = _progreso(client, curso_id, estudiante_user.id, estudiante_headers)
    assert r.status_code == 200, r.text
    assert r.json()["progreso"] == 100, r.json()
    assert r.json()["completado"] is True, r.json()

    # --- 10. Docente ve al estudiante con progreso 100 ---
    r = _estudiantes(client, curso_id, docente_headers)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["total_estudiantes"] == 1, data
    est = data["estudiantes"][0]
    assert est["estudiante_id"] == str(estudiante_user.id), est
    assert est["progreso"] == 100, est
    assert est["completado"] is True, est
    assert est["lecciones_completadas"] == 4, est
    assert est["lecciones_totales"] == 4, est

    # --- Verificación final de persistencia en BD (solo lectura) ---
    db.expire_all()
    inscripcion = db.query(InscripcionCurso).filter(
        InscripcionCurso.curso_id == curso_id,
        InscripcionCurso.estudiante_id == str(estudiante_user.id),
    ).first()
    assert inscripcion is not None
    assert inscripcion.progreso == 100
    assert inscripcion.completado is True
    completadas = db.query(ProgresoLeccion).filter(
        ProgresoLeccion.curso_id == curso_id,
        ProgresoLeccion.estudiante_id == str(estudiante_user.id),
        ProgresoLeccion.completado == True,  # noqa: E712
    ).count()
    assert completadas == 4, f"Se esperaban 4 lecciones completadas, hay {completadas}"


# =============================================
# ESCENARIO: CURSO DE PAGO CON SOLICITUD DE ACCESO
# =============================================

def test_e2e_curso_pago_con_solicitud_y_aprobacion(
    client, db, docente_user, estudiante_user, docente_headers, estudiante_headers
):
    # --- 1. Docente crea curso de pago ---
    r = _crear_curso(
        client,
        docente_headers,
        titulo="Curso Pago E2E",
        precio_tipo="pago",
        precio_monto=50,
    )
    assert r.status_code == 201, r.text
    curso_id = r.json()["id"]
    assert r.json()["precio_tipo"] == "pago", r.json()
    assert float(r.json()["precio_monto"]) == 50.0, r.json()

    # --- 2. Docente lo publica ---
    r = _publicar(client, curso_id, docente_headers)
    assert r.status_code == 200, r.text

    # --- 3. Estudiante intenta inscribirse directo -> 403 ---
    r = _inscribir(client, curso_id, estudiante_headers)
    assert r.status_code == 403, r.text

    # --- 4. Estudiante solicita acceso ---
    r = client.post(
        f"{BASE}/{curso_id}/solicitar-acceso",
        json={
            "mensaje_estudiante": "Ya realicé el pago por Yape",
            "metodo_pago": "yape",
            "referencia_pago": "REF-E2E-001",
        },
        headers=estudiante_headers,
    )
    assert r.status_code in (200, 201), r.text
    solicitud = r.json()
    assert solicitud["estado"] == "pendiente", solicitud
    assert solicitud["curso_id"] == curso_id, solicitud

    # --- 5. Aparece en mis-solicitudes del estudiante ---
    r = client.get(f"{BASE}/mis-solicitudes", headers=estudiante_headers)
    assert r.status_code == 200, r.text
    assert solicitud["id"] in [s["id"] for s in r.json()], "La solicitud no aparece en mis-solicitudes"

    # --- 6. Docente ve la solicitud pendiente ---
    r = client.get(f"{BASE}/solicitudes-pendientes", headers=docente_headers)
    assert r.status_code == 200, r.text
    assert solicitud["id"] in [s["id"] for s in r.json()], "La solicitud no aparece en solicitudes-pendientes"

    # --- 7. Docente aprueba la solicitud ---
    r = client.post(
        f"{BASE}/solicitudes/{solicitud['id']}/aprobar",
        json={"estado": "aprobado", "comentario_docente": "Pago verificado"},
        headers=docente_headers,
    )
    assert r.status_code == 200, r.text
    assert r.json()["estado"] == "aprobado", r.json()

    # --- 8. Ahora el estudiante tiene acceso ---
    r = _tiene_acceso(client, curso_id, estudiante_user.id, estudiante_headers)
    assert r.status_code == 200, r.text
    assert r.json()["tiene_acceso"] is True, r.json()

    # --- 9. Estudiante se inscribe (ahora sí) ---
    r = _inscribir(client, curso_id, estudiante_headers)
    assert r.status_code == 200, r.text
    assert r.json()["curso_id"] == curso_id, r.json()

    # Verificación de persistencia
    db.expire_all()
    assert db.query(AccesoCurso).filter(
        AccesoCurso.curso_id == curso_id,
        AccesoCurso.estudiante_id == str(estudiante_user.id),
        AccesoCurso.activo == True,  # noqa: E712
    ).first() is not None
    assert db.query(InscripcionCurso).filter(
        InscripcionCurso.curso_id == curso_id,
        InscripcionCurso.estudiante_id == str(estudiante_user.id),
    ).first() is not None


# =============================================
# ESCENARIO: BLOQUEO SECUENCIAL
# =============================================

def test_e2e_bloqueo_secuencial(
    client, docente_user, estudiante_user, docente_headers, estudiante_headers
):
    # --- 1. Docente crea curso secuencial con 2 lecciones y lo publica ---
    r = _crear_curso(
        client,
        docente_headers,
        titulo="Curso Secuencial E2E",
        tipo_bloqueo="secuencial",
        modulos=_modulos_1x2(),
    )
    assert r.status_code == 201, r.text
    curso_id = r.json()["id"]
    assert r.json()["tipo_bloqueo"] == "secuencial", r.json()

    r = _publicar(client, curso_id, docente_headers)
    assert r.status_code == 200, r.text

    # --- 2. Estudiante se inscribe ---
    r = _inscribir(client, curso_id, estudiante_headers)
    assert r.status_code == 200, r.text

    # --- 3. l2 está bloqueada ---
    r = _estado_bloqueo(client, curso_id, "l2", estudiante_headers)
    assert r.status_code == 200, r.text
    assert r.json()["bloqueada"] is True, r.json()
    assert "l1" in (r.json().get("lecciones_requeridas") or []), r.json()

    # No puede completarla estando bloqueada
    r = _completar(client, curso_id, "l2", estudiante_user.id, estudiante_headers)
    assert r.status_code == 403, r.text

    # --- 4. Completa l1 ---
    r = _completar(client, curso_id, "l1", estudiante_user.id, estudiante_headers)
    assert r.status_code == 200, r.text

    # --- 5. l2 se desbloquea ---
    r = _estado_bloqueo(client, curso_id, "l2", estudiante_headers)
    assert r.status_code == 200, r.text
    assert r.json()["bloqueada"] is False, r.json()


# =============================================
# ESCENARIO: DOCENTE GESTIONA ESTUDIANTE
# =============================================

def test_e2e_docente_desinscribe_estudiante(
    client, db, docente_user, estudiante_user, docente_headers, estudiante_headers
):
    r = _crear_curso(client, docente_headers, titulo="Curso Gestión E2E")
    assert r.status_code == 201, r.text
    curso_id = r.json()["id"]

    r = _publicar(client, curso_id, docente_headers)
    assert r.status_code == 200, r.text
    r = _inscribir(client, curso_id, estudiante_headers)
    assert r.status_code == 200, r.text
    r = _completar(client, curso_id, "l1", estudiante_user.id, estudiante_headers)
    assert r.status_code == 200, r.text

    # El estudiante aparece en la lista del docente
    r = _estudiantes(client, curso_id, docente_headers)
    assert r.status_code == 200, r.text
    assert r.json()["total_estudiantes"] == 1, r.json()

    # --- Docente lo desinscribe ---
    r = client.delete(
        f"{BASE}/{curso_id}/inscripcion/{estudiante_user.id}",
        headers=docente_headers,
    )
    assert r.status_code == 200, r.text
    assert r.json()["ok"] is True, r.json()

    # --- Ya no aparece en la lista ---
    r = _estudiantes(client, curso_id, docente_headers)
    assert r.status_code == 200, r.text
    assert r.json()["total_estudiantes"] == 0, r.json()
    assert str(estudiante_user.id) not in [
        e["estudiante_id"] for e in r.json()["estudiantes"]
    ], r.json()

    # --- Y perdió el acceso ---
    r = _tiene_acceso(client, curso_id, estudiante_user.id, estudiante_headers)
    assert r.status_code == 200, r.text
    assert r.json()["tiene_acceso"] is False, r.json()

    # Verificación de persistencia: se limpiaron inscripción, acceso y progreso
    db.expire_all()
    assert db.query(InscripcionCurso).filter(
        InscripcionCurso.curso_id == curso_id,
        InscripcionCurso.estudiante_id == str(estudiante_user.id),
    ).first() is None
    assert db.query(AccesoCurso).filter(
        AccesoCurso.curso_id == curso_id,
        AccesoCurso.estudiante_id == str(estudiante_user.id),
    ).first() is None
    assert db.query(ProgresoLeccion).filter(
        ProgresoLeccion.curso_id == curso_id,
        ProgresoLeccion.estudiante_id == str(estudiante_user.id),
    ).first() is None


# =============================================
# ESCENARIO: AISLAMIENTO ENTRE DOCENTES
# =============================================

def test_e2e_aislamiento_entre_docentes(
    client, db, docente_user, docente_headers, otro_docente_headers
):
    # --- 1. Docente A crea el curso ---
    r = _crear_curso(client, docente_headers, titulo="Curso Privado A")
    assert r.status_code == 201, r.text
    curso_id = r.json()["id"]
    assert r.json()["docente_id"] == str(docente_user.id), r.json()

    # --- 2. Docente B intenta publicarlo -> 403 ---
    r = _publicar(client, curso_id, otro_docente_headers)
    assert r.status_code == 403, r.text

    # --- 3. Docente B intenta eliminarlo -> 403 ---
    r = client.delete(f"{BASE}/{curso_id}", headers=otro_docente_headers)
    assert r.status_code == 403, r.text

    # Extras de ownership: editar y ver estudiantes también prohibidos
    r = client.put(f"{BASE}/{curso_id}", json={"titulo": "Hackeado"}, headers=otro_docente_headers)
    assert r.status_code == 403, r.text
    r = _estudiantes(client, curso_id, otro_docente_headers)
    assert r.status_code == 403, r.text

    # El curso sigue existiendo e intacto
    db.expire_all()
    curso = db.query(Curso).filter(Curso.id == curso_id).first()
    assert curso is not None
    assert curso.titulo == "Curso Privado A"
    assert curso.estado.upper() == "BORRADOR"

    # --- Docente A sí puede publicarlo ---
    r = _publicar(client, curso_id, docente_headers)
    assert r.status_code == 200, r.text
    assert r.json()["estado"] == "PUBLICADO", r.json()


# =============================================
# CASOS BORDE
# =============================================

def test_e2e_estudiante_no_puede_crear_curso(client, estudiante_headers):
    r = _crear_curso(client, estudiante_headers, titulo="Intento estudiante")
    assert r.status_code == 403, r.text


def test_e2e_curso_borrador_no_aparece_en_listado_publico(
    client, docente_headers, estudiante_headers
):
    r = _crear_curso(client, docente_headers, titulo="Borrador oculto")
    assert r.status_code == 201, r.text
    curso_id = r.json()["id"]

    r = client.get(f"{BASE}/", params={"estado": "publicado"}, headers=estudiante_headers)
    assert r.status_code == 200, r.text
    assert curso_id not in [c["id"] for c in r.json()], "Un borrador no debe verse como publicado"


def test_e2e_completar_leccion_sin_inscripcion_devuelve_403(
    client, docente_headers, estudiante_user, estudiante_headers
):
    r = _crear_curso(client, docente_headers, titulo="Sin inscripción")
    assert r.status_code == 201, r.text
    curso_id = r.json()["id"]
    r = _publicar(client, curso_id, docente_headers)
    assert r.status_code == 200, r.text

    r = _completar(client, curso_id, "l1", estudiante_user.id, estudiante_headers)
    assert r.status_code == 403, r.text


def test_e2e_solicitud_duplicada_devuelve_400(
    client, docente_headers, estudiante_headers
):
    r = _crear_curso(
        client, docente_headers, titulo="Pago duplicado", precio_tipo="pago", precio_monto=30
    )
    assert r.status_code == 201, r.text
    curso_id = r.json()["id"]
    r = _publicar(client, curso_id, docente_headers)
    assert r.status_code == 200, r.text

    primera = client.post(
        f"{BASE}/{curso_id}/solicitar-acceso",
        json={"mensaje_estudiante": "Pago 1"},
        headers=estudiante_headers,
    )
    assert primera.status_code in (200, 201), primera.text

    segunda = client.post(
        f"{BASE}/{curso_id}/solicitar-acceso",
        json={"mensaje_estudiante": "Pago 2"},
        headers=estudiante_headers,
    )
    assert segunda.status_code == 400, segunda.text


def test_e2e_solicitar_acceso_a_curso_gratis_devuelve_400(
    client, docente_headers, estudiante_headers
):
    r = _crear_curso(client, docente_headers, titulo="Gratis sin solicitud")
    assert r.status_code == 201, r.text
    curso_id = r.json()["id"]

    r = client.post(
        f"{BASE}/{curso_id}/solicitar-acceso",
        json={"mensaje_estudiante": "Quiero acceso"},
        headers=estudiante_headers,
    )
    assert r.status_code == 400, r.text


def test_e2e_inscribirse_dos_veces_es_idempotente(
    client, docente_headers, estudiante_headers
):
    r = _crear_curso(client, docente_headers, titulo="Inscripción idempotente")
    assert r.status_code == 201, r.text
    curso_id = r.json()["id"]
    r = _publicar(client, curso_id, docente_headers)
    assert r.status_code == 200, r.text

    primera = _inscribir(client, curso_id, estudiante_headers)
    segunda = _inscribir(client, curso_id, estudiante_headers)

    assert primera.status_code == 200, primera.text
    assert segunda.status_code == 200, segunda.text
    assert primera.json()["id"] == segunda.json()["id"], "No debe duplicar la inscripción"


def test_e2e_completar_leccion_inexistente_devuelve_404(
    client, docente_headers, estudiante_user, estudiante_headers
):
    r = _crear_curso(client, docente_headers, titulo="Lección fantasma")
    assert r.status_code == 201, r.text
    curso_id = r.json()["id"]
    r = _publicar(client, curso_id, docente_headers)
    assert r.status_code == 200, r.text
    r = _inscribir(client, curso_id, estudiante_headers)
    assert r.status_code == 200, r.text

    r = _completar(client, curso_id, "no-existe", estudiante_user.id, estudiante_headers)
    assert r.status_code == 404, r.text


def test_e2e_tiene_acceso_falso_para_pago_no_aprobado(
    client, docente_headers, estudiante_user, estudiante_headers
):
    r = _crear_curso(
        client, docente_headers, titulo="Pago no aprobado", precio_tipo="pago", precio_monto=99
    )
    assert r.status_code == 201, r.text
    curso_id = r.json()["id"]

    r = _tiene_acceso(client, curso_id, estudiante_user.id, estudiante_headers)
    assert r.status_code == 200, r.text
    assert r.json()["tiene_acceso"] is False, r.json()
