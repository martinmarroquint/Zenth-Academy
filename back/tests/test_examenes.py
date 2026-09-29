# back/tests/test_examenes.py
# =====================================================
# TESTS DE INTEGRACIÓN: CICLO DE VIDA DE EXÁMENES
#   - CRUD de exámenes (crear/listar/obtener/actualizar/eliminar)
#   - Transiciones de estado (BORRADOR -> PUBLICADO -> CERRADO)
#   - Envío de resultados y auto-calificación
#   - Límite de intentos
#   - Listado y revisión de resultados
# =====================================================

import uuid

import pytest

from app.models.curso import Curso, InscripcionCurso, ProgresoLeccion
from app.models.examen import Examen, Pregunta
from app.models.resultado_examen import ResultadoExamen


# =====================================================
# HELPERS
# =====================================================

def _crear_examen(
    db,
    docente,
    *,
    titulo: str = "Examen de prueba",
    estado: str = "BORRADOR",
    intentos_permitidos: int = 1,
    preguntas=None,
    configuracion=None,
    grupo_id=None,
):
    """Crea un Examen (+ Pregunta) directamente en la BD de test."""
    examen = Examen(
        id=str(uuid.uuid4()),
        codigo=f"EXA-TEST-{uuid.uuid4().hex[:8]}",
        titulo=titulo,
        descripcion="",
        tiempo_limite=60,
        puntaje_aprobacion=60.0,
        estado=estado,
        configuracion=configuracion if configuracion is not None else {},
        intentos_permitidos=intentos_permitidos,
        grupo_id=grupo_id,
        docente_id=str(docente.id) if docente else None,
    )
    db.add(examen)
    for i, p in enumerate(preguntas or []):
        db.add(Pregunta(
            id=str(uuid.uuid4()),
            examen_id=examen.id,
            tipo=p.get("tipo", "opcion_multiple"),
            enunciado=p.get("enunciado", f"Pregunta {i + 1}"),
            puntos=p.get("puntos", 1.0),
            orden=p.get("orden", i),
            opcion_a=p.get("opcion_a"),
            opcion_b=p.get("opcion_b"),
            opcion_c=p.get("opcion_c"),
            opcion_d=p.get("opcion_d"),
            opcion_e=p.get("opcion_e"),
            respuesta_correcta=p.get("respuesta_correcta"),
        ))
    db.commit()
    db.refresh(examen)
    return examen


def _opcion_multiple(respuesta_correcta=1, puntos=10.0):
    """Pregunta de opción múltiple lista para auto-calificación."""
    return {
        "tipo": "opcion_multiple",
        "enunciado": "¿Cuánto es 2 + 2?",
        "puntos": puntos,
        "opcion_a": "3",
        "opcion_b": "4",
        "opcion_c": "5",
        "respuesta_correcta": respuesta_correcta,
    }


def _payload_resultado(examen, alumno_id, respuestas, **extra):
    data = {
        "examen_id": str(examen.id),
        "alumno_id": str(alumno_id),
        "alumno_nombre": "Alumno Test",
        "respuestas": respuestas,
    }
    data.update(extra)
    return data


def _iniciar_intento(client, examen, headers):
    """Inicia un intento en el servidor y devuelve su id (requerido al entregar)."""
    resp = client.post(f"/api/v1/examenes/{examen.id}/intentos", headers=headers)
    assert resp.status_code == 200, resp.text
    return resp.json()["intento_id"]


def _curso_con_examen(db, docente, examen_id, titulo):
    """Curso con una única lección tipo 'examen' que apunta a examen_id."""
    curso = Curso(
        id=str(uuid.uuid4()),
        titulo=titulo,
        descripcion="Curso generado en tests",
        categoria="general",
        nivel="principiante",
        docente_id=str(docente.id),
        docente_nombre="Docente Test",
        precio_tipo="gratis",
        moneda="PEN",
        estado="PUBLICADO",
        modulos=[
            {
                "id": "m1",
                "titulo": "Módulo 1",
                "lecciones": [
                    {
                        "id": "l1",
                        "titulo": "Examen",
                        "tipo": "examen",
                        "contenido": {"examen_id": str(examen_id)},
                    }
                ],
            }
        ],
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


def _inscribir_estudiante(db, curso, estudiante, nombre="Alumno Test"):
    db.add(
        InscripcionCurso(
            id=str(uuid.uuid4()),
            curso_id=str(curso.id),
            estudiante_id=str(estudiante.id),
            estudiante_nombre=nombre,
        )
    )
    db.commit()


def _progreso_de(db, curso, estudiante, leccion_id="l1"):
    return (
        db.query(ProgresoLeccion)
        .filter(
            ProgresoLeccion.curso_id == str(curso.id),
            ProgresoLeccion.estudiante_id == str(estudiante.id),
            ProgresoLeccion.leccion_id == str(leccion_id),
        )
        .first()
    )


# =====================================================
# 1. CREACIÓN
# =====================================================

@pytest.mark.integration
def test_docente_crea_examen_201_borrador(client, docente_user, docente_headers):
    payload = {
        "titulo": "Examen creado por API",
        "descripcion": "Descripción",
        "tiempo_limite": 30,
        "intentos_permitidos": 2,
        "preguntas": [_opcion_multiple()],
    }

    resp = client.post("/api/v1/examenes/", json=payload, headers=docente_headers)

    assert resp.status_code == 201, resp.text
    data = resp.json()
    assert data["titulo"] == payload["titulo"]
    assert data["estado"] == "BORRADOR"
    assert len(data["preguntas"]) == 1
    assert data["codigo"].startswith("EXA-")


@pytest.mark.integration
def test_crear_examen_asigna_docente_id(client, db, docente_user, docente_headers):
    resp = client.post(
        "/api/v1/examenes/",
        json={"titulo": "Examen con dueño", "preguntas": []},
        headers=docente_headers,
    )

    assert resp.status_code == 201, resp.text
    examen_id = resp.json()["id"]
    db.expire_all()
    examen = db.query(Examen).filter(Examen.id == examen_id).first()
    assert examen is not None
    assert str(examen.docente_id) == str(docente_user.id)


@pytest.mark.security
@pytest.mark.integration
def test_estudiante_no_puede_crear_examen(client, estudiante_headers):
    resp = client.post(
        "/api/v1/examenes/",
        json={"titulo": "Examen del estudiante", "preguntas": []},
        headers=estudiante_headers,
    )
    assert resp.status_code == 403, resp.text


# =====================================================
# 2. LISTADO Y OBTENCIÓN
# =====================================================

@pytest.mark.integration
def test_listar_examenes(client, db, docente_user, docente_headers):
    _crear_examen(db, docente_user, titulo="Examen A")
    _crear_examen(db, docente_user, titulo="Examen B")

    resp = client.get("/api/v1/examenes/", headers=docente_headers)

    assert resp.status_code == 200, resp.text
    titulos = [e["titulo"] for e in resp.json()]
    assert "Examen A" in titulos
    assert "Examen B" in titulos


@pytest.mark.integration
def test_obtener_examen_por_id(client, db, docente_user, docente_headers):
    examen = _crear_examen(db, docente_user, preguntas=[_opcion_multiple()])

    resp = client.get(f"/api/v1/examenes/{examen.id}", headers=docente_headers)

    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["id"] == str(examen.id)
    assert len(data["preguntas"]) == 1


@pytest.mark.integration
def test_obtener_examen_inexistente_404(client, docente_headers):
    resp = client.get("/api/v1/examenes/no-existe", headers=docente_headers)
    assert resp.status_code == 404, resp.text


# =====================================================
# 3. ESTADOS
# =====================================================

@pytest.mark.integration
def test_cambiar_estado_borrador_publicado_cerrado(client, db, docente_user, docente_headers):
    examen = _crear_examen(db, docente_user, estado="BORRADOR")

    r_pub = client.put(
        f"/api/v1/examenes/{examen.id}/estado",
        params={"estado": "PUBLICADO"},
        headers=docente_headers,
    )
    assert r_pub.status_code == 200, r_pub.text

    r_cer = client.put(
        f"/api/v1/examenes/{examen.id}/estado",
        params={"estado": "CERRADO"},
        headers=docente_headers,
    )
    assert r_cer.status_code == 200, r_cer.text

    db.expire_all()
    actualizado = db.query(Examen).filter(Examen.id == examen.id).first()
    assert actualizado.estado == "CERRADO"


# =====================================================
# 4. ACTUALIZACIÓN Y ELIMINACIÓN
# =====================================================

@pytest.mark.integration
def test_actualizar_examen_reemplaza_preguntas(client, db, docente_user, docente_headers):
    examen = _crear_examen(db, docente_user, preguntas=[_opcion_multiple()])

    payload = {
        "titulo": "Examen actualizado",
        "preguntas": [
            _opcion_multiple(),
            {"tipo": "respuesta_corta", "enunciado": "Capital de Perú", "puntos": 5.0,
             "respuesta_corta": "Lima"},
        ],
    }

    resp = client.put(
        f"/api/v1/examenes/{examen.id}", json=payload, headers=docente_headers
    )

    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["titulo"] == "Examen actualizado"
    assert len(data["preguntas"]) == 2
    tipos = {p["tipo"] for p in data["preguntas"]}
    assert tipos == {"opcion_multiple", "respuesta_corta"}


@pytest.mark.integration
def test_eliminar_examen(client, db, docente_user, docente_headers):
    examen = _crear_examen(db, docente_user)

    resp = client.delete(f"/api/v1/examenes/{examen.id}", headers=docente_headers)

    assert resp.status_code == 200, resp.text
    assert resp.json()["ok"] is True

    db.expire_all()
    assert db.query(Examen).filter(Examen.id == examen.id).first() is None


# =====================================================
# 5. ENVÍO DE RESULTADOS
# =====================================================

@pytest.mark.integration
def test_enviar_resultado_examen_no_publicado_400(
    client, db, docente_user, estudiante_user, estudiante_headers
):
    examen = _crear_examen(
        db, docente_user, estado="BORRADOR", preguntas=[_opcion_multiple()]
    )

    resp = client.post(
        "/api/v1/examenes/resultados",
        json=_payload_resultado(examen, estudiante_user.id, {"0": 1}),
        headers=estudiante_headers,
    )

    assert resp.status_code == 400, resp.text


@pytest.mark.integration
def test_enviar_resultado_examen_publicado_201_calcula_calificacion(
    client, db, docente_user, estudiante_user, estudiante_headers
):
    examen = _crear_examen(
        db, docente_user, estado="PUBLICADO", preguntas=[_opcion_multiple(respuesta_correcta=1)]
    )

    intento_id = _iniciar_intento(client, examen, estudiante_headers)
    resp = client.post(
        "/api/v1/examenes/resultados",
        json=_payload_resultado(examen, estudiante_user.id, {"0": 1}, intento_id=intento_id),
        headers=estudiante_headers,
    )

    assert resp.status_code == 201, resp.text
    data = resp.json()
    assert data["calificacion"] == pytest.approx(100.0)
    assert data["correctas"] == 1
    assert data["puntos_obtenidos"] == pytest.approx(10.0)
    assert data["total_puntos"] == pytest.approx(10.0)


@pytest.mark.integration
def test_enviar_resultado_respuesta_incorrecta_calificacion_cero(
    client, db, docente_user, estudiante_user, estudiante_headers
):
    examen = _crear_examen(
        db, docente_user, estado="PUBLICADO", preguntas=[_opcion_multiple(respuesta_correcta=1)]
    )

    intento_id = _iniciar_intento(client, examen, estudiante_headers)
    resp = client.post(
        "/api/v1/examenes/resultados",
        json=_payload_resultado(examen, estudiante_user.id, {"0": 0}, intento_id=intento_id),
        headers=estudiante_headers,
    )

    assert resp.status_code == 201, resp.text
    assert resp.json()["calificacion"] == pytest.approx(0.0)


@pytest.mark.integration
def test_limite_de_intentos(client, db, docente_user, estudiante_user, estudiante_headers):
    examen = _crear_examen(
        db,
        docente_user,
        estado="PUBLICADO",
        intentos_permitidos=1,
        preguntas=[_opcion_multiple()],
    )

    intento_id = _iniciar_intento(client, examen, estudiante_headers)
    primero = client.post(
        "/api/v1/examenes/resultados",
        json=_payload_resultado(examen, estudiante_user.id, {"0": 1}, intento_id=intento_id),
        headers=estudiante_headers,
    )
    assert primero.status_code == 201, primero.text

    segundo = client.post(
        "/api/v1/examenes/resultados",
        json=_payload_resultado(examen, estudiante_user.id, {"0": 1}, intento_id=intento_id),
        headers=estudiante_headers,
    )
    assert segundo.status_code == 400, segundo.text


# =====================================================
# 6. LISTADO Y REVISIÓN DE RESULTADOS
# =====================================================

@pytest.mark.integration
def test_listar_resultados_como_docente(
    client, db, docente_user, docente_headers, estudiante_user, estudiante_headers
):
    examen = _crear_examen(
        db, docente_user, estado="PUBLICADO", preguntas=[_opcion_multiple()]
    )
    intento_id = _iniciar_intento(client, examen, estudiante_headers)
    client.post(
        "/api/v1/examenes/resultados",
        json=_payload_resultado(examen, estudiante_user.id, {"0": 1}, intento_id=intento_id),
        headers=estudiante_headers,
    )

    resp = client.get(
        f"/api/v1/examenes/resultados/{examen.id}", headers=docente_headers
    )

    assert resp.status_code == 200, resp.text
    resultados = resp.json()
    assert len(resultados) == 1
    assert resultados[0]["examen_id"] == str(examen.id)


@pytest.mark.integration
def test_revision_resultado_docente_incluye_detalle_por_pregunta(
    client, db, docente_user, docente_headers, estudiante_user, estudiante_headers
):
    examen = _crear_examen(
        db, docente_user, estado="PUBLICADO", preguntas=[_opcion_multiple(respuesta_correcta=1)]
    )
    intento_id = _iniciar_intento(client, examen, estudiante_headers)
    creado = client.post(
        "/api/v1/examenes/resultados",
        json=_payload_resultado(examen, estudiante_user.id, {"0": 1}, intento_id=intento_id),
        headers=estudiante_headers,
    ).json()

    resp = client.get(
        f"/api/v1/examenes/resultados/{examen.id}/revision/{creado['id']}",
        headers=docente_headers,
    )

    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["resultado_id"] == creado["id"]
    assert len(data["detalle"]) == 1
    detalle = data["detalle"][0]
    assert detalle["tipo"] == "opcion_multiple"
    assert detalle["correcta"] is True
    assert detalle["puntos_obtenidos"] == pytest.approx(10.0)


@pytest.mark.security
@pytest.mark.integration
def test_estudiante_no_puede_listar_resultados_como_docente(
    client, db, docente_user, estudiante_headers
):
    examen = _crear_examen(db, docente_user, estado="PUBLICADO")
    resp = client.get(
        f"/api/v1/examenes/resultados/{examen.id}", headers=estudiante_headers
    )
    assert resp.status_code == 403, resp.text


# =====================================================
# 7. LISTADOS ESPECIALES (publicados / resumen / grupo / bulk)
# =====================================================

@pytest.mark.integration
def test_listar_examenes_publicados(client, db, docente_user, docente_headers):
    _crear_examen(db, docente_user, titulo="Publicado", estado="PUBLICADO")
    _crear_examen(db, docente_user, titulo="Borrador", estado="BORRADOR")

    resp = client.get("/api/v1/examenes/publicados", headers=docente_headers)

    assert resp.status_code == 200, resp.text
    titulos = [e["titulo"] for e in resp.json()]
    assert "Publicado" in titulos
    assert "Borrador" not in titulos


@pytest.mark.integration
def test_obtener_resumen_examenes(client, db, docente_user, docente_headers):
    _crear_examen(db, docente_user, estado="PUBLICADO")
    _crear_examen(db, docente_user, estado="BORRADOR")
    _crear_examen(db, docente_user, estado="CERRADO")

    resp = client.get("/api/v1/examenes/resumen", headers=docente_headers)

    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["total"] == 3
    assert data["publicados"] == 1
    assert data["borradores"] == 1
    assert data["cerrados"] == 1


@pytest.mark.integration
def test_listar_examenes_por_grupo(client, db, docente_user, docente_headers):
    _crear_examen(db, docente_user, titulo="Del grupo", grupo_id="g1")
    _crear_examen(db, docente_user, titulo="De otro grupo", grupo_id="g2")

    resp = client.get("/api/v1/examenes/grupo/g1", headers=docente_headers)

    assert resp.status_code == 200, resp.text
    titulos = [e["titulo"] for e in resp.json()]
    assert titulos == ["Del grupo"]


@pytest.mark.integration
def test_listar_examenes_bulk(client, db, docente_user, docente_headers):
    _crear_examen(db, docente_user, titulo="Bulk A", grupo_id="g1")

    resp = client.get(
        "/api/v1/examenes/bulk",
        params={"grupo_ids": "g1"},
        headers=docente_headers,
    )

    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert "g1" in data
    assert data["g1"][0]["titulo"] == "Bulk A"


# =====================================================
# 8. ACCESO PÚBLICO (sin login)
# =====================================================

@pytest.mark.integration
def test_examen_publico_por_codigo(client, db, docente_user):
    examen = _crear_examen(
        db,
        docente_user,
        estado="PUBLICADO",
        configuracion={"acceso_publico": True},
        preguntas=[_opcion_multiple()],
    )

    resp = client.get(f"/api/v1/examenes/publico/{examen.codigo}")

    assert resp.status_code == 200, resp.text
    assert resp.json()["codigo"] == examen.codigo


@pytest.mark.integration
def test_examen_publico_sin_acceso_403(client, db, docente_user):
    examen = _crear_examen(
        db,
        docente_user,
        estado="PUBLICADO",
        configuracion={"acceso_publico": False},
    )

    resp = client.get(f"/api/v1/examenes/publico/{examen.codigo}")

    assert resp.status_code == 403, resp.text


@pytest.mark.integration
def test_examen_publico_inexistente_404(client):
    resp = client.get("/api/v1/examenes/publico/NO-EXISTE")
    assert resp.status_code == 404, resp.text


@pytest.mark.integration
def test_verificar_password_examen_publico(client, db, docente_user):
    examen = _crear_examen(
        db,
        docente_user,
        estado="PUBLICADO",
        configuracion={"acceso_publico": True, "password_examen": "secreto"},
    )

    ok = client.post(
        f"/api/v1/examenes/publico/{examen.codigo}/verificar-password",
        json={"password": "secreto"},
    )
    mal = client.post(
        f"/api/v1/examenes/publico/{examen.codigo}/verificar-password",
        json={"password": "incorrecto"},
    )

    assert ok.status_code == 200, ok.text
    assert mal.status_code == 401, mal.text


@pytest.mark.integration
def test_guardar_resultado_publico_calcula_calificacion(client, db, docente_user):
    examen = _crear_examen(
        db,
        docente_user,
        estado="PUBLICADO",
        configuracion={"acceso_publico": True},
        preguntas=[_opcion_multiple(respuesta_correcta=1)],
    )

    intento = client.post(f"/api/v1/examenes/publico/{examen.codigo}/intentos", json={})
    assert intento.status_code == 200, intento.text
    intento_id = intento.json()["intento_id"]

    resp = client.post(
        f"/api/v1/examenes/publico/{examen.codigo}/resultado",
        json={"respuestas": {"0": 1}, "alumno_nombre": "Anónimo", "alumno_id": "pub-1", "intento_id": intento_id},
    )

    assert resp.status_code == 201, resp.text
    data = resp.json()
    assert data["ok"] is True
    assert data["calificacion"] == pytest.approx(100.0)


# =====================================================
# 9. MEJOR RESULTADO / LIMPIEZA
# =====================================================

def _crear_resultado(db, examen, alumno_id, calificacion, *, estado="COMPLETADO"):
    resultado = ResultadoExamen(
        id=str(uuid.uuid4()),
        examen_id=str(examen.id),
        alumno_id=str(alumno_id),
        alumno_id_unificado=str(alumno_id),
        alumno_nombre="Alumno Test",
        respuestas={},
        calificacion=calificacion,
        correctas=0,
        total_preguntas=1,
        puntos_obtenidos=calificacion,
        total_puntos=100.0,
        estado=estado,
    )
    db.add(resultado)
    db.commit()
    db.refresh(resultado)
    return resultado


@pytest.mark.integration
def test_obtener_mejor_resultado(client, db, docente_user, docente_headers, estudiante_user):
    examen = _crear_examen(db, docente_user, estado="PUBLICADO")
    _crear_resultado(db, examen, estudiante_user.id, 40.0)
    _crear_resultado(db, examen, estudiante_user.id, 80.0)

    resp = client.get(
        f"/api/v1/examenes/resultados/{examen.id}/mejor/{estudiante_user.id}",
        headers=docente_headers,
    )

    assert resp.status_code == 200, resp.text
    assert resp.json()["calificacion"] == pytest.approx(80.0)


@pytest.mark.integration
def test_limpiar_resultados(client, db, docente_user, docente_headers, estudiante_user):
    examen = _crear_examen(db, docente_user, estado="PUBLICADO")
    _crear_resultado(db, examen, estudiante_user.id, 50.0)

    resp = client.delete(
        f"/api/v1/examenes/resultados/{examen.id}", headers=docente_headers
    )

    assert resp.status_code == 200, resp.text
    db.expire_all()
    assert db.query(ResultadoExamen).filter(
        ResultadoExamen.examen_id == str(examen.id)
    ).count() == 0


@pytest.mark.integration
def test_eliminar_resultado_alumno(client, db, docente_user, docente_headers, estudiante_user):
    examen = _crear_examen(db, docente_user, estado="PUBLICADO")
    _crear_resultado(db, examen, estudiante_user.id, 50.0)

    resp = client.delete(
        f"/api/v1/examenes/resultados/{examen.id}/{estudiante_user.id}",
        headers=docente_headers,
    )

    assert resp.status_code == 200, resp.text
    assert resp.json()["ok"] is True


@pytest.mark.integration
def test_revision_resultado_inexistente_404(client, db, docente_user, docente_headers):
    examen = _crear_examen(db, docente_user, estado="PUBLICADO")

    resp = client.get(
        f"/api/v1/examenes/resultados/{examen.id}/revision/no-existe",
        headers=docente_headers,
    )

    assert resp.status_code == 404, resp.text


@pytest.mark.integration
def test_resultado_sin_alumno_id_usa_al_usuario_autenticado(
    client, db, docente_user, estudiante_user, estudiante_headers
):
    """✅ El front manda alumno_id=null cuando no resuelve el alumno.

    Antes: 422 (schema lo exigía) o IntegrityError si pasaba el schema, y el
    alumno veía nota 0 sin aviso. Ahora el servidor completa con la identidad
    verificada del usuario autenticado.
    """
    from app.models.resultado_examen import ResultadoExamen

    examen = _crear_examen(
        db, docente_user, estado="PUBLICADO", preguntas=[_opcion_multiple()]
    )
    intento_id = _iniciar_intento(client, examen, estudiante_headers)

    resp = client.post(
        "/api/v1/examenes/resultados",
        json={
            "examen_id": str(examen.id),
            "alumno_id": None,
            "alumno_nombre": "Alumno Test",
            "respuestas": {"0": 1},
            "intento_id": intento_id,
        },
        headers=estudiante_headers,
    )
    assert resp.status_code == 201, resp.text

    db.expire_all()
    fila = (
        db.query(ResultadoExamen)
        .filter(ResultadoExamen.examen_id == str(examen.id))
        .first()
    )
    assert fila is not None, "no se guardó el resultado"
    assert fila.alumno_id == str(estudiante_user.id), fila.alumno_id


# =============================================
# 8. SINCRONIZACIÓN CON EL PROGRESO DEL CURSO
# =============================================


@pytest.mark.integration
def test_nota_se_registra_si_hay_otro_curso_del_docente_sin_inscripcion(
    client, db, docente_user, estudiante_user, estudiante_headers
):
    """Un mismo examen puede estar en varios cursos del docente y el alumno
    estar inscrito en solo uno de ellos.

    ✅ REGRESIÓN: antes, si el PRIMER curso revisado no tenía al alumno
    inscrito se abortaba con `return` y la nota no se registraba en NINGUNO
    (el alumno rendía el examen y su lección quedaba sin nota).
    """
    examen = _crear_examen(
        db, docente_user, estado="PUBLICADO", preguntas=[_opcion_multiple()]
    )
    # Creado primero: es el que se evalúa antes en la query sin ORDER BY
    _curso_con_examen(db, docente_user, examen.id, "Curso A (sin este alumno)")
    curso_b = _curso_con_examen(db, docente_user, examen.id, "Curso B (sí inscrito)")
    _inscribir_estudiante(db, curso_b, estudiante_user)
    db.expire_all()

    intento_id = _iniciar_intento(client, examen, estudiante_headers)
    resp = client.post(
        "/api/v1/examenes/resultados",
        json=_payload_resultado(examen, estudiante_user.id, {"0": 1}, intento_id=intento_id),
        headers=estudiante_headers,
    )
    assert resp.status_code == 201, resp.text

    db.expire_all()
    progreso = _progreso_de(db, curso_b, estudiante_user)
    assert progreso is not None, "el examen no volcó la nota en el curso inscrito"
    assert float(progreso.nota) == pytest.approx(100.0)
    assert progreso.aprobado is True


@pytest.mark.integration
def test_reintento_peor_no_pisa_la_nota_de_la_leccion(
    client, db, docente_user, estudiante_user, estudiante_headers
):
    """La nota de la lección-examen se guarda con la MISMA regla que la
    planilla, la ficha y el CSV: mejor intento no-trampa.

    ✅ REGRESIÓN: antes se escribía el ÚLTIMO intento, así que un reintento
    peor dejaba la lección en 0 y aprobado=False mientras el CSV seguía
    mostrando la mejor nota.
    """
    examen = _crear_examen(
        db,
        docente_user,
        estado="PUBLICADO",
        intentos_permitidos=5,
        preguntas=[_opcion_multiple()],
    )
    curso = _curso_con_examen(db, docente_user, examen.id, "Curso con reintentos")
    _inscribir_estudiante(db, curso, estudiante_user)
    db.expire_all()

    # Intento 1: correcto -> 100
    intento = _iniciar_intento(client, examen, estudiante_headers)
    primero = client.post(
        "/api/v1/examenes/resultados",
        json=_payload_resultado(examen, estudiante_user.id, {"0": 1}, intento_id=intento),
        headers=estudiante_headers,
    )
    assert primero.status_code == 201, primero.text
    assert primero.json()["calificacion"] == pytest.approx(100.0)

    # Intento 2: incorrecto -> 0 (no debe pisar la nota de la lección)
    intento2 = _iniciar_intento(client, examen, estudiante_headers)
    segundo = client.post(
        "/api/v1/examenes/resultados",
        json=_payload_resultado(examen, estudiante_user.id, {"0": 0}, intento_id=intento2),
        headers=estudiante_headers,
    )
    assert segundo.status_code == 201, segundo.text
    assert segundo.json()["calificacion"] == pytest.approx(0.0)

    db.expire_all()
    progreso = _progreso_de(db, curso, estudiante_user)
    assert progreso is not None
    assert float(progreso.nota) == pytest.approx(100.0), (
        f"la nota de la lección debe ser la MEJOR (100), no la última: {progreso.nota}"
    )
    assert progreso.aprobado is True
    assert int(progreso.intentos or 0) == 2


@pytest.mark.security
@pytest.mark.integration
def test_estudiante_sin_acceso_al_curso_no_puede_rendir_el_examen(
    client, db, docente_user, estudiante_user, estudiante_headers
):
    """✅ SINCRONIZACIÓN: un examen embebido en las lecciones de un curso solo
    puede rendirlo quien tenga acceso real a ese curso.

    Antes cualquier estudiante que adivinara el id podía iniciar un intento y
    dejar un resultado en la lista de resultados de un docente al que no le
    da clases (nota fantasma, seguimiento contaminado).
    """
    examen = _crear_examen(
        db, docente_user, estado="PUBLICADO", preguntas=[_opcion_multiple()]
    )
    _curso_con_examen(db, docente_user, examen.id, "Curso ajeno al alumno")
    db.expire_all()

    intento = client.post(
        f"/api/v1/examenes/{examen.id}/intentos", headers=estudiante_headers
    )
    assert intento.status_code == 403, intento.text
    assert "inscrito" in intento.json()["detail"]

    entrega = client.post(
        "/api/v1/examenes/resultados",
        json=_payload_resultado(examen, estudiante_user.id, {"0": 1}),
        headers=estudiante_headers,
    )
    assert entrega.status_code == 403, entrega.text

    db.expire_all()
    assert (
        db.query(ResultadoExamen)
        .filter(ResultadoExamen.examen_id == str(examen.id))
        .first()
        is None
    ), "no debe quedar ningún resultado si no tiene acceso al curso"


@pytest.mark.security
@pytest.mark.integration
def test_acceso_directo_al_curso_permite_rendir_el_examen(
    client, db, docente_user, estudiante_user, estudiante_headers
):
    """El alumno con acceso directo (sin fila de inscripción) también cuenta
    como parte del curso: es parte del mismo criterio que usa el roster."""
    from app.models.curso import AccesoCurso

    examen = _crear_examen(
        db, docente_user, estado="PUBLICADO", preguntas=[_opcion_multiple()]
    )
    curso = _curso_con_examen(db, docente_user, examen.id, "Curso con acceso directo")
    db.add(
        AccesoCurso(
            id=str(uuid.uuid4()),
            curso_id=str(curso.id),
            estudiante_id=str(estudiante_user.id),
            estudiante_nombre="Alumno Test",
            tipo_acceso="directo",
            activo=True,
        )
    )
    db.commit()
    db.expire_all()

    intento = _iniciar_intento(client, examen, estudiante_headers)
    resp = client.post(
        "/api/v1/examenes/resultados",
        json=_payload_resultado(examen, estudiante_user.id, {"0": 1}, intento_id=intento),
        headers=estudiante_headers,
    )
    assert resp.status_code == 201, resp.text
    assert resp.json()["calificacion"] == pytest.approx(100.0)
