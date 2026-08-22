// front/src/components/cuestionarios/PanelCuestionarios.jsx
// VERSION FINAL - UN SOLO BOTON "NUEVO"

import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, Edit3, Trash2, 
  Eye, BarChart3, Users, Clock,
  CheckCircle, XCircle, Play, Pause,
  Loader2, FileText, MessageSquare, ClipboardList,
  Link as LinkIcon
} from 'lucide-react';
import cuestionariosService from '../../services/cuestionariosService';

const PanelCuestionarios = ({ 
  empresaId = 'default', 
  onEditar, 
  onVerResultados,
  onVerRespuestas
}) => {
  const [cuestionarios, setCuestionarios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [error, setError] = useState(null);
  const [accionEnCurso, setAccionEnCurso] = useState(null);

  useEffect(() => {
    cargarCuestionarios();
  }, [empresaId]);

  const cargarCuestionarios = async () => {
    setCargando(true);
    setError(null);
    try {
      const data = await cuestionariosService.listar({ empresa_id: empresaId });
      setCuestionarios(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error cargando cuestionarios:', error);
      setError(error.message || 'Error al cargar los cuestionarios');
      setCuestionarios([]);
    } finally {
      setCargando(false);
    }
  };

  const cambiarEstado = async (id, nuevoEstado) => {
    if (accionEnCurso) return;
    setAccionEnCurso(id);
    try {
      await cuestionariosService.actualizar(id, { estado: nuevoEstado });
      await cargarCuestionarios();
    } catch (error) {
      console.error('Error cambiando estado:', error);
      setError(error.message || 'Error al cambiar estado');
    } finally {
      setAccionEnCurso(null);
    }
  };

  const eliminarCuestionario = async (id) => {
    if (!window.confirm('¿Eliminar este cuestionario?')) return;
    if (accionEnCurso) return;
    setAccionEnCurso(id);
    try {
      await cuestionariosService.eliminar(id);
      await cargarCuestionarios();
    } catch (error) {
      console.error('Error eliminando:', error);
      setError(error.message || 'Error al eliminar');
    } finally {
      setAccionEnCurso(null);
    }
  };

  const copiarEnlace = (cuestionario) => {
    const url = cuestionario.url_publica || `${window.location.origin}/cuestionario/${cuestionario.id}`;
    navigator.clipboard.writeText(url).then(() => {
      const toast = document.createElement('div');
      toast.className = 'fixed bottom-4 right-4 bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg text-sm z-50 animate-slideUp';
      toast.textContent = '✅ Enlace copiado';
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
    }).catch(() => {
      prompt('Copia este enlace:', url);
    });
  };

  const tipos = ['todos', 'examen', 'encuesta', 'evaluacion', 'feedback', 'test'];
  const estados = ['todos', 'BORRADOR', 'PUBLICADO', 'CERRADO', 'ARCHIVADO'];

  const cuestionariosFiltrados = cuestionarios.filter(c => {
    const matchBusqueda = (c.titulo || '').toLowerCase().includes(busqueda.toLowerCase()) ||
                          (c.descripcion || '').toLowerCase().includes(busqueda.toLowerCase());
    const matchTipo = filtroTipo === 'todos' || c.tipo === filtroTipo;
    const matchEstado = filtroEstado === 'todos' || c.estado === filtroEstado;
    return matchBusqueda && matchTipo && matchEstado;
  });

  const getEstadoColor = (estado) => {
    const colores = {
      BORRADOR: 'bg-gray-100 text-gray-600',
      PUBLICADO: 'bg-green-100 text-green-600',
      CERRADO: 'bg-red-100 text-red-600',
      ARCHIVADO: 'bg-gray-100 text-gray-400'
    };
    return colores[estado] || 'bg-gray-100 text-gray-600';
  };

  const getEstadoIcon = (estado) => {
    const icons = {
      BORRADOR: <FileText className="w-3 h-3" />,
      PUBLICADO: <CheckCircle className="w-3 h-3" />,
      CERRADO: <XCircle className="w-3 h-3" />,
      ARCHIVADO: <Clock className="w-3 h-3" />
    };
    return icons[estado] || null;
  };

  const getTipoIcon = (tipo) => {
    const icons = {
      examen: <FileText className="w-4 h-4" />,
      encuesta: <Users className="w-4 h-4" />,
      evaluacion: <BarChart3 className="w-4 h-4" />,
      feedback: <MessageSquare className="w-4 h-4" />,
      test: <CheckCircle className="w-4 h-4" />
    };
    return icons[tipo] || <FileText className="w-4 h-4" />;
  };

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-600 text-sm">{error}</p>
        <button
          onClick={cargarCuestionarios}
          className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (cargando) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header - UN SOLO BOTON */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Cuestionarios</h2>
          <p className="text-sm text-gray-400">Gestiona tus cuestionarios</p>
        </div>
        <button
          onClick={() => onEditar?.(null)}
          className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-2 text-sm"
        >
          <Plus className="w-4 h-4" />
          Nuevo
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-gray-300 focus:ring-2 focus:ring-gray-100 transition-all"
          />
        </div>
        <select
          value={filtroTipo}
          onChange={(e) => setFiltroTipo(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-gray-300 focus:ring-2 focus:ring-gray-100 transition-all bg-white"
        >
          {tipos.map(t => (
            <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
          ))}
        </select>
        <select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-gray-300 focus:ring-2 focus:ring-gray-100 transition-all bg-white"
        >
          {estados.map(e => (
            <option key={e} value={e}>{e.charAt(0).toUpperCase() + e.slice(1)}</option>
          ))}
        </select>
      </div>

      {/* Lista */}
      {cuestionariosFiltrados.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200/60">
          <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">
            {busqueda || filtroTipo !== 'todos' || filtroEstado !== 'todos'
              ? 'No hay resultados con esos filtros'
              : 'No hay cuestionarios'}
          </p>
          {/* ✅ ELIMINADO EL BOTON REDUNDANTE AQUI */}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cuestionariosFiltrados.map((cuestionario) => (
            <div
              key={cuestionario.id}
              className="bg-white rounded-xl border border-gray-200/60 p-4 hover:border-gray-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  {getTipoIcon(cuestionario.tipo)}
                  <span className="text-xs font-medium text-gray-400 uppercase">
                    {cuestionario.tipo}
                  </span>
                </div>
                <span className={`px-2 py-0.5 text-xs font-medium rounded-full flex items-center gap-1 ${getEstadoColor(cuestionario.estado)}`}>
                  {getEstadoIcon(cuestionario.estado)}
                  {cuestionario.estado}
                </span>
              </div>

              <h3 className="font-semibold text-gray-900 mb-1 truncate">
                {cuestionario.titulo || 'Sin título'}
              </h3>
              <p className="text-sm text-gray-400 line-clamp-2 mb-3">
                {cuestionario.descripcion || 'Sin descripción'}
              </p>

              <div className="flex items-center gap-4 text-xs text-gray-400 mb-4">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {cuestionario.created_at ? new Date(cuestionario.created_at).toLocaleDateString() : '—'}
                </span>
                {cuestionario.preguntas?.length > 0 && (
                  <span className="flex items-center gap-1">
                    <FileText className="w-3 h-3" />
                    {cuestionario.preguntas.length}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1 pt-3 border-t border-gray-100 flex-wrap">
                {onVerResultados && (
                  <button
                    onClick={() => onVerResultados(cuestionario.id)}
                    className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors"
                    title="Resultados"
                  >
                    <BarChart3 className="w-4 h-4" />
                  </button>
                )}
                {onVerRespuestas && (
                  <button
                    onClick={() => onVerRespuestas(cuestionario.id)}
                    className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors"
                    title="Respuestas"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => onEditar?.(cuestionario)}
                  className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors"
                  title="Editar"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => copiarEnlace(cuestionario)}
                  className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors"
                  title="Copiar enlace"
                >
                  <LinkIcon className="w-4 h-4" />
                </button>
                <div className="flex-1" />
                {cuestionario.estado === 'BORRADOR' && (
                  <button
                    onClick={() => cambiarEstado(cuestionario.id, 'PUBLICADO')}
                    disabled={accionEnCurso === cuestionario.id}
                    className="p-2 hover:bg-green-50 rounded-lg text-gray-400 hover:text-green-600 transition-colors disabled:opacity-50"
                    title="Publicar"
                  >
                    {accionEnCurso === cuestionario.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                  </button>
                )}
                {cuestionario.estado === 'PUBLICADO' && (
                  <button
                    onClick={() => cambiarEstado(cuestionario.id, 'CERRADO')}
                    disabled={accionEnCurso === cuestionario.id}
                    className="p-2 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50"
                    title="Cerrar"
                  >
                    {accionEnCurso === cuestionario.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Pause className="w-4 h-4" />
                    )}
                  </button>
                )}
                <button
                  onClick={() => eliminarCuestionario(cuestionario.id)}
                  disabled={accionEnCurso === cuestionario.id}
                  className="p-2 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
                  title="Eliminar"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PanelCuestionarios;