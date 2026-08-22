# app/api/examenes.py
# VERSION COMPLETA - CON ENDPOINTS PARA EMBED EN CURSOS Y NUEVOS ROLES

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional
import uuid
import secrets
from datetime import datetime, timezone, timedelta

from app.database import get_db
from app.core.dependencies import (
    get_current_active_user,
    require_docente,
    require_admin
)
from app.models.usuario import Usuario
from app.models.examen import Examen, Pregunta
from app.models.resultado_examen import ResultadoExamen
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
    CompartirAlumnosRequest, AlumnoConectadoResponse
)

router = APIRouter()

QR_EXPIRATION_SECONDS = 30


# =============================================
# UTILIDAD
# =============================================

def generar_codigo():
    ahora = datetime.now(timezone.utc)
    r = str(uuid.uuid4().int)[:4]
    return f"EXA-{ahora.year}{str(ahora.month).zfill(2)}{str(ahora.day).zfill(2)}-{r.zfill(4)}"


def calcular_resultado(examen, respuestas_alumno):
    preguntas = examen.preguntas if hasattr(examen, 'preguntas') else []
    
    total_puntos = 0
    puntos_obtenidos = 0
    correctas_reales = 0
    detalle_preguntas = []
    
    for i, pregunta in enumerate(preguntas):
        respuesta = respuestas_alumno.get(str(i))
        pts = pregunta.puntos if pregunta.puntos is not None else 0
        total_puntos += pts
        pregunta_correcta = False
        puntos_pregunta = 0
        
        if pregunta.tipo == 'opcion_multiple':
            if respuesta is not None and respuesta == pregunta.respuesta_correcta:
                puntos_pregunta = pts
                pregunta_correcta = True
                
        elif pregunta.tipo == 'verdadero_falso':
            if isinstance(respuesta, list) and pregunta.afirmaciones and len(pregunta.afirmaciones) > 0:
                correctas = sum(1 for j, af in enumerate(pregunta.afirmaciones) 
                    if j < len(respuesta) and respuesta[j] == af.get('esVerdadero', False))
                proporcion = correctas / len(pregunta.afirmaciones) if len(pregunta.afirmaciones) > 0 else 0
                puntos_pregunta = round(proporcion * pts, 2)
                pregunta_correcta = (correctas == len(pregunta.afirmaciones))
                
        elif pregunta.tipo == 'relacionar':
            if isinstance(respuesta, dict) and pregunta.columna_a:
                col_a = [a for a in pregunta.columna_a if a and a.strip()]
                total_pares = len(col_a)
                if total_pares > 0:
                    correctas = sum(1 for j in range(total_pares) 
                        if str(j) in respuesta and respuesta[str(j)] == j)
                    proporcion = correctas / total_pares
                    puntos_pregunta = round(proporcion * pts, 2)
                    pregunta_correcta = (correctas == total_pares)
                    
        elif pregunta.tipo == 'completar':
            if pregunta.frases and isinstance(respuesta, list):
                espacios = []
                for frase in pregunta.frases:
                    for seg in (frase.get('segmentos') or []):
                        if seg.get('tipo') == 'espacio':
                            espacios.append(seg.get('respuesta', ''))
                if espacios:
                    correctas = sum(1 for j, esp in enumerate(espacios)
                        if j < len(respuesta) and str(respuesta[j] or '').lower().strip() == esp.lower().strip())
                    proporcion = correctas / len(espacios) if len(espacios) > 0 else 0
                    puntos_pregunta = round(proporcion * pts, 2)
                    pregunta_correcta = (correctas == len(espacios))
                    
        elif pregunta.tipo == 'ordenamiento':
            if isinstance(respuesta, list) and pregunta.elementos:
                elementos = [e for e in pregunta.elementos if e and e.strip()]
                total_elem = len(elementos)
                if total_elem > 0:
                    correctas = sum(1 for j in range(total_elem) 
                        if j < len(respuesta) and respuesta[j] == j + 1)
                    proporcion = correctas / total_elem
                    puntos_pregunta = round(proporcion * pts, 2)
                    pregunta_correcta = (correctas == total_elem)
                    
        elif pregunta.tipo == 'respuesta_corta':
            respuestas_aceptadas = [pregunta.respuesta_corta or '']
            if pregunta.respuestas_alternativas:
                respuestas_aceptadas.extend(pregunta.respuestas_alternativas)
            if str(respuesta or '').lower().strip() in [r.lower().strip() for r in respuestas_aceptadas if r]:
                puntos_pregunta = pts
                pregunta_correcta = True
                
        elif pregunta.tipo == 'ensayo':
            puntos_pregunta = 0
            pregunta_correcta = None
        
        puntos_obtenidos += puntos_pregunta
        if pregunta_correcta:
            correctas_reales += 1
            
        detalle_preguntas.append({
            "indice": i,
            "tipo": pregunta.tipo,
            "puntos": pts,
            "puntos_obtenidos": puntos_pregunta,
            "correcta": pregunta_correcta
        })
    
    calificacion = round((puntos_obtenidos / total_puntos * 100), 2) if total_puntos > 0 else 0
    
    return {
        "total_puntos": total_puntos,
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
    current_user: Usuario = Depends(get_current_active_user)
):
    query = db.query(Grupo)
    if docente_id:
        query = query.filter(Grupo.docente_id == docente_id)
    return query.order_by(Grupo.created_at.desc()).all()


@router.post("/grupos", response_model=GrupoResponse, status_code=201)
def crear_grupo(
    data: GrupoCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_docente)  # ✅ Cambiado
):
    grupo = Grupo(
        id=str(uuid.uuid4()),
        nombre=data.nombre,
        docente_id=data.docente_id or str(current_user.id),
        alumnos=[],
        asistencias=[],
        recursos=[],
        compartir_con_todos=True
    )
    db.add(grupo)
    db.commit()
    db.refresh(grupo)
    return grupo


@router.get("/grupos/{grupo_id}", response_model=GrupoResponse)
def obtener_grupo(
    grupo_id: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    grupo = db.query(Grupo).filter(Grupo.id == grupo_id).first()
    if not grupo:
        raise HTTPException(status_code=404, detail="Grupo no encontrado")
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
    db.delete(grupo)
    db.commit()
    return {"mensaje": "Grupo eliminado", "ok": True}


@router.post("/grupos/{grupo_id}/asistencia", response_model=MensajeResponse)
def guardar_asistencia(
    grupo_id: str,
    data: List[dict],
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_docente)  # ✅ Cambiado
):
    grupo = db.query(Grupo).filter(Grupo.id == grupo_id).first()
    if not grupo:
        raise HTTPException(status_code=404, detail="Grupo no encontrado")
    
    fecha_actual = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    asistencias_actuales = grupo.asistencias or []
    asistencias_actuales = [a for a in asistencias_actuales if a.get('fecha') != fecha_actual]
    grupo.asistencias = asistencias_actuales + data
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
    data: dict,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_docente)
):
    grupo = db.query(Grupo).filter(Grupo.id == grupo_id).first()
    if not grupo:
        raise HTTPException(status_code=404, detail="Grupo no encontrado")

    tipo_material, categoria = _tipo_recurso_a_material(data.get("tipo", "link"))
    material = MaterialCompartido(
        id=str(uuid.uuid4()),
        docente_id=str(current_user.id),
        docente_nombre=current_user.nombre_completo or grupo.docente_id,
        titulo=data.get("nombre", "Sin nombre"),
        descripcion=data.get("descripcion", ""),
        tipo=tipo_material,
        contenido=data.get("url") or data.get("contenido", ""),
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
    material = db.query(MaterialCompartido).filter(
        MaterialCompartido.id == recurso_id
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
    data: dict,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_docente)  # ✅ Cambiado
):
    session_id = data.get("session_id")
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
    current_user: Usuario = Depends(get_current_active_user)
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
    current_user: Usuario = Depends(get_current_active_user)
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
    data: dict,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    session_id = data.get("session_id")
    grupo_id = data.get("grupo_id")
    if not session_id or not grupo_id:
        raise HTTPException(status_code=400, detail="session_id y grupo_id requeridos")
    grupo = db.query(Grupo).filter(Grupo.id == grupo_id).first()
    if not grupo:
        raise HTTPException(status_code=404, detail="Grupo no encontrado")
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
    current_user: Usuario = Depends(get_current_active_user)
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
    current_user: Usuario = Depends(get_current_active_user)
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
    current_user: Usuario = Depends(get_current_active_user)
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
    current_user: Usuario = Depends(get_current_active_user)
):
    grupo = db.query(Grupo).filter(Grupo.id == grupo_id).first()
    if not grupo:
        raise HTTPException(status_code=404, detail="Grupo no encontrado")
    alumnos_ids = [a.get('id') for a in grupo.alumnos if a.get('id')]
    if not alumnos_ids:
        return []
    return [_alumno_a_dict(a) for a in _alumnos_por_ids(db, alumnos_ids)]


@router.post("/alumnos", status_code=201)
def guardar_alumnos(
    data: List[dict],
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_docente)  # ✅ Cambiado
):
    if not data:
        raise HTTPException(status_code=400, detail="Lista de alumnos vacía")
    grupo_ids = {a.get('grupo_id') for a in data if a.get('grupo_id')}
    # FASE E: los alumnos viven en `alumnos`; desvinculamos los que ya no
    # están en la lista del grupo (no se borran: el catálogo es único).
    for gid in grupo_ids:
        db.query(Alumno).filter(Alumno.grupo_id == gid).update({"grupo_id": None})
    for alumno in data:
        existe = None
        if alumno.get('id'):
            existe = db.query(Alumno).filter(Alumno.id == alumno['id']).first()
        if not existe and alumno.get('dni'):
            existe = db.query(Alumno).filter(Alumno.dni == alumno['dni']).first()
        if existe:
            # Actualizar datos y vincular al grupo
            existe.nombres = alumno.get('nombres', existe.nombres)
            existe.apellidos = alumno.get('apellidos', existe.apellidos)
            existe.dni = alumno.get('dni') or None
            existe.grado = alumno.get('grado') or None
            existe.email = alumno.get('email') or None
            existe.grupo = alumno.get('grupo') or None
            existe.grupo_id = alumno.get('grupo_id', None)
        else:
            nuevo = Alumno(
                id=str(uuid.uuid4()),
                dni=alumno.get('dni') or None,
                grado=alumno.get('grado') or None,
                nombres=alumno.get('nombres', ''),
                apellidos=alumno.get('apellidos', ''),
                email=alumno.get('email') or None,
                grupo=alumno.get('grupo') or None,
                grupo_id=alumno.get('grupo_id', None)
            )
            db.add(nuevo)
    db.commit()
    return {"mensaje": f"{len(data)} alumnos guardados correctamente", "ok": True}


@router.delete("/alumnos", response_model=MensajeResponse)
def eliminar_todos_alumnos(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_docente)  # ✅ Cambiado
):
    # FASE E: desvinculamos todos los alumnos de sus grupos (catálogo único)
    db.query(Alumno).filter(Alumno.grupo_id.isnot(None)).update({"grupo_id": None})
    db.commit()
    return {"mensaje": "Alumnos desvinculados de grupos", "ok": True}


@router.delete("/alumnos/grupo/{grupo_id}", response_model=MensajeResponse)
def eliminar_alumnos_por_grupo(
    grupo_id: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_docente)  # ✅ Cambiado
):
    db.query(Alumno).filter(Alumno.grupo_id == grupo_id).update({"grupo_id": None})
    db.commit()
    return {"mensaje": f"Alumnos del grupo {grupo_id} desvinculados", "ok": True}


# =============================================
# RESULTADOS
# =============================================

@router.post("/resultados", response_model=ResultadoResponse, status_code=201)
def guardar_resultado(
    data: ResultadoCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    examen = db.query(Examen).filter(Examen.id == data.examen_id).first()
    if not examen:
        raise HTTPException(status_code=404, detail="Examen no encontrado")
    if examen.intentos_permitidos and examen.intentos_permitidos > 0:
        intentos_actuales = db.query(ResultadoExamen).filter(
            ResultadoExamen.examen_id == data.examen_id,
            ResultadoExamen.alumno_id == data.alumno_id
        ).count()
        if intentos_actuales >= examen.intentos_permitidos:
            raise HTTPException(status_code=400, detail="Límite de intentos alcanzado")
    resultado_calculado = calcular_resultado(examen, data.respuestas or {})
    estado_final = data.estado or 'COMPLETADO'
    calificacion = resultado_calculado["calificacion"]
    puntos_obtenidos = resultado_calculado["puntos_obtenidos"]
    correctas = resultado_calculado["correctas"]
    if data.violaciones and data.violaciones >= 3:
        estado_final = 'TRAMPA'
        calificacion = 0
        puntos_obtenidos = 0
        correctas = 0
    resultado = ResultadoExamen(
        id=str(uuid.uuid4()),
        examen_id=data.examen_id,
        alumno_id=data.alumno_id,
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
        tiempo_usado=data.tiempo_usado or 0,
        tiempo_restante=data.tiempo_restante or 0,
        violaciones=data.violaciones or 0,
        eventos_seguridad=data.eventos_seguridad or [],
        entregado_por_tiempo=data.entregado_por_tiempo or False,
        estado=estado_final,
        detalle_respuestas=resultado_calculado["detalle_preguntas"]
    )
    db.add(resultado)
    db.commit()
    db.refresh(resultado)
    return resultado


@router.get("/resultados/{examen_id}", response_model=List[ResultadoResponse])
def listar_resultados(
    examen_id: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_docente)  # ✅ Cambiado
):
    return db.query(ResultadoExamen).filter(
        ResultadoExamen.examen_id == examen_id
    ).order_by(ResultadoExamen.entregado_en.desc()).all()


@router.get("/resultados/alumno/{alumno_id}", response_model=List[ResultadoResponse])
def listar_resultados_alumno(
    alumno_id: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    return db.query(ResultadoExamen).filter(
        ResultadoExamen.alumno_id == alumno_id
    ).order_by(ResultadoExamen.entregado_en.desc()).all()


@router.get("/resultados/{examen_id}/mejor/{alumno_id}")
def obtener_mejor_resultado(
    examen_id: str,
    alumno_id: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    resultados = db.query(ResultadoExamen).filter(
        ResultadoExamen.examen_id == examen_id,
        ResultadoExamen.alumno_id == alumno_id
    ).all()
    if not resultados:
        raise HTTPException(status_code=404, detail="No se encontraron resultados")
    validos = [r for r in resultados if r.estado != 'TRAMPA']
    if not validos:
        return resultados[0]
    return max(validos, key=lambda r: r.calificacion or 0)


@router.delete("/resultados/{examen_id}", response_model=MensajeResponse)
def limpiar_resultados(
    examen_id: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_docente)  # ✅ Cambiado
):
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
            item["correcta"] = (respuesta == pregunta.respuesta_correcta)
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
        detalle.append(item)
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
    query = db.query(Examen).filter(Examen.grupo_id.in_(grupo_ids))
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
            "configuracion": examen.configuracion or {},
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
    query = db.query(Examen).filter(Examen.grupo_id == grupo_id)
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
    if grupo_ids:
        query = query.filter(Examen.grupo_id.in_(grupo_ids))
    total = query.count()
    publicados = query.filter(Examen.estado == 'PUBLICADO').count()
    borradores = query.filter(Examen.estado == 'BORRADOR').count()
    cerrados = query.filter(Examen.estado == 'CERRADO').count()
    por_grupo = {}
    if grupo_ids:
        for gid in grupo_ids:
            count = db.query(Examen).filter(Examen.grupo_id == gid).count()
            por_grupo[gid] = count
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
    query = db.query(Examen)
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
    return db.query(Examen).filter(Examen.estado == 'PUBLICADO').order_by(Examen.created_at.desc()).all()


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
        grupo_id=data.grupo_id
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
# RUTAS DINÁMICAS - SIEMPRE AL FINAL
# =============================================

@router.get("/{examen_id}", response_model=ExamenDetailResponse)
def obtener_examen(
    examen_id: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    examen = db.query(Examen).filter(Examen.id == examen_id).first()
    if not examen:
        raise HTTPException(status_code=404, detail="Examen no encontrado")
    return examen