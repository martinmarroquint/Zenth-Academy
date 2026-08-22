// front/src/components/comunidad/PanelForo.jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  MessageCircle, Plus, Search, Users, Heart,
  MessageSquare, Eye, Clock, Loader2,
  Pin, TrendingUp, Filter, Tag
} from 'lucide-react';
import foroService from '../../services/foroService';
import { authService } from '../../services/authService';

const PanelForo = ({ onCrearPublicacion, onVerPublicacion }) => {
  const [publicaciones, setPublicaciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const puedeCrear = authService.getRol() === 'admin' || authService.getRol() === 'docente';
  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState('recientes');

  const cargarPublicaciones = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      const data = await foroService.listar({});
      setPublicaciones(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Error cargando publicaciones:', e);
      setError(e.message || 'No se pudieron cargar las publicaciones');
      setPublicaciones([]);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarPublicaciones();
  }, [cargarPublicaciones]);

  const publicacionesFiltradas = (publicaciones || [])
    .filter(p =>
      (p.titulo || '').toLowerCase().includes(busqueda.toLowerCase()) ||
      (p.contenido || '').toLowerCase().includes(busqueda.toLowerCase())
    )
    .sort((a, b) => {
      if (filtro === 'populares') return (b.likes_count || 0) - (a.likes_count || 0);
      if (filtro === 'destacados') return (b.destacado ? 1 : 0) - (a.destacado ? 1 : 0);
      return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    });

  const totalLikes = (publicaciones || []).reduce((acc, p) => acc + (p.likes_count || 0), 0);
  const totalComentarios = (publicaciones || []).reduce((acc, p) => acc + (p.comentarios_count || 0), 0);

  if (cargando) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
        <p className="text-sm text-red-500 mb-4">{error}</p>
        <button
          onClick={cargarPublicaciones}
          className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Comunidad</h2>
          <p className="text-sm text-gray-500">Comparte y colabora con otros docentes</p>
        </div>
        {puedeCrear && (
          <button
            onClick={onCrearPublicacion}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 text-sm"
          >
            <Plus className="w-4 h-4" />
            Nueva Publicación
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{publicaciones.length}</p>
          <p className="text-xs text-gray-500">Publicaciones</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{totalComentarios}</p>
          <p className="text-xs text-gray-500">Comentarios</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{new Set((publicaciones || []).map(p => p.docente_id)).size}</p>
          <p className="text-xs text-gray-500">Miembros activos</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{totalLikes}</p>
          <p className="text-xs text-gray-500">Likes</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar en la comunidad..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all"
          />
        </div>
        <select
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-indigo-300 bg-white"
        >
          <option value="recientes">Más Recientes</option>
          <option value="populares">Más Populares</option>
          <option value="destacados">Destacados</option>
        </select>
      </div>

      {/* Lista de publicaciones */}
      {publicacionesFiltradas.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No hay publicaciones</h3>
          <p className="text-sm text-gray-500 mt-1">Sé el primero en compartir</p>
        </div>
      ) : (
        <div className="space-y-4">
          {publicacionesFiltradas.map((pub) => (
            <div
              key={pub.id}
              className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => onVerPublicacion?.(pub.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {pub.destacado && (
                      <span className="px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded-full flex items-center gap-1">
                        <Pin className="w-3 h-3" /> Destacado
                      </span>
                    )}
                    <span className="text-xs text-gray-400">{pub.docente_nombre || 'Docente'}</span>
                    <span className="text-xs text-gray-300">•</span>
                    <span className="text-xs text-gray-400">{new Date(pub.created_at || Date.now()).toLocaleDateString()}</span>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1">{pub.titulo}</h3>
                  <p className="text-sm text-gray-500 line-clamp-2">{pub.contenido}</p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-4 text-xs text-gray-400">
                <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" />{pub.comentarios_count || 0}</span>
                <span className="flex items-center gap-1"><Heart className="w-3 h-3" />{pub.likes_count || 0}</span>
                <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{pub.vistas_count || 0}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PanelForo;