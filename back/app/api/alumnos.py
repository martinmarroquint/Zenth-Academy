# app/api/alumnos.py
# ROUTER DE ALUMNOS - VERSIÓN COMPLETA CORREGIDA

from fastapi import APIRouter, Depends, HTTPException, Query, status
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
from app.models.usuario import Usuario
from app.models.alumno import Alumno
from app.models.curso import Curso, InscripcionCurso, AccesoCurso
from app.schemas.alumno import (
    AlumnoCreate, AlumnoUpdate, AlumnoResponse, 
    AlumnoListResponse, MensajeResponse
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
    current_user: Usuario = Depends(get_current_active_user)
):
    """Lista todos los alumnos con filtros (autenticado)"""
    try:
        logger.info(f"🔍 Listando alumnos - usuario: {current_user.id}")
        
        query = db.query(Alumno)
        
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
        logger.error(f"❌ Error listando alumnos: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =============================================
# BUSCAR ALUMNOS (Autenticado)
# =============================================

@router.get("/buscar", response_model=List[AlumnoResponse])
async def buscar_alumnos(
    q: str = Query(..., min_length=2),
    limit: int = Query(20, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """Busca alumnos por nombre, apellido o DNI (autenticado)"""
    try:
        logger.info(f"🔍 Buscando alumnos: {q}")
        query = db.query(Alumno).filter(
            (Alumno.nombres.ilike(f"%{q}%")) |
            (Alumno.apellidos.ilike(f"%{q}%")) |
            (Alumno.dni.ilike(f"%{q}%"))
        )
        resultados = query.limit(limit).all()
        logger.info(f"✅ Encontrados {len(resultados)} alumnos")
        return [_alumno_to_dict(a) for a in resultados]
    
    except Exception as e:
        logger.error(f"❌ Error buscando alumnos: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =============================================
# OBTENER ALUMNO (Autenticado)
# =============================================

@router.get("/{id}", response_model=AlumnoResponse)
async def obtener_alumno(
    id: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """Obtiene un alumno por ID (autenticado)"""
    try:
        alumno = db.query(Alumno).filter(Alumno.id == id).first()
        if not alumno:
            raise HTTPException(status_code=404, detail="Alumno no encontrado")
        return _alumno_to_dict(alumno)
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error obteniendo alumno: {e}")
        raise HTTPException(status_code=500, detail=str(e))


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
        logger.error(f"❌ Error creando alumno: {e}")
        raise HTTPException(status_code=500, detail=str(e))


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
        logger.error(f"❌ Error actualizando alumno: {e}")
        raise HTTPException(status_code=500, detail=str(e))


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
        logger.error(f"❌ Error eliminando alumno: {e}")
        raise HTTPException(status_code=500, detail=str(e))


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
        logger.error(f"❌ Error guardando alumnos masivo: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =============================================
# ELIMINAR ALUMNOS MASIVO (Solo admin)
# =============================================

@router.post("/eliminar-masivo", response_model=MensajeResponse)
async def eliminar_alumnos_masivo(
    data: dict,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_admin)
):
    """Elimina múltiples alumnos por IDs (soft delete - solo admin)"""
    try:
        ids = data.get("ids", [])
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
        logger.error(f"❌ Error eliminando alumnos masivo: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =============================================
# OBTENER ALUMNOS POR GRUPO (Autenticado)
# =============================================

@router.get("/grupo/{grupo_id}", response_model=List[AlumnoResponse])
async def obtener_alumnos_por_grupo(
    grupo_id: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """Obtiene todos los alumnos de un grupo específico (autenticado)"""
    try:
        alumnos = db.query(Alumno).filter(Alumno.grupo_id == grupo_id).all()
        logger.info(f"✅ Encontrados {len(alumnos)} alumnos para grupo {grupo_id}")
        return [_alumno_to_dict(a) for a in alumnos]
    
    except Exception as e:
        logger.error(f"❌ Error obteniendo alumnos por grupo: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =============================================
# OBTENER ESTUDIANTES DEL CURSO COMO ALUMNOS (FASE F)
# =============================================

@router.get("/curso/{curso_id}")
async def obtener_alumnos_por_curso(
    curso_id: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """Devuelve los estudiantes inscritos al curso en formato alumno"""
    try:
        curso = db.query(Curso).filter(Curso.id == curso_id).first()
        if not curso:
            raise HTTPException(status_code=404, detail="Curso no encontrado")

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
        logger.error(f"❌ Error obteniendo alumnos por curso: {e}")
        raise HTTPException(status_code=500, detail=str(e))