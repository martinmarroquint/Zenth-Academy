// front/src/pages/ManualPage.jsx
// MANUALES DE ZENTH ACADEMY — versión navegable con descarga directa.
// Un solo componente para los 3 manuales (prop `manual`):
//   • sistema  → /manual          (técnico, equipo interno)
//   • docentes → /manual-docentes (uso, docentes)
//   • alumnos  → /manual-alumnos  (uso, alumnos)
// Muestra el HTML generado en un iframe y ofrece:
//   • Descargar Markdown (front/public/manual-*.md)
//   • Descargar / imprimir el HTML (PDF desde el navegador)
// Regenerar los archivos con: python scripts/generar_manual.py

import React from 'react';
import { ArrowLeft, BookOpen, Download, FileDown, Printer } from 'lucide-react';

const MANUALES = {
  sistema: {
    html: '/manual.html',
    md: '/manual-sistema.md',
    titulo: 'Manual del Sistema',
    nota: 'Manual técnico para el equipo',
  },
  docentes: {
    html: '/manual-docentes.html',
    md: '/manual-docentes.md',
    titulo: 'Manual para Docentes',
    nota: 'Guía de uso para docentes',
  },
  alumnos: {
    html: '/manual-alumnos.html',
    md: '/manual-alumnos.md',
    titulo: 'Manual para Alumnos',
    nota: 'Guía de uso para alumnos',
  },
};

const ManualPage = ({ manual = 'sistema' }) => {
  const cfg = MANUALES[manual] || MANUALES.sistema;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Barra de acciones */}
      <header className="bg-[#115e59] text-white px-4 py-3 flex flex-wrap items-center gap-3 shadow">
        <a
          href="/"
          className="inline-flex items-center gap-2 text-sm font-medium hover:underline"
          title="Volver a la portada"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver
        </a>
        <span className="inline-flex items-center gap-2 font-semibold">
          <BookOpen className="w-5 h-5" />
          {cfg.titulo} — Zenth Academy
        </span>
        <span className="hidden sm:inline text-xs text-white/70">{cfg.nota}</span>
        <span className="flex-1" />
        <a
          href={cfg.md}
          download={cfg.md.replace('/', '')}
          className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/40 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
          title="Descargar el manual en Markdown"
        >
          <Download className="w-4 h-4" />
          Markdown
        </a>
        <a
          href={cfg.html}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/40 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
          title="Abrir el manual en una pestaña nueva (allí puedes imprimirlo a PDF)"
        >
          <FileDown className="w-4 h-4" />
          Abrir / PDF
        </a>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 bg-white text-[#115e59] hover:bg-gray-100 rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors"
          title="Imprimir esta página o guardarla como PDF"
        >
          <Printer className="w-4 h-4" />
          Imprimir
        </button>
      </header>

      {/* Cuerpo: manual embebido */}
      <iframe
        src={cfg.html}
        title={`${cfg.titulo} Zenth Academy`}
        className="flex-1 w-full border-0 bg-white"
        style={{ minHeight: 'calc(100vh - 56px)' }}
      />
    </div>
  );
};

export default ManualPage;
