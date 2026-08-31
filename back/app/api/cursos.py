# app/api/cursos.py
# ROUTER DE CURSOS - COMPLETO CON SISTEMA DE BLOQUEO Y SOLICITUDES
# VERSIÓN CORREGIDA - CON CAST A STRING PARA EVITAR ERRORES DE TIPO

from fastapi import APIRouter, Depends, HTTPException, Query, status, Body, Response, UploadFile, File
from sqlalchemy import func, cast, String
from sqlalchemy.orm import Session
from typing import List, Optional
import uuid
import logging
import csv
import io
import os
from datetime import datetime, timezone

from app.database import get_db
from app.core.dependencies import get_current_active_user, require_docente, require_admin
from app.models.usuario import Usuario
from app.models.curso import (
    Curso, InscripcionCurso, AccesoCurso, SolicitudAccesoCurso,
    ProgresoLeccion, EvaluacionLeccion
)
from app.models.certificado import Certificado
from app.schemas.curso import (
    CursoCreate, CursoUpdate, CursoResponse,
    InscripcionCursoResponse,
    ProgresoCursoResponse, LeccionCompletarRequest, MensajeResponse,
    AccesoCursoCreate, AccesoCursoResponse,
    SolicitudAccesoCreate, SolicitudAccesoUpdate, SolicitudAccesoResponse,
    ProgresoLeccionResponse, ProgresoLeccionUpdate,
    EvaluacionLeccionCreate, EvaluacionLeccionResponse,
    LeccionBloqueadaResponse,
    AsignarNotaRequest
)

logger = logging.getLogger(__name__)
router = APIRouter()


# =============================================
# FUNCIONES AUXILIARES
# =============================================

def _curso_to_dict(curso: Curso, tiene_acceso: bool = False, tiene_solicitud_pendiente: bool = False) -> dict:
    return {
        "id": str(curso.id),
        "titulo": curso.titulo,
        "descripcion": curso.descripcion,
        "categoria": curso.categoria,
        "nivel": curso.nivel,
        "docente_id": str(curso.docente_id) if curso.docente_id else None,
        "docente_nombre": curso.docente_nombre,
        "instructor": curso.instructor,
        "duracion": curso.duracion,
        "precio_tipo": curso.precio_tipo or "gratis",
        "precio_monto": float(curso.precio_monto) if curso.precio_monto else None,
        "moneda": curso.moneda or "PEN",
        "metodo_pago": curso.metodo_pago,
        "numero_pago": curso.numero_pago,
        "instrucciones_pago": curso.instrucciones_pago,
        "imagen_url": curso.imagen_url,
        "estado": (curso.estado or "BORRADOR").upper(),
        "modulos": curso.modulos or [],
        "estudiantes_count": curso.estudiantes_count or 0,
        "rating": curso.rating or 0,
        "rating_count": curso.rating_count or 0,
        "etiquetas": curso.etiquetas or [],
        "requisitos": curso.requisitos or [],
        "objetivos": curso.objetivos or [],
        "publico_objetivo": curso.publico_objetivo,
        "tipo_bloqueo": curso.tipo_bloqueo or "ninguno",
        "bloqueo_config": curso.bloqueo_config or {},
        "certificado_habilitado": bool(curso.certificado_habilitado) if curso.certificado_habilitado is not None else True,
        "certificado_nota_minima": float(curso.certificado_nota_minima) if curso.certificado_nota_minima is not None else None,
        "tiene_acceso": tiene_acceso,
        "tiene_solicitud_pendiente": tiene_solicitud_pendiente,
        "created_at": curso.created_at.isoformat() if curso.created_at else None,
        "updated_at": curso.updated_at.isoformat() if curso.updated_at else None,
    }


def _verificar_acceso(db: Session, curso_id: str, usuario_id: str) -> bool:
    acceso = db.query(AccesoCurso).filter(
        AccesoCurso.curso_id == curso_id,
        AccesoCurso.estudiante_id == usuario_id,
        AccesoCurso.activo == True
    ).first()
    
    if not acceso:
        return False
    
    if acceso.fecha_expiracion and acceso.fecha_expiracion < datetime.now(timezone.utc):
        acceso.activo = False
        db.commit()
        return False
    
    return True


def _tiene_solicitud_pendiente(db: Session, curso_id: str, usuario_id: str) -> bool:
    solicitud = db.query(SolicitudAccesoCurso).filter(
        SolicitudAccesoCurso.curso_id == curso_id,
        SolicitudAccesoCurso.estudiante_id == usuario_id,
        SolicitudAccesoCurso.estado == "pendiente"
    ).first()
    return solicitud is not None


def _actualizar_progreso_curso(db: Session, curso_id: str, estudiante_id: str):
    try:
        curso = db.query(Curso).filter(Curso.id == curso_id).first()
        if not curso:
            return
        
        total = 0
        for modulo in curso.modulos or []:
            total += len(modulo.get("lecciones", []))
        
        if total == 0:
            return
        
        completadas = db.query(ProgresoLeccion).filter(
            ProgresoLeccion.curso_id == curso_id,
            ProgresoLeccion.estudiante_id == estudiante_id,
            ProgresoLeccion.completado == True
        ).count()
        
        progreso_pct = int((completadas / total) * 100)
        
        inscripcion = db.query(InscripcionCurso).filter(
            cast(InscripcionCurso.curso_id, String) == curso_id,
            cast(InscripcionCurso.estudiante_id, String) == estudiante_id
        ).first()
        
        if inscripcion:
            inscripcion.progreso = progreso_pct
            if completadas >= total and not inscripcion.completado:
                inscripcion.completado = True
                inscripcion.fecha_completado = datetime.now(timezone.utc)
                _emitir_certificado_automatico(db, curso, estudiante_id, inscripcion)
            db.commit()
    except Exception as e:
        logger.error(f"Error actualizando progreso curso: {e}")


def _emitir_certificado_automatico(db: Session, curso: Curso, estudiante_id: str, inscripcion: InscripcionCurso):
    """Emite automáticamente el certificado del curso cuando el estudiante lo completa.
    No hace nada si el curso no tiene certificado habilitado o si ya existe uno."""
    try:
        if not curso.certificado_habilitado:
            return

        # Si hay nota mínima configurada, verificar promedio del estudiante
        if curso.certificado_nota_minima is not None:
            notas = db.query(ProgresoLeccion.nota).filter(
                ProgresoLeccion.curso_id == curso.id,
                ProgresoLeccion.estudiante_id == estudiante_id,
                ProgresoLeccion.nota.isnot(None)
            ).all()
            notas_validas = [float(n[0]) for n in notas if n[0] is not None]
            if notas_validas:
                promedio = sum(notas_validas) / len(notas_validas)
                if promedio < float(curso.certificado_nota_minima):
                    logger.info(f"Certificado NO emitido para {estudiante_id}: promedio {promedio:.2f} < minimo {curso.certificado_nota_minima}")
                    return

        # Evitar duplicados
        existe = db.query(Certificado).filter(
            Certificado.curso_id == curso.id,
            Certificado.estudiante_id == estudiante_id,
            Certificado.estado != "cancelado"
        ).first()
        if existe:
            return

        codigo = f"CERT-{uuid.uuid4().hex[:8].upper()}"
        certificado = Certificado(
            id=str(uuid.uuid4()),
            codigo=codigo,
            estudiante_id=estudiante_id,
            estudiante_nombre=inscripcion.estudiante_nombre or "Estudiante",
            curso_id=str(curso.id),
            curso_titulo=curso.titulo,
            docente_id=str(curso.docente_id) if curso.docente_id else "",
            docente_nombre=curso.docente_nombre or "",
            url=None,
            estado="emitido",
            fecha_emision=datetime.now(timezone.utc)
        )
        db.add(certificado)
        logger.info(f"Certificado automático emitido: {codigo} para estudiante {estudiante_id} en curso {curso.titulo}")
    except Exception as e:
        logger.error(f"Error emitiendo certificado automático: {e}")


# =============================================
# FUNCIONES DE BLOQUEO DE LECCIONES
# =============================================

def _encontrar_leccion_y_anterior(curso: Curso, leccion_id: str):
    """Busca la lección en la estructura de módulos y devuelve (leccion, leccion_anterior, modulo_actual)"""
    leccion_anterior = None
    for modulo in curso.modulos or []:
        lecciones = modulo.get("lecciones", [])
        for idx, leccion in enumerate(lecciones):
            if str(leccion.get("id")) == str(leccion_id):
                if idx > 0:
                    leccion_anterior = lecciones[idx - 1]
                return leccion, leccion_anterior, modulo
    return None, None, None


def _get_progreso_leccion(db: Session, curso_id: str, estudiante_id: str, leccion_id: str):
    """Obtiene (o crea si no existe) el registro de progreso de una lección"""
    progreso = db.query(ProgresoLeccion).filter(
        cast(ProgresoLeccion.curso_id, String) == curso_id,
        cast(ProgresoLeccion.estudiante_id, String) == estudiante_id,
        cast(ProgresoLeccion.leccion_id, String) == leccion_id
    ).first()
    if not progreso:
        progreso = ProgresoLeccion(
            id=str(uuid.uuid4()),
            curso_id=curso_id,
            estudiante_id=estudiante_id,
            leccion_id=leccion_id,
            completado=False,
            tiempo_invertido=0,
            intentos=0
        )
        db.add(progreso)
    return progreso


def _verificar_bloqueo_leccion_internal(
    db: Session, curso: Curso, leccion_id: str, usuario_id: str, rol: str
) -> dict:
    """Verifica si una lección está bloqueada para el usuario según el tipo de bloqueo del curso.
    
    Devuelve: {"bloqueada": bool, "razon": str, "fecha_liberacion": datetime|None, "evaluacion_pendiente": bool}
    """
    resultado = {
        "bloqueada": False,
        "razon": None,
        "fecha_liberacion": None,
        "evaluacion_pendiente": False,
        "lecciones_requeridas": []
    }
    
    # Admin/docente nunca están bloqueados
    if rol in ["admin", "docente"]:
        return resultado
    
    tipo = (curso.tipo_bloqueo or "ninguno").lower()
    if tipo == "ninguno":
        return resultado
    
    config = curso.bloqueo_config or {}
    ahora = datetime.now(timezone.utc)
    
    # ---- BLOQUEO POR FECHA ----
    if tipo in ["fecha", "mixto"]:
        fechas = config.get("fechas") or {}
        fecha_str = fechas.get(str(leccion_id)) or fechas.get(leccion_id)
        if fecha_str:
            try:
                fecha_liberacion = datetime.fromisoformat(str(fecha_str).replace("Z", "+00:00"))
                if fecha_liberacion.tzinfo is None:
                    fecha_liberacion = fecha_liberacion.replace(tzinfo=timezone.utc)
                if ahora < fecha_liberacion:
                    resultado["bloqueada"] = True
                    resultado["razon"] = f"Lección disponible desde {fecha_liberacion.strftime('%d/%m/%Y %H:%M')}"
                    resultado["fecha_liberacion"] = fecha_liberacion
                    return resultado
            except Exception:
                logger.warning(f"Fecha de liberación inválida para lección {leccion_id}: {fecha_str}")
    
    # ---- BLOQUEO SECUENCIAL ----
    if tipo in ["secuencial", "mixto"]:
        leccion, leccion_anterior, _ = _encontrar_leccion_y_anterior(curso, leccion_id)
        if leccion is None:
            return resultado
        
        # Secuencial: todas las lecciones anteriores (dentro del mismo módulo y anteriores) deben estar completas
        lecciones_requeridas = []
        for modulo in curso.modulos or []:
            for prev in modulo.get("lecciones", []):
                if str(prev.get("id")) == str(leccion_id):
                    break
                lecciones_requeridas.append(str(prev.get("id")))
        
        if lecciones_requeridas:
            progresos = db.query(ProgresoLeccion).filter(
                cast(ProgresoLeccion.curso_id, String) == curso.id,
                cast(ProgresoLeccion.estudiante_id, String) == usuario_id,
                ProgresoLeccion.completado == True
            ).all()
            completadas = {str(p.leccion_id) for p in progresos}
            faltantes = [lid for lid in lecciones_requeridas if lid not in completadas]
            if faltantes:
                resultado["bloqueada"] = True
                resultado["razon"] = "Debes completar las lecciones anteriores antes de continuar"
                resultado["lecciones_requeridas"] = faltantes
                return resultado
    
    # ---- BLOQUEO POR DESEMPEÑO ----
    if tipo in ["desempeno", "mixto"]:
        evaluacion = db.query(EvaluacionLeccion).filter(
            cast(EvaluacionLeccion.curso_id, String) == curso.id,
            cast(EvaluacionLeccion.leccion_id, String) == leccion_id
        ).first()
        
        if evaluacion:
            progreso = db.query(ProgresoLeccion).filter(
                cast(ProgresoLeccion.curso_id, String) == curso.id,
                cast(ProgresoLeccion.estudiante_id, String) == usuario_id,
                cast(ProgresoLeccion.leccion_id, String) == leccion_id
            ).first()
            
            nota_minima = float(evaluacion.nota_minima or 0)
            nota_obtenida = float(progreso.nota) if progreso and progreso.nota else 0
            aprobado = progreso.aprobado if progreso else False
            
            if not aprobado or nota_obtenida < nota_minima:
                resultado["bloqueada"] = True
                resultado["razon"] = f"Debes aprobar la evaluación con nota mínima {nota_minima}"
                resultado["evaluacion_pendiente"] = True
                return resultado
    
    return resultado


# =============================================
# ⚠️ ENDPOINTS ESTÁTICOS - DEBEN IR ANTES DE /{id}
# =============================================

@router.get("/mis-cursos", response_model=List[InscripcionCursoResponse])
async def mis_cursos(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """Lista las inscripciones del usuario actual"""
    try:
        inscripciones = db.query(InscripcionCurso).filter(
            cast(InscripcionCurso.estudiante_id, String) == str(current_user.id)
        ).order_by(InscripcionCurso.created_at.desc()).all()
        
        return [
            {
                "id": str(insc.id),
                "curso_id": str(insc.curso_id),
                "estudiante_id": str(insc.estudiante_id),
                "estudiante_nombre": insc.estudiante_nombre,
                "progreso": insc.progreso or 0,
                "completado": insc.completado or False,
                "lecciones_completadas": insc.lecciones_completadas or [],
                "fecha_inscripcion": insc.fecha_inscripcion,
                "fecha_completado": insc.fecha_completado,
                "created_at": insc.created_at,
            }
            for insc in inscripciones
        ]
    except Exception as e:
        logger.error(f"Error listando inscripciones: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/mis-solicitudes", response_model=List[SolicitudAccesoResponse])
async def mis_solicitudes(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """Estudiante: Lista sus solicitudes de acceso"""
    try:
        solicitudes = db.query(SolicitudAccesoCurso).filter(
            cast(SolicitudAccesoCurso.estudiante_id, String) == str(current_user.id)
        ).order_by(SolicitudAccesoCurso.created_at.desc()).all()
        
        result = []
        for solicitud in solicitudes:
            curso = db.query(Curso).filter(Curso.id == solicitud.curso_id).first()
            result.append({
                "id": str(solicitud.id),
                "curso_id": str(solicitud.curso_id),
                "estudiante_id": str(solicitud.estudiante_id),
                "estudiante_nombre": solicitud.estudiante_nombre,
                "estudiante_email": solicitud.estudiante_email,
                "estudiante_telefono": solicitud.estudiante_telefono,
                "estado": solicitud.estado,
                "mensaje_estudiante": solicitud.mensaje_estudiante,
                "comentario_docente": solicitud.comentario_docente,
                "metodo_pago": solicitud.metodo_pago,
                "referencia_pago": solicitud.referencia_pago,
                "curso_titulo": curso.titulo if curso else None,
                "created_at": solicitud.created_at,
                "updated_at": solicitud.updated_at,
            })
        return result
    except Exception as e:
        logger.error(f"Error listando solicitudes: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/solicitudes-pendientes", response_model=List[SolicitudAccesoResponse])
async def solicitudes_pendientes(
    curso_id: Optional[str] = Query(None, description="Filtrar por curso específico"),
    estado: Optional[str] = Query(None, description="Filtrar por estado: pendiente, aprobado, rechazado"),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_docente)
):
    """Docente: Lista todas las solicitudes de acceso de sus cursos (pendientes, aprobadas y rechazadas)"""
    try:
        query = db.query(SolicitudAccesoCurso).join(
            Curso, SolicitudAccesoCurso.curso_id == Curso.id
        ).filter(
            cast(Curso.docente_id, String) == str(current_user.id)
        )
        
        if estado:
            query = query.filter(SolicitudAccesoCurso.estado == estado)
        
        if curso_id:
            query = query.filter(cast(SolicitudAccesoCurso.curso_id, String) == curso_id)
        
        solicitudes = query.order_by(SolicitudAccesoCurso.created_at.desc()).all()
        
        result = []
        for solicitud in solicitudes:
            curso = db.query(Curso).filter(Curso.id == solicitud.curso_id).first()
            result.append({
                "id": str(solicitud.id),
                "curso_id": str(solicitud.curso_id),
                "estudiante_id": str(solicitud.estudiante_id),
                "estudiante_nombre": solicitud.estudiante_nombre,
                "estudiante_email": solicitud.estudiante_email,
                "estudiante_telefono": solicitud.estudiante_telefono,
                "estado": solicitud.estado,
                "mensaje_estudiante": solicitud.mensaje_estudiante,
                "comentario_docente": solicitud.comentario_docente,
                "metodo_pago": solicitud.metodo_pago,
                "referencia_pago": solicitud.referencia_pago,
                "curso_titulo": curso.titulo if curso else None,
                "created_at": solicitud.created_at,
                "updated_at": solicitud.updated_at,
            })
        return result
    except Exception as e:
        logger.error(f"Error listando solicitudes pendientes: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/solicitudes/{solicitud_id}/aprobar", response_model=SolicitudAccesoResponse)
async def aprobar_solicitud(
    solicitud_id: str,
    data: SolicitudAccesoUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_docente)
):
    """Docente: Aprueba una solicitud de acceso y activa el curso"""
    try:
        solicitud = db.query(SolicitudAccesoCurso).filter(
            SolicitudAccesoCurso.id == solicitud_id
        ).first()
        if not solicitud:
            raise HTTPException(status_code=404, detail="Solicitud no encontrada")
        
        curso = db.query(Curso).filter(Curso.id == solicitud.curso_id).first()
        if not curso or str(curso.docente_id) != str(current_user.id):
            raise HTTPException(status_code=403, detail="No tienes permiso para gestionar esta solicitud")
        
        if solicitud.estado != "pendiente":
            raise HTTPException(status_code=400, detail="Esta solicitud ya fue procesada")
        
        # Actualizar solicitud
        solicitud.estado = "aprobado"
        solicitud.comentario_docente = data.comentario_docente
        db.commit()
        db.refresh(solicitud)
        
        # Crear acceso
        acceso = AccesoCurso(
            id=str(uuid.uuid4()),
            curso_id=str(solicitud.curso_id),
            estudiante_id=str(solicitud.estudiante_id),
            estudiante_nombre=solicitud.estudiante_nombre,
            activo=True,
            tipo_acceso="vitalicio",
            fecha_inicio=datetime.now(timezone.utc),
            activado_por=str(current_user.id),
            comentario=f"Solicitud aprobada: {data.comentario_docente or 'Sin comentario'}"
        )
        db.add(acceso)
        
        # Buscar o crear inscripción - CON CAST A STRING
        inscripcion = db.query(InscripcionCurso).filter(
            cast(InscripcionCurso.curso_id, String) == str(solicitud.curso_id),
            cast(InscripcionCurso.estudiante_id, String) == str(solicitud.estudiante_id)
        ).first()
        
        if not inscripcion:
            inscripcion = InscripcionCurso(
                id=str(uuid.uuid4()),
                curso_id=str(solicitud.curso_id),
                estudiante_id=str(solicitud.estudiante_id),
                estudiante_nombre=solicitud.estudiante_nombre,
                progreso=0,
                completado=False,
                lecciones_completadas=[]
            )
            db.add(inscripcion)
            curso.estudiantes_count = (curso.estudiantes_count or 0) + 1
        
        db.commit()
        db.refresh(solicitud)
        
        logger.info(f"Docente {current_user.id} aprobo solicitud {solicitud_id} para estudiante {solicitud.estudiante_id}")
        
        return {
            "id": str(solicitud.id),
            "curso_id": str(solicitud.curso_id),
            "estudiante_id": str(solicitud.estudiante_id),
            "estudiante_nombre": solicitud.estudiante_nombre,
            "estudiante_email": solicitud.estudiante_email,
            "estudiante_telefono": solicitud.estudiante_telefono,
            "estado": solicitud.estado,
            "mensaje_estudiante": solicitud.mensaje_estudiante,
            "comentario_docente": solicitud.comentario_docente,
            "metodo_pago": solicitud.metodo_pago,
            "referencia_pago": solicitud.referencia_pago,
            "curso_titulo": curso.titulo,
            "created_at": solicitud.created_at,
            "updated_at": solicitud.updated_at,
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error aprobando solicitud: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/solicitudes/{solicitud_id}/rechazar", response_model=SolicitudAccesoResponse)
async def rechazar_solicitud(
    solicitud_id: str,
    data: SolicitudAccesoUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_docente)
):
    """Docente: Rechaza una solicitud de acceso"""
    try:
        solicitud = db.query(SolicitudAccesoCurso).filter(
            SolicitudAccesoCurso.id == solicitud_id
        ).first()
        if not solicitud:
            raise HTTPException(status_code=404, detail="Solicitud no encontrada")
        
        curso = db.query(Curso).filter(Curso.id == solicitud.curso_id).first()
        if not curso or str(curso.docente_id) != str(current_user.id):
            raise HTTPException(status_code=403, detail="No tienes permiso para gestionar esta solicitud")
        
        if solicitud.estado != "pendiente":
            raise HTTPException(status_code=400, detail="Esta solicitud ya fue procesada")
        
        solicitud.estado = "rechazado"
        solicitud.comentario_docente = data.comentario_docente
        db.commit()
        db.refresh(solicitud)
        
        logger.info(f"Docente {current_user.id} rechazo solicitud {solicitud_id}")
        
        return {
            "id": str(solicitud.id),
            "curso_id": str(solicitud.curso_id),
            "estudiante_id": str(solicitud.estudiante_id),
            "estudiante_nombre": solicitud.estudiante_nombre,
            "estudiante_email": solicitud.estudiante_email,
            "estudiante_telefono": solicitud.estudiante_telefono,
            "estado": solicitud.estado,
            "mensaje_estudiante": solicitud.mensaje_estudiante,
            "comentario_docente": solicitud.comentario_docente,
            "metodo_pago": solicitud.metodo_pago,
            "referencia_pago": solicitud.referencia_pago,
            "curso_titulo": curso.titulo,
            "created_at": solicitud.created_at,
            "updated_at": solicitud.updated_at,
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error rechazando solicitud: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =============================================
# ENDPOINTS CON SUB-RUTAS - DEBEN IR ANTES DE /{id}
# =============================================

@router.post("/{id}/solicitar-acceso", response_model=SolicitudAccesoResponse)
async def solicitar_acceso_curso(
    id: str,
    data: SolicitudAccesoCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """Estudiante: Solicita acceso a un curso pago"""
    try:
        curso = db.query(Curso).filter(Curso.id == id).first()
        if not curso:
            raise HTTPException(status_code=404, detail="Curso no encontrado")
        
        if curso.precio_tipo != "pago":
            raise HTTPException(status_code=400, detail="Este curso es gratuito, puedes inscribirte directamente")
        
        if _verificar_acceso(db, id, str(current_user.id)):
            raise HTTPException(status_code=400, detail="Ya tienes acceso a este curso")
        
        if _tiene_solicitud_pendiente(db, id, str(current_user.id)):
            raise HTTPException(status_code=400, detail="Ya tienes una solicitud pendiente para este curso")
        
        solicitud = SolicitudAccesoCurso(
            id=str(uuid.uuid4()),
            curso_id=id,
            estudiante_id=str(current_user.id),
            estudiante_nombre=current_user.nombre_completo,
            estudiante_email=current_user.email,
            estudiante_telefono=getattr(current_user, 'telefono', None),
            mensaje_estudiante=data.mensaje_estudiante,
            metodo_pago=data.metodo_pago,
            referencia_pago=data.referencia_pago,
            estado="pendiente"
        )
        db.add(solicitud)
        db.commit()
        db.refresh(solicitud)
        
        logger.info(f"Estudiante {current_user.id} solicito acceso al curso {id}")
        
        return {
            "id": str(solicitud.id),
            "curso_id": str(solicitud.curso_id),
            "estudiante_id": str(solicitud.estudiante_id),
            "estudiante_nombre": solicitud.estudiante_nombre,
            "estudiante_email": solicitud.estudiante_email,
            "estudiante_telefono": solicitud.estudiante_telefono,
            "estado": solicitud.estado,
            "mensaje_estudiante": solicitud.mensaje_estudiante,
            "comentario_docente": solicitud.comentario_docente,
            "metodo_pago": solicitud.metodo_pago,
            "referencia_pago": solicitud.referencia_pago,
            "curso_titulo": curso.titulo,
            "created_at": solicitud.created_at,
            "updated_at": solicitud.updated_at,
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error solicitando acceso: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{id}/inscribirse", response_model=InscripcionCursoResponse)
async def inscribirse_curso(
    id: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """Inscribe al usuario actual en un curso (solo si tiene acceso o es gratuito)"""
    try:
        curso = db.query(Curso).filter(Curso.id == id).first()
        if not curso:
            raise HTTPException(status_code=404, detail="Curso no encontrado")
        
        if curso.precio_tipo == "pago":
            tiene_acceso = _verificar_acceso(db, id, str(current_user.id))
            if not tiene_acceso:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Este curso requiere pago. Solicita acceso al docente."
                )
        
        inscripcion = db.query(InscripcionCurso).filter(
            cast(InscripcionCurso.curso_id, String) == id,
            cast(InscripcionCurso.estudiante_id, String) == str(current_user.id)
        ).first()
        if inscripcion:
            return {
                "id": str(inscripcion.id),
                "curso_id": str(inscripcion.curso_id),
                "estudiante_id": str(inscripcion.estudiante_id),
                "estudiante_nombre": inscripcion.estudiante_nombre,
                "progreso": inscripcion.progreso or 0,
                "completado": inscripcion.completado or False,
                "lecciones_completadas": inscripcion.lecciones_completadas or [],
                "fecha_inscripcion": inscripcion.fecha_inscripcion,
                "fecha_completado": inscripcion.fecha_completado,
                "created_at": inscripcion.created_at,
            }

        inscripcion = InscripcionCurso(
            id=str(uuid.uuid4()),
            curso_id=id,
            estudiante_id=str(current_user.id),
            estudiante_nombre=current_user.nombre_completo,
            progreso=0,
            completado=False,
            lecciones_completadas=[]
        )
        db.add(inscripcion)
        curso.estudiantes_count = (curso.estudiantes_count or 0) + 1
        db.commit()
        db.refresh(inscripcion)
        logger.info(f"Usuario {current_user.id} inscrito en curso {id}")
        
        return {
            "id": str(inscripcion.id),
            "curso_id": str(inscripcion.curso_id),
            "estudiante_id": str(inscripcion.estudiante_id),
            "estudiante_nombre": inscripcion.estudiante_nombre,
            "progreso": inscripcion.progreso or 0,
            "completado": inscripcion.completado or False,
            "lecciones_completadas": inscripcion.lecciones_completadas or [],
            "fecha_inscripcion": inscripcion.fecha_inscripcion,
            "fecha_completado": inscripcion.fecha_completado,
            "created_at": inscripcion.created_at,
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error inscribiendo usuario: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{id}/inscripcion", response_model=MensajeResponse)
async def desinscribirse_curso(
    id: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """Elimina la inscripcion del usuario actual en un curso"""
    try:
        inscripcion = db.query(InscripcionCurso).filter(
            cast(InscripcionCurso.curso_id, String) == id,
            cast(InscripcionCurso.estudiante_id, String) == str(current_user.id)
        ).first()
        if not inscripcion:
            return {"mensaje": "No estas inscrito en este curso", "ok": False}

        curso = db.query(Curso).filter(Curso.id == id).first()
        if curso and (curso.estudiantes_count or 0) > 0:
            curso.estudiantes_count -= 1
        db.delete(inscripcion)
        db.commit()
        return {"mensaje": "Inscripcion eliminada", "ok": True}
    except Exception as e:
        db.rollback()
        logger.error(f"Error desinscribiendo usuario: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{id}/inscripcion/{estudiante_id}", response_model=MensajeResponse)
async def desinscribir_estudiante_docente(
    id: str,
    estudiante_id: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_docente)
):
    """Docente: Desinscribe a un estudiante del curso (elimina inscripción + acceso + progreso)"""
    try:
        curso = db.query(Curso).filter(Curso.id == id).first()
        if not curso:
            raise HTTPException(status_code=404, detail="Curso no encontrado")

        if str(curso.docente_id) != str(current_user.id) and current_user.rol != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permiso para gestionar los estudiantes de este curso"
            )

        # Eliminar acceso
        acceso = db.query(AccesoCurso).filter(
            AccesoCurso.curso_id == id,
            cast(AccesoCurso.estudiante_id, String) == estudiante_id
        ).first()
        if acceso:
            db.delete(acceso)

        # Eliminar inscripción
        inscripcion = db.query(InscripcionCurso).filter(
            cast(InscripcionCurso.curso_id, String) == id,
            cast(InscripcionCurso.estudiante_id, String) == estudiante_id
        ).first()
        if inscripcion:
            db.delete(inscripcion)

        # Eliminar progreso
        progresos = db.query(ProgresoLeccion).filter(
            cast(ProgresoLeccion.curso_id, String) == id,
            cast(ProgresoLeccion.estudiante_id, String) == estudiante_id
        ).all()
        for p in progresos:
            db.delete(p)

        # Decrementar contador si corresponde
        if not inscripcion and not acceso:
            # Sin registros previos: nada que hacer
            db.commit()
            return {"mensaje": "El estudiante no está inscrito en este curso", "ok": False}

        if (curso.estudiantes_count or 0) > 0:
            curso.estudiantes_count = max(0, (curso.estudiantes_count or 0) - 1)

        db.commit()
        return {"mensaje": "Estudiante desinscrito del curso", "ok": True}

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error desinscribiendo estudiante: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{curso_id}/calificaciones/{estudiante_id}/{leccion_id}", response_model=dict)
async def asignar_nota_manual(
    curso_id: str,
    estudiante_id: str,
    leccion_id: str,
    data: AsignarNotaRequest,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_docente)
):
    """Docente: Asigna una nota manual a una lección de un estudiante y recalcula el progreso"""
    try:
        curso = db.query(Curso).filter(Curso.id == curso_id).first()
        if not curso:
            raise HTTPException(status_code=404, detail="Curso no encontrado")

        if str(curso.docente_id) != str(current_user.id) and current_user.rol != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permiso para calificar en este curso"
            )

        # Validar que la lección existe
        leccion, _, modulo = _encontrar_leccion_y_anterior(curso, leccion_id)
        if leccion is None:
            raise HTTPException(status_code=404, detail="Lección no encontrada en el curso")

        progreso = _get_progreso_leccion(db, curso_id, estudiante_id, leccion_id)
        progreso.curso_id = curso_id
        progreso.estudiante_id = estudiante_id
        progreso.leccion_id = leccion_id
        progreso.modulo_id = data.modulo_id or modulo.get("id")

        if data.nota is not None:
            progreso.nota = data.nota
            progreso.aprobado = bool(data.aprobado) if data.aprobado is not None else (data.nota >= 10)
        if data.completado is not None:
            progreso.completado = data.completado
            if data.completado and not progreso.fecha_completado:
                progreso.fecha_completado = datetime.now(timezone.utc)

        db.commit()
        db.refresh(progreso)

        # Recalcular progreso y posibles certificados
        _actualizar_progreso_curso(db, curso_id, estudiante_id)

        return {
            "estudiante_id": estudiante_id,
            "leccion_id": leccion_id,
            "nota": float(progreso.nota) if progreso.nota else None,
            "aprobado": bool(progreso.aprobado),
            "completado": bool(progreso.completado),
            "mensaje": "Calificación guardada correctamente"
        }

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error asignando nota manual: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{id}/publicar", response_model=CursoResponse)
async def publicar_curso(
    id: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_docente)
):
    """Publica un curso (solo docente o admin)"""
    try:
        curso = db.query(Curso).filter(Curso.id == id).first()
        if not curso:
            raise HTTPException(status_code=404, detail="Curso no encontrado")
        
        if str(curso.docente_id) != str(current_user.id) and current_user.rol != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permiso para publicar este curso"
            )
        
        curso.estado = "PUBLICADO"
        db.commit()
        db.refresh(curso)
        
        usuario_id = str(current_user.id)
        tiene_acceso = _verificar_acceso(db, id, usuario_id)
        tiene_solicitud_pendiente = _tiene_solicitud_pendiente(db, id, usuario_id)
        
        if str(curso.docente_id) == usuario_id:
            tiene_acceso = True
            tiene_solicitud_pendiente = False
        
        return _curso_to_dict(curso, tiene_acceso, tiene_solicitud_pendiente)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error publicando curso: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{id}/accesos", response_model=List[AccesoCursoResponse])
async def listar_accesos_curso(
    id: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_docente)
):
    """Docente: Lista todos los accesos de un curso"""
    try:
        curso = db.query(Curso).filter(Curso.id == id).first()
        if not curso:
            raise HTTPException(status_code=404, detail="Curso no encontrado")
        
        if str(curso.docente_id) != str(current_user.id) and current_user.rol != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permiso para ver los accesos de este curso"
            )
        
        accesos = db.query(AccesoCurso).filter(
            AccesoCurso.curso_id == id
        ).order_by(AccesoCurso.created_at.desc()).all()
        
        return accesos
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listando accesos: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{id}/estudiantes", response_model=dict)
async def listar_estudiantes_curso(
    id: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_docente)
):
    """Docente: Lista los estudiantes del curso con su progreso e inscripción (vista unificada)"""
    try:
        curso = db.query(Curso).filter(Curso.id == id).first()
        if not curso:
            raise HTTPException(status_code=404, detail="Curso no encontrado")
        
        if str(curso.docente_id) != str(current_user.id) and current_user.rol != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permiso para ver los estudiantes de este curso"
            )
        
        accesos = db.query(AccesoCurso).filter(
            AccesoCurso.curso_id == id,
            AccesoCurso.activo == True
        ).all()
        
        inscripciones = db.query(InscripcionCurso).filter(
            cast(InscripcionCurso.curso_id, String) == id
        ).all()
        inscripcion_por_estudiante = {str(ins.estudiante_id): ins for ins in inscripciones}
        
        # Progreso por estudiante en una sola consulta
        progresos = db.query(ProgresoLeccion).filter(
            cast(ProgresoLeccion.curso_id, String) == id,
            ProgresoLeccion.completado == True
        ).all()
        completadas_por_estudiante = {}
        for p in progresos:
            completadas_por_estudiante[str(p.estudiante_id)] = completadas_por_estudiante.get(str(p.estudiante_id), 0) + 1
        
        # Total de lecciones del curso
        total_lecciones = sum(len(m.get("lecciones", [])) for m in (curso.modulos or []))
        
        estudiantes = []
        for acceso in accesos:
            estudiante_id = str(acceso.estudiante_id)
            insc = inscripcion_por_estudiante.get(estudiante_id)
            completadas = completadas_por_estudiante.get(estudiante_id, 0)
            progreso_calculado = int((completadas / total_lecciones) * 100) if total_lecciones > 0 else (insc.progreso if insc else 0)
            
            estudiantes.append({
                "estudiante_id": estudiante_id,
                "estudiante_nombre": acceso.estudiante_nombre or (insc.estudiante_nombre if insc else ""),
                "acceso_activo": True,
                "tipo_acceso": acceso.tipo_acceso,
                "fecha_inicio": acceso.fecha_inicio,
                "fecha_expiracion": acceso.fecha_expiracion,
                "ultimo_acceso": acceso.ultimo_acceso,
                "progreso": min(progreso_calculado, 100),
                "completado": bool(insc.completado) if insc else (completadas >= total_lecciones > 0),
                "lecciones_completadas": completadas,
                "lecciones_totales": total_lecciones,
                "fecha_inscripcion": insc.fecha_inscripcion if insc else None,
            })
        
        return {
            "curso_id": id,
            "curso_titulo": curso.titulo,
            "total_estudiantes": len(estudiantes),
            "estudiantes": estudiantes
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listando estudiantes del curso: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{id}/estudiantes/exportar")
async def exportar_estudiantes_csv(
    id: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_docente)
):
    """Docente: Exporta los estudiantes del curso a CSV (con progreso y notas)"""
    try:
        curso = db.query(Curso).filter(Curso.id == id).first()
        if not curso:
            raise HTTPException(status_code=404, detail="Curso no encontrado")

        if str(curso.docente_id) != str(current_user.id) and current_user.rol != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permiso para exportar los estudiantes de este curso"
            )

        accesos = db.query(AccesoCurso).filter(
            AccesoCurso.curso_id == id,
            AccesoCurso.activo == True
        ).all()

        inscripciones = db.query(InscripcionCurso).filter(
            cast(InscripcionCurso.curso_id, String) == id
        ).all()
        inscripcion_por_estudiante = {str(ins.estudiante_id): ins for ins in inscripciones}

        # Progreso completo (todas las lecciones con nota) para el detalle de calificaciones
        progresos = db.query(ProgresoLeccion).filter(
            cast(ProgresoLeccion.curso_id, String) == id,
            ProgresoLeccion.completado == True
        ).all()
        completadas_por_estudiante = {}
        for p in progresos:
            completadas_por_estudiante[str(p.estudiante_id)] = completadas_por_estudiante.get(str(p.estudiante_id), 0) + 1

        total_lecciones = sum(len(m.get("lecciones", [])) for m in (curso.modulos or []))

        # Filas CSV
        filas = []
        for acceso in accesos:
            estudiante_id = str(acceso.estudiante_id)
            insc = inscripcion_por_estudiante.get(estudiante_id)
            completadas = completadas_por_estudiante.get(estudiante_id, 0)
            progreso_calculado = int((completadas / total_lecciones) * 100) if total_lecciones > 0 else (insc.progreso if insc else 0)

            filas.append({
                "estudiante_id": estudiante_id,
                "estudiante_nombre": (acceso.estudiante_nombre or (insc.estudiante_nombre if insc else "") or "Sin nombre"),
                "tipo_acceso": acceso.tipo_acceso or "",
                "fecha_inscripcion": (insc.fecha_inscripcion.strftime("%Y-%m-%d") if insc and insc.fecha_inscripcion else ""),
                "ultimo_acceso": (acceso.ultimo_acceso.strftime("%Y-%m-%d %H:%M") if acceso.ultimo_acceso else ""),
                "lecciones_completadas": completadas,
                "lecciones_totales": total_lecciones,
                "progreso_porcentaje": min(progreso_calculado, 100),
                "completado": "SI" if (insc.completado if insc else (completadas >= total_lecciones > 0)) else "NO",
            })

        # Construir CSV
        buffer = io.StringIO()
        writer = csv.DictWriter(
            buffer,
            fieldnames=[
                "estudiante_id", "estudiante_nombre", "tipo_acceso",
                "fecha_inscripcion", "ultimo_acceso",
                "lecciones_completadas", "lecciones_totales",
                "progreso_porcentaje", "completado"
            ]
        )
        writer.writeheader()
        writer.writerows(filas)

        nombre_archivo = f"estudiantes_{id}.csv"
        return Response(
            content=buffer.getvalue(),
            media_type="text/csv; charset=utf-8",
            headers={
                "Content-Disposition": f'attachment; filename="{nombre_archivo}"',
                "Access-Control-Expose-Headers": "Content-Disposition",
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error exportando estudiantes del curso: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{id}/acceso", response_model=AccesoCursoResponse)
async def activar_acceso_directo(
    id: str,
    data: AccesoCursoCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_docente)
):
    """Docente: Activa acceso directo a un estudiante (sin solicitud)"""
    try:
        curso = db.query(Curso).filter(Curso.id == id).first()
        if not curso:
            raise HTTPException(status_code=404, detail="Curso no encontrado")
        
        if str(curso.docente_id) != str(current_user.id) and current_user.rol != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permiso para activar acceso a este curso"
            )
        
        acceso_existente = db.query(AccesoCurso).filter(
            cast(AccesoCurso.curso_id, String) == id,
            cast(AccesoCurso.estudiante_id, String) == data.estudiante_id
        ).first()
        
        if acceso_existente and acceso_existente.activo:
            raise HTTPException(status_code=400, detail="El estudiante ya tiene acceso activo")
        
        if acceso_existente:
            acceso_existente.activo = True
            acceso_existente.fecha_inicio = datetime.now(timezone.utc)
            acceso_existente.fecha_expiracion = data.fecha_expiracion
            acceso_existente.comentario = data.comentario
            acceso_existente.activado_por = str(current_user.id)
            db.commit()
            db.refresh(acceso_existente)
            return acceso_existente
        
        acceso = AccesoCurso(
            id=str(uuid.uuid4()),
            curso_id=id,
            estudiante_id=data.estudiante_id,
            tipo_acceso=data.tipo_acceso or "vitalicio",
            sesiones_restantes=data.sesiones_restantes,
            fecha_inicio=datetime.now(timezone.utc),
            fecha_expiracion=data.fecha_expiracion,
            comentario=data.comentario,
            activo=True,
            activado_por=str(current_user.id)
        )
        db.add(acceso)
        
        inscripcion = db.query(InscripcionCurso).filter(
            cast(InscripcionCurso.curso_id, String) == id,
            cast(InscripcionCurso.estudiante_id, String) == data.estudiante_id
        ).first()
        
        if not inscripcion:
            estudiante = db.query(Usuario).filter(Usuario.id == data.estudiante_id).first()
            inscripcion = InscripcionCurso(
                id=str(uuid.uuid4()),
                curso_id=id,
                estudiante_id=data.estudiante_id,
                estudiante_nombre=estudiante.nombre_completo if estudiante else "",
                progreso=0,
                completado=False,
                lecciones_completadas=[]
            )
            db.add(inscripcion)
            curso.estudiantes_count = (curso.estudiantes_count or 0) + 1
        
        db.commit()
        db.refresh(acceso)
        
        logger.info(f"Acceso directo activado para estudiante {data.estudiante_id} en curso {id}")
        return acceso
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error activando acceso directo: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{id}/acceso/{estudiante_id}", response_model=MensajeResponse)
async def desactivar_acceso(
    id: str,
    estudiante_id: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_docente)
):
    """Docente: Desactiva el acceso de un estudiante"""
    try:
        curso = db.query(Curso).filter(Curso.id == id).first()
        if not curso:
            raise HTTPException(status_code=404, detail="Curso no encontrado")
        
        if str(curso.docente_id) != str(current_user.id) and current_user.rol != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permiso para desactivar acceso a este curso"
            )
        
        acceso = db.query(AccesoCurso).filter(
            cast(AccesoCurso.curso_id, String) == id,
            cast(AccesoCurso.estudiante_id, String) == estudiante_id,
            AccesoCurso.activo == True
        ).first()
        
        if not acceso:
            raise HTTPException(status_code=404, detail="Acceso no encontrado o ya inactivo")
        
        acceso.activo = False
        acceso.comentario = f"Desactivado por docente {current_user.nombre_completo}"
        db.commit()
        
        logger.info(f"Acceso desactivado para estudiante {estudiante_id} en curso {id}")
        return {"mensaje": "Acceso desactivado correctamente", "ok": True}
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error desactivando acceso: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{id}/tiene-acceso/{estudiante_id}", response_model=dict)
async def verificar_acceso_estudiante(
    id: str,
    estudiante_id: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """Verifica si un estudiante tiene acceso a un curso"""
    try:
        if str(current_user.id) != estudiante_id:
            curso = db.query(Curso).filter(Curso.id == id).first()
            if not curso or (str(curso.docente_id) != str(current_user.id) and current_user.rol != "admin"):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="No tienes permiso para verificar el acceso de este estudiante"
                )
        
        tiene_acceso = _verificar_acceso(db, id, estudiante_id)
        return {"tiene_acceso": tiene_acceso}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error verificando acceso: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{curso_id}/progreso/{usuario_id}", response_model=ProgresoCursoResponse)
async def obtener_progreso(
    curso_id: str,
    usuario_id: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """Obtiene el progreso de un usuario en un curso"""
    try:
        if str(current_user.id) != str(usuario_id) and current_user.rol not in ["admin", "docente"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permiso para ver este progreso"
            )
        
        curso = db.query(Curso).filter(Curso.id == curso_id).first()
        if not curso:
            raise HTTPException(status_code=404, detail="Curso no encontrado")
        
        if curso.precio_tipo == "pago" and current_user.rol not in ["admin", "docente"]:
            tiene_acceso = _verificar_acceso(db, curso_id, str(current_user.id))
            if not tiene_acceso:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Este curso requiere pago. Solicita acceso al docente."
                )
        
        inscripcion = db.query(InscripcionCurso).filter(
            cast(InscripcionCurso.curso_id, String) == curso_id,
            cast(InscripcionCurso.estudiante_id, String) == usuario_id
        ).first()
        if not inscripcion:
            return {
                "curso_id": curso_id,
                "usuario_id": usuario_id,
                "progreso": 0,
                "lecciones_completadas": [],
                "completado": False,
                "mensaje": "No inscrito"
            }
        return {
            "curso_id": curso_id,
            "usuario_id": usuario_id,
            "progreso": inscripcion.progreso or 0,
            "lecciones_completadas": inscripcion.lecciones_completadas or [],
            "completado": inscripcion.completado or False,
            "mensaje": None
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error obteniendo progreso: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{curso_id}/progreso-detallado", response_model=dict)
async def obtener_progreso_detallado(
    curso_id: str,
    estudiante_id: Optional[str] = Query(None, description="ID del estudiante a consultar (solo admin/docente)"),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """Obtiene el progreso detallado del estudiante en el curso.
    
    - El estudiante ve su propio progreso.
    - Admin/docente pueden consultar el de cualquier estudiante con ?estudiante_id=...
    """
    try:
        curso = db.query(Curso).filter(Curso.id == curso_id).first()
        if not curso:
            raise HTTPException(status_code=404, detail="Curso no encontrado")
        
        # Determinar el estudiante a consultar
        if estudiante_id and str(estudiante_id) != str(current_user.id):
            if current_user.rol not in ["admin", "docente"]:
                raise HTTPException(status_code=403, detail="No puedes ver el progreso de otro estudiante")
            if str(curso.docente_id) != str(current_user.id) and current_user.rol != "admin":
                raise HTTPException(status_code=403, detail="No tienes permiso para ver el progreso de este curso")
            usuario_a_consultar = str(estudiante_id)
        else:
            usuario_a_consultar = str(current_user.id)
        
        if curso.precio_tipo == "pago":
            tiene_acceso = _verificar_acceso(db, curso_id, usuario_a_consultar)
            if not tiene_acceso and current_user.rol not in ["admin", "docente"]:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="No tienes acceso a este curso"
                )
        
        progresos = db.query(ProgresoLeccion).filter(
            ProgresoLeccion.curso_id == curso_id,
            ProgresoLeccion.estudiante_id == usuario_a_consultar
        ).all()
        
        progreso_dict = {p.leccion_id: p for p in progresos}
        
        resultado = {
            "curso_id": curso_id,
            "estudiante_id": usuario_a_consultar,
            "modulos": [],
            "progreso_total": 0,
            "lecciones_completadas": 0,
            "lecciones_totales": 0,
            "bloqueo_activo": False
        }
        
        total_lecciones = 0
        completadas = 0
        
        for modulo in curso.modulos or []:
            modulo_data = {
                "id": modulo.get("id"),
                "titulo": modulo.get("titulo"),
                "lecciones": []
            }
            
            for leccion in modulo.get("lecciones", []):
                leccion_id = leccion.get("id")
                prog = progreso_dict.get(leccion_id)
                
                leccion_data = {
                    "id": leccion_id,
                    "titulo": leccion.get("titulo"),
                    "tipo": leccion.get("tipo"),
                    "completado": prog.completado if prog else False,
                    "aprobado": prog.aprobado if prog else False,
                    "nota": float(prog.nota) if prog and prog.nota else None,
                    "intentos": prog.intentos if prog else 0,
                    "tiempo_invertido": prog.tiempo_invertido if prog else 0,
                    "fecha_completado": prog.fecha_completado if prog else None,
                    "bloqueada": False,
                    "razon_bloqueo": None
                }
                
                if curso.tipo_bloqueo != "ninguno":
                    bloqueo = _verificar_bloqueo_leccion_internal(
                        db, curso, leccion_id, usuario_a_consultar, current_user.rol
                    )
                    if bloqueo.get("bloqueada"):
                        leccion_data["bloqueada"] = True
                        leccion_data["razon_bloqueo"] = bloqueo.get("razon")
                
                modulo_data["lecciones"].append(leccion_data)
                total_lecciones += 1
                if prog and prog.completado:
                    completadas += 1
            
            resultado["modulos"].append(modulo_data)
        
        resultado["lecciones_totales"] = total_lecciones
        resultado["lecciones_completadas"] = completadas
        resultado["progreso_total"] = int((completadas / total_lecciones * 100)) if total_lecciones > 0 else 0
        
        return resultado
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error obteniendo progreso detallado: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =============================================
# COMPLETAR LECCIÓN, PROGRESO, EVALUACIONES Y BLOQUEOS
# =============================================

@router.post("/{curso_id}/lecciones/{leccion_id}/completar", response_model=dict)
async def completar_leccion(
    curso_id: str,
    leccion_id: str,
    data: LeccionCompletarRequest,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """Marca una lección como completada para el estudiante y recalcula el progreso del curso"""
    try:
        curso = db.query(Curso).filter(Curso.id == curso_id).first()
        if not curso:
            raise HTTPException(status_code=404, detail="Curso no encontrado")
        
        # El estudiante solo completa para sí mismo; docente/admin pueden completar en nombre de otro
        if data.usuario_id and str(data.usuario_id) != str(current_user.id):
            if current_user.rol not in ["admin", "docente"]:
                raise HTTPException(status_code=403, detail="No puedes completar lecciones por otro usuario")
            estudiante_id = str(data.usuario_id)
        else:
            estudiante_id = str(current_user.id)
        
        # Verificar acceso (para estudiantes)
        if current_user.rol not in ["admin", "docente"]:
            tiene_acceso = _verificar_acceso(db, curso_id, estudiante_id)
            if not tiene_acceso:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="No tienes acceso a este curso"
                )
        
        # Validar que la lección existe y obtener módulo
        leccion, _, modulo = _encontrar_leccion_y_anterior(curso, leccion_id)
        if leccion is None:
            raise HTTPException(status_code=404, detail="Lección no encontrada en el curso")
        
        # Verificar bloqueo (solo estudiantes)
        if current_user.rol not in ["admin", "docente"]:
            bloqueo = _verificar_bloqueo_leccion_internal(
                db, curso, leccion_id, estudiante_id, current_user.rol
            )
            if bloqueo.get("bloqueada"):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Lección bloqueada: {bloqueo.get('razon', 'Sin permiso para completar esta lección aún')}"
                )
        
        # Obtener o crear el progreso de la lección
        progreso = _get_progreso_leccion(db, curso_id, estudiante_id, leccion_id)
        progreso.curso_id = curso_id
        progreso.estudiante_id = estudiante_id
        progreso.leccion_id = leccion_id
        progreso.modulo_id = data.modulo_id or modulo.get("id")
        
        if not progreso.completado:
            progreso.completado = True
            progreso.fecha_completado = datetime.now(timezone.utc)
        if data.tiempo_invertido:
            progreso.tiempo_invertido = (progreso.tiempo_invertido or 0) + data.tiempo_invertido
        if not progreso.fecha_liberacion:
            progreso.fecha_liberacion = datetime.now(timezone.utc)
        # FASE F: persistir nota/aprobado de la evaluación embebida
        if data.nota is not None:
            progreso.nota = data.nota
            progreso.aprobado = bool(data.aprobado) if data.aprobado is not None else (data.nota >= 10)
        
        db.commit()
        
        # Actualizar lista de lecciones completadas en la inscripción
        inscripcion = db.query(InscripcionCurso).filter(
            cast(InscripcionCurso.curso_id, String) == curso_id,
            cast(InscripcionCurso.estudiante_id, String) == estudiante_id
        ).first()
        
        if not inscripcion:
            inscripcion = InscripcionCurso(
                id=str(uuid.uuid4()),
                curso_id=curso_id,
                estudiante_id=estudiante_id,
                estudiante_nombre=current_user.nombre_completo,
                progreso=0,
                completado=False,
                lecciones_completadas=[]
            )
            db.add(inscripcion)
        
        lecciones_lista = list(inscripcion.lecciones_completadas or [])
        if leccion_id not in lecciones_lista:
            lecciones_lista.append(leccion_id)
        inscripcion.lecciones_completadas = lecciones_lista
        db.commit()
        
        # Recalcular progreso global
        _actualizar_progreso_curso(db, curso_id, estudiante_id)
        db.refresh(inscripcion)
        
        return {
            "curso_id": curso_id,
            "usuario_id": estudiante_id,
            "leccion_id": leccion_id,
            "modulo_id": progreso.modulo_id,
            "completado": True,
            "progreso": inscripcion.progreso or 0,
            "completado_curso": bool(inscripcion.completado),
            "lecciones_completadas": inscripcion.lecciones_completadas or [],
            "mensaje": "Lección completada correctamente"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error completando lección: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{curso_id}/lecciones/{leccion_id}/progreso", response_model=ProgresoLeccionResponse)
async def actualizar_progreso_leccion(
    curso_id: str,
    leccion_id: str,
    data: ProgresoLeccionUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """Actualiza el progreso de una lección (nota, aprobado, tiempo, completado)"""
    try:
        curso = db.query(Curso).filter(Curso.id == curso_id).first()
        if not curso:
            raise HTTPException(status_code=404, detail="Curso no encontrado")
        
        estudiante_id = str(current_user.id)
        
        progreso = _get_progreso_leccion(db, curso_id, estudiante_id, leccion_id)
        progreso.curso_id = curso_id
        progreso.estudiante_id = estudiante_id
        progreso.leccion_id = leccion_id
        
        if data.completado is not None:
            progreso.completado = data.completado
            if data.completado and not progreso.fecha_completado:
                progreso.fecha_completado = datetime.now(timezone.utc)
        if data.tiempo_invertido is not None:
            progreso.tiempo_invertido = data.tiempo_invertido
        if data.nota is not None:
            progreso.nota = data.nota
        if data.aprobado is not None:
            progreso.aprobado = data.aprobado
            if data.aprobado and not progreso.fecha_liberacion:
                progreso.fecha_liberacion = datetime.now(timezone.utc)
        
        db.commit()
        db.refresh(progreso)
        
        # Si se marcó completado, actualizar inscripción y recálculo
        if data.completado:
            _actualizar_progreso_curso(db, curso_id, estudiante_id)
        
        return progreso
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error actualizando progreso de lección: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{curso_id}/leccion/{leccion_id}/estado-bloqueo", response_model=LeccionBloqueadaResponse)
async def estado_bloqueo_leccion(
    curso_id: str,
    leccion_id: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """Consulta el estado de bloqueo de una lección para el usuario actual"""
    try:
        curso = db.query(Curso).filter(Curso.id == curso_id).first()
        if not curso:
            raise HTTPException(status_code=404, detail="Curso no encontrado")
        
        bloqueo = _verificar_bloqueo_leccion_internal(
            db, curso, leccion_id, str(current_user.id), current_user.rol
        )
        return bloqueo
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error verificando bloqueo de lección: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{curso_id}/lecciones/{leccion_id}/evaluacion", response_model=EvaluacionLeccionResponse)
async def configurar_evaluacion(
    curso_id: str,
    leccion_id: str,
    data: EvaluacionLeccionCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_docente)
):
    """Docente: Configura la evaluación de una lección (bloqueo por desempeño)"""
    try:
        curso = db.query(Curso).filter(Curso.id == curso_id).first()
        if not curso:
            raise HTTPException(status_code=404, detail="Curso no encontrado")
        
        if str(curso.docente_id) != str(current_user.id) and current_user.rol != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permiso para configurar evaluaciones de este curso"
            )
        
        evaluacion = db.query(EvaluacionLeccion).filter(
            cast(EvaluacionLeccion.curso_id, String) == curso_id,
            cast(EvaluacionLeccion.leccion_id, String) == leccion_id
        ).first()
        
        if evaluacion:
            evaluacion.tipo = data.tipo
            evaluacion.entidad_id = data.entidad_id
            evaluacion.nota_minima = data.nota_minima
            evaluacion.intentos_maximos = data.intentos_maximos
            evaluacion.tiempo_limite = data.tiempo_limite
        else:
            evaluacion = EvaluacionLeccion(
                id=str(uuid.uuid4()),
                curso_id=curso_id,
                leccion_id=leccion_id,
                tipo=data.tipo,
                entidad_id=data.entidad_id,
                nota_minima=data.nota_minima,
                intentos_maximos=data.intentos_maximos,
                tiempo_limite=data.tiempo_limite
            )
            db.add(evaluacion)
        
        db.commit()
        db.refresh(evaluacion)
        return evaluacion
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error configurando evaluación: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{curso_id}/lecciones/{leccion_id}/evaluacion", response_model=Optional[EvaluacionLeccionResponse])
async def obtener_evaluacion(
    curso_id: str,
    leccion_id: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """Obtiene la configuración de evaluación de una lección"""
    try:
        evaluacion = db.query(EvaluacionLeccion).filter(
            cast(EvaluacionLeccion.curso_id, String) == curso_id,
            cast(EvaluacionLeccion.leccion_id, String) == leccion_id
        ).first()
        return evaluacion
        
    except Exception as e:
        logger.error(f"Error obteniendo evaluación: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{curso_id}/lecciones/{leccion_id}/evaluacion", response_model=MensajeResponse)
async def eliminar_evaluacion(
    curso_id: str,
    leccion_id: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_docente)
):
    """Docente: Elimina la configuración de evaluación de una lección"""
    try:
        curso = db.query(Curso).filter(Curso.id == curso_id).first()
        if not curso:
            raise HTTPException(status_code=404, detail="Curso no encontrado")
        
        if str(curso.docente_id) != str(current_user.id) and current_user.rol != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permiso para eliminar evaluaciones de este curso"
            )
        
        evaluacion = db.query(EvaluacionLeccion).filter(
            cast(EvaluacionLeccion.curso_id, String) == curso_id,
            cast(EvaluacionLeccion.leccion_id, String) == leccion_id
        ).first()
        if not evaluacion:
            raise HTTPException(status_code=404, detail="No existe evaluación configurada para esta lección")
        
        db.delete(evaluacion)
        db.commit()
        return {"mensaje": "Evaluación eliminada correctamente", "ok": True}
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error eliminando evaluación: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{curso_id}/lecciones/{leccion_id}/liberar", response_model=ProgresoLeccionResponse)
async def liberar_leccion(
    curso_id: str,
    leccion_id: str,
    data: dict = Body(default={}, description="Body opcional con { estudiante_id: str }"),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_docente)
):
    """Docente: Libera manualmente una lección para un estudiante (fecha_liberacion)"""
    try:
        curso = db.query(Curso).filter(Curso.id == curso_id).first()
        if not curso:
            raise HTTPException(status_code=404, detail="Curso no encontrado")
        
        if str(curso.docente_id) != str(current_user.id) and current_user.rol != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permiso para liberar lecciones de este curso"
            )
        
        estudiante_id = data.get("estudiante_id") if isinstance(data, dict) else None
        if not estudiante_id:
            raise HTTPException(status_code=400, detail="Se requiere estudiante_id para liberar una lección")
        
        estudiante_id = str(estudiante_id)
        progreso = _get_progreso_leccion(db, curso_id, estudiante_id, leccion_id)
        progreso.curso_id = curso_id
        progreso.estudiante_id = estudiante_id
        progreso.leccion_id = leccion_id
        progreso.fecha_liberacion = datetime.now(timezone.utc)
        progreso.completado = True
        if not progreso.fecha_completado:
            progreso.fecha_completado = datetime.now(timezone.utc)
        db.commit()
        db.refresh(progreso)
        
        # Recalcular progreso del estudiante
        _actualizar_progreso_curso(db, curso_id, estudiante_id)
        
        return progreso
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error liberando lección: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =============================================
# ENDPOINTS DE CRUD - DEBEN IR AL FINAL
# =============================================

@router.get("/", response_model=List[CursoResponse])
async def listar_cursos(
    categoria: Optional[str] = Query(None),
    nivel: Optional[str] = Query(None),
    estado: Optional[str] = Query(None),
    docente_id: Optional[str] = Query(None),
    titulo: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """Lista todos los cursos con informacion de acceso para el usuario actual"""
    try:
        query = db.query(Curso)
        if categoria:
            query = query.filter(Curso.categoria == categoria)
        if nivel:
            query = query.filter(Curso.nivel == nivel)
        if estado:
            query = query.filter(func.upper(Curso.estado) == estado.upper())
        if docente_id:
            query = query.filter(Curso.docente_id == docente_id)
        if titulo:
            query = query.filter(Curso.titulo.ilike(f"%{titulo}%"))
        cursos = query.order_by(Curso.created_at.desc()).offset(offset).limit(limit).all()
        
        usuario_id = str(current_user.id)
        
        result = []
        for curso in cursos:
            tiene_acceso = _verificar_acceso(db, curso.id, usuario_id)
            tiene_solicitud_pendiente = _tiene_solicitud_pendiente(db, curso.id, usuario_id)
            
            if str(curso.docente_id) == usuario_id:
                tiene_acceso = True
                tiene_solicitud_pendiente = False
            
            result.append(_curso_to_dict(curso, tiene_acceso, tiene_solicitud_pendiente))
        
        return result
    except Exception as e:
        logger.error(f"Error listando cursos: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{id}", response_model=CursoResponse)
async def obtener_curso(
    id: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """Obtiene un curso por ID con informacion de acceso"""
    try:
        curso = db.query(Curso).filter(Curso.id == id).first()
        if not curso:
            raise HTTPException(status_code=404, detail="Curso no encontrado")
        
        usuario_id = str(current_user.id)
        tiene_acceso = _verificar_acceso(db, id, usuario_id)
        tiene_solicitud_pendiente = _tiene_solicitud_pendiente(db, id, usuario_id)
        
        if str(curso.docente_id) == usuario_id:
            tiene_acceso = True
            tiene_solicitud_pendiente = False
        
        return _curso_to_dict(curso, tiene_acceso, tiene_solicitud_pendiente)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error obteniendo curso: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/", response_model=CursoResponse, status_code=201)
async def crear_curso(
    data: CursoCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_docente)
):
    """Crea un nuevo curso (solo docente o admin)"""
    try:
        curso = Curso(
            id=str(uuid.uuid4()),
            titulo=data.titulo,
            descripcion=data.descripcion,
            categoria=data.categoria or "general",
            nivel=data.nivel or "principiante",
            duracion=data.duracion,
            precio_tipo=data.precio_tipo or "gratis",
            precio_monto=data.precio_monto,
            moneda=data.moneda or "PEN",
            metodo_pago=data.metodo_pago,
            numero_pago=data.numero_pago,
            instrucciones_pago=data.instrucciones_pago,
            docente_id=str(current_user.id),
            docente_nombre=current_user.nombre_completo,
            instructor=data.instructor,
            imagen_url=data.imagen_url,
            estado="BORRADOR",
            modulos=data.modulos or [],
            estudiantes_count=0,
            rating=0,
            rating_count=0,
            etiquetas=data.etiquetas or [],
            requisitos=data.requisitos or [],
            objetivos=data.objetivos or [],
            publico_objetivo=data.publico_objetivo,
            tipo_bloqueo=data.tipo_bloqueo or "ninguno",
            bloqueo_config=data.bloqueo_config or {},
            certificado_habilitado=True if data.certificado_habilitado is None else data.certificado_habilitado,
            certificado_nota_minima=data.certificado_nota_minima
        )
        db.add(curso)
        db.commit()
        db.refresh(curso)
        logger.info(f"Curso creado: {curso.id} - {curso.titulo[:50]}")
        return _curso_to_dict(curso, True, False)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error creando curso: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{id}", response_model=CursoResponse)
async def actualizar_curso(
    id: str,
    data: CursoUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_docente)
):
    """Actualiza un curso (solo docente o admin)"""
    try:
        curso = db.query(Curso).filter(Curso.id == id).first()
        if not curso:
            raise HTTPException(status_code=404, detail="Curso no encontrado")
        
        if str(curso.docente_id) != str(current_user.id) and current_user.rol != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permiso para editar este curso"
            )
        
        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(curso, field, value)
        db.commit()
        db.refresh(curso)
        
        usuario_id = str(current_user.id)
        tiene_acceso = _verificar_acceso(db, id, usuario_id)
        tiene_solicitud_pendiente = _tiene_solicitud_pendiente(db, id, usuario_id)
        
        if str(curso.docente_id) == usuario_id:
            tiene_acceso = True
            tiene_solicitud_pendiente = False
        
        return _curso_to_dict(curso, tiene_acceso, tiene_solicitud_pendiente)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error actualizando curso: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{id}", response_model=MensajeResponse)
async def eliminar_curso(
    id: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_docente)
):
    """Elimina un curso (solo docente o admin)"""
    try:
        curso = db.query(Curso).filter(Curso.id == id).first()
        if not curso:
            raise HTTPException(status_code=404, detail="Curso no encontrado")
        
        if str(curso.docente_id) != str(current_user.id) and current_user.rol != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permiso para eliminar este curso"
            )
        
        db.delete(curso)
        db.commit()
        return {"mensaje": "Curso eliminado correctamente", "ok": True}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error eliminando curso: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =============================================
# ENDPOINT DE SUBIDA DE IMAGEN DE PORTADA
# =============================================

# Constantes para imágenes de portada
ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
MAX_IMAGE_SIZE = 5 * 1024 * 1024  # 5MB
# Dimensiones recomendadas para portada: 1200x628 (landscape, ratio 1.91:1)
# Mínimo: 800x420 | Máximo: 2400x1256
RECOMMENDED_WIDTH = 1200
RECOMMENDED_HEIGHT = 628


@router.post("/{id}/imagen")
async def subir_imagen_curso(
    id: str,
    archivo: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_docente)
):
    """
    Sube una imagen de portada para un curso.
    
    - Formatos permitidos: JPG, JPEG, PNG, WebP
    - Tamaño máximo: 5MB
    - Dimensiones recomendadas: 1200x628 px (ratio 1.91:1)
    - Dimensiones mínimas: 800x420 px
    - Dimensiones máximas: 2400x1256 px
    """
    try:
        # 1. Verificar que el curso existe
        curso = db.query(Curso).filter(Curso.id == id).first()
        if not curso:
            raise HTTPException(status_code=404, detail="Curso no encontrado")
        
        # 2. Verificar permisos
        if str(curso.docente_id) != str(current_user.id) and current_user.rol != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permiso para editar este curso"
            )
        
        # 3. Validar extensión
        if not archivo.filename:
            raise HTTPException(status_code=400, detail="Nombre de archivo no válido")
        
        extension = os.path.splitext(archivo.filename)[1].lower()
        if extension not in ALLOWED_IMAGE_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"Formato no permitido. Usa: {', '.join(ALLOWED_IMAGE_EXTENSIONS)}"
            )
        
        # 4. Validar tipo MIME
        allowed_mimes = {"image/jpeg", "image/png", "image/webp"}
        if archivo.content_type not in allowed_mimes:
            raise HTTPException(
                status_code=400,
                detail=f"Tipo de archivo no permitido: {archivo.content_type}"
            )
        
        # 5. Leer contenido y validar tamaño
        contenido = await archivo.read()
        if len(contenido) > MAX_IMAGE_SIZE:
            size_mb = len(contenido) / (1024 * 1024)
            max_mb = MAX_IMAGE_SIZE / (1024 * 1024)
            raise HTTPException(
                status_code=400,
                detail=f"La imagen pesa {size_mb:.1f}MB. Máximo permitido: {max_mb}MB"
            )
        
        # 6. Validar dimensiones con Pillow
        try:
            from PIL import Image
            import io as _io
            img = Image.open(_io.BytesIO(contenido))
            width, height = img.size
            
            if width < 800 or height < 420:
                raise HTTPException(
                    status_code=400,
                    detail=f"Dimensiones mínimas: 800x420 px. Tu imagen: {width}x{height} px"
                )
            
            if width > 2400 or height > 1256:
                raise HTTPException(
                    status_code=400,
                    detail=f"Dimensiones máximas: 2400x1256 px. Tu imagen: {width}x{height} px"
                )
            
            # Si es muy grande, redimensionar al máximo recomendado
            max_width, max_height = 1200, 628
            if width > max_width or height > max_height:
                ratio = min(max_width / width, max_height / height)
                new_width = int(width * ratio)
                new_height = int(height * ratio)
                img = img.resize((new_width, new_height), Image.LANCZOS)
                
                # Re-convertir a bytes
                buffer = _io.BytesIO()
                if extension in {".jpg", ".jpeg"}:
                    img = img.convert("RGB")
                    img.save(buffer, format="JPEG", quality=85, optimize=True)
                elif extension == ".png":
                    img.save(buffer, format="PNG", optimize=True)
                elif extension == ".webp":
                    img.save(buffer, format="WEBP", quality=85, optimize=True)
                
                contenido = buffer.getvalue()
                
        except ImportError:
            logger.warning("Pillow no instalado - validación de dimensiones omitida")
        except HTTPException:
            raise
        except Exception as e:
            logger.warning(f"Error validando imagen: {e}")
            # Si Pillow falla, continuar con la imagen original
        
        # 7. Generar nombre único y guardar
        nombre_archivo = f"{id}_{uuid.uuid4().hex[:8]}{extension}"
        ruta_directorio = os.path.join("uploads", "cursos")
        os.makedirs(ruta_directorio, exist_ok=True)
        ruta_completa = os.path.join(ruta_directorio, nombre_archivo)
        
        # Eliminar imagen anterior si existe
        if curso.imagen_url and "/uploads/cursos/" in str(curso.imagen_url):
            imagen_anterior = curso.imagen_url.split("/uploads/cursos/")[-1]
            ruta_anterior = os.path.join(ruta_directorio, imagen_anterior)
            if os.path.exists(ruta_anterior):
                try:
                    os.remove(ruta_anterior)
                except Exception:
                    pass
        
        # Guardar archivo (import lazy de aiofiles)
        try:
            import aiofiles as _af
            async with _af.open(ruta_completa, 'wb') as f:
                await f.write(contenido)
        except ImportError:
            # Fallback: escritura síncrona si aiofiles no está instalado
            with open(ruta_completa, 'wb') as f:
                f.write(contenido)
            logger.info("aiofiles no disponible — archivo guardado de forma síncrona")
        
        # 8. Actualizar URL en la base de datos
        imagen_url = f"/uploads/cursos/{nombre_archivo}"
        curso.imagen_url = imagen_url
        db.commit()
        db.refresh(curso)
        
        logger.info(f"Imagen subida para curso {id}: {nombre_archivo} ({len(contenido)} bytes)")
        
        return {
            "mensaje": "Imagen subida correctamente",
            "imagen_url": imagen_url,
            "nombre_archivo": nombre_archivo,
            "ok": True
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error subiendo imagen de curso: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{id}/imagen")
async def eliminar_imagen_curso(
    id: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_docente)
):
    """Elimina la imagen de portada de un curso"""
    try:
        curso = db.query(Curso).filter(Curso.id == id).first()
        if not curso:
            raise HTTPException(status_code=404, detail="Curso no encontrado")
        
        if str(curso.docente_id) != str(current_user.id) and current_user.rol != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permiso para editar este curso"
            )
        
        # Eliminar archivo físico
        if curso.imagen_url and "/uploads/cursos/" in str(curso.imagen_url):
            nombre_archivo = curso.imagen_url.split("/uploads/cursos/")[-1]
            ruta_archivo = os.path.join("uploads", "cursos", nombre_archivo)
            if os.path.exists(ruta_archivo):
                try:
                    os.remove(ruta_archivo)
                except Exception:
                    pass
        
        curso.imagen_url = None
        db.commit()
        
        return {"mensaje": "Imagen eliminada correctamente", "ok": True}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error eliminando imagen de curso: {e}")
        raise HTTPException(status_code=500, detail=str(e))