# app/api/auth.py
# ENDPOINTS DE AUTENTICACIÓN - CON UUID CORREGIDO

from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from typing import Optional
import uuid
import logging
import os
import asyncio
import secrets

from app.database import get_db
from app.models.usuario import Usuario
from app.models.refresh_token import RefreshToken
from app.models.alumno import Alumno
from app.schemas.auth import (
    LoginRequest, TokenResponse, RegisterRequest, RegisterResponse,
    UserResponse, UserUpdateRequest, ChangePasswordRequest,
    UserCreateRequest, UserListResponse, MensajeResponse,
    RefreshRequest, TokenRefreshResponse, GoogleLoginRequest
)
from app.core.security import (
    create_access_token, create_refresh_token, decode_token, hash_token,
    ACCESS_TOKEN_EXPIRE_MINUTES, REFRESH_TOKEN_EXPIRE_MINUTES
)
from app.core.dependencies import get_current_user, get_current_active_user, require_admin
from app.core.ratelimit import rate_limit
from app.core.security_logger import (
    log_login_attempt, log_unauthorized_access, log_password_change
)
from app.core.geo_service import log_login_geo
from app.core.google_auth import verificar_id_token_google
from datetime import timedelta, datetime, timezone

logger = logging.getLogger(__name__)
router = APIRouter()

# ✅ UUID de la empresa por defecto (configurable por entorno, no hardcodeado)
from app.config import settings as _settings
EMPRESA_ID_DEFAULT = _settings.EMPRESA_ID_DEFAULT


def _user_dict(user: Usuario) -> dict:
    """Serializa un usuario a dict"""
    return {
        "id": str(user.id),
        "email": user.email,
        "nombres": user.nombres,
        "apellidos": user.apellidos,
        "rol": user.rol,
        "empresa_id": str(user.empresa_id) if user.empresa_id else None,
        "activo": user.activo,
        "email_verificado": user.email_verificado,
        "telefono": user.telefono,
        "foto_url": user.foto_url,
        "especialidad": user.especialidad,
        "biografia": user.biografia,
        "institucion": user.institucion,
        "ultimo_acceso": user.ultimo_acceso,
        "fecha_registro": user.fecha_registro
    }


def _crear_tokens(db: Session, user: Usuario) -> dict:
    """Genera par de tokens (access + refresh) y persiste el refresh en BD.

    Permite múltiples sesiones por usuario; la rotación ocurre al renovar
    (el refresh usado se revoca) y el logout revoca el refresh indicado.
    """
    access_token = create_access_token(
        data={
            "sub": str(user.id),
            "rol": user.rol,
            "empresa_id": str(user.empresa_id) if user.empresa_id else None
        },
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    refresh_token, jti = create_refresh_token(
        data={"sub": str(user.id)},
        expires_delta=timedelta(minutes=REFRESH_TOKEN_EXPIRE_MINUTES)
    )
    db.add(RefreshToken(
        token_hash=hash_token(jti),
        user_id=str(user.id),
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=REFRESH_TOKEN_EXPIRE_MINUTES),
        revoked=False
    ))
    db.commit()
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        "token_type": "bearer"
    }


# =============================================
# AUTH
# =============================================

@router.post("/login", response_model=TokenResponse)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
    _rate_limited = Depends(rate_limit(10, 60)),
    request: Request = None
):
    """
    Inicia sesión con email y contraseña.
    Incluye protección contra fuerza bruta y logging de seguridad.
    """
    from app.core.login_attempts import check_login_allowed, record_failed_attempt, record_successful_login
    
    # Obtener IP del cliente
    client_ip = request.client.host if request and request.client else "unknown"
    user_agent = request.headers.get("user-agent", "unknown") if request else "unknown"
    
    # Verificar si está bloqueado
    check_login_allowed(form_data.username)
    
    # ✅ FIX CRÍTICO: buscar SOLO por email (es único en la tabla).
    # Antes se filtraba también por `empresa_id == EMPRESA_ID_DEFAULT`, lo que
    # dejaba FUERA a usuarios legítimos con empresa_id NULL o distinto
    # (ej: docente@zenth.com y estudiante@zenth.com no podían iniciar sesión).
    user = db.query(Usuario).filter(
        Usuario.email == form_data.username
    ).first()
    
    if not user:
        # Registrar intento fallido y log de seguridad
        record_failed_attempt(form_data.username)
        log_login_attempt(
            email=form_data.username,
            success=False,
            ip_address=client_ip,
            user_agent=user_agent,
            reason="Usuario no encontrado"
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.verify_password(form_data.password):
        # Registrar intento fallido y log de seguridad
        result = record_failed_attempt(form_data.username)
        log_login_attempt(
            email=form_data.username,
            success=False,
            ip_address=client_ip,
            user_agent=user_agent,
            reason="Contraseña incorrecta"
        )
        
        detail = "Credenciales incorrectas"
        if result.get("blocked"):
            detail = result["message"]
        elif result.get("remaining_attempts", 10) <= 2:
            detail = f"Credenciales incorrectas. Te quedan {result['remaining_attempts']} intento(s)."
        
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail,
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.activo:
        log_login_attempt(
            email=form_data.username,
            success=False,
            ip_address=client_ip,
            user_agent=user_agent,
            reason="Usuario inactivo"
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuario inactivo"
        )
    
    # Login exitoso - resetear contador y log
    record_successful_login(form_data.username)
    log_login_attempt(
        email=form_data.username,
        success=True,
        ip_address=client_ip,
        user_agent=user_agent
    )
    
    # Actualizar ultimo acceso
    user.ultimo_acceso = datetime.now(timezone.utc)
    db.commit()
    
    # Geolocalizacion fire-and-forget (no bloquea el login)
    asyncio.create_task(
        log_login_geo(
            db_session=db,
            user_id=str(user.id),
            email=user.email,
            ip_address=client_ip,
            user_agent=user_agent
        )
    )
    
    tokens = _crear_tokens(db, user)
    return {
        "access_token": tokens["access_token"],
        "refresh_token": tokens["refresh_token"],
        "expires_in": tokens["expires_in"],
        "token_type": "bearer",
        "user": _user_dict(user)
    }


@router.post("/google", response_model=TokenResponse)
async def login_google(
    data: GoogleLoginRequest,
    db: Session = Depends(get_db),
    _rate_limited = Depends(rate_limit(10, 60)),
):
    """Login con Google.

    El frontend obtiene un ID token con Google Identity Services y lo envía aquí.
    Validamos el token con las claves públicas de Google y, si es válido,
    emitimos NUESTRO JWT (el rol/empresa se mantienen intactos).
    """
    if not _settings.GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=503, detail="Login con Google no está configurado")

    try:
        info = verificar_id_token_google(data.credential)
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))

    email = (info.get("email") or "").lower().strip()
    if not email:
        raise HTTPException(status_code=401, detail="Google no devolvió un correo")
    if not info.get("email_verified", False):
        raise HTTPException(status_code=401, detail="El correo de Google no está verificado")

    google_sub = info.get("sub")
    user = db.query(Usuario).filter(Usuario.email == email).first()

    if not user:
        # ✅ Nuevo usuario: entra como estudiante (mismo flujo que el registro)
        user = Usuario(
            id=str(uuid.uuid4()),
            email=email,
            nombres=info.get("given_name"),
            apellidos=info.get("family_name"),
            foto_url=info.get("picture"),
            rol="estudiante",
            empresa_id=EMPRESA_ID_DEFAULT,
            activo=True,
            email_verificado=True,
            auth_provider="google",
            google_id=google_sub,
            fecha_registro=datetime.now(timezone.utc),
        )
        db.add(user)
        logger.info(f"Nuevo usuario registrado vía Google: {email}")
    else:
        if not user.activo:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Usuario inactivo")
        # ✅ Vinculación: no duplicar usuarios; solo asociar el proveedor
        if not user.google_id and google_sub:
            ya_usado = db.query(Usuario).filter(
                Usuario.google_id == google_sub, Usuario.id != user.id
            ).first()
            if not ya_usado:
                user.google_id = google_sub
        if not user.auth_provider or user.auth_provider == "local":
            user.auth_provider = "google"
        if not user.email_verificado:
            user.email_verificado = True
        if not user.foto_url and info.get("picture"):
            user.foto_url = info.get("picture")

    user.ultimo_acceso = datetime.now(timezone.utc)

    # ✅ RENDIMIENTO: un solo commit. `_crear_tokens` persiste el usuario
    # (nuevo o actualizado) y el refresh token en la MISMA transacción,
    # evitando 2-3 round-trips extra a la BD (Supabase ~200-300ms c/u).
    tokens = _crear_tokens(db, user)
    return {
        "access_token": tokens["access_token"],
        "refresh_token": tokens["refresh_token"],
        "expires_in": tokens["expires_in"],
        "token_type": "bearer",
        "user": _user_dict(user)
    }


@router.post("/register", response_model=TokenResponse)
async def register(
    data: RegisterRequest,
    db: Session = Depends(get_db),
    _rate_limited = Depends(rate_limit(5, 60))
):
    """
    Registra un nuevo usuario como estudiante.
    Los usuarios deben solicitar ser docente desde su perfil.
    """
    existing = db.query(Usuario).filter(
        Usuario.email == data.email,
        Usuario.empresa_id == EMPRESA_ID_DEFAULT
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El email ya está registrado"
        )
    
    # ✅ SIEMPRE REGISTRAR COMO ESTUDIANTE
    # Los usuarios deben solicitar ser docente desde /solicitar-docente
    rol = "estudiante"
    
    user = Usuario(
        id=str(uuid.uuid4()),
        email=data.email,
        nombres=data.nombres,
        apellidos=data.apellidos,
        telefono=data.telefono,
        rol=rol,
        empresa_id=EMPRESA_ID_DEFAULT,
        institucion=data.institucion,
        especialidad=None,
        activo=True,
        email_verificado=False,
        fecha_registro=datetime.now(timezone.utc)
    )
    user.set_password(data.password)
    
    db.add(user)
    db.commit()
    db.refresh(user)

    # FASE F: el estudiante registrado es también un alumno del catálogo único.
    # alumno.id == usuario.id para que resultados de exámenes embebidos
    # (alumno_id = Usuario.id) coincidan con el catálogo de alumnos.
    if user.rol == "estudiante":
        # FIX: alumnos.id y alumnos.usuario_id son VARCHAR; user.id es UUID
        # nativo tras db.refresh (columna usuarios.id es uuid) -> castear a str
        uid = str(user.id)
        alumno_existente = db.query(Alumno).filter(Alumno.usuario_id == uid).first()
        if not alumno_existente:
            db.add(Alumno(
                id=uid,
                usuario_id=uid,
                nombres=user.nombres,
                apellidos=user.apellidos,
                email=user.email,
                telefono=user.telefono,
                institucion=data.institucion,
                activo=True
            ))
            db.commit()
    
    logger.info(f"Nuevo usuario registrado: {user.email} ({user.rol}) en empresa {user.empresa_id}")
    
    tokens = _crear_tokens(db, user)
    return {
        "access_token": tokens["access_token"],
        "refresh_token": tokens["refresh_token"],
        "expires_in": tokens["expires_in"],
        "token_type": "bearer",
        "user": _user_dict(user)
    }


@router.post("/refresh", response_model=TokenRefreshResponse)
async def refresh_token(
    data: RefreshRequest,
    db: Session = Depends(get_db)
):
    """
    Renueva el par de tokens usando un refresh token válido (rotación).
    El refresh token usado se revoca y se emite uno nuevo.
    """
    payload = decode_token(data.refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token de refresco inválido"
        )

    jti = payload.get("jti")
    sub = payload.get("sub")
    if not jti or not sub:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token de refresco inválido"
        )

    record = db.query(RefreshToken).filter(
        RefreshToken.token_hash == hash_token(jti)
    ).first()
    if not record or record.revoked:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sesión expirada. Inicie sesión nuevamente."
        )
    # ✅ FIX: `record.expires_at` puede venir con timezone (Postgres) o sin ella (SQLite).
    # Comparar aware vs naive lanzaba TypeError. Normalizamos a UTC aware.
    expira = record.expires_at
    if expira is not None:
        if expira.tzinfo is None:
            expira = expira.replace(tzinfo=timezone.utc)
        if expira < datetime.now(timezone.utc):
            record.revoked = True
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Sesión expirada. Inicie sesión nuevamente."
            )

    user = db.query(Usuario).filter(
        Usuario.id == sub,
        Usuario.activo == True
    ).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario no encontrado"
        )

    # Rotación: revocar el token usado y emitir uno nuevo
    record.revoked = True
    db.commit()

    tokens = _crear_tokens(db, user)
    return {
        "access_token": tokens["access_token"],
        "refresh_token": tokens["refresh_token"],
        "expires_in": tokens["expires_in"],
        "token_type": "bearer"
    }


@router.post("/logout", response_model=MensajeResponse)
async def logout(
    data: RefreshRequest,
    db: Session = Depends(get_db)
):
    """
    Revoca el refresh token indicado, cerrando la sesión.
    """
    payload = decode_token(data.refresh_token)
    if payload and payload.get("type") == "refresh" and payload.get("jti"):
        record = db.query(RefreshToken).filter(
            RefreshToken.token_hash == hash_token(payload["jti"])
        ).first()
        if record:
            record.revoked = True
            db.commit()
    return {"mensaje": "Sesión cerrada correctamente", "ok": True}


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: Usuario = Depends(get_current_active_user)
):
    """
    Obtiene la información del usuario actual
    """
    return {
        "id": str(current_user.id),
        "email": current_user.email,
        "nombres": current_user.nombres,
        "apellidos": current_user.apellidos,
        "rol": current_user.rol,
        "empresa_id": str(current_user.empresa_id) if current_user.empresa_id else None,
        "activo": current_user.activo,
        "email_verificado": current_user.email_verificado,
        "telefono": current_user.telefono,
        "foto_url": current_user.foto_url,
        "especialidad": current_user.especialidad,
        "biografia": current_user.biografia,
        "institucion": current_user.institucion,
        "ultimo_acceso": current_user.ultimo_acceso,
        "fecha_registro": current_user.fecha_registro
    }


@router.put("/me", response_model=UserResponse)
async def update_current_user(
    data: UserUpdateRequest,
    current_user: Usuario = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(current_user, field, value)
    
    db.commit()
    db.refresh(current_user)
    
    return {
        "id": str(current_user.id),
        "email": current_user.email,
        "nombres": current_user.nombres,
        "apellidos": current_user.apellidos,
        "rol": current_user.rol,
        "empresa_id": str(current_user.empresa_id) if current_user.empresa_id else None,
        "activo": current_user.activo,
        "email_verificado": current_user.email_verificado,
        "telefono": current_user.telefono,
        "foto_url": current_user.foto_url,
        "especialidad": current_user.especialidad,
        "biografia": current_user.biografia,
        "institucion": current_user.institucion,
        "ultimo_acceso": current_user.ultimo_acceso,
        "fecha_registro": current_user.fecha_registro
    }


@router.post("/me/cambiar-password", response_model=MensajeResponse)
async def change_password(
    data: ChangePasswordRequest,
    current_user: Usuario = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if not current_user.verify_password(data.current_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Contraseña actual incorrecta"
        )
    
    current_user.set_password(data.new_password)
    db.commit()
    
    return {"mensaje": "Contraseña actualizada correctamente", "ok": True}


@router.get("/verificar", response_model=UserResponse)
async def verificar_token(
    current_user: Usuario = Depends(get_current_active_user)
):
    return {
        "id": str(current_user.id),
        "email": current_user.email,
        "nombres": current_user.nombres,
        "apellidos": current_user.apellidos,
        "rol": current_user.rol,
        "empresa_id": str(current_user.empresa_id) if current_user.empresa_id else None,
        "activo": current_user.activo,
        "email_verificado": current_user.email_verificado,
        "telefono": current_user.telefono,
        "foto_url": current_user.foto_url,
        "especialidad": current_user.especialidad,
        "biografia": current_user.biografia,
        "institucion": current_user.institucion,
        "ultimo_acceso": current_user.ultimo_acceso,
        "fecha_registro": current_user.fecha_registro
    }


# =============================================
# ADMIN - GESTIÓN DE USUARIOS
# =============================================

@router.get("/usuarios", response_model=UserListResponse)
async def listar_usuarios(
    rol: Optional[str] = None,
    activo: Optional[bool] = None,
    busqueda: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_admin)
):
    query = db.query(Usuario).filter(
        Usuario.empresa_id == current_user.empresa_id
    )
    
    if rol:
        query = query.filter(Usuario.rol == rol)
    
    if activo is not None:
        query = query.filter(Usuario.activo == activo)
    
    if busqueda:
        query = query.filter(
            (Usuario.email.ilike(f"%{busqueda}%")) |
            (Usuario.nombres.ilike(f"%{busqueda}%")) |
            (Usuario.apellidos.ilike(f"%{busqueda}%"))
        )
    
    total = query.count()
    usuarios = query.order_by(Usuario.created_at.desc()).offset(offset).limit(limit).all()
    
    usuarios_list = []
    for u in usuarios:
        usuarios_list.append({
            "id": str(u.id),
            "email": u.email,
            "nombres": u.nombres,
            "apellidos": u.apellidos,
            "rol": u.rol,
            "empresa_id": str(u.empresa_id) if u.empresa_id else None,
            "activo": u.activo,
            "email_verificado": u.email_verificado,
            "telefono": u.telefono,
            "foto_url": u.foto_url,
            "especialidad": u.especialidad,
            "biografia": u.biografia,
            "institucion": u.institucion,
            "ultimo_acceso": u.ultimo_acceso,
            "fecha_registro": u.fecha_registro
        })
    
    return {
        "total": total,
        "usuarios": usuarios_list
    }


@router.post("/usuarios", response_model=UserResponse, status_code=201)
async def crear_usuario_admin(
    data: UserCreateRequest,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_admin)
):
    existing = db.query(Usuario).filter(
        Usuario.email == data.email,
        Usuario.empresa_id == current_user.empresa_id
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El email ya está registrado"
        )
    
    user = Usuario(
        id=str(uuid.uuid4()),
        email=data.email,
        nombres=data.nombres,
        apellidos=data.apellidos,
        rol=data.rol,
        empresa_id=current_user.empresa_id,
        activo=True,
        email_verificado=True,
        fecha_registro=datetime.now(timezone.utc)
    )
    user.set_password(data.password)
    
    db.add(user)
    db.commit()
    db.refresh(user)
    
    logger.info(f"Admin creó usuario: {user.email} ({user.rol}) en empresa {user.empresa_id}")
    
    return {
        "id": str(user.id),
        "email": user.email,
        "nombres": user.nombres,
        "apellidos": user.apellidos,
        "rol": user.rol,
        "empresa_id": str(user.empresa_id) if user.empresa_id else None,
        "activo": user.activo,
        "email_verificado": user.email_verificado,
        "telefono": user.telefono,
        "foto_url": user.foto_url,
        "especialidad": user.especialidad,
        "biografia": user.biografia,
        "institucion": user.institucion,
        "ultimo_acceso": user.ultimo_acceso,
        "fecha_registro": user.fecha_registro
    }


@router.put("/usuarios/{user_id}", response_model=UserResponse)
async def actualizar_usuario_admin(
    user_id: str,
    data: UserUpdateRequest,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_admin)
):
    user = db.query(Usuario).filter(
        Usuario.id == user_id,
        Usuario.empresa_id == current_user.empresa_id
    ).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado"
        )
    
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(user, field, value)
    
    db.commit()
    db.refresh(user)
    
    return {
        "id": str(user.id),
        "email": user.email,
        "nombres": user.nombres,
        "apellidos": user.apellidos,
        "rol": user.rol,
        "empresa_id": str(user.empresa_id) if user.empresa_id else None,
        "activo": user.activo,
        "email_verificado": user.email_verificado,
        "telefono": user.telefono,
        "foto_url": user.foto_url,
        "especialidad": user.especialidad,
        "biografia": user.biografia,
        "institucion": user.institucion,
        "ultimo_acceso": user.ultimo_acceso,
        "fecha_registro": user.fecha_registro
    }


@router.delete("/usuarios/{user_id}", response_model=MensajeResponse)
async def eliminar_usuario_admin(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_admin)
):
    user = db.query(Usuario).filter(
        Usuario.id == user_id,
        Usuario.empresa_id == current_user.empresa_id
    ).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado"
        )
    
    if user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No puedes desactivarte a ti mismo"
        )
    
    user.activo = False
    db.commit()
    
    return {"mensaje": "Usuario desactivado correctamente", "ok": True}


# =============================================
# SEED: CREAR ADMIN INICIAL
# =============================================

@router.post("/seed/admin", response_model=UserResponse)
async def crear_admin_inicial(
    db: Session = Depends(get_db),
    request: Request = None
):
    # ✅ SEGURIDAD: sin valor por defecto. Si no está configurado, el endpoint queda deshabilitado.
    bootstrap_key = os.getenv("BOOTSTRAP_KEY")
    admin_password = os.getenv("ADMIN_BOOTSTRAP_PASSWORD")

    if not bootstrap_key or not admin_password:
        logger.warning(
            "Intento de usar /seed/admin sin BOOTSTRAP_KEY/ADMIN_BOOTSTRAP_PASSWORD configurados"
        )
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Inicialización deshabilitada. Configure BOOTSTRAP_KEY y ADMIN_BOOTSTRAP_PASSWORD."
        )

    provided = request.headers.get("X-Bootstrap-Key", "")
    # Comparación en tiempo constante para evitar timing attacks
    if not secrets.compare_digest(provided, bootstrap_key):
        logger.warning("Intento de seed admin con llave inválida")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Llave de inicialización inválida"
        )

    # ✅ SEGURIDAD: validar fortaleza mínima de la contraseña de bootstrap
    if len(admin_password) < 12:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="ADMIN_BOOTSTRAP_PASSWORD debe tener al menos 12 caracteres"
        )

    email = "admin@zenthacademy.com"
    existing = db.query(Usuario).filter(
        Usuario.email == email,
        Usuario.empresa_id == EMPRESA_ID_DEFAULT
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El administrador ya existe"
        )
    
    user = Usuario(
        id=str(uuid.uuid4()),
        email=email,
        nombres="Administrador",
        apellidos="Zenth Academy",
        rol="admin",
        empresa_id=EMPRESA_ID_DEFAULT,
        activo=True,
        email_verificado=True,
        fecha_registro=datetime.now(timezone.utc)
    )
    # ✅ SEGURIDAD: contraseña provista por entorno, nunca hardcodeada
    user.set_password(admin_password)
    
    db.add(user)
    db.commit()
    db.refresh(user)
    
    logger.info(f"Admin inicial creado: {email} en empresa {EMPRESA_ID_DEFAULT}")
    
    return {
        "id": str(user.id),
        "email": user.email,
        "nombres": user.nombres,
        "apellidos": user.apellidos,
        "rol": user.rol,
        "empresa_id": str(user.empresa_id) if user.empresa_id else None,
        "activo": user.activo,
        "email_verificado": user.email_verificado,
        "telefono": user.telefono,
        "foto_url": user.foto_url,
        "especialidad": user.especialidad,
        "biografia": user.biografia,
        "institucion": user.institucion,
        "ultimo_acceso": user.ultimo_acceso,
        "fecha_registro": user.fecha_registro
    }


# =============================================
# LOGIN SOCIAL (OAuth 2.0): GOOGLE / MICROSOFT
# =============================================
from fastapi.responses import RedirectResponse  # noqa: E402
from urllib.parse import urlencode  # noqa: E402
from app.core import oauth as oauth_lib  # noqa: E402


@router.get("/oauth/providers")
async def oauth_providers():
    """Indica qué proveedores de login social están configurados."""
    return oauth_lib.proveedores_disponibles()


@router.get("/oauth/{provider}/login")
async def oauth_login(provider: str, redirect: Optional[str] = None):
    """Redirige al usuario al proveedor (Google/Microsoft) para autenticarse."""
    provider = (provider or "").lower()
    if provider not in ("google", "microsoft"):
        raise HTTPException(status_code=400, detail="Proveedor no soportado")

    state = oauth_lib.generar_state(redirect or "")
    url = oauth_lib.url_autorizacion(provider, state)
    if not url:
        raise HTTPException(
            status_code=503,
            detail=f"El inicio de sesión con {provider.title()} no está configurado",
        )
    return RedirectResponse(url)


@router.get("/oauth/{provider}/callback")
async def oauth_callback(
    provider: str,
    code: Optional[str] = None,
    state: Optional[str] = None,
    error: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """Recibe el callback del proveedor, crea/vincula el usuario y emite NUESTRO JWT."""
    from app.config import settings as _s
    frontend = _s.FRONTEND_URL.rstrip("/")

    def volver_al_login(motivo: str):
        return RedirectResponse(f"{frontend}/login?error={motivo}")

    provider = (provider or "").lower()
    if provider not in ("google", "microsoft"):
        return volver_al_login("proveedor_invalido")
    if error:
        return volver_al_login("cancelado")
    if not code or not state:
        return volver_al_login("parametros_faltantes")

    # 1) Validar state (anti-CSRF)
    destino = oauth_lib.validar_state(state)
    if destino is None:
        logger.warning(f"State OAuth inválido o expirado ({provider})")
        return volver_al_login("sesion_expirada")

    # 2) Intercambiar el código por los datos del usuario
    datos = await oauth_lib.intercambiar_codigo(provider, code)
    if not datos or not datos.get("email"):
        return volver_al_login("oauth_fallido")

    email = datos["email"]

    # 3) Buscar por ID del proveedor, luego por email (vincular cuenta existente)
    if provider == "google":
        user = db.query(Usuario).filter(Usuario.google_id == datos["provider_id"]).first()
    else:
        user = db.query(Usuario).filter(Usuario.microsoft_id == datos["provider_id"]).first()

    if not user:
        user = db.query(Usuario).filter(Usuario.email == email).first()

    if user:
        # Vincular proveedor y completar datos faltantes
        if provider == "google" and not user.google_id:
            user.google_id = datos["provider_id"]
        if provider == "microsoft" and not user.microsoft_id:
            user.microsoft_id = datos["provider_id"]
        if not user.foto_url and datos.get("foto_url"):
            user.foto_url = datos["foto_url"]
        if not user.nombres and datos.get("nombres"):
            user.nombres = datos["nombres"]
        if not user.apellidos and datos.get("apellidos"):
            user.apellidos = datos["apellidos"]
        if datos.get("email_verificado"):
            user.email_verificado = True
        logger.info(f"Login social ({provider}): cuenta vinculada {email}")
    else:
        # Crear usuario nuevo (rol estudiante por defecto)
        user = Usuario(
            id=str(uuid.uuid4()),
            email=email,
            password_hash=None,
            auth_provider=provider,
            nombres=datos.get("nombres") or email.split("@")[0],
            apellidos=datos.get("apellidos") or "",
            foto_url=datos.get("foto_url"),
            rol="estudiante",
            empresa_id=EMPRESA_ID_DEFAULT,
            activo=True,
            email_verificado=bool(datos.get("email_verificado")),
            fecha_registro=datetime.now(timezone.utc),
        )
        if provider == "google":
            user.google_id = datos["provider_id"]
        else:
            user.microsoft_id = datos["provider_id"]
        db.add(user)
        logger.info(f"Login social ({provider}): usuario nuevo {email}")

    if not user.activo:
        return volver_al_login("usuario_inactivo")

    # 4) Emitir NUESTROS tokens
    user.ultimo_acceso = datetime.now(timezone.utc)
    db.commit()
    db.refresh(user)

    tokens = _crear_tokens(db, user)

    # 5) Volver al frontend con los tokens
    params = urlencode({
        "access_token": tokens["access_token"],
        "refresh_token": tokens.get("refresh_token", ""),
        "redirect": destino or "",
    })
    return RedirectResponse(f"{frontend}/auth/callback?{params}")