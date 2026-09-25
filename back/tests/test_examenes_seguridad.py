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


def _crear_examen(db, docente, *, titulo="Examen seguridad", estado="PUBLICADO", configuracion=None, preguntas=None, grupo_id=None, intentos_permitidos=5):
    examen = Examen(
        id=str(uuid.uuid4()),
        codigo=f"EXA-SEC-{uuid.uuid4().hex[:8]}",
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
            afirmaciones=p.get("afirmaciones"),
            respuesta_corta=p.get("respuesta_corta"),
            respuestas_alternativas=p.get("respuestas_alternativas"),
            frases=p.get("frases"),
            columna_a=p.get("columna_a"),
            columna_b=p.get("columna_b"),
            elementos=p.get("elementos"),
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


def _pregunta_relacionar():
    return {
        "tipo": "relacionar",
        "enunciado": "Empareja cada concepto",
        "puntos": 10.0,
        "columna_a": ["A1", "A2", "A3"],
        "columna_b": ["B1", "B2", "B3"],
    }


def _pregunta_ordenamiento():
    return {
        "tipo": "ordenamiento",
        "enunciado": "Ordena los pasos",
        "puntos": 10.0,
        "elementos": ["E1", "E2", "E3"],
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
def test_estudiante_solo_ve_examenes_publicados_en_listado(
    client, db, docente_user, estudiante_user, estudiante_headers
):
    examen_pub = _crear_examen(db, docente_user, estado="PUBLICADO", titulo="Publicado")
    _crear_examen(db, docente_user, estado="BORRADOR", titulo="Borrador")
    # ✅ BAJA 14: además de estar PUBLICADO debe pertenecer a un curso suyo
    _crear_curso_con_examen(db, docente_user, examen_pub.id, estudiante_user)

    resp = client.get("/api/v1/examenes/", headers=estudiante_headers)
    assert resp.status_code == 200, resp.text
    estados = {e["estado"] for e in resp.json()}
    assert estados == {"PUBLICADO"}
    titulos = {e["titulo"] for e in resp.json()}
    assert "Publicado" in titulos
    assert "Borrador" not in titulos


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
    # ✅ El tiempo lo valida el servidor: fuera de la ventana de gracia la
    # entrega se conserva pero vale 0 aunque la respuesta sea correcta.
    assert resp.json()["calificacion"] == 0, resp.json()

    resultado = db.query(ResultadoExamen).filter(ResultadoExamen.examen_id == str(examen.id)).first()
    assert resultado.entregado_por_tiempo is True
    assert resultado.calificacion == 0


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


# =====================================================
# 7. SHUFFLE AUTORITATIVO SERVER-SIDE (relacionar / ordenamiento)
#    El mapping de barajado vive SOLO en la config del examen: nunca viaja
#    al cliente ni se acepta de vuelta. Antes llegaba por el cliente y una
#    respuesta de identidad (sin barajar) valía 100%.
# =====================================================

@pytest.mark.integration
def test_fetch_estudiante_no_expone_mapping_ni_orden_y_baraja_estable(
    client, db, docente_user, estudiante_headers
):
    examen = _crear_examen(
        db, docente_user, estado="PUBLICADO",
        preguntas=[_pregunta_relacionar(), _pregunta_ordenamiento()],
    )

    resp = client.get(f"/api/v1/examenes/{examen.id}", headers=estudiante_headers)
    assert resp.status_code == 200, resp.text
    data = resp.json()

    # Ni el mapping ni las claves `_orden_*` salen del servidor.
    for p in data["preguntas"]:
        assert "_orden_columna_b" not in p, p
        assert "_orden_elementos" not in p, p
    assert "mappings_shuffle" not in (data.get("configuracion") or {})

    # Barajado real y jamás identidad (la identidad revela el orden canónico).
    rel = data["preguntas"][0]
    ordn = data["preguntas"][1]
    assert rel["columna_b"] != ["B1", "B2", "B3"]
    assert ordn["elementos"] != ["E1", "E2", "E3"]

    # Estable: una segunda lectura devuelve el MISMO orden (mapping persistido).
    resp2 = client.get(f"/api/v1/examenes/{examen.id}", headers=estudiante_headers)
    assert resp2.status_code == 200, resp2.text
    assert resp2.json()["preguntas"][0]["columna_b"] == rel["columna_b"]
    assert resp2.json()["preguntas"][1]["elementos"] == ordn["elementos"]


@pytest.mark.integration
def test_exploit_identidad_y_mapping_del_cliente_no_obtienen_100(
    client, db, docente_user
):
    examen = _crear_examen(
        db, docente_user, estado="PUBLICADO",
        configuracion={"acceso_publico": True},
        preguntas=[_pregunta_relacionar(), _pregunta_ordenamiento()],
    )

    # 1ª lectura: el servidor baraja y persiste su mapping en la config.
    r = client.get(f"/api/v1/examenes/publico/{examen.codigo}")
    assert r.status_code == 200, r.text

    db.expire_all()
    examen_db = db.query(Examen).filter(Examen.id == str(examen.id)).first()
    mappings = (examen_db.configuracion or {}).get("mappings_shuffle")
    assert mappings and "0" in mappings and "1" in mappings, mappings
    orden_b = mappings["0"]["_orden_columna_b"]
    orden_el = mappings["1"]["_orden_elementos"]

    # TRAMPA: respuestas de identidad + mapping falso mandado por el cliente.
    # Si el servidor usara el mapping del cliente, esto sacaría 100.
    it1 = client.post(f"/api/v1/examenes/publico/{examen.codigo}/intentos", json={})
    assert it1.status_code == 200, it1.text
    tramposo = client.post(
        f"/api/v1/examenes/publico/{examen.codigo}/resultado",
        json={
            "alumno_nombre": "Tramposo",
            "respuestas": {
                "0": {"0": 0, "1": 1, "2": 2},
                "1": [1, 2, 3],
            },
            "intento_id": it1.json()["intento_id"],
            "mappings_shuffle": {
                "0": {"_orden_columna_b": [0, 1, 2]},
                "1": {"_orden_elementos": [0, 1, 2]},
            },
        },
    )
    assert tramposo.status_code == 201, tramposo.text
    assert tramposo.json()["calificacion"] < 100.0, tramposo.json()

    # LEGÍTIMO: respuestas en el espacio mostrado (igual que las arma el
    # frontend) y sin mandar mapping → el servidor des-baraja el suyo → 100.
    it2 = client.post(f"/api/v1/examenes/publico/{examen.codigo}/intentos", json={})
    assert it2.status_code == 200, it2.text
    legit = client.post(
        f"/api/v1/examenes/publico/{examen.codigo}/resultado",
        json={
            "alumno_nombre": "Legit",
            "respuestas": {
                "0": {str(j): orden_b.index(j) for j in range(3)},
                "1": [orden_el[p] + 1 for p in range(3)],
            },
            "intento_id": it2.json()["intento_id"],
        },
    )
    assert legit.status_code == 201, legit.text
    assert legit.json()["calificacion"] == 100.0, legit.json()


@pytest.mark.integration
def test_asegurar_mappings_preserva_y_regenera_si_cambia_contenido(db, docente_user):
    from app.api.examenes import _asegurar_mappings_examen

    examen = _crear_examen(
        db, docente_user, estado="PUBLICADO",
        preguntas=[_pregunta_relacionar()],
    )
    _asegurar_mappings_examen(examen, db)
    m1 = dict(examen.configuracion["mappings_shuffle"])
    assert m1["0"]["_orden_columna_b"] != [0, 1, 2]

    # Idempotente: una 2ª llamada NO rebaraja (exámenes en curso intactos).
    _asegurar_mappings_examen(examen, db)
    assert examen.configuracion["mappings_shuffle"] == m1

    # Edición del docente (cambia el contenido) → se regenera esa entrada.
    examen.preguntas[0].columna_b = ["B1", "B2", "B3", "B4"]
    db.commit()
    _asegurar_mappings_examen(examen, db)
    m2 = examen.configuracion["mappings_shuffle"]
    assert m2["0"] != m1["0"]
    assert len(m2["0"]["_orden_columna_b"]) == 4


# =====================================================
# 8. ALTA 3 — INTENTOS: reutilización, límite público y alumno_id
# =====================================================

@pytest.mark.integration
def test_intento_entregado_no_se_puede_reutilizar(
    client, db, docente_user, estudiante_user, estudiante_headers
):
    examen = _crear_examen(db, docente_user, estado="PUBLICADO", preguntas=[_pregunta_om()])
    intento = client.post(
        f"/api/v1/examenes/{examen.id}/intentos", headers=estudiante_headers
    ).json()

    primero = client.post(
        "/api/v1/examenes/resultados",
        json=_payload_resultado(examen, estudiante_user.id, {"0": 1}, intento_id=intento["intento_id"]),
        headers=estudiante_headers,
    )
    assert primero.status_code == 201, primero.text

    # Mismo intento (aunque cambien las respuestas) → 400: un envío = un intento.
    segundo = client.post(
        "/api/v1/examenes/resultados",
        json=_payload_resultado(examen, estudiante_user.id, {"0": 0}, intento_id=intento["intento_id"]),
        headers=estudiante_headers,
    )
    assert segundo.status_code == 400, segundo.text
    assert "intento" in segundo.json()["detail"].lower(), segundo.text


@pytest.mark.integration
def test_publico_respeta_limite_de_intentos_por_nombre(client, db, docente_user):
    examen = _crear_examen(
        db, docente_user, estado="PUBLICADO",
        configuracion={"acceso_publico": True},
        intentos_permitidos=1,
        preguntas=[_pregunta_om()],
    )

    it1 = client.post(f"/api/v1/examenes/publico/{examen.codigo}/intentos", json={})
    r1 = client.post(
        f"/api/v1/examenes/publico/{examen.codigo}/resultado",
        json={"alumno_nombre": "Ana", "respuestas": {"0": 1}, "intento_id": it1.json()["intento_id"]},
    )
    assert r1.status_code == 201, r1.text

    it2 = client.post(f"/api/v1/examenes/publico/{examen.codigo}/intentos", json={})
    r2 = client.post(
        f"/api/v1/examenes/publico/{examen.codigo}/resultado",
        json={"alumno_nombre": "Ana", "respuestas": {"0": 1}, "intento_id": it2.json()["intento_id"]},
    )
    assert r2.status_code == 400, r2.text
    assert r2.json()["detail"] == "Límite de intentos alcanzado", r2.text


@pytest.mark.integration
def test_publico_no_atribuye_ids_de_usuarios_reales(client, db, docente_user):
    from app.models.resultado_examen import ResultadoExamen

    examen = _crear_examen(
        db, docente_user, estado="PUBLICADO",
        configuracion={"acceso_publico": True},
        preguntas=[_pregunta_om()],
    )
    it = client.post(f"/api/v1/examenes/publico/{examen.codigo}/intentos", json={})
    victima = "a1b2c3d4-5678-90ab-cdef-1234567890ab"
    resp = client.post(
        f"/api/v1/examenes/publico/{examen.codigo}/resultado",
        json={
            "alumno_nombre": "Estafador",
            "alumno_id": victima,
            "respuestas": {"0": 1},
            "intento_id": it.json()["intento_id"],
        },
    )
    assert resp.status_code == 201, resp.text

    db.expire_all()
    fila = db.query(ResultadoExamen).filter(ResultadoExamen.examen_id == str(examen.id)).first()
    assert fila is not None
    assert fila.alumno_id == "publico", fila.alumno_id


# =====================================================
# 9. SEGURIDAD: RESULTADOS Y REVISIÓN (MEDIA 4 / MEDIA 5)
# =====================================================

def _crear_resultado_propio(client, examen, estudiante_user, estudiante_headers, respuestas=None):
    """Crea un intento y entrega un resultado a nombre del estudiante dueño."""
    intento = client.post(
        f"/api/v1/examenes/{examen.id}/intentos", headers=estudiante_headers
    ).json()
    resp = client.post(
        "/api/v1/examenes/resultados",
        json=_payload_resultado(
            examen, estudiante_user.id, respuestas or {"0": 1},
            intento_id=intento["intento_id"],
        ),
        headers=estudiante_headers,
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


@pytest.mark.security
@pytest.mark.integration
def test_docente_no_ve_resultados_de_alumno_en_examen_ajeno(
    client, db, docente_user, docente_headers, otro_docente_headers,
    estudiante_user, estudiante_headers,
):
    examen = _crear_examen(db, docente_user, preguntas=[_pregunta_om()])
    _crear_resultado_propio(client, examen, estudiante_user, estudiante_headers)

    # El docente dueño del examen sí ve los resultados del alumno
    resp_propio = client.get(
        f"/api/v1/examenes/resultados/alumno/{estudiante_user.id}",
        headers=docente_headers,
    )
    assert resp_propio.status_code == 200, resp_propio.text
    assert len(resp_propio.json()) == 1

    # ✅ MEDIA 4: un docente ajeno NO ve resultados de exámenes ajenos
    resp_ajeno = client.get(
        f"/api/v1/examenes/resultados/alumno/{estudiante_user.id}",
        headers=otro_docente_headers,
    )
    assert resp_ajeno.status_code == 200, resp_ajeno.text
    assert resp_ajeno.json() == [], resp_ajeno.text


@pytest.mark.security
@pytest.mark.integration
def test_revision_estudiante_oculta_clave_por_defecto(
    client, db, docente_user, estudiante_user, estudiante_headers
):
    examen = _crear_examen(db, docente_user, preguntas=[_pregunta_om()])
    creado = _crear_resultado_propio(client, examen, estudiante_user, estudiante_headers)

    resp = client.get(
        f"/api/v1/examenes/resultados/{examen.id}/revision/{creado['id']}",
        headers=estudiante_headers,
    )
    assert resp.status_code == 200, resp.text
    detalle = resp.json()["detalle"]
    assert len(detalle) == 1
    item = detalle[0]
    # ✅ MEDIA 5: por defecto (mostrar_respuestas=False) NO se revela la clave,
    # pero sí se ve el resultado (correcto/incorrecto y puntos).
    assert "respuesta_correcta" not in item, resp.text
    assert "respuestas_aceptadas" not in item, resp.text
    assert item["correcta"] is True
    assert item["puntos_obtenidos"] == pytest.approx(10.0)


@pytest.mark.security
@pytest.mark.integration
def test_revision_estudiante_expone_clave_si_mostrar_respuestas(
    client, db, docente_user, estudiante_user, estudiante_headers
):
    examen = _crear_examen(
        db, docente_user, preguntas=[_pregunta_om()],
        configuracion={"mostrar_resultados": True, "mostrar_respuestas": True},
    )
    creado = _crear_resultado_propio(client, examen, estudiante_user, estudiante_headers)

    resp = client.get(
        f"/api/v1/examenes/resultados/{examen.id}/revision/{creado['id']}",
        headers=estudiante_headers,
    )
    assert resp.status_code == 200, resp.text
    item = resp.json()["detalle"][0]
    assert item["respuesta_correcta"] in (1, "1"), item


@pytest.mark.security
@pytest.mark.integration
def test_revision_oculta_todo_si_mostrar_resultados_false(
    client, db, docente_user, estudiante_user, estudiante_headers
):
    examen = _crear_examen(
        db, docente_user, preguntas=[_pregunta_om()],
        configuracion={"mostrar_resultados": False, "mostrar_respuestas": True},
    )
    creado = _crear_resultado_propio(client, examen, estudiante_user, estudiante_headers)

    resp = client.get(
        f"/api/v1/examenes/resultados/{examen.id}/revision/{creado['id']}",
        headers=estudiante_headers,
    )
    assert resp.status_code == 200, resp.text
    item = resp.json()["detalle"][0]
    assert item["correcta"] is None
    assert item["puntos_obtenidos"] == 0
    assert "respuesta_correcta" not in item, resp.text


# =====================================================
# 10. SEGURIDAD: INYECCIÓN DE RESULTADOS Y LISTADO DE EXÁMENES (BAJA 13/14)
# =====================================================

def _crear_curso_con_examen(db, docente, examen_id, estudiante, *, leccion_id="l1"):
    """Crea un curso PUBLICADO con una lección-examen y matricula al estudiante."""
    from app.models.curso import Curso, InscripcionCurso

    curso = Curso(
        id=str(uuid.uuid4()),
        titulo="Curso con examen",
        descripcion="",
        categoria="general",
        nivel="principiante",
        docente_id=str(docente.id),
        docente_nombre=docente.nombre_completo,
        precio_tipo="gratis",
        estado="PUBLICADO",
        modulos=[{
            "id": "m1",
            "titulo": "Módulo 1",
            "lecciones": [{
                "id": leccion_id,
                "titulo": "Lección examen",
                "tipo": "examen",
                "contenido": {"examen_id": str(examen_id)},
            }],
        }],
        tipo_bloqueo="ninguno",
        bloqueo_config={},
        etiquetas=[],
        requisitos=[],
        objetivos=[],
        certificado_habilitado=True,
        certificado_nota_minima=None,
    )
    db.add(curso)
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
    return curso


@pytest.mark.security
@pytest.mark.integration
def test_docente_no_inyecta_resultado_en_examen_ajeno(
    client, db, otro_docente_user, docente_headers, estudiante_user
):
    """✅ BAJA 13: sin intento propio, un docente no registra resultados en exámenes ajenos."""
    from app.models.resultado_examen import ResultadoExamen

    examen = _crear_examen(db, otro_docente_user, estado="PUBLICADO", preguntas=[_pregunta_om()])

    resp = client.post(
        "/api/v1/examenes/resultados",
        json=_payload_resultado(examen, estudiante_user.id, {"0": 1}),
        headers=docente_headers,
    )
    assert resp.status_code == 403, resp.text

    db.expire_all()
    assert db.query(ResultadoExamen).filter(
        ResultadoExamen.examen_id == str(examen.id)
    ).count() == 0


@pytest.mark.integration
def test_docente_registra_resultado_manual_en_su_examen(
    client, db, docente_user, docente_headers, estudiante_user
):
    """El registro manual (sin intento) sigue permitido en exámenes propios."""
    examen = _crear_examen(db, docente_user, estado="PUBLICADO", preguntas=[_pregunta_om()])

    resp = client.post(
        "/api/v1/examenes/resultados",
        json=_payload_resultado(examen, estudiante_user.id, {"0": 1}),
        headers=docente_headers,
    )
    assert resp.status_code == 201, resp.text


@pytest.mark.security
@pytest.mark.integration
def test_estudiante_lista_solo_examenes_de_sus_cursos(
    client, db, docente_user, estudiante_user, estudiante_headers
):
    """✅ BAJA 14: no se enumeran exámenes publicados de cursos ajenos."""
    examen_propio = _crear_examen(db, docente_user, estado="PUBLICADO", titulo="De mi curso")
    _crear_examen(db, docente_user, estado="PUBLICADO", titulo="Suelto ajeno")
    _crear_curso_con_examen(db, docente_user, examen_propio.id, estudiante_user)

    resp = client.get("/api/v1/examenes/", headers=estudiante_headers)
    assert resp.status_code == 200, resp.text
    titulos = {e["titulo"] for e in resp.json()}
    assert "De mi curso" in titulos
    assert "Suelto ajeno" not in titulos
