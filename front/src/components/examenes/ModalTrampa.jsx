// src/components/examenes/ModalTrampa.jsx
// VERSION CORREGIDA - TRADUCCION DE EVENTOS
import React from 'react';
import { AlertTriangle, X, Shield, Clock } from 'lucide-react';
import { EVENTOS_SEGURIDAD } from './constantes';

// ✅ TRADUCCION DE EVENTOS
const EVENTOS_TRADUCCION = {
  [EVENTOS_SEGURIDAD.CAMBIO_PESTANA]: 'Cambio de pestana/ventana',
  [EVENTOS_SEGURIDAD.PERDIDA_FOCO]: 'Perdida de foco de la ventana',
  [EVENTOS_SEGURIDAD.INTENTO_COPIA]: 'Intento de copia/pega',
  [EVENTOS_SEGURIDAD.PANTALLA_COMPLETA]: 'Salida de pantalla completa',
  [EVENTOS_SEGURIDAD.TECLA_PROHIBIDA]: 'Uso de tecla prohibida',
  [EVENTOS_SEGURIDAD.RECONEXION]: 'Reconexion detectada',
  [EVENTOS_SEGURIDAD.DISPOSITIVO_MOVIL]: 'Dispositivo movil detectado'
};

const ModalTrampa = ({ mostrar, onCancelar, violaciones, eventos }) => {
  if (!mostrar) return null;

  const getDescripcionEvento = (tipo) => {
    return EVENTOS_TRADUCCION[tipo] || tipo;
  };

  const formatearHora = (fecha) => {
    return new Date(fecha).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"/>

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-fadeIn"
        style={{ filter: 'drop-shadow(0 20px 40px rgba(0,0,0,0.15))' }}>
        
        {/* Header */}
        <div className="px-5 pt-5 pb-4 text-center">
          <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-3">
            <AlertTriangle className="w-7 h-7 text-red-500"/>
          </div>
          <h3 className="text-base font-bold text-gray-900">Examen Anulado</h3>
          <p className="text-xs text-gray-400 mt-1">Se detectaron multiples violaciones de seguridad</p>
        </div>

        {/* Contenido */}
        <div className="px-5 pb-2 space-y-3">
          
          {/* Contador */}
          <div className="bg-red-50 rounded-xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-red-500"/>
              <span className="text-xs font-medium text-red-600">Total de violaciones</span>
            </div>
            <span className="text-xl font-bold text-red-500">{violaciones}</span>
          </div>

          {/* Lista de eventos con traduccion */}
          <div>
            <p className="text-[10px] font-medium text-gray-400 mb-2 uppercase tracking-wider">Detalle</p>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {(eventos || []).slice(0, 5).map((evento, index) => (
                <div key={index} className="flex items-start gap-2.5 p-2.5 bg-gray-50 rounded-lg">
                  <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-[10px] font-bold text-red-500">{index + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-medium text-gray-700">{getDescripcionEvento(evento.tipo)}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1">
                      <Clock className="w-3 h-3"/>{formatearHora(evento.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
              {(eventos || []).length > 5 && (
                <p className="text-[10px] text-gray-400 text-center">...y {(eventos || []).length - 5} mas</p>
              )}
            </div>
          </div>

          <p className="text-[11px] text-gray-500 text-center py-1">
            El examen ha sido anulado. Las respuestas no seran consideradas para la calificacion.
          </p>
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 pt-2">
          <button onClick={onCancelar}
            className="w-full py-2.5 text-xs font-medium text-white bg-red-500 rounded-xl hover:bg-red-600 transition-all duration-200"
            style={{ WebkitTapHighlightColor: 'transparent' }}>
            Entendido - Salir del Examen
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalTrampa;