# back/tests/test_cursos.py
# Tests de integración para el módulo de cursos:
# creación, inscripción, acceso a cursos de pago, aprobación de solicitudes,
# mis-cursos, verificación de acceso y bloqueo secuencial de lecciones.

import uuid
from datetime import datetime, timezone

import pytest

from app.models.curso import (
    AccesoCurso,
    Curso,
    InscripcionCurso,
    ProgresoLeccion,
)

# Estructura de módulos/lecciones reutilizable.
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


# =============================================
# CREACIÓN Y LISTADO
# =============================================

@pytest.mark.integration
def test_docente_puede_crear_curso(client, docente_user, docente_headers):
    payload = {
        "titulo": "Curso creado por API",
        "descripcion": "Descripción",
        "precio_tipo": "gratis",
        "modulos": MODULOS_2_LECCIONES,
    }

    resp = client.post("/api/v1/cursos/", json=payload, headers=docente_headers)

    assert resp.status_code == 201, resp.text
    data = resp.json()
    assert data["titulo"] == payload["titulo"]
    assert data["docente_id"] == str(docente_user.id)
    assert data["estado"] == "BORRADOR"
    assert len(data["modulos"]) == 1


@pytest.mark.integration
def test_estudiante_no_puede_crear_curso(client, estudiante_headers):
    resp = client.post(
        "/api/v1/cursos/",
        json={"titulo": "Intento no autorizado"},
        headers=estudiante_headers,
    )

    assert resp.status_code == 403, resp.text


@pytest.mark.integration
def test_listar_cursos_publicados(client, db, docente_user, estudiante_headers):
    _crear_curso(db, docente_user, titulo="Curso Publicado", estado="PUBLICADO")
    _crear_curso(db, docente_user, titulo="Curso Borrador", estado="BORRADOR")

    resp = client.get("/api/v1/cursos/?estado=PUBLICADO", headers=estudiante_headers)

    assert resp.status_code == 200, resp.text
    titulos = [c["titulo"] for c in resp.json()]
    assert "Curso Publicado" in titulos
    assert "Curso Borrador" not in titulos


@pytest.mark.integration
def test_listar_sin_estado_estudiante_no_ve_borradores(
    client, db, docente_user, estudiante_headers
):
    """Sin filtro estado, un estudiante solo debe ver PUBLICADO."""
    _crear_curso(db, docente_user, titulo="Pub sin filtro", estado="PUBLICADO")
    _crear_curso(db, docente_user, titulo="Borrador sin filtro", estado="BORRADOR")

    resp = client.get("/api/v1/cursos/", headers=estudiante_headers)

    assert resp.status_code == 200, resp.text
    titulos = [c["titulo"] for c in resp.json()]
    assert "Pub sin filtro" in titulos
    assert "Borrador sin filtro" not in titulos


@pytest.mark.integration
def test_listar_borradores_estudiante_pidienestado_devuelve_vacio(
    client, db, docente_user, estudiante_headers
):
    _crear_curso(db, docente_user, titulo="Borrador oculto", estado="BORRADOR")

    resp = client.get("/api/v1/cursos/?estado=BORRADOR", headers=estudiante_headers)

    assert resp.status_code == 200, resp.text
    assert all(c["titulo"] != "Borrador oculto" for c in resp.json())


@pytest.mark.integration
def test_listar_docente_ve_sus_borradores_y_publicados_ajenos(
    client, db, docente_user, otro_docente_user, docente_headers, estudiante_headers
):
    _crear_curso(db, docente_user, titulo="Mio borrador", estado="BORRADOR")
    _crear_curso(db, otro_docente_user, titulo="Ajeno publicado", estado="PUBLICADO")
    _crear_curso(db, otro_docente_user, titulo="Ajeno borrador", estado="BORRADOR")

    resp_doc = client.get("/api/v1/cursos/", headers=docente_headers)
    assert resp_doc.status_code == 200, resp_doc.text
    titulos_doc = [c["titulo"] for c in resp_doc.json()]
    assert "Mio borrador" in titulos_doc
    assert "Ajeno publicado" in titulos_doc
    assert "Ajeno borrador" not in titulos_doc

    resp_est = client.get("/api/v1/cursos/", headers=estudiante_headers)
    titulos_est = [c["titulo"] for c in resp_est.json()]
    assert "Mio borrador" not in titulos_est
    assert "Ajeno borrador" not in titulos_est
    assert "Ajeno publicado" in titulos_est


@pytest.mark.integration
def test_listar_admin_ve_borradores_ajenos(
    client, db, docente_user, admin_headers
):
    _crear_curso(db, docente_user, titulo="Borrador admin ve", estado="BORRADOR")

    resp = client.get("/api/v1/cursos/", headers=admin_headers)

    assert resp.status_code == 200, resp.text
    assert "Borrador admin ve" in [c["titulo"] for c in resp.json()]


# =============================================
# DETALLE GET /cursos/{id} (flags de acceso)
# =============================================

@pytest.mark.integration
def test_obtener_curso_publicado_sin_inscripcion_flags(
    client, db, docente_user, estudiante_headers
):
    """200 + flags de acceso; módulos saneados (sin bloques) si no hay inscripción."""
    curso = _crear_curso(
        db,
        docente_user,
        titulo="Detalle publicado",
        estado="PUBLICADO",
        modulos=MODULOS_2_LECCIONES,
    )

    resp = client.get(f"/api/v1/cursos/{curso.id}", headers=estudiante_headers)

    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["id"] == str(curso.id)
    assert data["tiene_acceso"] is False
    assert data["esta_inscrito"] is False
    assert data["tiene_solicitud_pendiente"] is False
    assert data["estado"] == "PUBLICADO"
    # Preview: sin inscripción no debe venir el contenido real de bloques
    for modulo in data["modulos"]:
        for leccion in modulo.get("lecciones", []):
            assert not leccion.get("bloques"), "No debe exponer bloques en preview"


@pytest.mark.integration
def test_obtener_curso_publicado_inscrito_con_acceso(
    client, db, docente_user, estudiante_user, estudiante_headers
):
    modulos_con_bloques = [
        {
            "id": "m1",
            "titulo": "Módulo 1",
            "lecciones": [
                {
                    "id": "l1",
                    "titulo": "Lección 1",
                    "bloques": [{"tipo": "texto", "contenido": "hola"}],
                },
            ],
        }
    ]
    curso = _crear_curso(
        db,
        docente_user,
        titulo="Detalle inscrito",
        estado="PUBLICADO",
        precio_tipo="gratis",
        modulos=modulos_con_bloques,
    )
    r = client.post(f"/api/v1/cursos/{curso.id}/inscribirse", headers=estudiante_headers)
    assert r.status_code == 200, r.text

    resp = client.get(f"/api/v1/cursos/{curso.id}", headers=estudiante_headers)

    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["esta_inscrito"] is True
    assert data["tiene_acceso"] is True
    # Con acceso debe verse el contenido real (bloques presentes)
    lecciones = [
        l for m in data["modulos"] for l in m.get("lecciones", [])
    ]
    assert any(l.get("bloques") for l in lecciones), "Con acceso debe ver bloques"


@pytest.mark.integration
def test_obtener_curso_borrador_ajeno_es_404(
    client, db, docente_user, estudiante_headers
):
    """Un estudiante no debe poder abrir un borrador por id directo."""
    curso = _crear_curso(db, docente_user, titulo="Borrador privado", estado="BORRADOR")

    resp = client.get(f"/api/v1/cursos/{curso.id}", headers=estudiante_headers)

    assert resp.status_code == 404, resp.text


@pytest.mark.integration
def test_obtener_curso_borrador_dueno_ok(
    client, db, docente_user, docente_headers
):
    curso = _crear_curso(db, docente_user, titulo="Mi borrador", estado="BORRADOR")

    resp = client.get(f"/api/v1/cursos/{curso.id}", headers=docente_headers)

    assert resp.status_code == 200, resp.text
    assert resp.json()["titulo"] == "Mi borrador"


@pytest.mark.integration
def test_obtener_curso_borrador_admin_ok(
    client, db, docente_user, admin_headers
):
    curso = _crear_curso(db, docente_user, titulo="Borrador admin", estado="BORRADOR")

    resp = client.get(f"/api/v1/cursos/{curso.id}", headers=admin_headers)

    assert resp.status_code == 200, resp.text


@pytest.mark.integration
def test_obtener_curso_inexistente_404(client, docente_headers):
    resp = client.get("/api/v1/cursos/no-existe-xyz", headers=docente_headers)
    assert resp.status_code == 404, resp.text


# =============================================
# INSCRIPCIÓN Y ACCESO
# =============================================

@pytest.mark.integration
def test_estudiante_se_inscribe_en_curso_gratis(
    client, db, docente_user, estudiante_user, estudiante_headers
):
    curso = _crear_curso(db, docente_user, precio_tipo="gratis")

    resp = client.post(
        f"/api/v1/cursos/{curso.id}/inscribirse",
        headers=estudiante_headers,
    )

    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["curso_id"] == str(curso.id)
    assert data["estudiante_id"] == str(estudiante_user.id)


@pytest.mark.integration
def test_estudiante_sin_acceso_no_se_inscribe_en_curso_pago(
    client, db, docente_user, estudiante_headers
):
    curso = _crear_curso(db, docente_user, precio_tipo="pago", precio_monto=50)

    resp = client.post(
        f"/api/v1/cursos/{curso.id}/inscribirse",
        headers=estudiante_headers,
    )

    assert resp.status_code == 403, resp.text


@pytest.mark.integration
def test_estudiante_solicita_acceso_a_curso_pago(
    client, db, docente_user, estudiante_headers
):
    curso = _crear_curso(db, docente_user, precio_tipo="pago", precio_monto=50)

    resp = client.post(
        f"/api/v1/cursos/{curso.id}/solicitar-acceso",
        json={"mensaje_estudiante": "Pagué por Yape", "metodo_pago": "yape", "referencia_pago": "REF-1"},
        headers=estudiante_headers,
    )

    assert resp.status_code in (200, 201), resp.text
    data = resp.json()
    assert data["curso_id"] == str(curso.id)
    assert data["estado"] == "pendiente"


@pytest.mark.integration
def test_docente_aprueba_solicitud_crea_acceso_e_inscripcion(
    client, db, docente_user, docente_headers, estudiante_user, estudiante_headers
):
    curso = _crear_curso(db, docente_user, precio_tipo="pago", precio_monto=50)
    solicitud = client.post(
        f"/api/v1/cursos/{curso.id}/solicitar-acceso",
        json={},
        headers=estudiante_headers,
    ).json()

    resp = client.post(
        f"/api/v1/cursos/solicitudes/{solicitud['id']}/aprobar",
        json={"estado": "aprobado", "comentario_docente": "Pago verificado"},
        headers=docente_headers,
    )

    assert resp.status_code == 200, resp.text
    assert resp.json()["estado"] == "aprobado"

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
def test_docente_ajeno_no_puede_aprobar_solicitud(
    client, db, docente_user, otro_docente_headers, estudiante_headers
):
    curso = _crear_curso(db, docente_user, precio_tipo="pago", precio_monto=50)
    solicitud = client.post(
        f"/api/v1/cursos/{curso.id}/solicitar-acceso",
        json={},
        headers=estudiante_headers,
    ).json()

    resp = client.post(
        f"/api/v1/cursos/solicitudes/{solicitud['id']}/aprobar",
        json={"estado": "aprobado"},
        headers=otro_docente_headers,
    )

    assert resp.status_code == 403, resp.text


@pytest.mark.integration
def test_mis_cursos_devuelve_solo_los_del_estudiante(
    client, db, docente_user, estudiante_user, otro_docente_user, estudiante_headers
):
    curso_propio = _crear_curso(db, docente_user, titulo="Curso del estudiante")
    curso_ajeno = _crear_curso(db, docente_user, titulo="Curso de otro")

    db.add(InscripcionCurso(
        id=str(uuid.uuid4()),
        curso_id=str(curso_propio.id),
        estudiante_id=str(estudiante_user.id),
        estudiante_nombre=estudiante_user.nombre_completo,
        progreso=0,
        completado=False,
        lecciones_completadas=[],
    ))
    db.add(InscripcionCurso(
        id=str(uuid.uuid4()),
        curso_id=str(curso_ajeno.id),
        estudiante_id=str(otro_docente_user.id),
        estudiante_nombre=otro_docente_user.nombre_completo,
        progreso=0,
        completado=False,
        lecciones_completadas=[],
    ))
    db.commit()

    resp = client.get("/api/v1/cursos/mis-cursos", headers=estudiante_headers)

    assert resp.status_code == 200, resp.text
    curso_ids = [i["curso_id"] for i in resp.json()]
    assert str(curso_propio.id) in curso_ids
    assert str(curso_ajeno.id) not in curso_ids


@pytest.mark.integration
def test_verificar_acceso_estudiante(
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


# =============================================
# BLOQUEO SECUENCIAL DE LECCIONES
# =============================================

@pytest.mark.integration
def test_bloqueo_secuencial_segunda_leccion_bloqueada(
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
    assert "l1" in (data.get("lecciones_requeridas") or [])


@pytest.mark.integration
def test_bloqueo_secuencial_primera_leccion_libre(
    client, db, docente_user, estudiante_headers
):
    """La primera lección de un curso secuencial debe estar desbloqueada.
    Regresión: antes devolvía 500 por `razon=None` en un schema no opcional."""
    curso = _crear_curso(
        db, docente_user, modulos=MODULOS_2_LECCIONES, tipo_bloqueo="secuencial"
    )

    resp = client.get(
        f"/api/v1/cursos/{curso.id}/leccion/l1/estado-bloqueo",
        headers=estudiante_headers,
    )

    assert resp.status_code == 200, resp.text
    assert resp.json()["bloqueada"] is False


@pytest.mark.integration
def test_bloqueo_secuencial_se_desbloquea_al_completar_anterior(
    client, db, docente_user, estudiante_user, estudiante_headers
):
    """Al completar la lección anterior, la siguiente deja de estar bloqueada.
    Regresión: antes devolvía 500 por `razon=None` en un schema no opcional."""
    curso = _crear_curso(
        db, docente_user, modulos=MODULOS_2_LECCIONES, tipo_bloqueo="secuencial"
    )
    db.add(ProgresoLeccion(
        id=str(uuid.uuid4()),
        curso_id=str(curso.id),
        estudiante_id=str(estudiante_user.id),
        leccion_id="l1",
        modulo_id="m1",
        completado=True,
        fecha_completado=datetime.now(timezone.utc),
    ))
    db.commit()

    resp = client.get(
        f"/api/v1/cursos/{curso.id}/leccion/l2/estado-bloqueo",
        headers=estudiante_headers,
    )

    assert resp.status_code == 200, resp.text
    assert resp.json()["bloqueada"] is False


@pytest.mark.integration
def test_curso_gratis_inscrito_puede_completar_leccion(
    client, db, docente_user, estudiante_user, estudiante_headers
):
    """Un estudiante inscrito en un curso gratis debería poder completar lecciones.
    Regresión: antes inscribirse no creaba AccesoCurso y completar devolvía 403."""
    curso = _crear_curso(
        db, docente_user, precio_tipo="gratis", modulos=MODULOS_2_LECCIONES
    )
    client.post(
        f"/api/v1/cursos/{curso.id}/inscribirse",
        headers=estudiante_headers,
    )

    resp = client.post(
        f"/api/v1/cursos/{curso.id}/lecciones/l1/completar",
        json={"usuario_id": str(estudiante_user.id)},
        headers=estudiante_headers,
    )

    assert resp.status_code == 200, resp.text


@pytest.mark.integration
def test_mis_cursos_incluye_datos_del_curso(
    client, db, docente_user, estudiante_user, estudiante_headers
):
    """El front no debe depender del join con el catálogo (borradores/top-N)."""
    curso = _crear_curso(db, docente_user, titulo="Curso embebido", estado="BORRADOR")
    db.add(InscripcionCurso(
        id=str(uuid.uuid4()),
        curso_id=str(curso.id),
        estudiante_id=str(estudiante_user.id),
        estudiante_nombre=estudiante_user.nombre_completo,
        progreso=40,
        completado=False,
        lecciones_completadas=[],
    ))
    db.commit()

    resp = client.get("/api/v1/cursos/mis-cursos", headers=estudiante_headers)

    assert resp.status_code == 200, resp.text
    items = resp.json()
    assert len(items) == 1
    assert items[0]["curso_titulo"] == "Curso embebido"
    assert items[0]["curso_estado"] == "BORRADOR"
    assert items[0]["curso_precio_tipo"] == "gratis"
    assert items[0]["progreso"] == 40


@pytest.mark.integration
def test_reinscribirse_backfilla_acceso_curso_legacy(
    client, db, docente_user, estudiante_user, estudiante_headers
):
    """Inscripciones legacy sin AccesoCurso se curan al volver a inscribirse."""
    curso = _crear_curso(db, docente_user, precio_tipo="gratis")
    db.add(InscripcionCurso(
        id=str(uuid.uuid4()),
        curso_id=str(curso.id),
        estudiante_id=str(estudiante_user.id),
        estudiante_nombre=estudiante_user.nombre_completo,
        progreso=0,
        completado=False,
        lecciones_completadas=[],
    ))
    db.commit()
    assert db.query(AccesoCurso).filter(
        AccesoCurso.curso_id == str(curso.id),
        AccesoCurso.estudiante_id == str(estudiante_user.id),
    ).count() == 0

    resp = client.post(
        f"/api/v1/cursos/{curso.id}/inscribirse",
        headers=estudiante_headers,
    )

    assert resp.status_code == 200, resp.text
    db.expire_all()
    assert db.query(AccesoCurso).filter(
        AccesoCurso.curso_id == str(curso.id),
        AccesoCurso.estudiante_id == str(estudiante_user.id),
        AccesoCurso.activo == True,  # noqa: E712
    ).count() == 1


@pytest.mark.integration
def test_completar_leccion_gratis_legacy_sin_acceso_hace_backfill(
    client, db, docente_user, estudiante_user, estudiante_headers
):
    """Inscripción gratis sin AccesoCurso: completar debe funcionar y curar el acceso."""
    curso = _crear_curso(db, docente_user, precio_tipo="gratis", modulos=MODULOS_2_LECCIONES)
    db.add(InscripcionCurso(
        id=str(uuid.uuid4()),
        curso_id=str(curso.id),
        estudiante_id=str(estudiante_user.id),
        estudiante_nombre=estudiante_user.nombre_completo,
        progreso=0,
        completado=False,
        lecciones_completadas=[],
    ))
    db.commit()

    resp = client.post(
        f"/api/v1/cursos/{curso.id}/lecciones/l1/completar",
        json={"usuario_id": str(estudiante_user.id)},
        headers=estudiante_headers,
    )

    assert resp.status_code == 200, resp.text
    assert resp.json()["progreso"] == 50
    db.expire_all()
    assert db.query(AccesoCurso).filter(
        AccesoCurso.curso_id == str(curso.id),
        AccesoCurso.estudiante_id == str(estudiante_user.id),
        AccesoCurso.activo == True,  # noqa: E712
    ).count() == 1
