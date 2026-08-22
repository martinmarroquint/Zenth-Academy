// front/src/components/pizarra/PanelPizarras.jsx
// COMPONENTE COMPLETO - PANEL DE PIZARRAS

import React, { useState, useEffect } from 'react';
import {
  Plus, Search, Edit3, Trash2, Users, Eye,
  PenTool, Grid, LayoutGrid, Calendar, Lock, Globe,
  ChevronRight, Loader2, Copy, Link as LinkIcon
} from 'lucide-react';
import pizarraService from '../../services/pizarraService';

const PanelPizarras = ({ usuarioId, onAbrirPizarra, onCrearPizarra }) => {
  const [pizarras, setPizarras] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [vista, setVista] = useState('grid');

  useEffect(() => {
    cargarPizarras();
  }, []);

  const cargarPizarras = async () => {
    setCargando(true);
    try {
      const data = await pizarraService.listar({ creado_por: usuarioId });
      setPizarras(data || []);
    } catch (error) {
      console.error('Error cargando pizarras:', error);
    } finally {
      setCargando(false);
    }
  };

  const eliminarPizarra = async (id) => {
    if (!window.confirm('¿Eliminar esta pizarra?')) return;
    try {
      await pizarraService.eliminar(id);
      await cargarPizarras();
    } catch (error) {
      console.error('Error eliminando:', error);
    }
  };

  const copiarEnlace = (id) => {
    const url = `${window.location.origin}/pizarra/${id}`;
    navigator.clipboard.writeText(url);
  };

  const tipos = ['todos', 'blanca', 'didactica', 'colaborativa', 'presentacion'];
  const tiposLabels = {
    blanca: 'Pizarra Blanca',
    didactica: 'Pizarra Didáctica',
    colaborativa: 'Pizarra Colaborativa',
    presentacion: 'Presentación'
  };

  const pizarrasFiltradas = pizarras.filter(p => {
    const matchBusqueda = p.titulo.toLowerCase().includes(busqueda.toLowerCase());
    const matchTipo = filtroTipo === 'todos' || p.tipo === filtroTipo;
    return matchBusqueda && matchTipo;
  });

  const getTipoColor = (tipo) => {
    const colores = {
      blanca: 'bg-gray-100 text-gray-600',
      didactica: 'bg-blue-100 text-blue-600',
      colaborativa: 'bg-green-100 text-green-600',
      presentacion: 'bg-purple-100 text-purple-600'
    };
    return colores[tipo] || 'bg-gray-100 text-gray-600';
  };

  const getTipoIcon = (tipo) => {
    const icons = {
      blanca: <PenTool className="w-4 h-4" />,
      didactica: <Grid className="w-4 h-4" />,
      colaborativa: <Users className="w-4 h-4" />,
      presentacion: <LayoutGrid className="w-4 h-4" />
    };
    return icons[tipo] || <PenTool className="w-4 h-4" />;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Pizarras</h2>
          <p className="text-sm text-gray-500">Pizarras interactivas colaborativas</p>
        </div>
        <button
          onClick={onCrearPizarra}
          className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Nueva Pizarra
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
            placeholder="Buscar pizarras..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-gray-300"
          />
        </div>
        <select
          value={filtroTipo}
          onChange={(e) => setFiltroTipo(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-gray-300"
        >
          {tipos.map(t => (
            <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
          ))}
        </select>
        <div className="flex border border-gray-200 rounded-lg overflow-hidden">
          <button
            onClick={() => setVista('grid')}
            className={`p-2 ${vista === 'grid' ? 'bg-gray-900 text-white' : 'bg-white text-gray-400 hover:bg-gray-50'}`}
          >
            <Grid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setVista('list')}
            className={`p-2 ${vista === 'list' ? 'bg-gray-900 text-white' : 'bg-white text-gray-400 hover:bg-gray-50'}`}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Lista de pizarras */}
      {cargando ? (
        <div className="text-center py-12">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-gray-400" />
        </div>
      ) : pizarrasFiltradas.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <PenTool className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No hay pizarras</p>
          <button
            onClick={onCrearPizarra}
            className="mt-3 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
          >
            Crear primera pizarra
          </button>
        </div>
      ) : vista === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {pizarrasFiltradas.map((pizarra) => (
            <div
              key={pizarra.id}
              className="bg-white rounded-lg border border-gray-200 hover:shadow-md transition-all cursor-pointer group"
              onClick={() => onAbrirPizarra(pizarra.id)}
            >
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className={`px-2 py-0.5 text-xs font-medium rounded-full ${getTipoColor(pizarra.tipo)}`}>
                    {tiposLabels[pizarra.tipo] || pizarra.tipo}
                  </div>
                  <div className="flex items-center gap-1">
                    {pizarra.es_publica ? (
                      <Globe className="w-3.5 h-3.5 text-gray-400" />
                    ) : (
                      <Lock className="w-3.5 h-3.5 text-gray-400" />
                    )}
                    {pizarra.colaboradores_activos?.length > 0 && (
                      <span className="flex items-center gap-0.5 text-xs text-gray-400">
                        <Users className="w-3.5 h-3.5" />
                        {pizarra.colaboradores_activos.length}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center">
                    {getTipoIcon(pizarra.tipo)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">{pizarra.titulo}</h3>
                    <p className="text-xs text-gray-400 truncate">{pizarra.descripcion || 'Sin descripción'}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                  <span className="text-xs text-gray-400">
                    {new Date(pizarra.ultima_actividad || pizarra.created_at).toLocaleDateString()}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); copiarEnlace(pizarra.id); }}
                      className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600"
                    >
                      <LinkIcon className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); eliminarPizarra(pizarra.id); }}
                      className="p-1 hover:bg-red-50 rounded text-gray-400 hover:text-red-500"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="divide-y divide-gray-100">
            {pizarrasFiltradas.map((pizarra) => (
              <div
                key={pizarra.id}
                className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50/50 cursor-pointer"
                onClick={() => onAbrirPizarra(pizarra.id)}
              >
                <div className={`p-2 rounded-lg ${getTipoColor(pizarra.tipo)}`}>
                  {getTipoIcon(pizarra.tipo)}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 truncate">{pizarra.titulo}</h3>
                  <p className="text-xs text-gray-400 truncate">{pizarra.descripcion || 'Sin descripción'}</p>
                </div>
                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getTipoColor(pizarra.tipo)}`}>
                  {tiposLabels[pizarra.tipo] || pizarra.tipo}
                </span>
                <span className="text-xs text-gray-400">
                  {new Date(pizarra.ultima_actividad || pizarra.created_at).toLocaleDateString()}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); copiarEnlace(pizarra.id); }}
                    className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600"
                  >
                    <LinkIcon className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); eliminarPizarra(pizarra.id); }}
                    className="p-1 hover:bg-red-50 rounded text-gray-400 hover:text-red-500"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <ChevronRight className="w-4 h-4 text-gray-300" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PanelPizarras;