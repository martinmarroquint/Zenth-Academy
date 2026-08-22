// src/components/examenes/GestorRecursosGrupo.jsx
// VERSION CORREGIDA - ARRAY ACTUALIZADO
import React, { useState, useEffect } from 'react';
import { 
  Plus, Link as LinkIcon, FileText, Video, 
  BookOpen, Globe, Trash2, ExternalLink, Copy,
  CheckCircle2, FolderOpen, Eye, Loader2,
  Search, Grid, List, ArrowUpRight, Edit3, Sparkles
} from 'lucide-react';
import materialesService from '../../services/materialesService';

const TIPOS_RECURSO = [
  { id: 'link', label: 'Enlace', icon: LinkIcon, color: '#059669', bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-600' },
  { id: 'pdf', label: 'PDF', icon: FileText, color: '#DC2626', bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-600' },
  { id: 'ppt', label: 'PPT', icon: FileText, color: '#D97706', bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-600' },
  { id: 'video', label: 'Video', icon: Video, color: '#2563EB', bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-600' },
  { id: 'documento', label: 'Doc', icon: BookOpen, color: '#7C3AED', bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-600' },
  { id: 'otro', label: 'Otro', icon: Globe, color: '#6B7280', bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-600' },
];

// Mapeo del tipo visual del frontend -> tipo + categoria del material (recursos unificados)
const TIPO_A_MATERIAL = {
  link: { tipo: 'enlace', categoria: null },
  pdf: { tipo: 'archivo', categoria: 'pdf' },
  ppt: { tipo: 'archivo', categoria: 'ppt' },
  video: { tipo: 'archivo', categoria: 'video' },
  documento: { tipo: 'archivo', categoria: 'documento' },
  otro: { tipo: 'archivo', categoria: 'otro' },
};

const MATERIAL_A_TIPO = (material) => {
  if (material.tipo === 'enlace') return 'link';
  if (material.tipo === 'texto') return 'otro';
  return material.categoria || 'otro';
};

// Convierte un material_compartido al formato interno del gestor
const materialARecurso = (m) => ({
  id: m.id,
  nombre: m.titulo,
  tipo: MATERIAL_A_TIPO(m),
  url: m.contenido || m.url_archivo || '',
  descripcion: m.descripcion || '',
  fecha: m.created_at,
  url_publica: m.url_publica,
  token: m.token,
  visitas: m.visitas || 0,
});

const GestorRecursosGrupo = ({ grupoId, recursos: recursosIniciales = [], onActualizar }) => {
  const [recursos, setRecursos] = useState(recursosIniciales || []);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [mensaje, setMensaje] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [vistaModo, setVistaModo] = useState('grid');
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [busqueda, setBusqueda] = useState('');
  const [formData, setFormData] = useState({ nombre: '', tipo: 'link', url: '', descripcion: '' });

  useEffect(() => { cargarRecursos(); }, [grupoId]);

  const cargarRecursos = async () => {
    try {
      // Recursos unificados: se leen desde /materiales?grupo_id=X
      const data = await materialesService.listar({ grupo_id: grupoId });
      if (Array.isArray(data)) setRecursos(data.map(materialARecurso));
    } catch (error) {
      console.error('Error cargando recursos del grupo:', error);
      setRecursos(recursosIniciales || []);
    }
  };

  const mostrarMensaje = (texto) => {
    setMensaje(texto);
    setTimeout(() => setMensaje(null), 2500);
  };

  const resetFormulario = () => {
    setFormData({ nombre: '', tipo: 'link', url: '', descripcion: '' });
    setEditandoId(null);
    setMostrarFormulario(false);
  };

  // ✅ Agregar recurso como material_compartido (recursos unificados)
  const handleAgregar = async () => {
    if (!formData.nombre.trim() || !formData.url.trim()) {
      mostrarMensaje('Nombre y URL son obligatorios');
      return;
    }
    try { new URL(formData.url); } catch { mostrarMensaje('URL invalida'); return; }

    setCargando(true);
    try {
      const mapeo = TIPO_A_MATERIAL[formData.tipo] || TIPO_A_MATERIAL.link;
      const creado = await materialesService.crear({
        titulo: formData.nombre.trim(),
        tipo: mapeo.tipo,
        categoria: mapeo.categoria,
        contenido: formData.url.trim(),
        descripcion: formData.descripcion.trim(),
        grupo_id: grupoId,
      });
      await cargarRecursos();
      mostrarMensaje('Recurso agregado');
    } catch (error) {
      console.error('Error agregando recurso:', error);
      mostrarMensaje('Error al guardar el recurso');
    }
    setCargando(false);
    resetFormulario();
  };

  // ✅ Editar recurso
  const handleEditar = (recurso) => {
    setFormData({ nombre: recurso.nombre, tipo: recurso.tipo, url: recurso.url, descripcion: recurso.descripcion || '' });
    setEditandoId(recurso.id);
    setMostrarFormulario(true);
  };

  // ✅ Actualizar recurso (material_compartido)
  const handleActualizar = async () => {
    setCargando(true);
    try {
      const mapeo = TIPO_A_MATERIAL[formData.tipo] || TIPO_A_MATERIAL.link;
      await materialesService.actualizar(editandoId, {
        titulo: formData.nombre.trim(),
        tipo: mapeo.tipo,
        categoria: mapeo.categoria,
        contenido: formData.url.trim(),
        descripcion: formData.descripcion.trim(),
      });
      await cargarRecursos();
      mostrarMensaje('Recurso actualizado');
    } catch (error) {
      console.error('Error actualizando recurso:', error);
      mostrarMensaje('Error al actualizar el recurso');
    }
    setCargando(false);
    resetFormulario();
  };

  // ✅ Eliminar recurso (material_compartido)
  const handleEliminar = async (id) => {
    if (!window.confirm('Eliminar este recurso?')) return;
    setCargando(true);
    try {
      await materialesService.eliminar(id);
      await cargarRecursos();
      mostrarMensaje('Recurso eliminado');
    } catch (error) {
      console.error('Error eliminando recurso:', error);
      mostrarMensaje('Error al eliminar el recurso');
    }
    setCargando(false);
  };

  const handleCopiarEnlace = (url) => {
    navigator.clipboard.writeText(url).then(() => mostrarMensaje('Enlace copiado'));
  };

  const recursosFiltrados = recursos.filter(r => {
    const matchBusqueda = (r.nombre || '').toLowerCase().includes(busqueda.toLowerCase());
    const matchTipo = filtroTipo === 'todos' || r.tipo === filtroTipo;
    return matchBusqueda && matchTipo;
  });

  const stats = TIPOS_RECURSO.map(t => ({ ...t, count: recursos.filter(r => r.tipo === t.id).length })).filter(t => t.count > 0);
  const getTipoInfo = (tipo) => TIPOS_RECURSO.find(t => t.id === tipo) || TIPOS_RECURSO[5];

  return (
    <div className="space-y-3 sm:space-y-4">
      
      {mensaje && (
        <div className="fixed top-4 right-4 left-4 sm:left-auto sm:right-4 bg-white px-4 py-2.5 rounded-xl shadow-lg border border-gray-200 flex items-center gap-2 z-50 animate-fadeIn sm:max-w-sm">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
          <span className="text-sm text-gray-700 truncate">{mensaje}</span>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-5">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center">
              <FolderOpen className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" strokeWidth={1.5} />
            </div>
            <div>
              <h2 className="text-xs sm:text-sm font-semibold text-gray-800">Recursos Compartidos</h2>
              <p className="text-[10px] sm:text-xs text-gray-400">{recursos.length} recursos</p>
            </div>
          </div>
          
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="hidden sm:flex items-center bg-gray-100 rounded-lg p-0.5">
              <button onClick={() => setVistaModo('grid')}
                className={`p-1.5 rounded-md transition-colors ${vistaModo === 'grid' ? 'bg-white text-gray-700 shadow-sm' : 'text-gray-400'}`}>
                <Grid className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setVistaModo('list')}
                className={`p-1.5 rounded-md transition-colors ${vistaModo === 'list' ? 'bg-white text-gray-700 shadow-sm' : 'text-gray-400'}`}>
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
            
            <button
              onClick={() => { resetFormulario(); setMostrarFormulario(true); }}
              className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-2 sm:py-2 text-xs font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Agregar</span>
            </button>
          </div>
        </div>

        {stats.length > 0 && (
          <div className="flex items-center gap-1.5 sm:gap-2 mb-3 sm:mb-4 pb-3 sm:pb-4 border-b border-gray-100 overflow-x-auto scrollbar-hide">
            {stats.map(stat => (
              <div key={stat.id} className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg ${stat.bg} ${stat.border} border flex-shrink-0`}>
                <stat.icon className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${stat.text}`} strokeWidth={2} />
                <span className={`text-[10px] sm:text-xs font-semibold ${stat.text}`}>{stat.count}</span>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400" />
            <input
              type="text" value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar..."
              className="w-full pl-8 sm:pl-9 pr-3 sm:pr-4 py-2 sm:py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg outline-none focus:bg-white focus:border-gray-300 transition-colors"
            />
          </div>
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
            <button onClick={() => setFiltroTipo('todos')}
              className={`px-2 sm:px-2.5 py-1.5 rounded-lg text-[10px] sm:text-xs font-medium transition-colors whitespace-nowrap flex-shrink-0
                ${filtroTipo === 'todos' ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-500 border border-gray-200 hover:bg-gray-100'}`}>
              Todos
            </button>
            {TIPOS_RECURSO.map(tipo => (
              <button key={tipo.id} onClick={() => setFiltroTipo(tipo.id)}
                className={`px-2 sm:px-2.5 py-1.5 rounded-lg text-[10px] sm:text-xs font-medium transition-colors whitespace-nowrap flex items-center gap-1 sm:gap-1.5 flex-shrink-0
                  ${filtroTipo === tipo.id ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-500 border border-gray-200 hover:bg-gray-100'}`}>
                <tipo.icon className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                <span className="hidden sm:inline">{tipo.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {mostrarFormulario && (
        <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-5 animate-fadeIn shadow-sm">
          <div className="flex items-center gap-2 mb-3 sm:mb-4">
            <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
            <h3 className="text-xs sm:text-sm font-semibold text-gray-800">
              {editandoId ? 'Editar recurso' : 'Nuevo recurso'}
            </h3>
          </div>
          
          <div className="space-y-2.5 sm:space-y-3">
            <div>
              <label className="block text-[10px] sm:text-xs font-medium text-gray-500 mb-1">Nombre</label>
              <input type="text" value={formData.nombre}
                onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
                placeholder="Ej: Guia de Estudio"
                className="w-full px-3 py-2 sm:py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-gray-300 transition-colors" />
            </div>
            <div>
              <label className="block text-[10px] sm:text-xs font-medium text-gray-500 mb-1">Tipo</label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-1 sm:gap-1">
                {TIPOS_RECURSO.map(tipo => (
                  <button key={tipo.id} onClick={() => setFormData(prev => ({ ...prev, tipo: tipo.id }))}
                    className={`flex items-center justify-center gap-1 px-2 py-2 sm:py-2 rounded-lg text-[10px] sm:text-xs font-medium transition-colors border
                      ${formData.tipo === tipo.id ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                    <tipo.icon className="w-3 h-3" />
                    <span className="hidden sm:inline">{tipo.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-[10px] sm:text-xs font-medium text-gray-500 mb-1">URL</label>
              <div className="relative">
                <LinkIcon className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400" />
                <input type="url" value={formData.url}
                  onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                  placeholder="https://..."
                  className="w-full pl-8 sm:pl-9 pr-3 sm:pr-4 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-gray-300 transition-colors" />
              </div>
            </div>
            <div>
              <label className="block text-[10px] sm:text-xs font-medium text-gray-500 mb-1">Descripcion (opcional)</label>
              <textarea value={formData.descripcion}
                onChange={(e) => setFormData(prev => ({ ...prev, descripcion: e.target.value }))}
                placeholder="Breve descripcion..."
                rows={2}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-gray-300 transition-colors resize-none" />
            </div>
            <div className="flex items-center gap-2 pt-1 sm:pt-2">
              <button onClick={editandoId ? handleActualizar : handleAgregar} disabled={cargando}
                className="flex-1 sm:flex-none px-4 py-2.5 sm:py-2 text-xs font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {cargando && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {editandoId ? 'Actualizar' : 'Agregar recurso'}
              </button>
              <button onClick={resetFormulario}
                className="flex-1 sm:flex-none px-4 py-2.5 sm:py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors text-center">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {recursosFiltrados.length > 0 ? (
        vistaModo === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
            {recursosFiltrados.map(recurso => {
              const tipoInfo = getTipoInfo(recurso.tipo);
              const Icon = tipoInfo.icon;
              return (
                <div key={recurso.id}
                  className="group bg-white rounded-xl border border-gray-200 p-3 sm:p-4 hover:border-gray-300 hover:shadow-md transition-all duration-300">
                  <div className="flex items-start gap-2.5 sm:gap-3">
                    <div className={`w-9 h-9 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl ${tipoInfo.bg} border ${tipoInfo.border} flex items-center justify-center flex-shrink-0`}>
                      <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${tipoInfo.text}`} strokeWidth={1.5} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xs sm:text-sm font-semibold text-gray-800 truncate">{recurso.nombre}</h3>
                      {recurso.descripcion && <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5 line-clamp-2">{recurso.descripcion}</p>}
                      
                      <div className="flex items-center gap-1.5 sm:gap-2 mt-2 sm:mt-3">
                        <a href={recurso.url} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1.5 text-[10px] sm:text-xs font-medium bg-gray-50 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
                          onClick={(e) => e.stopPropagation()}>
                          <ArrowUpRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />Abrir
                        </a>
                        <button onClick={() => handleCopiarEnlace(recurso.url)}
                          className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors">
                          <Copy className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                        </button>
                        <div className="flex-1" />
                        <button onClick={() => handleEditar(recurso)}
                          className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors sm:opacity-0 sm:group-hover:opacity-100">
                          <Edit3 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                        </button>
                        <button onClick={() => handleEliminar(recurso.id)}
                          className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500 transition-colors sm:opacity-0 sm:group-hover:opacity-100">
                          <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
            {recursosFiltrados.map(recurso => {
              const tipoInfo = getTipoInfo(recurso.tipo);
              const Icon = tipoInfo.icon;
              return (
                <div key={recurso.id} className="flex items-center gap-2.5 sm:gap-4 px-3 sm:px-4 py-2.5 sm:py-3 hover:bg-gray-50/50 transition-colors group">
                  <div className={`w-7 h-7 sm:w-9 sm:h-9 rounded-lg ${tipoInfo.bg} border ${tipoInfo.border} flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${tipoInfo.text}`} strokeWidth={1.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-gray-800 truncate">{recurso.nombre}</p>
                    <p className="text-[10px] sm:text-xs text-gray-400 truncate">{recurso.url}</p>
                  </div>
                  <div className="flex items-center gap-0.5 sm:gap-1">
                    <a href={recurso.url} target="_blank" rel="noopener noreferrer"
                      className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600">
                      <ExternalLink className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    </a>
                    <button onClick={() => handleCopiarEnlace(recurso.url)}
                      className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 hidden sm:block">
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleEditar(recurso)}
                      className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600">
                      <Edit3 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    </button>
                    <button onClick={() => handleEliminar(recurso.id)}
                      className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500">
                      <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 p-8 sm:p-12 text-center">
          <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-3 sm:mb-4">
            <FolderOpen className="w-6 h-6 sm:w-8 sm:h-8 text-gray-300" strokeWidth={1} />
          </div>
          <h3 className="text-sm font-semibold text-gray-500 mb-1">
            {busqueda ? 'Sin resultados' : 'No hay recursos todavia'}
          </h3>
          <p className="text-xs text-gray-400 mb-4 max-w-sm mx-auto">
            {busqueda ? 'Intenta con otra busqueda' : 'Agrega enlaces, PDFs, videos y mas para compartir'}
          </p>
          {!busqueda && (
            <button onClick={() => setMostrarFormulario(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 sm:py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors">
              <Plus className="w-4 h-4" />Agregar primer recurso
            </button>
          )}
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.2s ease-out; }
        .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        * { -webkit-tap-highlight-color: transparent; }
      `}</style>
    </div>
  );
};

export default GestorRecursosGrupo;