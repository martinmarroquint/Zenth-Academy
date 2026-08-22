// front/src/components/examenes/HistorialComparticiones.jsx
// NUEVO ARCHIVO - HISTORIAL DE COMPARTICIONES

import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, FolderOpen, Clock, Users, Calendar, 
  Loader2, FileText, ChevronRight, Download 
} from 'lucide-react';
import examenesService from '../../services/examenesService';

const HistorialComparticiones = ({ docenteId, onVolver }) => {
  const [historial, setHistorial] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState('todos'); // todos, activo, cerrado

  useEffect(() => {
    cargarHistorial();
  }, []);

  const cargarHistorial = async () => {
    setCargando(true);
    try {
      const data = await examenesService.listarHistorial(docenteId);
      setHistorial(data || []);
    } catch (error) {
      console.error('Error cargando historial:', error);
      // Fallback a localStorage
      try {
        const localData = localStorage.getItem('historial_comparticiones');
        if (localData) {
          setHistorial(JSON.parse(localData));
        }
      } catch (error) {
        console.warn('Error leyendo historial local:', error);
      }
    } finally {
      setCargando(false);
    }
  };

  const formatFecha = (fecha) => {
    if (!fecha) return 'En curso';
    return new Date(fecha).toLocaleDateString('es-PE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuracion = (segundos) => {
    if (!segundos || segundos === 0) return 'En curso';
    const mins = Math.floor(segundos / 60);
    const segs = segundos % 60;
    if (mins > 60) {
      const horas = Math.floor(mins / 60);
      return `${horas}h ${mins % 60}m`;
    }
    return `${mins}m ${segs}s`;
  };

  const historialFiltrado = historial.filter(item => {
    if (filtro === 'todos') return true;
    return item.estado === filtro.toUpperCase();
  });

  const stats = {
    total: historial.length,
    activos: historial.filter(h => h.estado === 'ACTIVO').length,
    cerrados: historial.filter(h => h.estado === 'CERRADO').length,
    totalRecursos: historial.reduce((sum, h) => sum + (h.cantidad_recursos || 0), 0)
  };

  return (
    <div className="min-h-screen bg-[#fbfbfa]">
      <div className="max-w-4xl mx-auto px-6 py-8">
        
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button 
            onClick={onVolver} 
            className="p-2 hover:bg-white rounded-lg transition-colors border border-transparent hover:border-gray-200"
          >
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </button>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Historial de Comparticiones</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              {stats.total} comparticiones realizadas
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            <p className="text-xs text-gray-400">Total</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
            <p className="text-2xl font-bold text-emerald-600">{stats.activos}</p>
            <p className="text-xs text-gray-400">Activos</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
            <p className="text-2xl font-bold text-gray-400">{stats.cerrados}</p>
            <p className="text-xs text-gray-400">Cerrados</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{stats.totalRecursos}</p>
            <p className="text-xs text-gray-400">Recursos</p>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex gap-2 mb-6">
          {['todos', 'activo', 'cerrado'].map((f) => (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              className={`px-4 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                filtro === f 
                  ? 'bg-gray-900 text-white' 
                  : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Lista */}
        {cargando ? (
          <div className="text-center py-12">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-gray-400" />
          </div>
        ) : historialFiltrado.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <FolderOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No hay comparticiones registradas</p>
            <p className="text-xs text-gray-400 mt-1">Las comparticiones se registran automáticamente</p>
          </div>
        ) : (
          <div className="space-y-3">
            {historialFiltrado.map((item) => (
              <div 
                key={item.id} 
                className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <FolderOpen className="w-5 h-5 text-gray-400" />
                      <h3 className="font-semibold text-gray-800">
                        {item.grupo_nombre || 'Carpeta sin nombre'}
                      </h3>
                      <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${
                        item.estado === 'ACTIVO' 
                          ? 'bg-emerald-50 text-emerald-600' 
                          : 'bg-gray-50 text-gray-500'
                      }`}>
                        {item.estado}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{formatFecha(item.fecha_inicio)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{formatDuracion(item.duracion_segundos)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5" />
                        <span>{item.cantidad_recursos || 0} recursos</span>
                      </div>
                      {item.alumnos_conectados !== undefined && (
                        <div className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5" />
                          <span>{item.alumnos_conectados || 0} alumnos</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default HistorialComparticiones;