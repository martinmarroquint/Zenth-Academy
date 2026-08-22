// src/components/examenes/Temporizador.jsx
// VERSION CORREGIDA - CON ALERTA ACTIVA
import React from 'react';
import { Clock, AlertTriangle, AlertCircle } from 'lucide-react';
import { COLOR_PRIMARIO } from './constantes';

const Temporizador = ({ 
  tiempoFormateado, 
  progreso, 
  violaciones, 
  maxViolaciones,
  alertaActiva 
}) => {
  const esUrgente = progreso < 25;
  const esAdvertencia = progreso < 50;
  const esNormal = progreso >= 50;

  const getColorProgreso = () => {
    if (esUrgente) return '#DC2626';
    if (esAdvertencia) return '#F59E0B';
    return COLOR_PRIMARIO;
  };

  return (
    <div className="flex items-center gap-2 sm:gap-3">
      {/* Barra de progreso */}
      <div className="hidden sm:block w-24 md:w-32 lg:w-40 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000 ease-linear"
          style={{
            width: `${progreso}%`,
            backgroundColor: getColorProgreso()
          }}
        ></div>
      </div>

      {/* Tiempo */}
      <div className={`
        flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg 
        text-xs sm:text-sm font-bold font-mono transition-colors
        ${esUrgente ? 'bg-red-100 text-red-700 animate-pulse' : 
          esAdvertencia ? 'bg-amber-100 text-amber-700' : 
          'bg-gray-100 text-gray-700'}
      `}>
        <Clock className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${esUrgente ? 'animate-pulse' : ''}`} />
        <span>{tiempoFormateado}</span>
      </div>

      {/* ✅ Alerta de tiempo activa */}
      {alertaActiva && (
        <div className="hidden sm:flex items-center gap-1 px-2 py-1 bg-red-50 text-red-600 rounded-lg text-xs font-medium animate-pulse">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>Quedan {Math.floor(alertaActiva / 60)}min</span>
        </div>
      )}

      {/* Violaciones */}
      {violaciones > 0 && (
        <div className={`
          flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold transition-all
          ${violaciones >= maxViolaciones ? 'bg-red-100 text-red-700 animate-pulse' : 
            violaciones >= maxViolaciones - 1 ? 'bg-amber-100 text-amber-700' : 
            'bg-gray-100 text-gray-600'}
        `}>
          <AlertTriangle className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Violaciones: </span>
          <span>{violaciones}/{maxViolaciones}</span>
        </div>
      )}
    </div>
  );
};

export default Temporizador;