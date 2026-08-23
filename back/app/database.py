# app/database.py - VERSIÓN CORREGIDA
from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from typing import Generator, Tuple, Dict, Any
import logging
import time
from app.config import settings
import re

# Configurar logger
logger = logging.getLogger(__name__)

# =====================================================
# CONFIGURACIÓN DEL ENGINE OPTIMIZADA PARA SUPABASE
# =====================================================

def create_database_engine():
    """
    Crea el engine de base de datos con configuración optimizada para Supabase
    """
    # Obtener la URL
    database_url = settings.SUPABASE_DATABASE_URL
    
    # Detectar si es pooler y necesita el project_id en connect_args
    is_pooler = "pooler" in database_url.lower()
    
    # Configuración base de connect_args
    connect_args = {
        "connect_timeout": 10,
        "keepalives": 1,
        "keepalives_idle": 30,
        "keepalives_interval": 10,
        "keepalives_count": 5,
        "sslmode": "require",
    }
    
    # ✅ Si es pooler, agregar el project_id en options
    if is_pooler:
        # Extraer el project_id de la URL o usar el de settings
        project_id = "rpphjdgalniijuktnorf"  # Tu project ID
        
        # Verificar si ya tiene options en la URL
        if "options=" not in database_url:
            # Agregar options a la URL
            if "?" in database_url:
                database_url += f"&options=project%3D{project_id}"
            else:
                database_url += f"?options=project%3D{project_id}"
        
        # También agregar en connect_args como respaldo
        connect_args["options"] = f"-c project={project_id}"
        
        logger.info(f"🔧 Configuración para pooler: project_id={project_id}")
    
    # Configuración del engine
    engine_config = {
        "pool_pre_ping": True,
        "pool_recycle": 3600,
        "pool_size": 5,
        "max_overflow": 10,
        "echo": settings.DEBUG,
        "echo_pool": settings.DEBUG,
        "connect_args": connect_args,
    }
    
    try:
        engine = create_engine(database_url, **engine_config)
        logger.info(f"✅ Engine de base de datos creado correctamente")
        logger.info(f"📡 Host: {settings.SUPABASE_DB_HOST}")
        logger.info(f"🔌 Puerto: {settings.SUPABASE_DB_PORT}")
        logger.info(f"💾 Base: {settings.SUPABASE_DB_NAME}")
        return engine
    except Exception as e:
        logger.error(f"❌ Error creando engine de base de datos: {e}")
        raise

# Crear engine global
engine = create_database_engine()

# Crear sesión local
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    expire_on_commit=False
)

# Base para modelos
Base = declarative_base()

# =====================================================
# FUNCIONES DE VERIFICACIÓN Y MONITOREO
# =====================================================

def check_db_connection() -> Tuple[bool, str]:
    """
    Verifica la conexión a la base de datos con reintentos
    """
    max_retries = 3
    retry_delay = 2
    
    for attempt in range(max_retries):
        try:
            with engine.connect() as conn:
                result = conn.execute(text("SELECT 1")).scalar()
                conn.commit()
                
                if result == 1:
                    return True, "Conexión exitosa a la base de datos"
                else:
                    return False, "Resultado inesperado en consulta de prueba"
                    
        except Exception as e:
            logger.warning(f"Intento {attempt + 1}/{max_retries} falló: {e}")
            if attempt < max_retries - 1:
                time.sleep(retry_delay)
            else:
                logger.error(f"❌ Error de conexión a BD después de {max_retries} intentos: {e}")
                return False, f"Error de conexión: {str(e)}"
    
    return False, "No se pudo establecer conexión"

def get_pool_stats() -> Dict[str, Any]:
    """
    Obtiene estadísticas del pool de conexiones
    """
    try:
        pool = engine.pool
        
        stats = {
            "size": pool.size(),
            "checked_in_connections": pool.checkedin(),
            "overflow": pool.overflow(),
            "available_connections": pool.checkedin(),
        }
        
        try:
            stats["total"] = pool.total()
        except AttributeError:
            stats["total"] = pool.size() + pool.overflow()
        
        if stats["total"] > 0:
            stats["usage_percentage"] = round(
                ((stats["total"] - stats["checked_in_connections"]) / stats["total"]) * 100,
                2
            )
        else:
            stats["usage_percentage"] = 0
            
        return stats
        
    except Exception as e:
        logger.error(f"Error obteniendo estadísticas del pool: {e}")
        return {
            "error": str(e),
            "size": 0,
            "checked_in_connections": 0,
            "overflow": 0,
            "total": 0,
            "usage_percentage": 0
        }

def test_query() -> Dict[str, Any]:
    """
    Ejecuta una consulta de prueba
    """
    try:
        with engine.connect() as conn:
            version = conn.execute(text("SELECT version()")).scalar()
            server_time = conn.execute(text("SELECT NOW()")).scalar()
            conn.commit()
            
            return {
                "success": True,
                "postgresql_version": version,
                "server_time": server_time.isoformat() if server_time else None,
                "database": settings.SUPABASE_DB_NAME
            }
    except Exception as e:
        logger.error(f"Error en consulta de prueba: {e}")
        return {
            "success": False,
            "error": str(e)
        }

# =====================================================
# DEPENDENCIA PRINCIPAL PARA FASTAPI
# =====================================================

def get_db() -> Generator[Session, None, None]:
    """
    Dependencia para obtener sesión de base de datos
    """
    db = None
    try:
        db = SessionLocal()
        yield db
        db.commit()
    except Exception as e:
        if db:
            db.rollback()
        logger.error(f"Error en operación de base de datos: {e}")
        raise
    finally:
        if db:
            db.close()

# =====================================================
# FUNCIONES DE INICIALIZACIÓN Y LIMPIEZA
# =====================================================

def init_db() -> bool:
    """
    Inicializa la base de datos creando las tablas si no existen
    """
    try:
        logger.info("🔄 Inicializando base de datos...")
        
        connected, message = check_db_connection()
        if not connected:
            logger.error(f"❌ No se puede inicializar BD: {message}")
            return False
        
        Base.metadata.create_all(bind=engine)
        logger.info("✅ Tablas creadas/verificadas correctamente")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Error inicializando base de datos: {e}")
        return False

def close_db_connections() -> None:
    """
    Cierra todas las conexiones del pool
    """
    try:
        logger.info("🔄 Cerrando conexiones de base de datos...")
        engine.dispose()
        logger.info("✅ Conexiones de BD cerradas correctamente")
    except Exception as e:
        logger.error(f"❌ Error cerrando conexiones de BD: {e}")

def get_db_status() -> Dict[str, Any]:
    """
    Obtiene el estado completo de la base de datos
    """
    connected, message = check_db_connection()
    pool_stats = get_pool_stats()
    
    status = {
        "connected": connected,
        "message": message,
        "pool_stats": pool_stats,
        "database_info": {
            "host": settings.SUPABASE_DB_HOST,
            "name": settings.SUPABASE_DB_NAME,
            "port": settings.SUPABASE_DB_PORT,
            "environment": settings.ENVIRONMENT
        }
    }
    
    if connected:
        test_results = test_query()
        status["test_query"] = test_results
    
    return status

# =====================================================
# EVENTOS DE APLICACIÓN
# =====================================================

async def startup_db_events() -> None:
    """
    Eventos a ejecutar al iniciar la aplicación
    """
    logger.info("=" * 60)
    logger.info("🚀 INICIANDO CONEXIÓN A BASE DE DATOS")
    logger.info("=" * 60)
    
    connected, message = check_db_connection()
    if connected:
        logger.info(f"✅ {message}")
        logger.info(f"📊 Base de datos: {settings.SUPABASE_DB_NAME}")
        logger.info(f"🖥️  Host: {settings.SUPABASE_DB_HOST}:{settings.SUPABASE_DB_PORT}")
        logger.info(f"🌍 Entorno: {settings.ENVIRONMENT}")
        
        if settings.DEBUG:
            stats = get_pool_stats()
            logger.info(f"📈 Pool stats: {stats}")
    else:
        logger.error(f"❌ {message}")
        if settings.ENVIRONMENT == "production":
            logger.critical("⚠️  La aplicación puede no funcionar correctamente sin BD")
    
    logger.info("=" * 60)

async def shutdown_db_events() -> None:
    """
    Eventos a ejecutar al cerrar la aplicación
    """
    logger.info("🛑 Cerrando conexiones de base de datos...")
    close_db_connections()
    logger.info("✅ Base de datos desconectada correctamente")