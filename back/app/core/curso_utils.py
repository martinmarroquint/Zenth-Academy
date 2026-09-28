# app/core/curso_utils.py
# Helpers PUROS sobre el JSON de modulos de un Curso (sin acceso a BD).
# Compartidos por app/api/cursos.py y app/api/alumnos.py para que la
# distincion "leccion manual (0-20) vs leccion-examen (0-100)" sea UNA sola
# definicion en todo el backend.


def lecciones_de_tipo_examen(curso) -> set:
    """Ids de lecciones que evalúan con un examen (contenido.examen_id o
    bloque-examen). Su nota proviene de ResultadoExamen en escala 0-100, así
    que no deben mezclarse con el promedio manual de lecciones (0-20)."""
    ids = set()
    for modulo in getattr(curso, "modulos", None) or []:
        for leccion in modulo.get("lecciones") or []:
            leccion_id = leccion.get("id")
            contenido = leccion.get("contenido") or {}
            es_examen = bool(contenido.get("examen_id")) or any(
                (bloque or {}).get("tipo") == "examen"
                for bloque in (leccion.get("bloques") or [])
            )
            if es_examen and leccion_id:
                ids.add(str(leccion_id))
    return ids


def examenes_ids_del_curso(curso) -> set:
    """Ids de exámenes referenciados por las lecciones del curso (misma
    lógica que _examenes_accesibles_estudiante en app/api/examenes.py)."""
    ids = set()
    for modulo in getattr(curso, "modulos", None) or []:
        for leccion in modulo.get("lecciones") or []:
            contenido = leccion.get("contenido") or {}
            if contenido.get("examen_id"):
                ids.add(str(contenido["examen_id"]))
            for bloque in leccion.get("bloques") or []:
                if (bloque or {}).get("tipo") == "examen":
                    eid = (bloque.get("contenido") or {}).get("examen_id")
                    if eid:
                        ids.add(str(eid))
    return ids
