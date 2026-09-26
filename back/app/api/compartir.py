# app/api/compartir.py
# ROUTER "COMPARTIR EN CLASE" - CON QR DINAMICO Y EXPIRACION
# FLUJO: El docente crea sala -> QR visible 30s -> Expira y se renueva automaticamente

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Request
from sqlalchemy.orm import Session
from typing import Optional
import uuid
import secrets
import hashlib
import hmac
import logging
from datetime import datetime, timezone, timedelta

from app.database import get_db
from app.core.dependencies import require_docente, get_current_user_optional
from app.core.errors import error_interno
from app.core.ratelimit import rate_limit
from app.models.usuario import Usuario
from app.models.material_compartido import MaterialCompartido
from app.models.historial_comparticion import HistorialComparticion
from app.schemas.compartir import (
    EnviarMaterialRequest,
    SalaEstadoResponse,
    VincularRequest,
    VincularResponse,
    PantallaCreateRequest,
    SalaDocenteResponse,
)
from app.schemas.material_compartido import MensajeResponse

logger = logging.getLogger(__name__)
router = APIRouter()

PUBLIC_BASE_URL = "https://zenthacademy.com"
ALFABETO_CODIGO = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"
QR_EXPIRATION_SECONDS = 30
# ✅ Emparejamiento de pantalla: cuánto dura la sesión del equipo que muestra
PANTALLA_SESION_HORAS = 4


# =============================================
# UTILIDADES
# =============================================

def _ahora_utc() -> datetime:
    """Retorna datetime actual con zona horaria UTC."""
    return datetime.now(timezone.utc)


def _generar_codigo() -> str:
    return "".join(secrets.choice(ALFABETO_CODIGO) for _ in range(8))


def _generar_qr_token() -> str:
    return secrets.token_urlsafe(16)


def _buscar_sala(db: Session, codigo: str) -> Optional[HistorialComparticion]:
    return db.query(HistorialComparticion).filter(
        HistorialComparticion.session_id == codigo
    ).first()


def _validar_dueño(sala: HistorialComparticion, user: Usuario):
    if str(sala.docente_id) != str(user.id) and user.rol != "admin":
        raise HTTPException(status_code=403, detail="Esta sala pertenece a otro docente")


def _qr_expirado(sala: HistorialComparticion, ahora: datetime) -> bool:
    """Verifica si el QR de la sala ha expirado."""
    if not sala.qr_expira:
        return True
    # Convertir a offset-aware si es necesario
    if sala.qr_expira.tzinfo is None:
        from datetime import timezone as tz
        qr_expira = sala.qr_expira.replace(tzinfo=tz.utc)
    else:
        qr_expira = sala.qr_expira
    return qr_expira < ahora


def _renovar_qr(sala: HistorialComparticion, ahora: datetime) -> dict:
    """Renueva el QR de una sala."""
    sala.qr_token = _generar_qr_token()
    sala.qr_expira = ahora + timedelta(seconds=QR_EXPIRATION_SECONDS)
    sala.actualizado_en = ahora
    return {
        "qr_token": sala.qr_token,
        "qr_expira": sala.qr_expira.isoformat(),
        "qr_restante": QR_EXPIRATION_SECONDS
    }


def _hash_secret(secret: str) -> str:
    return hashlib.sha256(secret.encode("utf-8")).hexdigest()


def _pantalla_bindeada(sala: HistorialComparticion, ahora: datetime) -> bool:
    """✅ True si hay una pantalla emparejada con sesión viva (no revocada/vencida)."""
    if not sala.pantalla_secret_hash or sala.pantalla_revocada_en:
        return False
    expira = sala.pantalla_expira
    if not expira:
        return False
    if expira.tzinfo is None:
        expira = expira.replace(tzinfo=timezone.utc)
    return expira > ahora


def _pantalla_secret_valido(
    sala: HistorialComparticion, secret: Optional[str], ahora: datetime
) -> bool:
    """✅ El secreto de pantalla vive SOLO en memoria del equipo que muestra; si
    coincide con el hash guardado, esa pantalla puede recibir el contenido."""
    if not secret or not sala.pantalla_secret_hash or not _pantalla_bindeada(sala, ahora):
        return False
    return hmac.compare_digest(sala.pantalla_secret_hash, _hash_secret(secret))


def _limpiar_pantalla(
    sala: HistorialComparticion, ahora: datetime, *, revocada: bool = False
) -> None:
    """Desvincula la pantalla (revocación del docente o expiración de la sesión)."""
    sala.pantalla_secret_hash = None
    sala.pantalla_expira = None
    sala.pantalla_vinculada_en = None
    if revocada:
        sala.pantalla_revocada_en = ahora
    if sala.estado == "ACTIVO":
        sala.estado = "ESPERANDO"


def _nombre_docente_sala(db: Session, sala: HistorialComparticion) -> Optional[str]:
    """✅ Nombre del docente dueño, para que la pantalla muestre a quién está
    vinculada (si alguien más la reclamó, el docente lo nota)."""
    if not sala.docente_id:
        return None
    user = db.query(Usuario).filter(Usuario.id == str(sala.docente_id)).first()
    return user.nombre_completo if user else None


def _material_publico(m: MaterialCompartido) -> dict:
    return {
        "id": str(m.id),
        "titulo": m.titulo,
        "descripcion": m.descripcion,
        "tipo": m.tipo or "enlace",
        "contenido": m.contenido,
        "nombre_archivo": m.nombre_archivo,
        "url_archivo": m.url_archivo,
    }


def _estado_sala(
    sala: HistorialComparticion, ahora: datetime, *,
    con_material: bool = True, incluir_qr: bool = True,
    docente_nombre: Optional[str] = None
) -> dict:
    """Estado de la sala.

    `con_material=False` (petición sin secreto de pantalla válido) oculta el
    material activo: solo la pantalla emparejada recibe el contenido.
    `incluir_qr=False` cuando ya hay pantalla vinculada (el QR deja de existir).
    """
    recursos = sala.recursos_compartidos or []
    material_activo = recursos[-1] if (recursos and con_material) else None

    qr_restante = 0
    if sala.qr_expira:
        if sala.qr_expira.tzinfo is None:
            from datetime import timezone as tz
            qr_expira = sala.qr_expira.replace(tzinfo=tz.utc)
        else:
            qr_expira = sala.qr_expira
        qr_restante = max(0, int((qr_expira - ahora).total_seconds()))

    return {
        "codigo": sala.session_id,
        "estado": sala.estado,
        "material_activo": material_activo,
        "fecha_inicio": sala.fecha_inicio.isoformat() if sala.fecha_inicio else None,
        "fecha_fin": sala.fecha_fin.isoformat() if sala.fecha_fin else None,
        "duracion_segundos": sala.duracion_segundos or 0,
        "qr_token": sala.qr_token if incluir_qr else None,
        "qr_expira": sala.qr_expira.isoformat() if (sala.qr_expira and incluir_qr) else None,
        "qr_restante": qr_restante if incluir_qr else 0,
        "pantalla_vinculada": _pantalla_bindeada(sala, ahora),
        "pantalla_docente_nombre": docente_nombre,
    }


def _sala_docente_dict(sala: HistorialComparticion, ahora: datetime) -> dict:
    """Respuesta para el panel del docente (incluye estado del emparejamiento)."""
    recursos = sala.recursos_compartidos or []
    return {
        "codigo": sala.session_id,
        "url_publica": f"{PUBLIC_BASE_URL}/compartir/{sala.session_id}",
        "estado": sala.estado,
        "material_activo": recursos[-1] if recursos else None,
        "fecha_inicio": sala.fecha_inicio.isoformat() if sala.fecha_inicio else None,
        "qr_token": sala.qr_token,
        "qr_expira": sala.qr_expira.isoformat() if sala.qr_expira else None,
        "pantalla_vinculada": _pantalla_bindeada(sala, ahora),
        "pantalla_vinculada_en": (
            sala.pantalla_vinculada_en.isoformat() if sala.pantalla_vinculada_en else None
        ),
        "pantalla_expira": sala.pantalla_expira.isoformat() if sala.pantalla_expira else None,
    }


# =============================================
# CREAR SALA (con QR)
# =============================================

@router.post("/salas", response_model=SalaDocenteResponse, status_code=201)
def crear_sala(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_docente)
):
    """Crea una sala con QR valido por 30 segundos."""
    try:
        ahora = _ahora_utc()
        
        activa = db.query(HistorialComparticion).filter(
            HistorialComparticion.docente_id == str(current_user.id),
            HistorialComparticion.estado.in_(["ESPERANDO", "ACTIVO"])
        ).first()
        
        if activa:
            if not _pantalla_bindeada(activa, ahora) and _qr_expirado(activa, ahora):
                _renovar_qr(activa, ahora)
                db.commit()
                db.refresh(activa)

            return _sala_docente_dict(activa, ahora)

        codigo = _generar_codigo()
        while _buscar_sala(db, codigo):
            codigo = _generar_codigo()

        sala = HistorialComparticion(
            id=str(uuid.uuid4()),
            docente_id=str(current_user.id),
            session_id=codigo,
            qr_token=_generar_qr_token(),
            qr_expira=ahora + timedelta(seconds=QR_EXPIRATION_SECONDS),
            estado="ESPERANDO",
            recursos_compartidos=[],
            cantidad_recursos=0,
            fecha_inicio=ahora,
        )
        db.add(sala)
        db.commit()
        db.refresh(sala)
        
        logger.info(f"Sala {codigo} creada - QR valido hasta {sala.qr_expira}")
        
        return _sala_docente_dict(sala, ahora)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=error_interno(e, "Error creando sala"))


@router.get("/salas/activa", response_model=Optional[SalaDocenteResponse])
def sala_activa_docente(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_docente)
):
    try:
        ahora = _ahora_utc()
        
        activa = db.query(HistorialComparticion).filter(
            HistorialComparticion.docente_id == str(current_user.id),
            HistorialComparticion.estado.in_(["ESPERANDO", "ACTIVO"])
        ).first()
        if not activa:
            return None
        
        if not _pantalla_bindeada(activa, ahora) and _qr_expirado(activa, ahora):
            _renovar_qr(activa, ahora)
            db.commit()
            db.refresh(activa)
        
        return _sala_docente_dict(activa, ahora)
    except Exception as e:
        raise HTTPException(status_code=500, detail=error_interno(e, "Error obteniendo sala activa"))


# =============================================
# PANTALLA DEL AULA (/proyectar) — SIN CÓDIGO NI CREDENCIALES
# El docente abre una URL FIJA en la PC del aula, ve un QR y lo escanea con su
# celular (estilo WhatsApp Web). Si el equipo ya tiene sesión de docente, la
# pantalla queda vinculada al instante sin escanear nada.
# =============================================

@router.post("/pantallas", response_model=SalaEstadoResponse, status_code=201)
def crear_pantalla(
    request: Request,
    data: Optional[PantallaCreateRequest] = None,
    db: Session = Depends(get_db),
    current_user: Optional[Usuario] = Depends(get_current_user_optional),
    # ✅ Endpoint público que crea registros → rate limit
    _rate_limited = Depends(rate_limit(20, 60)),
):
    """Crea la pantalla de proyección del aula (nace pendiente si no hay sesión)."""
    try:
        ahora = _ahora_utc()
        payload = data or PantallaCreateRequest()

        codigo = _generar_codigo()
        while _buscar_sala(db, codigo):
            codigo = _generar_codigo()

        sala = HistorialComparticion(
            id=str(uuid.uuid4()),
            docente_id=None,
            session_id=codigo,
            qr_token=_generar_qr_token(),
            qr_expira=ahora + timedelta(seconds=QR_EXPIRATION_SECONDS),
            estado="ESPERANDO",
            recursos_compartidos=[],
            cantidad_recursos=0,
            fecha_inicio=ahora,
        )

        # ✅ Si el equipo ya tiene sesión de docente/admin, se vincula directo
        vinculada_directo = bool(
            current_user is not None
            and current_user.rol in ["admin", "docente"]
            and payload.pantalla_secret
        )
        if vinculada_directo:
            sala.docente_id = str(current_user.id)
            sala.pantalla_secret_hash = _hash_secret(payload.pantalla_secret)
            sala.pantalla_vinculada_en = ahora
            sala.pantalla_expira = ahora + timedelta(hours=PANTALLA_SESION_HORAS)
            sala.pantalla_ip = request.client.host if request.client else None
            sala.pantalla_user_agent = request.headers.get("user-agent")
            sala.qr_token = None
            sala.qr_expira = None
            sala.estado = "ACTIVO"

        db.add(sala)
        db.commit()
        db.refresh(sala)

        logger.info(f"Pantalla {codigo} creada (vinculada_directo={vinculada_directo})")
        return _estado_sala(
            sala, ahora,
            docente_nombre=_nombre_docente_sala(db, sala) if vinculada_directo else None,
        )
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=error_interno(e, "Error creando pantalla"))


# =============================================
# ESTADO PUBLICO DE LA SALA (renueva QR automaticamente)
# =============================================

@router.get("/{codigo}", response_model=SalaEstadoResponse)
def estado_sala(
    codigo: str,
    request: Request,
    db: Session = Depends(get_db),
    # ✅ SEGURIDAD (MEDIA 5): endpoint público sin auth → rate limit. La página
    # del aula hace polling cada 2s (30/min), así que 60/min deja margen y
    # sigue bloqueando la enumeración de códigos de 8 caracteres.
    _rate_limited = Depends(rate_limit(60, 60)),
):
    """Estado público de la sala.

    - El QR solo se emite mientras NO haya pantalla vinculada.
    - El `material_activo` solo se entrega a la pantalla emparejada, que
      presenta su secreto en el header `X-Pantalla-Secret`.
    """
    try:
        ahora = _ahora_utc()

        sala = _buscar_sala(db, codigo)
        if not sala:
            raise HTTPException(status_code=404, detail="Sala no encontrada")

        # ✅ Sesión de pantalla vencida → se desvincula y vuelve a mostrar QR
        if sala.pantalla_secret_hash and not _pantalla_bindeada(sala, ahora):
            _limpiar_pantalla(sala, ahora)
            db.commit()
            db.refresh(sala)
            logger.info(f"Pantalla de la sala {codigo} expiró")

        vinculada = _pantalla_bindeada(sala, ahora)

        # ✅ QR de un solo uso: solo se emite si no hay pantalla vinculada
        if sala.estado != "CERRADO" and not vinculada:
            if sala.qr_token is None or _qr_expirado(sala, ahora):
                _renovar_qr(sala, ahora)
                db.commit()
                db.refresh(sala)
                logger.info(f"QR renovado para sala {codigo}")

        secret = request.headers.get("X-Pantalla-Secret")
        es_pantalla = _pantalla_secret_valido(sala, secret, ahora)

        return _estado_sala(
            sala, ahora,
            con_material=es_pantalla,
            incluir_qr=not vinculada,
            docente_nombre=_nombre_docente_sala(db, sala) if vinculada else None,
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=error_interno(e, "Error obteniendo estado"))


# =============================================
# VINCULAR (escanea QR)
# =============================================

@router.post("/{codigo}/vincular", response_model=VincularResponse)
def vincular_sala(
    codigo: str,
    request: Request,
    data: Optional[VincularRequest] = None,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user_optional)
):
    """Vincula la pantalla del aula al docente (escaneo del QR, estilo WhatsApp Web).

    Valida que quien vincula sea el dueño y que el token del QR siga vigente y
    sin usar; después empareja el equipo que muestra mediante el secreto que
    ese equipo generó en memoria.
    """
    try:
        ahora = _ahora_utc()
        payload = data or VincularRequest()

        sala = _buscar_sala(db, codigo)
        if not sala:
            raise HTTPException(status_code=404, detail="Sala no encontrada")

        if current_user is None:
            return VincularResponse(
                ok=False, es_docente=False,
                mensaje="Iniciá sesión en tu cuenta para vincular la pantalla",
            )

        es_docente = current_user.rol in ["admin", "docente"]

        if sala.docente_id is None:
            # ✅ Pantalla PENDIENTE (creada desde /proyectar sin login): la reclama
            # el docente que escanea. Los estudiantes no pueden reclamarla.
            if not es_docente:
                return VincularResponse(
                    ok=False, es_docente=False, es_dueño=False,
                    mensaje="Solo una cuenta docente puede vincular esta pantalla",
                )
            es_dueño = True
            sala.docente_id = str(current_user.id)
        else:
            es_dueño = str(sala.docente_id) == str(current_user.id) or current_user.rol == "admin"
            if not es_dueño:
                logger.warning(
                    f"Acceso denegado: usuario {current_user.id} intentó vincular "
                    f"la sala {codigo} de {sala.docente_id}"
                )
                return VincularResponse(
                    ok=False, es_docente=es_docente, es_dueño=False,
                    mensaje="No tienes permiso para vincular esta sala",
                )

        if sala.estado == "CERRADO":
            return VincularResponse(
                ok=False, es_docente=es_docente, es_dueño=True,
                mensaje="La sesión ya fue cerrada",
            )

        # ✅ Secreto de la pantalla (vive solo en memoria del equipo que muestra)
        if not payload.pantalla_secret:
            raise HTTPException(
                status_code=400,
                detail="Falta el secreto de la pantalla. Escaneá el QR que muestra la pantalla del aula.",
            )

        # ✅ Token del QR: obligatorio, vigente y de un solo uso
        if (
            not payload.qr_token
            or not sala.qr_token
            or not hmac.compare_digest(str(payload.qr_token), str(sala.qr_token))
        ):
            raise HTTPException(
                status_code=400,
                detail="QR inválido o ya utilizado. Escaneá el QR actualizado de la pantalla.",
            )
        if _qr_expirado(sala, ahora):
            raise HTTPException(
                status_code=400,
                detail="El QR expiró. Escaneá el nuevo QR de la pantalla.",
            )

        # ✅ Emparejar la pantalla
        sala.pantalla_secret_hash = _hash_secret(payload.pantalla_secret)
        sala.pantalla_vinculada_en = ahora
        sala.pantalla_expira = ahora + timedelta(hours=PANTALLA_SESION_HORAS)
        sala.pantalla_ip = request.client.host if request.client else None
        sala.pantalla_user_agent = request.headers.get("user-agent")
        sala.pantalla_revocada_en = None
        # Token de un solo uso: se consume al vincular
        sala.qr_token = None
        sala.qr_expira = None
        sala.estado = "ACTIVO"
        sala.actualizado_en = ahora
        db.commit()
        db.refresh(sala)

        logger.info(
            f"Pantalla vinculada a la sala {codigo} por {current_user.id} "
            f"(expira {sala.pantalla_expira}, ip {sala.pantalla_ip})"
        )
        return VincularResponse(
            ok=True,
            es_docente=es_docente,
            es_dueño=True,
            sala=_estado_sala(sala, ahora, incluir_qr=False),
            mensaje="Pantalla vinculada correctamente",
            pantalla_vinculada=True,
            pantalla_expira=sala.pantalla_expira.isoformat() if sala.pantalla_expira else None,
        )
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=error_interno(e, "Error vinculando sala"))


@router.post("/{codigo}/pantalla/revocar", response_model=VincularResponse)
def revocar_pantalla(
    codigo: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_docente)
):
    """✅ Desvincula la pantalla del aula: deja de recibir contenido al instante."""
    try:
        ahora = _ahora_utc()

        sala = _buscar_sala(db, codigo)
        if not sala:
            raise HTTPException(status_code=404, detail="Sala no encontrada")
        _validar_dueño(sala, current_user)

        _limpiar_pantalla(sala, ahora, revocada=True)
        sala.actualizado_en = ahora
        db.commit()
        db.refresh(sala)

        logger.info(f"Pantalla desvinculada de la sala {codigo} por {current_user.id}")
        return VincularResponse(
            ok=True, es_docente=True, es_dueño=True,
            sala=_estado_sala(sala, ahora),
            mensaje="Pantalla desvinculada",
            pantalla_vinculada=False,
        )
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=error_interno(e, "Error desvinculando pantalla"))


# =============================================
# ENVIAR MATERIAL
# =============================================

@router.post("/{codigo}/material", response_model=SalaEstadoResponse)
def enviar_material(
    codigo: str,
    data: EnviarMaterialRequest,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_docente)
):
    try:
        ahora = _ahora_utc()
        
        sala = _buscar_sala(db, codigo)
        if not sala:
            raise HTTPException(status_code=404, detail="Sala no encontrada")
        _validar_dueño(sala, current_user)
        if sala.estado == "CERRADO":
            raise HTTPException(status_code=400, detail="La sala ya fue cerrada")

        material = db.query(MaterialCompartido).filter(
            MaterialCompartido.id == data.material_id
        ).first()
        if not material:
            raise HTTPException(status_code=404, detail="Material no encontrado")
        if str(material.docente_id) != str(current_user.id) and current_user.rol != "admin":
            raise HTTPException(status_code=403, detail="El material no te pertenece")

        recursos = list(sala.recursos_compartidos or [])
        recursos.append(_material_publico(material))
        sala.recursos_compartidos = recursos
        sala.cantidad_recursos = len(recursos)
        # ✅ El estado ACTIVO lo marca el emparejamiento de la pantalla (vincular),
        # no el envío de material: así el panel muestra "Esperando vinculación".
        sala.actualizado_en = ahora
        db.commit()
        db.refresh(sala)
        
        logger.info(f"Material enviado a sala {codigo}: {material.titulo[:40]}")
        return _estado_sala(sala, ahora)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=error_interno(e, "Error enviando material"))


# =============================================
# QUITAR MATERIAL
# =============================================

@router.post("/{codigo}/quitar", response_model=SalaEstadoResponse)
def quitar_material(
    codigo: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_docente)
):
    try:
        ahora = _ahora_utc()
        
        sala = _buscar_sala(db, codigo)
        if not sala:
            raise HTTPException(status_code=404, detail="Sala no encontrada")
        _validar_dueño(sala, current_user)

        sala.recursos_compartidos = []
        sala.cantidad_recursos = 0
        sala.actualizado_en = ahora
        db.commit()
        db.refresh(sala)
        return _estado_sala(sala, ahora)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=error_interno(e, "Error quitando material"))


# =============================================
# CERRAR SALA
# =============================================

@router.post("/{codigo}/cerrar", response_model=VincularResponse)
def cerrar_sala(
    codigo: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_docente)
):
    try:
        ahora = _ahora_utc()
        
        sala = _buscar_sala(db, codigo)
        if not sala:
            raise HTTPException(status_code=404, detail="Sala no encontrada")
        _validar_dueño(sala, current_user)
        
        if sala.estado == "CERRADO":
            return VincularResponse(
                ok=True,
                es_docente=True,
                es_dueño=True,
                sala=_estado_sala(sala, ahora),
                mensaje="La sala ya estaba cerrada"
            )

        sala.estado = "CERRADO"
        sala.fecha_fin = ahora
        sala.duracion_segundos = int((ahora - sala.fecha_inicio).total_seconds())
        sala.actualizado_en = ahora
        db.commit()
        db.refresh(sala)
        
        logger.info(f"Sala {codigo} cerrada. Duracion: {sala.duracion_segundos}s")
        return VincularResponse(
            ok=True,
            es_docente=True,
            es_dueño=True,
            sala=_estado_sala(sala, ahora),
            mensaje="Sesion terminada correctamente"
        )
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=error_interno(e, "Error cerrando sala"))