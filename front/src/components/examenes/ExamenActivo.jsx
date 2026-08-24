// src/components/examenes/ExamenActivo.jsx
// VERSION CORREGIDA - CONFIG SEGURIDAD Y TEMPORIZADOR
import React, { useState, useEffect, useCallback } from 'react';
import { 
  AlertTriangle, Clock, Flag, ChevronLeft, ChevronRight, 
  Send, Shuffle, CheckCircle2, XCircle, GripVertical,
  Star, BarChart3
} from 'lucide-react';
import Temporizador from './Temporizador';
import NavegadorPreguntas from './NavegadorPreguntas';
import ModalConfirmarEntrega from './ModalConfirmarEntrega';
import ModalTrampa from './ModalTrampa';
import useTemporizador from '../../hooks/useTemporizador';
import useExamenSeguridad from '../../hooks/useExamenSeguridad';
import examenesService from '../../services/examenesService';
import { COLOR_PRIMARIO } from './constantes';

const ExamenActivo = ({ examen, alumno, onFinalizar, onAbandonar }) => {
  const [preguntasExamen, setPreguntasExamen] = useState([]);
  const [mapeoOpciones, setMapeoOpciones] = useState({});
  const [preguntaActual, setPreguntaActual] = useState(0);
  const [respuestas, setRespuestas] = useState({});
  const [preguntasMarcadas, setPreguntasMarcadas] = useState(new Set());
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);
  const [mostrarModalTrampa, setMostrarModalTrampa] = useState(false);
  const [entregado, setEntregado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [inicializando, setInicializando] = useState(true);
  const [alertaActiva, setAlertaActiva] = useState(null);

  const configExamen = examen?.configuracion || {};

  // ✅ USAR CONFIGURACION REAL
  const LIMITE_VIOLACIONES = configExamen.limite_violaciones || 3;
  const MODO_ESTRICTO = configExamen.modoEstricto !== undefined ? configExamen.modoEstricto : true;
  const UMBRAL_TRAMPA = configExamen.umbralTrampa || 3;

  // =============================================
  // INICIALIZACION
  // =============================================
  useEffect(() => {
    if (examen?.preguntas && examen.preguntas.length > 0) {
      let preguntas = [...examen.preguntas];
      
      preguntas = preguntas.map((p, idx) => ({ 
        ...p, 
        _indiceOriginal: idx,
        _ordenOriginal: p.orden ?? idx,
        _columnaBOriginal: [...(p.columna_b || [])],
        _elementosOriginales: [...(p.elementos || [])]
      }));
      
      if (configExamen.aleatorizarPreguntas) { 
        preguntas = shuffleArray(preguntas); 
      }
      
      if (configExamen.preguntasPorExamen > 0 && configExamen.preguntasPorExamen < preguntas.length) {
        preguntas = preguntas.slice(0, configExamen.preguntasPorExamen);
      }
      
      preguntas = preguntas.map(p => {
        if (p.tipo === 'opcion_multiple' && configExamen.aleatorizarOpciones) {
          const opciones = [
            { letra: 'A', original: 0, texto: p.opcion_a },
            { letra: 'B', original: 1, texto: p.opcion_b },
            { letra: 'C', original: 2, texto: p.opcion_c },
            { letra: 'D', original: 3, texto: p.opcion_d }
          ].filter(o => o.texto && o.texto.trim());
          
          if (opciones.length > 0) {
            const aleatorias = shuffleArray(opciones);
            setMapeoOpciones(prev => ({ 
              ...prev, 
              [p.id]: { 
                opciones: aleatorias, 
                respuestaCorrectaNueva: aleatorias.findIndex(o => o.original === p.respuesta_correcta) 
              } 
            }));
            return { 
              ...p, 
              opcion_a: aleatorias[0]?.texto || '', 
              opcion_b: aleatorias[1]?.texto || '', 
              opcion_c: aleatorias[2]?.texto || '', 
              opcion_d: aleatorias[3]?.texto || '' 
            };
          }
        }
        if (p.tipo === 'ordenamiento') {
          return { ...p, elementos: shuffleArray([...(p.elementos || [])]) };
        }
        if (p.tipo === 'relacionar') {
          return { ...p, columna_b: shuffleArray([...(p.columna_b || [])]) };
        }
        return p;
      });
      
      setPreguntasExamen(preguntas);
      setInicializando(false);
    } else {
      setInicializando(false);
    }
  }, [examen]);

  const shuffleArray = (array) => {
    const a = [...array];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  const getClaveReal = useCallback(() => {
    const pregunta = preguntasExamen[preguntaActual];
    return String(pregunta?._indiceOriginal ?? pregunta?.orden ?? preguntaActual);
  }, [preguntaActual, preguntasExamen]);

  // =============================================
  // HOOKS CON CONFIGURACION REAL
  // =============================================
  const manejarTiempoAgotado = useCallback(() => { 
    if (!entregado) finalizarExamen(true); 
  }, [entregado]);

  const manejarViolacionMaxima = useCallback(() => { 
    if (!entregado) setMostrarModalTrampa(true); 
  }, [entregado]);

  const temporizador = useTemporizador({
    tiempoTotalSegundos: (examen?.tiempo_limite || 60) * 60,
    onTiempoAgotado: manejarTiempoAgotado,
    alertas: [300, 600, 900],
    onAlerta: setAlertaActiva
  });

  // ✅ CORREGIDO: primer parámetro es examenActivo (boolean), no MODO_ESTRICTO
  const examenActivo = !entregado && preguntasExamen.length > 0;
  const seguridad = useExamenSeguridad(examenActivo, { 
    limiteViolaciones: LIMITE_VIOLACIONES, 
    modoEstricto: MODO_ESTRICTO
  });

  useEffect(() => { seguridad.setOnViolacionMaxima(manejarViolacionMaxima); }, [manejarViolacionMaxima]);

  useEffect(() => { 
    if (!entregado && preguntasExamen.length > 0) { 
      const timer = setTimeout(() => { try { temporizador.iniciar(); } catch (e) {} }, 300);
      return () => clearTimeout(timer);
    } 
    return () => { try { temporizador.detener(); } catch (e) {} }; 
  }, [preguntasExamen.length]);

  const totalPreguntas = preguntasExamen.length;
  const preguntaActualData = preguntasExamen[preguntaActual];
  const claveReal = getClaveReal();

  // =============================================
  // MANEJADORES DE RESPUESTAS
  // =============================================
  const guardarRespuesta = (valor) => { 
    if (entregado) return; 
    setRespuestas(prev => ({ ...prev, [claveReal]: valor })); 
  };

  const guardarRelacion = (indiceColumnaA, indiceColumnaB) => { 
    const a = respuestas[claveReal] || {}; 
    setRespuestas(prev => ({ ...prev, [claveReal]: { ...a, [indiceColumnaA]: indiceColumnaB } })); 
  };

  const guardarVF = (indiceAfirmacion, valor) => { 
    const a = respuestas[claveReal] || []; 
    const n = [...a]; n[indiceAfirmacion] = valor; 
    setRespuestas(prev => ({ ...prev, [claveReal]: n })); 
  };

  const irPregunta = (i) => { 
    if (i >= 0 && i < totalPreguntas && !configExamen.mostrarUnaSolaPregunta) setPreguntaActual(i); 
  };

  const siguientePregunta = () => { 
    if (preguntaActual < totalPreguntas - 1) setPreguntaActual(prev => prev + 1); 
  };

  const anteriorPregunta = () => { 
    if (preguntaActual > 0 && !configExamen.mostrarUnaSolaPregunta) setPreguntaActual(prev => prev - 1); 
  };

  const toggleMarcarRevision = (i) => { 
    setPreguntasMarcadas(prev => { 
      const n = new Set(prev); 
      n.has(i) ? n.delete(i) : n.add(i); 
      return n; 
    }); 
  };

  // =============================================
  // getPreguntasSinResponder CORREGIDO
  // =============================================
  const getPreguntasSinResponder = () => {
    if (!preguntasExamen || preguntasExamen.length === 0) {
      return totalPreguntas - Object.keys(respuestas).length;
    }
    let sinResponder = 0;
    preguntasExamen.forEach((pregunta, index) => {
      const clave = String(pregunta._indiceOriginal ?? pregunta.orden ?? index);
      const resp = respuestas[clave];
      let vacia = false;
      if (resp === undefined || resp === null) vacia = true;
      else if (typeof resp === 'string' && resp.trim() === '') vacia = true;
      else if (Array.isArray(resp) && resp.length === 0) vacia = true;
      else if (Array.isArray(resp) && resp.every(r => r === undefined || r === null || r === '')) vacia = true;
      else if (typeof resp === 'object' && !Array.isArray(resp) && resp !== null && Object.keys(resp).length === 0) vacia = true;
      if (vacia) sinResponder++;
    });
    return sinResponder;
  };

  // =============================================
  // FINALIZAR EXAMEN
  // =============================================
  const finalizarExamen = useCallback(async (porTiempo = false) => {
    if (entregado || enviando) return;
    setEntregado(true);
    setEnviando(true);
    
    try { temporizador.detener(); } catch (e) {}

    // DES-ALEATORIZAR RESPUESTAS
    const respuestasFinales = {};

    Object.entries(respuestas).forEach(([key, value]) => {
      const idx = parseInt(key);
      const pregunta = preguntasExamen.find(p => p._indiceOriginal === idx);
      
      if (!pregunta) { respuestasFinales[key] = value; return; }
      
      if (pregunta.tipo === 'opcion_multiple' && configExamen.aleatorizarOpciones) {
        const mapeo = mapeoOpciones[pregunta.id];
        if (mapeo && mapeo.opciones && typeof value === 'number' && value >= 0 && value < mapeo.opciones.length) {
          respuestasFinales[key] = mapeo.opciones[value].original;
        } else {
          respuestasFinales[key] = value;
        }
      }
      else if (pregunta.tipo === 'relacionar' && typeof value === 'object' && value !== null) {
        const colBVisual = pregunta.columna_b || [];
        const colBOriginal = pregunta._columnaBOriginal || [];
        const respConvertida = {};
        Object.entries(value).forEach(([k, v]) => {
          if (typeof v === 'number' && v >= 0 && v < colBVisual.length) {
            const textoElegido = colBVisual[v];
            const indiceOriginal = colBOriginal.findIndex(b => b === textoElegido);
            respConvertida[k] = indiceOriginal >= 0 ? indiceOriginal : v;
          } else {
            respConvertida[k] = v;
          }
        });
        respuestasFinales[key] = respConvertida;
      }
      else if (pregunta.tipo === 'ordenamiento' && Array.isArray(value)) {
        const elementosVisuales = pregunta.elementos || [];
        const elementosOriginales = pregunta._elementosOriginales || [];
        const respConvertida = new Array(elementosOriginales.length).fill(0);
        elementosVisuales.forEach((elemVisual, idxVisual) => {
          const idxOriginal = elementosOriginales.findIndex(e => e === elemVisual);
          if (idxOriginal >= 0 && idxOriginal < value.length) {
            respConvertida[idxOriginal] = value[idxVisual] || 0;
          }
        });
        respuestasFinales[key] = respConvertida;
      }
      else {
        respuestasFinales[key] = value;
      }
    });

    const respuestasConClavesString = {};
    Object.entries(respuestasFinales).forEach(([key, value]) => {
      respuestasConClavesString[String(key)] = value;
    });

    // ✅ USAR CONFIGURACION REAL
    const violacionesCount = seguridad.violaciones || 0;
    const esTrampa = violacionesCount >= LIMITE_VIOLACIONES;

    const datosEnvio = {
      examen_id: examen.id,
      alumno_id: alumno.id,
      alumno_nombre: (alumno.apellidos || '') + ', ' + (alumno.nombres || ''),
      alumno_grado: alumno.grado || '',
      alumno_dni: alumno.dni || '',
      respuestas: respuestasConClavesString,
      tiempo_usado: temporizador.getTiempoUsado(),
      tiempo_restante: temporizador.tiempoRestante,
      violaciones: violacionesCount,
      eventos_seguridad: seguridad.eventosSeguridad,
      entregado_por_tiempo: porTiempo,
      estado: esTrampa ? 'TRAMPA' : 'COMPLETADO',
      calificacion: 0, correctas: 0, total_preguntas: 0,
      puntos_obtenidos: 0, total_puntos: 0
    };

    let resultadoBackend = null;
    try {
      resultadoBackend = await examenesService.guardarResultado(datosEnvio);
    } catch (e) {
      try {
        const pendientes = JSON.parse(localStorage.getItem('resultados_pendientes') || '[]');
        pendientes.push(datosEnvio);
        localStorage.setItem('resultados_pendientes', JSON.stringify(pendientes));
      } catch (e2) {}
    }

    const resultadoFinal = {
      ...datosEnvio,
      examenId: examen.id,
      examen_id: examen.id,
      alumnoId: alumno.id,
      totalPreguntas: resultadoBackend?.total_preguntas || preguntasExamen.length,
      puntosObtenidos: resultadoBackend?.puntos_obtenidos ?? 0,
      totalPuntos: resultadoBackend?.total_puntos ?? 0,
      calificacion: resultadoBackend?.calificacion ?? 0,
      correctas: resultadoBackend?.correctas ?? 0,
      tiempoUsado: temporizador.getTiempoUsado(),
      tiempoRestante: temporizador.tiempoRestante,
      violaciones: violacionesCount,
      eventosSeguridad: seguridad.eventosSeguridad,
      entregadoPorTiempo: porTiempo,
      fechaEntrega: new Date().toISOString(),
      preguntasMarcadas: Array.from(preguntasMarcadas),
      estado: resultadoBackend?.estado || (esTrampa ? 'TRAMPA' : 'COMPLETADO'),
      id: resultadoBackend?.id,
      resultado_id: resultadoBackend?.id
    };

    setEnviando(false);
    onFinalizar(resultadoFinal);
  }, [examen, alumno, respuestas, preguntasMarcadas, preguntasExamen, mapeoOpciones, configExamen, temporizador, seguridad, onFinalizar, entregado, enviando, LIMITE_VIOLACIONES]);

  // =============================================
  // LOADER
  // =============================================
  if (inicializando) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-gray-200 border-t-emerald-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-sm text-gray-500">Preparando examen...</p>
        </div>
      </div>
    );
  }

  if (preguntasExamen.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center bg-white rounded-2xl shadow-sm p-8 max-w-md">
          <p className="text-gray-500 mb-4">No se pudieron cargar las preguntas del examen.</p>
          <button onClick={onAbandonar} className="px-6 py-2 bg-gray-200 rounded-xl text-sm">Volver</button>
        </div>
      </div>
    );
  }

  if (!preguntaActualData) return null;

  // =============================================
  // RENDER
  // =============================================
  return (
    <div className="min-h-screen bg-gray-50">
      {enviando && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-8 text-center shadow-xl">
            <div className="w-12 h-12 border-4 border-gray-200 border-t-emerald-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-sm text-gray-600">Enviando examen...</p>
            <p className="text-xs text-gray-400 mt-1">No cierre la ventana</p>
          </div>
        </div>
      )}

      <header className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6">
          <div className="flex items-center justify-between h-12 sm:h-16">
            <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
              <h1 className="text-xs sm:text-base font-bold text-gray-900 truncate">{examen?.titulo}</h1>
              {!configExamen.mostrarUnaSolaPregunta && (
                <span className="text-xs text-gray-500">{preguntaActual + 1}/{totalPreguntas}</span>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Temporizador 
                tiempoFormateado={temporizador.tiempoFormateado} 
                progreso={temporizador.progreso} 
                violaciones={seguridad.violaciones} 
                maxViolaciones={LIMITE_VIOLACIONES}
                alertaActiva={alertaActiva}
              />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 py-3 sm:py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 lg:gap-6">
          <div className="lg:col-span-3">
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-200 p-3 sm:p-6">
              <div className="flex items-center justify-between mb-3 sm:mb-6">
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm font-bold text-gray-400">Pregunta {preguntaActual + 1}</span>
                  <button onClick={() => toggleMarcarRevision(preguntaActual)} className={`p-2 rounded-lg min-w-[44px] min-h-[44px] flex items-center justify-center ${preguntasMarcadas.has(preguntaActual) ? 'bg-amber-100 text-amber-700' : 'text-gray-400 hover:bg-gray-100'}`}>
                    <Flag className="w-4 h-4" />
                  </button>
                </div>
                <span className="text-xs text-gray-500">{preguntaActualData.puntos || 1} pts</span>
              </div>
              <div className="mb-4 sm:mb-6">
                <p className="text-sm text-gray-800 leading-relaxed">{preguntaActualData.enunciado}</p>
              </div>

              <div className="space-y-3">
                {/* OPCION MULTIPLE */}
                {preguntaActualData.tipo === 'opcion_multiple' && (
                  <div className="space-y-2">
                    {['a','b','c','d','e'].map((l, i) => {
                      const t = preguntaActualData['opcion_' + l];
                      if (!t || !t.trim()) return null;
                      const sel = respuestas[claveReal] === i;
                      return (
                        <button key={l} onClick={() => guardarRespuesta(i)} disabled={entregado}
                          className={'w-full text-left p-3 sm:p-4 rounded-xl border-2 transition-all ' + (sel ? 'border-emerald-400 bg-emerald-50' : 'border-gray-200 hover:border-gray-300')}>
                          <div className="flex items-center gap-2 sm:gap-3">
                            <div className={'w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-xs sm:text-sm font-bold ' + (sel ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-500')}>{l.toUpperCase()}</div>
                            <span className="text-xs sm:text-sm">{t}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* V/F */}
                {preguntaActualData.tipo === 'verdadero_falso' && (
                  <div className="border rounded-xl overflow-x-auto">
                    <div className="bg-gray-100 flex items-center p-2 sm:p-3 text-xs font-bold text-gray-600 min-w-[280px]">
                      <span className="w-6 sm:w-8">#</span><span className="flex-1">AFIRMACION</span><span className="w-28 sm:w-32 text-center">RESPUESTA</span>
                    </div>
                    <div className="divide-y">
                      {(preguntaActualData.afirmaciones||[]).map((af,i)=>{
                        const ra=(respuestas[claveReal]||[])[i];
                        return(
                          <div key={af.id||i} className="flex items-center gap-1.5 sm:gap-2 p-2 sm:p-3 min-w-[280px]">
                            <span className="w-6 sm:w-8 text-center text-xs text-gray-400">{i+1}</span>
                            <span className="flex-1 text-xs sm:text-sm text-gray-800 truncate">{af.texto}</span>
                            <div className="w-28 sm:w-32 flex justify-center gap-0.5 sm:gap-1">
                              <button onClick={()=>guardarVF(i,true)} disabled={entregado} className={'w-12 sm:w-14 py-3 text-xs font-bold rounded-l-lg border transition-all min-h-[44px] '+(ra===true?'bg-emerald-500 text-white border-emerald-500':'bg-white text-gray-500 border-gray-300')}>V</button>
                              <button onClick={()=>guardarVF(i,false)} disabled={entregado} className={'w-12 sm:w-14 py-3 text-xs font-bold rounded-r-lg border transition-all min-h-[44px] '+(ra===false?'bg-red-500 text-white border-red-500':'bg-white text-gray-500 border-gray-300')}>F</button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* RELACIONAR */}
                {preguntaActualData.tipo === 'relacionar' && (
                  <div>
                    <p className="text-xs text-gray-500 mb-3">Seleccione la opcion correcta para cada elemento:</p>
                    <div className="space-y-4">
                      {(preguntaActualData.columna_a || []).filter(a => a && a.trim()).map((itemA, i) => {
                        const ra = (respuestas[claveReal] || {})[i];
                        const opciones = (preguntaActualData.columna_b || []).filter(b => b && b.trim());
                        return (
                          <div key={i} className="bg-white border-2 border-gray-200 rounded-xl p-3 sm:p-4">
                            <div className="flex items-start gap-2 mb-3">
                              <span className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-xs font-bold text-emerald-700 flex-shrink-0 mt-0.5">{i + 1}</span>
                              <p className="text-sm text-gray-800 font-medium">{itemA}</p>
                            </div>
                            <div className="space-y-1.5 pl-8">
                              {opciones.map((itemB, j) => (
                                <button key={j} onClick={() => guardarRelacion(i, j)} disabled={entregado}
                                  className={`w-full text-left px-3 py-3 rounded-lg border-2 text-sm transition-all min-h-[44px] ${ra === j ? 'border-emerald-500 bg-emerald-50 text-emerald-700 font-medium' : 'border-gray-200 text-gray-600 hover:border-gray-300 active:bg-gray-50'}`}>
                                  <span className="font-bold mr-2">{String.fromCharCode(65 + j)}.</span>
                                  <span className="text-xs sm:text-sm">{itemB}</span>
                                </button>
                              ))}
                            </div>
                            {ra === undefined && <p className="text-xs text-amber-500 mt-2 pl-8">Seleccione una opcion</p>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ORDENAMIENTO */}
                {preguntaActualData.tipo === 'ordenamiento' && (
                  <div className="space-y-2">
                    <p className="text-xs text-gray-500 mb-2">Ordene los elementos (1 = primer paso):</p>
                    {(preguntaActualData.elementos||[]).filter(e=>e?.trim()).map((elem,i)=>(
                      <div key={i} className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 bg-gray-50 rounded-xl">
                        <GripVertical className="w-4 h-4 text-gray-400" />
                        <span className="text-xs sm:text-sm text-gray-800 flex-1">{elem}</span>
                        <input type="number" min="1" max={(preguntaActualData.elementos||[]).length}
                          value={(respuestas[claveReal]||[])[i]||''}
                          onChange={(e)=>{const a=respuestas[claveReal]||[];const n=[...a];n[i]=parseInt(e.target.value)||'';setRespuestas(prev=>({...prev,[claveReal]:n}));}}
                          disabled={entregado} className="w-14 sm:w-16 px-2 py-2.5 text-xs sm:text-sm border rounded-lg text-center min-h-[44px]" placeholder="#" />
                      </div>
                    ))}
                  </div>
                )}

                {/* COMPLETAR */}
                {preguntaActualData.tipo === 'completar' && preguntaActualData.frases && (
                  <div className="space-y-3">
                    <p className="text-xs text-gray-500">Complete los espacios en blanco:</p>
                    {(preguntaActualData.frases||[]).map((frase,fi)=>{
                      let espacioIdx = 0;
                      for (let f = 0; f < fi; f++) {
                        const fraseAnt = preguntaActualData.frases[f];
                        espacioIdx += (fraseAnt.segmentos||[]).filter(x => x.tipo === 'espacio').length;
                      }
                      return (
                        <div key={frase.id||fi} className="bg-gray-50 rounded-xl p-3 sm:p-4 border border-gray-200">
                          <div className="text-sm text-gray-800 leading-relaxed flex flex-wrap items-center gap-1">
                            {(frase.segmentos||[]).map((seg,si)=>{
                              const idx = espacioIdx + (frase.segmentos||[]).slice(0, si).filter(x => x.tipo === 'espacio').length;
                              if (seg.tipo === 'espacio') espacioIdx++;
                              return (
                                <span key={seg.id||si}>
                                  {seg.tipo === 'texto' ? <span>{seg.texto}</span> : (
                                    <input type="text" value={(respuestas[claveReal]||[])[idx]||''}
                                      onChange={(e)=>{const a=respuestas[claveReal]||[];const n=[...a];n[idx]=e.target.value;setRespuestas(prev=>({...prev,[claveReal]:n}));}}
                                      disabled={entregado} placeholder="______"
                                      className="inline-block mx-1 px-2 sm:px-3 py-2.5 sm:py-3 border-2 border-dashed border-emerald-400 bg-white rounded-lg text-center text-xs sm:text-sm text-emerald-700 font-medium w-full sm:w-auto min-w-[80px] sm:min-w-[120px] min-h-[44px]" />
                                  )}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* RESPUESTA CORTA */}
                {preguntaActualData.tipo === 'respuesta_corta' && (
                  <input type="text" value={respuestas[claveReal]||''} onChange={(e)=>guardarRespuesta(e.target.value)} disabled={entregado}
                    placeholder="Escriba su respuesta..." className="w-full px-4 py-3 text-sm border rounded-xl" />
                )}

                {/* ENSAYO */}
                {preguntaActualData.tipo === 'ensayo' && (
                  <div>
                    <textarea value={respuestas[claveReal]||''} onChange={(e)=>guardarRespuesta(e.target.value)} disabled={entregado}
                      rows="6" placeholder="Escriba su respuesta..." className="w-full px-4 py-2.5 text-sm border rounded-xl resize-none" />
                    <p className="text-xs text-gray-400 mt-1">Minimo {preguntaActualData.longitud_minima||100} palabras</p>
                  </div>
                )}

                {/* LIKERT (ENCUESTA) */}
                {preguntaActualData.tipo === 'likert' && (
                  <div className="space-y-3">
                    <p className="text-xs text-teal-600 font-medium flex items-center gap-1">
                      <BarChart3 className="w-3.5 h-3.5"/> Encuesta - seleccione una opcion
                    </p>
                    <div className="space-y-2">
                      {Array.from({ length: preguntaActualData.escala_opciones || 5 }, (_, i) => {
                        const total = preguntaActualData.escala_opciones || 5;
                        const seleccionado = respuestas[claveReal] === i + 1;
                        return (
                          <label key={i} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${seleccionado ? 'border-teal-400 bg-teal-50' : 'border-gray-200 hover:border-teal-200 hover:bg-gray-50'}`}>
                            <input type="radio" name={`likert_${claveReal}`} checked={seleccionado} onChange={() => guardarRespuesta(i + 1)} disabled={entregado} className="w-4 h-4" style={{ accentColor: '#0D9488' }}/>
                            <span className="text-sm text-gray-700">{i + 1}</span>
                            <span className="text-xs text-gray-500">
                              {i === 0 ? (preguntaActualData.escala_min_label || 'Totalmente en desacuerdo') :
                               i === total - 1 ? (preguntaActualData.escala_max_label || 'Totalmente de acuerdo') :
                               i === Math.floor(total / 2) ? 'Neutral' : ''}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ESTRELLAS (ENCUESTA) */}
                {preguntaActualData.tipo === 'estrellas' && (
                  <div className="space-y-3">
                    <p className="text-xs text-amber-600 font-medium flex items-center gap-1">
                      <Star className="w-3.5 h-3.5"/> Encuesta - califique con estrellas
                    </p>
                    <div className="flex items-center gap-3 py-2 overflow-x-auto">
                      {Array.from({ length: preguntaActualData.escala_max || 5 }, (_, i) => {
                        const valor = i + 1;
                        const seleccionado = (respuestas[claveReal] || 0) >= valor;
                        return (
                          <button key={i} onClick={() => !entregado && guardarRespuesta(valor)} disabled={entregado}
                            className="transition-all hover:scale-110 p-1 min-w-[44px] min-h-[44px] flex items-center justify-center">
                            <Star className={`w-8 h-8 ${seleccionado ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}`}/>
                          </button>
                        );
                      })}
                      {respuestas[claveReal] > 0 && (
                        <span className="text-sm font-medium text-gray-600 ml-2">({respuestas[claveReal]}/{preguntaActualData.escala_max || 5})</span>
                      )}
                    </div>
                    <div className="flex justify-between text-[10px] text-gray-400">
                      <span>{preguntaActualData.escala_min_label || 'Muy malo'}</span>
                      <span>{preguntaActualData.escala_max_label || 'Excelente'}</span>
                    </div>
                  </div>
                )}

                {/* ESCALA NUMERICA (ENCUESTA) */}
                {preguntaActualData.tipo === 'escala_numerica' && (
                  <div className="space-y-3">
                    <p className="text-xs text-purple-600 font-medium flex items-center gap-1">
                      <BarChart3 className="w-3.5 h-3.5"/> Encuesta - seleccione un valor
                    </p>
                    <div className="py-2">
                      <input type="range" min={preguntaActualData.escala_min || 1} max={preguntaActualData.escala_max || 10} step={preguntaActualData.escala_paso || 1}
                        value={respuestas[claveReal] || Math.round(((preguntaActualData.escala_min || 1) + (preguntaActualData.escala_max || 10)) / 2)}
                        onChange={(e) => guardarRespuesta(parseInt(e.target.value))} disabled={entregado}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-500"/>
                      <div className="flex justify-between mt-2">
                        <span className="text-xs text-gray-400">{preguntaActualData.escala_min_label || 'Nada'}</span>
                        <span className="text-lg font-bold text-purple-600">{respuestas[claveReal] || Math.round(((preguntaActualData.escala_min || 1) + (preguntaActualData.escala_max || 10)) / 2)}</span>
                        <span className="text-xs text-gray-400">{preguntaActualData.escala_max_label || 'Mucho'}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
                {!configExamen.mostrarUnaSolaPregunta ? (
                  <>
                    <button onClick={anteriorPregunta} disabled={preguntaActual===0} className="flex items-center gap-1 px-3 py-2.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-30 min-h-[44px]">
                      <ChevronLeft className="w-4 h-4"/> Anterior
                    </button>
                    {preguntaActual<totalPreguntas-1 ? (
                      <button onClick={siguientePregunta} className="flex items-center gap-1 px-4 py-2.5 text-sm text-white rounded-lg min-h-[44px]" style={{backgroundColor:COLOR_PRIMARIO}}>
                        Siguiente <ChevronRight className="w-4 h-4"/>
                      </button>
                    ) : (
                      <button onClick={()=>setMostrarConfirmacion(true)} className="flex items-center gap-1 px-4 py-2.5 text-sm text-white rounded-lg min-h-[44px]" style={{backgroundColor:COLOR_PRIMARIO}}>
                        <Send className="w-4 h-4"/> Entregar
                      </button>
                    )}
                  </>
                ) : (
                  <div className="w-full flex justify-end">
                    {preguntaActual<totalPreguntas-1 ? (
                      <button onClick={siguientePregunta} className="flex items-center gap-1 px-4 py-2.5 text-sm text-white rounded-lg min-h-[44px]" style={{backgroundColor:COLOR_PRIMARIO}}>
                        Siguiente <ChevronRight className="w-4 h-4"/>
                      </button>
                    ) : (
                      <button onClick={()=>setMostrarConfirmacion(true)} className="flex items-center gap-1 px-4 py-2.5 text-sm text-white rounded-lg min-h-[44px]" style={{backgroundColor:COLOR_PRIMARIO}}>
                        <Send className="w-4 h-4"/> Entregar
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
          {!configExamen.mostrarUnaSolaPregunta && (
            <div className="lg:col-span-1">
              <div className="sticky top-20 space-y-4">
                <NavegadorPreguntas 
                  totalPreguntas={totalPreguntas} 
                  preguntaActual={preguntaActual} 
                  respuestas={respuestas} 
                  preguntasMarcadas={preguntasMarcadas} 
                  onIrPregunta={irPregunta} 
                  onMarcarRevisar={toggleMarcarRevision} 
                  preguntasExamen={preguntasExamen}
                />
                <button onClick={()=>setMostrarConfirmacion(true)} className="w-full py-2.5 sm:py-3 text-white text-sm font-medium rounded-lg min-h-[44px]" style={{backgroundColor:COLOR_PRIMARIO}}>Finalizar Examen</button>
              </div>
            </div>
          )}
        </div>
      </main>

      <ModalConfirmarEntrega 
        mostrar={mostrarConfirmacion} 
        onConfirmar={()=>{setMostrarConfirmacion(false);finalizarExamen(false);}} 
        onCancelar={()=>{setMostrarConfirmacion(false)}} 
        preguntasSinResponder={getPreguntasSinResponder()} 
        totalPreguntas={totalPreguntas} 
        preguntasMarcadas={preguntasMarcadas instanceof Set ? preguntasMarcadas.size : 0}
        preguntasMarcadasSet={preguntasMarcadas}
        respuestas={respuestas}
        preguntasExamen={preguntasExamen}
        tiempoRestante={temporizador.tiempoFormateado} 
      />
      <ModalTrampa 
        mostrar={mostrarModalTrampa} 
        onCancelar={()=>{setMostrarModalTrampa(false);finalizarExamen(false);}} 
        violaciones={seguridad.violaciones} 
        eventos={seguridad.eventosSeguridad} 
      />
    </div>
  );
};

export default ExamenActivo;