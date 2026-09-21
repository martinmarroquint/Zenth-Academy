# app/main.py
# VERSION COMPLETA CON TODOS LOS MÓDULOS - ECOSISTEMA ZENTH ACADEMY
# ✅ ACTUALIZADO: CORS con dominios de Firebase, verificación y recarga forzada de metadatos en startup

from fastapi import FastAPI, Request, Depends
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
from app.core.dependencies import require_admin

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
        "status": "operational",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

@app.get("/health", tags=["Sistema"], summary="Health check")
async def health_check():
    # ✅ SEGURIDAD: no exponer detalles de la BD ni el error crudo.
    db_connected, _db_message = check_db_connection()
    return {
        "status": "healthy" if db_connected else "degraded",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

@app.get("/db-check", tags=["Sistema"])
async def db_check(_admin=Depends(require_admin)):
    # ✅ SEGURIDAD: detalle de infraestructura solo para admin.
    return {"database_status": get_db_status(), "timestamp": datetime.now(timezone.utc).isoformat()}

@app.get("/ready", tags=["Sistema"])
async def readiness_check():
    db_connected, _db_message = check_db_connection()
    if not db_connected:
        return JSONResponse(status_code=503, content={"status": "not ready"})
    return {"status": "ready"}

@app.get("/info", tags=["Sistema"])
async def system_info(_admin=Depends(require_admin)):
    # ✅ SEGURIDAD: inventario de módulos/CORS solo para admin.
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
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

# =============================================
# MANEJADORES DE ERRORES
# =============================================

@app.exception_handler(404)
async def custom_404_handler(request: Request, exc):
    # ✅ Si el 404 viene de un endpoint real (HTTPException con `detail`),
    # se conserva el mensaje original (p.ej. "Examen no encontrado"). Antes
    # se reemplazaba TODO por "El endpoint solicitado no existe", ocultando
    # errores legítimos al frontend.
    detail = getattr(exc, "detail", None)
    if detail and str(detail).lower() not in ("not found", "404"):
        return JSONResponse(status_code=404, content={"detail": detail})
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

    # =============================================
    # ✅ PRE-CALENTAR CLAVES PÚBLICAS DE GOOGLE (JWKS)
    # Evita pagar la descarga (~200-400ms) en el primer login con Google.
    # En un hilo aparte para no retrasar el arranque.
    # =============================================
    if settings.GOOGLE_CLIENT_ID:
        try:
            import threading
            from app.core.google_auth import _obtener_claves

            def _precalentar_jwks():
                try:
                    _obtener_claves(forzar=True)
                    logger.info("✅ JWKS de Google pre-calentado")
                except Exception as e:
                    logger.debug(f"No se pudo pre-calentar JWKS de Google: {e}")

            threading.Thread(target=_precalentar_jwks, daemon=True).start()
        except Exception as e:
            logger.debug(f"Error programando pre-calentamiento de JWKS: {e}")

    # =============================================
    # ✅ MODO SQLITE (DESARROLLO LOCAL): crear todas las tablas
    # =============================================
    if settings.SUPABASE_DATABASE_URL.lower().startswith("sqlite"):
        try:
            from app.database import engine as _sqlite_engine, Base as _Base
            import app.models  # noqa: F401  -> registra todos los modelos
            _Base.metadata.create_all(bind=_sqlite_engine)
            logger.info("✅ Modo SQLite: tablas creadas/verificadas")
        except Exception as e:
            logger.error(f"❌ Error creando tablas en SQLite: {e}")
    
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
    
    # =============================================
    # ✅ MIGRACIÓN: docente_id en tabla examenes (ownership de exámenes)
    # =============================================
    try:
        from app.database import engine as _engine
        from sqlalchemy import inspect as _inspect, text as _text
        
        _insp = _inspect(_engine)
        if 'examenes' in _insp.get_table_names():
            _cols = [c['name'] for c in _insp.get_columns('examenes')]
            if 'docente_id' not in _cols:
                logger.info("🔄 Agregando columna 'docente_id' a tabla examenes...")
                with _engine.connect() as _conn:
                    _conn.execute(_text(
                        "ALTER TABLE examenes ADD COLUMN IF NOT EXISTS docente_id VARCHAR(100);"
                    ))
                    _conn.execute(_text(
                        "CREATE INDEX IF NOT EXISTS idx_examen_docente_id ON examenes(docente_id);"
                    ))
                    # Backfill: derivar dueño desde el grupo cuando sea posible
                    try:
                        _conn.execute(_text("""
                            UPDATE examenes e
                            SET docente_id = g.docente_id
                            FROM grupos g
                            WHERE e.grupo_id = g.id
                              AND e.docente_id IS NULL
                              AND g.docente_id IS NOT NULL
                              AND g.docente_id <> 'default';
                        """))
                    except Exception as _bf:
                        logger.warning(f"⚠️ No se pudo hacer backfill de docente_id: {_bf}")
                    _conn.commit()
                logger.info("✅ Columna 'docente_id' agregada a tabla examenes")
            else:
                logger.info("✅ Columna 'docente_id' ya existe en tabla examenes")
    except Exception as e:
        logger.warning(f"⚠️ Error migrando docente_id en examenes: {e}")

    # =============================================
    # ✅ SINCRONIZACIÓN DE ESQUEMA (evita "schema drift" con Supabase)
    # 1) Crea tablas del modelo que falten (ej: login_geo_log)
    # 2) Agrega columnas que falten en tablas existentes (ej: escala_* en preguntas)
    # Es idempotente: no toca nada que ya exista.
    # =============================================
    try:
        from app.database import engine as _eng2, Base as _Base2
        from sqlalchemy import inspect as _insp2, text as _text2

        # 1) Tablas faltantes
        antes = set(_insp2(_eng2).get_table_names())
        _Base2.metadata.create_all(bind=_eng2, checkfirst=True)
        despues = set(_insp2(_eng2).get_table_names())
        creadas = sorted(despues - antes)
        if creadas:
            logger.info(f"✅ Tablas creadas automáticamente: {', '.join(creadas)}")

        # 2) Columnas faltantes en tablas conocidas (tipos de encuesta)
        COLUMNAS_ESPERADAS = {
            "preguntas": {
                "escala_opciones": "INTEGER",
                "escala_max": "INTEGER",
                "escala_min": "INTEGER",
                "escala_paso": "INTEGER",
                "escala_min_label": "VARCHAR(100)",
                "escala_max_label": "VARCHAR(100)",
            },
            # ✅ LOGIN SOCIAL (OAuth)
            "usuarios": {
                "auth_provider": "VARCHAR(20) DEFAULT 'local'",
                "google_id": "VARCHAR(100)",
                "microsoft_id": "VARCHAR(100)",
            },
        }
        insp2 = _insp2(_eng2)
        tablas_actuales = set(insp2.get_table_names())
        for tabla, columnas in COLUMNAS_ESPERADAS.items():
            if tabla not in tablas_actuales:
                continue
            existentes = {c["name"] for c in insp2.get_columns(tabla)}
            faltan = {k: v for k, v in columnas.items() if k not in existentes}
            if not faltan:
                continue
            logger.info(f"🔄 Agregando {len(faltan)} columna(s) a '{tabla}'...")
            with _eng2.connect() as _conn2:
                for col, tipo in faltan.items():
                    _conn2.execute(_text2(
                        f"ALTER TABLE {tabla} ADD COLUMN IF NOT EXISTS {col} {tipo};"
                    ))
                _conn2.commit()
            logger.info(f"✅ Columnas agregadas a '{tabla}': {', '.join(faltan.keys())}")

        # 3) ✅ OAUTH: permitir usuarios sin contraseña + índices únicos
        if "usuarios" in tablas_actuales:
            with _eng2.connect() as _conn3:
                try:
                    _conn3.execute(_text2(
                        "ALTER TABLE usuarios ALTER COLUMN password_hash DROP NOT NULL;"
                    ))
                except Exception as _e3:
                    logger.debug(f"password_hash ya era nullable: {_e3}")
                try:
                    _conn3.execute(_text2(
                        "CREATE UNIQUE INDEX IF NOT EXISTS ix_usuarios_google_id "
                        "ON usuarios(google_id) WHERE google_id IS NOT NULL;"
                    ))
                    _conn3.execute(_text2(
                        "CREATE UNIQUE INDEX IF NOT EXISTS ix_usuarios_microsoft_id "
                        "ON usuarios(microsoft_id) WHERE microsoft_id IS NOT NULL;"
                    ))
                except Exception as _e3:
                    logger.warning(f"No se pudieron crear índices OAuth: {_e3}")
                _conn3.commit()
    except Exception as e:
        logger.warning(f"⚠️ Error sincronizando esquema: {e}")

    # =============================================
    # ✅ MIGRACIÓN MULTI-TENANT
    # 1) Crea la empresa por defecto si no existe
    # 2) Rellena usuarios con empresa_id NULL (no podían iniciar sesión)
    # =============================================
    try:
        from app.database import engine as _eng3
        from sqlalchemy import inspect as _insp3, text as _text3

        _empresa_id = settings.EMPRESA_ID_DEFAULT
        tablas3 = set(_insp3(_eng3).get_table_names())

        if "empresas" in tablas3:
            with _eng3.connect() as _c3:
                existe = _c3.execute(
                    _text3("SELECT 1 FROM empresas WHERE id = :eid"),
                    {"eid": _empresa_id},
                ).first()
                if not existe:
                    _c3.execute(
                        _text3(
                            "INSERT INTO empresas (id, nombre, subdominio, activo, plan) "
                            "VALUES (:eid, :nom, :sub, true, 'basico') "
                            "ON CONFLICT (id) DO NOTHING"
                        ),
                        {"eid": _empresa_id, "nom": "Zenth Academy", "sub": "zenth"},
                    )
                    _c3.commit()
                    logger.info(f"✅ Empresa por defecto creada: {_empresa_id}")

        if "usuarios" in tablas3:
            with _eng3.connect() as _c3:
                res = _c3.execute(
                    _text3(
                        "UPDATE usuarios SET empresa_id = :eid "
                        "WHERE empresa_id IS NULL"
                    ),
                    {"eid": _empresa_id},
                )
                _c3.commit()
                if res.rowcount:
                    logger.info(
                        f"✅ {res.rowcount} usuario(s) sin empresa asignados a la empresa por defecto"
                    )
    except Exception as e:
        logger.warning(f"⚠️ Error migrando multi-tenant: {e}")

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