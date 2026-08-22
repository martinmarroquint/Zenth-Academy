# app/api/auth.py
# ENDPOINTS DE AUTENTICACIÓN - CON UUID CORREGIDO

from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from typing import Optional
import uuid
import logging
import os

from app.database import get_db
from app.models.usuario import Usuario
from app.models.refresh_token import RefreshToken
from app.models.alumno import Alumno
from app.schemas.auth import (
    LoginRequest, TokenResponse, RegisterRequest, RegisterResponse,
    UserResponse, UserUpdateRequest, ChangePasswordRequest,
    UserCreateRequest, UserListResponse, MensajeResponse,
    RefreshRequest, TokenRefreshResponse
)
from app.core.dependencies import (
    get_current_user, get_current_active_user,
    require_admin, require_docente
)
from app.core.security import (
    create_access_token, create_refresh_token, decode_token, hash_token,
    ACCESS_TOKEN_EXPIRE_MINUTES, REFRESH_TOKEN_EXPIRE_MINUTES
)
from app.core.ratelimit import rate_limit
from datetime import timedelta, datetime, timezone

logger = logging.getLogger(__name__)
router = APIRouter()

# ✅ UUID REAL DE LA EMPRESA ZENTH ACADEMY
EMPRESA_ID_DEFAULT = "ada6b7c4-162e-457c-9d2a-89006be2b8c9"


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
    _rate_limited = Depends(rate_limit(10, 60))
):
    """
    Inicia sesión con email y contraseña
    """
    # ✅ FILTRAR POR EMAIL Y EMPRESA (UUID)
    user = db.query(Usuario).filter(
        Usuario.email == form_data.username,
        Usuario.empresa_id == EMPRESA_ID_DEFAULT
    ).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.verify_password(form_data.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.activo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuario inactivo"
        )
    
    # Actualizar último acceso
    user.ultimo_acceso = datetime.now(timezone.utc)
    db.commit()
    
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
    Registra un nuevo usuario
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
    
    if data.rol not in ["estudiante", "docente"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Rol no permitido para registro público"
        )
    
    user = Usuario(
        id=str(uuid.uuid4()),
        email=data.email,
        nombres=data.nombres,
        apellidos=data.apellidos,
        telefono=data.telefono,
        rol=data.rol,
        empresa_id=EMPRESA_ID_DEFAULT,
        institucion=data.institucion,
        especialidad=data.especialidad if data.rol == "docente" else None,
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
    if record.expires_at < datetime.utcnow():
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
    bootstrap_key = os.getenv("BOOTSTRAP_KEY", "zenthacademy-bootstrap")
    provided = request.headers.get("X-Bootstrap-Key", "")
    if provided != bootstrap_key:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Llave de inicialización inválida"
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
    user.set_password("Admin123!")
    
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