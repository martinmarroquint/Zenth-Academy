# back/tests/test_calcular_resultado.py
# =====================================================
# TESTS UNITARIOS: calcular_resultado()
#
# Puros y rápidos: NO usan BD ni SQLAlchemy.
# Se simulan Examen y Pregunta con types.SimpleNamespace.
# =====================================================

from types import SimpleNamespace

import pytest

from app.api.examenes import calcular_resultado


pytestmark = pytest.mark.unit


# =====================================================
# HELPERS / FACTORIES
# =====================================================

def pregunta(tipo, puntos, **kwargs):
    """Crea una Pregunta falsa con todos los atributos que lee la función."""
    base = {
        "tipo": tipo,
        "puntos": puntos,
        "respuesta_correcta": None,
        "afirmaciones": None,
        "columna_a": None,
        "frases": None,
        "elementos": None,
        "respuesta_corta": None,
        "respuestas_alternativas": None,
    }
    base.update(kwargs)
    return SimpleNamespace(**base)


def examen(*preguntas):
    """Crea un Examen falso con su lista de preguntas."""
    return SimpleNamespace(preguntas=list(preguntas))


def espacios(*respuestas):
    """Construye frases de tipo 'completar' con segmentos de texto y espacio."""
    segmentos = []
    for i, r in enumerate(respuestas):
        segmentos.append({"tipo": "texto", "contenido": f"texto {i}"})
        segmentos.append({"tipo": "espacio", "respuesta": r})
    return [{"segmentos": segmentos}]


# =====================================================
# 1. opcion_multiple
# =====================================================

def test_opcion_multiple_correcta():
    ex = examen(pregunta("opcion_multiple", 10, respuesta_correcta=2))
    r = calcular_resultado(ex, {"0": 2})
    assert r["puntos_obtenidos"] == 10
    assert r["total_puntos"] == 10
    assert r["calificacion"] == pytest.approx(100.0)
    assert r["correctas"] == 1
    assert r["detalle_preguntas"][0]["correcta"] is True


def test_opcion_multiple_incorrecta():
    ex = examen(pregunta("opcion_multiple", 10, respuesta_correcta=2))
    r = calcular_resultado(ex, {"0": 1})
    assert r["puntos_obtenidos"] == 0
    assert r["calificacion"] == pytest.approx(0.0)
    assert r["detalle_preguntas"][0]["correcta"] is False


def test_opcion_multiple_respuesta_vacia():
    ex = examen(pregunta("opcion_multiple", 10, respuesta_correcta=2))
    r = calcular_resultado(ex, {})
    assert r["puntos_obtenidos"] == 0
    assert r["total_puntos"] == 10

    r_none = calcular_resultado(ex, {"0": None})
    assert r_none["puntos_obtenidos"] == 0


def test_opcion_multiple_tipo_invalido_no_lanza_excepcion():
    ex = examen(pregunta("opcion_multiple", 10, respuesta_correcta=2))
    r = calcular_resultado(ex, {"0": "abc"})
    assert r["puntos_obtenidos"] == 0
    assert r["calificacion"] == pytest.approx(0.0)
    assert r["detalle_preguntas"][0]["correcta"] is False


def test_opcion_multiple_sin_respuesta_correcta_definida():
    ex = examen(pregunta("opcion_multiple", 10, respuesta_correcta=None))
    r = calcular_resultado(ex, {"0": 1})
    assert r["puntos_obtenidos"] == 0
    assert r["total_puntos"] == 10


# =====================================================
# 2. verdadero_falso
# =====================================================

def _vf(*valores):
    return [{"esVerdadero": v} for v in valores]


def test_verdadero_falso_todo_correcto():
    ex = examen(pregunta("verdadero_falso", 10, afirmaciones=_vf(True, False, True)))
    r = calcular_resultado(ex, {"0": [True, False, True]})
    assert r["puntos_obtenidos"] == 10
    assert r["correctas"] == 1
    assert r["detalle_preguntas"][0]["correcta"] is True


def test_verdadero_falso_todo_incorrecto():
    ex = examen(pregunta("verdadero_falso", 10, afirmaciones=_vf(True, False, True)))
    r = calcular_resultado(ex, {"0": [False, True, False]})
    assert r["puntos_obtenidos"] == 0
    assert r["detalle_preguntas"][0]["correcta"] is False


def test_verdadero_falso_lista_parcial():
    # 4 afirmaciones, solo 2 correctas -> 50% de 10 = 5
    ex = examen(pregunta("verdadero_falso", 10, afirmaciones=_vf(True, False, True, False)))
    r = calcular_resultado(ex, {"0": [True, False]})
    assert r["puntos_obtenidos"] == pytest.approx(5.0)
    assert r["calificacion"] == pytest.approx(50.0)
    assert r["detalle_preguntas"][0]["correcta"] is False


def test_verdadero_falso_lista_vacia_y_none():
    ex = examen(pregunta("verdadero_falso", 10, afirmaciones=_vf(True, False)))
    assert calcular_resultado(ex, {"0": []})["puntos_obtenidos"] == 0
    assert calcular_resultado(ex, {})["puntos_obtenidos"] == 0
    assert calcular_resultado(ex, {"0": None})["puntos_obtenidos"] == 0


# =====================================================
# 3. relacionar
# =====================================================

def test_relacionar_todo_correcto():
    ex = examen(pregunta("relacionar", 10, columna_a=["A", "B", "C"]))
    r = calcular_resultado(ex, {"0": {"0": 0, "1": 1, "2": 2}})
    assert r["puntos_obtenidos"] == 10
    assert r["detalle_preguntas"][0]["correcta"] is True


def test_relacionar_todo_incorrecto():
    ex = examen(pregunta("relacionar", 10, columna_a=["A", "B", "C"]))
    r = calcular_resultado(ex, {"0": {"0": 1, "1": 2, "2": 0}})
    assert r["puntos_obtenidos"] == 0
    assert r["detalle_preguntas"][0]["correcta"] is False


def test_relacionar_parcial():
    # 3 pares, 2 correctos -> 2/3 de 9 = 6
    ex = examen(pregunta("relacionar", 9, columna_a=["A", "B", "C"]))
    r = calcular_resultado(ex, {"0": {"0": 0, "1": 1, "2": 0}})
    assert r["puntos_obtenidos"] == pytest.approx(6.0)
    assert r["calificacion"] == pytest.approx(round(6 / 9 * 100, 2))


def test_relacionar_vacio_y_none():
    ex = examen(pregunta("relacionar", 10, columna_a=["A", "B"]))
    assert calcular_resultado(ex, {"0": {}})["puntos_obtenidos"] == 0
    assert calcular_resultado(ex, {})["puntos_obtenidos"] == 0
    assert calcular_resultado(ex, {"0": None})["puntos_obtenidos"] == 0


# =====================================================
# 4. completar
# =====================================================

def test_completar_todo_correcto():
    ex = examen(pregunta("completar", 10, frases=espacios("lima", "peru")))
    r = calcular_resultado(ex, {"0": ["lima", "peru"]})
    assert r["puntos_obtenidos"] == 10
    assert r["detalle_preguntas"][0]["correcta"] is True


def test_completar_case_insensitive():
    ex = examen(pregunta("completar", 10, frases=espacios("lima")))
    r = calcular_resultado(ex, {"0": ["LIMA"]})
    assert r["puntos_obtenidos"] == 10
    assert r["detalle_preguntas"][0]["correcta"] is True


def test_completar_incorrecto():
    ex = examen(pregunta("completar", 10, frases=espacios("lima", "peru")))
    r = calcular_resultado(ex, {"0": ["bogota", "chile"]})
    assert r["puntos_obtenidos"] == 0
    assert r["detalle_preguntas"][0]["correcta"] is False


def test_completar_parcial():
    # 3 espacios, 2 correctos -> 2/3 de 9 = 6
    ex = examen(pregunta("completar", 9, frases=espacios("a", "b", "c")))
    r = calcular_resultado(ex, {"0": ["a", "b", "x"]})
    assert r["puntos_obtenidos"] == pytest.approx(6.0)
    assert r["detalle_preguntas"][0]["correcta"] is False


def test_completar_vacio_y_none():
    ex = examen(pregunta("completar", 10, frases=espacios("lima")))
    assert calcular_resultado(ex, {"0": []})["puntos_obtenidos"] == 0
    assert calcular_resultado(ex, {})["puntos_obtenidos"] == 0
    assert calcular_resultado(ex, {"0": None})["puntos_obtenidos"] == 0


# =====================================================
# 5. ordenamiento
# =====================================================

def test_ordenamiento_correcto():
    ex = examen(pregunta("ordenamiento", 10, elementos=["a", "b", "c"]))
    r = calcular_resultado(ex, {"0": [1, 2, 3]})
    assert r["puntos_obtenidos"] == 10
    assert r["detalle_preguntas"][0]["correcta"] is True


def test_ordenamiento_incorrecto():
    # [2, 3, 1] no deja ningún elemento en su posición correcta (j+1)
    ex = examen(pregunta("ordenamiento", 10, elementos=["a", "b", "c"]))
    r = calcular_resultado(ex, {"0": [2, 3, 1]})
    assert r["puntos_obtenidos"] == 0
    assert r["detalle_preguntas"][0]["correcta"] is False


def test_ordenamiento_parcial():
    # 4 elementos, 2 en posición correcta -> 2/4 de 10 = 5
    ex = examen(pregunta("ordenamiento", 10, elementos=["a", "b", "c", "d"]))
    r = calcular_resultado(ex, {"0": [1, 2, 4, 3]})
    assert r["puntos_obtenidos"] == pytest.approx(5.0)
    assert r["detalle_preguntas"][0]["correcta"] is False


def test_ordenamiento_vacio_y_none():
    ex = examen(pregunta("ordenamiento", 10, elementos=["a", "b"]))
    assert calcular_resultado(ex, {"0": []})["puntos_obtenidos"] == 0
    assert calcular_resultado(ex, {})["puntos_obtenidos"] == 0
    assert calcular_resultado(ex, {"0": None})["puntos_obtenidos"] == 0


# =====================================================
# 6. respuesta_corta
# =====================================================

def test_respuesta_corta_exacta():
    ex = examen(pregunta("respuesta_corta", 10, respuesta_corta="París"))
    r = calcular_resultado(ex, {"0": "París"})
    assert r["puntos_obtenidos"] == 10
    assert r["detalle_preguntas"][0]["correcta"] is True


def test_respuesta_corta_case_insensitive():
    ex = examen(pregunta("respuesta_corta", 10, respuesta_corta="lima"))
    r = calcular_resultado(ex, {"0": "LIMA"})
    assert r["puntos_obtenidos"] == 10


def test_respuesta_corta_alternativa():
    ex = examen(pregunta(
        "respuesta_corta", 10,
        respuesta_corta="lima",
        respuestas_alternativas=["ciudad de los reyes", "Lima"],
    ))
    r = calcular_resultado(ex, {"0": "Ciudad de los Reyes"})
    assert r["puntos_obtenidos"] == 10


def test_respuesta_corta_incorrecta():
    ex = examen(pregunta("respuesta_corta", 10, respuesta_corta="lima"))
    r = calcular_resultado(ex, {"0": "bogota"})
    assert r["puntos_obtenidos"] == 0
    assert r["detalle_preguntas"][0]["correcta"] is False


def test_respuesta_corta_vacia_y_none():
    ex = examen(pregunta("respuesta_corta", 10, respuesta_corta="lima"))
    assert calcular_resultado(ex, {"0": ""})["puntos_obtenidos"] == 0
    assert calcular_resultado(ex, {})["puntos_obtenidos"] == 0
    assert calcular_resultado(ex, {"0": None})["puntos_obtenidos"] == 0


def test_respuesta_corta_sin_respuesta_correcta_definida():
    # Respuesta correcta vacía en el examen -> 0 puntos, sin excepción
    ex = examen(pregunta("respuesta_corta", 10, respuesta_corta=None))
    r = calcular_resultado(ex, {"0": "cualquier cosa"})
    assert r["puntos_obtenidos"] == 0
    assert r["total_puntos"] == 10
    assert r["detalle_preguntas"][0]["correcta"] is False


# =====================================================
# 7. ensayo (calificación manual)
# =====================================================

def test_ensayo_no_suma_al_denominador_CRITICO():
    """
    CASO MÁS IMPORTANTE:
    1 opcion_multiple (10 pts, correcta) + 1 ensayo (10 pts).
    El ensayo NO debe inflar el denominador -> calificación 100.0, NO 50.0.
    """
    ex = examen(
        pregunta("opcion_multiple", 10, respuesta_correcta=1),
        pregunta("ensayo", 10),
    )
    r = calcular_resultado(ex, {"0": 1, "1": "Mi ensayo..."})

    assert r["total_puntos"] == 10
    assert r["puntos_obtenidos"] == 10
    assert r["calificacion"] == pytest.approx(100.0)
    assert r["correctas"] == 1
    # total_preguntas sí incluye el ensayo (cuenta física de preguntas)
    assert r["total_preguntas"] == 2
    # El ensayo aparece en el detalle con correcta=None y 0 puntos
    ensayo_detalle = r["detalle_preguntas"][1]
    assert ensayo_detalle["tipo"] == "ensayo"
    assert ensayo_detalle["correcta"] is None
    assert ensayo_detalle["puntos"] == 0
    assert ensayo_detalle["puntos_obtenidos"] == 0


def test_ensayo_solo_no_divide_por_cero():
    ex = examen(pregunta("ensayo", 10))
    r = calcular_resultado(ex, {"0": "texto"})
    assert r["total_puntos"] == 0
    assert r["puntos_obtenidos"] == 0
    assert r["calificacion"] == 0
    assert r["total_preguntas"] == 1


# =====================================================
# 8. likert / estrellas / escala_numerica
# =====================================================

@pytest.mark.parametrize("tipo", ["likert", "estrellas", "escala_numerica"])
def test_encuesta_no_puntua(tipo):
    # Las encuestas NO se califican: no suman al denominador ni al numerador.
    ex = examen(pregunta(tipo, 5))
    r = calcular_resultado(ex, {"0": 4})
    assert r["puntos_obtenidos"] == 0
    assert r["total_puntos"] == 0
    assert r["calificacion"] == 0
    assert r["detalle_preguntas"][0]["correcta"] is None


@pytest.mark.parametrize("tipo", ["likert", "estrellas", "escala_numerica"])
def test_encuesta_sin_responder_cero(tipo):
    ex = examen(pregunta(tipo, 5))
    assert calcular_resultado(ex, {})["puntos_obtenidos"] == 0
    assert calcular_resultado(ex, {"0": None})["puntos_obtenidos"] == 0


def test_encuesta_no_infla_denominador():
    # 1 opcion_multiple correcta (10) + 1 likert (5): la encuesta no debe bajar la nota.
    ex = examen(
        pregunta("opcion_multiple", 10, respuesta_correcta=1),
        pregunta("likert", 5),
    )
    r = calcular_resultado(ex, {"0": 1, "1": 4})
    assert r["total_puntos"] == 10
    assert r["calificacion"] == pytest.approx(100.0)


# =====================================================
# 9. Casos agregados / ponderados
# =====================================================

def test_examen_sin_preguntas():
    r = calcular_resultado(examen(), {})
    assert r["calificacion"] == 0
    assert r["total_puntos"] == 0
    assert r["puntos_obtenidos"] == 0
    assert r["correctas"] == 0
    assert r["total_preguntas"] == 0
    assert r["detalle_preguntas"] == []


def test_calificacion_ponderada_multiples_pesos():
    # opcion_multiple 10 pts correcta + completar 30 pts con 2/3 correctos
    ex = examen(
        pregunta("opcion_multiple", 10, respuesta_correcta=0),
        pregunta("completar", 30, frases=espacios("a", "b", "c")),
    )
    r = calcular_resultado(ex, {"0": 0, "1": ["a", "b", "x"]})
    # 10 + 20 = 30 de 40 -> 75.0
    assert r["total_puntos"] == 40
    assert r["puntos_obtenidos"] == pytest.approx(30.0)
    assert r["calificacion"] == pytest.approx(75.0)
    assert r["correctas"] == 1
    assert r["total_preguntas"] == 2


def test_pregunta_sin_puntos_cuenta_como_cero_en_denominador():
    ex = examen(pregunta("opcion_multiple", None, respuesta_correcta=1))
    r = calcular_resultado(ex, {"0": 1})
    assert r["total_puntos"] == 0
    assert r["calificacion"] == 0


# =====================================================
# 10. REGRESIÓN DE BUGS CORREGIDOS
#     Estos tests documentaron bugs reales que ya fueron arreglados.
#     Se mantienen para evitar regresiones.
# =====================================================

def test_regresion_completar_segmento_con_respuesta_none_no_crashea():
    """Regresión: `completar` con un espacio de respuesta=None no debe lanzar AttributeError."""
    ex = examen(pregunta(
        "completar", 10,
        frases=[{"segmentos": [{"tipo": "espacio", "respuesta": None}]}],
    ))
    r = calcular_resultado(ex, {"0": ["x"]})
    assert r["puntos_obtenidos"] == 0


def test_regresion_encuesta_respuesta_cadena_vacia_no_da_puntaje():
    """Regresión: en likert/estrellas/escala_numerica la cadena vacía no debe dar puntaje."""
    ex = examen(pregunta("likert", 5))
    r = calcular_resultado(ex, {"0": ""})
    assert r["puntos_obtenidos"] == 0
