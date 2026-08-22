// src/components/examenes/ModalConfirmarEntrega.jsx
// VERSION CORREGIDA - UNIFICADO CALCULO DE PREGUNTAS SIN RESPONDER
import React from 'react';
import { AlertTriangle, Clock, Flag, Send, CheckCircle2 } from 'lucide-react';
import { COLOR_PRIMARIO } from './constantes';

const ModalConfirmarEntrega = ({
  mostrar,
  onConfirmar,
  onCancelar,
  preguntasSinResponder = 0,
  totalPreguntas = 0,
  preguntasMarcadas = 0,
  tiempoRestante = '',
  respuestas = {},
  preguntasExamen = [],
  preguntasMarcadasSet = new Set()
}) => {
  if (!mostrar) return null;

  // ✅ CALCULO UNIFICADO DE PREGUNTAS SIN RESPONDER
  let sinResponder = preguntasSinResponder;
  let marcadasCount = preguntasMarcadas;
  
  if (preguntasExamen.length > 0) {
    sinResponder = 0;
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
  }
  
  if (preguntasMarcadasSet instanceof Set && preguntasMarcadasSet.size > 0) {
    marcadasCount = preguntasMarcadasSet.size;
  }

  const todasRespondidas = sinResponder === 0;
  const hayMarcadas = marcadasCount > 0;

  // Lista de preguntas sin responder
  const preguntasFaltantes = [];
  if (preguntasExamen.length > 0) {
    preguntasExamen.forEach((pregunta, idx) => {
      const clave = String(pregunta._indiceOriginal ?? pregunta.orden ?? idx);
      const resp = respuestas[clave];
      let vacia = false;
      if (resp === undefined || resp === null) vacia = true;
      else if (typeof resp === 'string' && resp.trim() === '') vacia = true;
      else if (Array.isArray(resp) && (resp.length === 0 || resp.every(r => r === undefined || r === null || r === ''))) vacia = true;
      if (vacia) preguntasFaltantes.push(idx + 1);
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancelar}/>

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-fadeIn"
        style={{ filter: 'drop-shadow(0 20px 40px rgba(0,0,0,0.12))' }}>
        
        {/* Header */}
        <div className="px-5 pt-5 pb-4 text-center">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3 ${
            todasRespondidas ? 'bg-emerald-50' : 'bg-amber-50'
          }`}>
            {todasRespondidas ? (
              <CheckCircle2 className="w-6 h-6 text-emerald-500"/>
            ) : (
              <AlertTriangle className="w-6 h-6 text-amber-500"/>
            )}
          </div>
          <h3 className="text-base font-bold text-gray-900">Confirmar Entrega</h3>
          <p className="text-xs text-gray-400 mt-1">
            {todasRespondidas ? 'Ha respondido todas las preguntas' : `Faltan ${sinResponder} de ${totalPreguntas}`}
          </p>
        </div>

        {/* Contenido */}
        <div className="px-5 pb-2 space-y-2">
          
          {/* Resumen */}
          <div className="bg-gray-50 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Total preguntas</span>
              <span className="text-xs font-semibold text-gray-700">{totalPreguntas}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Respondidas</span>
              <span className="text-xs font-semibold text-emerald-500">{totalPreguntas - sinResponder}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Sin responder</span>
              <span className={`text-xs font-semibold ${sinResponder > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                {sinResponder}
              </span>
            </div>
            {hayMarcadas && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Marcadas para revision</span>
                <span className="text-xs font-semibold text-amber-500">{marcadasCount}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Tiempo restante</span>
              <span className="text-xs font-semibold text-gray-700">{tiempoRestante}</span>
            </div>
          </div>

          {/* Preguntas faltantes */}
          {preguntasFaltantes.length > 0 && (
            <div className="p-2.5 bg-red-50 rounded-lg border border-red-100">
              <p className="text-[10px] font-medium text-red-500 mb-1.5">Preguntas sin responder:</p>
              <div className="flex flex-wrap gap-1">
                {preguntasFaltantes.map(num => (
                  <span key={num} className="px-2 py-0.5 bg-white border border-red-200 rounded text-[10px] font-bold text-red-500">
                    #{num}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Advertencia */}
          {!todasRespondidas && (
            <div className="flex items-start gap-2 p-2.5 bg-red-50 rounded-lg border border-red-100">
              <AlertTriangle className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5"/>
              <p className="text-[11px] text-red-600">
                <strong>{sinResponder}</strong> {sinResponder === 1 ? 'pregunta sin responder' : 'preguntas sin responder'}. Se calificaran como incorrectas.
              </p>
            </div>
          )}

          {hayMarcadas && (
            <div className="flex items-start gap-2 p-2.5 bg-amber-50 rounded-lg border border-amber-100">
              <Flag className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5"/>
              <p className="text-[11px] text-amber-600">
                <strong>{marcadasCount}</strong> {marcadasCount === 1 ? 'pregunta marcada' : 'preguntas marcadas'} para revision.
              </p>
            </div>
          )}

          <p className="text-[11px] text-gray-400 text-center py-1">
            Una vez entregado, no podra modificar sus respuestas.
          </p>
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 pt-2 flex gap-2">
          <button onClick={onCancelar}
            className="flex-1 py-2.5 text-xs font-medium text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all duration-200"
            style={{ WebkitTapHighlightColor: 'transparent' }}>
            Cancelar
          </button>
          <button onClick={onConfirmar}
            className={`flex-1 py-2.5 text-xs font-medium text-white rounded-xl hover:shadow-md transition-all duration-200 flex items-center justify-center gap-1.5 ${
              sinResponder > 0 ? 'bg-amber-500 hover:bg-amber-600' : ''
            }`}
            style={{ backgroundColor: sinResponder > 0 ? undefined : COLOR_PRIMARIO, WebkitTapHighlightColor: 'transparent' }}>
            <Send className="w-3.5 h-3.5"/> {sinResponder > 0 ? 'Entregar igual' : 'Entregar'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalConfirmarEntrega;