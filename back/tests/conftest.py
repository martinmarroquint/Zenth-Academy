# back/tests/conftest.py
# =====================================================
# CONFIGURACIÓN GLOBAL DE TESTS
# - Base de datos SQLite en memoria (aislada, rápida)
# - Compatibilidad con tipos PostgreSQL (UUID, JSONB)
# - Fixtures de usuarios y tokens de autenticación
# =====================================================

import os
import sys
import uuid

import pytest
from sqlalchemy import create_engine
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# Asegurar que el paquete `app` sea importable
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# =====================================================
# COMPATIBILIDAD POSTGRESQL -> SQLITE
# Los modelos usan UUID y JSONB (solo PostgreSQL). Estos shims
# permiten crear el esquema en SQLite para los tests.
# =====================================================
from sqlalchemy.dialects.postgresql import UUID as PG_UUID, JSONB as PG_JSONB


@compiles(PG_UUID, "sqlite")
def _compile_uuid_sqlite(type_, compiler, **kw):  # noqa: ARG001
    return "CHAR(36)"


@compiles(PG_JSONB, "sqlite")
def _compile_jsonb_sqlite(type_, compiler, **kw):  # noqa: ARG001
    return "JSON"


# =====================================================
# ENGINE Y SESIÓN DE PRUEBA
# =====================================================
TEST_DATABASE_URL = "sqlite://"

test_engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,  # misma conexión para todos -> memoria compartida
)

TestingSessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=test_engine,
    expire_on_commit=False,
)


# =====================================================
# IMPORTS DE LA APP (después de registrar los shims)
# =====================================================
from app.database import Base, get_db  # noqa: E402
import app.main  # noqa: E402,F401  -> registra todos los modelos y routers

# =====================================================
# ACELERAR HASHING EN TESTS
# Argon2 con parámetros de producción es lento a propósito (~200ms por hash).
# En tests usamos parámetros mínimos: misma API, ~100x más rápido.
# =====================================================
from passlib.context import CryptContext  # noqa: E402
import app.models.usuario as _usuario_module  # noqa: E402

_usuario_module.pwd_context = CryptContext(
    schemes=["argon2"],
    deprecated="auto",
    argon2__time_cost=1,
    argon2__memory_cost=1024,   # 1 MB
    argon2__parallelism=1,
)


@pytest.fixture(scope="session", autouse=True)
def _create_schema():
    """Crea todas las tablas una vez por sesión de tests."""
    Base.metadata.create_all(bind=test_engine)
    yield
    Base.metadata.drop_all(bind=test_engine)


@pytest.fixture()
def db():
    """Sesión de BD limpia por test (rollback al finalizar)."""
    connection = test_engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)

    try:
        yield session
    finally:
        session.close()
        transaction.rollback()
        connection.close()


@pytest.fixture()
def client(db):
    """
    TestClient de FastAPI con la BD de prueba inyectada.

    NOTA: se instancia SIN context manager a propósito. El startup event de la app
    intenta conectar a Supabase (con reintentos y timeout ~10s c/u), lo que haría
    los tests lentísimos. Sin lifespan, los endpoints funcionan igual porque
    `get_db` está sobrescrito.
    """
    from fastapi.testclient import TestClient
    from app.main import app

    def _override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = _override_get_db
    try:
        yield TestClient(app)
    finally:
        app.dependency_overrides.clear()


# =====================================================
# FIXTURES DE USUARIOS
# =====================================================
def _crear_usuario(db, rol: str, email: str, password: str = "Test1234!"):
    """Helper: crea un usuario con contraseña hasheada."""
    from app.models.usuario import Usuario
    from datetime import datetime, timezone

    user = Usuario(
        id=str(uuid.uuid4()),
        email=email,
        nombres=f"Test {rol.capitalize()}",
        apellidos="QA",
        rol=rol,
        empresa_id="test-empresa",
        activo=True,
        email_verificado=True,
        fecha_registro=datetime.now(timezone.utc),
    )
    user.set_password(password)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture()
def admin_user(db):
    return _crear_usuario(db, "admin", "admin.test@zenth.test")


@pytest.fixture()
def docente_user(db):
    return _crear_usuario(db, "docente", "docente.test@zenth.test")


@pytest.fixture()
def estudiante_user(db):
    return _crear_usuario(db, "estudiante", "estudiante.test@zenth.test")


@pytest.fixture()
def otro_docente_user(db):
    """Segundo docente: para probar aislamiento/ownership."""
    return _crear_usuario(db, "docente", "docente2.test@zenth.test")


# =====================================================
# FIXTURES DE AUTENTICACIÓN
# =====================================================
def _token_para(user) -> str:
    from app.core.security import create_access_token
    return create_access_token({"sub": str(user.id), "rol": user.rol})


@pytest.fixture()
def admin_headers(admin_user):
    return {"Authorization": f"Bearer {_token_para(admin_user)}"}


@pytest.fixture()
def docente_headers(docente_user):
    return {"Authorization": f"Bearer {_token_para(docente_user)}"}


@pytest.fixture()
def estudiante_headers(estudiante_user):
    return {"Authorization": f"Bearer {_token_para(estudiante_user)}"}


@pytest.fixture()
def otro_docente_headers(otro_docente_user):
    return {"Authorization": f"Bearer {_token_para(otro_docente_user)}"}


@pytest.fixture()
def refresh_token_para():
    """Devuelve una función que genera un refresh token (para tests de seguridad)."""
    from app.core.security import create_refresh_token

    def _make(user):
        token, _jti = create_refresh_token({"sub": str(user.id), "rol": user.rol})
        return token

    return _make
