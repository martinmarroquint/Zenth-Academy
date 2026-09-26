// front/src/components/biblioteca/ModalRecurso.jsx
// Formulario para publicar/editar un recurso o tarea de la biblioteca

import React, { useState } from 'react';
import { Button, Input } from '../ui';
import { X } from 'lucide-react';

const TIPOS = [
  { id: 'articulo', label: 'Artículo' },
  { id: 'libro', label: 'Libro' },
  { id: 'video', label: 'Video' },
  { id: 'documento', label: 'Documento' },
  { id: 'enlace', label: 'Enlace' },
  { id: 'tarea', label: 'Tarea' },
];

const ModalRecurso = ({ recurso, onCerrar, onGuardar, guardando }) => {
  // ✅ key en el padre => este estado se inicializa sin efectos
  const [form, setForm] = useState(() => ({
    tipo: recurso?.tipo || 'articulo',
    titulo: recurso?.titulo || '',
    descripcion: recurso?.descripcion || '',
    tema: recurso?.tema || '',
    url: recurso?.url || '',
    portada_url: recurso?.portada_url || '',
    contenido: recurso?.contenido || '',
    etiquetas: (recurso?.etiquetas || []).join(', '),
    fecha_limite: recurso?.fecha_limite ? String(recurso.fecha_limite).slice(0, 16) : '',
    destacado: !!recurso?.destacado,
  }));
  const [error, setError] = useState('');

  const set = (campo, valor) => setForm((prev) => ({ ...prev, [campo]: valor }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.titulo.trim()) {
      setError('El título es obligatorio');
      return;
    }
    if (form.tipo === 'tarea' && !form.descripcion.trim()) {
      setError('Las tareas necesitan una consigna en la descripción');
      return;
    }

    const payload = {
      tipo: form.tipo,
      titulo: form.titulo.trim(),
      descripcion: form.descripcion.trim() || null,
      tema: form.tema.trim() || null,
      url: form.url.trim() || null,
      portada_url: form.portada_url.trim() || null,
      contenido: form.contenido.trim() || null,
      etiquetas: form.etiquetas
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      fecha_limite: form.tipo === 'tarea' && form.fecha_limite ? form.fecha_limite : null,
      destacado: form.destacado,
    };

    await onGuardar(payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">
            {recurso ? 'Editar publicación' : 'Publicar en la biblioteca'}
          </h3>
          <button
            onClick={onCerrar}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
          {/* Tipo */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-2">Tipo</label>
            <div className="flex flex-wrap gap-2">
              {TIPOS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => set('tipo', t.id)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                    form.tipo === t.id
                      ? 'border-[#0f766e] bg-[#0f766e]/10 text-[#0f766e]'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <Input
            label="Título"
            value={form.titulo}
            onChange={(e) => set('titulo', e.target.value)}
            placeholder="Ej: Introducción al álgebra"
          />

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              {form.tipo === 'tarea' ? 'Consigna' : 'Descripción'}
            </label>
            <textarea
              value={form.descripcion}
              onChange={(e) => set('descripcion', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:border-[#0f766e] focus:ring-2 focus:ring-[#0f766e]/10"
              placeholder={form.tipo === 'tarea' ? 'Qué deben hacer los alumnos…' : 'De qué trata…'}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Tema"
              value={form.tema}
              onChange={(e) => set('tema', e.target.value)}
              placeholder="Ej: Matemática"
            />
            <Input
              label="Etiquetas (separadas por coma)"
              value={form.etiquetas}
              onChange={(e) => set('etiquetas', e.target.value)}
              placeholder="álgebra, repaso"
            />
          </div>

          <Input
            label="Enlace / URL (libro, video, PDF…)"
            value={form.url}
            onChange={(e) => set('url', e.target.value)}
            placeholder="https://…"
          />

          <Input
            label="Portada (URL de imagen, opcional)"
            value={form.portada_url}
            onChange={(e) => set('portada_url', e.target.value)}
            placeholder="https://…"
          />

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Contenido en texto (opcional)
            </label>
            <textarea
              value={form.contenido}
              onChange={(e) => set('contenido', e.target.value)}
              rows={4}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:border-[#0f766e] focus:ring-2 focus:ring-[#0f766e]/10"
              placeholder="Podés escribir el material acá mismo…"
            />
          </div>

          {form.tipo === 'tarea' && (
            <Input
              label="Fecha límite (opcional)"
              type="datetime-local"
              value={form.fecha_limite}
              onChange={(e) => set('fecha_limite', e.target.value)}
            />
          )}

          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={form.destacado}
              onChange={(e) => set('destacado', e.target.checked)}
              className="w-4 h-4 rounded border-gray-300"
            />
            Destacar en la biblioteca
          </label>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-3 py-2 rounded-lg">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={onCerrar} disabled={guardando}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" disabled={guardando}>
              {guardando ? 'Guardando…' : recurso ? 'Guardar cambios' : 'Publicar'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ModalRecurso;
