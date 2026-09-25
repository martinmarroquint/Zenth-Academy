// front/src/pages/ManualPage.jsx
// MANUAL DEL SISTEMA — versión navegable del manual con descarga directa.
// Muestra front/public/manual.html en un iframe y ofrece:
//   • Descargar Markdown (front/public/manual-sistema.md)
//   • Descargar / imprimir el HTML (PDF desde el navegador)
// Regenerar los archivos con: python scripts/generar_manual.py

import React from 'react';
import { ArrowLeft, BookOpen, Download, FileDown, Printer } from 'lucide-react';

const ManualPage = () => (
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
        Manual del Sistema — Zenth Academy
      </span>
      <span className="flex-1" />
      <a
        href="/manual-sistema.md"
        download="manual-sistema.md"
        className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/40 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
        title="Descargar el manual en Markdown"
      >
        <Download className="w-4 h-4" />
        Markdown
      </a>
      <a
        href="/manual.html"
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
      src="/manual.html"
      title="Manual del Sistema Zenth Academy"
      className="flex-1 w-full border-0 bg-white"
      style={{ minHeight: 'calc(100vh - 56px)' }}
    />
  </div>
);

export default ManualPage;
