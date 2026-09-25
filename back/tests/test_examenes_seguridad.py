# back/tests/test_examenes_seguridad.py
# =====================================================
# Tests de regresión para el endurecimiento del módulo de exámenes:
#   - Round-trip de la configuración (snake_case) y compatibilidad camelCase
#   - Sanitización de la clave de respuestas (estudiantes / público)
#   - Bloqueo de exámenes no publicados a estudiantes
#   - Aislamiento de exámenes y resultados por docente
# =====================================================

import uuid

import pytest

from app.models.examen import Examen, Pregunta


def _crear_examen(db, docente, *, titulo="Examen seguridad", estado="PUBLICADO", configuracion=None, preguntas=None, grupo_id=None):
    examen = Examen(
        id=str(uuid.uuid4()),
        codigo=f"EXA-SEC-{uuid.uuid4().hex[:8]}",
        titulo=titulo,
        descripcion="",
        tiempo_limite=60,
        puntaje_aprobacion=60.0,
        estado=estado,
        configuracion=configuracion if configuracion is not None else {},
        intentos_permitidos=5,
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
            afirmaciones=p.get("afirmaciones"),
            respuesta_corta=p.get("respuesta_corta"),
            respuestas_alternativas=p.get("respuestas_alternativas"),
            frases=p.get("frases"),
        ))
    db.commit()
    db.refresh(examen)
    return examen


def _pregunta_om():
    return {
        "tipo": "opcion_multiple",
        "enunciado": "¿2 + 2?",
        "puntos": 10.0,
        "opcion_a": "3",
        "opcion_b": "4",
        "respuesta_correcta": 1,
    }


def _pregunta_vf():
    return {
        "tipo": "verdadero_falso",
        "enunciado": "Marca V o F",
        "puntos": 5.0,
        "afirmaciones": [
            {"id": "a1", "texto": "El cielo es azul", "esVerdadero": True},
            {"id": "a2", "texto": "El sol es frio", "esVerdadero": False},
        ],
    }


def _pregunta_corta():
    return {
        "tipo": "respuesta_corta",
        "enunciado": "Capital del Perú",
        "puntos": 5.0,
        "respuesta_corta": "Lima",
        "respuestas_alternativas": ["Ciudad de los Reyes"],
    }


# =====================================================
# 1. CONFIGURACIÓN (round-trip snake_case)
# =====================================================

@pytest.mark.integration
def test_configuracion_snake_case_persiste(client, docente_headers):
    payload = {
        "titulo": "Examen con config",
        "configuracion": {
            "aleatorizar_preguntas": True,
            "aleatorizar_opciones": True,
            "preguntas_por_examen": 3,
            "mostrar_una_sola_pregunta": True,
            "modo_estricto": False,
            "umbral_trampa": 5,
        },
        "preguntas": [_pregunta_om()],
    }

    creado = client.post("/api/v1/examenes/", json=payload, headers=docente_headers)
    assert creado.status_code == 201, creado.text
    config = creado.json()["configuracion"]

    assert config["aleatorizar_preguntas"] is True
    assert config["aleatorizar_opciones"] is True
    assert config["preguntas_por_examen"] == 3
    assert config["mostrar_una_sola_pregunta"] is True
    assert config["modo_estricto"] is False
    assert config["umbral_trampa"] == 5


@pytest.mark.integration
def test_configuracion_camelcase_legacy_se_acepta(client, docente_headers):
    payload = {
        "titulo": "Examen legacy",
        "configuracion": {"aleatorizarPreguntas": True, "modoEstricto": False},
        "preguntas": [_pregunta_om()],
    }

    creado = client.post("/api/v1/examenes/", json=payload, headers=docente_headers)
    assert creado.status_code == 201, creado.text
    config = creado.json()["configuracion"]

    assert config["aleatorizar_preguntas"] is True
    assert config["modo_estricto"] is False


# =====================================================
# 2. SANITIZACIÓN DE LA CLAVE DE RESPUESTAS
# =====================================================

@pytest.mark.integration
def test_docente_recibe_clave_de_respuestas(client, db, docente_user, docente_headers):
    examen = _crear_examen(db, docente_user, preguntas=[_pregunta_om(), _pregunta_corta()])

    resp = client.get(f"/api/v1/examenes/{examen.id}", headers=docente_headers)
    assert resp.status_code == 200, resp.text
    preguntas = resp.json()["preguntas"]
    # La columna es String(10): puede llegar como "1"; la calificación la castea.
    assert str(preguntas[0]["respuesta_correcta"]) == "1"
    assert preguntas[1]["respuesta_corta"] == "Lima"


@pytest.mark.integration
def test_estudiante_no_recibe_clave_de_respuestas(client, db, docente_user, estudiante_headers):
    examen = _crear_examen(
        db, docente_user, estado="PUBLICADO",
        preguntas=[_pregunta_om(), _pregunta_vf(), _pregunta_corta()],
    )

    resp = client.get(f"/api/v1/examenes/{examen.id}", headers=estudiante_headers)
    assert resp.status_code == 200, resp.text
    preguntas = resp.json()["preguntas"]

    # opcion_multiple: sin respuesta correcta
    assert preguntas[0]["respuesta_correcta"] is None
    # verdadero_falso: textos visibles pero sin banderas reales
    assert preguntas[1]["afirmaciones"][0]["texto"] == "El cielo es azul"
    assert preguntas[1]["afirmaciones"][0]["esVerdadero"] is False
    assert preguntas[1]["afirmaciones"][1]["esVerdadero"] is False
    # respuesta_corta: sin clave ni alternativas
    assert preguntas[2]["respuesta_corta"] == ""
    assert preguntas[2]["respuestas_alternativas"] == []


@pytest.mark.integration
def test_examen_publico_no_expone_clave(client, db, docente_user):
    examen = _crear_examen(
        db, docente_user, estado="PUBLICADO",
        configuracion={"acceso_publico": True},
        preguntas=[_pregunta_om()],
    )

    resp = client.get(f"/api/v1/examenes/publico/{examen.codigo}")
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["codigo"] == examen.codigo
    assert data["preguntas"][0]["respuesta_correcta"] is None


@pytest.mark.integration
def test_estudiante_no_ve_examen_borrador(client, db, docente_user, estudiante_headers):
    examen = _crear_examen(db, docente_user, estado="BORRADOR", preguntas=[_pregunta_om()])

    resp = client.get(f"/api/v1/examenes/{examen.id}", headers=estudiante_headers)
    assert resp.status_code == 403, resp.text


# =====================================================
# 3. AISLAMIENTO POR DOCENTE
# =====================================================

@pytest.mark.integration
def test_docente_no_ve_examenes_de_otro(client, db, docente_user, otro_docente_headers):
    _crear_examen(db, docente_user, estado="PUBLICADO", preguntas=[_pregunta_om()])

    resp = client.get("/api/v1/examenes/", headers=otro_docente_headers)
    assert resp.status_code == 200, resp.text
    assert all(e["titulo"] != "Examen seguridad" for e in resp.json())


@pytest.mark.integration
def test_docente_no_puede_listar_resultados_de_otro(
    client, db, docente_user, estudiante_user, estudiante_headers, otro_docente_headers
):
    examen = _crear_examen(db, docente_user, estado="PUBLICADO", preguntas=[_pregunta_om()])
    client.post(
        "/api/v1/examenes/resultados",
        json={
            "examen_id": str(examen.id),
            "alumno_id": str(estudiante_user.id),
            "alumno_nombre": "Alumno",
            "respuestas": {"0": 1},
        },
        headers=estudiante_headers,
    )

    resp = client.get(f"/api/v1/examenes/resultados/{examen.id}", headers=otro_docente_headers)
    assert resp.status_code == 403, resp.text


@pytest.mark.integration
def test_docente_no_puede_limpiar_resultados_de_otro(
    client, db, docente_user, estudiante_user, otro_docente_headers
):
    examen = _crear_examen(db, docente_user, estado="PUBLICADO", preguntas=[_pregunta_om()])

    resp = client.delete(f"/api/v1/examenes/resultados/{examen.id}", headers=otro_docente_headers)
    assert resp.status_code == 403, resp.text


@pytest.mark.integration
def test_docente_ajeno_no_obtiene_clave_de_examen_publicado(
    client, db, docente_user, otro_docente_headers
):
    """Un docente sin ownership ve un examen PUBLICADO en modo estudiante
    (la vista de lección del curso lo permite), pero NUNCA la clave de respuestas."""
    examen = _crear_examen(db, docente_user, estado="PUBLICADO", preguntas=[_pregunta_om()])

    resp = client.get(f"/api/v1/examenes/{examen.id}", headers=otro_docente_headers)
    assert resp.status_code == 200, resp.text
    assert resp.json()["preguntas"][0]["respuesta_correcta"] is None


@pytest.mark.integration
def test_docente_ajeno_no_obtiene_examen_borrador_de_otro(
    client, db, docente_user, otro_docente_headers
):
    """Un examen BORRADOR ajeno sigue siendo 403 para otro docente."""
    examen = _crear_examen(db, docente_user, estado="BORRADOR", preguntas=[_pregunta_om()])

    resp = client.get(f"/api/v1/examenes/{examen.id}", headers=otro_docente_headers)
    assert resp.status_code == 403, resp.text


@pytest.mark.integration
def test_estudiante_solo_ve_examenes_publicados_en_listado(client, db, docente_user, estudiante_headers):
    _crear_examen(db, docente_user, estado="PUBLICADO", titulo="Publicado")
    _crear_examen(db, docente_user, estado="BORRADOR", titulo="Borrador")

    resp = client.get("/api/v1/examenes/", headers=estudiante_headers)
    assert resp.status_code == 200, resp.text
    estados = {e["estado"] for e in resp.json()}
    assert estados <= {"PUBLICADO"}


# =====================================================
# 4. AUTORIDAD DE TIEMPO (INTENTOS EN EL SERVIDOR)
# =====================================================

def _crear_estudiante_extra(db, email="estudiante.extra@zenth.test"):
    from app.models.usuario import Usuario
    from app.core.security import create_access_token
    from datetime import datetime, timezone

    user = Usuario(
        id=str(uuid.uuid4()),
        email=email,
        nombres="Extra",
        apellidos="Estudiante",
        rol="estudiante",
        empresa_id="test-empresa",
        activo=True,
        email_verificado=True,
        fecha_registro=datetime.now(timezone.utc),
    )
    user.set_password("Test1234!")
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_access_token({"sub": str(user.id), "rol": user.rol})
    return user, {"Authorization": f"Bearer {token}"}


def _payload_resultado(examen, alumno_id, respuestas, **extra):
    data = {
        "examen_id": str(examen.id),
        "alumno_id": str(alumno_id),
        "alumno_nombre": "Alumno",
        "respuestas": respuestas,
    }
    data.update(extra)
    return data


@pytest.mark.integration
def test_iniciar_intento_devuelve_tiempo_servidor(client, db, docente_user, estudiante_headers):
    examen = _crear_examen(db, docente_user, estado="PUBLICADO", preguntas=[_pregunta_om()])

    resp = client.post(f"/api/v1/examenes/{examen.id}/intentos", headers=estudiante_headers)
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["intento_id"]
    assert data["segundos_restantes"] > 0
    assert data["segundos_restantes"] <= data["tiempo_limite"] * 60


@pytest.mark.integration
def test_estudiante_no_puede_entregar_sin_intento(client, db, docente_user, estudiante_user, estudiante_headers):
    examen = _crear_examen(db, docente_user, estado="PUBLICADO", preguntas=[_pregunta_om()])

    resp = client.post(
        "/api/v1/examenes/resultados",
        json=_payload_resultado(examen, estudiante_user.id, {"0": 1}),
        headers=estudiante_headers,
    )
    assert resp.status_code == 400, resp.text
    assert "intento" in resp.json()["detail"].lower(), resp.text


@pytest.mark.integration
def test_intento_de_otro_usuario_es_rechazado(client, db, docente_user, estudiante_headers):
    examen = _crear_examen(db, docente_user, estado="PUBLICADO", preguntas=[_pregunta_om()])
    intento = client.post(f"/api/v1/examenes/{examen.id}/intentos", headers=estudiante_headers).json()

    otro_user, otro_headers = _crear_estudiante_extra(db)
    resp = client.post(
        "/api/v1/examenes/resultados",
        json=_payload_resultado(examen, otro_user.id, {"0": 1}, intento_id=intento["intento_id"]),
        headers=otro_headers,
    )
    assert resp.status_code == 403, resp.text


@pytest.mark.integration
def test_entrega_tardia_se_marca_entregado_por_tiempo(client, db, docente_user, estudiante_user, estudiante_headers):
    from datetime import datetime, timezone, timedelta
    from app.models.intento_examen import IntentoExamen
    from app.models.resultado_examen import ResultadoExamen

    examen = _crear_examen(db, docente_user, estado="PUBLICADO", preguntas=[_pregunta_om()])
    intento = client.post(f"/api/v1/examenes/{examen.id}/intentos", headers=estudiante_headers).json()

    # Forzar expiración pasada (más allá del margen de gracia)
    row = db.query(IntentoExamen).filter(IntentoExamen.id == intento["intento_id"]).first()
    row.expira_en = datetime.now(timezone.utc) - timedelta(seconds=600)
    db.commit()

    resp = client.post(
        "/api/v1/examenes/resultados",
        json=_payload_resultado(examen, estudiante_user.id, {"0": 1}, intento_id=intento["intento_id"]),
        headers=estudiante_headers,
    )
    assert resp.status_code == 201, resp.text
    assert resp.json()["entregado_por_tiempo"] is True, resp.text

    resultado = db.query(ResultadoExamen).filter(ResultadoExamen.examen_id == str(examen.id)).first()
    assert resultado.entregado_por_tiempo is True


@pytest.mark.integration
def test_intento_queda_completado_tras_entregar(client, db, docente_user, estudiante_user, estudiante_headers):
    from app.models.intento_examen import IntentoExamen

    examen = _crear_examen(db, docente_user, estado="PUBLICADO", preguntas=[_pregunta_om()])
    intento = client.post(f"/api/v1/examenes/{examen.id}/intentos", headers=estudiante_headers).json()

    client.post(
        "/api/v1/examenes/resultados",
        json=_payload_resultado(examen, estudiante_user.id, {"0": 1}, intento_id=intento["intento_id"]),
        headers=estudiante_headers,
    )

    row = db.query(IntentoExamen).filter(IntentoExamen.id == intento["intento_id"]).first()
    assert row.estado == "COMPLETADO"
    assert row.entregado_en is not None


# =====================================================
# 5. PASSWORD PÚBLICO (no se exponen preguntas antes de validar)
# =====================================================

@pytest.mark.integration
def test_examen_publico_con_password_oculta_preguntas(client, db, docente_user):
    examen = _crear_examen(
        db, docente_user, estado="PUBLICADO",
        configuracion={"acceso_publico": True, "password_examen": "secreto"},
        preguntas=[_pregunta_om()],
    )

    resp = client.get(f"/api/v1/examenes/publico/{examen.codigo}")
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["requiere_password"] is True
    assert data["preguntas"] == []


@pytest.mark.integration
def test_verificar_password_devuelve_preguntas_sin_clave(client, db, docente_user):
    examen = _crear_examen(
        db, docente_user, estado="PUBLICADO",
        configuracion={"acceso_publico": True, "password_examen": "secreto"},
        preguntas=[_pregunta_om()],
    )

    resp = client.post(
        f"/api/v1/examenes/publico/{examen.codigo}/verificar-password",
        json={"password": "secreto"},
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["ok"] is True
    assert len(data["examen"]["preguntas"]) == 1
    assert data["examen"]["preguntas"][0]["respuesta_correcta"] is None


@pytest.mark.integration
def test_intento_publico_requiere_password(client, db, docente_user):
    examen = _crear_examen(
        db, docente_user, estado="PUBLICADO",
        configuracion={"acceso_publico": True, "password_examen": "secreto"},
        preguntas=[_pregunta_om()],
    )

    mal = client.post(f"/api/v1/examenes/publico/{examen.codigo}/intentos", json={"password": "x"})
    assert mal.status_code == 401, mal.text

    ok = client.post(f"/api/v1/examenes/publico/{examen.codigo}/intentos", json={"password": "secreto"})
    assert ok.status_code == 200, ok.text
    assert ok.json()["intento_id"]


# =====================================================
# 6. HANDLER 404 (no debe enmascarar los mensajes reales)
# =====================================================

@pytest.mark.integration
def test_404_de_endpoint_conserva_su_detail(client, docente_headers):
    resp = client.get("/api/v1/examenes/no-existe", headers=docente_headers)
    assert resp.status_code == 404, resp.text
    assert resp.json().get("detail") == "Examen no encontrado", resp.text


@pytest.mark.integration
def test_404_de_ruta_inexistente_devuelve_mensaje_generico(client):
    resp = client.get("/api/v1/ruta/que/no/existe")
    assert resp.status_code == 404, resp.text
    assert resp.json().get("message") == "El endpoint solicitado no existe", resp.text
