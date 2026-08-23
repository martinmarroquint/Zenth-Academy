// front/src/components/cursos/ModalCrearExamenRapido.jsx
// MODAL QUE INTEGRA EL CREADOR DE EXÁMENES COMPLETO

import React, { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import CreadorExamen from '../examenes/CreadorExamen';
import examenesService from '../../services/examenesService';

const ModalCrearExamenRapido = ({
  abierto,
  onClose,
  onExamenCreado,
  cursoTitulo = 'Curso'
}) => {
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [examenGuardado, setExamenGuardado] = useState(null);

  const handleGuardarExamen = async (examenData) => {
    setCargando(true);
    setError('');

    try {
      // Asegurar que el examen tenga el título del curso si no tiene
      const data = {
        ...examenData,
        titulo: examenData.titulo || `Examen - ${cursoTitulo}`,
        curso_titulo: cursoTitulo
      };

      let creado;
      
      // Si el examen ya tiene ID, actualizar, si no, crear
      if (examenData.id) {
        creado = await examenesService.actualizarExamen(examenData.id, data);
      } else {
        creado = await examenesService.crearExamen(data);
      }
      
      setExamenGuardado(creado);
      
      if (onExamenCreado) {
        onExamenCreado(creado);
      }

      // Cerrar después de un breve momento para mostrar éxito
      setTimeout(() => {
        onClose();
        // Resetear estado después de cerrar
        setTimeout(() => {
          setExamenGuardado(null);
        }, 100);
      }, 500);

    } catch (e) {
      console.error('Error guardando examen:', e);
      setError(e.message || 'No se pudo guardar el examen');
      setCargando(false);
    }
  };

  const handleVolver = () => {
    onClose();
  };

  if (!abierto) return null;

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4"
      style={{ 
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(4px)'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !cargando) {
          onClose();
        }
      }}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col"
        style={{ position: 'relative', zIndex: 10000 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header simplificado */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-gray-100 flex-shrink-0 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#e6f4f2] flex items-center justify-center">
              <span className="text-[#0f766e] font-bold text-sm">E</span>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">
                {examenGuardado ? '¡Examen creado!' : 'Crear Examen'}
              </h3>
              <p className="text-xs text-gray-400">
                {examenGuardado 
                  ? 'El examen se ha guardado correctamente' 
                  : `Para el curso: ${cursoTitulo}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={cargando}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido - CreadorExamen completo */}
        <div className="flex-1 overflow-y-auto bg-gray-50/30">
          {error && (
            <div className="mx-4 mt-4 bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-lg">
              {error}
            </div>
          )}
          
          {examenGuardado ? (
            <div className="flex flex-col items-center justify-center py-20 px-4">
              <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
                <svg className="w-10 h-10 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h4 className="text-xl font-bold text-gray-900">¡Examen creado con éxito!</h4>
              <p className="text-sm text-gray-500 mt-1 text-center max-w-md">
                El examen "{examenGuardado.titulo}" ha sido creado y ya está disponible para asignar al curso.
              </p>
              <div className="flex items-center gap-3 mt-6">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cerrar
                </button>
                <button
                  onClick={() => {
                    onExamenCreado(examenGuardado);
                    onClose();
                  }}
                  className="px-6 py-2 text-sm font-medium text-white rounded-lg transition-colors"
                  style={{ backgroundColor: '#0f766e' }}
                >
                  Asignar al curso
                </button>
              </div>
            </div>
          ) : (
            <CreadorExamen
              examenInicial={null}
              onGuardar={handleGuardarExamen}
              onVolver={handleVolver}
              grupoId={null}
            />
          )}
        </div>

        {/* Footer con estado de carga */}
        {cargando && !examenGuardado && (
          <div className="flex items-center justify-center px-6 py-3 border-t border-gray-100 flex-shrink-0 bg-white">
            <Loader2 className="w-5 h-5 animate-spin text-[#0f766e]" />
            <span className="ml-2 text-sm text-gray-500">Guardando examen...</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ModalCrearExamenRapido;