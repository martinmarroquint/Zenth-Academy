# app/api/admin.py
# PANEL DE ADMINISTRACIÓN: analítica GLOBAL real del sistema.
# Todo sale de la base de datos: nada de números inventados.

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session
import logging
from datetime import datetime, timezone, timedelta

from app.database import get_db
from app.core.dependencies import require_admin
from app.core.errors import error_interno
from app.models.usuario import Usuario
from app.models.alumno import Alumno
from app.models.grupo import Grupo
from app.models.curso import Curso, InscripcionCurso, SolicitudAccesoCurso
from app.models.examen import Examen
from app.models.resultado_examen import ResultadoExamen
from app.models.material_compartido import MaterialCompartido
from app.models.certificado import Certificado
from app.models.post import Post, Comentario
from app.models.pizarra import Pizarra
from app.models.historial_comparticion import HistorialComparticion
from app.models.solicitud_docente import SolicitudDocente
from app.models.biblioteca import RecursoBiblioteca, BibliotecaEvento

logger = logging.getLogger(__name__)
router = APIRouter()


def _aware_utc(dt):
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def _contar(db: Session, modelo) -> int:
    return int(db.query(func.count(modelo.id)).scalar() or 0)


@router.get("/cursos", response_model=list)
def listar_cursos_admin(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_admin),
):
    """✅ Todos los cursos con su docente, estado, precio y alumnos inscriptos."""
    try:
        filas = db.query(
            Curso.id, Curso.titulo, Curso.docente_nombre, Curso.estado,
            Curso.precio_tipo, Curso.precio_monto, Curso.created_at,
            func.count(InscripcionCurso.id).label("inscritos"),
        ).outerjoin(
            InscripcionCurso, InscripcionCurso.curso_id == Curso.id
        ).group_by(
            Curso.id, Curso.titulo, Curso.docente_nombre, Curso.estado,
            Curso.precio_tipo, Curso.precio_monto, Curso.created_at,
        ).order_by(
            func.count(InscripcionCurso.id).desc(), Curso.created_at.desc()
        ).all()

        return [
            {
                "id": str(f[0]),
                "titulo": f[1],
                "docente_nombre": f[2],
                "estado": f[3],
                "precio_tipo": f[4],
                "precio_monto": float(f[5]) if f[5] is not None else None,
                "created_at": _aware_utc(f[6]),
                "inscritos": int(f[7] or 0),
            }
            for f in filas
        ]
    except Exception as e:
        logger.error(f"Error listando cursos del admin: {e}")
        raise HTTPException(status_code=500, detail=error_interno(e, "Error listando cursos"))


@router.get("/estadisticas", response_model=dict)
def estadisticas_globales(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_admin),
):
    """✅ Analítica global real para el panel admin (solo admin)."""
    try:
        ahora = datetime.now(timezone.utc)
        hace_30d = ahora - timedelta(days=30)

        # ---------- USUARIOS ----------
        usuarios_por_rol = {
            str(r[0]): int(r[1] or 0)
            for r in db.query(Usuario.rol, func.count(Usuario.id)).group_by(Usuario.rol).all()
        }
        usuarios = {
            "total": _contar(db, Usuario),
            "activos": int(
                db.query(func.count(Usuario.id)).filter(Usuario.activo == True).scalar() or 0  # noqa: E712
            ),
            "admin": usuarios_por_rol.get("admin", 0),
            "docente": usuarios_por_rol.get("docente", 0),
            "estudiante": usuarios_por_rol.get("estudiante", 0),
            "nuevos_30d": int(
                db.query(func.count(Usuario.id)).filter(
                    Usuario.fecha_registro >= hace_30d
                ).scalar() or 0
            ),
        }

        # ---------- CURSOS ----------
        cursos = {
            "total": _contar(db, Curso),
            "publicados": int(
                db.query(func.count(Curso.id)).filter(
                    func.upper(Curso.estado) == "PUBLICADO"
                ).scalar() or 0
            ),
            "borradores": int(
                db.query(func.count(Curso.id)).filter(
                    func.upper(Curso.estado) == "BORRADOR"
                ).scalar() or 0
            ),
            "gratis": int(
                db.query(func.count(Curso.id)).filter(Curso.precio_tipo == "gratis").scalar() or 0
            ),
            "pago": int(
                db.query(func.count(Curso.id)).filter(Curso.precio_tipo == "pago").scalar() or 0
            ),
            "inscripciones": _contar(db, InscripcionCurso),
            "inscripciones_30d": int(
                db.query(func.count(InscripcionCurso.id)).filter(
                    InscripcionCurso.created_at >= hace_30d
                ).scalar() or 0
            ),
        }

        # ---------- ALUMNOS Y GRUPOS ----------
        alumnos = {
            "total": _contar(db, Alumno),
            "con_grupo": int(
                db.query(func.count(Alumno.id)).filter(
                    Alumno.grupo_id.isnot(None)
                ).scalar() or 0
            ),
        }
        grupos = {"total": _contar(db, Grupo)}

        # ---------- EXÁMENES Y RESULTADOS ----------
        total_resultados = _contar(db, ResultadoExamen)
        promedio = db.query(func.avg(ResultadoExamen.calificacion)).scalar()
        aprobados = int(
            db.query(func.count(ResultadoExamen.id)).join(
                Examen, Examen.id == ResultadoExamen.examen_id
            ).filter(
                ResultadoExamen.calificacion >= func.coalesce(Examen.puntaje_aprobacion, 60)
            ).scalar() or 0
        )
        examenes = {
            "total": _contar(db, Examen),
            "publicados": int(
                db.query(func.count(Examen.id)).filter(
                    func.upper(Examen.estado) == "PUBLICADO"
                ).scalar() or 0
            ),
            "resultados": total_resultados,
            "promedio": round(float(promedio), 2) if promedio is not None else None,
            "aprobados": aprobados,
            "tasa_aprobacion": (
                round((aprobados / total_resultados) * 100, 1) if total_resultados else None
            ),
        }

        # ---------- MATERIALES ----------
        materiales = {
            "total": _contar(db, MaterialCompartido),
            "activos": int(
                db.query(func.count(MaterialCompartido.id)).filter(
                    MaterialCompartido.activo == True  # noqa: E712
                ).scalar() or 0
            ),
            "visitas": int(
                db.query(func.coalesce(func.sum(MaterialCompartido.visitas), 0)).scalar() or 0
            ),
        }

        # ---------- BIBLIOTECA ----------
        biblioteca = {
            "recursos": int(
                db.query(func.count(RecursoBiblioteca.id)).filter(
                    RecursoBiblioteca.activo == True  # noqa: E712
                ).scalar() or 0
            ),
            "tareas": int(
                db.query(func.count(RecursoBiblioteca.id)).filter(
                    RecursoBiblioteca.activo == True,  # noqa: E712
                    RecursoBiblioteca.tipo == "tarea",
                ).scalar() or 0
            ),
            "visitas": int(
                db.query(func.coalesce(func.sum(RecursoBiblioteca.visitas), 0)).scalar() or 0
            ),
            "descargas": int(
                db.query(func.coalesce(func.sum(BibliotecaEvento.veces), 0)).filter(
                    BibliotecaEvento.tipo == "descarga"
                ).scalar() or 0
            ),
            "alumnos_activos": int(
                db.query(func.count(func.distinct(BibliotecaEvento.usuario_id))).scalar() or 0
            ),
        }

        # ---------- CERTIFICADOS ----------
        certificados = {
            "total": _contar(db, Certificado),
            "emitidos": int(
                db.query(func.count(Certificado.id)).filter(
                    func.lower(Certificado.estado) == "emitido"
                ).scalar() or 0
            ),
            "cancelados": int(
                db.query(func.count(Certificado.id)).filter(
                    func.lower(Certificado.estado) == "cancelado"
                ).scalar() or 0
            ),
        }

        # ---------- SOLICITUDES ----------
        estados_acceso = {
            str(r[0]).lower(): int(r[1] or 0)
            for r in db.query(
                SolicitudAccesoCurso.estado, func.count(SolicitudAccesoCurso.id)
            ).group_by(SolicitudAccesoCurso.estado).all()
        }
        solicitudes = {
            "acceso_pendientes": estados_acceso.get("pendiente", 0),
            "acceso_aprobadas": estados_acceso.get("aprobado", 0),
            "acceso_rechazadas": estados_acceso.get("rechazado", 0),
            "docente_pendientes": int(
                db.query(func.count(SolicitudDocente.id)).filter(
                    func.lower(SolicitudDocente.estado) == "pendiente"
                ).scalar() or 0
            ),
        }

        # ---------- INGRESOS (derivados, sin pasarela de pagos) ----------
        monto = db.query(func.coalesce(func.sum(Curso.precio_monto), 0)).join(
            SolicitudAccesoCurso, SolicitudAccesoCurso.curso_id == Curso.id
        ).filter(
            func.lower(SolicitudAccesoCurso.estado) == "aprobado"
        ).scalar()
        ingresos = {
            "verificados": round(float(monto or 0), 2),
            "moneda": "PEN",
            "nota": "Suma de accesos de pago APROBADOS por el precio del curso (no hay pasarela de pagos)",
        }

        # ---------- COMUNIDAD ----------
        comunidad = {
            "posts": _contar(db, Post),
            "comentarios": _contar(db, Comentario),
            "pizarras": _contar(db, Pizarra),
            "salas_compartir": _contar(db, HistorialComparticion),
        }

        # ---------- TOP CURSOS ----------
        filas_cursos = db.query(
            Curso.id, Curso.titulo, Curso.docente_nombre, Curso.estado,
            Curso.precio_tipo, Curso.precio_monto,
            func.count(InscripcionCurso.id).label("inscritos"),
        ).outerjoin(
            InscripcionCurso, InscripcionCurso.curso_id == Curso.id
        ).group_by(
            Curso.id, Curso.titulo, Curso.docente_nombre, Curso.estado,
            Curso.precio_tipo, Curso.precio_monto, Curso.created_at,
        ).order_by(
            func.count(InscripcionCurso.id).desc(), Curso.created_at.desc()
        ).limit(10).all()

        top_cursos = [
            {
                "id": str(c[0]),
                "titulo": c[1],
                "docente_nombre": c[2],
                "estado": c[3],
                "precio_tipo": c[4],
                "precio_monto": float(c[5]) if c[5] is not None else None,
                "inscritos": int(c[6] or 0),
            }
            for c in filas_cursos
        ]

        # ---------- TOP DOCENTES ----------
        inscritos_por_docente = {
            str(r[0]): int(r[1] or 0)
            for r in db.query(
                Curso.docente_id, func.count(InscripcionCurso.id)
            ).join(
                InscripcionCurso, InscripcionCurso.curso_id == Curso.id
            ).group_by(Curso.docente_id).all()
        }
        filas_docentes = db.query(
            Curso.docente_id, func.count(Curso.id)
        ).filter(
            Curso.docente_id.isnot(None)
        ).group_by(Curso.docente_id).order_by(func.count(Curso.id).desc()).limit(10).all()

        ids_docentes = [str(f[0]) for f in filas_docentes]
        nombres_docentes = {}
        if ids_docentes:
            nombres_docentes = {
                str(u.id): u.nombre_completo
                for u in db.query(Usuario).filter(Usuario.id.in_(ids_docentes)).all()
            }

        top_docentes = [
            {
                "id": str(f[0]),
                "nombre": nombres_docentes.get(str(f[0])) or "Docente",
                "cursos": int(f[1] or 0),
                "inscritos": inscritos_por_docente.get(str(f[0]), 0),
            }
            for f in filas_docentes
        ]

        # ---------- ACTIVIDAD RECIENTE ----------
        actividad = []
        for u in db.query(Usuario).order_by(Usuario.fecha_registro.desc()).limit(5).all():
            actividad.append({
                "tipo": "usuario",
                "titulo": f"{u.nombre_completo or u.email} se registró",
                "fecha": u.fecha_registro,
            })
        for c in db.query(Curso).order_by(Curso.created_at.desc()).limit(5).all():
            actividad.append({
                "tipo": "curso",
                "titulo": f"Curso creado: {c.titulo}",
                "fecha": c.created_at,
            })
        for r in db.query(RecursoBiblioteca).order_by(
            RecursoBiblioteca.created_at.desc()
        ).limit(5).all():
            actividad.append({
                "tipo": "biblioteca",
                "titulo": f"{'Tarea' if r.tipo == 'tarea' else 'Recurso'}: {r.titulo}",
                "fecha": r.created_at,
            })
        for s in db.query(SolicitudAccesoCurso).order_by(
            SolicitudAccesoCurso.created_at.desc()
        ).limit(5).all():
            actividad.append({
                "tipo": "solicitud",
                "titulo": f"Solicitud de acceso ({s.estado})",
                "fecha": s.created_at,
            })

        actividad.sort(
            key=lambda x: _aware_utc(x["fecha"]) or datetime.min.replace(tzinfo=timezone.utc),
            reverse=True,
        )

        return {
            "generado_en": ahora,
            "usuarios": usuarios,
            "cursos": cursos,
            "alumnos": alumnos,
            "grupos": grupos,
            "examenes": examenes,
            "materiales": materiales,
            "biblioteca": biblioteca,
            "certificados": certificados,
            "solicitudes": solicitudes,
            "ingresos": ingresos,
            "comunidad": comunidad,
            "top_cursos": top_cursos,
            "top_docentes": top_docentes,
            "actividad_reciente": [
                {**a, "fecha": _aware_utc(a["fecha"])} for a in actividad[:10]
            ],
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error calculando las estadísticas globales: {e}")
        raise HTTPException(status_code=500, detail=error_interno(e, "Error calculando las estadísticas"))
