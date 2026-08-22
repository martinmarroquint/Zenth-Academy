// front/src/components/comunidad/CrearPublicacion.jsx
import React, { useState } from 'react';
import {
  ArrowLeft, Save, Plus, X, Image, Link as LinkIcon,
  Tag, Users, Loader2
} from 'lucide-react';
import foroService from '../../services/foroService';
import api from '../../services/api';

const CrearPublicacion = ({ publicacion = null, cursoId = null, onGuardar, onVolver }) => {
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [datos, setDatos] = useState({
    titulo: publicacion?.titulo || '',
    contenido: publicacion?.contenido || '',
    categoria: publicacion?.categoria || 'general',
    destacado: publicacion?.destacado || false,
  });

  const handleGuardar = async () => {
    if (!datos.titulo.trim()) return;
    setCargando(true);
    setError('');
    try {
      const usuarioActual = api.getCurrentUser?.() || {};
      const payload = {
        titulo: datos.titulo.trim(),
        contenido: datos.contenido.trim(),
        categoria: datos.categoria,
        curso_id: cursoId || undefined,
        docente_id: usuarioActual?.id || usuarioActual?.usuario_id || null
      };
      let resultado;
      if (publicacion?.id) {
        resultado = await foroService.actualizar(publicacion.id, payload);
      } else {
        resultado = await foroService.crear(payload);
      }
      onGuardar(resultado || payload);
    } catch (e) {
      console.error('Error guardando publicación:', e);
      setError(e.message || 'No se pudo publicar');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onVolver}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al foro
        </button>
        <button
          onClick={handleGuardar}
          disabled={cargando || !datos.titulo.trim()}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 text-sm disabled:opacity-50"
        >
          {cargando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {cargando ? 'Publicando...' : 'Publicar'}
        </button>
      </div>

      {/* Formulario */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-lg">
            {error}
          </div>
        )}
        <input
          type="text"
          value={datos.titulo}
          onChange={(e) => setDatos({ ...datos, titulo: e.target.value })}
          placeholder="Título de la publicación"
          className="w-full text-xl font-semibold text-gray-900 bg-transparent border-0 border-b-2 pb-2 transition-colors placeholder:text-gray-300 focus:outline-none border-transparent hover:border-gray-200 focus:border-gray-300"
        />

        <textarea
          value={datos.contenido}
          onChange={(e) => setDatos({ ...datos, contenido: e.target.value })}
          placeholder="Escribe el contenido de tu publicación..."
          rows={8}
          className="w-full text-sm text-gray-700 bg-transparent border-0 resize-none focus:outline-none placeholder:text-gray-300"
        />

        <div className="flex flex-wrap gap-4 pt-4 border-t border-gray-100">
          <select
            value={datos.categoria}
            onChange={(e) => setDatos({ ...datos, categoria: e.target.value })}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-gray-300 bg-transparent"
          >
            <option value="general">General</option>
            <option value="recursos">Recursos</option>
            <option value="metodologia">Metodología</option>
            <option value="tecnologia">Tecnología</option>
            <option value="eventos">Eventos</option>
          </select>

          <label className="flex items-center gap-2 text-sm text-gray-500">
            <input
              type="checkbox"
              checked={datos.destacado}
              onChange={(e) => setDatos({ ...datos, destacado: e.target.checked })}
              className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            Destacar publicación
          </label>
        </div>
      </div>

      {/* Tips */}
      <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Tips para una buena publicación</h4>
        <ul className="text-xs text-gray-500 space-y-1">
          <li>• Usa un título claro y descriptivo</li>
          <li>• Organiza tu contenido con párrafos cortos</li>
          <li>• Incluye ejemplos o recursos cuando sea útil</li>
          <li>• Sé respetuoso y constructivo</li>
        </ul>
      </div>
    </div>
  );
};

export default CrearPublicacion;