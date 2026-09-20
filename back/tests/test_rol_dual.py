# back/tests/test_rol_dual.py
# =====================================================
# ROL DUAL: un docente debe poder actuar como ALUMNO
# (inscribirse, ver "mis cursos", completar lecciones y rendir exámenes)
# sin dejar de ser docente.
# =====================================================

import uuid

import pytest

MODULOS_1_LECCION = [
    {
        "id": "m1",
        "titulo": "Módulo 1",
        "lecciones": [{"id": "l1", "titulo": "Lección 1", "tipo": "texto"}],
    }
]


@pytest.mark.integration
def test_docente_puede_inscribirse_y_completar_como_alumno(
    client, docente_user, docente_headers, otro_docente_headers
):
    # Otro docente crea y publica un curso gratuito
    curso = client.post(
        "/api/v1/cursos/",
        json={"titulo": "Curso abierto", "precio_tipo": "gratis", "modulos": MODULOS_1_LECCION},
        headers=otro_docente_headers,
    ).json()
    pub = client.post(f"/api/v1/cursos/{curso['id']}/publicar", headers=otro_docente_headers)
    assert pub.status_code == 200, pub.text

    # El docente se inscribe COMO ALUMNO
    r_insc = client.post(f"/api/v1/cursos/{curso['id']}/inscribirse", headers=docente_headers)
    assert r_insc.status_code == 200, r_insc.text

    # Aparece en "mis cursos"
    mis = client.get("/api/v1/cursos/mis-cursos", headers=docente_headers)
    assert mis.status_code == 200, mis.text
    assert any(c["curso_id"] == curso["id"] for c in mis.json()), mis.text

    # Completa una lección como alumno (para sí mismo)
    r_comp = client.post(
        f"/api/v1/cursos/{curso['id']}/lecciones/l1/completar",
        json={"usuario_id": str(docente_user.id)},
        headers=docente_headers,
    )
    assert r_comp.status_code == 200, r_comp.text
    assert r_comp.json()["completado"] is True, r_comp.text


@pytest.mark.integration
def test_docente_puede_rendir_examen_como_alumno(
    client, docente_user, docente_headers, otro_docente_headers
):
    # Otro docente crea un examen publicado con 1 pregunta
    examen = client.post(
        "/api/v1/examenes/",
        json={
            "titulo": "Examen abierto",
            "preguntas": [
                {
                    "tipo": "opcion_multiple",
                    "enunciado": "¿2 + 2?",
                    "puntos": 10,
                    "opcion_a": "3",
                    "opcion_b": "4",
                    "respuesta_correcta": 1,
                }
            ],
        },
        headers=otro_docente_headers,
    ).json()
    client.put(
        f"/api/v1/examenes/{examen['id']}/estado",
        params={"estado": "PUBLICADO"},
        headers=otro_docente_headers,
    )

    # El docente inicia el intento y entrega COMO ALUMNO (a su propio nombre)
    intento = client.post(f"/api/v1/examenes/{examen['id']}/intentos", headers=docente_headers)
    assert intento.status_code == 200, intento.text

    r_res = client.post(
        "/api/v1/examenes/resultados",
        json={
            "examen_id": examen["id"],
            "alumno_id": str(docente_user.id),
            "alumno_nombre": docente_user.nombre_completo,
            "respuestas": {"0": 1},
            "intento_id": intento.json()["intento_id"],
        },
        headers=docente_headers,
    )
    assert r_res.status_code == 201, r_res.text
    assert r_res.json()["calificacion"] == pytest.approx(100.0), r_res.text
