// front/src/components/alumnos/SelectorAlumnos.jsx
// SELECTOR DE ALUMNOS PARA COMPARTIR - MOVIDO DE components/examenes/
// AHORA UBICADO EN components/alumnos/

import React, { useState } from 'react';
import { Users, CheckCircle2, Search, X, ArrowLeft, UserPlus } from 'lucide-react';

const SelectorAlumnos = ({ alumnos, seleccionados = [], onChange, onConfirmar, onCancelar }) => {
  const [busqueda, setBusqueda] = useState('');
  const [temporal, setTemporal] = useState(seleccionados || []);

  const toggleAlumno = (alumnoId) => {
    setTemporal(prev => 
      prev.includes(alumnoId) 
        ? prev.filter(id => id !== alumnoId)
        : [...prev, alumnoId]
    );
  };

  const handleSeleccionarTodos = () => {
    if (temporal.length === alumnos.length) {
      setTemporal([]);
    } else {
      setTemporal(alumnos.map(a => a.id));
    }
  };

  const limpiarSeleccion = () => {
    setTemporal([]);
  };

  const handleConfirmar = () => {
    onChange?.(temporal);
    onConfirmar?.();
  };

  const alumnosFiltrados = alumnos.filter(a => {
    const nombreCompleto = `${a.nombres || ''} ${a.apellidos || ''}`.toLowerCase();
    return nombreCompleto.includes(busqueda.toLowerCase()) ||
           (a.dni && a.dni.includes(busqueda)) ||
           (a.grado && a.grado.toLowerCase().includes(busqueda.toLowerCase()));
  });

  const todosSeleccionados = temporal.length === alumnos.length && alumnos.length > 0;

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden">
        
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            {onCancelar && (
              <button 
                onClick={onCancelar}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-500" />
              </button>
            )}
            <div>
              <h3 className="font-semibold text-gray-900">Compartir con alumnos</h3>
              <p className="text-xs text-gray-400">{temporal.length} seleccionados</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSeleccionarTodos}
              className="text-xs text-blue-500 hover:text-blue-600 font-medium"
            >
              {todosSeleccionados ? 'Deseleccionar todos' : 'Seleccionar todos'}
            </button>
          </div>
        </div>

        <div className="px-5 py-3 border-b border-gray-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre, DNI o grado..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-gray-300 transition-colors"
              autoFocus
            />
          </div>
        </div>

        <div className="px-5 py-3 max-h-[400px] overflow-y-auto">
          {alumnosFiltrados.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400">
                {busqueda ? 'No se encontraron alumnos' : 'No hay alumnos en este grupo'}
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {alumnosFiltrados.map(alumno => {
                const seleccionado = temporal.includes(alumno.id);
                return (
                  <button
                    key={alumno.id}
                    onClick={() => toggleAlumno(alumno.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left ${
                      seleccionado 
                        ? 'bg-emerald-50 border border-emerald-200' 
                        : 'hover:bg-gray-50 border border-transparent'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                      seleccionado 
                        ? 'border-emerald-500 bg-emerald-500' 
                        : 'border-gray-300'
                    }`}>
                      {seleccionado && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {alumno.apellidos ? `${alumno.apellidos}, ` : ''}{alumno.nombres || alumno.nombre || 'Sin nombre'}
                      </p>
                      <div className="flex items-center gap-2">
                        {alumno.grado && (
                          <span className="text-xs text-gray-400">{alumno.grado}</span>
                        )}
                        {alumno.dni && (
                          <span className="text-xs text-gray-400">DNI: {alumno.dni}</span>
                        )}
                      </div>
                    </div>
                    {alumno.grupo && (
                      <span className="text-[10px] text-gray-300 flex-shrink-0">{alumno.grupo}</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={limpiarSeleccion}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              Limpiar
            </button>
            <span className="text-xs text-gray-300">|</span>
            <span className="text-xs text-gray-400">
              {temporal.length} de {alumnos.length}
            </span>
          </div>
          <div className="flex gap-2">
            {onCancelar && (
              <button
                onClick={onCancelar}
                className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
            )}
            <button
              onClick={handleConfirmar}
              disabled={temporal.length === 0}
              className={`px-5 py-2 text-sm font-medium text-white rounded-lg transition-colors flex items-center gap-2 ${
                temporal.length > 0 
                  ? 'bg-gray-900 hover:bg-gray-800' 
                  : 'bg-gray-300 cursor-not-allowed'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              Compartir ({temporal.length})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SelectorAlumnos;