# Tests del Backend — Zenth Academy

Suite de tests del backend (FastAPI + SQLAlchemy) ejecutada con **pytest**.
Los tests **no requieren una base de datos real**: usan **SQLite en memoria**.

---

## Requisitos

```bash
cd back
pip install -r requirements.txt
pip install pytest pytest-cov
```

---

## Cómo correr los tests

### Windows (PowerShell, con venv en `back/venv`)

```powershell
cd back
& ".\venv\Scripts\python.exe" -m pytest tests/ -v
```

### Linux / macOS / WSL

```bash
cd back
pytest tests/ -v
```

> `back/pytest.ini` ya configura `testpaths = tests`, `--strict-markers` y
> `--tb=short`, así que basta con `pytest` si estás dentro de `back/`.

### Filtrar por marker

```bash
pytest -m unit          # solo tests unitarios (rápidos, sin BD)
pytest -m integration   # tests con BD SQLite y/o cliente HTTP
pytest -m security      # tests de seguridad y permisos
pytest -m "not security"  # excluir los de seguridad
```

### Correr un archivo o un test concreto

```bash
pytest tests/test_calcular_resultado.py -v
pytest tests/test_calcular_resultado.py::test_opcion_multiple_correcta -v
```

---

## Cobertura

```bash
pytest tests/ --cov=app --cov-report=term-missing -v
```

Reporte HTML navegable:

```bash
pytest tests/ --cov=app --cov-report=html
# abrir htmlcov/index.html
```

Reporte XML (el que consume el CI):

```bash
pytest tests/ --cov=app --cov-report=xml
```

---

## Estructura de los tests

```
back/tests/
├── __init__.py
├── conftest.py                  # fixtures globales + engine SQLite en memoria
├── test_smoke.py                # humo: la app arranca, auth y fixtures funcionan
├── test_auth.py                 # login / registro / tokens
├── test_security.py             # permisos por rol y aislamiento (ownership)
├── test_cursos.py               # CRUD de cursos e inscripciones
└── test_calcular_resultado.py   # unitarios puros del cálculo de exámenes
```

### Fixtures disponibles (`conftest.py`)

| Fixture | Alcance | Descripción |
|---|---|---|
| `_create_schema` | session (autouse) | Crea todas las tablas una vez por sesión y las borra al final. |
| `db` | function | Sesión de SQLAlchemy sobre SQLite con **rollback al terminar** cada test. |
| `client` | function | `TestClient` de FastAPI con `get_db` sobrescrito para usar la BD de test. |
| `admin_user` | function | Usuario con rol `admin`. |
| `docente_user` | function | Usuario con rol `docente`. |
| `estudiante_user` | function | Usuario con rol `estudiante`. |
| `otro_docente_user` | function | Segundo docente (para probar aislamiento/ownership). |
| `admin_headers` | function | Header `Authorization: Bearer <token>` de un admin. |
| `docente_headers` | function | Header de autenticación de un docente. |
| `estudiante_headers` | function | Header de autenticación de un estudiante. |
| `otro_docente_headers` | function | Header del segundo docente. |
| `refresh_token_para` | function | Función `_make(user)` que genera un refresh token para ese usuario. |

Todos los usuarios de prueba se crean con la contraseña `Test1234!`.

---

## Markers

Definidos en `back/pytest.ini` (y activados con `--strict-markers`):

- **`unit`** — tests rápidos, puros, sin base de datos ni HTTP.
- **`integration`** — tests que usan la BD de test y/o el `TestClient`.
- **`security`** — tests de seguridad y permisos (suelen combinarse con `integration`).

Todo test nuevo debe llevar al menos un marker; de lo contrario pytest fallará
por `--strict-markers`.

---

## Cómo agregar un test nuevo

1. Crea (o edita) un archivo `back/tests/test_<modulo>.py`.
2. Importa lo necesario y usa las fixtures existentes. Ejemplo:

```python
# back/tests/test_ejemplo.py
import pytest


@pytest.mark.integration
def test_estudiante_puede_ver_mis_cursos(client, estudiante_headers):
    """Un estudiante autenticado puede listar sus cursos."""
    resp = client.get("/api/v1/cursos/mis-cursos", headers=estudiante_headers)
    assert resp.status_code == 200


@pytest.mark.unit
def test_suma_simple():
    assert 1 + 1 == 2
```

3. Si necesitas datos propios, créalos con la fixture `db` dentro del test
   (se revierten automáticamente al final).

Para tests unitarios puros, sigue el patrón de `test_calcular_resultado.py`:
simula los objetos con `types.SimpleNamespace` en lugar de usar la BD.

---

## Por qué SQLite en memoria

- **Aislamiento total:** cada test corre contra una BD limpia; la fixture `db`
  hace rollback al terminar, así que los tests no se contaminan entre sí.
- **Velocidad:** no hay latencia de red ni conexión a Supabase.
- **Sin dependencias externas:** el CI y cualquier dev pueden correr los tests
  sin credenciales ni base de datos levantada.

Como los modelos usan tipos propios de PostgreSQL (`UUID`, `JSONB`),
`conftest.py` registra compiladores para SQLite:

```python
@compiles(PG_UUID, "sqlite")
def _compile_uuid_sqlite(type_, compiler, **kw):
    return "CHAR(36)"

@compiles(PG_JSONB, "sqlite")
def _compile_jsonb_sqlite(type_, compiler, **kw):
    return "JSON"
```

Además, el hashing con Argon2 se acelera en tests usando parámetros mínimos
(misma API, ~100x más rápido que los de producción).

> **Nota:** `app/config.py` se instancia al importar y exige las variables
> `SUPABASE_*` y `JWT_SECRET_KEY`. En local se toman del `.env`; en el CI se
> inyectan como variables dummy (ver `.github/workflows/ci.yml`). No necesitan
> apuntar a una base de datos real porque los tests nunca la usan.
