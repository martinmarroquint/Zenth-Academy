// src/components/examenes/PantallaAcceso.jsx
// VERSION COMPLETA - CORREGIDA
import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, Loader2, BookOpen, ArrowRight, 
  AlertTriangle, User, CheckCircle2, ChevronRight, Hash
} from 'lucide-react';
import { COLOR_PRIMARIO } from './constantes';
import examenesService from '../../services/examenesService';
import { storageService } from '../../services/storageService';

const PantallaAcceso = ({ onIngresar, onVolver }) => {
  const [busqueda, setBusqueda] = useState('');
  const [codigoExamen, setCodigoExamen] = useState('');
  const [error, setError] = useState('');
  const [paso, setPaso] = useState(1);
  const [alumnoEncontrado, setAlumnoEncontrado] = useState(null);
  const [alumnosCoincidentes, setAlumnosCoincidentes] = useState([]);
  const [examenEncontrado, setExamenEncontrado] = useState(null);
  const [buscando, setBuscando] = useState(false);
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);
  const busquedaRef = useRef(null);
  const sugerenciasRef = useRef(null);

  useEffect(() => { 
    if (busquedaRef.current) busquedaRef.current.focus(); 
  }, [paso]);

  useEffect(() => {
    const handler = (e) => { 
      if (sugerenciasRef.current && !sugerenciasRef.current.contains(e.target)) {
        setMostrarSugerencias(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleBusquedaChange = async (e) => {
    const valor = e.target.value;
    setBusqueda(valor); 
    setError('');
    
    if (valor.trim().length >= 2) {
      try {
        const coincidencias = await examenesService.buscarAlumnos(valor);
        setAlumnosCoincidentes(coincidencias || []); 
        setMostrarSugerencias((coincidencias || []).length > 0);
      } catch {
        const alumnos = storageService.getAlumnos() || [];
        const termino = valor.toLowerCase().trim();
        const coincidencias = alumnos.filter(a => {
          const nombre = `${a.nombres||''} ${a.apellidos||''}`.toLowerCase();
          const apellido = `${a.apellidos||''} ${a.nombres||''}`.toLowerCase();
          return nombre.includes(termino) || apellido.includes(termino) || (a.dni && a.dni.includes(termino));
        }).slice(0, 8);
        setAlumnosCoincidentes(coincidencias); 
        setMostrarSugerencias(coincidencias.length > 0);
      }
    } else { 
      setAlumnosCoincidentes([]); 
      setMostrarSugerencias(false); 
    }
  };

  const seleccionarAlumno = (alumno) => {
    setAlumnoEncontrado(alumno); 
    setBusqueda(`${alumno.apellidos}, ${alumno.nombres}`); 
    setMostrarSugerencias(false); 
    setPaso(2); 
    setError('');
  };

  const buscarAlumno = async () => {
    if (!busqueda.trim()) { 
      setError('Ingrese un nombre, apellido o DNI'); 
      return; 
    }
    setBuscando(true); 
    setError('');
    
    try {
      const resultados = await examenesService.buscarAlumnos(busqueda);
      if (resultados.length === 0) {
        setError('No se encontraron alumnos');
      } else if (resultados.length === 1) { 
        setAlumnoEncontrado(resultados[0]); 
        setPaso(2); 
      } else { 
        setAlumnosCoincidentes(resultados); 
        setMostrarSugerencias(true); 
      }
    } catch {
      const alumnos = storageService.getAlumnos() || [];
      if (!alumnos.length) { 
        setError('No hay alumnos registrados'); 
        setBuscando(false); 
        return; 
      }
      const termino = busqueda.toLowerCase().trim();
      const resultados = alumnos.filter(a => {
        const nombre = `${a.nombres||''} ${a.apellidos||''}`.toLowerCase();
        const apellido = `${a.apellidos||''} ${a.nombres||''}`.toLowerCase();
        return nombre.includes(termino) || apellido.includes(termino) || (a.dni && a.dni.includes(termino));
      });
      if (resultados.length === 0) {
        setError('No se encontraron alumnos');
      } else if (resultados.length === 1) { 
        setAlumnoEncontrado(resultados[0]); 
        setPaso(2); 
      } else { 
        setAlumnosCoincidentes(resultados); 
        setMostrarSugerencias(true); 
      }
    } finally { 
      setBuscando(false); 
    }
  };

  const verificarExamen = async () => {
    if (!codigoExamen.trim()) { 
      setError('Ingrese el codigo del examen'); 
      return; 
    }
    
    try {
      const examenes = await examenesService.listarPublicados();
      const examen = examenes.find(e => e.codigo?.toUpperCase() === codigoExamen.toUpperCase().trim());
      if (examen) { 
        const completo = await examenesService.obtenerExamen(examen.id); 
        setExamenEncontrado(completo); 
        setPaso(3); 
        setError(''); 
        return; 
      }
    } catch {}
    
    const examenes = storageService.getExamenes() || [];
    const examen = examenes.find(e => 
      e.codigo?.toUpperCase() === codigoExamen.toUpperCase().trim() && 
      e.estado === 'PUBLICADO'
    );
    
    if (!examen) { 
      setError('Codigo no valido o examen no publicado'); 
      return; 
    }
    setExamenEncontrado(examen); 
    setPaso(3); 
    setError('');
  };

  const confirmarIngreso = () => onIngresar(alumnoEncontrado, examenEncontrado);
  
  const handleKeyDown = (e) => { 
    if (e.key === 'Enter') { 
      if (paso === 1) buscarAlumno(); 
      if (paso === 2) verificarExamen(); 
    } 
  };

  return (
    <div className="min-h-screen bg-[#fbfbfa] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-lg bg-white border border-gray-200 flex items-center justify-center mx-auto mb-4">
            <Hash className="w-6 h-6 text-gray-600" />
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-1">Acceso al Examen</h1>
          <p className="text-sm text-gray-400">Ingrese sus datos para continuar</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          
          <div className="flex items-center px-6 py-3 border-b border-gray-100 bg-gray-50/50">
            {[1, 2, 3].map((num) => (
              <div key={num} className="flex items-center flex-1 last:flex-none">
                <div className={`
                  w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-all duration-300
                  ${paso > num 
                    ? 'bg-gray-900 text-white' 
                    : paso === num 
                      ? 'bg-gray-900 text-white' 
                      : 'bg-gray-100 text-gray-400'
                  }
                `}>
                  {paso > num ? <CheckCircle2 className="w-3.5 h-3.5"/> : num}
                </div>
                <span className={`
                  ml-2 text-xs font-medium
                  ${paso >= num ? 'text-gray-700' : 'text-gray-400'}
                `}>
                  {num === 1 ? 'Alumno' : num === 2 ? 'Examen' : 'Inicio'}
                </span>
                {num < 3 && (
                  <div className={`flex-1 mx-2 h-px ${paso > num ? 'bg-gray-900' : 'bg-gray-200'}`}/>
                )}
              </div>
            ))}
          </div>

          <div className="p-6">
            
            {/* PASO 1: Buscar alumno */}
            {paso === 1 && (
              <div className="space-y-4">
                <div className="text-center mb-2">
                  <div className="w-10 h-10 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center mx-auto mb-3">
                    <User className="w-5 h-5 text-gray-500" />
                  </div>
                  <h2 className="text-sm font-medium text-gray-800">Identificacion del Alumno</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Busque por nombre, apellidos o DNI</p>
                </div>
                
                <div className="relative" ref={sugerenciasRef}>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input 
                      ref={busquedaRef} 
                      type="text" 
                      value={busqueda} 
                      onChange={handleBusquedaChange} 
                      onKeyDown={handleKeyDown}
                      onFocus={() => { if (alumnosCoincidentes.length > 0) setMostrarSugerencias(true); }}
                      placeholder="Nombre, apellidos o DNI..."
                      className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-gray-200 rounded-lg outline-none focus:border-gray-300 focus:ring-0 transition-colors"
                      style={{ WebkitTapHighlightColor: 'transparent' }} 
                      autoComplete="off"
                    />
                  </div>
                  
                  {mostrarSugerencias && alumnosCoincidentes.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-56 overflow-y-auto">
                      {alumnosCoincidentes.map((alumno, i) => (
                        <button 
                          key={alumno.id || i} 
                          onClick={() => seleccionarAlumno(alumno)}
                          className="w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors flex items-center gap-3 border-b border-gray-100 last:border-none"
                          style={{ WebkitTapHighlightColor: 'transparent' }}
                        >
                          <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                            <User className="w-3.5 h-3.5 text-gray-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-gray-800 truncate">
                              {alumno.apellidos}, {alumno.nombres}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {alumno.grado && (
                                <span className="text-[10px] text-gray-400">{alumno.grado}</span>
                              )}
                              {alumno.dni && (
                                <span className="text-[10px] text-gray-400">DNI: {alumno.dni}</span>
                              )}
                            </div>
                          </div>
                          <ChevronRight className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {error && (
                  <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                    {error}
                  </div>
                )}

                <button 
                  onClick={buscarAlumno} 
                  disabled={buscando || !busqueda.trim()}
                  className="w-full py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                >
                  {buscando ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Search className="w-4 h-4" />
                      Buscar
                    </>
                  )}
                </button>
              </div>
            )}

            {/* PASO 2: Codigo examen */}
            {paso === 2 && alumnoEncontrado && (
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-3 flex items-center gap-3 border border-gray-200">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-gray-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-800 truncate">
                      {alumnoEncontrado.apellidos}, {alumnoEncontrado.nombres}
                    </p>
                    {alumnoEncontrado.grado && (
                      <p className="text-[10px] text-gray-400">{alumnoEncontrado.grado}</p>
                    )}
                  </div>
                  <button 
                    onClick={() => { setPaso(1); setAlumnoEncontrado(null); }} 
                    className="text-xs text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
                    style={{ WebkitTapHighlightColor: 'transparent' }}
                  >
                    Cambiar
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">
                    Codigo del Examen
                  </label>
                  <input 
                    type="text" 
                    value={codigoExamen} 
                    onChange={(e) => { setCodigoExamen(e.target.value.toUpperCase()); setError(''); }} 
                    onKeyDown={handleKeyDown}
                    placeholder="EXA-20260708-0001"
                    className="w-full px-4 py-2 text-sm font-mono tracking-wider text-center bg-white border border-gray-200 rounded-lg outline-none focus:border-gray-300 focus:ring-0 transition-colors"
                    style={{ WebkitTapHighlightColor: 'transparent' }} 
                    autoComplete="off"
                  />
                </div>

                {error && (
                  <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                    {error}
                  </div>
                )}

                <button 
                  onClick={verificarExamen} 
                  disabled={!codigoExamen.trim()}
                  className="w-full py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                >
                  <BookOpen className="w-4 h-4" />
                  Verificar
                </button>
              </div>
            )}

            {/* PASO 3: Confirmar */}
            {paso === 3 && examenEncontrado && (
              <div className="space-y-4">
                <div className="text-center mb-2">
                  <div className="w-10 h-10 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center mx-auto mb-3">
                    <BookOpen className="w-5 h-5 text-gray-500" />
                  </div>
                  <h2 className="text-sm font-medium text-gray-800">Confirmar Ingreso</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Verifique los datos antes de comenzar</p>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 space-y-3 border border-gray-200">
                  <div className="flex items-center gap-3">
                    <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[10px] text-gray-400 uppercase tracking-wider">Alumno</p>
                      <p className="text-xs font-medium text-gray-800 truncate">
                        {alumnoEncontrado.apellidos}, {alumnoEncontrado.nombres}
                      </p>
                      {alumnoEncontrado.grado && (
                        <p className="text-[10px] text-gray-400">{alumnoEncontrado.grado}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <BookOpen className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[10px] text-gray-400 uppercase tracking-wider">Examen</p>
                      <p className="text-xs font-medium text-gray-800 truncate">
                        {examenEncontrado.titulo}
                      </p>
                      <p className="text-[10px] text-gray-400 font-mono">
                        {examenEncontrado.codigo}
                      </p>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={confirmarIngreso}
                  className="w-full py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                >
                  Comenzar Examen
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {onVolver && (
          <button
            onClick={onVolver}
            className="w-full mt-3 py-2 text-xs font-medium text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            Volver
          </button>
        )}

        <p className="text-center text-[10px] text-gray-300 mt-6">Zenth Academy v1.0</p>
      </div>

      <style>{`
        * { -webkit-tap-highlight-color: transparent; }
        *:focus { outline: none !important; }
      `}</style>
    </div>
  );
};

export default PantallaAcceso;