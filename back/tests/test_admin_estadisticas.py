# back/tests/test_admin_estadisticas.py
# =====================================================
# TESTS DEL PANEL ADMIN: la analítica global debe salir de la BASE
# (antes el dashboard mostraba números inventados)
# =====================================================

import uuid

import pytest

from app.models.curso import Curso, InscripcionCurso, SolicitudAccesoCurso
from app.models.examen import Examen
from app.models.resultado_examen import ResultadoExamen


# =====================================================
# HELPERS
# =====================================================

def _crear_curso(db, docente, *, titulo="Curso", estado="PUBLICADO",
                 precio_tipo="gratis", precio_monto=None):
    curso = Curso(
        id=str(uuid.uuid4()),
        titulo=titulo,
        descripcion="",
        categoria="general",
        nivel="principiante",
        docente_id=str(docente.id),
        docente_nombre=docente.nombre_completo,
        precio_tipo=precio_tipo,
        precio_monto=precio_monto,
        estado=estado,
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


def _inscribir(db, curso, estudiante):
    db.add(InscripcionCurso(
        id=str(uuid.uuid4()),
        curso_id=str(curso.id),
        estudiante_id=str(estudiante.id),
        estudiante_nombre=estudiante.nombre_completo,
        progreso=0,
        completado=False,
        lecciones_completadas=[],
    ))
    db.commit()


def _crear_examen(db, docente, *, puntaje_aprobacion=60.0):
    examen = Examen(
        id=str(uuid.uuid4()),
        codigo=f"EXA-{uuid.uuid4().hex[:8]}",
        titulo="Examen admin",
        descripcion="",
        tiempo_limite=30,
        puntaje_aprobacion=puntaje_aprobacion,
        estado="PUBLICADO",
        configuracion={},
        intentos_permitidos=1,
        grupo_id=None,
        docente_id=str(docente.id),
    )
    db.add(examen)
    db.commit()
    db.refresh(examen)
    return examen


def _resultado(db, examen, alumno_id, calificacion):
    db.add(ResultadoExamen(
        id=str(uuid.uuid4()),
        examen_id=str(examen.id),
        alumno_id=str(alumno_id),
        alumno_nombre="Alumno",
        respuestas={},
        calificacion=calificacion,
        correctas=0,
        total_preguntas=1,
        puntos_obtenidos=calificacion,
        total_puntos=100,
        estado="COMPLETADO",
    ))
    db.commit()


def _stats(client, headers):
    resp = client.get("/api/v1/admin/estadisticas", headers=headers)
    assert resp.status_code == 200, resp.text
    return resp.json()


# =====================================================
# 1. PERMISOS
# =====================================================

@pytest.mark.security
@pytest.mark.integration
def test_estadisticas_solo_para_admin(client, docente_headers, estudiante_headers):
    assert client.get(
        "/api/v1/admin/estadisticas", headers=docente_headers
    ).status_code == 403
    assert client.get(
        "/api/v1/admin/estadisticas", headers=estudiante_headers
    ).status_code == 403
    assert client.get("/api/v1/admin/estadisticas").status_code == 401


# =====================================================
# 2. NÚMEROS REALES (nada inventado)
# =====================================================

@pytest.mark.integration
def test_cursos_e_inscripciones_reales(
    client, db, admin_headers, docente_user, estudiante_user
):
    _crear_curso(db, docente_user, titulo="Publicado gratis", estado="PUBLICADO", precio_tipo="gratis")
    _crear_curso(db, docente_user, titulo="Borrador pago", estado="BORRADOR",
                 precio_tipo="pago", precio_monto=100)
    curso_con_inscritos = _crear_curso(db, docente_user, titulo="Con inscritos")
    _inscribir(db, curso_con_inscritos, estudiante_user)

    data = _stats(client, admin_headers)

    assert data["cursos"]["total"] == 3, data["cursos"]
    assert data["cursos"]["publicados"] == 2, data["cursos"]
    assert data["cursos"]["borradores"] == 1, data["cursos"]
    assert data["cursos"]["gratis"] == 2, data["cursos"]
    assert data["cursos"]["pago"] == 1, data["cursos"]
    assert data["cursos"]["inscripciones"] == 1, data["cursos"]

    # El curso con inscritos encabeza el top
    assert data["top_cursos"][0]["titulo"] == "Con inscritos", data["top_cursos"]
    assert data["top_cursos"][0]["inscritos"] == 1

    # Y el docente aparece en el top de docentes
    assert data["top_docentes"], data["top_docentes"]
    assert data["top_docentes"][0]["cursos"] == 3


@pytest.mark.integration
def test_usuarios_por_rol_reales(client, admin_headers, docente_user, estudiante_user):
    data = _stats(client, admin_headers)

    assert data["usuarios"]["total"] == 3, data["usuarios"]  # admin + docente + estudiante
    assert data["usuarios"]["admin"] == 1
    assert data["usuarios"]["docente"] == 1
    assert data["usuarios"]["estudiante"] == 1
    assert data["usuarios"]["activos"] == 3
    assert data["usuarios"]["nuevos_30d"] == 3


@pytest.mark.integration
def test_examenes_y_tasa_de_aprobacion(
    client, db, admin_headers, docente_user, estudiante_user
):
    examen = _crear_examen(db, docente_user, puntaje_aprobacion=60)
    _resultado(db, examen, estudiante_user.id, 70)
    _resultado(db, examen, "otro-alumno", 40)

    data = _stats(client, admin_headers)

    assert data["examenes"]["total"] == 1
    assert data["examenes"]["publicados"] == 1
    assert data["examenes"]["resultados"] == 2
    assert data["examenes"]["aprobados"] == 1
    assert data["examenes"]["promedio"] == pytest.approx(55.0)
    assert data["examenes"]["tasa_aprobacion"] == pytest.approx(50.0)


@pytest.mark.integration
def test_ingresos_derivados_de_accesos_aprobados(
    client, db, admin_headers, docente_user, estudiante_user
):
    curso = _crear_curso(
        db, docente_user, titulo="Curso de pago", precio_tipo="pago", precio_monto=150
    )

    # Acceso aprobado (el docente verificó el pago) + uno pendiente que NO cuenta
    db.add(SolicitudAccesoCurso(
        id=str(uuid.uuid4()), curso_id=str(curso.id),
        estudiante_id=str(estudiante_user.id), estudiante_nombre="Alumno",
        estado="aprobado",
    ))
    db.add(SolicitudAccesoCurso(
        id=str(uuid.uuid4()), curso_id=str(curso.id),
        estudiante_id="otro", estudiante_nombre="Otro", estado="pendiente",
    ))
    db.commit()

    data = _stats(client, admin_headers)

    assert data["ingresos"]["verificados"] == pytest.approx(150.0), data["ingresos"]
    assert data["ingresos"]["moneda"] == "PEN"
    assert "nota" in data["ingresos"]
    assert data["solicitudes"]["acceso_aprobadas"] == 1
    assert data["solicitudes"]["acceso_pendientes"] == 1


@pytest.mark.integration
def test_listado_admin_de_cursos(
    client, db, admin_headers, docente_user, estudiante_user, estudiante_headers
):
    """El panel necesita el listado real de cursos con sus inscriptos."""
    curso = _crear_curso(db, docente_user, titulo="Listado")
    _inscribir(db, curso, estudiante_user)

    resp = client.get("/api/v1/admin/cursos", headers=admin_headers)
    assert resp.status_code == 200, resp.text
    filas = resp.json()
    assert len(filas) == 1, filas
    assert filas[0]["titulo"] == "Listado"
    assert filas[0]["inscritos"] == 1
    assert filas[0]["docente_nombre"]

    assert client.get(
        "/api/v1/admin/cursos", headers=estudiante_headers
    ).status_code == 403


@pytest.mark.integration
def test_estructura_completa_de_la_analitica(client, admin_headers):
    """El panel necesita todas las secciones, aunque estén en cero."""
    data = _stats(client, admin_headers)

    for seccion in [
        "usuarios", "cursos", "alumnos", "grupos", "examenes", "materiales",
        "biblioteca", "certificados", "solicitudes", "ingresos", "comunidad",
        "top_cursos", "top_docentes", "actividad_reciente",
    ]:
        assert seccion in data, f"Falta la sección '{seccion}'"

    assert data["cursos"]["total"] == 0
    assert data["examenes"]["promedio"] is None
    assert data["examenes"]["tasa_aprobacion"] is None
    assert data["ingresos"]["verificados"] == 0
