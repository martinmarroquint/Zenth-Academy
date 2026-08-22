// front/src/components/cursos/ModalCrearExamenRapido.jsx
// MODAL QUE REUTILIZA EL CREADOR DE EXÁMENES COMPLETO
// REEMPLAZA EL MODAL SIMPLIFICADO ANTERIOR

import React, { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import CreadorExamen from '../examenes/CreadorExamen';

const ModalCrearExamenRapido = ({ 
  abierto, 
  onClose, 
  onExamenCreado,
  grupoId = null 
}) => {
  const [cargando, setCargando] = useState(false);

  const handleGuardar = async (examen) => {
    setCargando(true);
    try {
      onExamenCreado(examen);
      onClose();
    } catch (e) {
      console.error('Error al crear examen:', e);
    } finally {
      setCargando(false);
    }
  };

  if (!abierto) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Crear examen completo</h2>
            <p className="text-xs text-gray-400">Todas las funcionalidades del creador de exámenes</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body - CreadorExamen completo */}
        <div className="flex-1 overflow-y-auto p-4">
          {cargando ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
              <span className="ml-2 text-gray-500">Creando examen...</span>
            </div>
          ) : (
            <CreadorExamen
              examenInicial={null}
              onGuardar={handleGuardar}
              onVolver={() => {}} 
              grupoId={grupoId}
            />
          )}
        </div>

        {/* Footer con instrucciones */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200 flex-shrink-0 bg-gray-50">
          <p className="text-xs text-gray-400">
            El examen se asignará automáticamente a la lección al guardarlo
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalCrearExamenRapido;