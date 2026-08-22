// src/components/examenes/NavegadorPreguntas.jsx
// VERSION CORREGIDA - UNIFICADO CALCULO DE RESPONDIDAS
import React, { useState } from 'react';
import { CheckCircle2, Circle, Flag, ChevronDown, ChevronUp } from 'lucide-react';
import { COLOR_PRIMARIO } from './constantes';

const NavegadorPreguntas = ({ 
  totalPreguntas, 
  preguntaActual, 
  respuestas = {}, 
  preguntasMarcadas = new Set(),
  onIrPregunta,
  onMarcarRevisar,
  preguntasExamen = []
}) => {
  const [expandido, setExpandido] = useState(false);

  // ✅ UNIFICADO: Usar clave real para verificar respuesta
  const getEstadoPregunta = (index) => {
    const pregunta = preguntasExamen?.[index];
    const claveReal = String(pregunta?._indiceOriginal ?? pregunta?.orden ?? index);
    const resp = respuestas[claveReal];
    
    if (resp !== undefined && resp !== null) {
      if (typeof resp === 'string' && resp.trim() === '') return 'sin_responder';
      if (Array.isArray(resp) && resp.length === 0) return 'sin_responder';
      if (Array.isArray(resp) && resp.every(r => r === undefined || r === null || r === '')) return 'sin_responder';
      if (typeof resp === 'object' && !Array.isArray(resp) && Object.keys(resp).length === 0) return 'sin_responder';
      return 'respondida';
    }
    if (preguntasMarcadas instanceof Set && preguntasMarcadas.has(index)) return 'marcada';
    if (Array.isArray(preguntasMarcadas) && preguntasMarcadas.includes(index)) return 'marcada';
    return 'sin_responder';
  };

  // ✅ UNIFICADO: Contar respondidas usando clave real
  const contarRespondidas = () => {
    if (!preguntasExamen || preguntasExamen.length === 0) {
      return Object.keys(respuestas).length;
    }
    let count = 0;
    preguntasExamen.forEach((pregunta, idx) => {
      const estado = getEstadoPregunta(idx);
      if (estado === 'respondida') count++;
    });
    return count;
  };

  const getColorEstado = (estado, activa) => {
    if (activa) return { bg: COLOR_PRIMARIO, text: 'white', ring: COLOR_PRIMARIO };
    switch (estado) {
      case 'respondida': return { bg: '#D1FAE5', text: '#065F46', ring: '#34D399' };
      case 'marcada': return { bg: '#FEF3C7', text: '#92400E', ring: '#F59E0B' };
      default: return { bg: '#F3F4F6', text: '#6B7280', ring: '#D1D5DB' };
    }
  };

  const respondidas = contarRespondidas();
  const porcentaje = totalPreguntas > 0 ? Math.round((respondidas / totalPreguntas) * 100) : 0;

  return (
    <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-200 overflow-hidden">
      <button
        onClick={() => setExpandido(!expandido)}
        className="w-full flex items-center justify-between p-3 sm:p-4 hover:bg-gray-50 transition-colors lg:cursor-default"
      >
        <div>
          <h3 className="text-xs sm:text-sm font-bold text-gray-700">Navegacion</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {respondidas} de {totalPreguntas} respondidas
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden sm:block w-16 sm:w-20 h-1.5 sm:h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${porcentaje}%`, backgroundColor: COLOR_PRIMARIO }}
            ></div>
          </div>
          <span className="lg:hidden">
            {expandido ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronUp className="w-4 h-4 text-gray-400" />}
          </span>
        </div>
      </button>

      <div className={`${expandido ? 'block' : 'hidden'} lg:block p-3 sm:p-4 border-t border-gray-100`}>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-green-100 border border-green-300"></div>
            <span className="text-xs text-gray-500">Respondida</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-amber-100 border border-amber-300"></div>
            <span className="text-xs text-gray-500">Marcada</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-gray-100 border border-gray-300"></div>
            <span className="text-xs text-gray-500">Sin responder</span>
          </div>
        </div>

        <div className="grid grid-cols-6 sm:grid-cols-5 gap-1.5 sm:gap-2">
          {Array.from({ length: totalPreguntas }, (_, i) => {
            const estado = getEstadoPregunta(i);
            const activa = i === preguntaActual;
            const colores = getColorEstado(estado, activa);
            
            return (
              <button
                key={i}
                onClick={() => {
                  onIrPregunta(i);
                  setExpandido(false);
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  onMarcarRevisar(i);
                }}
                className={`
                  w-full aspect-square rounded-lg sm:rounded-xl flex items-center justify-center
                  text-xs sm:text-sm font-bold transition-all relative
                  hover:scale-105 active:scale-95
                  ${activa ? 'ring-2 ring-offset-1 scale-105' : ''}
                `}
                style={{
                  backgroundColor: colores.bg,
                  color: colores.text,
                  '--tw-ring-color': colores.ring
                }}
                title={`Pregunta ${i + 1} - Click derecho para marcar`}
              >
                {i + 1}
                {activa && (
                  <div className="absolute -top-1 -right-1 w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-blue-500 border-2 border-white"></div>
                )}
                {estado === 'respondida' && !activa && (
                  <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-green-500"></div>
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-3 sm:mt-4 pt-3 border-t border-gray-100 space-y-1.5">
          <div className="flex justify-between text-xs text-gray-500">
            <span>Respondidas</span>
            <span className="font-bold text-green-600">{respondidas}</span>
          </div>
          <div className="flex justify-between text-xs text-gray-500">
            <span>Marcadas</span>
            <span className="font-bold text-amber-600">
              {preguntasMarcadas instanceof Set ? preguntasMarcadas.size : preguntasMarcadas?.length || 0}
            </span>
          </div>
          <div className="flex justify-between text-xs text-gray-500">
            <span>Pendientes</span>
            <span className="font-bold text-red-600">{totalPreguntas - respondidas}</span>
          </div>
          <div className="flex justify-between text-xs text-gray-500">
            <span>Progreso</span>
            <span className="font-bold" style={{ color: COLOR_PRIMARIO }}>{porcentaje}%</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NavegadorPreguntas;