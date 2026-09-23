# back/tests/test_cursos_progreso.py
# Tests de integración para app/api/cursos.py: progreso de lecciones,
# bloqueos (secuencial/fecha/ninguno), evaluaciones de lección, liberación
# de lecciones, calificaciones manuales, gestión de accesos, progreso
# detallado y desinscripción por parte del docente.

import uuid
from datetime import datetime, timedelta, timezone

import pytest

from app.models.curso import (
    AccesoCurso,
    Curso,
    EvaluacionLeccion,
    InscripcionCurso,
    ProgresoLeccion,
)


# =============================================
# ESTRUCTURAS Y HELPERS (copiados/adaptados de test_cursos.py)
# =============================================

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

MODULOS_3_LECCIONES = [
    {
        "id": "m1",
        "titulo": "Módulo 1",
        "lecciones": [
            {"id": "l1", "titulo": "Lección 1", "tipo": "texto"},
            {"id": "l2", "titulo": "Lección 2", "tipo": "texto"},
            {"id": "l3", "titulo": "Lección 3", "tipo": "texto"},
        ],
    }
]

MODULOS_2_MODULOS = [
    {
        "id": "m1",
        "titulo": "Módulo 1",
        "lecciones": [{"id": "l1", "titulo": "Lección 1", "tipo": "texto"}],
    },
    {
        "id": "m2",
        "titulo": "Módulo 2",
        "lecciones": [{"id": "l2", "titulo": "Lección 2", "tipo": "texto"}],
    },
]


def _crear_curso(
    db,
    docente,
    *,
    titulo: str = "Curso de prueba",
    precio_tipo: str = "gratis",
    precio_monto=None,
    estado: str = "PUBLICADO",
    modulos=None,
    tipo_bloqueo: str = "ninguno",
    bloqueo_config=None,
    certificado_habilitado: bool = True,
):
    """Crea un curso directamente en BD (evita depender del endpoint de creación)."""
    curso = Curso(
        id=str(uuid.uuid4()),
        titulo=titulo,
        descripcion="Curso generado en tests",
        categoria="general",
        nivel="principiante",
        docente_id=str(docente.id),
        docente_nombre=docente.nombre_completo,
        precio_tipo=precio_tipo,
        precio_monto=precio_monto,
        moneda="PEN",
        estado=estado,
        modulos=modulos if modulos is not None else [],
        tipo_bloqueo=tipo_bloqueo,
        bloqueo_config=bloqueo_config if bloqueo_config is not None else {},
        estudiantes_count=0,
        rating=0,
        rating_count=0,
        etiquetas=[],
        requisitos=[],
        objetivos=[],
        certificado_habilitado=certificado_habilitado,
    )
    db.add(curso)
    db.commit()
    db.refresh(curso)
    return curso


def _inscribir(client, curso_id, headers):
    return client.post(f"/api/v1/cursos/{curso_id}/inscribirse", headers=headers)


def _completar(client, curso_id, leccion_id, usuario_id, headers):
    return client.post(
        f"/api/v1/cursos/{curso_id}/lecciones/{leccion_id}/completar",
        json={"usuario_id": str(usuario_id)},
        headers=headers,
    )


def _acceso_directo(client, curso_id, estudiante_id, headers):
    return client.post(
        f"/api/v1/cursos/{curso_id}/acceso",
        json={"estudiante_id": str(estudiante_id)},
        headers=headers,
    )


# =============================================
# 1. PROGRESO DE LECCIONES
# =============================================

@pytest.mark.integration
def test_completar_leccion_actualiza_progreso(
    client, db, docente_user, estudiante_user, estudiante_headers
):
    curso = _crear_curso(db, docente_user, modulos=MODULOS_2_LECCIONES)
    _inscribir(client, curso.id, estudiante_headers)

    resp = _completar(client, curso.id, "l1", estudiante_user.id, estudiante_headers)

    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["completado"] is True
    assert data["progreso"] == 50
    assert "l1" in data["lecciones_completadas"]

    db.expire_all()
    prog = db.query(ProgresoLeccion).filter(
        ProgresoLeccion.curso_id == str(curso.id),
        ProgresoLeccion.estudiante_id == str(estudiante_user.id),
        ProgresoLeccion.leccion_id == "l1",
    ).first()
    assert prog is not None and prog.completado is True
    assert prog.fecha_completado is not None


@pytest.mark.integration
def test_completar_leccion_es_idempotente(
    client, db, docente_user, estudiante_user, estudiante_headers
):
    curso = _crear_curso(db, docente_user, modulos=MODULOS_2_LECCIONES)
    _inscribir(client, curso.id, estudiante_headers)

    _completar(client, curso.id, "l1", estudiante_user.id, estudiante_headers)
    resp = _completar(client, curso.id, "l1", estudiante_user.id, estudiante_headers)

    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["lecciones_completadas"].count("l1") == 1

    db.expire_all()
    registros = db.query(ProgresoLeccion).filter(
        ProgresoLeccion.curso_id == str(curso.id),
        ProgresoLeccion.estudiante_id == str(estudiante_user.id),
        ProgresoLeccion.leccion_id == "l1",
    ).all()
    assert len(registros) == 1


@pytest.mark.integration
def test_completar_todas_las_lecciones_marca_curso_completado(
    client, db, docente_user, estudiante_user, estudiante_headers
):
    curso = _crear_curso(db, docente_user, modulos=MODULOS_2_LECCIONES)
    _inscribir(client, curso.id, estudiante_headers)

    _completar(client, curso.id, "l1", estudiante_user.id, estudiante_headers)
    resp = _completar(client, curso.id, "l2", estudiante_user.id, estudiante_headers)

    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["progreso"] == 100
    assert data["completado_curso"] is True

    db.expire_all()
    inscripcion = db.query(InscripcionCurso).filter(
        InscripcionCurso.curso_id == str(curso.id),
        InscripcionCurso.estudiante_id == str(estudiante_user.id),
    ).first()
    assert inscripcion.completado is True
    assert inscripcion.fecha_completado is not None


@pytest.mark.integration
def test_estudiante_sin_acceso_no_puede_completar_leccion(
    client, db, docente_user, estudiante_user, estudiante_headers
):
    curso = _crear_curso(db, docente_user, modulos=MODULOS_2_LECCIONES)

    resp = _completar(client, curso.id, "l1", estudiante_user.id, estudiante_headers)

    assert resp.status_code == 403, resp.text


# =============================================
# 2. BLOQUEO DE LECCIONES
# =============================================

@pytest.mark.integration
def test_bloqueo_secuencial_razon_y_lecciones_requeridas(
    client, db, docente_user, estudiante_headers
):
    curso = _crear_curso(
        db, docente_user, modulos=MODULOS_2_LECCIONES, tipo_bloqueo="secuencial"
    )

    resp = client.get(
        f"/api/v1/cursos/{curso.id}/leccion/l2/estado-bloqueo",
        headers=estudiante_headers,
    )

    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["bloqueada"] is True
    assert data["razon"]
    assert "l1" in data["lecciones_requeridas"]


@pytest.mark.integration
def test_bloqueo_secuencial_tercera_leccion_requiere_anteriores(
    client, db, docente_user, estudiante_headers
):
    curso = _crear_curso(
        db, docente_user, modulos=MODULOS_3_LECCIONES, tipo_bloqueo="secuencial"
    )

    resp = client.get(
        f"/api/v1/cursos/{curso.id}/leccion/l3/estado-bloqueo",
        headers=estudiante_headers,
    )

    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["bloqueada"] is True
    assert set(data["lecciones_requeridas"]) == {"l1", "l2"}


@pytest.mark.integration
def test_bloqueo_secuencial_multimodulo_primera_leccion_no_bloqueada(
    client, db, docente_user, estudiante_headers
):
    curso = _crear_curso(
        db, docente_user, modulos=MODULOS_2_MODULOS, tipo_bloqueo="secuencial"
    )

    resp = client.get(
        f"/api/v1/cursos/{curso.id}/leccion/l1/estado-bloqueo",
        headers=estudiante_headers,
    )

    assert resp.status_code == 200, resp.text
    assert resp.json()["bloqueada"] is False


@pytest.mark.integration
def test_bloqueo_secuencial_se_desbloquea_al_completar(
    client, db, docente_user, estudiante_user, estudiante_headers
):
    curso = _crear_curso(
        db, docente_user, modulos=MODULOS_2_LECCIONES, tipo_bloqueo="secuencial"
    )
    _inscribir(client, curso.id, estudiante_headers)
    _completar(client, curso.id, "l1", estudiante_user.id, estudiante_headers)

    resp = client.get(
        f"/api/v1/cursos/{curso.id}/leccion/l2/estado-bloqueo",
        headers=estudiante_headers,
    )

    assert resp.status_code == 200, resp.text
    assert resp.json()["bloqueada"] is False


@pytest.mark.integration
def test_bloqueo_fecha_futura_bloquea_leccion(client, db, docente_user, estudiante_headers):
    fecha_futura = (datetime.now(timezone.utc) + timedelta(days=5)).isoformat()
    curso = _crear_curso(
        db,
        docente_user,
        modulos=MODULOS_2_LECCIONES,
        tipo_bloqueo="fecha",
        bloqueo_config={"fechas": {"l1": fecha_futura}},
    )

    resp = client.get(
        f"/api/v1/cursos/{curso.id}/leccion/l1/estado-bloqueo",
        headers=estudiante_headers,
    )

    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["bloqueada"] is True
    assert data["razon"]
    assert data["fecha_liberacion"] is not None


@pytest.mark.integration
def test_bloqueo_fecha_pasada_no_bloquea(client, db, docente_user, estudiante_headers):
    fecha_pasada = (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()
    curso = _crear_curso(
        db,
        docente_user,
        modulos=MODULOS_2_LECCIONES,
        tipo_bloqueo="fecha",
        bloqueo_config={"fechas": {"l1": fecha_pasada}},
    )

    resp = client.get(
        f"/api/v1/cursos/{curso.id}/leccion/l1/estado-bloqueo",
        headers=estudiante_headers,
    )

    assert resp.status_code == 200, resp.text
    assert resp.json()["bloqueada"] is False


@pytest.mark.integration
def test_completar_leccion_bloqueada_por_fecha_devuelve_403(
    client, db, docente_user, estudiante_user, estudiante_headers
):
    fecha_futura = (datetime.now(timezone.utc) + timedelta(days=5)).isoformat()
    curso = _crear_curso(
        db,
        docente_user,
        modulos=MODULOS_2_LECCIONES,
        tipo_bloqueo="fecha",
        bloqueo_config={"fechas": {"l1": fecha_futura}},
    )
    _inscribir(client, curso.id, estudiante_headers)

    resp = _completar(client, curso.id, "l1", estudiante_user.id, estudiante_headers)

    assert resp.status_code == 403, resp.text


@pytest.mark.integration
def test_tipo_bloqueo_ninguno_nunca_bloquea(
    client, db, docente_user, estudiante_headers
):
    curso = _crear_curso(
        db, docente_user, modulos=MODULOS_2_LECCIONES, tipo_bloqueo="ninguno"
    )

    resp = client.get(
        f"/api/v1/cursos/{curso.id}/leccion/l2/estado-bloqueo",
        headers=estudiante_headers,
    )

    assert resp.status_code == 200, resp.text
    assert resp.json()["bloqueada"] is False


@pytest.mark.integration
def test_docente_nunca_es_bloqueado(client, db, docente_user, docente_headers):
    curso = _crear_curso(
        db, docente_user, modulos=MODULOS_2_LECCIONES, tipo_bloqueo="secuencial"
    )

    resp = client.get(
        f"/api/v1/cursos/{curso.id}/leccion/l2/estado-bloqueo",
        headers=docente_headers,
    )

    assert resp.status_code == 200, resp.text
    assert resp.json()["bloqueada"] is False


@pytest.mark.integration
def test_admin_nunca_es_bloqueado(client, db, docente_user, admin_headers):
    curso = _crear_curso(
        db, docente_user, modulos=MODULOS_2_LECCIONES, tipo_bloqueo="secuencial"
    )

    resp = client.get(
        f"/api/v1/cursos/{curso.id}/leccion/l2/estado-bloqueo",
        headers=admin_headers,
    )

    assert resp.status_code == 200, resp.text
    assert resp.json()["bloqueada"] is False


# =============================================
# 3. EVALUACIONES DE LECCIÓN
# =============================================

def _payload_evaluacion(**overrides):
    payload = {
        "leccion_id": "l1",
        "tipo": "examen",
        "entidad_id": "examen-1",
        "nota_minima": 3.0,
        "intentos_maximos": 3,
    }
    payload.update(overrides)
    return payload


@pytest.mark.integration
def test_docente_configura_obtiene_y_elimina_evaluacion(
    client, db, docente_user, docente_headers
):
    curso = _crear_curso(db, docente_user, modulos=MODULOS_2_LECCIONES)

    resp = client.post(
        f"/api/v1/cursos/{curso.id}/lecciones/l1/evaluacion",
        json=_payload_evaluacion(),
        headers=docente_headers,
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["entidad_id"] == "examen-1"

    get = client.get(
        f"/api/v1/cursos/{curso.id}/lecciones/l1/evaluacion",
        headers=docente_headers,
    )
    assert get.status_code == 200, get.text
    assert get.json()["leccion_id"] == "l1"
    assert float(get.json()["nota_minima"]) == 3.0

    delete = client.delete(
        f"/api/v1/cursos/{curso.id}/lecciones/l1/evaluacion",
        headers=docente_headers,
    )
    assert delete.status_code == 200, delete.text
    assert delete.json()["ok"] is True

    get_after = client.get(
        f"/api/v1/cursos/{curso.id}/lecciones/l1/evaluacion",
        headers=docente_headers,
    )
    assert get_after.status_code == 200, get_after.text
    assert get_after.json() is None


@pytest.mark.integration
def test_docente_actualiza_evaluacion_existente(client, db, docente_user, docente_headers):
    curso = _crear_curso(db, docente_user, modulos=MODULOS_2_LECCIONES)

    primero = client.post(
        f"/api/v1/cursos/{curso.id}/lecciones/l1/evaluacion",
        json=_payload_evaluacion(),
        headers=docente_headers,
    )
    segundo = client.post(
        f"/api/v1/cursos/{curso.id}/lecciones/l1/evaluacion",
        json=_payload_evaluacion(entidad_id="examen-2", nota_minima=4.0),
        headers=docente_headers,
    )

    assert primero.status_code == 200 and segundo.status_code == 200, segundo.text
    assert primero.json()["id"] == segundo.json()["id"]
    assert segundo.json()["entidad_id"] == "examen-2"
    assert float(segundo.json()["nota_minima"]) == 4.0

    db.expire_all()
    total = db.query(EvaluacionLeccion).filter(
        EvaluacionLeccion.curso_id == str(curso.id),
        EvaluacionLeccion.leccion_id == "l1",
    ).count()
    assert total == 1


@pytest.mark.security
@pytest.mark.integration
def test_estudiante_no_puede_configurar_evaluacion(
    client, db, docente_user, estudiante_headers
):
    curso = _crear_curso(db, docente_user, modulos=MODULOS_2_LECCIONES)

    resp = client.post(
        f"/api/v1/cursos/{curso.id}/lecciones/l1/evaluacion",
        json=_payload_evaluacion(),
        headers=estudiante_headers,
    )

    assert resp.status_code == 403, resp.text


@pytest.mark.security
@pytest.mark.integration
def test_docente_ajeno_no_puede_configurar_evaluacion(
    client, db, docente_user, otro_docente_headers
):
    curso = _crear_curso(db, docente_user, modulos=MODULOS_2_LECCIONES)

    resp = client.post(
        f"/api/v1/cursos/{curso.id}/lecciones/l1/evaluacion",
        json=_payload_evaluacion(),
        headers=otro_docente_headers,
    )

    assert resp.status_code == 403, resp.text


@pytest.mark.integration
def test_eliminar_evaluacion_inexistente_404(client, db, docente_user, docente_headers):
    curso = _crear_curso(db, docente_user, modulos=MODULOS_2_LECCIONES)

    resp = client.delete(
        f"/api/v1/cursos/{curso.id}/lecciones/l1/evaluacion",
        headers=docente_headers,
    )

    assert resp.status_code == 404, resp.text


# =============================================
# 4. LIBERAR LECCIÓN (DOCENTE)
# =============================================

@pytest.mark.integration
def test_docente_libera_leccion(
    client, db, docente_user, estudiante_user, docente_headers
):
    curso = _crear_curso(
        db, docente_user, modulos=MODULOS_2_LECCIONES, tipo_bloqueo="secuencial"
    )

    resp = client.post(
        f"/api/v1/cursos/{curso.id}/lecciones/l1/liberar",
        json={"estudiante_id": str(estudiante_user.id)},
        headers=docente_headers,
    )

    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["completado"] is True
    assert data["fecha_liberacion"] is not None

    db.expire_all()
    prog = db.query(ProgresoLeccion).filter(
        ProgresoLeccion.curso_id == str(curso.id),
        ProgresoLeccion.estudiante_id == str(estudiante_user.id),
        ProgresoLeccion.leccion_id == "l1",
    ).first()
    assert prog is not None
    assert prog.completado is True
    assert prog.fecha_liberacion is not None


@pytest.mark.integration
def test_liberar_leccion_sincroniza_lecciones_completadas_del_frontend(
    client, db, docente_user, estudiante_user, docente_headers, estudiante_headers
):
    """Regresión: liberar una lección marcaba ProgresoLeccion pero NO la lista
    JSON `lecciones_completadas` que el frontend usa para checks y desbloqueo."""
    curso = _crear_curso(
        db, docente_user, modulos=MODULOS_2_LECCIONES, tipo_bloqueo="secuencial"
    )
    _inscribir(client, curso.id, estudiante_headers)

    resp = client.post(
        f"/api/v1/cursos/{curso.id}/lecciones/l1/liberar",
        json={"estudiante_id": str(estudiante_user.id)},
        headers=docente_headers,
    )
    assert resp.status_code == 200, resp.text

    prog_resp = client.get(
        f"/api/v1/cursos/{curso.id}/progreso/{estudiante_user.id}",
        headers=estudiante_headers,
    )
    assert prog_resp.status_code == 200, prog_resp.text
    data = prog_resp.json()
    assert "l1" in data["lecciones_completadas"]
    # 1 de 2 lecciones → 50%
    assert data["progreso"] == 50


@pytest.mark.security
@pytest.mark.integration
def test_estudiante_no_puede_liberar_leccion(
    client, db, docente_user, estudiante_user, estudiante_headers
):
    curso = _crear_curso(db, docente_user, modulos=MODULOS_2_LECCIONES)

    resp = client.post(
        f"/api/v1/cursos/{curso.id}/lecciones/l1/liberar",
        json={"estudiante_id": str(estudiante_user.id)},
        headers=estudiante_headers,
    )

    assert resp.status_code == 403, resp.text


@pytest.mark.integration
def test_liberar_leccion_sin_estudiante_id_400(client, db, docente_user, docente_headers):
    curso = _crear_curso(db, docente_user, modulos=MODULOS_2_LECCIONES)

    resp = client.post(
        f"/api/v1/cursos/{curso.id}/lecciones/l1/liberar",
        json={},
        headers=docente_headers,
    )

    assert resp.status_code == 400, resp.text


# =============================================
# 5. CALIFICACIONES MANUALES
# =============================================

@pytest.mark.integration
def test_docente_asigna_nota_manual(
    client, db, docente_user, estudiante_user, docente_headers
):
    curso = _crear_curso(db, docente_user, modulos=MODULOS_2_LECCIONES)

    resp = client.put(
        f"/api/v1/cursos/{curso.id}/calificaciones/{estudiante_user.id}/l1",
        json={"nota": 15, "aprobado": True},
        headers=docente_headers,
    )

    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["nota"] == 15.0
    assert data["aprobado"] is True

    db.expire_all()
    prog = db.query(ProgresoLeccion).filter(
        ProgresoLeccion.curso_id == str(curso.id),
        ProgresoLeccion.estudiante_id == str(estudiante_user.id),
        ProgresoLeccion.leccion_id == "l1",
    ).first()
    assert prog is not None
    assert float(prog.nota) == 15.0
    assert prog.aprobado is True


@pytest.mark.integration
def test_nota_menor_a_diez_calcula_aprobado_false(
    client, db, docente_user, estudiante_user, docente_headers
):
    curso = _crear_curso(db, docente_user, modulos=MODULOS_2_LECCIONES)

    resp = client.put(
        f"/api/v1/cursos/{curso.id}/calificaciones/{estudiante_user.id}/l1",
        json={"nota": 5},
        headers=docente_headers,
    )

    assert resp.status_code == 200, resp.text
    assert resp.json()["aprobado"] is False

    db.expire_all()
    prog = db.query(ProgresoLeccion).filter(
        ProgresoLeccion.curso_id == str(curso.id),
        ProgresoLeccion.estudiante_id == str(estudiante_user.id),
        ProgresoLeccion.leccion_id == "l1",
    ).first()
    assert prog.aprobado is False


@pytest.mark.security
@pytest.mark.integration
def test_estudiante_no_puede_asignar_nota(
    client, db, docente_user, estudiante_user, estudiante_headers
):
    curso = _crear_curso(db, docente_user, modulos=MODULOS_2_LECCIONES)

    resp = client.put(
        f"/api/v1/cursos/{curso.id}/calificaciones/{estudiante_user.id}/l1",
        json={"nota": 20, "aprobado": True},
        headers=estudiante_headers,
    )

    assert resp.status_code == 403, resp.text


@pytest.mark.security
@pytest.mark.integration
def test_docente_ajeno_no_puede_asignar_nota(
    client, db, docente_user, estudiante_user, otro_docente_headers
):
    curso = _crear_curso(db, docente_user, modulos=MODULOS_2_LECCIONES)

    resp = client.put(
        f"/api/v1/cursos/{curso.id}/calificaciones/{estudiante_user.id}/l1",
        json={"nota": 20},
        headers=otro_docente_headers,
    )

    assert resp.status_code == 403, resp.text


@pytest.mark.integration
def test_asignar_nota_leccion_inexistente_404(
    client, db, docente_user, estudiante_user, docente_headers
):
    curso = _crear_curso(db, docente_user, modulos=MODULOS_2_LECCIONES)

    resp = client.put(
        f"/api/v1/cursos/{curso.id}/calificaciones/{estudiante_user.id}/no-existe",
        json={"nota": 15},
        headers=docente_headers,
    )

    assert resp.status_code == 404, resp.text


# =============================================
# 6. GESTIÓN DE ACCESOS (DOCENTE)
# =============================================

@pytest.mark.integration
def test_docente_activa_acceso_directo(
    client, db, docente_user, estudiante_user, docente_headers
):
    curso = _crear_curso(db, docente_user, modulos=MODULOS_2_LECCIONES)

    resp = _acceso_directo(client, curso.id, estudiante_user.id, docente_headers)

    assert resp.status_code == 200, resp.text
    assert resp.json()["activo"] is True
    assert resp.json()["estudiante_id"] == str(estudiante_user.id)

    db.expire_all()
    acceso = db.query(AccesoCurso).filter(
        AccesoCurso.curso_id == str(curso.id),
        AccesoCurso.estudiante_id == str(estudiante_user.id),
    ).first()
    inscripcion = db.query(InscripcionCurso).filter(
        InscripcionCurso.curso_id == str(curso.id),
        InscripcionCurso.estudiante_id == str(estudiante_user.id),
    ).first()
    assert acceso is not None and acceso.activo is True
    assert inscripcion is not None


@pytest.mark.integration
def test_activar_acceso_dos_veces_devuelve_400(
    client, db, docente_user, estudiante_user, docente_headers
):
    curso = _crear_curso(db, docente_user, modulos=MODULOS_2_LECCIONES)
    _acceso_directo(client, curso.id, estudiante_user.id, docente_headers)

    resp = _acceso_directo(client, curso.id, estudiante_user.id, docente_headers)

    assert resp.status_code == 400, resp.text


@pytest.mark.integration
def test_docente_desactiva_acceso(
    client, db, docente_user, estudiante_user, docente_headers
):
    curso = _crear_curso(db, docente_user, modulos=MODULOS_2_LECCIONES)
    _acceso_directo(client, curso.id, estudiante_user.id, docente_headers)

    resp = client.delete(
        f"/api/v1/cursos/{curso.id}/acceso/{estudiante_user.id}",
        headers=docente_headers,
    )

    assert resp.status_code == 200, resp.text
    assert resp.json()["ok"] is True

    db.expire_all()
    acceso = db.query(AccesoCurso).filter(
        AccesoCurso.curso_id == str(curso.id),
        AccesoCurso.estudiante_id == str(estudiante_user.id),
    ).first()
    assert acceso.activo is False


@pytest.mark.integration
def test_tiene_acceso_refleja_estado(
    client, db, docente_user, estudiante_user, estudiante_headers
):
    curso = _crear_curso(db, docente_user, precio_tipo="pago", precio_monto=50)

    sin_acceso = client.get(
        f"/api/v1/cursos/{curso.id}/tiene-acceso/{estudiante_user.id}",
        headers=estudiante_headers,
    )
    assert sin_acceso.status_code == 200, sin_acceso.text
    assert sin_acceso.json()["tiene_acceso"] is False

    db.add(AccesoCurso(
        id=str(uuid.uuid4()),
        curso_id=str(curso.id),
        estudiante_id=str(estudiante_user.id),
        activo=True,
        tipo_acceso="vitalicio",
    ))
    db.commit()

    con_acceso = client.get(
        f"/api/v1/cursos/{curso.id}/tiene-acceso/{estudiante_user.id}",
        headers=estudiante_headers,
    )
    assert con_acceso.status_code == 200, con_acceso.text
    assert con_acceso.json()["tiene_acceso"] is True


@pytest.mark.integration
def test_docente_lista_accesos(
    client, db, docente_user, estudiante_user, docente_headers
):
    curso = _crear_curso(db, docente_user, modulos=MODULOS_2_LECCIONES)
    _acceso_directo(client, curso.id, estudiante_user.id, docente_headers)

    resp = client.get(f"/api/v1/cursos/{curso.id}/accesos", headers=docente_headers)

    assert resp.status_code == 200, resp.text
    accesos = resp.json()
    assert len(accesos) == 1
    assert accesos[0]["estudiante_id"] == str(estudiante_user.id)


@pytest.mark.security
@pytest.mark.integration
def test_estudiante_no_puede_listar_accesos(
    client, db, docente_user, estudiante_headers
):
    curso = _crear_curso(db, docente_user, modulos=MODULOS_2_LECCIONES)

    resp = client.get(f"/api/v1/cursos/{curso.id}/accesos", headers=estudiante_headers)

    assert resp.status_code == 403, resp.text


# =============================================
# 7. PROGRESO DETALLADO
# =============================================

@pytest.mark.integration
def test_progreso_detallado_estudiante(
    client, db, docente_user, estudiante_user, estudiante_headers
):
    curso = _crear_curso(db, docente_user, modulos=MODULOS_2_LECCIONES)
    _inscribir(client, curso.id, estudiante_headers)
    _completar(client, curso.id, "l1", estudiante_user.id, estudiante_headers)

    resp = client.get(
        f"/api/v1/cursos/{curso.id}/progreso-detallado",
        headers=estudiante_headers,
    )

    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["estudiante_id"] == str(estudiante_user.id)
    assert data["lecciones_totales"] == 2
    assert data["lecciones_completadas"] == 1
    assert data["progreso_total"] == 50
    assert len(data["modulos"]) == 1
    lecciones = data["modulos"][0]["lecciones"]
    assert lecciones[0]["id"] == "l1" and lecciones[0]["completado"] is True
    assert lecciones[1]["id"] == "l2" and lecciones[1]["completado"] is False


@pytest.mark.integration
def test_progreso_detallado_docente_consulta_estudiante(
    client, db, docente_user, estudiante_user, docente_headers
):
    curso = _crear_curso(db, docente_user, modulos=MODULOS_2_LECCIONES)

    resp = client.get(
        f"/api/v1/cursos/{curso.id}/progreso-detallado",
        params={"estudiante_id": str(estudiante_user.id)},
        headers=docente_headers,
    )

    assert resp.status_code == 200, resp.text
    assert resp.json()["estudiante_id"] == str(estudiante_user.id)


@pytest.mark.security
@pytest.mark.integration
def test_progreso_detallado_estudiante_no_puede_ver_otro(
    client, db, docente_user, estudiante_headers
):
    curso = _crear_curso(db, docente_user, modulos=MODULOS_2_LECCIONES)

    resp = client.get(
        f"/api/v1/cursos/{curso.id}/progreso-detallado",
        params={"estudiante_id": str(uuid.uuid4())},
        headers=estudiante_headers,
    )

    assert resp.status_code == 403, resp.text


@pytest.mark.integration
def test_progreso_detallado_incluye_bloqueo(
    client, db, docente_user, estudiante_headers
):
    curso = _crear_curso(
        db, docente_user, modulos=MODULOS_2_LECCIONES, tipo_bloqueo="secuencial"
    )

    resp = client.get(
        f"/api/v1/cursos/{curso.id}/progreso-detallado",
        headers=estudiante_headers,
    )

    assert resp.status_code == 200, resp.text
    lecciones = resp.json()["modulos"][0]["lecciones"]
    assert lecciones[0]["bloqueada"] is False
    assert lecciones[1]["bloqueada"] is True
    assert lecciones[1]["razon_bloqueo"]


# =============================================
# 8. DESINSCRIPCIÓN
# =============================================

@pytest.mark.integration
def test_docente_desinscribe_estudiante(
    client, db, docente_user, estudiante_user, docente_headers, estudiante_headers
):
    curso = _crear_curso(db, docente_user, modulos=MODULOS_2_LECCIONES)
    _inscribir(client, curso.id, estudiante_headers)
    _completar(client, curso.id, "l1", estudiante_user.id, estudiante_headers)

    resp = client.delete(
        f"/api/v1/cursos/{curso.id}/inscripcion/{estudiante_user.id}",
        headers=docente_headers,
    )

    assert resp.status_code == 200, resp.text
    assert resp.json()["ok"] is True

    db.expire_all()
    assert db.query(InscripcionCurso).filter(
        InscripcionCurso.curso_id == str(curso.id),
        InscripcionCurso.estudiante_id == str(estudiante_user.id),
    ).first() is None
    assert db.query(AccesoCurso).filter(
        AccesoCurso.curso_id == str(curso.id),
        AccesoCurso.estudiante_id == str(estudiante_user.id),
    ).first() is None
    assert db.query(ProgresoLeccion).filter(
        ProgresoLeccion.curso_id == str(curso.id),
        ProgresoLeccion.estudiante_id == str(estudiante_user.id),
    ).first() is None


@pytest.mark.security
@pytest.mark.integration
def test_docente_ajeno_no_puede_desinscribir(
    client, db, docente_user, estudiante_user, otro_docente_headers, estudiante_headers
):
    curso = _crear_curso(db, docente_user, modulos=MODULOS_2_LECCIONES)
    _inscribir(client, curso.id, estudiante_headers)

    resp = client.delete(
        f"/api/v1/cursos/{curso.id}/inscripcion/{estudiante_user.id}",
        headers=otro_docente_headers,
    )

    assert resp.status_code == 403, resp.text


@pytest.mark.integration
def test_desinscribir_estudiante_no_inscrito_ok_false(
    client, db, docente_user, docente_headers
):
    curso = _crear_curso(db, docente_user, modulos=MODULOS_2_LECCIONES)

    resp = client.delete(
        f"/api/v1/cursos/{curso.id}/inscripcion/{uuid.uuid4()}",
        headers=docente_headers,
    )

    assert resp.status_code == 200, resp.text
    assert resp.json()["ok"] is False


@pytest.mark.integration
def test_estudiante_se_desinscribe(
    client, db, docente_user, estudiante_user, estudiante_headers
):
    curso = _crear_curso(db, docente_user, modulos=MODULOS_2_LECCIONES)
    _inscribir(client, curso.id, estudiante_headers)

    resp = client.delete(
        f"/api/v1/cursos/{curso.id}/inscripcion",
        headers=estudiante_headers,
    )

    assert resp.status_code == 200, resp.text
    assert resp.json()["ok"] is True

    db.expire_all()
    assert db.query(InscripcionCurso).filter(
        InscripcionCurso.curso_id == str(curso.id),
        InscripcionCurso.estudiante_id == str(estudiante_user.id),
    ).first() is None


# =============================================
# EXTRAS (endpoints relacionados con las áreas anteriores)
# =============================================

@pytest.mark.integration
def test_docente_rechaza_solicitud(
    client, db, docente_user, docente_headers, estudiante_headers
):
    curso = _crear_curso(db, docente_user, precio_tipo="pago", precio_monto=50)
    solicitud = client.post(
        f"/api/v1/cursos/{curso.id}/solicitar-acceso",
        json={},
        headers=estudiante_headers,
    ).json()

    resp = client.post(
        f"/api/v1/cursos/solicitudes/{solicitud['id']}/rechazar",
        json={"estado": "rechazado", "comentario_docente": "No válido"},
        headers=docente_headers,
    )

    assert resp.status_code == 200, resp.text
    assert resp.json()["estado"] == "rechazado"


@pytest.mark.integration
def test_docente_lista_estudiantes_del_curso(
    client, db, docente_user, estudiante_user, docente_headers
):
    curso = _crear_curso(db, docente_user, modulos=MODULOS_2_LECCIONES)
    _acceso_directo(client, curso.id, estudiante_user.id, docente_headers)

    resp = client.get(f"/api/v1/cursos/{curso.id}/estudiantes", headers=docente_headers)

    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["total_estudiantes"] == 1
    assert data["estudiantes"][0]["estudiante_id"] == str(estudiante_user.id)


@pytest.mark.integration
def test_docente_exporta_estudiantes_csv(
    client, db, docente_user, estudiante_user, docente_headers
):
    curso = _crear_curso(db, docente_user, modulos=MODULOS_2_LECCIONES)
    _acceso_directo(client, curso.id, estudiante_user.id, docente_headers)

    resp = client.get(
        f"/api/v1/cursos/{curso.id}/estudiantes/exportar",
        headers=docente_headers,
    )

    assert resp.status_code == 200, resp.text
    assert "text/csv" in resp.headers["content-type"]
    assert "estudiante_id" in resp.text


@pytest.mark.integration
def test_docente_publica_curso(client, db, docente_user, docente_headers):
    curso = _crear_curso(db, docente_user, estado="BORRADOR")

    resp = client.post(f"/api/v1/cursos/{curso.id}/publicar", headers=docente_headers)

    assert resp.status_code == 200, resp.text
    assert resp.json()["estado"] == "PUBLICADO"


@pytest.mark.integration
def test_obtener_progreso_de_curso(
    client, db, docente_user, estudiante_user, estudiante_headers
):
    curso = _crear_curso(db, docente_user, modulos=MODULOS_2_LECCIONES)
    _inscribir(client, curso.id, estudiante_headers)
    _completar(client, curso.id, "l1", estudiante_user.id, estudiante_headers)

    resp = client.get(
        f"/api/v1/cursos/{curso.id}/progreso/{estudiante_user.id}",
        headers=estudiante_headers,
    )

    assert resp.status_code == 200, resp.text
    assert resp.json()["progreso"] == 50
