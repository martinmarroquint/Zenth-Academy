// src/components/examenes/SalaEspera.jsx
// VERSION MINIMALISTA ELEGANTE
import React, { useState, useEffect, useRef } from 'react';
import { 
  Clock, Users, BookOpen, AlertTriangle, 
  CheckCircle2, Loader2, Wifi, WifiOff, Shield
} from 'lucide-react';
import { COLOR_PRIMARIO } from './constantes';

const SalaEspera = ({ 
  examen, 
  alumno, 
  onIniciarExamen,
  onCancelar,
  tiempoEspera = 10 
}) => {
  const [cuentaRegresiva, setCuentaRegresiva] = useState(tiempoEspera);
  const [iniciando, setIniciando] = useState(false);
  const [conexionEstable, setConexionEstable] = useState(navigator.onLine);
  const intervalRef = useRef(null);

  useEffect(() => {
    const handleOnline = () => setConexionEstable(true);
    const handleOffline = () => setConexionEstable(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => { window.removeEventListener('online', handleOnline); window.removeEventListener('offline', handleOffline); };
  }, []);

  useEffect(() => {
    if (cuentaRegresiva > 0) {
      intervalRef.current = setInterval(() => setCuentaRegresiva(prev => prev - 1), 1000);
    } else {
      iniciarExamen();
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [cuentaRegresiva]);

  const iniciarExamen = async () => {
    setIniciando(true);
    try { await new Promise(resolve => setTimeout(resolve, 1200)); onIniciarExamen(); } 
    catch { setIniciando(false); }
  };

  const handleIniciarAhora = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    iniciarExamen();
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-sm"
            style={{ backgroundColor: `${COLOR_PRIMARIO}10` }}>
            <BookOpen className="w-7 h-7" style={{ color: COLOR_PRIMARIO }}/>
          </div>
          <h1 className="text-lg font-bold text-gray-900">Sala de Espera</h1>
          <p className="text-xs text-gray-400 mt-1">Su examen comenzará en breve</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          
          <div className={`px-4 py-2 flex items-center justify-center gap-1.5 text-[11px] font-medium ${
            conexionEstable ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'
          }`}>
            {conexionEstable ? <Wifi className="w-3 h-3"/> : <WifiOff className="w-3 h-3"/>}
            {conexionEstable ? 'Conexión estable' : 'Sin conexión - Verifique su internet'}
          </div>

          <div className="p-5 space-y-5">
            
            <div>
              <h2 className="text-sm font-bold text-gray-800">{examen?.titulo}</h2>
              {examen?.descripcion && <p className="text-xs text-gray-400 mt-0.5">{examen.descripcion}</p>}
            </div>

            <div className="flex gap-3">
              <div className="flex-1 bg-gray-50 rounded-xl p-3 text-center">
                <Clock className="w-4 h-4 text-gray-400 mx-auto mb-1"/>
                <p className="text-[10px] text-gray-500">Duración</p>
                <p className="text-sm font-bold text-gray-700">{examen?.tiempo_limite} min</p>
              </div>
              <div className="flex-1 bg-gray-50 rounded-xl p-3 text-center">
                <BookOpen className="w-4 h-4 text-gray-400 mx-auto mb-1"/>
                <p className="text-[10px] text-gray-500">Preguntas</p>
                <p className="text-sm font-bold text-gray-700">{examen?.total_preguntas || examen?.preguntas?.length || 0}</p>
              </div>
              <div className="flex-1 bg-gray-50 rounded-xl p-3 text-center">
                <Shield className="w-4 h-4 text-gray-400 mx-auto mb-1"/>
                <p className="text-[10px] text-gray-500">Aprobación</p>
                <p className="text-sm font-bold text-gray-700">{examen?.puntaje_aprobacion || 60}%</p>
              </div>
            </div>

            <div className="bg-emerald-50 rounded-xl p-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                <Users className="w-4 h-4" style={{ color: COLOR_PRIMARIO }}/>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-gray-800 truncate">{alumno?.apellidos}, {alumno?.nombres}</p>
                <p className="text-[10px] text-gray-500">DNI: {alumno?.dni} {alumno?.grupo && `| ${alumno.grupo}`}</p>
              </div>
            </div>

            <div className="text-center">
              <div className="w-20 h-20 rounded-full border-2 flex items-center justify-center mx-auto mb-2"
                style={{ borderColor: COLOR_PRIMARIO }}>
                <span className="text-2xl font-bold" style={{ color: COLOR_PRIMARIO }}>{cuentaRegresiva}</span>
              </div>
              <p className="text-[10px] text-gray-400">segundos para iniciar</p>
            </div>

            <div className="bg-gray-50 rounded-xl p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5"/>
                <div className="text-[11px] text-gray-500 space-y-1.5">
                  <p className="font-semibold text-gray-600">Instrucciones:</p>
                  <ul className="space-y-1">
                    <li className="flex items-start gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-gray-300 mt-1.5 flex-shrink-0"></span>
                      No cambie de pestaña o ventana durante el examen
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-gray-300 mt-1.5 flex-shrink-0"></span>
                      No use atajos de teclado para copiar/pegar
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-gray-300 mt-1.5 flex-shrink-0"></span>
                      El temporizador no se puede pausar
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-red-300 mt-1.5 flex-shrink-0"></span>
                      3 violaciones de seguridad anularán el examen
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={onCancelar} disabled={iniciando}
                className="flex-1 py-2.5 text-xs font-medium text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all duration-200 disabled:opacity-50"
                style={{ WebkitTapHighlightColor: 'transparent' }}>
                Cancelar
              </button>
              <button onClick={handleIniciarAhora} disabled={iniciando || !conexionEstable}
                className="flex-[2] py-2.5 text-xs font-medium text-white rounded-xl hover:shadow-md transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-1.5"
                style={{ backgroundColor: COLOR_PRIMARIO, WebkitTapHighlightColor: 'transparent' }}>
                {iniciando ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <CheckCircle2 className="w-3.5 h-3.5"/>}
                {iniciando ? 'Iniciando...' : 'Iniciar Ahora'}
              </button>
            </div>
          </div>
        </div>

        <p className="text-center text-[10px] text-gray-300 mt-4">
          Sistema de Evaluaciones v1.0
        </p>
      </div>
    </div>
  );
};

export default SalaEspera;