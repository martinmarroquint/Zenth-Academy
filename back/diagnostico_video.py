# back/diagnostico_video.py
import json

from sqlalchemy import text

from app.database import engine

with engine.connect() as conn:
    rows = conn.execute(text("SELECT titulo, modulos FROM cursos")).fetchall()

    for titulo, modulos in rows:
        print("=" * 60)
        print("CURSO:", titulo)
        print("=" * 60)
        for m in (modulos or []):
            print(f"  MODULO: {m.get('titulo')} (id={m.get('id')})")
            for l in (m.get("lecciones") or []):
                print(f"    LECCION: {l.get('titulo')} (tipo={l.get('tipo')!r})")
                for b in (l.get("bloques") or []):
                    print(f"      BLOQUE tipo={b.get('tipo')!r} titulo={b.get('titulo')!r}")
                    print(f"        contenido = {json.dumps(b.get('contenido'), ensure_ascii=False)[:200]}")
        print()
