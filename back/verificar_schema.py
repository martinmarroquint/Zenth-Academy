# back/verificar_schema.py
# =====================================================
# VERIFICADOR DE ESQUEMA
# Compara los modelos SQLAlchemy con la base de datos real
# (Supabase/PostgreSQL o SQLite). Detecta "schema drift":
# tablas o columnas que existen en el código pero no en la BD.
#
# Uso:
#   .\venv\Scripts\python.exe verificar_schema.py
#
# Salida:
#   - Tablas faltantes en la BD
#   - Columnas faltantes por tabla
#   - Resumen (OK / problemas)
# =====================================================

import sys

from sqlalchemy import inspect

from app.database import engine, Base
import app.models  # noqa: F401  -> registra todos los modelos

VERDE = "\033[92m"
ROJO = "\033[91m"
AMARILLO = "\033[93m"
RESET = "\033[0m"


def main() -> int:
    print("=" * 64)
    print("VERIFICACION DE ESQUEMA (modelos vs base de datos)")
    print("=" * 64)
    print(f"Dialecto : {engine.dialect.name}")
    print(f"Host     : {engine.url.host or '(local)'}")
    print(f"Base     : {engine.url.database}")
    print()

    try:
        inspector = inspect(engine)
        tablas_bd = set(inspector.get_table_names())
    except Exception as e:
        print(f"{ROJO}ERROR: no se pudo inspeccionar la base de datos{RESET}")
        print(f"  {e}")
        return 2

    tablas_modelo = set(Base.metadata.tables.keys())

    faltantes = sorted(tablas_modelo - tablas_bd)
    extra = sorted(tablas_bd - tablas_modelo)

    problemas = 0

    # ---- Tablas faltantes ----
    if faltantes:
        problemas += len(faltantes)
        print(f"{ROJO}TABLAS FALTANTES ({len(faltantes)}):{RESET}")
        for t in faltantes:
            print(f"  - {t}")
        print()
    else:
        print(f"{VERDE}OK: todas las tablas del modelo existen ({len(tablas_modelo)}){RESET}")
        print()

    # ---- Columnas faltantes ----
    columnas_faltantes_total = 0
    for tabla in sorted(tablas_modelo & tablas_bd):
        columnas_bd = {c["name"] for c in inspector.get_columns(tabla)}
        columnas_modelo = {c.name for c in Base.metadata.tables[tabla].columns}
        faltan = sorted(columnas_modelo - columnas_bd)
        if faltan:
            columnas_faltantes_total += len(faltan)
            print(f"{ROJO}[{tabla}] columnas faltantes:{RESET} {', '.join(faltan)}")

    if columnas_faltantes_total:
        problemas += columnas_faltantes_total
        print()
    else:
        print(f"{VERDE}OK: todas las columnas de los modelos existen{RESET}")
        print()

    # ---- Tablas extra (no son error, solo aviso) ----
    if extra:
        print(f"{AMARILLO}AVISO: tablas en la BD que no tienen modelo ({len(extra)}):{RESET}")
        for t in extra:
            print(f"  - {t}")
        print()

    # ---- Resumen ----
    print("=" * 64)
    if problemas == 0:
        print(f"{VERDE}RESULTADO: ESQUEMA SINCRONIZADO - 0 problemas{RESET}")
        return 0
    print(f"{ROJO}RESULTADO: {problemas} problema(s) de esquema detectado(s){RESET}")
    print()
    print("Sugerencia: las columnas faltantes suelen resolverse con las migraciones")
    print("automáticas del startup (ver app/main.py) o con Alembic.")
    return 1


if __name__ == "__main__":
    sys.exit(main())
