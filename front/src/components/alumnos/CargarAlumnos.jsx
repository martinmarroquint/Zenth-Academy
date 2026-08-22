// front/src/components/alumnos/CargarAlumnos.jsx
// VERSION NOTION - DISEÑO PROFESIONAL MINIMALISTA
// MOVIDO DE components/examenes/ a components/alumnos/

import React, { useState } from 'react';
import { Users, Trash2, ArrowLeft, Plus, X, Save, Upload, UserPlus } from 'lucide-react';
// ✅ IMPORT CORREGIDO - constantes ahora desde examenes
import { COLOR_PRIMARIO, GRADOS_RECONOCIDOS } from '../examenes/constantes';

const CargarAlumnos = ({ alumnos: alumnosIniciales, onGuardar, onVolver }) => {
  const [alumnos, setAlumnos] = useState(alumnosIniciales || []);
  const [modo, setModo] = useState('lista');
  const [textoLista, setTextoLista] = useState('');
  const [error, setError] = useState('');
  const [nuevoAlumno, setNuevoAlumno] = useState({ grado: '', nombres: '', apellidos: '' });

  const GRADOS = GRADOS_RECONOCIDOS;

  const handleProcesarLista = () => {
    if (!textoLista.trim()) { 
      setError('Ingrese la lista de alumnos'); 
      return; 
    }
    try {
      const lineas = textoLista.trim().split('\n');
      const nuevos = []; 
      const errores = [];
      
      lineas.forEach((linea, i) => {
        const p = linea.trim().split(/\s+/);
        if (p.length < 3) { 
          errores.push(`Linea ${i+1}: incompleta`); 
          return; 
        }
        let grado = '', ini = 0;
        for (let j = 0; j < p.length; j++) {
          if (p[j].includes('.') || GRADOS.includes(p[j].toUpperCase())) { 
            grado += (grado?' ':'') + p[j]; 
            ini = j + 1; 
          } else break;
        }
        const resto = p.slice(ini);
        if (resto.length < 2) { 
          errores.push(`Linea ${i+1}: faltan nombres`); 
          return; 
        }
        const nombres = resto.slice(-2).join(' ');
        const apellidos = resto.slice(0, -2).join(' ');
        if (alumnos.find(a => `${a.apellidos} ${a.nombres}`.toUpperCase() === `${apellidos} ${nombres}`.toUpperCase())) return;
        nuevos.push({ 
          id: Date.now().toString()+i, 
          dni: '', 
          grado, 
          nombres, 
          apellidos, 
          email: '', 
          grupo: '' 
        });
      });
      
      if (!nuevos.length && errores.length) { 
        setError(errores.join(' | ')); 
        return; 
      }
      setAlumnos([...alumnos, ...nuevos]); 
      setTextoLista('');
      setError(errores.length ? `Cargados ${nuevos.length}. ${errores.join(' | ')}` : '');
    } catch { 
      setError('Error al procesar'); 
    }
  };

  const handleAgregarManual = () => {
    if (!nuevoAlumno.nombres.trim() || !nuevoAlumno.apellidos.trim()) { 
      setError('Nombres y Apellidos obligatorios'); 
      return; 
    }
    if (alumnos.find(a => `${a.apellidos} ${a.nombres}`.toUpperCase() === `${nuevoAlumno.apellidos} ${nuevoAlumno.nombres}`.toUpperCase())) { 
      setError('Ya existe'); 
      return; 
    }
    setAlumnos([...alumnos, { 
      ...nuevoAlumno, 
      id: Date.now().toString(), 
      dni: '', 
      email: '', 
      grupo: '' 
    }]);
    setNuevoAlumno({ grado: '', nombres: '', apellidos: '' }); 
    setError('');
  };

  const handleActualizar = (id, campo, valor) => 
    setAlumnos(alumnos.map(a => a.id === id ? { ...a, [campo]: valor } : a));
  
  const handleEliminar = (id) => 
    setAlumnos(alumnos.filter(a => a.id !== id));
  
  const handleEliminarTodos = () => { 
    if (window.confirm('Eliminar todos los alumnos?')) setAlumnos([]); 
  };

  return (
    <div className="min-h-screen bg-[#fbfbfa]">
      <div className="max-w-4xl mx-auto px-6 py-8">
        
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <button 
              onClick={onVolver} 
              className="p-2 hover:bg-white rounded-lg transition-colors border border-transparent hover:border-gray-200"
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              <ArrowLeft className="w-4 h-4 text-gray-500" />
            </button>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Alumnos</h1>
              <p className="text-sm text-gray-400 mt-0.5">
                {alumnos.length} registrados
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {alumnos.length > 0 && (
              <button 
                onClick={handleEliminarTodos} 
                className="px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                Eliminar todos
              </button>
            )}
            <button 
              onClick={() => onGuardar(alumnos)} 
              className="px-3 py-1.5 text-xs font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-1.5"
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              <Save className="w-3.5 h-3.5" /> 
              Guardar
            </button>
          </div>
        </div>

        <div className="flex gap-1 mb-6">
          {[
            { value: 'lista', label: 'Pegar lista', icon: Upload },
            { value: 'manual', label: 'Manual', icon: UserPlus },
          ].map(({ value, label, icon: Icon }) => (
            <button 
              key={value} 
              onClick={() => { setModo(value); setError(''); }}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
                modo === value 
                  ? 'bg-gray-900 text-white' 
                  : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'
              }`}
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              <Icon className="w-3 h-3" />
              {label}
            </button>
          ))}
        </div>

        {modo === 'lista' && (
          <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
            <p className="text-xs text-gray-400 mb-3">
              Formato: APELLIDOS NOMBRES (uno por linea, grado opcional al inicio)
            </p>
            <textarea 
              value={textoLista} 
              onChange={(e) => { setTextoLista(e.target.value); setError(''); }} 
              rows={12}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg font-mono outline-none focus:border-gray-300 focus:ring-0 transition-colors resize-none bg-white"
              placeholder="GARCIA PEREZ JUAN CARLOS..."
            />
            {error && (
              <div className={`mt-3 p-2.5 rounded-lg text-xs ${
                error.includes('Cargados') 
                  ? 'bg-amber-50 text-amber-700 border border-amber-200' 
                  : 'bg-red-50 text-red-600 border border-red-200'
              }`}>
                {error}
              </div>
            )}
            <button 
              onClick={handleProcesarLista} 
              disabled={!textoLista.trim()}
              className="w-full mt-3 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-40 flex items-center justify-center gap-1.5"
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              <Upload className="w-3.5 h-3.5" />
              Procesar lista
            </button>
          </div>
        )}

        {modo === 'manual' && (
          <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
            <div className="grid grid-cols-3 gap-2 mb-3">
              <input 
                type="text" 
                value={nuevoAlumno.grado} 
                onChange={(e) => { setNuevoAlumno({...nuevoAlumno, grado: e.target.value.toUpperCase()}); setError(''); }} 
                placeholder="Grado"
                className="px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-gray-300 focus:ring-0 transition-colors bg-white"
              />
              <input 
                type="text" 
                value={nuevoAlumno.apellidos} 
                onChange={(e) => { setNuevoAlumno({...nuevoAlumno, apellidos: e.target.value.toUpperCase()}); setError(''); }} 
                placeholder="Apellidos"
                className="px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-gray-300 focus:ring-0 transition-colors bg-white"
              />
              <input 
                type="text" 
                value={nuevoAlumno.nombres} 
                onChange={(e) => { setNuevoAlumno({...nuevoAlumno, nombres: e.target.value.toUpperCase()}); setError(''); }} 
                placeholder="Nombres"
                className="px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-gray-300 focus:ring-0 transition-colors bg-white"
              />
            </div>
            {error && (
              <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg mb-2 text-xs text-red-600">
                {error}
              </div>
            )}
            <button 
              onClick={handleAgregarManual}
              className="w-full py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors flex items-center justify-center gap-1.5"
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              <Plus className="w-3.5 h-3.5" /> 
              Agregar alumno
            </button>
          </div>
        )}

        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {alumnos.length > 0 ? (
            <div className="divide-y divide-gray-100 max-h-[450px] overflow-auto">
              <div className="grid grid-cols-12 gap-3 px-4 py-2 bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[560px]">
                <div className="col-span-1 text-center">#</div>
                <div className="col-span-2">Grado</div>
                <div className="col-span-3">Apellidos</div>
                <div className="col-span-3">Nombres</div>
                <div className="col-span-2">DNI</div>
                <div className="col-span-1"></div>
              </div>
              
              {alumnos.map((a, i) => (
                <div 
                  key={a.id} 
                  className="grid grid-cols-12 gap-3 px-4 py-2 items-center hover:bg-gray-50/50 transition-colors group min-w-[560px]"
                >
                  <span className="col-span-1 text-xs text-gray-400 text-center">
                    {i + 1}
                  </span>
                  <input 
                    type="text" 
                    value={a.grado || ''} 
                    onChange={(e) => handleActualizar(a.id, 'grado', e.target.value.toUpperCase())}
                    className="col-span-2 px-2 py-1 text-xs font-medium text-gray-500 border border-transparent hover:border-gray-200 rounded outline-none focus:border-gray-300 focus:bg-white transition-all text-center"
                  />
                  <input 
                    type="text" 
                    value={a.apellidos || ''} 
                    onChange={(e) => handleActualizar(a.id, 'apellidos', e.target.value.toUpperCase())}
                    className="col-span-3 px-2 py-1 text-xs font-medium text-gray-700 border border-transparent hover:border-gray-200 rounded outline-none focus:border-gray-300 focus:bg-white transition-all"
                    placeholder="Apellidos"
                  />
                  <input 
                    type="text" 
                    value={a.nombres || ''} 
                    onChange={(e) => handleActualizar(a.id, 'nombres', e.target.value.toUpperCase())}
                    className="col-span-3 px-2 py-1 text-xs text-gray-600 border border-transparent hover:border-gray-200 rounded outline-none focus:border-gray-300 focus:bg-white transition-all"
                    placeholder="Nombres"
                  />
                  <input 
                    type="text" 
                    value={a.dni || ''} 
                    onChange={(e) => handleActualizar(a.id, 'dni', e.target.value)}
                    className="col-span-2 px-2 py-1 text-xs font-mono text-gray-400 border border-transparent hover:border-gray-200 rounded outline-none focus:border-gray-300 focus:bg-white transition-all text-center"
                    placeholder="DNI"
                  />
                  <div className="col-span-1 flex justify-center">
                    <button 
                      onClick={() => handleEliminar(a.id)}
                      className="p-1 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-all"
                      style={{ WebkitTapHighlightColor: 'transparent' }}
                    >
                      <X className="w-3.5 h-3.5 text-gray-400 hover:text-red-500" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-16 text-center">
              <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-400">No hay alumnos registrados</p>
              <p className="text-xs text-gray-300 mt-1">
                Agrega alumnos usando las opciones superiores
              </p>
            </div>
          )}
        </div>
      </div>

      <style>{`
        * { -webkit-tap-highlight-color: transparent; }
        *:focus { outline: none !important; }
        
        ::-webkit-scrollbar {
          width: 4px;
        }
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        ::-webkit-scrollbar-thumb {
          background: #e5e7eb;
          border-radius: 2px;
        }
      `}</style>
    </div>
  );
};

export default CargarAlumnos;