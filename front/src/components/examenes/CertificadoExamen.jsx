// src/components/examenes/CertificadoExamen.jsx
// VERSION CORREGIDA - FIX UNDEFINED
import React, { useRef } from 'react';
import { Download, Printer, Award, Shield, ArrowLeft } from 'lucide-react';
import { COLOR_PRIMARIO } from './constantes';

const CertificadoExamen = ({ resultado, examen, alumno, onDescargar, onCerrar }) => {
  const certificadoRef = useRef(null);

  const fechaActual = new Date().toLocaleDateString('es-PE', { year: 'numeric', month: 'long', day: 'numeric' });

  // ✅ Fix: asegurar que correctas no sea undefined
  const correctas = resultado?.correctas || resultado?.respuestasCorrectas || 0;
  const total = resultado?.totalPreguntas || resultado?.total_preguntas || examen?.preguntas?.length || 0;
  const calificacion = resultado?.calificacion || 0;
  const aprobado = calificacion >= (examen?.puntaje_aprobacion || 60);
  const tiempoUsado = resultado?.tiempoUsado || resultado?.tiempo_usado || 0;

  // ✅ Generar código de verificación si no existe
  const codigoVerificacion = resultado?.id || 
    resultado?.resultado_id || 
    `VER-${examen?.id?.slice(-6) || '000000'}-${Date.now().toString().slice(-6)}`;

  const handleImprimir = () => window.print();
  const handleDescargar = async () => { if (onDescargar) await onDescargar(resultado?.id || resultado?.resultado_id); };

  // Si no hay resultado o examen, mostrar mensaje
  if (!resultado || !examen) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center max-w-md">
          <Award className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-gray-800 mb-2">Sin datos disponibles</h2>
          <p className="text-sm text-gray-400">No se encontró información para generar el certificado.</p>
          <button onClick={onCerrar} className="mt-4 px-4 py-2 bg-gray-200 rounded-lg text-sm">Volver</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        
        {/* Acciones */}
        <div className="flex justify-between items-center mb-4 no-print">
          <button onClick={onCerrar} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors" style={{ WebkitTapHighlightColor: 'transparent' }}>
            <ArrowLeft className="w-4 h-4"/> Volver
          </button>
          <div className="flex gap-2">
            <button onClick={handleImprimir} className="px-3 py-1.5 text-[11px] font-medium text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-all flex items-center gap-1.5" style={{ WebkitTapHighlightColor: 'transparent' }}>
              <Printer className="w-3.5 h-3.5"/> Imprimir
            </button>
            <button onClick={handleDescargar} className="px-3 py-1.5 text-[11px] font-medium text-white rounded-lg hover:shadow-md transition-all flex items-center gap-1.5" style={{ backgroundColor: COLOR_PRIMARIO, WebkitTapHighlightColor: 'transparent' }}>
              <Download className="w-3.5 h-3.5"/> Descargar
            </button>
          </div>
        </div>

        {/* Certificado */}
        <div ref={certificadoRef} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden print:shadow-none print:rounded-none print:border-none">
          
          <div className="border-4 print:border-2 p-6 sm:p-10" style={{ borderColor: COLOR_PRIMARIO }}>
            
            {/* Cabecera */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: `${COLOR_PRIMARIO}10` }}>
                <Award className="w-8 h-8" style={{ color: COLOR_PRIMARIO }}/>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">Certificado de Aprobacion</h1>
              <p className="text-xs text-gray-400">Zenth Academy</p>
              <p className="text-xs text-gray-400">Sistema de Evaluaciones Academicas</p>
            </div>

            {/* Cuerpo */}
            <div className="text-center space-y-5 mb-8">
              <p className="text-sm text-gray-500">Se certifica que</p>
              
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">
                {alumno?.apellidos ? `${alumno.apellidos}, ` : ''}{alumno?.nombres || 'Alumno'}
              </h2>
              
              {alumno?.dni && (
                <p className="text-xs text-gray-500">DNI: <strong className="text-gray-700">{alumno.dni}</strong></p>
              )}

              <div className="border-t border-b border-gray-100 py-5 my-5">
                <p className="text-xs text-gray-500 mb-2">Ha aprobado satisfactoriamente el examen</p>
                <h3 className="text-sm sm:text-base font-bold text-gray-800 mb-1">{examen.titulo}</h3>
                {examen.codigo && (
                  <p className="text-[10px] text-gray-400">Codigo: {examen.codigo}</p>
                )}
              </div>

              {/* Resultados */}
              <div className="flex items-center justify-center gap-8">
                <div className="text-center">
                  <p className="text-xl font-bold" style={{ color: COLOR_PRIMARIO }}>{calificacion.toFixed(1)}%</p>
                  <p className="text-[10px] text-gray-400">Calificacion</p>
                </div>
                <span className="text-gray-200">|</span>
                <div className="text-center">
                  <p className="text-xl font-bold" style={{ color: COLOR_PRIMARIO }}>{correctas}/{total}</p>
                  <p className="text-[10px] text-gray-400">Correctas</p>
                </div>
                <span className="text-gray-200">|</span>
                <div className="text-center">
                  <p className="text-xl font-bold" style={{ color: COLOR_PRIMARIO }}>{Math.floor(tiempoUsado / 60)}m</p>
                  <p className="text-[10px] text-gray-400">Tiempo</p>
                </div>
              </div>
            </div>

            {/* Pie */}
            <div className="flex items-center justify-between pt-6 border-t border-gray-100">
              <div>
                <p className="text-[10px] text-gray-400 mb-0.5">Fecha de emision</p>
                <p className="text-xs font-medium text-gray-600">{fechaActual}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-gray-400 mb-0.5">Codigo de verificacion</p>
                <p className="text-xs font-mono text-gray-500">{codigoVerificacion.slice(0, 8).toUpperCase()}</p>
              </div>
            </div>

            {/* Sello */}
            <div className="mt-6 text-center">
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 rounded-lg">
                <Shield className="w-3.5 h-3.5" style={{ color: COLOR_PRIMARIO }}/>
                <span className="text-[10px] text-gray-400">Documento generado digitalmente</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          .no-print, .no-print * { display: none !important; }
          body { background: white; }
        }
      `}</style>
    </div>
  );
};

export default CertificadoExamen;