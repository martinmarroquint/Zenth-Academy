#!/usr/bin/env python3
"""
generar_manual.py — Genera las versiones descargables del manual del sistema.

Entrada (fuente canónica):
    docs/manual-sistema.md

Salidas:
    front/public/manual.html         Manual autocontenido (navegable e imprimible a PDF)
    front/public/manual-sistema.md   Copia en Markdown para descarga directa

Uso:
    python scripts/generar_manual.py

Requiere: pip install markdown
"""
from __future__ import annotations

import shutil
import sys
from datetime import date
from pathlib import Path

try:
    import markdown
except ImportError:
    sys.exit("Falta la dependencia 'markdown'. Instala con: pip install markdown")

RAIZ = Path(__file__).resolve().parent.parent
FUENTE = RAIZ / "docs" / "manual-sistema.md"
SALIDA_HTML = RAIZ / "front" / "public" / "manual.html"
SALIDA_MD = RAIZ / "front" / "public" / "manual-sistema.md"

CSS = """
:root {
  --teal: #0f766e; --teal-dark: #115e59; --ink: #1e293b; --muted: #64748b;
  --bg: #f8fafc; --card: #ffffff; --line: #e2e8f0; --code-bg: #0f172a;
}
* { box-sizing: border-box; }
html { scroll-behavior: smooth; }
body {
  margin: 0; font-family: "Segoe UI", system-ui, -apple-system, sans-serif;
  color: var(--ink); background: var(--bg); line-height: 1.65; font-size: 16px;
}
header.manual-top {
  position: sticky; top: 0; z-index: 20; background: var(--teal-dark);
  color: #fff; padding: 0.7rem 1.2rem; display: flex; align-items: center;
  gap: 1rem; flex-wrap: wrap; box-shadow: 0 2px 8px rgba(0,0,0,.18);
}
header.manual-top h1 { font-size: 1rem; margin: 0; font-weight: 600; }
header.manual-top .spacer { flex: 1; }
header.manual-top a.btn {
  background: #fff; color: var(--teal-dark); text-decoration: none;
  padding: 0.4rem 0.85rem; border-radius: 6px; font-size: .85rem; font-weight: 600;
}
header.manual-top a.btn.ghost { background: transparent; color: #fff; border: 1px solid rgba(255,255,255,.6); }
.layout { display: flex; max-width: 1200px; margin: 0 auto; gap: 1.5rem; padding: 1.5rem 1rem 4rem; }
nav.toc {
  width: 250px; flex-shrink: 0; position: sticky; top: 64px; align-self: flex-start;
  max-height: calc(100vh - 80px); overflow-y: auto; background: var(--card);
  border: 1px solid var(--line); border-radius: 10px; padding: 1rem; font-size: .85rem;
}
nav.toc .toc-title { font-weight: 700; color: var(--teal); margin-bottom: .5rem; text-transform: uppercase; font-size: .72rem; letter-spacing: .06em; }
nav.toc ol { list-style: none; margin: 0; padding: 0; }
nav.toc ol ol { padding-left: 0.9rem; }
nav.toc a { display: block; color: var(--muted); text-decoration: none; padding: .22rem 0; }
nav.toc a:hover { color: var(--teal); }
main { flex: 1; min-width: 0; background: var(--card); border: 1px solid var(--line); border-radius: 10px; padding: 1.8rem 2.2rem; }
main h1 { color: var(--teal-dark); font-size: 1.9rem; margin-top: 0; }
main h2 { color: var(--teal-dark); font-size: 1.4rem; border-bottom: 2px solid var(--line); padding-bottom: .35rem; margin-top: 2.4rem; }
main h3 { color: var(--teal); font-size: 1.12rem; margin-top: 1.8rem; }
main a { color: var(--teal); }
main code { background: #eef2f5; padding: .1rem .35rem; border-radius: 4px; font-size: .87em; font-family: Consolas, "Courier New", monospace; }
main pre { background: var(--code-bg); color: #e2e8f0; padding: 1rem; border-radius: 8px; overflow-x: auto; }
main pre code { background: none; color: inherit; padding: 0; }
main blockquote { margin: 1rem 0; padding: .6rem 1rem; border-left: 4px solid var(--teal); background: #f0fdfa; color: var(--teal-dark); border-radius: 0 8px 8px 0; }
main table { border-collapse: collapse; width: 100%; margin: 1rem 0; font-size: .9rem; display: block; overflow-x: auto; }
main th, main td { border: 1px solid var(--line); padding: .5rem .65rem; text-align: left; vertical-align: top; }
main th { background: #f1f5f9; color: var(--teal-dark); }
main tr:nth-child(even) td { background: #f8fafc; }
main hr { border: 0; border-top: 1px solid var(--line); margin: 2rem 0; }
main li { margin: .25rem 0; }
footer.manual-bottom { text-align: center; color: var(--muted); font-size: .8rem; padding: 1.5rem; }
@media (max-width: 900px) { nav.toc { display: none; } main { padding: 1.2rem; } }
@media print {
  header.manual-top, nav.toc, footer.manual-bottom, .no-print { display: none !important; }
  body { background: #fff; font-size: 11pt; }
  .layout { display: block; max-width: none; padding: 0; }
  main { border: 0; border-radius: 0; padding: 0; }
  main h2 { break-after: avoid; } main table, main pre { break-inside: avoid; }
  main a { color: inherit; text-decoration: none; }
}
"""

JS = """
document.addEventListener('click', function (e) {
  var t = e.target.closest('[data-print]');
  if (t) { e.preventDefault(); window.print(); }
});
"""

PLANTILLA = """<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Zenth Academy — Manual del Sistema</title>
<style>{css}</style>
</head>
<body>
<header class="manual-top no-print">
  <h1>Zenth Academy — Manual del Sistema</h1>
  <div class="spacer"></div>
  <a class="btn ghost" href="/manual-sistema.md" download>Descargar Markdown</a>
  <a class="btn ghost" href="#" data-print>Imprimir / Guardar PDF</a>
  <a class="btn" href="/">Volver a la app</a>
</header>
<div class="layout">
  <nav class="toc no-print">
    <div class="toc-title">Contenido</div>
    {toc}
  </nav>
  <main>{cuerpo}</main>
</div>
<footer class="manual-bottom">Zenth Academy · Manual Técnico v1.0.0 · Generado el {fecha}</footer>
<script>{js}</script>
</body>
</html>
"""


def md_a_html(texto: str) -> str:
    return markdown.markdown(
        texto,
        extensions=["tables", "fenced_code", "toc", "sane_lists", "nl2br"],
        extension_configs={"toc": {"toc_depth": "2-3", "permalink": False}},
    )


def construir_toc(html: str) -> str:
    """Extrae h2/h3 del cuerpo para el índice lateral."""
    import re

    partes: list[str] = []
    nivel_actual = 2
    for m in re.finditer(r'<h([23]) id="([^"]*)"[^>]*>(.*?)</h\1>', html, re.S):
        nivel, anchor, titulo = int(m.group(1)), m.group(2), re.sub(r"<[^>]+>", "", m.group(3))
        if nivel == 2 and nivel_actual == 3:
            partes.append("</ol>")
        if nivel == 3 and nivel_actual == 2:
            partes.append("<ol>")
        if nivel == 2 and nivel_actual == 3:
            nivel_actual = 2
        elif nivel == 3 and nivel_actual == 2:
            nivel_actual = 3
        partes.append(f'<li><a href="#{anchor}">{titulo}</a></li>')
    if nivel_actual == 3:
        partes.append("</ol>")
    return "<ol>" + "".join(partes) + "</ol>"


def main() -> None:
    if not FUENTE.exists():
        sys.exit(f"No se encontró la fuente: {FUENTE}")
    texto = FUENTE.read_text(encoding="utf-8")
    html_cuerpo = md_a_html(texto)
    toc = construir_toc(html_cuerpo)
    html = PLANTILLA.format(css=CSS, js=JS, toc=toc, cuerpo=html_cuerpo, fecha=date.today().isoformat())

    SALIDA_HTML.parent.mkdir(parents=True, exist_ok=True)
    SALIDA_HTML.write_text(html, encoding="utf-8")
    SALIDA_MD.write_text(texto, encoding="utf-8")

    print(f"OK  {SALIDA_HTML.relative_to(RAIZ)}  ({len(html):,} bytes)")
    print(f"OK  {SALIDA_MD.relative_to(RAIZ)}  ({len(texto):,} bytes)")


if __name__ == "__main__":
    main()
