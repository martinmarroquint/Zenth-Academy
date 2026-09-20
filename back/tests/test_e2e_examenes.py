# back/tests/test_e2e_examenes.py
# =====================================================
# TESTS END-TO-END (E2E): FLUJO COMPLETO DE EXÁMENES
#
# Simula el recorrido COMPLETO del frontend usando SOLO la API HTTP
# (TestClient): crear examen -> publicar -> rendir -> calificar ->
# revisar -> límite de intentos -> anti-trampa -> curso + certificado ->
# examen público sin login.
#
# Todos los recursos se crean vía endpoints reales (POST/PUT), nunca
# escribiendo directamente en la BD, para probar la API tal como la
# consume el frontend.
# =====================================================

import pytest

pytestmark = [pytest.mark.integration, pytest.mark.e2e]


# =====================================================
# HELPERS
# =====================================================

def _crear_examen_api(
    client,
    headers,
    *,
    titulo="Examen E2E",
    preguntas=None,
    intentos_permitidos=2,
    configuracion=None,
    tiempo_limite=30,
    puntaje_aprobacion=60,
):
    """Crea un examen vía POST /api/v1/examenes/ (endpoint real)."""
    payload = {
        "titulo": titulo,
        "descripcion": "Examen generado en test E2E",
        "tiempo_limite": tiempo_limite,
        "puntaje_aprobacion": puntaje_aprobacion,
        "intentos_permitidos": intentos_permitidos,
        "preguntas": preguntas if preguntas is not None else [],
    }
    if configuracion is not None:
        payload["configuracion"] = configuracion

    resp = client.post("/api/v1/examenes/", json=payload, headers=headers)
    assert resp.status_code == 201, f"No se pudo crear el examen: {resp.text}"
    return resp.json()


def _publicar_examen(client, headers, examen_id):
    """Publica un examen vía PUT /api/v1/examenes/{id}/estado?estado=PUBLICADO."""
    resp = client.put(
        f"/api/v1/examenes/{examen_id}/estado",
        params={"estado": "PUBLICADO"},
        headers=headers,
    )
    assert resp.status_code == 200, f"No se pudo publicar el examen: {resp.text}"
    return resp


def _enviar_resultado(client, headers, examen_id, alumno_id, respuestas, **extra):
    """Envía un resultado vía POST /api/v1/examenes/resultados.

    ✅ Autoridad de tiempo: inicia un intento en el servidor (si el examen lo
    permite) e incluye su id. Si el inicio falla (p.ej. examen no publicado),
    se envía igual para comprobar el rechazo correspondiente.
    """
    body = {
        "examen_id": str(examen_id),
        "alumno_id": str(alumno_id),
        "alumno_nombre": "Estudiante E2E",
        "alumno_grado": "5to",
        "alumno_dni": "12345678",
        "respuestas": respuestas,
    }
    body.update(extra)
    if "intento_id" not in body:
        intento = client.post(f"/api/v1/examenes/{examen_id}/intentos", headers=headers)
        if intento.status_code == 200:
            body["intento_id"] = intento.json()["intento_id"]
    return client.post("/api/v1/examenes/resultados", json=body, headers=headers)


def _preguntas_4_tipos():
    """4 preguntas (10 pts c/u) de tipos distintos con sus respuestas correctas.

    NOTA: los schemas `AfirmacionVF`, `SegmentoCompletar` y `FraseCompletar`
    exigen un campo `id: str`, por eso se incluye (el enunciado de la tarea lo
    omitía). El segmento de texto usa `contenido` (campo extra ignorado por el
    schema, que espera `texto`); no afecta la auto-calificación porque solo se
    evalúan los segmentos de tipo `espacio`.
    """
    return [
        {
            "tipo": "opcion_multiple",
            "enunciado": "¿Cuál es la capital de Perú?",
            "puntos": 10,
            "opcion_a": "Lima",
            "opcion_b": "Quito",
            "respuesta_correcta": "0",
        },
        {
            "tipo": "verdadero_falso",
            "enunciado": "Marca si la afirmación es verdadera",
            "puntos": 10,
            "afirmaciones": [
                {"id": "a1", "texto": "El sol es una estrella", "esVerdadero": True}
            ],
        },
        {
            "tipo": "respuesta_corta",
            "enunciado": "¿Cuál es la capital de Francia?",
            "puntos": 10,
            "respuesta_corta": "Paris",
        },
        {
            "tipo": "completar",
            "enunciado": "Completa la frase",
            "puntos": 10,
            "frases": [
                {
                    "id": "f1",
                    "segmentos": [
                        {"id": "s1", "tipo": "texto", "contenido": "La capital de Peru es "},
                        {"id": "s2", "tipo": "espacio", "respuesta": "Lima"},
                    ],
                }
            ],
        },
    ]


RESPUESTAS_CORRECTAS = {"0": 0, "1": [True], "2": "Paris", "3": ["Lima"]}
RESPUESTAS_INCORRECTAS = {"0": 1, "1": [False], "2": "Londres", "3": ["Quito"]}


# =====================================================
# ESCENARIO 1: CICLO COMPLETO (crear -> publicar -> rendir -> calificar)
# =====================================================

def test_e2e_ciclo_completo_examen(
    client, docente_headers, estudiante_user, estudiante_headers
):
    # 1. Docente crea examen con 4 preguntas de distintos tipos
    examen = _crear_examen_api(
        client,
        docente_headers,
        titulo="Examen E2E ciclo completo",
        preguntas=_preguntas_4_tipos(),
        intentos_permitidos=2,
    )

    # 2. Se creó en BORRADOR con las 4 preguntas
    assert examen["estado"] == "BORRADOR", examen
    assert len(examen["preguntas"]) == 4, examen

    # 3. Publicar
    _publicar_examen(client, docente_headers, examen["id"])

    # 4. Estudiante rinde con TODAS las respuestas correctas -> 100 / 4 correctas
    r_ok = _enviar_resultado(
        client,
        estudiante_headers,
        examen["id"],
        estudiante_user.id,
        RESPUESTAS_CORRECTAS,
    )
    assert r_ok.status_code == 201, r_ok.text
    data_ok = r_ok.json()
    assert data_ok["calificacion"] == pytest.approx(100.0), data_ok
    assert data_ok["correctas"] == 4, data_ok
    assert data_ok["puntos_obtenidos"] == pytest.approx(40.0), data_ok
    assert data_ok["total_puntos"] == pytest.approx(40.0), data_ok

    # 5. Segundo intento con respuestas incorrectas -> 0
    r_mal = _enviar_resultado(
        client,
        estudiante_headers,
        examen["id"],
        estudiante_user.id,
        RESPUESTAS_INCORRECTAS,
    )
    assert r_mal.status_code == 201, r_mal.text
    data_mal = r_mal.json()
    assert data_mal["calificacion"] == pytest.approx(0.0), data_mal
    assert data_mal["correctas"] == 0, data_mal

    # 6. Docente lista resultados -> 2 resultados
    r_lista = client.get(
        f"/api/v1/examenes/resultados/{examen['id']}", headers=docente_headers
    )
    assert r_lista.status_code == 200, r_lista.text
    resultados = r_lista.json()
    assert len(resultados) == 2, r_lista.text

    # 7. Docente obtiene el MEJOR resultado -> el de 100
    r_mejor = client.get(
        f"/api/v1/examenes/resultados/{examen['id']}/mejor/{estudiante_user.id}",
        headers=docente_headers,
    )
    assert r_mejor.status_code == 200, r_mejor.text
    mejor = r_mejor.json()
    assert mejor["calificacion"] == pytest.approx(100.0), r_mejor.text
    assert mejor["id"] == data_ok["id"], r_mejor.text

    # 8. Docente ve la revisión detallada -> incluye `detalle` por pregunta
    r_rev = client.get(
        f"/api/v1/examenes/resultados/{examen['id']}/revision/{data_ok['id']}",
        headers=docente_headers,
    )
    assert r_rev.status_code == 200, r_rev.text
    revision = r_rev.json()
    assert revision["resultado_id"] == data_ok["id"], r_rev.text
    assert len(revision["detalle"]) == 4, r_rev.text
    tipos = [d["tipo"] for d in revision["detalle"]]
    assert tipos == [
        "opcion_multiple",
        "verdadero_falso",
        "respuesta_corta",
        "completar",
    ], r_rev.text
    assert all(d["correcta"] is True for d in revision["detalle"]), r_rev.text
    assert all(d["puntos_obtenidos"] == pytest.approx(10.0) for d in revision["detalle"]), r_rev.text


# =====================================================
# ESCENARIO 2: LÍMITE DE INTENTOS
# =====================================================

def test_e2e_limite_de_intentos(
    client, docente_headers, estudiante_user, estudiante_headers
):
    # 1. Docente crea examen con intentos_permitidos=1 y lo publica
    examen = _crear_examen_api(
        client,
        docente_headers,
        titulo="Examen E2E límite de intentos",
        preguntas=[_preguntas_4_tipos()[0]],
        intentos_permitidos=1,
    )
    _publicar_examen(client, docente_headers, examen["id"])

    # 2. Primer intento -> 201
    primero = _enviar_resultado(
        client, estudiante_headers, examen["id"], estudiante_user.id, {"0": 0}
    )
    assert primero.status_code == 201, primero.text

    # 3. Segundo intento -> 400 "Límite de intentos alcanzado"
    segundo = _enviar_resultado(
        client, estudiante_headers, examen["id"], estudiante_user.id, {"0": 0}
    )
    assert segundo.status_code == 400, segundo.text
    assert "límite de intentos alcanzado" in segundo.json()["detail"].lower(), segundo.text


# =====================================================
# ESCENARIO 3: EXAMEN NO PUBLICADO RECHAZA RESULTADOS
# =====================================================

def test_e2e_examen_no_publicado_rechaza_resultados(
    client, docente_headers, estudiante_user, estudiante_headers
):
    # 1. Docente crea examen (queda BORRADOR)
    examen = _crear_examen_api(
        client,
        docente_headers,
        titulo="Examen E2E no publicado",
        preguntas=[_preguntas_4_tipos()[0]],
    )
    assert examen["estado"] == "BORRADOR", examen

    # 2. Estudiante intenta enviar resultado -> 400
    resp = _enviar_resultado(
        client, estudiante_headers, examen["id"], estudiante_user.id, {"0": 0}
    )
    assert resp.status_code == 400, resp.text
    assert "no está disponible" in resp.json()["detail"].lower(), resp.text


# =====================================================
# ESCENARIO 4: ANTI-TRAMPA (VIOLACIONES)
# =====================================================

def test_e2e_anti_trampa_violaciones(
    client, docente_headers, estudiante_user, estudiante_headers
):
    # 1. Docente crea examen publicado con limite_violaciones=3
    examen = _crear_examen_api(
        client,
        docente_headers,
        titulo="Examen E2E anti-trampa",
        preguntas=_preguntas_4_tipos(),
        configuracion={"limite_violaciones": 3},
    )
    _publicar_examen(client, docente_headers, examen["id"])

    # 2. Estudiante envía resultado con 5 violaciones (responde bien, pero se anula)
    resp = _enviar_resultado(
        client,
        estudiante_headers,
        examen["id"],
        estudiante_user.id,
        RESPUESTAS_CORRECTAS,
        violaciones=5,
    )
    assert resp.status_code == 201, resp.text
    data = resp.json()

    # 3. estado TRAMPA y calificación 0
    assert data["estado"] == "TRAMPA", data
    assert data["calificacion"] == pytest.approx(0.0), data
    assert data["correctas"] == 0, data


# =====================================================
# ESCENARIO 5: EXAMEN DENTRO DE CURSO + CERTIFICADO
# =====================================================

def test_e2e_examen_en_curso_emite_certificado(
    client, docente_headers, estudiante_user, estudiante_headers
):
    # 1. Docente crea el examen (necesitamos su id para la lección del curso)
    examen = _crear_examen_api(
        client,
        docente_headers,
        titulo="Examen Final E2E",
        preguntas=_preguntas_4_tipos(),
        intentos_permitidos=2,
    )

    # 2. Docente crea curso gratuito con 1 módulo y 1 lección tipo examen
    modulos = [
        {
            "id": "m1",
            "titulo": "M1",
            "lecciones": [
                {
                    "id": "l1",
                    "titulo": "Examen Final",
                    "tipo": "examen",
                    "contenido": {"examen_id": examen["id"]},
                }
            ],
        }
    ]
    payload_curso = {
        "titulo": "Curso E2E con examen",
        "descripcion": "Curso generado en test E2E",
        "precio_tipo": "gratis",
        "modulos": modulos,
        "certificado_habilitado": True,
        "certificado_nota_minima": 10,
    }
    r_curso = client.post("/api/v1/cursos/", json=payload_curso, headers=docente_headers)
    assert r_curso.status_code == 201, r_curso.text
    curso = r_curso.json()
    assert curso["modulos"][0]["lecciones"][0]["tipo"] == "examen", r_curso.text

    # 3. Publica curso y examen
    r_pub_curso = client.post(
        f"/api/v1/cursos/{curso['id']}/publicar", headers=docente_headers
    )
    assert r_pub_curso.status_code == 200, r_pub_curso.text
    assert r_pub_curso.json()["estado"] == "PUBLICADO", r_pub_curso.text
    _publicar_examen(client, docente_headers, examen["id"])

    # 4. Estudiante se inscribe
    r_insc = client.post(
        f"/api/v1/cursos/{curso['id']}/inscribirse", headers=estudiante_headers
    )
    assert r_insc.status_code == 200, r_insc.text
    assert r_insc.json()["curso_id"] == curso["id"], r_insc.text

    # 5. Estudiante rinde el examen con respuestas correctas
    r_res = _enviar_resultado(
        client,
        estudiante_headers,
        examen["id"],
        estudiante_user.id,
        RESPUESTAS_CORRECTAS,
    )
    assert r_res.status_code == 201, r_res.text
    assert r_res.json()["calificacion"] == pytest.approx(100.0), r_res.text

    # 6. Estudiante completa la lección explícitamente
    r_comp = client.post(
        f"/api/v1/cursos/{curso['id']}/lecciones/l1/completar",
        json={"usuario_id": str(estudiante_user.id)},
        headers=estudiante_headers,
    )
    assert r_comp.status_code == 200, r_comp.text
    assert r_comp.json()["completado"] is True, r_comp.text

    # 7. El progreso del curso llegó a 100
    r_prog = client.get(
        f"/api/v1/cursos/{curso['id']}/progreso/{estudiante_user.id}",
        headers=estudiante_headers,
    )
    assert r_prog.status_code == 200, r_prog.text
    assert r_prog.json()["progreso"] == 100, r_prog.text
    assert r_prog.json()["completado"] is True, r_prog.text

    # 8. Se emitió el certificado
    r_cert = client.get(
        "/api/v1/certificados",
        params={"estudiante_id": str(estudiante_user.id)},
        headers=estudiante_headers,
    )
    assert r_cert.status_code == 200, r_cert.text
    certificados = r_cert.json()
    assert len(certificados) >= 1, r_cert.text
    del_curso = [c for c in certificados if c["curso_id"] == curso["id"]]
    assert len(del_curso) == 1, r_cert.text
    assert del_curso[0]["estado"] == "emitido", r_cert.text


# =====================================================
# ESCENARIO 6: EXAMEN PÚBLICO (SIN LOGIN)
# =====================================================

def test_e2e_examen_publico_sin_login(client, docente_headers):
    # 1. Docente crea examen publicado con acceso_publico=True
    examen = _crear_examen_api(
        client,
        docente_headers,
        titulo="Examen E2E público",
        preguntas=_preguntas_4_tipos(),
        configuracion={"acceso_publico": True},
    )
    _publicar_examen(client, docente_headers, examen["id"])
    codigo = examen["codigo"]

    # 2. GET público SIN token -> 200
    r_get = client.get(f"/api/v1/examenes/publico/{codigo}")
    assert r_get.status_code == 200, r_get.text
    assert r_get.json()["codigo"] == codigo, r_get.text

    # 3. Iniciar intento público (sin token) y enviar resultado
    r_intento = client.post(f"/api/v1/examenes/publico/{codigo}/intentos", json={})
    assert r_intento.status_code == 200, r_intento.text
    intento_id = r_intento.json()["intento_id"]

    r_post = client.post(
        f"/api/v1/examenes/publico/{codigo}/resultado",
        json={
            "respuestas": RESPUESTAS_CORRECTAS,
            "alumno_nombre": "Anónimo",
            "alumno_id": "publico-e2e",
            "intento_id": intento_id,
        },
    )
    assert r_post.status_code in (200, 201), r_post.text
    body = r_post.json()
    assert body["ok"] is True, r_post.text
    assert body["calificacion"] == pytest.approx(100.0), r_post.text
    assert body["correctas"] == 4, r_post.text
