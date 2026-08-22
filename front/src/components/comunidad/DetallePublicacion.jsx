// front/src/components/comunidad/DetallePublicacion.jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft, Heart, MessageSquare, Eye, Pin,
  Loader2, Send, User
} from 'lucide-react';
import foroService from '../../services/foroService';
import api from '../../services/api';
import { authService } from '../../services/authService';

const DetallePublicacion = ({ publicacionId, onVolver, onEditarPublicacion }) => {
  const [publicacion, setPublicacion] = useState(null);
  const [cargando, setCargando] = useState(true);
  const puedeEditar = !!onEditarPublicacion &&
    (authService.getRol() === 'admin' || authService.getRol() === 'docente');
  const [error, setError] = useState('');
  const [comentario, setComentario] = useState('');
  const [enviando, setEnviando] = useState(false);

  const cargarPublicacion = useCallback(async () => {
    if (!publicacionId) return;
    setCargando(true);
    setError('');
    try {
      const data = await foroService.obtener(publicacionId);
      setPublicacion(data);
    } catch (e) {
      console.error('Error cargando publicación:', e);
      setError(e.message || 'No se pudo cargar la publicación');
    } finally {
      setCargando(false);
    }
  }, [publicacionId]);

  useEffect(() => {
    cargarPublicacion();
  }, [cargarPublicacion]);

  const handleComentar = async () => {
    if (!comentario.trim() || enviando) return;
    setEnviando(true);
    try {
      const usuarioActual = api.getCurrentUser?.() || {};
      await foroService.comentar(publicacionId, {
        contenido: comentario.trim(),
        docente_id: usuarioActual?.id || usuarioActual?.usuario_id || null
      });
      setComentario('');
      await cargarPublicacion();
    } catch (e) {
      console.error('Error comentando:', e);
      alert(e.message || 'No se pudo agregar el comentario');
    } finally {
      setEnviando(false);
    }
  };

  const handleLike = async () => {
    try {
      await foroService.like(publicacionId);
      await cargarPublicacion();
    } catch (e) {
      console.error('Error dando like:', e);
      alert(e.message || 'No se pudo dar like');
    }
  };

  if (cargando) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <p className="text-red-500 text-sm mb-4">{error}</p>
        <button onClick={onVolver} className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm">
          Volver
        </button>
      </div>
    );
  }

  if (!publicacion) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500">Publicación no encontrada</p>
        <button onClick={onVolver} className="mt-4 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm">
          Volver
        </button>
      </div>
    );
  }

  const comentarios = publicacion.comentarios || [];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={onVolver}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al foro
        </button>
        {puedeEditar && (
          <button
            onClick={() => onEditarPublicacion(publicacion)}
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            Editar
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-2">
          {publicacion.destacado && (
            <span className="px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded-full flex items-center gap-1">
              <Pin className="w-3 h-3" /> Destacado
            </span>
          )}
          <span className="text-xs text-gray-400">{publicacion.docente_nombre || 'Docente'}</span>
          <span className="text-xs text-gray-300">•</span>
          <span className="text-xs text-gray-400">{new Date(publicacion.created_at || Date.now()).toLocaleString()}</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">{publicacion.titulo}</h1>
        <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">{publicacion.contenido}</p>
        <div className="mt-4 flex items-center gap-4 text-sm text-gray-400">
          <button
            onClick={handleLike}
            className="flex items-center gap-1 hover:text-red-500 transition-colors"
          >
            <Heart className="w-4 h-4" />
            {publicacion.likes_count || 0} Likes
          </button>
          <span className="flex items-center gap-1"><MessageSquare className="w-4 h-4" />{publicacion.comentarios_count || 0} Comentarios</span>
          <span className="flex items-center gap-1"><Eye className="w-4 h-4" />{publicacion.vistas_count || 0} Vistas</span>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Comentarios ({comentarios.length})</h2>

        <div className="flex gap-3 mb-6">
          <div className="flex-1">
            <textarea
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              placeholder="Escribe un comentario..."
              rows={3}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all resize-none"
            />
          </div>
          <button
            onClick={handleComentar}
            disabled={enviando || !comentario.trim()}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 text-sm disabled:opacity-50 self-end"
          >
            {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Enviar
          </button>
        </div>

        {comentarios.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">Sé el primero en comentar</p>
        ) : (
          <div className="space-y-4">
            {comentarios.map((c) => (
              <div key={c.id} className="flex gap-3">
                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center shrink-0">
                  <User className="w-4 h-4 text-gray-400" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">{c.docente_nombre || 'Docente'}</span>
                    <span className="text-xs text-gray-400">{new Date(c.created_at || Date.now()).toLocaleString()}</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{c.contenido}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DetallePublicacion;