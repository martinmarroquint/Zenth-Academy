# app/api/cuestionarios.py
# ROUTER PARA CUESTIONARIOS DINÁMICOS - CON NUEVOS ROLES EDUCATIVOS

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session
from typing import List, Optional
import uuid
import csv
import io
from datetime import datetime, timezone

from app.database import get_db
from app.core.dependencies import (
    get_current_active_user,
    require_docente,
    require_admin
)
from app.models.usuario import Usuario
from app.models.cuestionario import Cuestionario, PreguntaCuestionario, RespuestaCuestionario, RespuestaPregunta
from app.schemas.cuestionarios import (
    CuestionarioCreate, CuestionarioUpdate, CuestionarioResponse, CuestionarioDetailResponse,
    PreguntaCuestionarioCreate, PreguntaCuestionarioResponse,
    RespuestaCuestionarioCreate, RespuestaCuestionarioResponse,
    MensajeResponse
)

router = APIRouter()


# =============================================
# LISTAR CUESTIONARIOS (Autenticado)
# =============================================

@router.get("/", response_model=List[CuestionarioResponse])
def listar_cuestionarios(
    tipo: Optional[str] = Query(None),
    estado: Optional[str] = Query(None),
    empresa_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """Lista todos los cuestionarios (autenticado)"""
    query = db.query(Cuestionario)
    if tipo:
        query = query.filter(Cuestionario.tipo == tipo)
    if estado:
        query = query.filter(Cuestionario.estado == estado)
    if empresa_id:
        query = query.filter(Cuestionario.empresa_id == empresa_id)
    return query.order_by(Cuestionario.created_at.desc()).all()


# =============================================
# CREAR CUESTIONARIO (Solo docente o admin)
# =============================================

@router.post("/", response_model=CuestionarioDetailResponse, status_code=201)
def crear_cuestionario(
    data: CuestionarioCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_docente)  # ✅ Cambiado
):
    """Crea un nuevo cuestionario (solo docente o admin)"""
    cuestionario_id = str(uuid.uuid4())
    
    cuestionario = Cuestionario(
        id=cuestionario_id,
        titulo=data.titulo,
        descripcion=data.descripcion,
        tipo=data.tipo,
        configuracion=data.configuracion,
        es_anonimo=data.es_anonimo,
        permite_editar=data.permite_editar,
        mostrar_resultados=data.mostrar_resultados,
        limite_respuestas=data.limite_respuestas,
        empresa_id=data.empresa_id,
        departamento=data.departamento,
        publico_objetivo=data.publico_objetivo,
        password=data.password,
        url_publica=data.url_publica,
        fecha_inicio=data.fecha_inicio,
        fecha_fin=data.fecha_fin,
        creado_por=data.creado_por or str(current_user.id),
        estado='BORRADOR'
    )
    db.add(cuestionario)
    
    for i, pregunta_data in enumerate(data.preguntas):
        pregunta = PreguntaCuestionario(
            id=str(uuid.uuid4()),
            cuestionario_id=cuestionario_id,
            tipo=pregunta_data.tipo,
            orden=pregunta_data.orden or i,
            seccion=pregunta_data.seccion,
            titulo=pregunta_data.titulo,
            descripcion=pregunta_data.descripcion,
            obligatoria=pregunta_data.obligatoria,
            opciones=pregunta_data.opciones,
            configuracion=pregunta_data.configuracion,
            condicion=pregunta_data.condicion,
            validaciones=pregunta_data.validaciones,
            puntaje=pregunta_data.puntaje
        )
        db.add(pregunta)
    
    db.commit()
    db.refresh(cuestionario)
    return cuestionario


# =============================================
# OBTENER CUESTIONARIO (Público - enlace compartido)
# =============================================

@router.get("/{cuestionario_id}", response_model=CuestionarioDetailResponse)
def obtener_cuestionario(
    cuestionario_id: str,
    db: Session = Depends(get_db),
):
    """Obtiene un cuestionario con todas sus preguntas (público - destino del enlace/QR)"""
    cuestionario = db.query(Cuestionario).filter(Cuestionario.id == cuestionario_id).first()
    if not cuestionario:
        raise HTTPException(status_code=404, detail="Cuestionario no encontrado")
    return cuestionario


# =============================================
# ACTUALIZAR CUESTIONARIO (Solo docente o admin)
# =============================================

@router.put("/{cuestionario_id}", response_model=CuestionarioDetailResponse)
def actualizar_cuestionario(
    cuestionario_id: str,
    data: CuestionarioUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_docente)  # ✅ Cambiado
):
    """Actualiza un cuestionario (solo docente o admin)"""
    cuestionario = db.query(Cuestionario).filter(Cuestionario.id == cuestionario_id).first()
    if not cuestionario:
        raise HTTPException(status_code=404, detail="Cuestionario no encontrado")
    
    # Verificar que el usuario sea el creador o admin
    if cuestionario.creado_por != str(current_user.id) and current_user.rol != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permiso para editar este cuestionario"
        )
    
    if data.titulo is not None:
        cuestionario.titulo = data.titulo
    if data.descripcion is not None:
        cuestionario.descripcion = data.descripcion
    if data.configuracion is not None:
        cuestionario.configuracion = data.configuracion
    if data.estado is not None:
        cuestionario.estado = data.estado
    if data.tipo is not None:
        cuestionario.tipo = data.tipo
    if data.es_anonimo is not None:
        cuestionario.es_anonimo = data.es_anonimo
    if data.mostrar_resultados is not None:
        cuestionario.mostrar_resultados = data.mostrar_resultados
    if data.limite_respuestas is not None:
        cuestionario.limite_respuestas = data.limite_respuestas
    if data.password is not None:
        cuestionario.password = data.password
    if data.fecha_inicio is not None:
        cuestionario.fecha_inicio = data.fecha_inicio
    if data.fecha_fin is not None:
        cuestionario.fecha_fin = data.fecha_fin
    
    # Si llega una lista de preguntas, se reemplazan las existentes
    if data.preguntas is not None:
        for old_pregunta in list(cuestionario.preguntas):
            db.delete(old_pregunta)
        db.flush()
        for i, pregunta_data in enumerate(data.preguntas):
            pregunta = PreguntaCuestionario(
                id=str(uuid.uuid4()),
                cuestionario_id=cuestionario.id,
                tipo=pregunta_data.tipo,
                orden=pregunta_data.orden or i,
                seccion=pregunta_data.seccion,
                titulo=pregunta_data.titulo,
                descripcion=pregunta_data.descripcion,
                obligatoria=pregunta_data.obligatoria,
                visible=pregunta_data.visible,
                opciones=pregunta_data.opciones,
                configuracion=pregunta_data.configuracion,
                condicion=pregunta_data.condicion,
                validaciones=pregunta_data.validaciones,
                puntaje=pregunta_data.puntaje,
            )
            db.add(pregunta)
    
    cuestionario.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(cuestionario)
    return cuestionario


# =============================================
# ELIMINAR CUESTIONARIO (Solo docente o admin)
# =============================================

@router.delete("/{cuestionario_id}", response_model=MensajeResponse)
def eliminar_cuestionario(
    cuestionario_id: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_docente)  # ✅ Cambiado
):
    """Elimina un cuestionario (solo docente o admin)"""
    cuestionario = db.query(Cuestionario).filter(Cuestionario.id == cuestionario_id).first()
    if not cuestionario:
        raise HTTPException(status_code=404, detail="Cuestionario no encontrado")
    
    if cuestionario.creado_por != str(current_user.id) and current_user.rol != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permiso para eliminar este cuestionario"
        )
    
    db.delete(cuestionario)
    db.commit()
    return {"mensaje": "Cuestionario eliminado", "ok": True}


# =============================================
# RESPONDER CUESTIONARIO (Autenticado o público)
# =============================================

@router.post("/{cuestionario_id}/responder", response_model=RespuestaCuestionarioResponse)
def responder_cuestionario(
    cuestionario_id: str,
    data: RespuestaCuestionarioCreate,
    db: Session = Depends(get_db),
):
    """Guarda las respuestas de un cuestionario (PÚBLICO - sin login).
    La identificación es opcional: el receptor puede indicar nombre/email si lo desea."""
    cuestionario = db.query(Cuestionario).filter(Cuestionario.id == cuestionario_id).first()
    if not cuestionario:
        raise HTTPException(status_code=404, detail="Cuestionario no encontrado")
    
    if cuestionario.limite_respuestas > 0:
        respuestas_actuales = db.query(RespuestaCuestionario).filter(
            RespuestaCuestionario.cuestionario_id == cuestionario_id
        ).count()
        if respuestas_actuales >= cuestionario.limite_respuestas:
            raise HTTPException(status_code=400, detail="Límite de respuestas alcanzado")
    
    ahora = datetime.utcnow()
    if cuestionario.fecha_inicio and ahora < cuestionario.fecha_inicio:
        raise HTTPException(status_code=400, detail="Este cuestionario aún no está disponible")
    if cuestionario.fecha_fin and ahora > cuestionario.fecha_fin:
        raise HTTPException(status_code=400, detail="Este cuestionario ya no acepta respuestas")
    if cuestionario.password and (not data.password or data.password != cuestionario.password):
        raise HTTPException(status_code=403, detail="Contraseña incorrecta")
    
    respuesta = RespuestaCuestionario(
        id=str(uuid.uuid4()),
        cuestionario_id=cuestionario_id,
        usuario_id=data.usuario_id,
        email=data.email,
        nombre=data.nombre,
        empresa=data.empresa,
        departamento=data.departamento,
        ip=data.ip,
        user_agent=data.user_agent,
        ubicacion=data.ubicacion,
        tiempo_total=data.tiempo_total,
        fecha_inicio=data.fecha_inicio,
        fecha_fin=datetime.now(timezone.utc)
    )
    db.add(respuesta)
    db.flush()
    
    for respuesta_pregunta_data in data.respuestas:
        respuesta_pregunta = RespuestaPregunta(
            id=str(uuid.uuid4()),
            respuesta_id=respuesta.id,
            pregunta_id=respuesta_pregunta_data.pregunta_id,
            valor_texto=respuesta_pregunta_data.valor_texto,
            valor_numero=respuesta_pregunta_data.valor_numero,
            valor_boolean=respuesta_pregunta_data.valor_boolean,
            valor_fecha=respuesta_pregunta_data.valor_fecha,
            valor_opcion=respuesta_pregunta_data.valor_opcion,
            valor_opciones=respuesta_pregunta_data.valor_opciones,
            valor_matriz=respuesta_pregunta_data.valor_matriz,
            valor_archivo=respuesta_pregunta_data.valor_archivo,
            valor_slider=respuesta_pregunta_data.valor_slider,
            valor_estrellas=respuesta_pregunta_data.valor_estrellas,
            valor_emocion=respuesta_pregunta_data.valor_emocion,
            valor_ordenamiento=respuesta_pregunta_data.valor_ordenamiento,
            tiempo_respuesta=respuesta_pregunta_data.tiempo_respuesta
        )
        db.add(respuesta_pregunta)
    
    respuesta.completado = True
    db.commit()
    db.refresh(respuesta)
    return respuesta


# =============================================
# LISTAR RESPUESTAS (Solo docente o admin)
# =============================================

@router.get("/{cuestionario_id}/respuestas", response_model=List[RespuestaCuestionarioResponse])
def listar_respuestas(
    cuestionario_id: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_docente)  # ✅ Cambiado
):
    """Lista todas las respuestas de un cuestionario (solo docente o admin)"""
    cuestionario = db.query(Cuestionario).filter(Cuestionario.id == cuestionario_id).first()
    if not cuestionario:
        raise HTTPException(status_code=404, detail="Cuestionario no encontrado")
    
    if cuestionario.creado_por != str(current_user.id) and current_user.rol != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permiso para ver las respuestas de este cuestionario"
        )
    
    respuestas = db.query(RespuestaCuestionario).filter(
        RespuestaCuestionario.cuestionario_id == cuestionario_id
    ).order_by(RespuestaCuestionario.created_at.desc()).all()
    return respuestas


# =============================================
# ANALIZAR CUESTIONARIO (Solo docente o admin)
# =============================================

@router.post("/{cuestionario_id}/analisis")
def analizar_cuestionario(
    cuestionario_id: str,
    filtros: Optional[dict] = None,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_docente)  # ✅ Cambiado
):
    """Genera un análisis agregado de las respuestas (solo docente o admin)"""
    cuestionario = db.query(Cuestionario).filter(Cuestionario.id == cuestionario_id).first()
    if not cuestionario:
        raise HTTPException(status_code=404, detail="Cuestionario no encontrado")
    
    if cuestionario.creado_por != str(current_user.id) and current_user.rol != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permiso para analizar este cuestionario"
        )

    respuestas = db.query(RespuestaCuestionario).filter(
        RespuestaCuestionario.cuestionario_id == cuestionario_id
    ).all()
    preguntas = db.query(PreguntaCuestionario).filter(
        PreguntaCuestionario.cuestionario_id == cuestionario_id
    ).order_by(PreguntaCuestionario.orden.asc()).all()

    pregunta_ids = [p.id for p in preguntas]
    respuestas_preguntas = db.query(RespuestaPregunta).filter(
        RespuestaPregunta.pregunta_id.in_(pregunta_ids)
    ).all() if pregunta_ids else []

    por_pregunta = {}
    for rp in respuestas_preguntas:
        por_pregunta.setdefault(rp.pregunta_id, []).append(rp)

    resultado_preguntas = []
    for p in preguntas:
        items = por_pregunta.get(p.id, [])
        conteo = {}
        for it in items:
            valor = it.valor_opcion or it.valor_texto or (
                ", ".join(it.valor_opciones or []) if it.valor_opciones else None
            ) or it.valor_numero
            clave = str(valor) if valor is not None else "(sin respuesta)"
            conteo[clave] = conteo.get(clave, 0) + 1
        resultado_preguntas.append({
            "id": p.id,
            "titulo": p.titulo,
            "tipo": p.tipo,
            "total_respuestas": len(items),
            "conteo": conteo
        })

    return {
        "cuestionario_id": cuestionario_id,
        "titulo": cuestionario.titulo,
        "total_respuestas": len(respuestas),
        "preguntas": resultado_preguntas
    }


# =============================================
# EXPORTAR RESULTADOS (Solo docente o admin)
# =============================================

@router.get("/{cuestionario_id}/exportar")
def exportar_resultados(
    cuestionario_id: str,
    formato: str = Query("csv"),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_docente)  # ✅ Cambiado
):
    """Exporta los resultados en CSV (solo docente o admin)"""
    cuestionario = db.query(Cuestionario).filter(Cuestionario.id == cuestionario_id).first()
    if not cuestionario:
        raise HTTPException(status_code=404, detail="Cuestionario no encontrado")
    
    if cuestionario.creado_por != str(current_user.id) and current_user.rol != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permiso para exportar este cuestionario"
        )

    respuestas = db.query(RespuestaCuestionario).filter(
        RespuestaCuestionario.cuestionario_id == cuestionario_id
    ).order_by(RespuestaCuestionario.created_at.asc()).all()
    preguntas = db.query(PreguntaCuestionario).filter(
        PreguntaCuestionario.cuestionario_id == cuestionario_id
    ).order_by(PreguntaCuestionario.orden.asc()).all()

    if formato == "json":
        return [
            {
                "id": r.id,
                "nombre": r.nombre,
                "email": r.email,
                "empresa": r.empresa,
                "departamento": r.departamento,
                "creado_en": r.created_at.isoformat() if r.created_at else None,
                "respuestas": [{
                    "pregunta": rp.pregunta.titulo if rp.pregunta else "",
                    "respuesta": rp.valor_opcion or rp.valor_texto or (
                        ", ".join(rp.valor_opciones or []) if rp.valor_opciones else None
                    )
                } for rp in r.respuestas_preguntas]
            }
            for r in respuestas
        ]

    buffer = io.StringIO()
    writer = csv.writer(buffer)
    headers = ["Fecha", "Nombre", "Email", "Empresa", "Departamento"]
    headers += [f"P{p.orden}: {p.titulo}" for p in preguntas]
    writer.writerow(headers)

    for r in respuestas:
        fila = [
            r.created_at.strftime("%Y-%m-%d %H:%M") if r.created_at else "",
            r.nombre or "",
            r.email or "",
            r.empresa or "",
            r.departamento or "",
        ]
        rp_por_pregunta = {rp.pregunta_id: rp for rp in r.respuestas_preguntas}
        for p in preguntas:
            rp = rp_por_pregunta.get(p.id)
            if rp:
                valor = rp.valor_opcion or rp.valor_texto or (
                    ", ".join(rp.valor_opciones or []) if rp.valor_opciones else None
                ) or ""
                fila.append(str(valor))
            else:
                fila.append("")
        writer.writerow(fila)

    return Response(
        content=buffer.getvalue(),
        media_type="text/csv; charset=utf-8",
        headers={
            "Content-Disposition": f"attachment; filename=resultados_{cuestionario_id}.csv"
        }
    )