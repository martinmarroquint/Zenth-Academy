# app/api/alumnos.py
# ROUTER DE ALUMNOS - VERSIÓN COMPLETA CORREGIDA

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import cast, String, or_
from sqlalchemy.orm import Session
from typing import List, Optional
import uuid
import logging

from app.database import get_db
from app.core.dependencies import (
    get_current_active_user,
    require_docente,
    require_admin
)
from app.core.errors import error_interno
from app.core.curso_utils import lecciones_de_tipo_examen
from app.models.usuario import Usuario
from app.models.alumno import Alumno
from app.models.curso import Curso, InscripcionCurso, AccesoCurso, ProgresoLeccion
from app.models.examen import Examen
from app.models.resultado_examen import ResultadoExamen
from app.models.certificado import Certificado
from app.models.grupo import Grupo
from app.schemas.alumno import (
    AlumnoCreate, AlumnoUpdate, AlumnoResponse, 
    AlumnoListResponse, MensajeResponse, EliminarAlumnosMasivoRequest
)

logger = logging.getLogger(__name__)
router = APIRouter()


def _alumno_to_dict(alumno: Alumno) -> dict:
    """Convierte un objeto Alumno a diccionario para respuesta"""
    return {
        "id": alumno.id,
        "usuario_id": alumno.usuario_id,  # ✅ Incluido explícitamente
        "nombres": alumno.nombres,
        "apellidos": alumno.apellidos,
        "nombre_completo": alumno.nombre_completo,
        "dni": alumno.dni,
        "email": alumno.email,
        "telefono": alumno.telefono,
        "grado": alumno.grado,
        "grupo": alumno.grupo,
        "grupo_id": alumno.grupo_id,
        "nivel": alumno.nivel,
        "institucion": alumno.institucion,
        "direccion": alumno.direccion,
        "fecha_nacimiento": alumno.fecha_nacimiento.isoformat() if alumno.fecha_nacimiento else None,
        "genero": alumno.genero,
        "activo": alumno.activo,
        "created_at": alumno.created_at.isoformat() if alumno.created_at else None,
        "updated_at": alumno.updated_at.isoformat() if alumno.updated_at else None,
        "created_by": alumno.created_by
    }


# =============================================
# LISTAR ALUMNOS (Autenticado)
# =============================================

@router.get("/", response_model=List[AlumnoResponse])
async def listar_alumnos(
    busqueda: Optional[str] = Query(None),
    grado: Optional[str] = Query(None),
    grupo: Optional[str] = Query(None),
    grupo_id: Optional[str] = Query(None),
    activo: Optional[bool] = Query(True),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_docente)
):
    """Lista todos los alumnos con filtros (solo docente/admin).

    ✅ SEGURIDAD: antes bastaba estar autenticado, por lo que un estudiante
    podía enumerar el directorio y leer DNI/email/teléfono de otros (IDOR/PII).
    """
    try:
        logger.info(f"🔍 Listando alumnos - usuario: {current_user.id}")
        
        # ✅ SEGURIDAD: un docente solo ve a SUS alumnos (DNI/email/teléfono
        # son PII). El admin ve el catálogo completo.
        query = _acotar_a_mis_alumnos(
            db.query(Alumno), _ids_visibles_para(db, current_user)
        )
        
        if busqueda:
            query = query.filter(
                (Alumno.nombres.ilike(f"%{busqueda}%")) |
                (Alumno.apellidos.ilike(f"%{busqueda}%")) |
                (Alumno.dni.ilike(f"%{busqueda}%")) |
                (Alumno.email.ilike(f"%{busqueda}%"))
            )
        
        if grado:
            query = query.filter(Alumno.grado == grado)
        
        if grupo:
            query = query.filter(Alumno.grupo == grupo)
        
        if grupo_id:
            query = query.filter(Alumno.grupo_id == grupo_id)
        
        if activo is not None:
            query = query.filter(Alumno.activo == activo)
        
        alumnos = query.order_by(Alumno.apellidos.asc()).offset(offset).limit(limit).all()
        
        logger.info(f"✅ Encontrados {len(alumnos)} alumnos")
        return [_alumno_to_dict(a) for a in alumnos]
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=error_interno(e, "❌ Error listando alumnos"))


# =============================================
# BUSCAR ALUMNOS (Autenticado)
# =============================================

@router.get("/buscar", response_model=List[AlumnoResponse])
async def buscar_alumnos(
    q: str = Query(..., min_length=2),
    limit: int = Query(20, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_docente)
):
    """Busca alumnos por nombre, apellido o DNI (solo docente/admin)."""
    try:
        logger.info(f"🔍 Buscando alumnos: {q}")
        query = _acotar_a_mis_alumnos(
            db.query(Alumno), _ids_visibles_para(db, current_user)
        ).filter(
            (Alumno.nombres.ilike(f"%{q}%")) |
            (Alumno.apellidos.ilike(f"%{q}%")) |
            (Alumno.dni.ilike(f"%{q}%"))
        )
        resultados = query.limit(limit).all()
        logger.info(f"✅ Encontrados {len(resultados)} alumnos")
        return [_alumno_to_dict(a) for a in resultados]
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=error_interno(e, "❌ Error buscando alumnos"))


# =============================================
# OBTENER ALUMNO (Autenticado)
# =============================================

@router.get("/{id}", response_model=AlumnoResponse)
async def obtener_alumno(
    id: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_docente)
):
    """Obtiene un alumno por ID (solo docente/admin).

    ✅ SEGURIDAD: el DNI/email/teléfono es PII; un docente solo puede leer
    fichas de sus propios alumnos (mismo criterio que el listado y la ficha).
    """
    try:
        alumno = db.query(Alumno).filter(Alumno.id == id).first()
        if not alumno:
            raise HTTPException(status_code=404, detail="Alumno no encontrado")

        visibles = _ids_visibles_para(db, current_user)
        if visibles is not None:
            es_mio = (
                str(alumno.id) in visibles
                or (alumno.usuario_id is not None and str(alumno.usuario_id) in visibles)
            )
            if not es_mio:
                raise HTTPException(
                    status_code=403,
                    detail="No tienes permiso para ver este alumno",
                )
        return _alumno_to_dict(alumno)
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=error_interno(e, "❌ Error obteniendo alumno"))


# =============================================
# FICHA COMPLETA DEL ALUMNO (Docente/Admin)
# Identidad + cursos + exámenes + certificados en una sola llamada, con
# ownership: el docente solo ve alumnos con los que tiene relación real.
# =============================================

def _estudiantes_del_docente(db: Session, docente_id: str) -> set:
    """Ids (Usuario.id / Alumno.id) de los alumnos con los que el docente
    tiene relación real: mis cursos (inscripción o acceso), mis exámenes,
    fichas de catálogo que creé y mis grupos.

    Es la ÚNICA definición de "es mi alumno": la ficha y el listado deben
    usar esta misma para que coincidan (nunca se lista un alumno que la
    ficha luego rechace con 403).
    """
    ids = set()
    docente_id = str(docente_id)

    # 1) Inscripciones y accesos directos en cursos míos
    for tabla in (InscripcionCurso, AccesoCurso):
        filas = (
            db.query(tabla.estudiante_id)
            .join(Curso, cast(Curso.id, String) == cast(tabla.curso_id, String))
            .filter(Curso.docente_id == docente_id)
            .all()
        )
        ids.update(str(f[0]) for f in filas)

    # 2) Resultados de exámenes que yo creé
    filas = (
        db.query(ResultadoExamen.alumno_id, ResultadoExamen.alumno_id_unificado)
        .join(Examen, cast(Examen.id, String) == cast(ResultadoExamen.examen_id, String))
        .filter(Examen.docente_id == docente_id)
        .all()
    )
    for alumno_id, alumno_id_unificado in filas:
        if alumno_id:
            ids.add(str(alumno_id))
        if alumno_id_unificado:
            ids.add(str(alumno_id_unificado))

    # 3) Fichas de catálogo que yo creé
    filas = db.query(Alumno.id).filter(Alumno.created_by == docente_id).all()
    ids.update(str(f[0]) for f in filas)

    # 4) Alumnos de grupos míos (por Alumno.grupo_id o por el rolado del grupo)
    grupos = db.query(Grupo).filter(Grupo.docente_id == docente_id).all()
    if grupos:
        grupo_ids = [str(g.id) for g in grupos]
        filas = db.query(Alumno.id).filter(Alumno.grupo_id.in_(grupo_ids)).all()
        ids.update(str(f[0]) for f in filas)
        for grupo in grupos:
            for posible_id in (grupo.alumnos or []):
                ids.add(str(posible_id))

    return ids


def _ids_visibles_para(db: Session, current_user: Usuario):
    """Ids de alumno que el usuario actual puede leer.

    Devuelve None cuando NO hay que acotar (admin) y un set (posiblemente
    vacío) para docentes. Usado por listado, búsqueda, detalle y ficha para
    que compartan UN SOLO criterio: nunca se lista un alumno que la ficha
    rechazaría después con 403.
    """
    if current_user.rol == "admin":
        return None
    return _estudiantes_del_docente(db, str(current_user.id))


def _acotar_a_mis_alumnos(query, visibles):
    """Aplica el filtro por propiedad a una query sobre Alumno."""
    if visibles is None:
        return query
    if not visibles:
        # Sin relación con ningún alumno: nada que mostrar (IN vacío = falso)
        return query.filter(Alumno.id.in_([]))
    return query.filter(
        or_(Alumno.id.in_(visibles), Alumno.usuario_id.in_(visibles))
    )


def _alumno_de_id(db: Session, id: str):
    """Resuelve un id de alumno a (uid, Alumno|None, Usuario|None).

    El id puede ser: una fila de catálogo (Alumno.id) o un Usuario.id (altas
    por Google no crean fila Alumno). La clave real de todo el sistema es
    Usuario.id, y Alumno.id == Usuario.id solo para los autorregistrados.
    """
    alumno = db.query(Alumno).filter(Alumno.id == id).first()
    if alumno:
        uid = str(alumno.usuario_id or alumno.id)
    else:
        usuario = db.query(Usuario).filter(Usuario.id == id).first()
        if not usuario:
            return None, None, None
        uid = str(usuario.id)
        alumno = db.query(Alumno).filter(Alumno.usuario_id == uid).first()

    usuario = db.query(Usuario).filter(Usuario.id == uid).first()
    return uid, alumno, usuario


@router.get("/{id}/ficha")
async def ficha_alumno(
    id: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_docente)
):
    """Docente/admin: ficha trazable de un alumno (datos, cursos con progreso
    y notas, exámenes rendidos y certificados emitidos)."""
    try:
        uid, alumno, usuario = _alumno_de_id(db, id)
        if uid is None:
            raise HTTPException(status_code=404, detail="Alumno no encontrado")

        es_admin = current_user.rol == "admin"
        docente_id = str(current_user.id)

        # Ownership: el docente solo ve alumnos con los que tiene relación real
        # (mismo criterio que el listado, la búsqueda y el detalle: nunca se
        # muestra un alumno aquí que la ficha rechace con 403 ni viceversa)
        visibles = _ids_visibles_para(db, current_user)
        if visibles is not None and uid not in visibles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permiso para ver la ficha de este alumno"
            )

        # ---------- Identidad ----------
        nombres = (alumno.nombres if alumno else None) or (usuario.nombres if usuario else None) or ""
        apellidos = (alumno.apellidos if alumno else None) or (usuario.apellidos if usuario else None) or ""
        ficha = {
            "id": uid,
            "alumno_id": str(alumno.id) if alumno else None,
            "usuario_id": str(alumno.usuario_id) if alumno and alumno.usuario_id else (str(usuario.id) if usuario else None),
            "nombres": nombres,
            "apellidos": apellidos,
            "nombre_completo": f"{nombres} {apellidos}".strip() or "Sin nombre",
            "dni": (alumno.dni if alumno else None) or "",
            "email": (alumno.email if alumno and alumno.email else None) or (usuario.email if usuario else None) or "",
            "telefono": (alumno.telefono if alumno else None) or "",
            "grado": (alumno.grado if alumno else None) or "",
            "grupo": (alumno.grupo if alumno else None) or "",
            "institucion": (alumno.institucion if alumno else None) or "",
            "activo": bool(alumno.activo) if alumno else True,
            "cuenta_registrada": usuario is not None,
            "fecha_alta": (
                usuario.created_at.isoformat() if usuario and usuario.created_at
                else (alumno.created_at.isoformat() if alumno and alumno.created_at else None)
            ),
        }

        # ---------- Cursos ----------
        consulta_insc = (
            db.query(InscripcionCurso, Curso)
            .join(Curso, cast(Curso.id, String) == cast(InscripcionCurso.curso_id, String))
            .filter(cast(InscripcionCurso.estudiante_id, String) == uid)
        )
        consulta_acc = (
            db.query(AccesoCurso, Curso)
            .join(Curso, cast(Curso.id, String) == cast(AccesoCurso.curso_id, String))
            .filter(cast(AccesoCurso.estudiante_id, String) == uid)
        )
        if not es_admin:
            consulta_insc = consulta_insc.filter(Curso.docente_id == docente_id)
            consulta_acc = consulta_acc.filter(Curso.docente_id == docente_id)

        cursos_por_id = {}
        for inscripcion, curso in consulta_insc.all():
            cursos_por_id[str(curso.id)] = {
                "curso": curso, "inscripcion": inscripcion, "acceso": None
            }
        for acceso, curso in consulta_acc.all():
            entrada = cursos_por_id.setdefault(
                str(curso.id), {"curso": curso, "inscripcion": None, "acceso": None}
            )
            if entrada["acceso"] is None:
                entrada["acceso"] = acceso

        curso_ids = list(cursos_por_id.keys())
        for entrada in cursos_por_id.values():
            entrada["lecciones_examen"] = lecciones_de_tipo_examen(entrada["curso"])

        progresos = (
            db.query(ProgresoLeccion).filter(
                cast(ProgresoLeccion.estudiante_id, String) == uid,
                cast(ProgresoLeccion.curso_id, String).in_(curso_ids)
            ).all()
            if curso_ids else []
        )
        datos_progreso = {}
        for p in progresos:
            clave = str(p.curso_id)
            reg = datos_progreso.setdefault(clave, {"completadas": 0, "notas": []})
            if p.completado:
                reg["completadas"] += 1
            entrada = cursos_por_id.get(clave)
            es_examen = entrada and str(p.leccion_id) in entrada["lecciones_examen"]
            if p.nota is not None and not es_examen:
                reg["notas"].append(float(p.nota))

        cursos = []
        for clave, entrada in cursos_por_id.items():
            curso = entrada["curso"]
            inscripcion = entrada["inscripcion"]
            reg = datos_progreso.get(clave, {"completadas": 0, "notas": []})
            total = sum(len(m.get("lecciones", [])) for m in (curso.modulos or []))
            completadas = reg["completadas"]
            notas = reg["notas"]
            if total:
                progreso = int((completadas / total) * 100)
            else:
                progreso = (inscripcion.progreso or 0) if inscripcion else 0
            cursos.append({
                "curso_id": clave,
                "titulo": curso.titulo,
                "estado": curso.estado,
                "docente_nombre": curso.docente_nombre,
                "fecha_inscripcion": (
                    inscripcion.fecha_inscripcion.isoformat()
                    if inscripcion and inscripcion.fecha_inscripcion else None
                ),
                "completado": (
                    bool(inscripcion.completado) if inscripcion
                    else (completadas >= total > 0)
                ),
                "lecciones_totales": total,
                "lecciones_completadas": completadas,
                "progreso": min(progreso, 100),
                "notas_registradas": len(notas),
                "promedio_notas": round(sum(notas) / len(notas), 2) if notas else None,
            })
        cursos.sort(key=lambda c: (c["titulo"] or "").lower())

        # ---------- Exámenes ----------
        consulta_resultados = (
            db.query(ResultadoExamen, Examen)
            .join(Examen, cast(Examen.id, String) == cast(ResultadoExamen.examen_id, String))
            .filter(or_(
                cast(ResultadoExamen.alumno_id, String) == uid,
                cast(ResultadoExamen.alumno_id_unificado, String) == uid,
            ))
        )
        if not es_admin:
            consulta_resultados = consulta_resultados.filter(Examen.docente_id == docente_id)
        resultados = consulta_resultados.order_by(ResultadoExamen.created_at.desc()).all()

        intentos = {}
        for res, examen in resultados:
            clave = str(examen.id)
            intentos[clave] = intentos.get(clave, 0) + 1

        examenes = []
        for res, examen in resultados:
            clave = str(examen.id)
            calificacion = float(res.calificacion or 0)
            umbral = float(examen.puntaje_aprobacion or 60)
            examenes.append({
                "examen_id": clave,
                "titulo": examen.titulo,
                "codigo": examen.codigo,
                "calificacion": calificacion,
                "puntaje_aprobacion": umbral,
                "aprobado": calificacion >= umbral,
                "estado": res.estado,
                "entregado_en": res.entregado_en.isoformat() if res.entregado_en else None,
                "tiempo_usado": res.tiempo_usado,
                "correctas": res.correctas,
                "total_preguntas": res.total_preguntas,
                "intentos": intentos[clave],
            })

        # ---------- Certificados ----------
        consulta_cert = db.query(Certificado).filter(Certificado.estudiante_id == uid)
        if not es_admin:
            consulta_cert = consulta_cert.filter(Certificado.docente_id == docente_id)
        certificados = [
            {
                "codigo": c.codigo,
                "curso_titulo": c.curso_titulo,
                "fecha_emision": c.fecha_emision.isoformat() if c.fecha_emision else None,
                "estado": c.estado,
                "url": c.url,
            }
            for c in consulta_cert.order_by(Certificado.fecha_emision.desc()).all()
        ]

        # ---------- Resumen ----------
        notas_examen = [e["calificacion"] for e in examenes if e["estado"] != "TRAMPA"]
        resumen = {
            "cursos_inscritos": len(cursos),
            "cursos_completados": sum(1 for c in cursos if c["completado"]),
            "progreso_promedio": (
                round(sum(c["progreso"] for c in cursos) / len(cursos), 1) if cursos else 0
            ),
            "examenes_rendidos": len(examenes),
            "examenes_aprobados": sum(
                1 for e in examenes if e["aprobado"] and e["estado"] != "TRAMPA"
            ),
            "promedio_examenes": (
                round(sum(notas_examen) / len(notas_examen), 1) if notas_examen else None
            ),
            "certificados_emitidos": len(certificados),
        }

        return {
            "alumno": ficha,
            "resumen": resumen,
            "cursos": cursos,
            "examenes": examenes,
            "certificados": certificados,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=error_interno(e, "Error obteniendo la ficha del alumno"))


# =============================================
# CREAR ALUMNO (Solo admin - gestión institucional)
# NOTA: los estudiantes se registran SOLOS (POST /auth/register) y el docente
# NO gestiona alumnos. El CRUD manual queda reservado al admin (importación
# institucional). usuario_id queda NULL porque estos alumnos no tienen cuenta.
# =============================================

@router.post("/", response_model=AlumnoResponse, status_code=201)
async def crear_alumno(
    data: AlumnoCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_admin)
):
    """Crea un nuevo alumno (solo admin - gestión institucional)"""
    try:
        if data.dni:
            existe = db.query(Alumno).filter(Alumno.dni == data.dni).first()
            if existe:
                raise HTTPException(status_code=400, detail="Ya existe un alumno con este DNI")
        
        alumno = Alumno(
            id=str(uuid.uuid4()),
            usuario_id=None,  # Sin cuenta en la plataforma (registro directo es la vía normal)
            nombres=data.nombres.upper(),
            apellidos=data.apellidos.upper(),
            dni=data.dni,
            email=data.email,
            telefono=data.telefono,
            grado=data.grado,
            grupo=data.grupo,
            nivel=data.nivel,
            institucion=data.institucion,
            direccion=data.direccion,
            fecha_nacimiento=data.fecha_nacimiento,
            genero=data.genero,
            activo=True,
            created_by=str(current_user.id)
        )
        db.add(alumno)
        db.commit()
        db.refresh(alumno)
        logger.info(f"✅ Alumno creado: {alumno.id}")
        return _alumno_to_dict(alumno)
    
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=error_interno(e, "❌ Error creando alumno"))


# =============================================
# ACTUALIZAR ALUMNO (Solo admin)
# =============================================

@router.put("/{id}", response_model=AlumnoResponse)
async def actualizar_alumno(
    id: str,
    data: AlumnoUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_admin)
):
    """Actualiza un alumno (solo admin)"""
    try:
        alumno = db.query(Alumno).filter(Alumno.id == id).first()
        if not alumno:
            raise HTTPException(status_code=404, detail="Alumno no encontrado")
        
        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            if value is not None:
                if field in ['nombres', 'apellidos']:
                    setattr(alumno, field, value.upper())
                else:
                    setattr(alumno, field, value)
        
        db.commit()
        db.refresh(alumno)
        logger.info(f"✅ Alumno actualizado: {alumno.id}")
        return _alumno_to_dict(alumno)
    
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=error_interno(e, "❌ Error actualizando alumno"))


# =============================================
# ELIMINAR ALUMNO (Solo admin)
# =============================================

@router.delete("/{id}", response_model=MensajeResponse)
async def eliminar_alumno(
    id: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_admin)
):
    """Elimina un alumno (soft delete - solo admin)"""
    try:
        alumno = db.query(Alumno).filter(Alumno.id == id).first()
        if not alumno:
            raise HTTPException(status_code=404, detail="Alumno no encontrado")
        
        alumno.activo = False
        db.commit()
        logger.info(f"✅ Alumno eliminado (soft): {alumno.id}")
        return {"mensaje": "Alumno eliminado correctamente", "ok": True}
    
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=error_interno(e, "❌ Error eliminando alumno"))


# =============================================
# GUARDAR ALUMNOS MASIVO (Solo admin - gestión institucional)
# =============================================

@router.post("/masivo", response_model=MensajeResponse, status_code=201)
async def guardar_alumnos_masivo(
    data: List[AlumnoCreate],
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_admin)
):
    """Guarda múltiples alumnos a la vez (solo admin)"""
    try:
        creados = 0
        for item in data:
            if item.dni:
                existe = db.query(Alumno).filter(Alumno.dni == item.dni).first()
                if existe:
                    continue
            
            alumno = Alumno(
                id=str(uuid.uuid4()),
                usuario_id=None,  # Sin cuenta (los estudiantes se registran solos)
                nombres=item.nombres.upper(),
                apellidos=item.apellidos.upper(),
                dni=item.dni,
                email=item.email,
                telefono=item.telefono,
                grado=item.grado,
                grupo=item.grupo,
                nivel=item.nivel,
                institucion=item.institucion,
                activo=True,
                created_by=str(current_user.id)
            )
            db.add(alumno)
            creados += 1
        
        db.commit()
        logger.info(f"✅ {creados} alumnos guardados masivamente")
        return {"mensaje": f"{creados} alumnos guardados correctamente", "ok": True}
    
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=error_interno(e, "❌ Error guardando alumnos masivo"))


# =============================================
# ELIMINAR ALUMNOS MASIVO (Solo admin)
# =============================================

@router.post("/eliminar-masivo", response_model=MensajeResponse)
async def eliminar_alumnos_masivo(
    data: EliminarAlumnosMasivoRequest,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_admin)
):
    """Elimina múltiples alumnos por IDs (soft delete - solo admin)"""
    try:
        ids = data.ids
        if not ids:
            raise HTTPException(status_code=400, detail="No se proporcionaron IDs")
        
        db.query(Alumno).filter(Alumno.id.in_(ids)).update({"activo": False})
        db.commit()
        logger.info(f"✅ {len(ids)} alumnos eliminados masivamente")
        return {"mensaje": f"{len(ids)} alumnos eliminados", "ok": True}
    
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=error_interno(e, "❌ Error eliminando alumnos masivo"))


# =============================================
# OBTENER ALUMNOS POR GRUPO (Autenticado)
# =============================================

@router.get("/grupo/{grupo_id}", response_model=List[AlumnoResponse])
async def alumnos_por_grupo(
    grupo_id: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_docente)
):
    """Obtiene todos los alumnos de un grupo específico (docente del grupo o admin)"""
    # ✅ SEGURIDAD: los grupos tienen PII; un docente ajeno no debe leerlos
    if current_user.rol != "admin":
        grupo = db.query(Grupo).filter(Grupo.id == grupo_id).first()
        if not grupo:
            raise HTTPException(status_code=404, detail="Grupo no encontrado")
        if str(grupo.docente_id) != str(current_user.id):
            raise HTTPException(
                status_code=403,
                detail="No tienes permiso sobre este grupo",
            )

    try:
        alumnos = db.query(Alumno).filter(Alumno.grupo_id == grupo_id).all()
        logger.info(f"✅ Encontrados {len(alumnos)} alumnos para grupo {grupo_id}")
        return [_alumno_to_dict(a) for a in alumnos]
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=error_interno(e, "❌ Error obteniendo alumnos por grupo"))


# =============================================
# OBTENER ESTUDIANTES DEL CURSO COMO ALUMNOS (FASE F)
# =============================================

@router.get("/curso/{curso_id}")
async def alumnos_por_curso(
    curso_id: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_docente)
):
    """Devuelve los estudiantes inscritos al curso en formato alumno"""
    try:
        curso = db.query(Curso).filter(Curso.id == curso_id).first()
        if not curso:
            raise HTTPException(status_code=404, detail="Curso no encontrado")

        # ✅ SEGURIDAD: el listado expone DNI/email de los estudiantes del
        # curso; solo su docente (o un admin) puede leerlo.
        if current_user.rol != "admin" and str(curso.docente_id) != str(current_user.id):
            raise HTTPException(
                status_code=403,
                detail="No tienes permiso sobre este curso",
            )

        inscripciones = db.query(InscripcionCurso).filter(
            InscripcionCurso.curso_id == curso_id
        ).all()
        accesos = db.query(AccesoCurso).filter(
            AccesoCurso.curso_id == curso_id,
            AccesoCurso.activo == True
        ).all()

        ids_estudiantes = {str(i.estudiante_id) for i in inscripciones}
        ids_estudiantes.update({str(a.estudiante_id) for a in accesos})
        
        if not ids_estudiantes:
            return {"curso_id": curso_id, "curso_titulo": curso.titulo, "total": 0, "alumnos": []}

        alumnos_db = db.query(Alumno).filter(Alumno.id.in_(list(ids_estudiantes))).all()
        por_id = {a.id: a for a in alumnos_db}

        insc_por_estudiante = {str(i.estudiante_id): i for i in inscripciones}
        acceso_por_estudiante = {str(a.estudiante_id): a for a in accesos}

        alumnos = []
        for estudiante_id in sorted(ids_estudiantes):
            a = por_id.get(estudiante_id)
            insc = insc_por_estudiante.get(estudiante_id)
            acceso = acceso_por_estudiante.get(estudiante_id)
            alumnos.append({
                "id": estudiante_id,
                "usuario_id": estudiante_id,
                "nombres": (a.nombres if a else "") or (insc.estudiante_nombre or ""),
                "apellidos": (a.apellidos if a else ""),
                "nombre_completo": (a.nombre_completo if a else insc.estudiante_nombre or ""),
                "dni": (a.dni if a else "") or "",
                "grado": (a.grado if a else "") or "",
                "email": (a.email if a else "") or "",
                "grupo": (a.grupo if a else "") or "",
                "grupo_id": curso_id,
                "activo": True,
                "curso_id": curso_id,
                "curso_titulo": curso.titulo,
                "progreso": insc.progreso if insc else 0,
                "completado": bool(insc.completado) if insc else False,
                "acceso_activo": bool(acceso.activo) if acceso else True,
                "fecha_inscripcion": insc.fecha_inscripcion if insc else None,
            })

        return {
            "curso_id": curso_id,
            "curso_titulo": curso.titulo,
            "total": len(alumnos),
            "alumnos": alumnos
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=error_interno(e, "❌ Error obteniendo alumnos por curso"))