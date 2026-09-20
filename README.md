# Zenth Academy

Plataforma educativa (LMS + herramientas docentes): gestión de **cursos**,
**materiales** compartibles por QR, **exámenes y cuestionarios**, calificaciones,
foro y **certificados** verificables. Multi-rol (admin → docente → estudiante)
y multi-empresa (aislamiento por tenant).

> La referencia de arquitectura y producto es [`FLUJO.md`](./FLUJO.md).

---

## Stack

| Capa | Tecnología |
|---|---|
| **Backend** | FastAPI (Python 3.11) + SQLAlchemy 2.x + Alembic |
| **Base de datos** | PostgreSQL (Supabase) — `JSONB` para estructuras flexibles |
| **Frontend** | React 19 + Vite + Tailwind CSS + React Router 7 |
| **Auth** | JWT (access + refresh con rotación) |
| **Archivos** | Uploads locales + S3 (opcional) |
| **Tests** | pytest (backend) |

---

## Estructura de carpetas

```
Zenth Academy/
├── back/                     # API FastAPI
│   ├── app/
│   │   ├── api/              # Routers por módulo (cursos, auth, examenes, ...)
│   │   ├── models/           # Modelos SQLAlchemy
│   │   ├── schemas/          # Schemas Pydantic
│   │   ├── services/         # Lógica de negocio reutilizable
│   │   ├── core/             # Seguridad, dependencias, middleware
│   │   ├── utils/
│   │   ├── config.py         # Settings (pydantic-settings)
│   │   ├── database.py       # Engine / sesión / get_db
│   │   └── main.py           # App FastAPI
│   ├── alembic/              # Migraciones
│   ├── tests/                # Tests pytest (ver tests/README.md)
│   ├── pytest.ini
│   └── requirements.txt
├── front/                    # SPA React + Vite
│   ├── src/
│   │   ├── pages/            # Vistas de alto nivel por rol
│   │   ├── components/       # Componentes por módulo
│   │   ├── services/         # Clientes API
│   │   ├── context/ hooks/ utils/ config/
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── package.json
├── supabase/                 # Configuración / SQL de Supabase
├── static/ · uploads/        # Recursos estáticos y archivos subidos
├── .github/workflows/ci.yml  # Pipeline de CI
└── FLUJO.md                  # Documento maestro de arquitectura
```

---

## Cómo levantar el proyecto

### Backend

```bash
cd back
python -m venv venv
# Windows: .\venv\Scripts\activate
# Linux/macOS: source venv/bin/activate
pip install -r requirements.txt
```

Crea `back/.env` con las variables requeridas (ver [Variables de entorno](#variables-de-entorno)):

```bash
uvicorn app.main:app --reload
# o
python run.py
```

API disponible en `http://localhost:8000` — docs en `/docs`.

#### Modo local sin Supabase (SQLite)

Para probar el backend sin depender de Supabase (sin internet ni credenciales cloud):

```powershell
cd back
.\run_local_sqlite.ps1
# o con otro puerto:
.\run_local_sqlite.ps1 -Port 8080
```

El script inyecta `SUPABASE_DATABASE_URL=sqlite:///./zenth_local.db` **solo para ese proceso**
(no modifica tu `.env`). La base de datos se crea automáticamente al arrancar.

También puedes hacerlo manualmente:

```powershell
$env:SUPABASE_DATABASE_URL="sqlite:///./zenth_local.db"
.\venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
```

Crea el primer administrador (solo la primera vez):

```powershell
# 1) Agrega a tu .env:
#    BOOTSTRAP_KEY=mi-llave-local
#    ADMIN_BOOTSTRAP_PASSWORD=MiPasswordSegura123!
# 2) Llama al endpoint:
curl -X POST http://localhost:8000/api/v1/auth/seed/admin -H "X-Bootstrap-Key: mi-llave-local"
# 3) Login con admin@zenthacademy.com / MiPasswordSegura123!
```

> **Nota:** hay una plantilla lista en `back/.env.sqlite.example`.

### Frontend

```bash
cd front
npm install
npm run dev
```

App disponible en `http://localhost:5173`.

### Variables de entorno

`back/app/config.py` exige (sin valor por defecto):

```
SUPABASE_DATABASE_URL
SUPABASE_DB_HOST
SUPABASE_DB_PORT
SUPABASE_DB_NAME
SUPABASE_DB_USER
SUPABASE_DB_PASSWORD
JWT_SECRET_KEY   # >= 16 caracteres
```

---

## Testing

### Backend (pytest)

Los tests usan **SQLite en memoria** y **no requieren una base de datos real**.

```bash
cd back
pip install pytest pytest-cov

# Windows (venv en back/venv)
& ".\venv\Scripts\python.exe" -m pytest tests/ -v

# Linux / macOS
pytest tests/ -v

# Con cobertura
pytest tests/ --cov=app --cov-report=term-missing -v
```

Filtrar por marker: `pytest -m unit`, `pytest -m integration`, `pytest -m security`.

Detalles de fixtures, markers y cómo agregar tests: [`back/tests/README.md`](./back/tests/README.md).

### Frontend

```bash
cd front
npm run lint
npm run test
npm run build
```

El frontend tiene suite propia con **Vitest + Testing Library** (18 tests) y
lint con ESLint 9 (**0 errores** exigidos en CI).

---

## CI/CD

Pipeline definido en [`.github/workflows/ci.yml`](./.github/workflows/ci.yml),
se ejecuta en cada `push` y `pull_request`:

| Job | Entorno | Pasos |
|---|---|---|
| **backend-tests** | Ubuntu + Python 3.11 | `pip install` → `pytest tests/ --cov=app --cov-report=xml` |
| **frontend-build** | Ubuntu + Node 20 | `npm ci` → `npm run lint` → `npm run test` → `npm run build` |

Los tests del backend corren sin base de datos real (SQLite en memoria). Las
variables `SUPABASE_*` y `JWT_SECRET_KEY` se inyectan como valores **dummy**
en el workflow, solo para que `app/config.py` pueda instanciarse al importar.

---

## Checklist de despliegue a producción

Antes de cada despliegue:

```powershell
cd back
.\venv\Scripts\python.exe -m pytest tests/ -q      # 220 tests deben pasar
.\venv\Scripts\python.exe verificar_schema.py       # 0 problemas de esquema
```

Luego verifica:

| # | Verificación | Cómo |
|---|---|---|
| 1 | **Esquema sincronizado** | `python verificar_schema.py` → `0 problemas` |
| 2 | **Variables de entorno** | `ENVIRONMENT=production`, `DEBUG=False`, `JWT_SECRET_KEY` fuerte (≥32 chars) |
| 3 | **Bootstrap del admin** | `BOOTSTRAP_KEY` y `ADMIN_BOOTSTRAP_PASSWORD` definidos (≥12 chars) |
| 4 | **CORS** | El dominio real está en `ALLOWED_ORIGINS` (`app/main.py`) |
| 5 | **Frontend** | `VITE_API_URL` apunta al backend de producción |
| 6 | **Backups** | Supabase con backups automáticos activados |
| 7 | **Plan Supabase** | Plan pago (el gratuito **pausa el proyecto por inactividad**) |

> ⚠️ **Importante:** `verificar_schema.py` detecta "schema drift" (tablas/columnas
> que existen en el código pero no en la BD). Ejecútalo **siempre** antes de
> desplegar — detectó un bug real que habría roto las preguntas tipo encuesta.

