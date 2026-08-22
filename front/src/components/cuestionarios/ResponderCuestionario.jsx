// front/src/components/cuestionarios/ResponderCuestionario.jsx
// COMPONENTE COMPLETO - RESPONDER CUESTIONARIO

import React, { useState, useEffect } from 'react';
import {
  ArrowLeft, Send, Clock, Users, CheckCircle, Circle,
  Star, Sliders, Calendar, Image, FileText, Grid, SortAsc,
  ChevronLeft, ChevronRight, AlertTriangle, Loader2
} from 'lucide-react';

const ResponderCuestionario = ({ cuestionario, onEnviar, onCancelar }) => {
  const [respuestas, setRespuestas] = useState({});
  const [preguntaActual, setPreguntaActual] = useState(0);
  const [enviando, setEnviando] = useState(false);
  const [errores, setErrores] = useState({});
  const [tiempoInicio] = useState(Date.now());
  const [tiempoPorPregunta, setTiempoPorPregunta] = useState({});

  const totalPreguntas = cuestionario?.preguntas?.length || 0;

  useEffect(() => {
    if (tiempoPorPregunta[preguntaActual] === undefined) {
      setTiempoPorPregunta(prev => ({
        ...prev,
        [preguntaActual]: Date.now()
      }));
    }
  }, [preguntaActual]);

  const handleRespuesta = (preguntaId, valor) => {
    setRespuestas(prev => ({ ...prev, [preguntaId]: valor }));
    if (errores[preguntaId]) {
      setErrores(prev => {
        const newErrores = { ...prev };
        delete newErrores[preguntaId];
        return newErrores;
      });
    }
  };

  const handleOpcionMultiple = (preguntaId, opcionIdx) => {
    const actual = respuestas[preguntaId] || [];
    if (actual.includes(opcionIdx)) {
      handleRespuesta(preguntaId, actual.filter(i => i !== opcionIdx));
    } else {
      handleRespuesta(preguntaId, [...actual, opcionIdx]);
    }
  };

  const handleMatriz = (preguntaId, filaIdx, columnaIdx) => {
    const actual = respuestas[preguntaId] || {};
    handleRespuesta(preguntaId, { ...actual, [filaIdx]: columnaIdx });
  };

  const validarPregunta = (pregunta, respuesta) => {
    if (!pregunta.obligatoria) return true;
    if (respuesta === undefined || respuesta === null) return false;
    if (typeof respuesta === 'string' && respuesta.trim() === '') return false;
    if (Array.isArray(respuesta) && respuesta.length === 0) return false;
    if (typeof respuesta === 'object' && Object.keys(respuesta).length === 0) return false;
    return true;
  };

  const irAPregunta = (index) => {
    if (index >= 0 && index < totalPreguntas) {
      // Guardar tiempo de la pregunta actual
      if (tiempoPorPregunta[preguntaActual] !== undefined) {
        const tiempo = Math.round((Date.now() - tiempoPorPregunta[preguntaActual]) / 1000);
        setTiempoPorPregunta(prev => ({
          ...prev,
          [preguntaActual]: tiempo
        }));
      }
      setPreguntaActual(index);
    }
  };

  const siguientePregunta = () => {
    const pregunta = cuestionario.preguntas[preguntaActual];
    const respuesta = respuestas[pregunta.id];
    
    if (pregunta.obligatoria && !validarPregunta(pregunta, respuesta)) {
      setErrores(prev => ({ ...prev, [pregunta.id]: 'Esta pregunta es obligatoria' }));
      return;
    }
    
    if (preguntaActual < totalPreguntas - 1) {
      irAPregunta(preguntaActual + 1);
    }
  };

  const anteriorPregunta = () => {
    if (preguntaActual > 0) {
      irAPregunta(preguntaActual - 1);
    }
  };

  const handleEnviar = async () => {
    // Validar todas las preguntas obligatorias
    const newErrores = {};
    let tieneError = false;
    
    cuestionario.preguntas.forEach(p => {
      if (p.obligatoria && !validarPregunta(p, respuestas[p.id])) {
        newErrores[p.id] = 'Esta pregunta es obligatoria';
        tieneError = true;
      }
    });

    if (tieneError) {
      setErrores(newErrores);
      return;
    }

    setEnviando(true);
    try {
      const tiempoTotal = Math.round((Date.now() - tiempoInicio) / 1000);
      await onEnviar({
        respuestas,
        tiempo_total: tiempoTotal,
        tiempo_por_pregunta: tiempoPorPregunta
      });
    } catch (error) {
      console.error('Error enviando respuestas:', error);
      setErrores({ general: 'Error al enviar las respuestas. Intenta nuevamente.' });
    } finally {
      setEnviando(false);
    }
  };

  const renderPregunta = (pregunta) => {
    const respuesta = respuestas[pregunta.id];

    switch (pregunta.tipo) {
      case 'opcion_unica':
        return (
          <div className="space-y-2">
            {(pregunta.opciones || []).map((opcion, idx) => (
              <button
                key={idx}
                onClick={() => handleRespuesta(pregunta.id, idx)}
                className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                  respuesta === idx
                    ? 'border-gray-900 bg-gray-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                    respuesta === idx
                      ? 'border-gray-900 bg-gray-900'
                      : 'border-gray-300'
                  }`}>
                    {respuesta === idx && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                  <span className="text-sm text-gray-700">{opcion}</span>
                </div>
              </button>
            ))}
          </div>
        );

      case 'opcion_multiple':
        return (
          <div className="space-y-2">
            {(pregunta.opciones || []).map((opcion, idx) => {
              const seleccionado = (respuesta || []).includes(idx);
              return (
                <button
                  key={idx}
                  onClick={() => handleOpcionMultiple(pregunta.id, idx)}
                  className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                    seleccionado
                      ? 'border-gray-900 bg-gray-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                      seleccionado
                        ? 'border-gray-900 bg-gray-900'
                        : 'border-gray-300'
                    }`}>
                      {seleccionado && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                    </div>
                    <span className="text-sm text-gray-700">{opcion}</span>
                  </div>
                </button>
              );
            })}
          </div>
        );

      case 'texto_corto':
        return (
          <input
            type="text"
            value={respuesta || ''}
            onChange={(e) => handleRespuesta(pregunta.id, e.target.value)}
            placeholder="Escribe tu respuesta..."
            className="w-full px-4 py-3 text-sm border border-gray-200 rounded-lg outline-none focus:border-gray-300 transition-colors"
          />
        );

      case 'texto_largo':
        return (
          <textarea
            value={respuesta || ''}
            onChange={(e) => handleRespuesta(pregunta.id, e.target.value)}
            placeholder="Escribe tu respuesta detallada..."
            rows={5}
            className="w-full px-4 py-3 text-sm border border-gray-200 rounded-lg outline-none focus:border-gray-300 transition-colors resize-none"
          />
        );

      case 'escala_likert': {
        const min = pregunta.configuracion?.min || 1;
        const max = pregunta.configuracion?.max || 5;
        return (
          <div className="space-y-3">
            <div className="flex justify-between gap-2">
              {Array.from({ length: max - min + 1 }, (_, i) => {
                const valor = min + i;
                return (
                  <button
                    key={valor}
                    onClick={() => handleRespuesta(pregunta.id, valor)}
                    className={`flex-1 py-3 rounded-lg border-2 transition-all text-center ${
                      respuesta === valor
                        ? 'border-gray-900 bg-gray-50 text-gray-900 font-medium'
                        : 'border-gray-200 hover:border-gray-300 text-gray-500'
                    }`}
                  >
                    {valor}
                  </button>
                );
              })}
            </div>
            <div className="flex justify-between text-xs text-gray-400 px-1">
              <span>{pregunta.configuracion?.etiqueta_min || 'Muy en desacuerdo'}</span>
              <span>{pregunta.configuracion?.etiqueta_max || 'Muy de acuerdo'}</span>
            </div>
          </div>
        );
        }

      case 'estrellas': {
        const maxEstrellas = pregunta.configuracion?.max || 5;
        return (
          <div className="flex gap-2">
            {Array.from({ length: maxEstrellas }, (_, i) => (
              <button
                key={i}
                onClick={() => handleRespuesta(pregunta.id, i + 1)}
                className="p-1 transition-transform hover:scale-110"
              >
                <Star
                  className={`w-10 h-10 transition-colors ${
                    (respuesta || 0) > i
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-gray-300'
                  }`}
                />
              </button>
            ))}
          </div>
        );
        }

      case 'escala_numerica':
        return (
          <div className="flex items-center gap-4">
            <input
              type="number"
              value={respuesta || ''}
              onChange={(e) => handleRespuesta(pregunta.id, parseFloat(e.target.value))}
              min={pregunta.configuracion?.min || 0}
              max={pregunta.configuracion?.max || 10}
              step={pregunta.configuracion?.step || 1}
              className="w-24 px-3 py-3 text-center text-lg border border-gray-200 rounded-lg outline-none focus:border-gray-300"
            />
            <span className="text-sm text-gray-400">
              Valor entre {pregunta.configuracion?.min || 0} y {pregunta.configuracion?.max || 10}
            </span>
          </div>
        );

      case 'fecha':
        return (
          <input
            type="date"
            value={respuesta || ''}
            onChange={(e) => handleRespuesta(pregunta.id, e.target.value)}
            className="w-full px-4 py-3 text-sm border border-gray-200 rounded-lg outline-none focus:border-gray-300"
          />
        );

      case 'hora':
        return (
          <input
            type="time"
            value={respuesta || ''}
            onChange={(e) => handleRespuesta(pregunta.id, e.target.value)}
            className="w-full px-4 py-3 text-sm border border-gray-200 rounded-lg outline-none focus:border-gray-300"
          />
        );

      case 'archivo':
        return (
          <div className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center hover:border-gray-300 transition-colors">
            <input
              type="file"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleRespuesta(pregunta.id, file);
              }}
              className="hidden"
              id={`file-${pregunta.id}`}
            />
            <label
              htmlFor={`file-${pregunta.id}`}
              className="cursor-pointer"
            >
              <Image className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">
                {respuesta ? (respuesta).name : 'Haz clic o arrastra un archivo'}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Formatos permitidos: PDF, JPG, PNG
              </p>
            </label>
          </div>
        );

      case 'matriz': {
        const filas = pregunta.configuracion?.filas || ['Item 1', 'Item 2'];
        const columnas = pregunta.configuracion?.columnas || ['Muy malo', 'Malo', 'Neutral', 'Bueno', 'Muy bueno'];
        return (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left text-gray-500 p-2"></th>
                  {columnas.map((col, i) => (
                    <th key={i} className="text-center text-gray-500 p-2 font-normal">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filas.map((fila, i) => (
                  <tr key={i}>
                    <td className="p-2 text-gray-700">{fila}</td>
                    {columnas.map((_, j) => (
                      <td key={j} className="text-center p-2">
                        <button
                          onClick={() => handleMatriz(pregunta.id, i, j)}
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mx-auto transition-all ${
                            (respuesta || {})[i] === j
                              ? 'border-gray-900 bg-gray-900'
                              : 'border-gray-300 hover:border-gray-400'
                          }`}
                        >
                          {(respuesta || {})[i] === j && (
                            <div className="w-2 h-2 rounded-full bg-white" />
                          )}
                        </button>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        }

      case 'ordenamiento': {
        const opciones = pregunta.opciones || [];
        const ordenActual = respuesta || opciones.map((_, i) => i);
        // Simplificado - en producción se usaría drag & drop
        return (
          <div className="space-y-2">
            {ordenActual.map((idx, pos) => (
              <div
                key={idx}
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200"
              >
                <span className="text-sm font-medium text-gray-400">#{pos + 1}</span>
                <span className="text-sm text-gray-700">{opciones[idx]}</span>
                <div className="ml-auto flex gap-1">
                  <button
                    onClick={() => {
                      if (pos > 0) {
                        const nuevo = [...ordenActual];
                        [nuevo[pos], nuevo[pos - 1]] = [nuevo[pos - 1], nuevo[pos]];
                        handleRespuesta(pregunta.id, nuevo);
                      }
                    }}
                    className="p-1 hover:bg-gray-200 rounded"
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => {
                      if (pos < ordenActual.length - 1) {
                        const nuevo = [...ordenActual];
                        [nuevo[pos], nuevo[pos + 1]] = [nuevo[pos + 1], nuevo[pos]];
                        handleRespuesta(pregunta.id, nuevo);
                      }
                    }}
                    className="p-1 hover:bg-gray-200 rounded"
                  >
                    ↓
                  </button>
                </div>
              </div>
            ))}
          </div>
        );
        }

      default:
        return <div className="text-gray-400 text-sm">Tipo de pregunta no soportado</div>;
    }
  };

  const pregunta = cuestionario?.preguntas?.[preguntaActual];
  const seccionActual = pregunta?.seccion;
  const seccionAnterior = preguntaActual > 0 ? cuestionario?.preguntas?.[preguntaActual - 1]?.seccion : null;
  const progreso = totalPreguntas > 0 ? ((preguntaActual + 1) / totalPreguntas * 100) : 0;

  return (
    <div className="min-h-screen bg-[#fbfbfa] flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={onCancelar}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver
          </button>
          <h1 className="text-xl font-bold text-gray-900">{cuestionario?.titulo}</h1>
          <p className="text-sm text-gray-400 mt-1">{cuestionario?.descripcion}</p>
        </div>

        {/* Progreso */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">
              Pregunta {preguntaActual + 1} de {totalPreguntas}
            </span>
            <span className="text-sm font-medium text-gray-700">
              {Math.round(progreso)}%
            </span>
          </div>
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gray-900 rounded-full transition-all duration-300"
              style={{ width: `${progreso}%` }}
            />
          </div>
        </div>

        {/* Separador de sección */}
        {seccionActual && seccionActual !== seccionAnterior && (
          <div className="mb-4">
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-gray-900 uppercase tracking-wide">
                {seccionActual}
              </span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>
          </div>
        )}

        {/* Pregunta */}
        {pregunta && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                {seccionActual && (
                  <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
                    {seccionActual}
                  </span>
                )}
                <span className="text-xs font-medium text-gray-400 uppercase">
                  {pregunta.tipo}
                </span>
                {pregunta.obligatoria && (
                  <span className="text-xs text-red-500">* Obligatoria</span>
                )}
              </div>
              <h2 className="text-lg font-semibold text-gray-900">{pregunta.titulo}</h2>
              {pregunta.descripcion && (
                <p className="text-sm text-gray-500 mt-1">{pregunta.descripcion}</p>
              )}
            </div>

            <div className="my-6">
              {renderPregunta(pregunta)}
              {errores[pregunta.id] && (
                <p className="text-xs text-red-500 mt-2 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {errores[pregunta.id]}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
              <button
                onClick={anteriorPregunta}
                disabled={preguntaActual === 0}
                className="flex items-center gap-1 px-4 py-2 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
                Anterior
              </button>
              {preguntaActual === totalPreguntas - 1 ? (
                <button
                  onClick={handleEnviar}
                  disabled={enviando}
                  className="px-5 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {enviando ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Enviar
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={siguientePregunta}
                  className="px-5 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-2"
                >
                  Siguiente
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Error general */}
        {errores.general && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            {errores.general}
          </div>
        )}
      </div>
    </div>
  );
};

export default ResponderCuestionario;