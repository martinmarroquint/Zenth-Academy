# back/tests/test_alumnos.py
# =====================================================
# TESTS DE CATÁLOGO DE ALUMNOS (carga masiva)
#   - El front y las cargas por CSV mandan email: '' (no null).
#     Antes EmailStr lo rechazaba → 422 en TODO el lote y la UI lo
#     escondía como "modo offline": el admin creía que había guardado.
# =====================================================

import uuid

import pytest

from app.models.alumno import Alumno
from app.models.certificado import Certificado
from app.models.curso import Curso, InscripcionCurso
from app.models.examen import Examen
from app.models.resultado_examen import ResultadoExamen


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


MODULOS_2_LECCIONES = [
    {
        "id": "m1",
        "titulo": "Modulo 1",
        "lecciones": [
            {"id": "l1", "titulo": "Leccion 1", "tipo": "texto"},
            {"id": "l2", "titulo": "Leccion 2", "tipo": "texto"},
        ],
    }
]


def _crear_curso(db, docente):
    curso = Curso(
        id=str(uuid.uuid4()),
        titulo="Curso de la ficha",
        descripcion="Curso para probar la ficha del alumno",
        categoria="general",
        nivel="principiante",
        docente_id=str(docente.id),
        docente_nombre="Docente Ficha",
        precio_tipo="gratis",
        moneda="PEN",
        estado="PUBLICADO",
        modulos=MODULOS_2_LECCIONES,
        tipo_bloqueo="ninguno",
        bloqueo_config={},
        estudiantes_count=0,
        rating=0,
        rating_count=0,
        etiquetas=[],
        requisitos=[],
        objetivos=[],
    )
    db.add(curso)
    db.commit()
    db.refresh(curso)
    return curso


def _inscribir(client, curso_id, headers):
    resp = client.post(f"/api/v1/cursos/{curso_id}/inscribirse", headers=headers)
    assert resp.status_code == 200, resp.text
    return resp


@pytest.mark.integration
def test_ficha_propia_devuelve_identidad_y_trayectoria(
    client, db, docente_user, docente_headers, estudiante_user, estudiante_headers
):
    """La ficha concentra identidad, cursos con progreso y notas, exámenes
    (con aprobación según el umbral del examen) y certificados."""
    curso = _crear_curso(db, docente_user)
    _inscribir(client, curso.id, estudiante_headers)

    db.add(
        Alumno(
            id=str(estudiante_user.id),
            usuario_id=str(estudiante_user.id),
            nombres="Ana",
            apellidos="Perez",
            dni="12345678",
            grado="5to",
        )
    )
    db.add(
        Examen(
            id="ex-ficha",
            codigo="FICHA-1",
            titulo="Examen de la ficha",
            tiempo_limite=30,
            puntaje_aprobacion=60.0,
            estado="PUBLICADO",
            docente_id=str(docente_user.id),
        )
    )
    db.commit()

    resp = client.post(
        f"/api/v1/cursos/{curso.id}/lecciones/l1/completar",
        json={"usuario_id": str(estudiante_user.id)},
        headers=estudiante_headers,
    )
    assert resp.status_code == 200, resp.text

    resp = client.put(
        f"/api/v1/cursos/{curso.id}/calificaciones/{estudiante_user.id}/l1",
        json={"nota": 15},
        headers=docente_headers,
    )
    assert resp.status_code == 200, resp.text

    db.add(
        ResultadoExamen(
            id=str(uuid.uuid4()),
            examen_id="ex-ficha",
            alumno_id=str(estudiante_user.id),
            alumno_id_unificado=str(estudiante_user.id),
            alumno_nombre="Ana Perez",
            respuestas={},
            calificacion=75.0,
            correctas=3,
            total_preguntas=4,
            estado="COMPLETADO",
        )
    )
    db.add(
        Certificado(
            id=str(uuid.uuid4()),
            codigo="CERT-FICHA-1",
            estudiante_id=str(estudiante_user.id),
            estudiante_nombre="Ana Perez",
            curso_id=str(curso.id),
            curso_titulo="Curso de la ficha",
            docente_id=str(docente_user.id),
            estado="emitido",
        )
    )
    db.commit()

    resp = client.get(
        f"/api/v1/alumnos/{estudiante_user.id}/ficha", headers=docente_headers
    )

    assert resp.status_code == 200, resp.text
    data = resp.json()

    # Identidad trazable
    assert data["alumno"]["dni"] == "12345678"
    assert data["alumno"]["grado"] == "5to"
    assert data["alumno"]["cuenta_registrada"] is True
    assert data["alumno"]["nombre_completo"] == "Ana Perez"

    # Curso con progreso real y nota de lección (escala 0-20)
    assert len(data["cursos"]) == 1
    curso_ficha = data["cursos"][0]
    assert curso_ficha["progreso"] == 50
    assert curso_ficha["lecciones_completadas"] == 1
    assert curso_ficha["notas_registradas"] == 1
    assert curso_ficha["promedio_notas"] == 15.0

    # Examen en escala 0-100, aprobado según puntaje_aprobacion (60)
    assert len(data["examenes"]) == 1
    assert data["examenes"][0]["calificacion"] == 75.0
    assert data["examenes"][0]["aprobado"] is True

    assert len(data["certificados"]) == 1
    assert data["certificados"][0]["codigo"] == "CERT-FICHA-1"

    resumen = data["resumen"]
    assert resumen["cursos_inscritos"] == 1
    assert resumen["examenes_rendidos"] == 1
    assert resumen["examenes_aprobados"] == 1
    assert resumen["certificados_emitidos"] == 1


@pytest.mark.security
@pytest.mark.integration
def test_ficha_de_alumno_ajeno_es_403(
    client, db, docente_user, estudiante_user, otro_docente_headers
):
    """Un docente no puede abrir la ficha (con DNI, email y notas) de un
    alumno que solo pertenece a los cursos de otro docente."""
    curso = _crear_curso(db, docente_user)
    db.add(
        InscripcionCurso(
            id=str(uuid.uuid4()),
            curso_id=str(curso.id),
            estudiante_id=str(estudiante_user.id),
            estudiante_nombre="Ana Perez",
        )
    )
    db.commit()

    resp = client.get(
        f"/api/v1/alumnos/{estudiante_user.id}/ficha",
        headers=otro_docente_headers,
    )

    assert resp.status_code == 403, resp.text


@pytest.mark.integration
def test_ficha_admin_puede_ver_alumno_ajeno(
    client, db, docente_user, estudiante_user, admin_headers
):
    curso = _crear_curso(db, docente_user)
    db.add(
        InscripcionCurso(
            id=str(uuid.uuid4()),
            curso_id=str(curso.id),
            estudiante_id=str(estudiante_user.id),
            estudiante_nombre="Ana Perez",
        )
    )
    db.commit()

    resp = client.get(
        f"/api/v1/alumnos/{estudiante_user.id}/ficha", headers=admin_headers
    )

    assert resp.status_code == 200, resp.text
    data = resp.json()
    # El admin ve TODOS los cursos del alumno, no solo los suyos
    assert len(data["cursos"]) == 1


@pytest.mark.integration
def test_ficha_sin_fila_de_catalogo_usa_la_cuenta(
    client, db, docente_user, docente_headers, estudiante_user, estudiante_headers
):
    """Los altas por Google no crean fila en el catálogo Alumno: la ficha se
    resuelve contra Usuario y aun así devuelve datos."""
    curso = _crear_curso(db, docente_user)
    _inscribir(client, curso.id, estudiante_headers)

    resp = client.get(
        f"/api/v1/alumnos/{estudiante_user.id}/ficha", headers=docente_headers
    )

    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["alumno"]["cuenta_registrada"] is True
    assert data["alumno"]["dni"] == ""
    assert data["alumno"]["email"] == "estudiante.test@zenth.test"
    assert data["alumno"]["nombre_completo"] == "Test Estudiante QA"
    assert data["alumno"]["usuario_id"] == str(estudiante_user.id)
    assert len(data["cursos"]) == 1


@pytest.mark.integration
def test_ficha_alumno_de_catalogo_con_acceso_directo(
    client, db, docente_user, docente_headers
):
    """Un alumno de catálogo sin cuenta (usuario_id NULL) también tiene ficha
    si el docente le dio acceso directo a su curso."""
    curso = _crear_curso(db, docente_user)
    alumno = Alumno(
        id=str(uuid.uuid4()),
        usuario_id=None,
        nombres="Luis",
        apellidos="Rios",
        dni="87654321",
        grado="3ro",
    )
    db.add(alumno)
    db.commit()

    resp = client.post(
        f"/api/v1/cursos/{curso.id}/acceso",
        json={"estudiante_id": str(alumno.id)},
        headers=docente_headers,
    )
    assert resp.status_code == 200, resp.text

    resp = client.get(
        f"/api/v1/alumnos/{alumno.id}/ficha", headers=docente_headers
    )

    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["alumno"]["cuenta_registrada"] is False
    assert data["alumno"]["dni"] == "87654321"
    assert data["alumno"]["nombre_completo"] == "Luis Rios"
    assert len(data["cursos"]) == 1


@pytest.mark.security
@pytest.mark.integration
def test_ficha_inexistente_es_404(client, docente_headers):
    resp = client.get(
        "/api/v1/alumnos/id-que-no-existe/ficha", headers=docente_headers
    )
    assert resp.status_code == 404, resp.text


@pytest.mark.security
@pytest.mark.integration
def test_ficha_requiere_rol_docente(client, estudiante_headers):
    resp = client.get(
        "/api/v1/alumnos/otro-id/ficha", headers=estudiante_headers
    )
    assert resp.status_code == 403, resp.text


@pytest.mark.security
@pytest.mark.integration
def test_carga_masiva_solo_admin(client, estudiante_headers):
    resp = client.post(
        "/api/v1/alumnos/masivo",
        json=[{"nombres": "Ana", "apellidos": "Torres"}],
        headers=estudiante_headers,
    )
    assert resp.status_code == 403, resp.text
