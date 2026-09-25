# Zenth Academy — Manual Técnico del Sistema

> Guía completa para instalar, replicar, operar y mantener la plataforma Zenth Academy.
> Fuente canónica de este documento. Para regenerar las versiones descargables del sitio
> (`front/public/manual.html` y `front/public/manual-sistema.md`) ejecuta:

```bash
python scripts/generar_manual.py
```

**Versión:** 1.0.0 — Última actualización: septiembre 2026

---

## Índice

1. [Visión general del sistema](#1-visión-general-del-sistema)
2. [Arquitectura técnica](#2-arquitectura-técnica)
3. [Instalación y réplica paso a paso](#3-instalación-y-réplica-paso-a-paso)
4. [Modelo de datos](#4-modelo-de-datos)
5. [Autenticación, roles y seguridad](#5-autenticación-roles-y-seguridad)
6. [Mapa de rutas (frontend)](#6-mapa-de-rutas-frontend)
7. [Referencia de la API](#7-referencia-de-la-api)
8. [Flujos de uso por rol](#8-flujos-de-uso-por-rol)
9. [Particularidades y notas técnicas](#9-particularidades-y-notas-técnicas)
10. [Pruebas, despliegue y solución de problemas](#10-pruebas-despliegue-y-solución-de-problemas)

---

## 1. Visión general del sistema

**Zenth Academy** es una plataforma LMS (Learning Management System) autohospedada para
vender y dictar cursos en línea, construida como monorepo con backend FastAPI y frontend
React.

### Capacidades principales

| Módulo | Descripción |
|---|---|
| Cursos | Catálogo público, inscripciones, estructura de módulos y lecciones, bloqueo secuencial (estilo Platzi) |
| Lecciones | Bloques de video (YouTube), texto enriquecido (HTML), material descargable y evaluación |
| Exámenes | Opción múltiple y verdadero/falso, límite de tiempo, intentos, detección de cambio de pestaña, puntuación configurable |
| Certificados | PDF con código de verificación HMAC, validación pública, nota mínima configurable |
| Comunidad | Foro por curso con respuestas anidadas, pizarra colaborativa en tiempo real |
| Compartir | Salas con QR/código para unir alumnos rápidamente |
| Materiales | Biblioteca de archivos del docente con enlaces de descarga |
| EDM Team | Integraciones externas (Microsoft Teams, Slack, Zoom, etc.) con CRUD y sincronización de eventos, panel admin |
| Multiempresa | Clave `empresa_id` en las tablas principales para aislar datos por instancia/empresa |

### Roles

| Rol | Capacidad principal |
|---|---|
| `admin` | Gestiona usuarios, docentes, cursos, exámenes, solicitudes, configuración y analítica |
| `docente` | Crea y publica cursos, dicta, corrige, ve el avance de sus alumnos |
| `estudiante` | Se inscribe, estudia en orden, rinde exámenes, obtiene certificados |
| público (sin sesión) | Explora el catálogo, valida certificados, responde exámenes por enlace |

---

## 2. Arquitectura técnica

### Stack

**Backend**

| Componente | Versión / tecnología |
|---|---|
| Framework | FastAPI 0.115.12 |
| Servidor | Uvicorn 0.34.0 (`--reload` en desarrollo) |
| ORM | SQLAlchemy 2.0.38 (estilo 2.0, `Mapped[]` / `mapped_column`) |
| Base de datos | PostgreSQL (Supabase en producción; SQLite en pruebas) |
| Autenticación | JWT (OAuth2 password flow) + refresh tokens |
| Python | 3.13 local (`.python-version`), CI corre en 3.11 |

**Frontend**

| Componente | Versión / tecnología |
|---|---|
| Framework | React ^19.2.0 (router `react-router-dom`) |
| Build | Vite 7 |
| Estilos | Tailwind CSS |
| Pruebas | Vitest + Testing Library (60 pruebas) |
| PDF (cliente) | `jspdf`, `jspdf-autotable`, `@react-pdf/renderer` |

### Estructura del repositorio

```
D:\Zenth Academy\
├── back\                       # Backend FastAPI
│   ├── app\
│   │   ├── main.py             # App, CORS, migración idempotente al arranque, COLUMNAS_ESPERADAS
│   │   ├── config.py           # Settings (env vars) — prefijo /api/v1
│   │   ├── database.py         # Engine, SessionLocal, Base
│   │   ├── models\             # Modelos SQLAlchemy (usuarios, curso, examen, certificado, …)
│   │   ├── schemas\            # Pydantic (request/response)
│   │   ├── api\                # Routers: auth, cursos, examenes, certificados, foro, …
│   │   ├── core\               # security.py (JWT), depends.py (guards por rol)
│   │   └── utils\              # Utilidades (certificados PDF, HMAC, etc.)
│   ├── tests\                  # 303 pruebas pytest (SQLite en memoria)
│   ├── seed_curso_ia.py        # Semilla idempotente: curso de IA (10 módulos, 40 lecciones, 10 exámenes)
│   ├── run.py                  # Uvicorn app.main:app
│   ├── run_local_sqlite.ps1    # Arranque local sin PostgreSQL
│   └── venv\                   # Entorno virtual Python
├── front\                      # Frontend React + Vite
│   ├── src\
│   │   ├── App.jsx             # Rutas y guards por rol
│   │   ├── components\         # UI (layout, cursos, examenes, …)
│   │   └── pages\              # Pantallas por rol
│   └── public\                 # Estáticos (favicon, manual descargable)
├── docs\                       # Documentación (este manual)
├── supabase\schema_completo.sql  # Esquema completo de la BD
└── scripts\generar_manual.py   # Genera HTML + copia MD del manual
```

### Diagrama de flujo

```
Navegador (React SPA)
   │  fetch con Authorization: Bearer <JWT>
   ▼
FastAPI  ── routers (/api/v1/…) ── guards de rol ── servicios
   │                                              │
   │                                              ▼
   └──────── SQLAlchemy Session ◄──────── lógica de negocio
                    │
                    ▼
        PostgreSQL (Supabase)  /  SQLite (pruebas)
```

---

## 3. Instalación y réplica paso a paso

### 3.1 Requisitos

- Python 3.11+ (recomendado 3.13)
- Node.js 20+ y npm
- PostgreSQL 15+ (o usar SQLite local con `run_local_sqlite.ps1`)
- Git

### 3.2 Clonar e instalar dependencias

```bash
git clone <url-del-repositorio>
cd "Zenth Academy"

# Backend
cd back
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt

# Frontend
cd ..\front
npm install
```

### 3.3 Variables de entorno del backend

Crear `back\.env` (o exportarlas) con:

| Variable | Obligatoria | Descripción / valor de ejemplo |
|---|---|---|
| `SUPABASE_DATABASE_URL` | Sí* | `postgresql+psycopg://user:pass@host:5432/db` |
| `SUPABASE_DB_HOST` / `PORT` / `NAME` / `USER` / `PASSWORD` | Sí* | Alternativa a la URL anterior (se arma en `config.py`) |
| `JWT_SECRET_KEY` | Sí | Firma de tokens; mínimo 16 caracteres. Generar con `openssl rand -hex 32` |
| `BACKEND_CORS_ORIGINS` | No | Lista JSON de orígenes permitidos (dev: `http://localhost:5173`) |
| `FRONTEND_URL` | No | `http://localhost:5173` |
| `BACKEND_PUBLIC_URL` | No | `http://localhost:8000` (enlaces en PDFs/QR) |
| `MAX_UPLOAD_SIZE` | No | Tamaño máximo de subida en bytes (default `5242880` = 5 MB) |
| `UPLOAD_PATH` | No | Carpeta de archivos subidos (default `uploads`) |
| `ALLOWED_EXTENSIONS` | No | Extensiones permitidas para uploads |
| `PASSWORD_MIN_LENGTH` | No | Default `8` |
| `MAX_LOGIN_ATTEMPTS` / `LOGIN_TIMEOUT_MINUTES` | No | Default `5` / `15` (bloqueo por fuerza bruta) |
| `EMPRESA_ID_DEFAULT` | No | Clave multiempresa por defecto |
| `REDIS_URL` / `REDIS_ENABLED` | No | Cache opcional; default `REDIS_ENABLED=False` |
| `GOOGLE_CLIENT_ID` / `MICROSOFT_*` | No | Login social (si se usa) |
| `BOOTSTRAP_KEY` / `ADMIN_BOOTSTRAP_PASSWORD` | No | Alta inicial del admin |
| `AWS_*` | No | Storage S3 opcional |

\* Con SQLite local no se requiere ninguna de las dos.

### 3.4 Base de datos

1. **Producción:** crear el esquema con `supabase/schema_completo.sql` en el SQL editor de Supabase.
2. **Migraciones:** no se usa Alembic. Al arrancar, `back/app/main.py` aplica de forma
   idempotente cambios puntuales (p. ej. `ninguno` → `secuencial` en `tipo_bloqueo`) y
   valida `COLUMNAS_ESPERADAS`. Si añades columnas nuevas al modelo, decláralas ahí y
   refleja el cambio en `schema_completo.sql`.
3. **Datos de prueba:** `python seed_curso_ia.py` crea (o re-crea) el curso "IA" con
   10 módulos, 40 lecciones, 10 exámenes y 50 preguntas. Es idempotente.

### 3.5 Arrancar el sistema

```bash
# Terminal 1 — backend (puerto 8000)
cd back
.\venv\Scripts\Activate.ps1
uvicorn app.main:app --reload     # o: python run.py
# Sin PostgreSQL:  .\run_local_sqlite.ps1

# Terminal 2 — frontend (puerto 5173)
cd front
npm run dev
```

- API: `http://localhost:8000` (docs interactivas en `/docs`)
- App: `http://localhost:5173`

### 3.6 Primer usuario administrador

```bash
curl -X POST "http://localhost:8000/api/v1/auth/seed/admin" -H "X-Bootstrap-Key: <BOOTSTRAP_KEY>"
```

Crea `admin@zenthacademy.com` con `ADMIN_BOOTSTRAP_PASSWORD` si aún no existe.

### 3.7 Pruebas y calidad

```bash
# Backend — 303 pruebas (SQLite en memoria)
cd back && .\venv\Scripts\python.exe -m pytest tests/ -q

# Frontend — lint + 60 pruebas + build
cd front
npx eslint
npm run test -- --run
npm run build
```

CI (GitHub Actions) ejecuta las mismas 3 verificaciones en Python 3.11 y Node 20.

### 3.8 Despliegue

- **Backend:** cualquier host ASGI (Railway, Render, Fly.io, VPS con Uvicorn/Gunicorn
  tras proxy). Configura todas las env vars de la §3.3 y apunta `SUPABASE_DATABASE_URL`
  a la BD managed.
- **Frontend:** `npm run build` → estáticos en `front/dist` (Netlify, Vercel, nginx).
  Configura el origen del backend en `VITE_API_URL` (o proxy de Vite).
- **Dominio:** actualiza `FRONTEND_URL` y `BACKEND_CORS_ORIGINS` para que los enlaces
  de certificados y QR apunten al dominio real.

---

## 4. Modelo de datos

> Esquema completo: `supabase/schema_completo.sql`.

### Entidades principales

| Tabla | Relación clave |
|---|---|
| `usuarios` | `id`, `email`, `password_hash`, `rol` (`admin`/`docente`/`estudiante`), `empresa_id`, estado |
| `instructores` / perfil docente | Datos públicos del docente |
| `cursos` | `titulo`, `descripcion`, `categoria`, `nivel`, `precio`, `estado` (`BORRADOR`/`PUBLICADO`), `tipo_bloqueo` (`secuencial`/`libre`), `duracion_horas`, `instructor_id`, `certificado_nota_minima` (0–20) |
| `modulos` → JSON en `Curso.modulos` | Los módulos viven como JSON en la fila del curso (no hay tabla `modulos`): `[{titulo, lecciones:[{titulo, tipo, contenido}]}]` |
| `inscripciones` | `usuario_id` + `curso_id`, progreso, fecha |
| `progreso_lecciones` | Estado de lección (`completado`), `nota` 0–20 |
| `examenes` | `titulo`, `curso_id`, `umbral_aprobacion` (%), `max_intentos`, `tiempo_limite_min`, `estado` (`BORRADOR`/`PUBLICADO` en MAYÚSCULAS) |
| `preguntas` | `tipo` (`opcion_multiple`/`verdadero_falso`), `respuesta_correcta` (índice 0-based: 0 = opción A), `puntos` |
| `intentos_examen` / `resultados_examen` | Intento individual, nota final (0–20, aprobado ≥ 10) |
| `certificados` | `codigo` público, `nota_final`, firma HMAC (`firmar_codigo`), PDF |
| `foro_hilos` / `foro_mensajes` | Hilo por curso, respuestas anidadas |
| `pizarras` / trazos | Pizarra colaborativa en tiempo real |
| `salas_compartir` | Código/QR de unión rápida |
| `materiales` | Archivos del docente por curso |
| `solicitudes_docente` | Postulaciones de docentes (admin las aprueba) |
| `configuracion` | Ajustes globales (empresa) |

### Tipos de lección

Cada lección del JSON `contenido` es un objeto `{titulo, tipo, contenido}`:

| `tipo` | `contenido` |
|---|---|
| `video` | `{video_url}` (YouTube) |
| `texto` | `{texto: "<p>HTML…</p>"}` |
| `material` | `{archivos: [{nombre, url}]}` |
| `examen` | `{examen_id}` — **sin bloques**; vincula la evaluación |

### Escalas (¡cuidado con estas!)

| Concepto | Escala | Aprobación |
|---|---|---|
| `ProgresoLeccion.nota` / nota final de examen | **0–20** | ≥ 10 |
| `certificado_nota_minima` (curso) | **0–20** | — |
| `examenes.umbral_aprobacion` | **0–100 %** | — |
| `respuesta_correcta` (pregunta) | índice **0-based** | 0 = opción A |
| Estados de curso/examen | MAYÚSCULAS | `PUBLICADO` |

La nota del examen se deriva server-side en `_nota_confiable_desde_examen`
(`back/app/api/cursos.py`): la nota de `ProgresoLeccion` se marca confiable solo si
existe un resultado de examen asociado.

---

## 5. Autenticación, roles y seguridad

### Login y tokens

```bash
# OAuth2 password flow (form-encoded)
POST /api/v1/auth/login
Content-Type: application/x-www-form-urlencoded

username=docente@zenth.com&password=*****
→ {"access_token": "...", "refresh_token": "...", "token_type": "bearer"}
```

- **Access token:** JWT firmado con `JWT_SECRET_KEY`, claim `sub` = id de usuario,
  `type=access`, corta vida.
- **Refresh token:** endpoint de refresco en `/api/v1/auth/`.
- Todas las peticiones autenticadas llevan `Authorization: Bearer <token>`.

### Guards de rol

Los endpoints están protegidos con dependencias de `back/app/core/depends.py`
(`require_admin`, `require_docente`, …). Devuelven `403` si el rol no coincide.
En el frontend, `App.jsx` envuelve cada sección con un guard equivalente
(`/admin/*`, `/docente/*`, `/estudiante/*`); un usuario sin sesión que intente
acceder es redirigido a `/login`.

### Medidas de seguridad implementadas

| Medida | Detalle |
|---|---|
| Passwords | Hash con bcrypt/argon2 (`password_hash`) |
| Fuerza bruta | `MAX_LOGIN_ATTEMPTS=5` / `LOGIN_TIMEOUT_MINUTES=15` |
| Rate limiting | Límite de peticiones por IP en routers sensibles (login, seed) |
| CORS | Orígenes permitidos por env var `BACKEND_CORS_ORIGINS` |
| Headers | Seguridad estándar (HSTS/CSP/X-Frame en producción) |
| Certificados | Código público firmado con **HMAC** — no se puede falsificar sin la clave |
| Uploads | Validación de extensión (`ALLOWED_EXTENSIONS`) y tamaño (`MAX_UPLOAD_SIZE`) |
| Multiempresa | `empresa_id` en tablas principales; los queries lo filtran |
| Seed admin | Protegido por `X-Bootstrap-Key` (`BOOTSTRAP_KEY`) |

### Diagnóstico sin credenciales (truco operativo)

Si necesitas consultar la API como un usuario pero no conoces su contraseña, genera un
JWT local válido con la misma clave del entorno:

```python
# guardar como back/_tmp_token.py y ejecutar con el venv
from app.core.database import SessionLocal
from app.core.security import create_access_token
from app.models.usuario import Usuario
db = SessionLocal()
u = db.query(Usuario).filter(Usuario.email == "docente@zenth.com").first()
print(create_access_token({"sub": str(u.id)}))
```

```bash
curl -H "Authorization: Bearer <token>" http://localhost:8000/api/v1/cursos/
```

---

## 6. Mapa de rutas (frontend)

Definidas en `front/src/App.jsx`. El guard de rol redirige a `/login` (o `/`) si la
sesión no corresponde.

### Públicas (sin sesión)

| Ruta | Pantalla |
|---|---|
| `/` | Home (landing) |
| `/login` | Inicio de sesión |
| `/registro` | Registro |
| `/compartir/:codigo` | Unión a sala con QR/código |
| `/examen/:codigo` | Examen público por enlace |
| `/validar`, `/validar/:codigo` | Validación pública de certificado |
| `/ui-demo` | Demostración de componentes UI |
| `/manual` | Este manual (con botones de descarga) |

### Admin (`/admin/*`)

| Ruta | Pantalla |
|---|---|
| `/admin/examenes` | Panel global de exámenes |
| `/admin/cursos` | Gestión de cursos |
| `/admin/alumnos` | Gestión de alumnos |
| `/admin/materiales` | Biblioteca de materiales |
| `/admin/pizarra` | Pizarras |
| `/admin/foro` | Foro |
| `/admin/certificados` | Certificados emitidos |
| `/admin/solicitudes` | Solicitudes generales |
| `/admin/configuracion` | Configuración |
| `/admin/solicitudes-docente` | Aprobación de docentes |
| `/admin/analytics-geografico` | Estadísticas de accesos (logins por país/ciudad) — panel interno en pruebas |

### Docente (panel `/cursos` y módulos heredados)

El docente comparte el panel de cursos (`/cursos` → `PanelCursos.jsx`) y tiene acceso
a exámenes, alumnos, materiales, pizarra, foro y certificados según su permiso.

### Estudiante (`/estudiante/*`)

| Ruta | Pantalla |
|---|---|
| `/estudiante/cursos` | **Mis cursos** (inscripciones) + **Catálogo** (abajo) |
| `/estudiante/cursos/:id` | Detalle del curso, lecciones, bloqueo secuencial |
| `/estudiante/historial` | Historial de actividad |
| `/estudiante/foro` | Foro |
| `/estudiante/certificados` | Mis certificados |
| `/estudiante/configuracion` | Mi cuenta |

---

## 7. Referencia de la API

- **Prefijo global:** `/api/v1` (`settings.API_V1_PREFIX`)
- **Total:** 171 endpoints en 15 routers + 1 de configuración (Swagger: `/docs`)
- **Formato:** JSON; auth por `Authorization: Bearer <JWT>`

### `/auth` — Autenticación (14)

| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| POST | `/auth/login` | público | OAuth2 password flow (form) → access + refresh |
| POST | `/auth/register` | público | Registro de estudiante |
| POST | `/auth/google` | público | Login con Google |
| POST | `/auth/refresh` | público | Renueva el access token |
| POST | `/auth/logout` | sesión | Revoca tokens |
| GET | `/auth/me` | sesión | Perfil actual |
| PUT | `/auth/me` | sesión | Actualiza perfil |
| POST | `/auth/me/cambiar-password` | sesión | Cambio de contraseña |
| GET | `/auth/verificar` | sesión | Verifica validez del token |
| GET/POST | `/auth/usuarios` | admin | Lista / crea usuarios |
| PUT/DELETE | `/auth/usuarios/{user_id}` | admin | Edita / elimina usuario |
| POST | `/auth/seed/admin` | `X-Bootstrap-Key` | Crea el primer admin |

### `/cursos` — Cursos (37)

| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| GET | `/cursos/` | sesión | Catálogo (cache 60 s por usuario+filtros; solo `PUBLICADO`) |
| GET | `/cursos/{id}` | sesión | Detalle (aplica bloqueo secuencial) |
| POST/PUT/DELETE | `/cursos/{id}` | docente/admin | CRUD de curso |
| POST | `/cursos/{id}/imagen` · DELETE …/imagen | docente/admin | Portada |
| POST | `/cursos/{id}/publicar` | docente/admin | `BORRADOR` → `PUBLICADO` (invalida cache) |
| GET | `/cursos/mis-cursos` | docente | Cursos propios |
| POST | `/cursos/{id}/inscribirse` | estudiante | Inscripción |
| DELETE | `/cursos/{id}/inscripcion` · `…/{estudiante_id}` | estudiante/admin | Baja |
| GET | `/cursos/{id}/estudiantes` · `…/exportar` | docente | Alumnos y exportación |
| GET | `/cursos/{id}/accesos` · POST `…/acceso` · DELETE `…/acceso/{e}` · GET `…/tiene-acceso/{e}` | docente/admin | Control de acceso |
| GET | `/cursos/{id}/progreso/{usuario_id}` · `…/progreso-detallado` | docente/admin | Avance |
| POST | `/cursos/{curso_id}/lecciones/{leccion_id}/completar` · `/progreso` | estudiante | Marcar lección |
| GET | `/cursos/{curso_id}/lecciones/{leccion_id}/estado-bloqueo` | estudiante | ¿Está desbloqueada? |
| POST/GET/DELETE | `/cursos/{curso_id}/lecciones/{leccion_id}/evaluacion` | docente | Evaluación de la lección |
| POST | `…/lecciones/{leccion_id}/liberar` | docente | Libera manualmente una lección |
| PUT | `/cursos/{curso_id}/calificaciones/{estudiante_id}/{leccion_id}` | docente | Calificación manual |
| GET | `/cursos/solicitudes-pendientes` · POST `…/solicitudes/{id}/aprobar` · `/rechazar` | docente/admin | Acceso a cursos |
| POST | `/cursos/{id}/solicitar-acceso` | estudiante | Pide acceso |

### `/examenes` — Exámenes (44)

| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| GET/POST | `/examenes/` | docente/admin | Lista / crea examen |
| GET | `/examenes/publicados` | estudiante | Exámenes publicados |
| PUT/DELETE | `/examenes/{examen_id}` | docente/admin | Edita / elimina |
| PUT | `/examenes/{examen_id}/estado` | docente/admin | Publica/archiva |
| GET | `/examenes/{examen_id}` | docente/admin | Detalle con preguntas |
| POST | `/examenes/{examen_id}/intentos` | estudiante | Inicia intento |
| POST | `/examenes/resultados` | estudiante | Envía respuestas → nota 0–20 |
| GET | `/examenes/resultados/{examen_id}` · `/alumno/{alumno_id}` · `/mejor/{alumno_id}` | docente | Resultados |
| GET/DELETE | `/examenes/resultados/{examen_id}/revision/{resultado_id}` | docente | Revisión / corrección |
| GET | `/examenes/resumen` · `/bulk` · `/grupo/{grupo_id}` | docente/admin | Resúmenes |
| GET/POST/PUT/DELETE | `/examenes/grupos` … `/grupos/{id}` | docente | Grupos (CRUD) |
| POST | `/examenes/grupos/{id}/asistencia` · `/recursos` … | docente | Asistencia y recursos |
| **Público** | GET `/examenes/publico/{codigo}` | público | Examen por enlace |
| | POST `…/verificar-password` · `…/intentos` · `…/resultado` | público | Flujo del examen público |
| **Sync** | POST `/examenes/sincronizar/iniciar` … `Cerrar` | docente | Examen sincronizado en aula |
| | POST `/examenes/compartir/alumnos` · GET/POST/DELETE `/examenes/alumnos`… | docente | Compartir con alumnos |

### Otros routers

| Prefijo | Nº | Rol principal | Contenido |
|---|---|---|---|
| `/alumnos` | 10 | docente/admin | CRUD alumnos, búsqueda, masivos, por grupo/curso |
| `/certificados` | 6 | estudiante/admin | Emitir, listar, `GET /certificados/validar/{codigo}` (público) |
| `/foro` | 7 | sesión | Hilos, respuestas, likes (por curso) |
| `/pizarra` | 9 | docente | CRUD pizarras, sesiones, elementos (trazos en vivo) |
| `/compartir` | 7 | docente | Salas con QR, vincular alumnos, material, cerrar |
| `/materiales` | 6 | docente/admin | CRUD materiales + `PATCH {id}/toggle` |
| `/carpeta-docente` | 4 | docente | Carpeta personal + sync |
| `/historial` | 4 | docente | Historial de comparticiones |
| `/solicitudes-docente` | 9 | estudiante→admin | Postularse a docente; admin aprueba/rechaza |
| `/integraciones/edm` | 8 | admin | Integración EDM: CRUD, eventos, sincronizar |
| `/geo-analytics` | 3 | admin | `stats`, `map-points`, `recent-logins` |
| `/config/cliente` | 1 | público | Config pública de marca |
| `/media` | 3 | público | Proxy de imágenes / Drive |

---

## 8. Flujos de uso por rol

### 8.1 Estudiante — curso completo (paso a paso)

1. **Registro** en `/registro` → `POST /auth/register`.
2. **Explorar catálogo:** en `/estudiante/cursos`, la sección superior muestra **Mis
   cursos** (solo inscripciones) y la inferior el **Catálogo** con filtros de categoría,
   nivel y búsqueda. Un curso nuevo solo aparece en el Catálogo hasta inscribirse.
3. **Inscribirse:** botón de inscripción → `POST /cursos/{id}/inscribirse`.
4. **Estudiar en orden** (si el curso es `secuencial`, el default):
   - La lección 1 está desbloqueada; cada lección se desbloquea al completar la
     anterior (`estado-bloqueo`).
   - Un video se considera visto al ~90 % de reproducción; las lecturas al marcar
     completada.
   - El docente puede **liberar** manualmente una lección (`/liberar`).
5. **Rendir el examen del módulo** (lección `tipo=examen`):
   - `POST /examenes/{id}/intentos` respeta `max_intentos` y `tiempo_limite_min`.
   - Cambiar de pestaña durante el intento queda registrado.
   - Respuestas: opción múltiple (índice de opción) y verdadero/falso →
     `POST /examenes/resultados` calcula nota 0–20 (aprobado ≥ 10).
6. **Certificado:** si la nota final ≥ `certificado_nota_minima` del curso, se emite
   un certificado con código HMAC → visible en `/estudiante/certificados` y
   verificable en `/validar/{codigo}`.
7. **Comunidad:** foro por curso, pizarra, materiales descargables.

### 8.2 Docente — crear y dictar un curso (paso a paso)

1. **Perfil docente:** el usuario se postula (`/solicitudes-docente`) o el admin le
   asigna el rol.
2. **Crear curso:** `/cursos` → `PanelCursos` → `POST /cursos/` en estado `BORRADOR`.
3. **Componer módulos y lecciones:** editar el curso con la estructura JSON
   `modulos → lecciones` (video / texto / material / examen). Subir portada
   (`/cursos/{id}/imagen`).
4. **Crear el examen del módulo:** `/examenes` → crear con `umbral_aprobacion` (%),
   `max_intentos`, `tiempo_limite_min`, preguntas OM (4 opciones) y VF → estado
   `PUBLICADO`. Vincularlo como lección `tipo=examen` con `contenido.examen_id`.
5. **Publicar el curso:** `POST /cursos/{id}/publicar` (invalida la cache del
   catálogo). Si quedó `ninguno`, migración de arranque lo convierte en `secuencial`.
6. **Dictar:** pizarra en vivo, sala `compartir` con QR, materiales, foro.
7. **Seguimiento:** `GET /cursos/{id}/estudiantes`, `…/progreso-detallado`,
   exportación de alumnos, revisión y corrección de resultados de examen.
8. **Certificados:** se emiten automáticamente al alcanzar la nota mínima; el docente
   los ve en `/admin/certificados` (o panel docente).

### 8.3 Admin — operación del sistema

1. **Usuarios:** CRUD completo en `/auth/usuarios` (admin/docente/estudiante).
2. **Solicitudes de docente:** bandeja en `/admin/solicitudes-docente` → aprobar /
   rechazar / en revisión.
3. **Cursos y exámenes globales:** supervisión desde `/admin/cursos` y
   `/admin/examenes`.
4. **Configuración:** `/admin/configuracion` (marca, límites, empresa).
5. **Accesos:** `/admin/analytics-geografico` → estadísticas de logins
   (`geo-analytics/stats`, `map-points`, `recent-logins`) — panel interno en pruebas.
6. **EDM Team:** integraciones y sincronización en `/integraciones/edm`.
7. **Validación pública** de certificados y soporte con el diagnóstico de la §5.4.

### 8.4 Flujo público (sin sesión)

- Explorar catálogo (`GET /cursos/` solo `PUBLICADO`)
- Responder examen por enlace `/examen/:codigo`
- Validar certificado `/validar/{codigo}` → `GET /certificados/validar/{codigo}`

---

## 9. Particularidades y notas técnicas

> Estos puntos **no son obvios** y causan la mayoría de los errores al replicar.

1. **No hay Alembic.** Los cambios de esquema viven en `back/app/main.py`
   (`COLUMNAS_ESPERADAS` + migraciones idempotentes al arranque) y en
   `supabase/schema_completo.sql`. Ambos deben mantenerse sincronizados.
2. **Módulos como JSON.** No existe tabla `modulos`: la estructura está en
   `Curso.modulos` (JSON). Las lecciones de examen **no tienen bloques**; solo
   `contenido.examen_id`.
3. **Estados en MAYÚSCULAS.** Curso y examen usan `PUBLICADO`/`BORRADOR`. Un
   INSERT directo en BD con `publicado` (minúsculas) hace que el curso no aparezca.
4. **Tres escalas distintas** (ver §4): notas 0–20, umbral de examen en %, índice de
   respuesta 0-based. Mezclarlas es el bug clásico.
5. **Cache del catálogo:** `GET /api/v1/cursos/` cachea 60 s por usuario+filtros
   (`cursos.py`). Solo se invalida al publicar/editar **vía API**; un INSERT directo
   en BD no lo limpia (esperar 1 min o reiniciar).
6. **Bloqueo secuencial** `tipo_bloqueo='secuencial'` es el default (migración
   `ninguno`→`secuencial` al arrancar). `libre` desactiva el orden.
7. **YouTube sin API key:** validar con
   `https://www.youtube.com/oembed?format=json&url=...` (200 + título); duración real
   leyendo `"lengthSeconds"` de la watch page.
8. **JWT para diagnóstico:** si no conoces la contraseña, firma un token local con
   `app.core.security.create_access_token({"sub": user_id})` (ver §5.4). `type` debe
   ser `access`.
9. **PowerShell:** `Select-String -NotMatch` es *case-insensitive* (un patrón `FROM `
   oculta líneas que contienen "from "); usa `-SimpleMatch` o guarda a archivo y usa
   grep de git para análisis sensibles a mayúsculas.
10. **`python -c` con comillas rompe en PowerShell** → escribe el script en un `.py`
    temporal y ejecútalo con el venv.
11. **multi-tenant:** casi todas las tablas llevan `empresa_id`; los queries lo
    filtran. Al replicar, define `EMPRESA_ID_DEFAULT`.
12. **Certificados firmados con HMAC:** el código público no se puede generar sin
    `JWT_SECRET_KEY`/clave de firma; `validar/{codigo}` verifica la firma.
13. **Google Sign-In** está configurado para origen `http://localhost:5173` — cambiar
    en Google Cloud Console al desplegar.
14. **`progreso_pct` usa `math.ceil`** (`back/app/api/cursos.py`): 0.1 % se muestra
    como 1 %.
15. **Sin logo:** `front/public/` solo tiene `favicon.svg`.
16. **Usuarios de prueba sembrados:** admin, docente y estudiante; las contraseñas no
    están en el repo (definir por env var o resetear).
17. **Pruebas backend con SQLite en memoria:** no dependen de PostgreSQL; los tests
    aíslan fixtures por archivo.
18. **`seed_curso_ia.py` es idempotente:** re-ejecutarlo reutiliza el curso existente
    (`058912e7-…`) y no duplica.
19. **Rate limit en `/auth/seed/admin`:** protegido por `X-Bootstrap-Key`; no exponer
    la clave.
20. **El frontend separa "Mis cursos" del "Catálogo"** dentro de la misma ruta — no es
    un bug de inscripción.

---

## 10. Pruebas, despliegue y solución de problemas

### 10.1 Suite de pruebas

| Capa | Comando | Resultado esperado |
|---|---|---|
| Backend | `cd back && .\venv\Scripts\python.exe -m pytest tests/ -q` | **303 passed** |
| Frontend lint | `cd front && npx eslint` | 0 errores |
| Frontend unit | `cd front && npm run test -- --run` | **60 passed** |
| Build | `cd front && npm run build` | Sin errores |

CI ejecuta las 4 verificaciones en cada push (Python 3.11 + Node 20).

### 10.2 Checklist de despliegue

- [ ] `SUPABASE_DATABASE_URL` y `JWT_SECRET_KEY` (≥ 16 chars) definidos
- [ ] `supabase/schema_completo.sql` aplicado
- [ ] `BACKEND_CORS_ORIGINS` y `FRONTEND_URL` con el dominio real
- [ ] `BACKEND_PUBLIC_URL` correcto (enlaces de certificados/QR)
- [ ] Frontend: `npm run build` y `VITE_API_URL` apuntando al backend
- [ ] Primer admin creado con `/auth/seed/admin`
- [ ] `python scripts/generar_manual.py` regenerado (si cambió este documento)

### 10.3 Troubleshooting

| Síntoma | Causa probable | Solución |
|---|---|---|
| `ModuleNotFoundError` al arrancar | venv no activado | `.\venv\Scripts\Activate.ps1` |
| Error de conexión a BD | URL/credenciales Supabase | Revisar `SUPABASE_DATABASE_URL` |
| Columna inexistente | Modelo ≠ BD | Añadir a `COLUMNAS_ESPERADAS` + `schema_completo.sql` |
| Curso publicado no aparece en catálogo | Estado en minúsculas / cache | `UPDATE … SET estado='PUBLICADO'`; esperar 60 s o reiniciar |
| El estudiante no ve su curso | Mirando "Mis cursos" sin inscripción | Inscribirse o revisar la sección Catálogo |
| Lección no desbloquea | Regla secuencial / progreso no guardado | Completar la anterior o `/liberar` |
| `403` en un endpoint | Rol insuficiente | Verificar JWT (`/auth/me`) y guard del router |
| `401` repentino | Access token expirado | `POST /auth/refresh` |
| Login falla 5 veces | Bloqueo de fuerza bruta | Esperar `LOGIN_TIMEOUT_MINUTES` |
| YouTube no carga | URL inválida | Verificar con oembed (§9.7) |
| Nota muestra escala equivocada | Mezcla 0–20 vs % | Ver §4: examen % → nota 0–20 server-side |
| PDF/certificado inválido | Firma HMAC con clave distinta | Misma `JWT_SECRET_KEY` que emitió |
| Pruebas frontend fallan en local | Watch mode | Usar `npm run test -- --run` |
| `Set-Content` escribe mal | PowerShell + comillas | Usar scripts `.py`/`.ps1` en archivo |

### 10.4 Glosario

| Término | Significado |
|---|---|
| LMS | Learning Management System (plataforma de cursos) |
| JWT | JSON Web Token (token firmado, `sub` = usuario) |
| HMAC | Firma de mensaje con clave compartida (códigos de certificado) |
| Bloqueo secuencial | Las lecciones se liberan en orden (estilo Platzi) |
| `BORRADOR`/`PUBLICADO` | Estados de curso y examen (MAYÚSCULAS) |
| Seed | Script de datos iniciales (`seed_curso_ia.py`, `/auth/seed/admin`) |
| Gate | Verificación obligatoria antes de commitear (lint, tests, build) |
| multi-tenant | Datos aislados por `empresa_id` |

---

*Manual generado desde `docs/manual-sistema.md`. Regenerar con `python scripts/generar_manual.py`.*
