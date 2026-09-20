# back/diagnostico_imagenes.py
import json

from sqlalchemy import text

from app.database import engine

with engine.connect() as conn:
    rows = conn.execute(
        text("SELECT id, titulo, imagen_url, modulos FROM cursos")
    ).fetchall()

    print(f"Total cursos: {len(rows)}")
    print()

    for r in rows:
        tiene_cover = bool(r[2])
        imgs_texto = 0
        iframes = 0
        iframe_urls = []
        img_urls = []

        for m in (r[3] or []):
            for l in (m.get("lecciones") or []):
                for b in (l.get("bloques") or []):
                    cont = b.get("contenido") or {}
                    txt = str(cont.get("texto") or "")
                    low = txt.lower()
                    imgs_texto += low.count("<img")
                    iframes += low.count("<iframe")

                    # Extraer URLs de imagenes/iframes del HTML
                    import re
                    for u in re.findall(r'<img[^>]+src=["\']([^"\']+)["\']', txt, re.I):
                        img_urls.append(u)
                    for u in re.findall(r'<iframe[^>]+src=["\']([^"\']+)["\']', txt, re.I):
                        iframe_urls.append(u)

        estado = "SI " if tiene_cover else "no "
        print(f"{r[1][:36]:38} | cover={estado} | <img>={imgs_texto} | <iframe>={iframes}")
        for u in img_urls[:3]:
            print(f"      img: {u[:95]}")
        for u in iframe_urls[:3]:
            print(f"      iframe: {u[:95]}")

    print()
    print("=== RECURSOS (tabla materiales_compartidos / recursos en modulos) ===")
    # Buscar recursos dentro de bloques
    for r in rows:
        for m in (r[3] or []):
            for l in (m.get("lecciones") or []):
                for b in (l.get("bloques") or []):
                    if b.get("tipo") == "recurso":
                        cont = b.get("contenido") or {}
                        print(f"  [{r[1][:25]}] recurso:", json.dumps(cont)[:150])
