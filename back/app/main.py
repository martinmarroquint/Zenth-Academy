# app/main.py
# VERSION COMPLETA CON TODOS LOS MÓDULOS - ECOSISTEMA ZENTH ACADEMY
# ✅ ACTUALIZADO: CORS con dominios de Firebase, verificación y recarga forzada de metadatos en startup

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
import logging
import time
from datetime import datetime, timezone
import traceback
import os
import importlib

from app.config import settings
from app.database import (
    get_db_status,
    startup_db_events,
    shutdown_db_events,
    check_db_connection
)
from app.api import api_router

# MIDDLEWARE MULTI-EMPRESA
from app.core.middleware_empresa import EmpresaContextMiddleware

# =====================================================
# CONFIGURACION DE LOGGING
# =====================================================

logging.basicConfig(
    level=logging.INFO if not settings.DEBUG else logging.DEBUG,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger(__name__)

# =====================================================
# CREACION DE LA APLICACION FASTAPI
# =====================================================

if not settings.DEBUG:
    docs_url = None
    redoc_url = None
    openapi_url = None
else:
    docs_url = "/docs"
    redoc_url = "/redoc"
    openapi_url = f"{settings.API_V1_PREFIX}/openapi.json"

app = FastAPI(
    title="Zenth Academy - Ecosistema Educativo",
    version=settings.VERSION,
    description="API para el ecosistema educativo Zenth Academy: Examenes Online, Grupos, Pizarra Interactiva, Cursos EDM Team, Foro, Certificados, Carpeta Docente e Integraciones.",
    docs_url=docs_url,
    redoc_url=redoc_url,
    openapi_url=openapi_url,
    openapi_tags=[
        {"name": "Autenticacion", "description": "Autenticacion de docentes y administradores educativos"},
        {"name": "Alumnos", "description": "Gestion unificada de alumnos"},
        {"name": "Examenes", "description": "Sistema de examenes online - Creacion, publicacion, rendicion y resultados"},
        {"name": "Grupos", "description": "Gestion de grupos/clases - Alumnos, asistencias y materiales"},
        {"name": "Pizarra", "description": "Pizarra interactiva colaborativa en tiempo real"},
        {"name": "Cursos", "description": "Cursos online - EDM Team"},
        {"name": "Foro", "description": "Comunidad / Foro de docentes"},
        {"name": "Certificados", "description": "Gestion de certificados"},
        {"name": "Carpeta Docente", "description": "Carpeta docente y comparticion de materiales"},
        {"name": "Historial", "description": "Historial de comparticiones"},
        {"name": "EDM Team", "description": "Integracion con EDM Team - Microsoft Teams, Slack, Zoom, etc"},
        {"name": "Sistema", "description": "Endpoints de sistema y monitoreo"}
    ]
)

# =====================================================
# SERVIR ARCHIVOS ESTATICOS
# =====================================================
os.makedirs("static", exist_ok=True)
os.makedirs("uploads", exist_ok=True)

app.mount("/static", StaticFiles(directory="static"), name="static")
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# =====================================================
# CONFIGURACION CORS - ACTUALIZADA CON FIREBASE
# =====================================================

ALLOWED_ORIGINS = [
    # Desarrollo local
    "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:8000",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:8000",
    # Firebase Hosting
    "https://zenth-academy.web.app",
    "https://zenth-academy.firebaseapp.com",
    # Render.com (si el frontend también está ahí)
    "https://zenth-academy.onrender.com",
    # Dominio personalizado (si tienes uno)
    # "https://zenthacademy.com",
]

if settings.BACKEND_CORS_ORIGINS:
    for origin in settings.BACKEND_CORS_ORIGINS:
        origin_str = str(origin)
        if not settings.DEBUG and "*" in origin_str:
            logger.warning(f"Wildcard CORS ignorado en produccion: {origin_str}")
            continue
        if origin_str not in ALLOWED_ORIGINS:
            ALLOWED_ORIGINS.append(origin_str)

ALLOWED_ORIGINS = list(dict.fromkeys(ALLOWED_ORIGINS))

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH", "HEAD"],
    allow_headers=[
        "Content-Type",
        "Authorization",
        "X-Requested-With",
        "Accept",
        "X-Empresa-ID",
        "X-Cliente-ID",
        "Origin",
        "Access-Control-Request-Method",
        "Access-Control-Request-Headers",
    ],
    expose_headers=["X-Process-Time"],
    max_age=86400,
)

logger.info(f"CORS configurado con {len(ALLOWED_ORIGINS)} origenes")
logger.info(f"Origenes permitidos: {ALLOWED_ORIGINS}")

# =====================================================
# OTROS MIDDLEWARES
# =====================================================

app.add_middleware(
    GZipMiddleware,
    minimum_size=500,
    compresslevel=6
)

app.add_middleware(EmpresaContextMiddleware)
logger.info("Middleware multi-empresa registrado")

# =====================================================
# MIDDLEWARE DE SEGURIDAD - HEADERS
# =====================================================

from app.core.security_headers import SecurityHeadersMiddleware
app.add_middleware(SecurityHeadersMiddleware, environment=settings.ENVIRONMENT)
logger.info("Middleware de headers de seguridad registrado")

# =====================================================
# MIDDLEWARE DE MONITOREO
# =====================================================

@app.middleware("http")
async def monitor_performance(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = f"{process_time * 1000:.2f}ms"
    return response

# =====================================================
# REGISTRO DE ROUTERS
# =====================================================

app.include_router(api_router, prefix=settings.API_V1_PREFIX)

# =============================================
# LISTADO DE MODULOS CARGADOS
# =============================================
modulos_existentes = [
    'auth',
    'alumnos',
    'examenes',
    'grupos',
    'pizarra',
    'integracion_edm',
    'historial',
    'cursos',
    'foro',
    'certificados',
    'carpeta_docente',
    'materiales'
]

logger.info(f"Modulos cargados: {', '.join(modulos_existentes)}")

# =============================================
# ENDPOINTS DE DIAGNOSTICO
# =============================================

@app.api_route("/", methods=["GET", "HEAD"], tags=["Sistema"], summary="Informacion del sistema")
async def root():
    return {
        "message": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
        "status": "operational",
        "jerarquia_roles": ["admin", "docente", "estudiante"],
        "modulos": modulos_existentes,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

@app.get("/health", tags=["Sistema"], summary="Health check")
async def health_check():
    db_connected, db_message = check_db_connection()
    return {
        "status": "healthy" if db_connected else "degraded",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
        "components": {
            "database": {"status": "up" if db_connected else "down", "message": db_message},
            "api": {"status": "up", "modulos_cargados": len(modulos_existentes)}
        }
    }

@app.get("/db-check", tags=["Sistema"])
async def db_check():
    return {"database_status": get_db_status(), "timestamp": datetime.now(timezone.utc).isoformat()}

@app.get("/ready", tags=["Sistema"])
async def readiness_check():
    db_connected, db_message = check_db_connection()
    if not db_connected:
        return JSONResponse(status_code=503, content={"status": "not ready", "reason": db_message})
    return {"status": "ready"}

@app.get("/info", tags=["Sistema"])
async def system_info():
    return {
        "name": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
        "jerarquia": {
            "roles": ["admin", "docente", "estudiante"],
            "estructura": "admin -> docente -> estudiante"
        },
        "cors_origins": ALLOWED_ORIGINS,
        "modulos": modulos_existentes,
        "examenes_online": "Disponible",
        "grupos_clases": "Disponible",
        "pizarra_interactiva": "Disponible",
        "cursos_edm_team": "Disponible",
        "foro_docentes": "Disponible",
        "certificados": "Disponible",
        "carpeta_docente": "Disponible",
        "integracion_edm_team": "Disponible",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

# =============================================
# MANEJADORES DE ERRORES
# =============================================

@app.exception_handler(404)
async def custom_404_handler(request: Request, exc):
    return JSONResponse(status_code=404, content={
        "error": "Not Found",
        "message": "El endpoint solicitado no existe",
        "url": str(request.url),
        "method": request.method,
        "timestamp": datetime.now(timezone.utc).isoformat()
    })

@app.exception_handler(500)
async def custom_500_handler(request: Request, exc):
    error_id = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S%f")
    logger.error(f"Error 500 [{error_id}] en {request.method} {request.url.path}: {str(exc)}")
    logger.error(f"   Traceback: {traceback.format_exc()}")
    return JSONResponse(status_code=500, content={
        "error": "Internal Server Error",
        "message": str(exc) if settings.DEBUG else "Error interno del servidor",
        "error_id": error_id,
        "timestamp": datetime.now(timezone.utc).isoformat()
    })

# =============================================
# EVENTOS DE INICIO Y FIN
# =============================================

@app.on_event("startup")
async def startup_event():
    logger.info("=" * 60)
    logger.info(f"INICIANDO {settings.PROJECT_NAME} v{settings.VERSION}")
    logger.info(f"Modo: {settings.ENVIRONMENT.upper()}")
    logger.info(f"Debug: {settings.DEBUG}")
    logger.info(f"Base de datos: {settings.SUPABASE_DB_HOST}:{settings.SUPABASE_DB_PORT}/{settings.SUPABASE_DB_NAME}")
    logger.info(f"CORS origenes: {len(ALLOWED_ORIGINS)}")
    logger.info(f"Middleware multi-empresa: ACTIVO")
    
    # =============================================
    # ✅ FORZAR RECARGA DE METADATOS DE SQLAlchemy
    # Esto soluciona el error de columnas faltantes
    # =============================================
    try:
        from app.database import engine
        from sqlalchemy import MetaData, inspect, text
        
        logger.info("🔍 Verificando metadatos de base de datos...")
        
        # 1. REFLEJAR LA BASE DE DATOS COMPLETA
        metadata = MetaData()
        metadata.reflect(bind=engine, only=['alumnos'])
        
        # 2. VERIFICAR QUE LAS COLUMNAS EXISTEN
        inspector = inspect(engine)
        if 'alumnos' in inspector.get_table_names():
            columns = [col['name'] for col in inspector.get_columns('alumnos')]
            logger.info(f"📊 Columnas reales en tabla alumnos: {columns}")
            
            # 3. VERIFICAR COLUMNAS CRÍTICAS
            columnas_criticas = ['id', 'usuario_id', 'nombres', 'apellidos', 'dni', 
                               'email', 'telefono', 'grado', 'grupo', 'grupo_id',
                               'nivel', 'institucion', 'direccion', 'fecha_nacimiento',
                               'genero', 'activo', 'created_at', 'updated_at', 'created_by']
            
            columnas_faltantes = []
            for col in columnas_criticas:
                if col not in columns:
                    columnas_faltantes.append(col)
                    logger.warning(f"⚠️ Columna '{col}' NO encontrada en tabla alumnos")
                else:
                    logger.info(f"✅ Columna '{col}' encontrada")
            
            # 4. SI FALTAN COLUMNAS, AGREGARLAS AUTOMÁTICAMENTE
            if columnas_faltantes:
                logger.info(f"🔄 Agregando columnas faltantes: {columnas_faltantes}")
                with engine.connect() as conn:
                    for col_name in columnas_faltantes:
                        # Determinar tipo de columna basado en el nombre
                        col_type = "VARCHAR(100)"
                        if col_name in ['id', 'usuario_id', 'grupo_id']:
                            col_type = "VARCHAR(100)"
                        elif col_name in ['nombres', 'apellidos', 'email', 'direccion', 'institucion']:
                            col_type = "VARCHAR(255)"
                        elif col_name == 'dni':
                            col_type = "VARCHAR(20)"
                        elif col_name in ['telefono', 'genero', 'grado', 'grupo', 'nivel']:
                            col_type = "VARCHAR(50)"
                        elif col_name == 'activo':
                            col_type = "BOOLEAN DEFAULT TRUE"
                        elif col_name in ['created_at', 'updated_at', 'fecha_nacimiento']:
                            col_type = "TIMESTAMP"
                        elif col_name == 'created_by':
                            col_type = "VARCHAR(100)"
                        
                        try:
                            conn.execute(text(f"ALTER TABLE alumnos ADD COLUMN IF NOT EXISTS {col_name} {col_type};"))
                            logger.info(f"✅ Columna '{col_name}' agregada a tabla alumnos")
                        except Exception as e:
                            logger.warning(f"⚠️ No se pudo agregar columna '{col_name}': {e}")
                    
                    # Crear índices
                    try:
                        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_alumnos_usuario_id ON alumnos(usuario_id);"))
                        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_alumnos_grupo_id ON alumnos(grupo_id);"))
                        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_alumnos_dni ON alumnos(dni);"))
                        logger.info("✅ Índices creados en tabla alumnos")
                    except Exception as e:
                        logger.warning(f"⚠️ No se pudieron crear índices: {e}")
                    
                    conn.commit()
                
                # Refrescar metadatos después de agregar columnas
                metadata.reflect(bind=engine, only=['alumnos'])
                logger.info("✅ Metadatos refrescados después de agregar columnas")
            
            # 5. FORZAR RECARGA DEL MODELO
            try:
                from app.models import alumno
                importlib.reload(alumno)
                logger.info("✅ Modelo Alumno recargado")
            except Exception as e:
                logger.warning(f"⚠️ No se pudo recargar el modelo: {e}")
            
        else:
            logger.warning("⚠️ Tabla 'alumnos' no encontrada en la base de datos")
            # Crear la tabla alumnos si no existe
            try:
                from app.models.alumno import Alumno
                from app.database import Base
                Base.metadata.create_all(engine)
                logger.info("✅ Tabla 'alumnos' creada correctamente")
            except Exception as e:
                logger.warning(f"⚠️ No se pudo crear la tabla automáticamente: {e}")
                
    except Exception as e:
        logger.warning(f"⚠️ Error verificando metadatos de base de datos: {e}")
        import traceback as tb
        logger.warning(tb.format_exc())
    
    logger.info(f"Alumnos Unificados: DISPONIBLE")
    logger.info(f"Examenes Online: DISPONIBLE")
    logger.info(f"Grupos de Clases: DISPONIBLE")
    logger.info(f"Pizarra Interactiva: DISPONIBLE")
    logger.info(f"Cursos EDM Team: DISPONIBLE")
    logger.info(f"Foro de Docentes: DISPONIBLE")
    logger.info(f"Certificados: DISPONIBLE")
    logger.info(f"Carpeta Docente: DISPONIBLE")
    logger.info(f"Integracion EDM Team: DISPONIBLE")
    logger.info("=" * 60)
    
    await startup_db_events()
    db_connected, _ = check_db_connection()
    if db_connected:
        logger.info("✅ Sistema listo para recibir peticiones")
    else:
        logger.warning("⚠️ Sistema iniciado SIN conexion a base de datos")
    logger.info("=" * 60)

@app.on_event("shutdown")
async def shutdown_event():
    logger.info(f"DETENIENDO {settings.PROJECT_NAME}")
    await shutdown_db_events()
    logger.info("Aplicacion detenida correctamente")

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=port,
        reload=settings.DEBUG,
        log_level="info" if not settings.DEBUG else "debug"
    )