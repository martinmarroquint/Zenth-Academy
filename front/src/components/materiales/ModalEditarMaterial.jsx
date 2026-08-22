// front/src/components/materiales/ModalEditarMaterial.jsx
// MODAL PARA EDITAR MATERIAL

import React, { useState, useEffect } from 'react';
import { X, Loader2, Link as LinkIcon, FileText, Type } from 'lucide-react';

const TIPOS = [
  { id: 'enlace', label: 'Enlace', icon: LinkIcon },
  { id: 'texto', label: 'Texto', icon: Type },
  { id: 'archivo', label: 'Archivo', icon: FileText },
];

const ModalEditarMaterial = ({ material, onGuardar, onCancelar, cargando }) => {
  const [form, setForm] = useState({
    titulo: '',
    descripcion: '',
    tipo: 'enlace',
    contenido: '',
    nombre_archivo: '',
    url_archivo: '',
  });
  const [error, setError] = useState('');

  useEffect(() => {
    if (material) {
      setForm({
        titulo: material.titulo || '',
        descripcion: material.descripcion || '',
        tipo: material.tipo || 'enlace',
        contenido: material.contenido || '',
        nombre_archivo: material.nombre_archivo || '',
        url_archivo: material.url_archivo || '',
      });
    }
  }, [material]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.titulo.trim()) {
      setError('El titulo es obligatorio');
      return;
    }

    if (form.tipo === 'enlace' && !form.contenido.trim()) {
      setError('Ingresa la URL del enlace');
      return;
    }

    if (form.tipo === 'texto' && !form.contenido.trim()) {
      setError('Escribe el contenido del material');
      return;
    }

    await onGuardar(form);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
      <div 
        className="bg-white rounded-2xl max-w-lg w-full shadow-xl my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">
            {material?.id ? 'Editar material' : 'Nuevo material'}
          </h3>
          <button 
            onClick={onCancelar} 
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label className="text-xs text-gray-500 block mb-1">Titulo *</label>
            <input
              type="text"
              value={form.titulo}
              onChange={(e) => setForm({ ...form, titulo: e.target.value })}
              placeholder="Ej: Guia de estudio - Capitulo 3"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all"
              autoFocus
            />
          </div>

          <div>
            <label className="text-xs text-gray-500 block mb-1">Descripcion (opcional)</label>
            <textarea
              value={form.descripcion}
              onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
              rows={2}
              placeholder="Breve descripcion del material"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all resize-none"
            />
          </div>

          <div>
            <label className="text-xs text-gray-500 block mb-2">Tipo de material</label>
            <div className="grid grid-cols-3 gap-2">
              {TIPOS.map((t) => {
                const Icon = t.icon;
                const activo = form.tipo === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setForm({ ...form, tipo: t.id })}
                    className={`p-3 rounded-xl border text-center transition-all ${
                      activo
                        ? 'border-indigo-300 bg-indigo-50 ring-2 ring-indigo-100'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Icon className={`w-5 h-5 mx-auto ${activo ? 'text-indigo-600' : 'text-gray-400'}`} />
                    <p className="text-xs font-medium text-gray-700 mt-1">{t.label}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {form.tipo === 'enlace' && (
            <div>
              <label className="text-xs text-gray-500 block mb-1">URL del enlace *</label>
              <input
                type="url"
                value={form.contenido}
                onChange={(e) => setForm({ ...form, contenido: e.target.value })}
                placeholder="https://..."
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all"
              />
            </div>
          )}

          {form.tipo === 'texto' && (
            <div>
              <label className="text-xs text-gray-500 block mb-1">Contenido *</label>
              <textarea
                value={form.contenido}
                onChange={(e) => setForm({ ...form, contenido: e.target.value })}
                rows={4}
                placeholder="Escribe el contenido del material..."
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all resize-none"
              />
            </div>
          )}

          {form.tipo === 'archivo' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Nombre del archivo</label>
                <input
                  type="text"
                  value={form.nombre_archivo}
                  onChange={(e) => setForm({ ...form, nombre_archivo: e.target.value })}
                  placeholder="Ej: guia_capitulo3.pdf"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">URL de descarga</label>
                <input
                  type="url"
                  value={form.url_archivo}
                  onChange={(e) => setForm({ ...form, url_archivo: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all"
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onCancelar}
              className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={cargando}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium flex items-center gap-2 disabled:opacity-50"
            >
              {cargando ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {material?.id ? 'Actualizar' : 'Crear'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ModalEditarMaterial;