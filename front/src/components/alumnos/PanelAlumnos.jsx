// front/src/components/alumnos/PanelAlumnos.jsx
// PANEL DE GESTIÓN DE ALUMNOS - INDEPENDIENTE

import React, { useState, useEffect } from 'react';
import { 
  Users, Search, Upload, Trash2, UserPlus, Loader2,
  X, AlertCircle, Download, Filter, Plus, ChevronLeft
} from 'lucide-react';
import alumnosService from '../../services/alumnosService';
import CargarAlumnos from './CargarAlumnos';
import SelectorAlumnos from './SelectorAlumnos';

const PanelAlumnos = ({ onVolver, onSeleccionar, seleccionInicial = [] }) => {
  const [alumnos, setAlumnos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [vista, setVista] = useState('lista');
  const [seleccionados, setSeleccionados] = useState(seleccionInicial || []);
  const [modoSeleccion, setModoSeleccion] = useState(!!onSeleccionar);

  useEffect(() => {
    cargarAlumnos();
  }, []);

  const cargarAlumnos = async () => {
    setCargando(true);
    setError('');
    try {
      const data = await alumnosService.listar();
      setAlumnos(data || []);
    } catch (err) {
      setError(err.message || 'Error cargando alumnos');
      try {
        const local = localStorage.getItem('alumnos');
        if (local) setAlumnos(JSON.parse(local));
      } catch (error) {
        console.warn('Error leyendo alumnos locales:', error);
      }
    } finally {
      setCargando(false);
    }
  };

  const handleGuardarAlumnos = async (nuevosAlumnos) => {
    try {
      await alumnosService.guardarMasivo(nuevosAlumnos);
      await cargarAlumnos();
    } catch (error) {
      console.warn('Guardando alumnos en modo offline:', error);
      localStorage.setItem('alumnos', JSON.stringify(nuevosAlumnos));
      setAlumnos(nuevosAlumnos);
    }
    setVista('lista');
  };

  const handleEliminarAlumno = async (id) => {
    if (!window.confirm('¿Eliminar este alumno?')) return;
    try {
      await alumnosService.eliminar(id);
      await cargarAlumnos();
    } catch (error) {
      console.warn('Eliminando alumno en modo offline:', error);
      setAlumnos(alumnos.filter(a => a.id !== id));
      localStorage.setItem('alumnos', JSON.stringify(alumnos.filter(a => a.id !== id)));
    }
  };

  const handleEliminarSeleccionados = async () => {
    if (seleccionados.length === 0) return;
    if (!window.confirm(`¿Eliminar ${seleccionados.length} alumnos?`)) return;
    
    for (const id of seleccionados) {
      try {
        await alumnosService.eliminar(id);
      } catch (error) {
        console.warn('Error eliminando alumno:', error);
      }
    }
    setSeleccionados([]);
    setModoSeleccion(false);
    await cargarAlumnos();
  };

  const handleSeleccionar = () => {
    if (onSeleccionar) {
      const seleccionadosData = alumnos.filter(a => seleccionados.includes(a.id));
      onSeleccionar(seleccionadosData);
    }
  };

  const alumnosFiltrados = alumnos.filter(a => {
    const nombre = `${a.nombres || ''} ${a.apellidos || ''}`.toLowerCase();
    const busq = busqueda.toLowerCase();
    return nombre.includes(busq) || 
           (a.dni && a.dni.includes(busq)) ||
           (a.grado && a.grado.toLowerCase().includes(busq));
  });

  if (vista === 'cargar') {
    return (
      <CargarAlumnos
        alumnos={alumnos}
        onGuardar={handleGuardarAlumnos}
        onVolver={() => setVista('lista')}
      />
    );
  }

  if (vista === 'selector') {
    return (
      <SelectorAlumnos
        alumnos={alumnos}
        seleccionados={seleccionados}
        onChange={setSeleccionados}
        onConfirmar={() => {
          if (onSeleccionar) {
            const seleccionadosData = alumnos.filter(a => seleccionados.includes(a.id));
            onSeleccionar(seleccionadosData);
          }
          setVista('lista');
        }}
        onCancelar={() => setVista('lista')}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#fbfbfa]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            {onVolver && (
              <button 
                onClick={onVolver}
                className="p-2 hover:bg-white rounded-lg transition-colors border border-transparent hover:border-gray-200"
              >
                <ChevronLeft className="w-5 h-5 text-gray-500" />
              </button>
            )}
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Alumnos</h1>
              <p className="text-sm text-gray-400 mt-0.5">
                {alumnos.length} registrados
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {modoSeleccion && (
              <>
                <button
                  onClick={handleEliminarSeleccionados}
                  className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5 inline mr-1" />
                  Eliminar ({seleccionados.length})
                </button>
                <button
                  onClick={() => {
                    setModoSeleccion(false);
                    setSeleccionados([]);
                  }}
                  className="px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-3.5 h-3.5 inline mr-1" />
                  Cancelar
                </button>
              </>
            )}
            {onSeleccionar && !modoSeleccion && (
              <button
                onClick={() => setModoSeleccion(true)}
                className="px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors flex items-center gap-1.5"
              >
                <UserPlus className="w-3.5 h-3.5" />
                Seleccionar
              </button>
            )}
            <button
              onClick={() => setVista('cargar')}
              className="px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-1.5"
            >
              <Upload className="w-3.5 h-3.5" />
              Cargar
            </button>
          </div>
        </div>

        {/* Buscador */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre, apellido, DNI o grado..."
            className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-gray-200 rounded-lg outline-none focus:border-gray-300 transition-colors"
          />
        </div>

        {/* Lista */}
        {cargando ? (
          <div className="text-center py-12">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-gray-400" />
          </div>
        ) : error ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
            <p className="text-sm text-red-500">{error}</p>
            <button 
              onClick={cargarAlumnos}
              className="mt-3 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm"
            >
              Reintentar
            </button>
          </div>
        ) : alumnosFiltrados.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">
              {busqueda ? 'No se encontraron alumnos' : 'No hay alumnos registrados'}
            </p>
            {!busqueda && (
              <button 
                onClick={() => setVista('cargar')}
                className="mt-3 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm flex items-center gap-2 mx-auto"
              >
                <Upload className="w-4 h-4" />
                Cargar alumnos
              </button>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="divide-y divide-gray-100 max-h-[500px] overflow-auto">
              {/* Header */}
              <div className="grid grid-cols-12 gap-3 px-4 py-2.5 bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wider sticky top-0 z-10 min-w-[640px]">
                {modoSeleccion && <div className="col-span-1 text-center">✓</div>}
                <div className={modoSeleccion ? 'col-span-2' : 'col-span-3'}>Apellidos</div>
                <div className={modoSeleccion ? 'col-span-2' : 'col-span-3'}>Nombres</div>
                <div className="col-span-2">DNI</div>
                <div className="col-span-2">Grado</div>
                <div className="col-span-1">Email</div>
                {!modoSeleccion && <div className="col-span-1 text-right">Acciones</div>}
              </div>

              {alumnosFiltrados.map((alumno) => {
                const seleccionado = seleccionados.includes(alumno.id);
                return (
                  <div 
                    key={alumno.id} 
                    className={`grid grid-cols-12 gap-3 px-4 py-2.5 items-center hover:bg-gray-50/50 transition-colors min-w-[640px] ${seleccionado ? 'bg-emerald-50' : ''}`}
                  >
                    {modoSeleccion && (
                      <div className="col-span-1 flex justify-center">
                        <input
                          type="checkbox"
                          checked={seleccionado}
                          onChange={() => {
                            if (seleccionado) {
                              setSeleccionados(seleccionados.filter(id => id !== alumno.id));
                            } else {
                              setSeleccionados([...seleccionados, alumno.id]);
                            }
                          }}
                          className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-0"
                        />
                      </div>
                    )}
                    <div className={modoSeleccion ? 'col-span-2' : 'col-span-3'}>
                      <span className="text-sm text-gray-700">{alumno.apellidos || '-'}</span>
                    </div>
                    <div className={modoSeleccion ? 'col-span-2' : 'col-span-3'}>
                      <span className="text-sm text-gray-700">{alumno.nombres || '-'}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-sm font-mono text-gray-500">{alumno.dni || '-'}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-xs text-gray-500">{alumno.grado || '-'}</span>
                    </div>
                    <div className="col-span-1 truncate">
                      <span className="text-xs text-gray-400">{alumno.email || '-'}</span>
                    </div>
                    {!modoSeleccion && (
                      <div className="col-span-1 flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleEliminarAlumno(alumno.id)}
                          className="p-1 hover:bg-red-50 rounded text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between mt-4 text-xs text-gray-400">
          <span>{alumnosFiltrados.length} de {alumnos.length} alumnos</span>
          {modoSeleccion && (
            <div className="flex items-center gap-3">
              <span>{seleccionados.length} seleccionados</span>
              {onSeleccionar && seleccionados.length > 0 && (
                <button
                  onClick={handleSeleccionar}
                  className="px-3 py-1 text-xs font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors"
                >
                  Confirmar selección
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PanelAlumnos;