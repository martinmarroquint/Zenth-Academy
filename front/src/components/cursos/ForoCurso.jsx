// front/src/components/cursos/ForoCurso.jsx
// Foro del curso: publicaciones filtradas por curso_id, con crear/ver/editar/eliminar/comentar.

import React, { useState, useEffect, useCallback } from 'react';
import {
  MessageCircle, Plus, Search, Heart,
  MessageSquare, Eye, Loader2, Pin, ArrowLeft
} from 'lucide-react';
import foroService from '../../services/foroService';
import { authService } from '../../services/authService';
import CrearPublicacion from '../comunidad/CrearPublicacion';
import DetallePublicacion from '../comunidad/DetallePublicacion';

const ForoCurso = ({ cursoId }) => {
  const [publicaciones, setPublicaciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [creando, setCreando] = useState(false);
  const [publicacionViendo, setPublicacionViendo] = useState(null);

  const rol = authService.getRol();
  const puedeCrear = rol === 'admin' || rol === 'docente';

  const cargarPublicaciones = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      const data = await foroService.listar({ curso_id: cursoId });
      setPublicaciones(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Error cargando foro del curso:', e);
      setError(e.message || 'No se pudieron cargar las publicaciones');
      setPublicaciones([]);
    } finally {
      setCargando(false);
    }
  }, [cursoId]);

  useEffect(() => {
    cargarPublicaciones();
  }, [cargarPublicaciones]);

  const publicacionesFiltradas = (publicaciones || [])
    .filter(p =>
      (p.titulo || '').toLowerCase().includes(busqueda.toLowerCase()) ||
      (p.contenido || '').toLowerCase().includes(busqueda.toLowerCase())
    )
    .sort((a, b) => (b.destacado ? 1 : 0) - (a.destacado ? 1 : 0) || new Date(b.created_at || 0) - new Date(a.created_at || 0));

  // Vista de detalle de una publicación
  if (publicacionViendo) {
    return (
      <DetallePublicacion
        publicacionId={publicacionViendo}
        onVolver={() => setPublicacionViendo(null)}
        onEditarPublicacion={() => {
          setPublicacionViendo(null);
          setCreando(true);
        }}
      />
    );
  }

  // Vista de creación de publicación
  if (creando) {
    return (
      <CrearPublicacion
        cursoId={cursoId}
        onGuardar={() => {
          setCreando(false);
          cargarPublicaciones();
        }}
        onVolver={() => setCreando(false)}
      />
    );
  }

  if (cargando) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header del foro */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 sm:px-5 py-3 sm:py-4 border-b border-gray-100 gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-indigo-600" />
            Foro del curso
          </h3>
          <p className="text-xs text-gray-500">Discusión entre estudiantes y docentes</p>
        </div>
        {puedeCrear && (
          <button
            onClick={() => setCreando(true)}
            className="px-3 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-1.5 text-xs font-medium min-h-[44px] flex-shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            Nueva publicación
          </button>
        )}
      </div>

      {/* Búsqueda */}
      <div className="px-5 py-3 border-b border-gray-100">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar en el foro del curso..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all"
          />
        </div>
      </div>

      {/* Lista */}
      {error ? (
        <div className="text-center py-10">
          <p className="text-sm text-red-500 mb-3">{error}</p>
          <button
            onClick={cargarPublicaciones}
            className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm"
          >
            Reintentar
          </button>
        </div>
      ) : publicacionesFiltradas.length === 0 ? (
        <div className="text-center py-12">
          <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-700">No hay publicaciones en este foro</p>
          <p className="text-xs text-gray-500 mt-1">Sé el primero en iniciar una discusión</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {publicacionesFiltradas.map((pub) => (
            <div
              key={pub.id}
              className="px-5 py-4 hover:bg-gray-50 transition-colors cursor-pointer"
              onClick={() => setPublicacionViendo(pub.id)}
            >
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
              <h4 className="font-medium text-gray-900 text-sm mb-1">{pub.titulo}</h4>
              <p className="text-sm text-gray-500 line-clamp-2">{pub.contenido}</p>
              <div className="mt-2 flex items-center gap-4 text-xs text-gray-400">
                <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" />{pub.comentarios_count || 0}</span>
                <span className="flex items-center gap-1"><Heart className="w-3 h-3" />{pub.likes_count || 0}</span>
                <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{pub.vistas_count || 0}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Volver al listado si estaba en detalle */}
      {publicacionViendo && (
        <button
          onClick={() => setPublicacionViendo(null)}
          className="hidden"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

export default ForoCurso;