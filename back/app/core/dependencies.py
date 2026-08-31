# app/core/dependencies.py
# DEPENDENCIAS DE AUTENTICACIÓN - CON EMPRESA

from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from jose import JWTError, jwt
from typing import Optional

from app.database import get_db
from app.models.usuario import Usuario
from app.core.security import SECRET_KEY, ALGORITHM
from app.core.security_logger import log_unauthorized_access, log_role_escalation_attempt

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
    request: Request = None
) -> Usuario:
    """
    Obtiene el usuario actual a partir del token JWT
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Credenciales invalidas. Inicie sesion nuevamente.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = db.query(Usuario).filter(Usuario.id == user_id, Usuario.activo == True).first()
    if user is None:
        raise credentials_exception
    
    return user


def get_current_active_user(
    current_user: Usuario = Depends(get_current_user)
) -> Usuario:
    """
    Verifica que el usuario esté activo
    """
    if not current_user.activo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuario inactivo"
        )
    return current_user


# =============================================
# DEPENDENCIAS POR ROL
# =============================================

def require_admin(
    current_user: Usuario = Depends(get_current_active_user),
    request: Request = None
) -> Usuario:
    """
    Requiere rol de administrador
    """
    if current_user.rol != "admin":
        client_ip = request.client.host if request and request.client else "unknown"
        log_role_escalation_attempt(
            user_id=str(current_user.id),
            attempted_role="admin",
            current_role=current_user.rol,
            ip_address=client_ip
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Se requiere rol de administrador"
        )
    return current_user


def require_docente(
    current_user: Usuario = Depends(get_current_active_user),
    request: Request = None
) -> Usuario:
    """
    Requiere rol de docente o admin
    """
    if current_user.rol not in ["admin", "docente"]:
        client_ip = request.client.host if request and request.client else "unknown"
        log_role_escalation_attempt(
            user_id=str(current_user.id),
            attempted_role="docente",
            current_role=current_user.rol,
            ip_address=client_ip
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Se requiere rol de docente"
        )
    return current_user


def require_estudiante(
    current_user: Usuario = Depends(get_current_active_user)
) -> Usuario:
    """
    Requiere rol de estudiante, docente o admin
    """
    if current_user.rol not in ["admin", "docente", "estudiante"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Se requiere rol de estudiante"
        )
    return current_user


def require_roles(allowed_roles: list):
    """
    Factory para requerir múltiples roles
    """
    def dependency(
        current_user: Usuario = Depends(get_current_active_user),
        request: Request = None
    ) -> Usuario:
        if current_user.rol not in allowed_roles:
            client_ip = request.client.host if request and request.client else "unknown"
            log_role_escalation_attempt(
                user_id=str(current_user.id),
                attempted_role=str(allowed_roles),
                current_role=current_user.rol,
                ip_address=client_ip
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permisos insuficientes. Roles requeridos: {', '.join(allowed_roles)}"
            )
        return current_user
    return dependency


# =============================================
# OPCIONAL: OBTENER USUARIO SIN AUTENTICACIÓN
# =============================================

def get_current_user_optional(
    token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> Optional[Usuario]:
    """
    Obtiene el usuario actual si existe, o None si no está autenticado
    """
    if not token:
        return None
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            return None
    except JWTError:
        return None
    
    user = db.query(Usuario).filter(Usuario.id == user_id, Usuario.activo == True).first()
    return user


def get_current_user_id(
    current_user: Usuario = Depends(get_current_active_user)
) -> str:
    """
    Obtiene el ID del usuario actual
    """
    return current_user.id