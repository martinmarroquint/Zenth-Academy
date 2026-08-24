// src/components/examenes/ResultadoExamen.jsx
// VERSION CORREGIDA - FIX FECHAS Y COLORES, ELIMINADOS CONSOLE.LOGS
import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, XCircle, Clock, Award, Eye, Shield, 
  AlertTriangle, ChevronDown, ChevronRight, RotateCcw, ArrowLeft
} from 'lucide-react';
import { COLOR_PRIMARIO, formatearTiempo } from './constantes';
import examenesService from '../../services/examenesService';

const ResultadoExamen = ({ 
  resultado, examen, alumno, onVolver, onReintentar, onDescargarCertificado 
}) => {
  const [mostrarDetalle, setMostrarDetalle] = useState(false);
  const [revision, setRevision] = useState(null);
  const [cargandoRevision, setCargandoRevision] = useState(false);
  const [expandirPregunta, setExpandirPregunta] = useState({});
  const [animacionCompleta, setAnimacionCompleta] = useState(false);
  const [errorRevision, setErrorRevision] = useState(null);

  useEffect(() => { setTimeout(() => setAnimacionCompleta(true), 400); }, []);
  
  // ✅ CORREGIDO: No usar console.logs en producción
  // Eliminados todos los console.log y window.__resultado

  const puntosObtenidos = resultado?.puntosObtenidos || resultado?.puntos_obtenidos || 0;
  const totalPuntos = resultado?.totalPuntos || resultado?.total_puntos || 20;
  const calificacion = resultado?.calificacion || 0;
  
  // ✅ CORREGIDO: Usar ambos formatos de fecha
  const fechaEntrega = resultado?.fechaEntrega || resultado?.entregado_en || resultado?.fecha_entrega || new Date().toISOString();
  const tiempoUsado = resultado?.tiempoUsado || resultado?.tiempo_usado || 0;
  const violaciones = resultado?.violaciones || 0;
  // ✅ CORREGIDO: leer límite de violaciones de la config del examen, no hardcodear 3
  const limiteViolaciones = examen?.configuracion?.limite_violaciones || 3;
  const esTrampa = resultado?.estado === 'TRAMPA' || violaciones >= limiteViolaciones;
  const aprobacion = examen?.puntaje_aprobacion || 60;
  const aprobado = !esTrampa && calificacion >= aprobacion;

  // ✅ CORREGIDO: Color usando puntaje_aprobacion
  const getColor = () => {
    if (esTrampa) return '#DC2626';
    if (calificacion >= aprobacion) return '#059669';
    if (calificacion >= aprobacion * 0.7) return '#F59E0B';
    return '#DC2626';
  };

  const getMensaje = () => {
    if (esTrampa) return 'Examen Anulado';
    if (calificacion >= 90) return 'Excelente trabajo';
    if (calificacion >= 80) return 'Muy buen desempeño';
    if (calificacion >= aprobacion) return 'Aprobado';
    return 'No aprobado';
  };

  const cargarRevision = async () => {
    if (revision) { setMostrarDetalle(!mostrarDetalle); return; }
    
    setCargandoRevision(true);
    setErrorRevision(null);
    
    // Buscar el ID en todas las variantes posibles
    const resultadoId = resultado?.id || resultado?.resultado_id || resultado?.resultadoId;
    const examenId = resultado?.examenId || resultado?.examen_id || examen?.id;
    
    if (!resultadoId || !examenId) {
      setErrorRevision('No se pudo cargar la revisión. Faltan datos de identificación.');
      setCargandoRevision(false);
      setMostrarDetalle(!mostrarDetalle);
      return;
    }
    
    try {
      const data = await examenesService.obtenerRevision(examenId, resultadoId);
      setRevision(data);
    } catch (error) {
      setErrorRevision('Error al cargar la revisión.');
      if (resultado?.detalleRespuestas) {
        setRevision({ detalle: resultado.detalleRespuestas });
      }
    } finally {
      setCargandoRevision(false);
      setMostrarDetalle(!mostrarDetalle);
    }
  };

  const toggleExpandir = (i) => setExpandirPregunta(prev => ({ ...prev, [i]: !prev[i] }));
  const detalle = revision?.detalle || resultado?.detalleRespuestas || [];

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        
        {/* Cabecera */}
        <div className={`text-center mb-6 transition-all duration-700 ${animacionCompleta ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-sm ${
            esTrampa ? 'bg-red-50' : aprobado ? 'bg-emerald-50' : 'bg-red-50'
          }`}>
            {esTrampa ? <AlertTriangle className="w-8 h-8 text-red-500"/> : aprobado ? <Award className="w-8 h-8 text-emerald-500"/> : <XCircle className="w-8 h-8 text-red-500"/>}
          </div>
          <h1 className="text-xl font-bold text-gray-900">{esTrampa ? 'Anulado' : aprobado ? 'Aprobado' : 'No Aprobado'}</h1>
          <p className="text-sm text-gray-400 mt-1">{getMensaje()}</p>
        </div>

        {/* Tarjeta */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          
          {/* Puntaje */}
          <div className="px-6 pt-6 pb-4 text-center">
            {esTrampa ? (
              <div>
                <p className="text-4xl font-bold text-red-500">0/{totalPuntos}</p>
                <p className="text-xs text-red-400 mt-1">Examen anulado por violaciones</p>
              </div>
            ) : (
              <>
                <p className="text-4xl font-bold" style={{ color: getColor() }}>{puntosObtenidos}/{totalPuntos}</p>
                <p className="text-xs text-gray-400 mt-1">Nota mínima: {aprobacion}%</p>
                <div className="mt-3 w-full bg-gray-100 rounded-full h-1.5">
                  <div className="h-1.5 rounded-full transition-all duration-1000" style={{ width: `${Math.min(calificacion, 100)}%`, backgroundColor: getColor() }}/>
                </div>
                <p className="text-[10px] text-gray-400 mt-1">{calificacion.toFixed(1)}%</p>
              </>
            )}
          </div>

          {/* Stats */}
          <div className="px-6 pb-4 flex items-center justify-center gap-6 text-center">
            <div>
              <p className="text-[10px] text-gray-400">Tiempo</p>
              <p className="text-sm font-semibold text-gray-700">{formatearTiempo(tiempoUsado)}</p>
            </div>
            <span className="text-gray-200">|</span>
            <div>
              <p className="text-[10px] text-gray-400">Violaciones</p>
              <p className={`text-sm font-semibold ${violaciones > 0 ? 'text-red-500' : 'text-gray-400'}`}>{violaciones}</p>
            </div>
            <span className="text-gray-200">|</span>
            <div>
              <p className="text-[10px] text-gray-400">Estado</p>
              <p className={`text-sm font-semibold ${esTrampa ? 'text-red-500' : aprobado ? 'text-emerald-500' : 'text-red-500'}`}>{esTrampa ? 'Anulado' : aprobado ? 'Aprobado' : 'No aprobado'}</p>
            </div>
          </div>

          {/* Revision */}
          <div className="border-t border-gray-100">
            <button onClick={cargarRevision} disabled={cargandoRevision}
              className="w-full flex items-center justify-between px-6 py-3 text-xs font-medium text-gray-500 hover:bg-gray-50 transition-all"
              style={{ WebkitTapHighlightColor: 'transparent' }}>
              <span className="flex items-center gap-2"><Eye className="w-3.5 h-3.5"/>{cargandoRevision ? 'Cargando...' : 'Ver revisión detallada'}</span>
              <span className="text-gray-300">{mostrarDetalle ? 'Ocultar' : 'Mostrar'}</span>
            </button>

            {errorRevision && mostrarDetalle && (
              <div className="px-4 pb-2">
                <div className="p-3 bg-red-50 rounded-lg text-[11px] text-red-600">{errorRevision}</div>
              </div>
            )}

            {mostrarDetalle && detalle.length > 0 && (
              <div className="px-4 pb-4 space-y-2 max-h-[400px] overflow-y-auto">
                {detalle.map((pregunta, index) => {
                  const expandida = expandirPregunta[index];
                  const esCorrecta = pregunta.correcta === true;
                  const esEnsayo = pregunta.tipo === 'ensayo';
                  return (
                    <div key={index} className={`rounded-xl border overflow-hidden ${esCorrecta ? 'border-emerald-200' : esEnsayo ? 'border-gray-200' : 'border-red-200'}`}>
                      <button onClick={() => toggleExpandir(index)}
                        className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 transition-colors"
                        style={{ WebkitTapHighlightColor: 'transparent' }}>
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${esCorrecta ? 'bg-emerald-100 text-emerald-600' : esEnsayo ? 'bg-gray-100 text-gray-400' : 'bg-red-100 text-red-500'}`}>
                          {esCorrecta ? <CheckCircle2 className="w-4 h-4"/> : esEnsayo ? <Eye className="w-4 h-4"/> : <XCircle className="w-4 h-4"/>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] text-gray-400">Pregunta {pregunta.numero || index + 1}</p>
                          <p className="text-xs font-medium text-gray-700 truncate">{pregunta.enunciado?.substring(0, 60)}...</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className={`text-xs font-semibold ${esCorrecta ? 'text-emerald-500' : esEnsayo ? 'text-gray-400' : 'text-red-500'}`}>
                            {pregunta.puntos_obtenidos || 0}/{pregunta.puntos || 0} pts
                          </span>
                          {expandida ? <ChevronDown className="w-3.5 h-3.5 text-gray-400"/> : <ChevronRight className="w-3.5 h-3.5 text-gray-400"/>}
                        </div>
                      </button>
                      {expandida && (
                        <div className="px-4 pb-3 border-t border-gray-100">
                          <p className="text-xs text-gray-700 py-2">{pregunta.enunciado}</p>
                          {pregunta.respuesta_alumno !== undefined && (
                            <div className={`text-xs p-2 rounded-lg ${esCorrecta ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                              <span className="font-medium">Tu respuesta:</span> {typeof pregunta.respuesta_alumno === 'object' ? JSON.stringify(pregunta.respuesta_alumno) : String(pregunta.respuesta_alumno || '(sin responder)')}
                              {!esCorrecta && pregunta.respuesta_correcta !== undefined && (
                                <span className="block mt-1 text-emerald-600">Correcta: {typeof pregunta.respuesta_correcta === 'object' ? JSON.stringify(pregunta.respuesta_correcta) : String(pregunta.respuesta_correcta)}</span>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Acciones */}
          <div className="px-6 pb-5 pt-3 flex gap-2">
            <button onClick={onVolver}
              className="flex-1 py-2.5 text-xs font-medium text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all duration-200"
              style={{ WebkitTapHighlightColor: 'transparent' }}>Volver</button>
            {aprobado && onDescargarCertificado && (
              <button onClick={onDescargarCertificado}
                className="flex-1 py-2.5 text-xs font-medium text-white rounded-xl hover:shadow-md transition-all duration-200 flex items-center justify-center gap-1.5"
                style={{ backgroundColor: COLOR_PRIMARIO, WebkitTapHighlightColor: 'transparent' }}>
                <Award className="w-3.5 h-3.5"/> Certificado
              </button>
            )}
            {!aprobado && !esTrampa && onReintentar && (
              <button onClick={onReintentar}
                className="flex-1 py-2.5 text-xs font-medium text-white rounded-xl hover:shadow-md transition-all duration-200 flex items-center justify-center gap-1.5"
                style={{ backgroundColor: COLOR_PRIMARIO, WebkitTapHighlightColor: 'transparent' }}>
                <RotateCcw className="w-3.5 h-3.5"/> Reintentar
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResultadoExamen;