# app/api/examenes.py
# VERSION COMPLETA - CON ENDPOINTS PARA EMBED EN CURSOS Y NUEVOS ROLES

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_, func, cast, String, false
from sqlalchemy.orm import Session, selectinload
from typing import List, Optional
import uuid
import secrets
import hashlib
import random
import traceback
import logging
from datetime import datetime, timezone, timedelta

logger = logging.getLogger(__name__)

from app.database import get_db
from app.core.ratelimit import rate_limit
from app.core.dependencies import (
    get_current_active_user,
    require_docente,
    require_admin
)
from app.models.usuario import Usuario
from app.models.examen import Examen, Pregunta
from app.models.resultado_examen import ResultadoExamen
from app.models.intento_examen import IntentoExamen
from app.models.alumno import Alumno
from app.models.alumno_examen import AlumnoExamen  # LEGACY: fallback de lectura
from app.models.grupo import Grupo
from app.models.historial_comparticion import HistorialComparticion
from app.models.material_compartido import MaterialCompartido
from app.schemas.examenes import (
    ExamenCreate, ExamenUpdate, ExamenResponse, ExamenDetailResponse,
    PreguntaCreate, PreguntaResponse,
    ResultadoCreate, ResultadoResponse,
    MensajeResponse,
    GrupoCreate, GrupoUpdate, GrupoResponse,
    HistorialComparticionCreate, HistorialComparticionResponse,
    CompartirAlumnosRequest, AlumnoConectadoResponse,
    AsistenciaItem, AlumnoGuardarItem, RecursoGrupoCreate,
    VerificarPasswordRequest, ResultadoPublicoRequest,
    VincularGrupoCarpetaRequest, SincronizarIniciarRequest,
    IntentoExamenResponse
)

router = APIRouter()

QR_EXPIRATION_SECONDS = 30
# Margen de gracia tras expirar el intento (red/procesamiento). Pasado este
# margen la entrega se conserva con el flag entregado_por_tiempo pero se
# puntúa 0: el tiempo lo valida el servidor (antes se aceptaba con puntaje
# completo aunque el alumno apagara el cronómetro).
GRACIA_ENTREGA_SEGUNDOS = 30


# =============================================
# UTILIDAD
# =============================================

def generar_codigo():
    ahora = datetime.now(timezone.utc)
    r = str(uuid.uuid4().int)[:4]
    return f"EXA-{ahora.year}{str(ahora.month).zfill(2)}{str(ahora.day).zfill(2)}-{r.zfill(4)}"


def _verificar_ownership_examen(examen: Examen, current_user: Usuario) -> None:
    """
    ✅ SEGURIDAD: Verifica que el docente sea dueño del examen.
    - Admin siempre puede.
    - Si el examen es legacy (docente_id NULL), se permite para no romper datos existentes.
    - En caso contrario, debe coincidir el docente_id.
    """
    if current_user.rol == 'admin':
        return
    if not examen.docente_id:
        # Examen legacy sin dueño asignado: permitir (se asignará dueño al editarlo)
        return
    if str(examen.docente_id) != str(current_user.id):
        logger.warning(
            f"Acceso denegado: docente {current_user.id} intentó gestionar "
            f"examen {examen.id} propiedad de {examen.docente_id}"
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permiso para gestionar este examen"
        )


def _serializar_pregunta(
    pregunta: Pregunta, incluir_respuestas: bool, mapping: Optional[dict] = None
) -> dict:
    """Serializa una pregunta. Si `incluir_respuestas` es False (estudiantes /
    acceso público), se oculta la clave de respuestas para evitar trampas.

    Para `relacionar` y `ordenamiento`, el orden mostrado se deriva del mapping
    de barajado que vive SOLO en la config del examen (_asegurar_mappings_examen).
    Al cliente llegan las listas ya barajadas y nada más: el mapping nunca sale
    del servidor, y al calificar el backend des-baraja con esa misma copia
    autoritativa.
    """
    data = {
        "id": str(pregunta.id),
        "examen_id": str(pregunta.examen_id),
        "tipo": pregunta.tipo,
        "enunciado": pregunta.enunciado,
        "puntos": pregunta.puntos,
        "orden": pregunta.orden,
        "opcion_a": pregunta.opcion_a,
        "opcion_b": pregunta.opcion_b,
        "opcion_c": pregunta.opcion_c,
        "opcion_d": pregunta.opcion_d,
        "opcion_e": pregunta.opcion_e,
        "columna_a": pregunta.columna_a,
        "columna_b": pregunta.columna_b,
        "elementos": pregunta.elementos,
        "longitud_minima": pregunta.longitud_minima,
        "escala_opciones": pregunta.escala_opciones,
        "escala_max": pregunta.escala_max,
        "escala_min": pregunta.escala_min,
        "escala_paso": pregunta.escala_paso,
        "escala_min_label": pregunta.escala_min_label,
        "escala_max_label": pregunta.escala_max_label,
        "created_at": pregunta.created_at.isoformat() if pregunta.created_at else None,
    }

    if incluir_respuestas:
        data.update({
            "respuesta_correcta": pregunta.respuesta_correcta,
            "afirmaciones": pregunta.afirmaciones,
            "respuesta_corta": pregunta.respuesta_corta,
            "respuestas_alternativas": pregunta.respuestas_alternativas,
            "rubrica": pregunta.rubrica,
            "segmentos": pregunta.segmentos,
            "frases": pregunta.frases,
        })
        return data

    # --- Sanitizado para estudiantes/acceso público ---
    afirmaciones = pregunta.afirmaciones or []
    frases = pregunta.frases or []

    # ✅ SEGURIDAD: barajado server-side de relacionar/ordenamiento a partir del
    # mapping autoritativo de la config del examen. Sin mapping (o con uno
    # inválido) se muestra el orden canónico: no hay barajado que adivinar.
    columna_b_shuffled = pregunta.columna_b
    elementos_shuffled = pregunta.elementos
    entrada_mapping = mapping or {}

    if pregunta.tipo == 'relacionar' and pregunta.columna_b:
        orden_b = entrada_mapping.get('_orden_columna_b')
        if (
            isinstance(orden_b, list)
            and len(orden_b) == len(pregunta.columna_b)
            and all(isinstance(x, int) and 0 <= x < len(pregunta.columna_b) for x in orden_b)
        ):
            # orden_b[pos_mostrada] = índice canónico mostrado en esa posición
            columna_b_shuffled = [pregunta.columna_b[i] for i in orden_b]

    if pregunta.tipo == 'ordenamiento' and pregunta.elementos:
        orden_el = entrada_mapping.get('_orden_elementos')
        if (
            isinstance(orden_el, list)
            and len(orden_el) == len(pregunta.elementos)
            and all(isinstance(x, int) and 0 <= x < len(pregunta.elementos) for x in orden_el)
        ):
            elementos_shuffled = [pregunta.elementos[i] for i in orden_el]

    data.update({
        "respuesta_correcta": None,
        "afirmaciones": [
            {"id": a.get("id"), "texto": a.get("texto"), "esVerdadero": False}
            for a in afirmaciones
        ] if afirmaciones else None,
        "respuesta_corta": "",
        "respuestas_alternativas": [],
        "rubrica": "",
        "segmentos": None,
        "frases": [
            {
                **f,
                "segmentos": [
                    {**s, "respuesta": ""} if s.get("tipo") == "espacio" else s
                    for s in (f.get("segmentos") or [])
                ],
            }
            for f in frases
        ] if frases else None,
        # ✅ Solo las listas barajadas: sin `_orden_*` (el mapping es privado
        # del servidor; antes se enviaba y el cliente lo devolvía al calificar,
        # con lo que una respuesta de identidad valía 100%).
        "columna_b": columna_b_shuffled,
        "elementos": elementos_shuffled,
    })
    return data


def _firma_orden(elementos: List[str]) -> str:
    """Huella del contenido/orden de una lista de elementos. Si cambia (edición
    del docente), el mapping de barajado de esa pregunta se regenera."""
    return hashlib.md5("\x1f".join(str(e) for e in elementos).encode("utf-8")).hexdigest()[:12]


def _asegurar_mappings_examen(examen: Examen, db: Session) -> Examen:
    """Garantiza que el examen tenga en su config el mapping de barajado de
    relacionar/ordenamiento.

    ✅ SEGURIDAD: el mapping se genera y persiste EN EL SERVIDOR y nunca se
    envía al cliente. Se usa para barajar la vista del estudiante y para
    des-baraja al calificar, así el cliente ya no puede elegir el orden (antes
    los mappings venían del cliente y una respuesta de identidad obtenía 100%).
    Solo se agregan entradas faltantes o con contenido alterado: los exámenes
    en curso no se rebarajan."""
    preguntas = examen.preguntas or []
    config = dict(examen.configuracion or {})
    mappings = dict(config.get("mappings_shuffle") or {})
    cambiado = False
    for i, p in enumerate(preguntas):
        if p.tipo not in ("relacionar", "ordenamiento"):
            continue
        clave = "_orden_columna_b" if p.tipo == "relacionar" else "_orden_elementos"
        elementos = p.columna_b if p.tipo == "relacionar" else p.elementos
        if not elementos or len(elementos) < 2:
            # 0-1 elementos: no hay nada que barajar.
            continue
        entrada = mappings.get(str(i))
        if (
            isinstance(entrada, dict)
            and isinstance(entrada.get(clave), list)
            and entrada.get("f") == _firma_orden(elementos)
        ):
            continue
        indices = list(range(len(elementos)))
        random.shuffle(indices)
        if indices == list(range(len(elementos))):
            # Un barajado identidad revela el orden canónico (= la respuesta).
            indices = indices[1:] + indices[:1]
        mappings[str(i)] = {clave: indices, "f": _firma_orden(elementos)}
        cambiado = True
    if cambiado:
        config["mappings_shuffle"] = mappings
        examen.configuracion = config
        db.commit()
    return examen


def _serializar_examen(examen: Examen, incluir_respuestas: bool, db: Session = None) -> dict:
    if db is not None and not incluir_respuestas:
        examen = _asegurar_mappings_examen(examen, db)
    config = dict(examen.configuracion or {})
    mappings = config.get("mappings_shuffle") or {}
    requiere_password = bool(config.get("password_examen"))
    if not incluir_respuestas:
        # ✅ SEGURIDAD: ni la clave de respuestas ni el mapping de barajado
        # salen del servidor. Se envía solo el flag `requiere_password`.
        config.pop("password_examen", None)
        config.pop("mappings_shuffle", None)
    return {
        "id": str(examen.id),
        "codigo": examen.codigo,
        "titulo": examen.titulo,
        "descripcion": examen.descripcion or "",
        "tiempo_limite": examen.tiempo_limite,
        "puntaje_aprobacion": examen.puntaje_aprobacion,
        "estado": examen.estado,
        "configuracion": config,
        "requiere_password": requiere_password,
        "total_preguntas": len(examen.preguntas) if examen.preguntas else 0,
        "intentos_permitidos": examen.intentos_permitidos,
        "grupo_id": examen.grupo_id,
        "created_at": examen.created_at.isoformat() if examen.created_at else None,
        "updated_at": examen.updated_at.isoformat() if examen.updated_at else None,
        "preguntas": [
            _serializar_pregunta(p, incluir_respuestas, mappings.get(str(i)))
            for i, p in enumerate(examen.preguntas or [])
        ],
    }


def _examenes_accesibles_estudiante(db: Session, estudiante_id) -> set:
    """✅ BAJA 14: ids de exámenes que un estudiante puede ver en LISTADOS:
    los referenciados por lecciones (contenido.examen_id o bloque-examen) de
    los cursos donde está inscrito. Los exámenes compartidos por link siguen
    accesibles por id/código (fetch/intento); esto solo limita la enumeración.
    """
    from app.models.curso import Curso, InscripcionCurso

    inscripciones = db.query(InscripcionCurso).filter(
        cast(InscripcionCurso.estudiante_id, String) == str(estudiante_id)
    ).all()
    if not inscripciones:
        return set()
    curso_ids = {str(i.curso_id) for i in inscripciones}
    ids = set()
    for curso in db.query(Curso).filter(Curso.id.in_(curso_ids)).all():
        for modulo in curso.modulos or []:
            for leccion in modulo.get("lecciones") or []:
                contenido = leccion.get("contenido") or {}
                if contenido.get("examen_id"):
                    ids.add(str(contenido["examen_id"]))
                for bloque in leccion.get("bloques") or []:
                    if bloque.get("tipo") == "examen":
                        eid = (bloque.get("contenido") or {}).get("examen_id")
                        if eid:
                            ids.add(str(eid))
    return ids


def _filtrar_examenes_por_rol(query, current_user: Usuario, db=None):
    """Aísla los exámenes según el rol.

    - admin: ve todos.
    - docente: ve los suyos (+ legacy sin dueño).
    - estudiante: solo exámenes PUBLICADO de lecciones de SUS cursos
      (✅ BAJA 14: antes listaba todos los publicados de todos los docentes).
    """
    if current_user.rol == 'admin':
        return query
    if current_user.rol == 'docente':
        return query.filter(
            or_(Examen.docente_id == str(current_user.id), Examen.docente_id.is_(None))
        )
    query = query.filter(Examen.estado == 'PUBLICADO')
    if db is not None:
        accesibles = _examenes_accesibles_estudiante(db, current_user.id)
        if accesibles:
            query = query.filter(Examen.id.in_(accesibles))
        else:
            query = query.filter(false())
    return query


def _aware_utc(dt):
    """Normaliza a datetime UTC-aware (las columnas DateTime sin timezone
    devuelven naive tanto en SQLite como en PostgreSQL)."""
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def _enriquecer_resultados(resultados, examen, db):
    """Agrega campos calculados a una lista de ResultadoExamen para el frontend."""
    if not examen or not resultados:
        return
    puntaje_aprobacion = examen.puntaje_aprobacion or 60.0
    intentos_permitidos = examen.intentos_permitidos or 0
    # Contar intentos por alumno
    conteo_por_alumno = {}
    for r in resultados:
        key = str(r.alumno_id)
        conteo_por_alumno[key] = conteo_por_alumno.get(key, 0) + 1
    for r in resultados:
        r.aprobado = (r.calificacion or 0) >= puntaje_aprobacion
        r.puntaje_aprobacion = puntaje_aprobacion
        r.intentos_permitidos = intentos_permitidos
        r.intentos_usados = conteo_por_alumno.get(str(r.alumno_id), 0)


def _intento_a_dict(intento: IntentoExamen, examen: Examen, intentos_usados: int) -> dict:
    ahora = datetime.now(timezone.utc)
    expira = _aware_utc(intento.expira_en)
    restantes = 0
    if expira:
        restantes = max(0, int((expira - ahora).total_seconds()))
    intentos_permitidos = examen.intentos_permitidos or 0
    return {
        "intento_id": str(intento.id),
        "examen_id": str(examen.id),
        "expira_en": intento.expira_en,
        "segundos_restantes": restantes,
        "tiempo_limite": examen.tiempo_limite or 60,
        "intentos_permitidos": intentos_permitidos,
        "intentos_usados": intentos_usados,
        "puntaje_aprobacion": examen.puntaje_aprobacion or 60.0,
        "intentos_restantes": max(0, intentos_permitidos - intentos_usados) if intentos_permitidos > 0 else 0,
    }


def _crear_o_reanudar_intento(db: Session, examen: Examen, *, usuario_id=None,
                              es_publico=False, codigo_publico=None, alumno_nombre=""):
    """Devuelve un intento EN_CURSO vigente o crea uno nuevo con `expira_en`."""
    ahora = datetime.now(timezone.utc)
    query = db.query(IntentoExamen).filter(
        IntentoExamen.examen_id == str(examen.id),
        IntentoExamen.estado == 'EN_CURSO',
        IntentoExamen.es_publico == es_publico,
    )
    if es_publico:
        query = query.filter(IntentoExamen.codigo_publico == codigo_publico)
    else:
        query = query.filter(IntentoExamen.usuario_id == str(usuario_id))

    vigente = query.order_by(IntentoExamen.iniciado_en.desc()).first()
    if vigente and _aware_utc(vigente.expira_en) and _aware_utc(vigente.expira_en) > ahora:
        return vigente

    if vigente:
        vigente.estado = 'EXPIRADO'

    limite_seg = (examen.tiempo_limite or 60) * 60
    intento = IntentoExamen(
        id=str(uuid.uuid4()),
        examen_id=str(examen.id),
        usuario_id=str(usuario_id) if usuario_id else None,
        alumno_nombre=alumno_nombre or "",
        es_publico=es_publico,
        codigo_publico=codigo_publico,
        iniciado_en=ahora,
        expira_en=ahora + timedelta(seconds=limite_seg),
        estado='EN_CURSO',
    )
    db.add(intento)
    db.commit()
    db.refresh(intento)
    return intento


def _resolver_tiempo_desde_intento(db: Session, examen: Examen, intento_id, *,
                                   usuario_id=None, es_publico=False, codigo_publico=None):
    """Valida el intento y devuelve (tiempo_usado, entregado_por_tiempo, intento).

    Devuelve (None, None, None) si no se proporcionó intento (uso manual de
    docentes/admins). Lanza HTTPException si el intento no es válido.
    """
    if not intento_id:
        return None, None, None

    intento = db.query(IntentoExamen).filter(IntentoExamen.id == intento_id).first()
    if not intento or str(intento.examen_id) != str(examen.id):
        raise HTTPException(status_code=400, detail="Intento inválido para este examen")

    if es_publico:
        if not intento.es_publico or intento.codigo_publico != codigo_publico:
            raise HTTPException(status_code=403, detail="El intento no corresponde a este examen público")
    else:
        if intento.es_publico or (intento.usuario_id and str(intento.usuario_id) != str(usuario_id)):
            raise HTTPException(status_code=403, detail="El intento no te pertenece")

    # ✅ SEGURIDAD: un intento ya entregado (COMPLETADO/TRAMPA/EXPIRADO) no se
    # puede reutilizar: un envío = un intento. Cierra el reenvío con el mismo
    # intento aunque cambien las respuestas.
    if intento.estado != 'EN_CURSO':
        raise HTTPException(
            status_code=400,
            detail="El intento ya fue entregado o no está activo",
        )

    ahora = datetime.now(timezone.utc)
    limite_seg = (examen.tiempo_limite or 60) * 60
    iniciado = _aware_utc(intento.iniciado_en)
    expira = _aware_utc(intento.expira_en)
    transcurrido = int((ahora - iniciado).total_seconds()) if iniciado else 0
    tiempo_usado = max(0, min(transcurrido, limite_seg))
    entregado_tarde = bool(
        expira and ahora > (expira + timedelta(seconds=GRACIA_ENTREGA_SEGUNDOS))
    )
    return tiempo_usado, entregado_tarde, intento


def calcular_resultado(examen, respuestas_alumno, preguntas_con_mapping=None):
    """
    Calcula el resultado de un examen con auto-calificación para 8 tipos de pregunta.
    
    Tipos auto-calificados: opcion_multiple, verdadero_falso, relacionar, completar,
                            ordenamiento, respuesta_corta, likert, estrellas, escala_numerica
    Tipo manual: ensayo (siempre 0 puntos, requiere calificación manual del docente)
    
    Args:
        examen: objeto Examen con .preguntas
        respuestas_alumno: dict con respuestas del estudiante (key=índice de pregunta)
        preguntas_con_mapping: opcional, dict {índice: {_orden_columna_b, _orden_elementos}}
                               para des-shuffle en relacionar/ordenamiento
    """
    preguntas = examen.preguntas if hasattr(examen, 'preguntas') else []
    # ✅ Normaliza claves a int: la config JSON usa claves "0","1"... y los
    # tests legacy pasan claves int. Antes mappings.get(i) con i int sobre
    # claves str nunca matcheaba (el des-barajado jamás se aplicaba).
    mappings = {}
    for k, v in (preguntas_con_mapping or {}).items():
        try:
            mappings[int(k)] = v
        except (TypeError, ValueError):
            continue
    
    total_puntos = 0
    puntos_obtenidos = 0
    correctas_reales = 0
    detalle_preguntas = []
    
    for i, pregunta in enumerate(preguntas):
        respuesta = respuestas_alumno.get(str(i))
        pts = pregunta.puntos if pregunta.puntos is not None else 0
        
        # ✅ Ensayo y encuestas NO contribuyen al denominador (no se califican).
        if pregunta.tipo in ('ensayo', 'likert', 'estrellas', 'escala_numerica'):
            detalle_preguntas.append({
                "indice": i,
                "tipo": pregunta.tipo,
                "puntos": 0,
                "puntos_obtenidos": 0,
                "correcta": None
            })
            continue
        
        total_puntos += pts
        pregunta_correcta = False
        puntos_pregunta = 0
        
        try:
            if pregunta.tipo == 'opcion_multiple':
                # ✅ FIX: Validación de tipo con try/except
                if respuesta is not None and pregunta.respuesta_correcta is not None:
                    if int(respuesta) == int(pregunta.respuesta_correcta):
                        puntos_pregunta = pts
                        pregunta_correcta = True
                        
            elif pregunta.tipo == 'verdadero_falso':
                if isinstance(respuesta, list) and pregunta.afirmaciones and len(pregunta.afirmaciones) > 0:
                    correctas = sum(1 for j, af in enumerate(pregunta.afirmaciones) 
                        if j < len(respuesta) and respuesta[j] == af.get('esVerdadero', False))
                    proporcion = correctas / len(pregunta.afirmaciones)
                    puntos_pregunta = round(proporcion * pts, 2)
                    pregunta_correcta = (correctas == len(pregunta.afirmaciones))
                    
            elif pregunta.tipo == 'relacionar':
                if isinstance(respuesta, dict) and pregunta.columna_a:
                    col_a = [a for a in pregunta.columna_a if a and a.strip()]
                    total_pares = len(col_a)
                    if total_pares > 0:
                        # ✅ SEGURIDAD: si hay mapping de shuffle, des-shuffle la respuesta.
                        mapping = mappings.get(i, {})
                        orden_b = mapping.get('_orden_columna_b')
                        respuesta_des = respuesta
                        if orden_b and isinstance(orden_b, list):
                            respuesta_des = {}
                            for k, v in respuesta.items():
                                if isinstance(v, int) and 0 <= v < len(orden_b):
                                    respuesta_des[k] = orden_b[v]
                                else:
                                    respuesta_des[k] = v
                        correctas = sum(1 for j in range(total_pares)
                            if str(j) in respuesta_des and respuesta_des[str(j)] == j)
                        proporcion = correctas / total_pares
                        puntos_pregunta = round(proporcion * pts, 2)
                        pregunta_correcta = (correctas == total_pares)
                        
            elif pregunta.tipo == 'completar':
                if pregunta.frases and isinstance(respuesta, list):
                    espacios = []
                    for frase in pregunta.frases:
                        for seg in (frase.get('segmentos') or []):
                            if seg.get('tipo') == 'espacio':
                                # ✅ FIX: `respuesta` puede ser None (Optional[str] en el schema).
                                # Antes `esp.lower()` lanzaba AttributeError y abortaba TODO el examen.
                                espacios.append(seg.get('respuesta') or '')
                    if espacios:
                        correctas = sum(1 for j, esp in enumerate(espacios)
                            if j < len(respuesta) and str(respuesta[j] or '').lower().strip() == str(esp or '').lower().strip())
                        proporcion = correctas / len(espacios)
                        puntos_pregunta = round(proporcion * pts, 2)
                        pregunta_correcta = (correctas == len(espacios))
                        
            elif pregunta.tipo == 'ordenamiento':
                if isinstance(respuesta, list) and pregunta.elementos:
                    elementos = [e for e in pregunta.elementos if e and str(e).strip()]
                    total_elem = len(elementos)
                    if total_elem > 0:
                        # ✅ SEGURIDAD: si hay mapping de shuffle, des-shuffle la respuesta.
                        mapping = mappings.get(i, {})
                        orden_el = mapping.get('_orden_elementos')
                        respuesta_des = respuesta
                        if orden_el and isinstance(orden_el, list) and len(respuesta) == len(orden_el):
                            respuesta_des = [0] * len(orden_el)
                            for pos_shuffled, valor in enumerate(respuesta):
                                if pos_shuffled < len(orden_el):
                                    respuesta_des[orden_el[pos_shuffled]] = valor
                        correctas = sum(1 for j in range(total_elem)
                            if j < len(respuesta_des) and respuesta_des[j] == j + 1)
                        proporcion = correctas / total_elem
                        puntos_pregunta = round(proporcion * pts, 2)
                        pregunta_correcta = (correctas == total_elem)
                        
            elif pregunta.tipo == 'respuesta_corta':
                respuestas_aceptadas = [pregunta.respuesta_corta or '']
                if pregunta.respuestas_alternativas:
                    respuestas_aceptadas.extend(pregunta.respuestas_alternativas)
                respuestas_validas = [str(r).lower().strip() for r in respuestas_aceptadas if r and str(r).strip()]
                if respuestas_validas and str(respuesta or '').lower().strip() in respuestas_validas:
                    puntos_pregunta = pts
                    pregunta_correcta = True
                    
        except (ValueError, TypeError, KeyError, AttributeError):
            # ✅ FIX: Si hay error de tipo/clave, la pregunta se evalúa como 0 puntos
            # pero SÍ cuenta en el denominador (el estudiante intentó responder)
            logger.warning(f"Error evaluando pregunta {i} tipo {pregunta.tipo}: {traceback.format_exc()}")
            puntos_pregunta = 0
            pregunta_correcta = False
        
        puntos_obtenidos += puntos_pregunta
        if pregunta_correcta:
            correctas_reales += 1
            
        detalle_preguntas.append({
            "indice": i,
            "tipo": pregunta.tipo,
            "puntos": pts,
            "puntos_obtenidos": round(puntos_pregunta, 2),
            "correcta": pregunta_correcta
        })
    
    calificacion = round((puntos_obtenidos / total_puntos * 100), 2) if total_puntos > 0 else 0
    
    return {
        "total_puntos": round(total_puntos, 2),
        "puntos_obtenidos": round(puntos_obtenidos, 2),
        "correctas": correctas_reales,
        "total_preguntas": len(preguntas),
        "calificacion": calificacion,
        "detalle_preguntas": detalle_preguntas
    }


# =============================================
# GRUPOS
# =============================================

@router.get("/grupos", response_model=List[GrupoResponse])
def listar_grupos(
    docente_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_docente)
):
    # ✅ SEGURIDAD (MEDIA 9): solo staff lista grupos. Antes cualquier
    # estudiante veía el padrón y las asistencias de todos los docentes.
    query = db.query(Grupo)
    if current_user.rol != 'admin':
        query = query.filter(
            or_(
                Grupo.docente_id == str(current_user.id),
                Grupo.docente_id.is_(None),
                Grupo.docente_id == 'default',
            )
        )
    if docente_id:
        query = query.filter(Grupo.docente_id == docente_id)
    return query.order_by(Grupo.created_at.desc()).all()


@router.post("/grupos", response_model=GrupoResponse, status_code=201)
def crear_grupo(
    data: GrupoCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_docente)  # ✅ Cambiado
):
    # ✅ FIX: el dueño es SIEMPRE el usuario autenticado (salvo admin que puede
    # asignarlo explícitamente). Antes `data.docente_id or current_user.id` no caía
    # nunca al usuario actual porque el schema tiene default "default" (truthy),
    # dejando todos los grupos a nombre de "default".
    docente_id_final = str(current_user.id)
    if current_user.rol == 'admin' and data.docente_id and data.docente_id != 'default':
        docente_id_final = data.docente_id

    grupo = Grupo(
        id=str(uuid.uuid4()),
        nombre=data.nombre,
        docente_id=docente_id_final,
        alumnos=[],
        asistencias=[],
        recursos=[],
        compartir_con_todos=True
    )
    db.add(grupo)
    db.commit()
    db.refresh(grupo)
    return grupo


def _verificar_ownership_grupo(grupo: Grupo, current_user: Usuario) -> None:
    """✅ SEGURIDAD: aísla los grupos por docente (admin siempre puede)."""
    if current_user.rol == 'admin':
        return
    # Grupos legacy sin dueño real ("default") se permiten para no romper datos previos
    if not grupo.docente_id or grupo.docente_id == 'default':
        return
    if str(grupo.docente_id) != str(current_user.id):
        logger.warning(
            f"Acceso denegado: docente {current_user.id} intentó gestionar "
            f"grupo {grupo.id} propiedad de {grupo.docente_id}"
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permiso para gestionar este grupo"
        )


@router.get("/grupos/{grupo_id}", response_model=GrupoResponse)
def obtener_grupo(
    grupo_id: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_docente)
):
    grupo = db.query(Grupo).filter(Grupo.id == grupo_id).first()
    if not grupo:
        raise HTTPException(status_code=404, detail="Grupo no encontrado")
    # ✅ SEGURIDAD (MEDIA 9): el detalle expone padrón/asistencias/recursos.
    _verificar_ownership_grupo(grupo, current_user)
    return grupo


@router.put("/grupos/{grupo_id}", response_model=GrupoResponse)
def actualizar_grupo(
    grupo_id: str,
    data: GrupoUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_docente)  # ✅ Cambiado
):
    grupo = db.query(Grupo).filter(Grupo.id == grupo_id).first()
    if not grupo:
        raise HTTPException(status_code=404, detail="Grupo no encontrado")
    # ✅ SEGURIDAD: verificar ownership
    _verificar_ownership_grupo(grupo, current_user)
    
    if data.nombre is not None:
        grupo.nombre = data.nombre
    if data.alumnos is not None:
        grupo.alumnos = data.alumnos
    if data.asistencias is not None:
        grupo.asistencias = data.asistencias
    if data.recursos is not None:
        grupo.recursos = data.recursos
    if data.compartir_con_todos is not None:
        grupo.compartir_con_todos = data.compartir_con_todos
    
    grupo.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(grupo)
    return grupo


@router.delete("/grupos/{grupo_id}", response_model=MensajeResponse)
def eliminar_grupo(
    grupo_id: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_docente)  # ✅ Cambiado
):
    grupo = db.query(Grupo).filter(Grupo.id == grupo_id).first()
    if not grupo:
        raise HTTPException(status_code=404, detail="Grupo no encontrado")
    # ✅ SEGURIDAD: verificar ownership
    _verificar_ownership_grupo(grupo, current_user)
    db.delete(grupo)
    db.commit()
    return {"mensaje": "Grupo eliminado", "ok": True}


@router.post("/grupos/{grupo_id}/asistencia", response_model=MensajeResponse)
def guardar_asistencia(
    grupo_id: str,
    data: List[AsistenciaItem],
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_docente)  # ✅ Cambiado
):
    grupo = db.query(Grupo).filter(Grupo.id == grupo_id).first()
    if not grupo:
        raise HTTPException(status_code=404, detail="Grupo no encontrado")
    # ✅ SEGURIDAD (MEDIA 8): verificar ownership
    _verificar_ownership_grupo(grupo, current_user)

    fecha_actual = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    asistencias_actuales = grupo.asistencias or []
    asistencias_actuales = [a for a in asistencias_actuales if a.get('fecha') != fecha_actual]
    grupo.asistencias = asistencias_actuales + [a.model_dump() for a in data]
    grupo.updated_at = datetime.now(timezone.utc)
    db.commit()
    return {"mensaje": "Asistencia guardada", "total": len(data), "ok": True}


# =============================================
# RECURSOS DEL GRUPO
# INTEGRACIÓN: los recursos viven en materiales_compartidos
# (un solo modelo de recurso en todo el proyecto). Estos
# endpoints se mantienen como compatibilidad para el flujo
# de proyección; el CRUD moderno es /materiales?grupo_id=X
# =============================================

def _recurso_grupo_a_dict(m):
    """Convierte un material_compartido al formato 'recurso de grupo'
    usado por el flujo de proyección (compatibilidad)."""
    return {
        "id": m.id,
        "nombre": m.titulo,
        "tipo": m.categoria or ("enlace" if m.tipo == "enlace" else "archivo"),
        "url": m.contenido or m.url_archivo or "",
        "descripcion": m.descripcion or "",
        "fecha": m.created_at.isoformat() if m.created_at else None,
        "material_id": m.id,
        "url_publica": m.token and f"https://zenthacademy.com/m/{m.token}" or None
    }


def _tipo_recurso_a_material(tipo: str) -> tuple:
    """Mapea el tipo del frontend (link/pdf/ppt/video/documento/otro)
    a tipo + categoria del material."""
    if tipo in ("link", "enlace", "url"):
        return "enlace", None
    if tipo in ("texto", "text"):
        return "texto", None
    return "archivo", tipo


# =============================================
# ALUMNOS UNIFICADOS (FASE E)
# El catálogo único es `alumnos`. `AlumnoExamen` (alumnos_examenes)
# queda como LEGACY: se usa solo como fallback de lectura para ids
# antiguos, nunca para escritura.
# =============================================

def _alumno_a_dict(a) -> dict:
    """Serializa un Alumno (o AlumnoExamen legacy) al formato del módulo
    de exámenes, manteniendo compatibilidad con el frontend."""
    return {
        "id": a.id,
        "dni": getattr(a, "dni", "") or "",
        "grado": getattr(a, "grado", "") or "",
        "nombres": a.nombres,
        "apellidos": a.apellidos,
        "email": getattr(a, "email", "") or "",
        "grupo": getattr(a, "grupo", "") or "",
        "grupo_id": getattr(a, "grupo_id", None),
        "activo": getattr(a, "activo", True),
        "nombre_completo": f"{a.apellidos}, {a.nombres}",
        "nombre_corto": f"{a.nombres} {a.apellidos}"
    }


def _alumnos_por_ids(db: Session, alumnos_ids: list) -> list:
    """Busca alumnos por ids en el catálogo único `alumnos`;
    si falta alguno, lo completa desde `alumnos_examenes` (legacy)."""
    if not alumnos_ids:
        return []
    encontrados = db.query(Alumno).filter(Alumno.id.in_(alumnos_ids)).all()
    encontrados_ids = {a.id for a in encontrados}
    faltantes = [i for i in alumnos_ids if i not in encontrados_ids]
    if faltantes:
        try:
            legacy = db.query(AlumnoExamen).filter(AlumnoExamen.id.in_(faltantes)).all()
            encontrados.extend(legacy)
        except Exception:
            pass
    return encontrados


@router.post("/grupos/{grupo_id}/recursos")
def agregar_recurso_grupo(
    grupo_id: str,
    data: RecursoGrupoCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_docente)
):
    grupo = db.query(Grupo).filter(Grupo.id == grupo_id).first()
    if not grupo:
        raise HTTPException(status_code=404, detail="Grupo no encontrado")
    # ✅ SEGURIDAD (MEDIA 8): verificar ownership
    _verificar_ownership_grupo(grupo, current_user)

    tipo_material, categoria = _tipo_recurso_a_material(data.tipo)
    material = MaterialCompartido(
        id=str(uuid.uuid4()),
        docente_id=str(current_user.id),
        docente_nombre=current_user.nombre_completo or grupo.docente_id,
        titulo=data.nombre,
        descripcion=data.descripcion,
        tipo=tipo_material,
        contenido=data.url or data.contenido,
        grupo_id=grupo_id,
        categoria=categoria,
        token=secrets.token_urlsafe(16),
        activo=True,
        visitas=0
    )
    db.add(material)
    db.commit()
    db.refresh(material)
    return {"mensaje": "Recurso agregado", "recurso": _recurso_grupo_a_dict(material), "ok": True}


@router.get("/grupos/{grupo_id}/recursos")
def listar_recursos_grupo(
    grupo_id: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    grupo = db.query(Grupo).filter(Grupo.id == grupo_id).first()
    if not grupo:
        raise HTTPException(status_code=404, detail="Grupo no encontrado")
    materiales = db.query(MaterialCompartido).filter(
        MaterialCompartido.grupo_id == grupo_id
    ).order_by(MaterialCompartido.created_at.desc()).all()
    return [_recurso_grupo_a_dict(m) for m in materiales]


@router.delete("/grupos/{grupo_id}/recursos/{recurso_id}")
def eliminar_recurso_grupo(
    grupo_id: str,
    recurso_id: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_docente)
):
    # ✅ SEGURIDAD (MEDIA 8): antes ignoraba `grupo_id` y no verificaba
    # ownership: cualquier docente podía borrar recursos de otros grupos.
    grupo = db.query(Grupo).filter(Grupo.id == grupo_id).first()
    if not grupo:
        raise HTTPException(status_code=404, detail="Grupo no encontrado")
    _verificar_ownership_grupo(grupo, current_user)
    material = db.query(MaterialCompartido).filter(
        MaterialCompartido.id == recurso_id,
        MaterialCompartido.grupo_id == grupo_id,
    ).first()
    if not material:
        raise HTTPException(status_code=404, detail="Recurso no encontrado")
    db.delete(material)
    db.commit()
    return {"mensaje": "Recurso eliminado", "ok": True}


# =============================================
# SINCRONIZACIÓN CARPETA DOCENTE (QR)
# =============================================

@router.post("/sincronizar/iniciar")
def iniciar_sesion_carpeta(
    data: SincronizarIniciarRequest,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_docente)  # ✅ Cambiado
):
    session_id = data.session_id
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id requerido")
    return {
        "session_id": session_id,
        "estado": "ESPERANDO",
        "expiracion": (datetime.now(timezone.utc) + timedelta(seconds=QR_EXPIRATION_SECONDS)).isoformat(),
        "mensaje": "Sesion iniciada. Esperando escaneo del celular..."
    }


@router.get("/sincronizar/estado/{session_id}")
def consultar_estado_carpeta(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_docente)
):
    grupo = db.query(Grupo).filter(Grupo.session_activo == session_id).first()
    if grupo:
        alumnos_conectados = []
        try:
            historial = db.query(HistorialComparticion).filter(
                HistorialComparticion.session_id == session_id,
                HistorialComparticion.estado == 'ACTIVO'
            ).first()
            if historial and historial.alumnos_ids:
                alumnos_data = _alumnos_por_ids(db, historial.alumnos_ids)
                alumnos_conectados = [
                    {"id": a.id, "nombre": f"{a.nombres} {a.apellidos}", "grado": a.grado}
                    for a in alumnos_data
                ]
        except:
            pass
        # Recursos reales desde la tabla de materiales (recursos unificados)
        materiales = db.query(MaterialCompartido).filter(
            MaterialCompartido.grupo_id == grupo.id
        ).order_by(MaterialCompartido.created_at.desc()).all()
        recursos = [_recurso_grupo_a_dict(m) for m in materiales]
        return {
            "sincronizado": True,
            "estado": "VINCULADO",
            "carpeta": {
                "id": grupo.id,
                "nombre": grupo.nombre,
                "docente": grupo.docente_id or "Docente",
                "color": "#4F46E5",
                "recursos": recursos
            },
            "alumnos": alumnos_conectados
        }
    return {"sincronizado": False, "estado": "ESPERANDO"}


@router.get("/sincronizar/escanear/{session_id}")
def escanear_qr(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_docente)
):
    grupos = db.query(Grupo).order_by(Grupo.created_at.desc()).all()
    return {
        "session_id": session_id,
        "estado": "ESCANEADO",
        "grupos_disponibles": [
            {
                "id": g.id,
                "nombre": g.nombre,
                "total_alumnos": len(g.alumnos or []),
                "total_recursos": db.query(MaterialCompartido).filter(
                    MaterialCompartido.grupo_id == g.id
                ).count(),
                "total_examenes": 0
            }
            for g in grupos
        ]
    }


@router.post("/sincronizar/vincular")
def vincular_grupo_carpeta(
    data: VincularGrupoCarpetaRequest,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_docente)
):
    session_id = data.session_id
    grupo_id = data.grupo_id
    if not session_id or not grupo_id:
        raise HTTPException(status_code=400, detail="session_id y grupo_id requeridos")
    grupo = db.query(Grupo).filter(Grupo.id == grupo_id).first()
    if not grupo:
        raise HTTPException(status_code=404, detail="Grupo no encontrado")
    # ✅ SEGURIDAD (MEDIA 8): verificar ownership
    _verificar_ownership_grupo(grupo, current_user)
    db.query(Grupo).filter(Grupo.session_activo == session_id).update({"session_activo": None})
    grupo.session_activo = session_id
    db.commit()
    materiales = db.query(MaterialCompartido).filter(
        MaterialCompartido.grupo_id == grupo.id
    ).order_by(MaterialCompartido.created_at.desc()).all()
    return {
        "success": True,
        "mensaje": f"Grupo '{grupo.nombre}' vinculado correctamente",
        "grupo": {
            "id": grupo.id,
            "nombre": grupo.nombre,
            "docente": grupo.docente_id or "Docente",
            "color": "#4F46E5",
            "recursos": [_recurso_grupo_a_dict(m) for m in materiales]
        }
    }


@router.delete("/sincronizar/cerrar/{session_id}")
def cerrar_sesion_carpeta(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_docente)  # ✅ Cambiado
):
    grupo = db.query(Grupo).filter(Grupo.session_activo == session_id).first()
    if grupo:
        grupo.session_activo = None
        db.commit()
    return {"success": True, "mensaje": "Sesion cerrada correctamente"}


@router.get("/sincronizar/alumnos/{session_id}")
def obtener_alumnos_conectados(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_docente)
):
    historial = db.query(HistorialComparticion).filter(
        HistorialComparticion.session_id == session_id,
        HistorialComparticion.estado == 'ACTIVO'
    ).first()
    if not historial:
        return {"alumnos": []}
    if not historial.alumnos_ids:
        return {"alumnos": []}
    alumnos = _alumnos_por_ids(db, historial.alumnos_ids)
    return {
        "alumnos": [
            {
                "id": a.id,
                "nombre": f"{a.nombres} {a.apellidos}",
                "grado": a.grado,
                "dni": getattr(a, "dni", "") or ""
            }
            for a in alumnos
        ]
    }


# =============================================
# COMPARTIR CON ALUMNOS ESPECÍFICOS
# =============================================

@router.post("/compartir/alumnos", response_model=MensajeResponse)
def compartir_con_alumnos(
    data: CompartirAlumnosRequest,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_docente)  # ✅ Cambiado
):
    grupo = db.query(Grupo).filter(Grupo.id == data.grupo_id).first()
    if not grupo:
        raise HTTPException(status_code=404, detail="Grupo no encontrado")
    # ✅ SEGURIDAD (MEDIA 8): verificar ownership
    _verificar_ownership_grupo(grupo, current_user)
    alumnos = _alumnos_por_ids(db, data.alumnos_ids)
    if len(alumnos) != len(data.alumnos_ids):
        raise HTTPException(status_code=404, detail="Algunos alumnos no existen")
    grupo.compartir_con_todos = False
    grupo.updated_at = datetime.now(timezone.utc)
    db.commit()
    # Snapshot de recursos REALES (tabla materiales_compartidos)
    materiales = db.query(MaterialCompartido).filter(
        MaterialCompartido.grupo_id == grupo.id
    ).all()
    recursos_snapshot = [_recurso_grupo_a_dict(m) for m in materiales]
    historial = db.query(HistorialComparticion).filter(
        HistorialComparticion.session_id == data.session_id,
        HistorialComparticion.estado == 'ACTIVO'
    ).first()
    if historial:
        historial.alumnos_ids = data.alumnos_ids
        historial.cantidad_alumnos = len(data.alumnos_ids)
        historial.recursos_compartidos = recursos_snapshot
        historial.cantidad_recursos = len(recursos_snapshot)
        historial.actualizado_en = datetime.now(timezone.utc)
    else:
        historial = HistorialComparticion(
            id=str(uuid.uuid4()),
            docente_id=grupo.docente_id,
            grupo_id=grupo.id,
            grupo_nombre=grupo.nombre,
            recursos_compartidos=recursos_snapshot,
            cantidad_recursos=len(recursos_snapshot),
            alumnos_ids=data.alumnos_ids,
            cantidad_alumnos=len(data.alumnos_ids),
            session_id=data.session_id,
            estado='ACTIVO'
        )
        db.add(historial)
    db.commit()
    return {
        "mensaje": f"Carpeta compartida con {len(data.alumnos_ids)} alumnos",
        "ok": True
    }


# =============================================
# HISTORIAL DE COMPARTICIONES
# NOTA: el router canónico es /historial (app/api/historial.py).
# El clon /examenes/historial/* fue ELIMINADO (recursos unificados).
# =============================================


# =============================================
# ALUMNOS (FASE E - catálogo único `alumnos`)
# Se mantienen las rutas /examenes/alumnos* como compatibilidad:
# ahora leen/escriben sobre la tabla `alumnos` (con grupo_id),
# en lugar de la tabla duplicada `alumnos_examenes`.
# =============================================

@router.get("/alumnos")
def listar_alumnos(
    busqueda: Optional[str] = Query(None),
    grupo_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_docente)
):
    query = db.query(Alumno)
    if busqueda:
        query = query.filter(
            (Alumno.nombres.ilike(f"%{busqueda}%")) |
            (Alumno.apellidos.ilike(f"%{busqueda}%")) |
            (Alumno.dni.ilike(f"%{busqueda}%"))
        )
    if grupo_id:
        query = query.filter(Alumno.grupo_id == grupo_id)
    return [_alumno_a_dict(a) for a in query.order_by(Alumno.apellidos.asc()).all()]


@router.get("/alumnos/buscar")
def buscar_alumnos(
    q: str = Query(..., min_length=2),
    grupo_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_docente)
):
    query = db.query(Alumno).filter(
        (Alumno.nombres.ilike(f"%{q}%")) |
        (Alumno.apellidos.ilike(f"%{q}%")) |
        (Alumno.dni.ilike(f"%{q}%"))
    )
    if grupo_id:
        query = query.filter(Alumno.grupo_id == grupo_id)
    return [_alumno_a_dict(a) for a in query.limit(20).all()]


@router.get("/alumnos/grupo/{grupo_id}")
def obtener_alumnos_por_grupo(
    grupo_id: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_docente)
):
    grupo = db.query(Grupo).filter(Grupo.id == grupo_id).first()
    if not grupo:
        raise HTTPException(status_code=404, detail="Grupo no encontrado")
    # ✅ SEGURIDAD (MEDIA 9): el padrón del grupo es solo del dueño.
    _verificar_ownership_grupo(grupo, current_user)
    alumnos_ids = [a.get('id') for a in grupo.alumnos if a.get('id')]
    if not alumnos_ids:
        return []
    return [_alumno_a_dict(a) for a in _alumnos_por_ids(db, alumnos_ids)]


@router.post("/alumnos", status_code=201)
def guardar_alumnos(
    data: List[AlumnoGuardarItem],
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_docente)  # ✅ Cambiado
):
    if not data:
        raise HTTPException(status_code=400, detail="Lista de alumnos vacía")
    grupo_ids = {a.grupo_id for a in data if a.grupo_id}
    # ✅ SEGURIDAD (MEDIA 8): verificar ownership de los grupos existentes
    # ANTES de tocar el catálogo (ids inexistentes se toleran por compat).
    if grupo_ids:
        for g in db.query(Grupo).filter(Grupo.id.in_(grupo_ids)).all():
            _verificar_ownership_grupo(g, current_user)
    # FASE E: los alumnos viven en `alumnos`; desvinculamos los que ya no
    # están en la lista del grupo (no se borran: el catálogo es único).
    # N+1 fix: un solo UPDATE para todos los grupos.
    if grupo_ids:
        db.query(Alumno).filter(Alumno.grupo_id.in_(grupo_ids)).update({"grupo_id": None})
    # N+1 fix: precargar alumnos existentes por id y por dni en dos consultas
    ids_buscados = {a.id for a in data if a.id}
    dnis_buscados = {a.dni for a in data if a.dni}
    existentes_por_id = {
        a.id: a for a in db.query(Alumno).filter(Alumno.id.in_(ids_buscados)).all()
    } if ids_buscados else {}
    existentes_por_dni = {
        a.dni: a for a in db.query(Alumno).filter(Alumno.dni.in_(dnis_buscados)).all()
    } if dnis_buscados else {}
    for alumno in data:
        existe = existentes_por_id.get(alumno.id) if alumno.id else None
        if not existe and alumno.dni:
            existe = existentes_por_dni.get(alumno.dni)
        if existe:
            # Actualizar datos y vincular al grupo.
            # nombres/apellidos solo se sobrescriben si el cliente los envió
            # (equivale al .get(key, valor_actual) original).
            if 'nombres' in alumno.model_fields_set:
                existe.nombres = alumno.nombres
            if 'apellidos' in alumno.model_fields_set:
                existe.apellidos = alumno.apellidos
            existe.dni = alumno.dni or None
            existe.grado = alumno.grado or None
            existe.email = alumno.email or None
            existe.grupo = alumno.grupo or None
            existe.grupo_id = alumno.grupo_id
        else:
            nuevo = Alumno(
                id=str(uuid.uuid4()),
                dni=alumno.dni or None,
                grado=alumno.grado or None,
                nombres=alumno.nombres if 'nombres' in alumno.model_fields_set else '',
                apellidos=alumno.apellidos if 'apellidos' in alumno.model_fields_set else '',
                email=alumno.email or None,
                grupo=alumno.grupo or None,
                grupo_id=alumno.grupo_id
            )
            db.add(nuevo)
            existentes_por_id[nuevo.id] = nuevo
            if nuevo.dni:
                existentes_por_dni[nuevo.dni] = nuevo
    db.commit()
    return {"mensaje": f"{len(data)} alumnos guardados correctamente", "ok": True}


@router.delete("/alumnos", response_model=MensajeResponse)
def eliminar_todos_alumnos(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_docente)  # ✅ Cambiado
):
    # ✅ SEGURIDAD (MEDIA 8): antes desvinculaba TODOS los grupos de TODOS
    # los docentes. Ahora cada docente solo vacía sus propios grupos
    # (el admin puede vaciar todos). Catálogo único: no se borran filas.
    query = db.query(Alumno).filter(Alumno.grupo_id.isnot(None))
    if current_user.rol != 'admin':
        grupos_propios = [
            gid for (gid,) in db.query(Grupo.id).filter(
                or_(
                    Grupo.docente_id == str(current_user.id),
                    Grupo.docente_id.is_(None),
                    Grupo.docente_id == 'default',
                )
            ).all()
        ]
        if not grupos_propios:
            return {"mensaje": "Alumnos desvinculados de grupos", "ok": True}
        query = query.filter(Alumno.grupo_id.in_(grupos_propios))
    query.update({"grupo_id": None})
    db.commit()
    return {"mensaje": "Alumnos desvinculados de grupos", "ok": True}


@router.delete("/alumnos/grupo/{grupo_id}", response_model=MensajeResponse)
def eliminar_alumnos_por_grupo(
    grupo_id: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_docente)  # ✅ Cambiado
):
    # ✅ SEGURIDAD (MEDIA 8): ownership si el grupo existe (los ids legacy
    # inexistentes se toleran por compatibilidad con datos antiguos).
    grupo = db.query(Grupo).filter(Grupo.id == grupo_id).first()
    if grupo:
        _verificar_ownership_grupo(grupo, current_user)
    db.query(Alumno).filter(Alumno.grupo_id == grupo_id).update({"grupo_id": None})
    db.commit()
    return {"mensaje": f"Alumnos del grupo {grupo_id} desvinculados", "ok": True}


def _actualizar_progreso_por_examen(db, examen_id, alumno_id, calificacion):
    """
    Cuando un alumno rinde un examen asociado a una lección de curso,
    marca la lección como completada (si aprobó) y recalcula el progreso.

    ✅ FIX: antes usaba `InscripcionCurso.alumno_id` (columna inexistente → AttributeError
    silenciado) y escaneaba TODOS los cursos. Ahora:
      - usa `estudiante_id`
      - filtra cursos por el docente dueño del examen
      - actualiza ProgresoLeccion (fuente de verdad) y delega el recálculo
    """
    from app.models.curso import Curso, InscripcionCurso, ProgresoLeccion
    from app.models.examen import Examen
    from sqlalchemy import cast, String

    try:
        examen = db.query(Examen).filter(Examen.id == examen_id).first()
        if not examen:
            return

        # Optimización: limitar a los cursos del docente dueño del examen
        query = db.query(Curso)
        if examen.docente_id:
            query = query.filter(cast(Curso.docente_id, String) == str(examen.docente_id))
        cursos = query.all()

        for curso in cursos:
            modulos = curso.modulos or []
            for modulo in modulos:
                for leccion in modulo.get('lecciones', []):
                    if leccion.get('tipo') != 'examen':
                        continue
                    contenido = leccion.get('contenido') or {}
                    if str(contenido.get('examen_id')) != str(examen_id):
                        continue

                    leccion_id = leccion.get('id')
                    if not leccion_id:
                        continue

                    inscripcion = db.query(InscripcionCurso).filter(
                        cast(InscripcionCurso.curso_id, String) == str(curso.id),
                        cast(InscripcionCurso.estudiante_id, String) == str(alumno_id)
                    ).first()
                    if not inscripcion:
                        return

                    # ✅ FIX: usar el puntaje de aprobación real del examen (no hardcodeado).
                    puntaje_aprobacion = examen.puntaje_aprobacion or 60
                    aprobado = (calificacion or 0) >= puntaje_aprobacion

                    # ✅ Actualizar ProgresoLeccion (fuente de verdad del progreso)
                    progreso_lec = db.query(ProgresoLeccion).filter(
                        cast(ProgresoLeccion.curso_id, String) == str(curso.id),
                        cast(ProgresoLeccion.estudiante_id, String) == str(alumno_id),
                        cast(ProgresoLeccion.leccion_id, String) == str(leccion_id)
                    ).first()

                    if not progreso_lec:
                        progreso_lec = ProgresoLeccion(
                            id=str(uuid.uuid4()),
                            curso_id=str(curso.id),
                            estudiante_id=str(alumno_id),
                            leccion_id=str(leccion_id),
                            modulo_id=modulo.get('id'),
                        )
                        db.add(progreso_lec)

                    progreso_lec.nota = calificacion
                    progreso_lec.aprobado = aprobado
                    progreso_lec.intentos = (progreso_lec.intentos or 0) + 1
                    progreso_lec.fecha_ultimo_intento = datetime.now(timezone.utc)
                    if aprobado and not progreso_lec.completado:
                        progreso_lec.completado = True
                        progreso_lec.fecha_completado = datetime.now(timezone.utc)
                    if not progreso_lec.fecha_liberacion:
                        progreso_lec.fecha_liberacion = datetime.now(timezone.utc)

                    db.commit()

                    # Recalcular con la lógica centralizada (evita duplicar reglas)
                    try:
                        from app.api.cursos import _actualizar_progreso_curso
                        _actualizar_progreso_curso(db, str(curso.id), str(alumno_id))
                    except Exception as e:
                        logger.warning(f"No se pudo recalcular progreso del curso: {e}")
                    return
    except Exception as e:
        # No romper el guardado del resultado por un fallo en la sincronización
        logger.warning(f"_actualizar_progreso_por_examen falló: {e}")


# =============================================
# RESULTADOS
# =============================================

@router.post("/{examen_id}/intentos", response_model=IntentoExamenResponse)
def iniciar_intento(
    examen_id: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """Inicia (o reanuda) un intento con expiración controlada por el servidor.

    El frontend usa `segundos_restantes` para el temporizador y devuelve
    `intento_id` al entregar. Así el tiempo deja de ser controlado por el cliente.
    """
    examen = db.query(Examen).filter(Examen.id == examen_id).first()
    if not examen:
        raise HTTPException(status_code=404, detail="Examen no encontrado")

    usados = db.query(ResultadoExamen).filter(
        ResultadoExamen.examen_id == examen_id,
        ResultadoExamen.alumno_id == str(current_user.id)
    ).count()

    if current_user.rol not in ('admin', 'docente'):
        if examen.estado != 'PUBLICADO':
            raise HTTPException(status_code=403, detail="Examen no disponible")
        if examen.intentos_permitidos and examen.intentos_permitidos > 0 and usados >= examen.intentos_permitidos:
            raise HTTPException(status_code=400, detail="Límite de intentos alcanzado")

    intento = _crear_o_reanudar_intento(
        db, examen, usuario_id=str(current_user.id), es_publico=False,
        alumno_nombre=current_user.nombre_completo,
    )
    return _intento_a_dict(intento, examen, usados)


@router.post("/resultados", response_model=ResultadoResponse, status_code=201)
def guardar_resultado(
    data: ResultadoCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    examen = db.query(Examen).filter(Examen.id == data.examen_id).first()
    if not examen:
        raise HTTPException(status_code=404, detail="Examen no encontrado")

    # ✅ SEGURIDAD (BAJA 13): el registro MANUAL (sin intento emitido por el
    # servidor) de un docente solo aplica a SUS exámenes (admin: cualquiera).
    # Rendir con intento propio sigue permitido (rol dual / práctica), porque
    # `_resolver_tiempo_desde_intento` amarra el intento al usuario que lo inició.
    if current_user.rol == 'docente' and not data.intento_id:
        _verificar_ownership_examen(examen, current_user)
    
    # ✅ SEGURIDAD (CRÍTICO): Un estudiante solo puede enviar resultados como él mismo.
    # Docentes/admins pueden registrar en nombre de un alumno (uso manual/testing).
    alumno_id_final = data.alumno_id
    if current_user.rol == 'estudiante':
        if data.alumno_id and str(data.alumno_id) != str(current_user.id):
            logger.warning(
                f"Intento de suplantación: usuario {current_user.id} intentó enviar "
                f"resultado como alumno_id={data.alumno_id} en examen {data.examen_id}"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No puedes enviar resultados a nombre de otro estudiante"
            )
        alumno_id_final = str(current_user.id)
    
    # ✅ CORREGIDO: Verificar que el examen esté publicado
    if examen.estado != 'PUBLICADO':
        raise HTTPException(status_code=400, detail="El examen no está disponible para entregar respuestas")
    
    # ✅ CORREGIDO: Verificar ventana de fechas
    config = examen.configuracion or {}
    ahora = datetime.now(timezone.utc)
    if config.get('fecha_inicio'):
        try:
            fecha_inicio = datetime.fromisoformat(config['fecha_inicio'].replace('Z', '+00:00'))
            if ahora < fecha_inicio:
                raise HTTPException(status_code=400, detail="El examen aún no está disponible")
        except (ValueError, AttributeError):
            pass
    if config.get('fecha_fin'):
        try:
            fecha_fin = datetime.fromisoformat(config['fecha_fin'].replace('Z', '+00:00'))
            if ahora > fecha_fin:
                raise HTTPException(status_code=400, detail="El plazo para entregar el examen ha expirado")
        except (ValueError, AttributeError):
            pass
    
    # Verificar límite de intentos (usando el alumno validado)
    if examen.intentos_permitidos and examen.intentos_permitidos > 0:
        intentos_actuales = db.query(ResultadoExamen).filter(
            ResultadoExamen.examen_id == data.examen_id,
            ResultadoExamen.alumno_id == alumno_id_final
        ).count()
        if intentos_actuales >= examen.intentos_permitidos:
            raise HTTPException(status_code=400, detail="Límite de intentos alcanzado")
    
    # ✅ AUTORIDAD DE TIEMPO: el servidor calcula el tiempo a partir del intento.
    # Los estudiantes DEBEN entregar con un intento iniciado en el servidor.
    if current_user.rol == 'estudiante' and not data.intento_id:
        raise HTTPException(status_code=400, detail="Debes iniciar el intento antes de entregar")
    tiempo_usado_servidor, entregado_tarde, intento = _resolver_tiempo_desde_intento(
        db, examen, data.intento_id, usuario_id=alumno_id_final
    )

    # ✅ SEGURIDAD: el mapping de barajado vive en la config del examen (solo
    # servidor); lo que el cliente mande en `mappings_shuffle` se ignora.
    examen = _asegurar_mappings_examen(examen, db)
    mappings_servidor = (examen.configuracion or {}).get("mappings_shuffle")
    resultado_calculado = calcular_resultado(examen, data.respuestas or {}, mappings_servidor)
    estado_final = data.estado or 'COMPLETADO'
    calificacion = resultado_calculado["calificacion"]
    puntos_obtenidos = resultado_calculado["puntos_obtenidos"]
    correctas = resultado_calculado["correctas"]
    
    # ✅ CORREGIDO: Usar límite de violaciones de la config del examen, no hardcodear 3
    limite_violaciones = config.get('limite_violaciones', 3)
    if data.violaciones and data.violaciones >= limite_violaciones:
        estado_final = 'TRAMPA'
        calificacion = 0
        puntos_obtenidos = 0
        correctas = 0
    # ✅ SEGURIDAD: pasada la ventana de gracia el intento vale 0 (el tiempo lo
    # decide el servidor; antes una entrega tardía se aceptaba con puntaje
    # completo). El registro se conserva con el flag entregado_por_tiempo.
    if entregado_tarde:
        calificacion = 0
        puntos_obtenidos = 0
        correctas = 0
    resultado = ResultadoExamen(
        id=str(uuid.uuid4()),
        examen_id=data.examen_id,
        alumno_id=alumno_id_final,
        # FASE F: el alumno unificado es el usuario autenticado (alumno.id == usuario.id)
        alumno_id_unificado=str(current_user.id),
        alumno_nombre=data.alumno_nombre,
        alumno_grado=data.alumno_grado,
        alumno_dni=data.alumno_dni,
        respuestas=data.respuestas,
        calificacion=calificacion,
        correctas=correctas,
        total_preguntas=resultado_calculado["total_preguntas"],
        puntos_obtenidos=puntos_obtenidos,
        total_puntos=resultado_calculado["total_puntos"],
        # Tiempo del servidor cuando hay intento; del cliente en uso manual (docente).
        tiempo_usado=tiempo_usado_servidor if tiempo_usado_servidor is not None else (data.tiempo_usado or 0),
        tiempo_restante=data.tiempo_restante or 0,
        violaciones=data.violaciones or 0,
        eventos_seguridad=data.eventos_seguridad or [],
        entregado_por_tiempo=entregado_tarde if entregado_tarde is not None else (data.entregado_por_tiempo or False),
        estado=estado_final,
        detalle_respuestas=resultado_calculado["detalle_preguntas"]
    )
    db.add(resultado)

    if intento:
        intento.estado = 'TRAMPA' if estado_final == 'TRAMPA' else 'COMPLETADO'
        intento.entregado_en = datetime.now(timezone.utc)
        intento.violaciones = data.violaciones or 0

    db.commit()
    db.refresh(resultado)
    
    # ✅ Enriquecer la respuesta con campos calculados para el frontend.
    puntaje_aprobacion = examen.puntaje_aprobacion or 60.0
    intentos_permitidos = examen.intentos_permitidos or 0
    intentos_usados = db.query(ResultadoExamen).filter(
        ResultadoExamen.examen_id == data.examen_id,
        ResultadoExamen.alumno_id == alumno_id_final
    ).count()
    resultado.aprobado = (calificacion or 0) >= puntaje_aprobacion
    resultado.puntaje_aprobacion = puntaje_aprobacion
    resultado.intentos_permitidos = intentos_permitidos
    resultado.intentos_usados = intentos_usados
    
    # ACTUALIZAR PROGRESO DEL CURSO: Si el examen esta asociado a una leccion de curso,
    # marcar la leccion como completada y actualizar progreso
    try:
        _actualizar_progreso_por_examen(db, data.examen_id, alumno_id_final, calificacion)
    except Exception as e:
        # No fallar el guardado del resultado por error en progreso
        import logging
        logging.getLogger(__name__).warning(f"Error actualizando progreso por examen: {e}")
    
    return resultado


@router.get("/resultados/{examen_id}", response_model=List[ResultadoResponse])
def listar_resultados(
    examen_id: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_docente)  # ✅ Cambiado
):
    # ✅ SEGURIDAD: cada docente solo ve los resultados de sus exámenes.
    examen = db.query(Examen).filter(Examen.id == examen_id).first()
    if examen:
        _verificar_ownership_examen(examen, current_user)
    resultados = db.query(ResultadoExamen).filter(
        ResultadoExamen.examen_id == examen_id
    ).order_by(ResultadoExamen.entregado_en.desc()).all()
    # ✅ Enriquecer con campos calculados
    if examen:
        _enriquecer_resultados(resultados, examen, db)
    return resultados


@router.get("/resultados/alumno/{alumno_id}", response_model=List[ResultadoResponse])
def listar_resultados_alumno(
    alumno_id: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    # ✅ SEGURIDAD: Un estudiante solo puede ver sus propios resultados.
    # ✅ MEDIA 4: un docente solo ve resultados de SUS exámenes (antes
    # cualquier docente leía respuestas/DNI completos de alumnos ajenos).
    if current_user.rol not in ('admin', 'docente') and str(current_user.id) != str(alumno_id):
        logger.warning(
            f"Acceso denegado: usuario {current_user.id} intentó ver resultados de alumno_id={alumno_id}"
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permiso para ver los resultados de otro estudiante"
        )
    query = db.query(ResultadoExamen).filter(
        ResultadoExamen.alumno_id == alumno_id
    )
    if current_user.rol == 'docente':
        examenes_propios = db.query(Examen.id).filter(
            or_(Examen.docente_id == str(current_user.id), Examen.docente_id.is_(None))
        )
        query = query.filter(ResultadoExamen.examen_id.in_(examenes_propios))
    resultados = query.order_by(ResultadoExamen.entregado_en.desc()).all()
    # ✅ Enriquecer con campos calculados (agrupar por examen)
    examenes_ids = set(str(r.examen_id) for r in resultados)
    for eid in examenes_ids:
        examen = db.query(Examen).filter(Examen.id == eid).first()
        if examen:
            sub = [r for r in resultados if str(r.examen_id) == eid]
            _enriquecer_resultados(sub, examen, db)
    return resultados


@router.get("/resultados/{examen_id}/mejor/{alumno_id}")
def obtener_mejor_resultado(
    examen_id: str,
    alumno_id: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    # ✅ SEGURIDAD: Un estudiante solo puede consultar su propio mejor resultado
    if current_user.rol not in ('admin', 'docente') and str(current_user.id) != str(alumno_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permiso para consultar resultados de otro estudiante"
        )
    # ✅ SEGURIDAD: los docentes solo consultan resultados de sus exámenes.
    examen = db.query(Examen).filter(Examen.id == examen_id).first()
    if current_user.rol in ('admin', 'docente') and examen:
        _verificar_ownership_examen(examen, current_user)
    resultados = db.query(ResultadoExamen).filter(
        ResultadoExamen.examen_id == examen_id,
        ResultadoExamen.alumno_id == alumno_id
    ).all()
    if not resultados:
        raise HTTPException(status_code=404, detail="No se encontraron resultados")
    validos = [r for r in resultados if r.estado != 'TRAMPA']
    if not validos:
        r = resultados[0]
        if examen:
            _enriquecer_resultados([r], examen, db)
        return r
    mejor = max(validos, key=lambda r: r.calificacion or 0)
    if examen:
        _enriquecer_resultados([mejor], examen, db)
    return mejor


@router.delete("/resultados/{examen_id}", response_model=MensajeResponse)
def limpiar_resultados(
    examen_id: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_docente)  # ✅ Cambiado
):
    # ✅ SEGURIDAD: evitar que un docente borre resultados de otro.
    examen = db.query(Examen).filter(Examen.id == examen_id).first()
    if examen:
        _verificar_ownership_examen(examen, current_user)
    db.query(ResultadoExamen).filter(ResultadoExamen.examen_id == examen_id).delete()
    db.commit()
    return {"mensaje": "Resultados eliminados", "ok": True}


@router.delete("/resultados/{examen_id}/{alumno_id}", response_model=MensajeResponse)
def eliminar_resultado_alumno(
    examen_id: str,
    alumno_id: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_docente)  # ✅ Cambiado
):
    # ✅ SEGURIDAD: evitar que un docente borre resultados de otro.
    examen = db.query(Examen).filter(Examen.id == examen_id).first()
    if examen:
        _verificar_ownership_examen(examen, current_user)
    eliminados = db.query(ResultadoExamen).filter(
        ResultadoExamen.examen_id == examen_id,
        ResultadoExamen.alumno_id == alumno_id
    ).delete()
    db.commit()
    if eliminados > 0:
        return {"mensaje": f"Intento reiniciado ({eliminados} resultados eliminados)", "ok": True}
    raise HTTPException(status_code=404, detail="No se encontró resultado")


@router.get("/resultados/{examen_id}/revision/{resultado_id}")
def obtener_revision(
    examen_id: str,
    resultado_id: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    resultado = db.query(ResultadoExamen).filter(
        ResultadoExamen.id == resultado_id,
        ResultadoExamen.examen_id == examen_id
    ).first()
    if not resultado:
        raise HTTPException(status_code=404, detail="Resultado no encontrado")
    
    # ✅ SEGURIDAD: los docentes solo revisan resultados de sus exámenes.
    if current_user.rol in ('admin', 'docente'):
        examen_rev = db.query(Examen).filter(Examen.id == examen_id).first()
        if examen_rev:
            _verificar_ownership_examen(examen_rev, current_user)

    # ✅ SEGURIDAD: Un estudiante solo puede revisar su propio resultado.
    # Docentes/admins pueden revisar cualquiera.
    if current_user.rol not in ('admin', 'docente'):
        es_propio = (
            str(resultado.alumno_id) == str(current_user.id)
            or str(resultado.alumno_id_unificado) == str(current_user.id)
        )
        if not es_propio:
            logger.warning(
                f"Acceso denegado: usuario {current_user.id} intentó revisar "
                f"resultado {resultado_id} de otro alumno"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permiso para revisar este resultado"
            )
    
    # ✅ SEGURIDAD: respetar configuracion.mostrar_resultados para estudiantes.
    examen_rev = db.query(Examen).filter(Examen.id == examen_id).first()
    config_rev = dict(examen_rev.configuracion or {}) if examen_rev else {}
    mostrar_resultados = config_rev.get('mostrar_resultados', True)
    mostrar_respuestas = config_rev.get('mostrar_respuestas', False)
    # Los docentes/admins siempre ven todo; los estudiantes respetan la config.
    es_staff = current_user.rol in ('admin', 'docente')
    
    preguntas = db.query(Pregunta).filter(Pregunta.examen_id == examen_id).order_by(Pregunta.orden).all()
    detalle = []
    respuestas_alumno = resultado.respuestas or {}
    for i, pregunta in enumerate(preguntas):
        respuesta = respuestas_alumno.get(str(i))
        item = {
            "numero": i + 1,
            "tipo": pregunta.tipo,
            "enunciado": pregunta.enunciado,
            "puntos": pregunta.puntos or 0,
            "respuesta_alumno": respuesta,
            "correcta": False,
            "puntos_obtenidos": 0,
            "detalle": {}
        }
        if pregunta.tipo == 'opcion_multiple':
            opciones = {}
            if pregunta.opcion_a: opciones["A"] = pregunta.opcion_a
            if pregunta.opcion_b: opciones["B"] = pregunta.opcion_b
            if pregunta.opcion_c: opciones["C"] = pregunta.opcion_c
            if pregunta.opcion_d: opciones["D"] = pregunta.opcion_d
            if pregunta.opcion_e: opciones["E"] = pregunta.opcion_e
            item["opciones"] = opciones
            item["respuesta_correcta"] = pregunta.respuesta_correcta
            # CORRECCIÓN: comparar como enteros (int vs string de BD)
            try:
                item["correcta"] = (respuesta is not None and int(respuesta) == int(pregunta.respuesta_correcta))
            except (ValueError, TypeError):
                item["correcta"] = False
            item["puntos_obtenidos"] = pregunta.puntos if item["correcta"] else 0
        elif pregunta.tipo == 'verdadero_falso':
            afirmaciones = []
            for j, af in enumerate(pregunta.afirmaciones or []):
                resp_af = respuesta[j] if isinstance(respuesta, list) and j < len(respuesta) else None
                afirmaciones.append({
                    "texto": af.get("texto", ""),
                    "respuesta_alumno": resp_af,
                    "respuesta_correcta": af.get("esVerdadero", False),
                    "correcta": resp_af == af.get("esVerdadero", False)
                })
            item["afirmaciones"] = afirmaciones
            correctas = sum(1 for a in afirmaciones if a["correcta"])
            item["correcta"] = correctas == len(afirmaciones) if afirmaciones else False
            item["puntos_obtenidos"] = round((correctas / len(afirmaciones)) * pregunta.puntos, 2) if afirmaciones else 0
        elif pregunta.tipo == 'relacionar':
            pares = []
            col_a = [a for a in (pregunta.columna_a or []) if a and a.strip()]
            col_b = [b for b in (pregunta.columna_b or []) if b and b.strip()]
            for j in range(len(col_a)):
                resp_par = respuesta.get(str(j)) if isinstance(respuesta, dict) else None
                pares.append({
                    "elemento_a": col_a[j] if j < len(col_a) else "",
                    "respuesta_alumno": col_b[resp_par] if resp_par is not None and resp_par < len(col_b) else "Sin responder",
                    "respuesta_correcta": col_b[j] if j < len(col_b) else "",
                    "correcta": resp_par == j
                })
            item["pares"] = pares
            correctas = sum(1 for p in pares if p["correcta"])
            item["correcta"] = correctas == len(pares) if pares else False
            item["puntos_obtenidos"] = round((correctas / len(pares)) * pregunta.puntos, 2) if pares else 0
        elif pregunta.tipo == 'completar':
            espacios = []
            espacio_idx = 0
            for frase in (pregunta.frases or []):
                for seg in (frase.get("segmentos") or []):
                    if seg.get("tipo") == "espacio":
                        resp_esp = respuesta[espacio_idx] if isinstance(respuesta, list) and espacio_idx < len(respuesta) else ""
                        espacios.append({
                            "respuesta_alumno": resp_esp,
                            "respuesta_correcta": seg.get("respuesta", ""),
                            "correcta": str(resp_esp or "").lower().strip() == str(seg.get("respuesta", "")).lower().strip()
                        })
                        espacio_idx += 1
            item["espacios"] = espacios
            correctas = sum(1 for e in espacios if e["correcta"])
            item["correcta"] = correctas == len(espacios) if espacios else False
            item["puntos_obtenidos"] = round((correctas / len(espacios)) * pregunta.puntos, 2) if espacios else 0
        elif pregunta.tipo == 'ordenamiento':
            elementos = [e for e in (pregunta.elementos or []) if e and e.strip()]
            posiciones = []
            for j in range(len(elementos)):
                resp_pos = respuesta[j] if isinstance(respuesta, list) and j < len(respuesta) else None
                posiciones.append({
                    "elemento": elementos[j] if j < len(elementos) else "",
                    "posicion_alumno": resp_pos,
                    "posicion_correcta": j + 1,
                    "correcta": resp_pos == j + 1
                })
            item["posiciones"] = posiciones
            correctas = sum(1 for p in posiciones if p["correcta"])
            item["correcta"] = correctas == len(posiciones) if posiciones else False
            item["puntos_obtenidos"] = round((correctas / len(posiciones)) * pregunta.puntos, 2) if posiciones else 0
        elif pregunta.tipo == 'respuesta_corta':
            aceptadas = [pregunta.respuesta_corta or ""]
            if pregunta.respuestas_alternativas:
                aceptadas.extend(pregunta.respuestas_alternativas)
            item["respuesta_correcta"] = pregunta.respuesta_corta
            item["respuestas_aceptadas"] = [r for r in aceptadas if r]
            item["correcta"] = str(respuesta or "").lower().strip() in [r.lower().strip() for r in aceptadas if r]
            item["puntos_obtenidos"] = pregunta.puntos if item["correcta"] else 0
        elif pregunta.tipo == 'ensayo':
            item["longitud_minima"] = pregunta.longitud_minima
            item["correcta"] = None
            item["puntos_obtenidos"] = 0
            item["detalle"]["nota"] = "Las preguntas de ensayo no se califican automáticamente"
        elif pregunta.tipo in ('likert', 'estrellas', 'escala_numerica'):
            item["correcta"] = None
            item["puntos_obtenidos"] = 0
            item["detalle"]["nota"] = "Pregunta de encuesta (no calificada)"
        detalle.append(item)
    
    # ✅ SEGURIDAD (MEDIA 5): ocultar las RESPUESTAS CORRECTAS a los
    # estudiantes salvo que mostrar_respuestas=True. Antes `mostrar_respuestas`
    # se leía pero nunca se aplicaba: las claves siempre se filtraban.
    # - mostrar_resultados=False → no revela nada (ni siquiera qué fue correcto).
    # - mostrar_resultados=True, mostrar_respuestas=False → sí muestra qué
    #   respondió bien/mal, pero no cuál era la respuesta correcta.
    if not es_staff:
        ocultar_claves = not mostrar_respuestas or not mostrar_resultados
        ocultar_todo = not mostrar_resultados
        for item in detalle:
            if ocultar_claves:
                item.pop("respuesta_correcta", None)
                item.pop("respuestas_aceptadas", None)
                if "afirmaciones" in item:
                    for af in item["afirmaciones"]:
                        af.pop("respuesta_correcta", None)
                if "pares" in item:
                    for p in item["pares"]:
                        p.pop("respuesta_correcta", None)
                if "espacios" in item:
                    for e in item["espacios"]:
                        e.pop("respuesta_correcta", None)
                if "posiciones" in item:
                    for p in item["posiciones"]:
                        p.pop("posicion_correcta", None)
            if ocultar_todo:
                if "afirmaciones" in item:
                    for af in item["afirmaciones"]:
                        af.pop("correcta", None)
                if "pares" in item:
                    for p in item["pares"]:
                        p.pop("correcta", None)
                if "espacios" in item:
                    for e in item["espacios"]:
                        e.pop("correcta", None)
                if "posiciones" in item:
                    for p in item["posiciones"]:
                        p.pop("correcta", None)
                item["correcta"] = None
                item["puntos_obtenidos"] = 0
    
    return {
        "resultado_id": resultado.id,
        "alumno_nombre": resultado.alumno_nombre,
        "alumno_grado": resultado.alumno_grado,
        "alumno_dni": resultado.alumno_dni,
        "calificacion": resultado.calificacion,
        "correctas": resultado.correctas,
        "total_preguntas": resultado.total_preguntas,
        "puntos_obtenidos": resultado.puntos_obtenidos,
        "total_puntos": resultado.total_puntos,
        "tiempo_usado": resultado.tiempo_usado,
        "violaciones": resultado.violaciones,
        "estado": resultado.estado,
        "entregado_en": resultado.entregado_en,
        "detalle": detalle
    }


# =============================================
# ENDPOINTS OPTIMIZADOS
# =============================================

@router.get("/bulk", response_model=dict)
def listar_examenes_bulk(
    grupo_ids: List[str] = Query(...),
    estado: Optional[str] = Query(None),
    busqueda: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    if not grupo_ids:
        return {}
    query = db.query(Examen).options(selectinload(Examen.preguntas)).filter(Examen.grupo_id.in_(grupo_ids))
    query = _filtrar_examenes_por_rol(query, current_user, db)
    if estado:
        query = query.filter(Examen.estado == estado)
    if busqueda:
        query = query.filter(
            (Examen.titulo.ilike(f"%{busqueda}%")) |
            (Examen.codigo.ilike(f"%{busqueda}%"))
        )
    examenes = query.order_by(Examen.created_at.desc()).all()
    resultado = {}
    for examen in examenes:
        grupo_id = examen.grupo_id or "sin_grupo"
        if grupo_id not in resultado:
            resultado[grupo_id] = []
        examen_dict = {
            "id": examen.id,
            "codigo": examen.codigo,
            "titulo": examen.titulo,
            "descripcion": examen.descripcion or "",
            "tiempo_limite": examen.tiempo_limite,
            "puntaje_aprobacion": examen.puntaje_aprobacion,
            "estado": examen.estado,
            "configuracion": {k: v for k, v in (examen.configuracion or {}).items() if k != "password_examen"},
            "intentos_permitidos": examen.intentos_permitidos,
            "grupo_id": examen.grupo_id,
            "created_at": examen.created_at.isoformat() if examen.created_at else None,
            "updated_at": examen.updated_at.isoformat() if examen.updated_at else None,
            "total_preguntas": len(examen.preguntas) if examen.preguntas else 0,
            "preguntas": []
        }
        resultado[grupo_id].append(examen_dict)
    return resultado


@router.get("/grupo/{grupo_id}", response_model=List[ExamenResponse])
def listar_examenes_por_grupo(
    grupo_id: str,
    limit: Optional[int] = Query(50, ge=1, le=100),
    offset: Optional[int] = Query(0, ge=0),
    estado: Optional[str] = Query(None),
    busqueda: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    query = db.query(Examen).options(selectinload(Examen.preguntas)).filter(Examen.grupo_id == grupo_id)
    query = _filtrar_examenes_por_rol(query, current_user, db)
    if estado:
        query = query.filter(Examen.estado == estado)
    if busqueda:
        query = query.filter(
            (Examen.titulo.ilike(f"%{busqueda}%")) |
            (Examen.codigo.ilike(f"%{busqueda}%"))
        )
    return query.order_by(Examen.created_at.desc()).offset(offset).limit(limit).all()


@router.get("/resumen", response_model=dict)
def obtener_resumen_examenes(
    grupo_ids: Optional[List[str]] = Query(None),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    query = db.query(Examen)
    query = _filtrar_examenes_por_rol(query, current_user, db)
    if grupo_ids:
        query = query.filter(Examen.grupo_id.in_(grupo_ids))
    total = query.count()
    publicados = query.filter(Examen.estado == 'PUBLICADO').count()
    borradores = query.filter(Examen.estado == 'BORRADOR').count()
    cerrados = query.filter(Examen.estado == 'CERRADO').count()
    por_grupo = {}
    if grupo_ids:
        # N+1 fix: un solo COUNT agrupado en lugar de una consulta por grupo
        conteos_query = db.query(Examen.grupo_id, func.count(Examen.id)).filter(
            Examen.grupo_id.in_(grupo_ids)
        )
        conteos_query = _filtrar_examenes_por_rol(conteos_query, current_user, db)
        conteos = conteos_query.group_by(Examen.grupo_id).all()
        conteos_map = {gid: cnt for gid, cnt in conteos}
        por_grupo = {gid: conteos_map.get(gid, 0) for gid in grupo_ids}
    return {
        "total": total,
        "publicados": publicados,
        "borradores": borradores,
        "cerrados": cerrados,
        "por_grupo": por_grupo
    }


# =============================================
# EXAMENES - MÉTODOS PRINCIPALES
# =============================================

@router.get("/", response_model=List[ExamenResponse])
def listar_examenes(
    estado: Optional[str] = Query(None),
    busqueda: Optional[str] = Query(None),
    grupo_id: Optional[str] = Query(None),
    limit: Optional[int] = Query(None, ge=1, le=100),
    offset: Optional[int] = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    query = db.query(Examen).options(selectinload(Examen.preguntas))
    query = _filtrar_examenes_por_rol(query, current_user, db)
    if estado:
        query = query.filter(Examen.estado == estado)
    if busqueda:
        query = query.filter(
            (Examen.titulo.ilike(f"%{busqueda}%")) |
            (Examen.codigo.ilike(f"%{busqueda}%"))
        )
    if grupo_id:
        query = query.filter(Examen.grupo_id == grupo_id)
    query = query.order_by(Examen.created_at.desc())
    if limit:
        query = query.offset(offset).limit(limit)
    return query.all()


@router.get("/publicados", response_model=List[ExamenResponse])
def listar_examenes_publicados(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    query = db.query(Examen).options(selectinload(Examen.preguntas)).filter(Examen.estado == 'PUBLICADO')
    query = _filtrar_examenes_por_rol(query, current_user, db)
    return query.order_by(Examen.created_at.desc()).all()


@router.post("/", response_model=ExamenDetailResponse, status_code=201)
def crear_examen(
    data: ExamenCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_docente)  # ✅ Cambiado
):
    examen_id = str(uuid.uuid4())
    codigo = generar_codigo()
    examen = Examen(
        id=examen_id,
        codigo=codigo,
        titulo=data.titulo,
        descripcion=data.descripcion,
        tiempo_limite=data.tiempo_limite,
        puntaje_aprobacion=data.puntaje_aprobacion,
        configuracion=data.configuracion.model_dump() if data.configuracion else {},
        intentos_permitidos=data.intentos_permitidos,
        estado='BORRADOR',
        grupo_id=data.grupo_id,
        # ✅ SEGURIDAD: asignar dueño del examen
        docente_id=str(current_user.id)
    )
    db.add(examen)
    for i, pregunta_data in enumerate(data.preguntas):
        pregunta = Pregunta(
            id=str(uuid.uuid4()),
            examen_id=examen_id,
            tipo=pregunta_data.tipo,
            enunciado=pregunta_data.enunciado,
            puntos=pregunta_data.puntos,
            orden=pregunta_data.orden or i,
            opcion_a=pregunta_data.opcion_a,
            opcion_b=pregunta_data.opcion_b,
            opcion_c=pregunta_data.opcion_c,
            opcion_d=pregunta_data.opcion_d,
            opcion_e=pregunta_data.opcion_e,
            respuesta_correcta=pregunta_data.respuesta_correcta,
            afirmaciones=[a.model_dump() for a in pregunta_data.afirmaciones] if pregunta_data.afirmaciones else None,
            columna_a=pregunta_data.columna_a,
            columna_b=pregunta_data.columna_b,
            elementos=pregunta_data.elementos,
            segmentos=[s.model_dump() for s in pregunta_data.segmentos] if pregunta_data.segmentos else None,
            frases=[f.model_dump() for f in pregunta_data.frases] if pregunta_data.frases else None,
            respuesta_corta=pregunta_data.respuesta_corta,
            respuestas_alternativas=pregunta_data.respuestas_alternativas,
            longitud_minima=pregunta_data.longitud_minima,
            rubrica=pregunta_data.rubrica,
        )
        db.add(pregunta)
    db.commit()
    db.refresh(examen)
    return examen


@router.put("/{examen_id}", response_model=ExamenDetailResponse)
def actualizar_examen(
    examen_id: str,
    data: ExamenCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_docente)  # ✅ Cambiado
):
    examen = db.query(Examen).filter(Examen.id == examen_id).first()
    if not examen:
        raise HTTPException(status_code=404, detail="Examen no encontrado")
    # ✅ SEGURIDAD: verificar ownership
    _verificar_ownership_examen(examen, current_user)
    # Asignar dueño si es legacy sin dueño
    if not examen.docente_id and current_user.rol != 'admin':
        examen.docente_id = str(current_user.id)
    examen.titulo = data.titulo
    examen.descripcion = data.descripcion
    examen.tiempo_limite = data.tiempo_limite
    examen.puntaje_aprobacion = data.puntaje_aprobacion
    if data.configuracion:
        examen.configuracion = data.configuracion.model_dump()
    if data.intentos_permitidos is not None:
        examen.intentos_permitidos = data.intentos_permitidos
    if data.grupo_id is not None:
        examen.grupo_id = data.grupo_id
    examen.updated_at = datetime.now(timezone.utc)
    db.query(Pregunta).filter(Pregunta.examen_id == examen_id).delete()
    for i, pregunta_data in enumerate(data.preguntas):
        pregunta = Pregunta(
            id=str(uuid.uuid4()),
            examen_id=examen_id,
            tipo=pregunta_data.tipo,
            enunciado=pregunta_data.enunciado,
            puntos=pregunta_data.puntos,
            orden=pregunta_data.orden or i,
            opcion_a=pregunta_data.opcion_a,
            opcion_b=pregunta_data.opcion_b,
            opcion_c=pregunta_data.opcion_c,
            opcion_d=pregunta_data.opcion_d,
            opcion_e=pregunta_data.opcion_e,
            respuesta_correcta=pregunta_data.respuesta_correcta,
            afirmaciones=[a.model_dump() for a in pregunta_data.afirmaciones] if pregunta_data.afirmaciones else None,
            columna_a=pregunta_data.columna_a,
            columna_b=pregunta_data.columna_b,
            elementos=pregunta_data.elementos,
            segmentos=[s.model_dump() for s in pregunta_data.segmentos] if pregunta_data.segmentos else None,
            frases=[f.model_dump() for f in pregunta_data.frases] if pregunta_data.frases else None,
            respuesta_corta=pregunta_data.respuesta_corta,
            respuestas_alternativas=pregunta_data.respuestas_alternativas,
            longitud_minima=pregunta_data.longitud_minima,
            rubrica=pregunta_data.rubrica,
        )
        db.add(pregunta)
    db.commit()
    db.refresh(examen)
    return examen


@router.delete("/{examen_id}", response_model=MensajeResponse)
def eliminar_examen(
    examen_id: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_docente)  # ✅ Cambiado
):
    examen = db.query(Examen).filter(Examen.id == examen_id).first()
    if not examen:
        raise HTTPException(status_code=404, detail="Examen no encontrado")
    # ✅ SEGURIDAD: verificar ownership
    _verificar_ownership_examen(examen, current_user)
    db.delete(examen)
    db.commit()
    return {"mensaje": "Examen eliminado", "ok": True}


@router.put("/{examen_id}/estado", response_model=MensajeResponse)
def cambiar_estado_examen(
    examen_id: str,
    estado: str = Query(..., pattern="^(BORRADOR|PUBLICADO|CERRADO)$"),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_docente)  # ✅ Cambiado
):
    examen = db.query(Examen).filter(Examen.id == examen_id).first()
    if not examen:
        raise HTTPException(status_code=404, detail="Examen no encontrado")
    # ✅ SEGURIDAD: verificar ownership
    _verificar_ownership_examen(examen, current_user)
    examen.estado = estado
    examen.updated_at = datetime.now(timezone.utc)
    db.commit()
    mensajes = {
        'PUBLICADO': 'Examen publicado',
        'CERRADO': 'Examen cerrado',
        'BORRADOR': 'Examen vuelto a borrador'
    }
    return {"mensaje": mensajes.get(estado, 'Estado actualizado'), "ok": True}


# =============================================
# ACCESO PUBLICO A EXAMENES (sin autenticacion)
# =============================================

@router.get("/publico/{codigo}", response_model=None)
def obtener_examen_publico(
    codigo: str,
    db: Session = Depends(get_db)
):
    """Obtener un examen publico por su codigo (sin login).

    ✅ SEGURIDAD: la respuesta va sanitizada (sin clave de respuestas). Si el
    examen tiene password, tampoco se envían las preguntas hasta validarlo.
    """
    examen = db.query(Examen).filter(
        Examen.codigo == codigo,
        Examen.estado == 'PUBLICADO'
    ).first()
    if not examen:
        raise HTTPException(status_code=404, detail="Examen no encontrado")
    config = examen.configuracion or {}
    if not config.get('acceso_publico', False):
        raise HTTPException(status_code=403, detail="Este examen no tiene acceso publico habilitado")

    data = _serializar_examen(examen, incluir_respuestas=False, db=db)
    if config.get('password_examen'):
        data["preguntas"] = []
        data["requiere_password"] = True
    return data


@router.post("/publico/{codigo}/verificar-password")
def verificar_password_examen_publico(
    codigo: str,
    data: VerificarPasswordRequest,
    db: Session = Depends(get_db),
    _rate_limited = Depends(rate_limit(20, 60)),
):
    """Verificar password de examen publico (sin login)."""
    examen = db.query(Examen).filter(
        Examen.codigo == codigo,
        Examen.estado == 'PUBLICADO'
    ).first()
    if not examen:
        raise HTTPException(status_code=404, detail="Examen no encontrado")
    config = examen.configuracion or {}
    password_correcto = config.get('password_examen')
    if password_correcto and data.password != password_correcto:
        raise HTTPException(status_code=401, detail="Password incorrecto")
    # ✅ El examen (sanitizado) se entrega recién tras validar el password.
    return {
        "ok": True,
        "mensaje": "Password verificado",
        "examen": _serializar_examen(examen, incluir_respuestas=False, db=db),
    }


@router.post("/publico/{codigo}/intentos", response_model=IntentoExamenResponse)
def iniciar_intento_publico(
    codigo: str,
    data: VerificarPasswordRequest,
    db: Session = Depends(get_db),
    _rate_limited = Depends(rate_limit(20, 60)),
):
    """Inicia (o reanuda) un intento público con expiración en el servidor."""
    examen = db.query(Examen).filter(
        Examen.codigo == codigo,
        Examen.estado == 'PUBLICADO'
    ).first()
    if not examen:
        raise HTTPException(status_code=404, detail="Examen no encontrado")
    config = examen.configuracion or {}
    if not config.get('acceso_publico', False):
        raise HTTPException(status_code=403, detail="Este examen no tiene acceso publico habilitado")
    password_correcto = config.get('password_examen')
    if password_correcto and data.password != password_correcto:
        raise HTTPException(status_code=401, detail="Password incorrecto")

    intento = _crear_o_reanudar_intento(
        db, examen, usuario_id=None, es_publico=True, codigo_publico=codigo,
    )
    return _intento_a_dict(intento, examen, 0)


@router.post("/publico/{codigo}/resultado", status_code=201)
def guardar_resultado_publico(
    codigo: str,
    data: ResultadoPublicoRequest,
    db: Session = Depends(get_db),
    _rate_limited = Depends(rate_limit(20, 60)),
):
    """Guardar resultado de examen publico/anonimo (sin login)."""
    examen = db.query(Examen).filter(
        Examen.codigo == codigo,
        Examen.estado == 'PUBLICADO'
    ).first()
    if not examen:
        raise HTTPException(status_code=404, detail="Examen no encontrado")

    config = examen.configuracion or {}
    if not config.get('acceso_publico', False):
        raise HTTPException(status_code=403, detail="Este examen no tiene acceso publico habilitado")

    # Verificar password si es requerido
    password_correcto = config.get('password_examen')
    if password_correcto and data.password != password_correcto:
        raise HTTPException(status_code=401, detail="Password incorrecto")

    # Verificar ventana de fechas
    if config.get('fecha_inicio'):
        try:
            fecha_inicio = datetime.fromisoformat(config['fecha_inicio'].replace('Z', '+00:00'))
            if datetime.now(timezone.utc) < fecha_inicio:
                raise HTTPException(status_code=400, detail="El examen aun no esta disponible")
        except (ValueError, TypeError):
            pass

    if config.get('fecha_fin'):
        try:
            fecha_fin = datetime.fromisoformat(config['fecha_fin'].replace('Z', '+00:00'))
            if datetime.now(timezone.utc) > fecha_fin:
                raise HTTPException(status_code=400, detail="El examen ya no esta disponible")
        except (ValueError, TypeError):
            pass

    # ✅ AUTORIDAD DE TIEMPO: el tiempo lo calcula el servidor desde el intento.
    if not data.intento_id:
        raise HTTPException(status_code=400, detail="Debes iniciar el intento antes de entregar")
    tiempo_usado_servidor, entregado_tarde, intento = _resolver_tiempo_desde_intento(
        db, examen, data.intento_id, es_publico=True, codigo_publico=codigo
    )

    respuestas_alumno = data.respuestas
    # ✅ SEGURIDAD: mapping de barajado solo del servidor (ver arriba).
    examen = _asegurar_mappings_examen(examen, db)
    mappings_servidor = (examen.configuracion or {}).get("mappings_shuffle")
    resultado_calculado = calcular_resultado(examen, respuestas_alumno, mappings_servidor)

    es_anonimo = config.get('anonimo', False)
    alumno_nombre = "Anonimo" if es_anonimo else data.alumno_nombre

    # ✅ SEGURIDAD (ALTA 3): el flujo público NO acepta ids de usuarios reales.
    # Antes se guardaba data.alumno_id tal cual: con el id de una víctima se
    # agotaban sus intentos en el conteo autenticado y se le inflaba la nota
    # de curso (_nota_confiable_desde_examen matchea por alumno_id).
    alumno_id_final = None if es_anonimo else 'publico'

    # ✅ SEGURIDAD (ALTA 3): los exámenes públicos con límite de intentos lo
    # respetan (antes no había NINGÚN conteo), contados por nombre de
    # participante (la identidad del flujo público). En modo anónimo no hay
    # identidad con qué contar, así que no se aplica (evita un pozo común
    # donde cualquiera agota a todos).
    if (
        not es_anonimo
        and examen.intentos_permitidos
        and examen.intentos_permitidos > 0
    ):
        intentos_previos = db.query(ResultadoExamen).filter(
            ResultadoExamen.examen_id == str(examen.id),
            ResultadoExamen.alumno_nombre == alumno_nombre,
        ).count()
        if intentos_previos >= examen.intentos_permitidos:
            raise HTTPException(status_code=400, detail="Límite de intentos alcanzado")

    estado_final = 'TRAMPA' if (data.violaciones or 0) >= config.get('limite_violaciones', 3) else 'COMPLETADO'
    if estado_final == 'TRAMPA':
        resultado_calculado['calificacion'] = 0
        resultado_calculado['puntos_obtenidos'] = 0
        resultado_calculado['correctas'] = 0
    # ✅ SEGURIDAD: pasada la ventana de gracia el intento público vale 0.
    if entregado_tarde:
        resultado_calculado['calificacion'] = 0
        resultado_calculado['puntos_obtenidos'] = 0
        resultado_calculado['correctas'] = 0

    resultado = ResultadoExamen(
        id=str(uuid.uuid4()),
        examen_id=examen.id,
        alumno_id=alumno_id_final,
        alumno_id_unificado=None,
        alumno_nombre=alumno_nombre,
        alumno_grado=data.alumno_grado,
        alumno_dni="00000000" if es_anonimo else data.alumno_dni,
        calificacion=resultado_calculado['calificacion'],
        correctas=resultado_calculado['correctas'],
        total_preguntas=resultado_calculado['total_preguntas'],
        puntos_obtenidos=resultado_calculado['puntos_obtenidos'],
        total_puntos=resultado_calculado['total_puntos'],
        tiempo_usado=tiempo_usado_servidor or 0,
        violaciones=data.violaciones or 0,
        estado=estado_final,
        respuestas=respuestas_alumno,
        entregado_por_tiempo=bool(entregado_tarde),
        # ✅ `entregado_en` es DateTime (no string ISO).
        entregado_en=datetime.now(timezone.utc)
    )
    db.add(resultado)

    if intento:
        intento.estado = 'TRAMPA' if estado_final == 'TRAMPA' else 'COMPLETADO'
        intento.entregado_en = datetime.now(timezone.utc)
        intento.violaciones = data.violaciones or 0

    db.commit()

    mostrar_resultados = config.get('mostrar_resultados', True)

    return {
        "ok": True,
        "resultado_id": resultado.id,
        "calificacion": resultado_calculado['calificacion'] if mostrar_resultados else None,
        "correctas": resultado_calculado['correctas'] if mostrar_resultados else None,
        "total_preguntas": resultado_calculado['total_preguntas'],
        "puntos_obtenidos": resultado_calculado['puntos_obtenidos'] if mostrar_resultados else None,
        "total_puntos": resultado_calculado['total_puntos'],
        "estado": resultado.estado,
        "mensaje": "Resultado guardado" if mostrar_resultados else "Resultado registrado correctamente"
    }


# =============================================
# RUTAS DINÁMICAS - SIEMPRE AL FINAL
# =============================================

@router.get("/{examen_id}", response_model=None)
def obtener_examen(
    examen_id: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    examen = db.query(Examen).filter(Examen.id == examen_id).first()
    if not examen:
        raise HTTPException(status_code=404, detail="Examen no encontrado")

    es_docente_o_admin = current_user.rol in ('admin', 'docente')

    # ✅ SEGURIDAD: los estudiantes solo acceden a exámenes publicados y
    # NUNCA reciben la clave de respuestas.
    if not es_docente_o_admin:
        if examen.estado != 'PUBLICADO':
            raise HTTPException(status_code=403, detail="Examen no disponible")
        return _serializar_examen(examen, incluir_respuestas=False, db=db)

    # ✅ SEGURIDAD: los docentes solo GESTIONAN (con clave) sus propios exámenes.
    # Si el examen es ajeno pero está PUBLICADO, se devuelve la misma versión
    # saneada que ve un estudiante (la vista de lección del curso permite al
    # docente ver el curso como alumno). Sin clave de respuestas en ningún caso.
    es_dueno = (
        current_user.rol == 'admin'
        or not examen.docente_id
        or str(examen.docente_id) == str(current_user.id)
    )
    if es_dueno:
        return _serializar_examen(examen, incluir_respuestas=True)
    if examen.estado != 'PUBLICADO':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permiso para gestionar el examen",
        )
    return _serializar_examen(examen, incluir_respuestas=False, db=db)