// front/src/components/cursos/ModalCrearExamenRapido.jsx
// PANTALLA COMPLETA QUE INTEGRA EL CREADOR DE EXAMENES COMPLETO
// Redirige al panel de examenes completo para no perder funcionalidades

import React, { useState, useEffect } from 'react';
import { X, Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react';
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

  // Bloquear scroll del body cuando esta abierto
  useEffect(() => {
    if (abierto) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [abierto]);

  const handleGuardarExamen = async (examenData) => {
    setCargando(true);
    setError('');

    try {
      const data = {
        ...examenData,
        titulo: examenData.titulo || `Examen - ${cursoTitulo}`,
        curso_titulo: cursoTitulo
      };

      let creado;
      
      if (examenData.id) {
        creado = await examenesService.actualizarExamen(examenData.id, data);
      } else {
        creado = await examenesService.crearExamen(data);
      }
      
      setExamenGuardado(creado);
      
      if (onExamenCreado) {
        onExamenCreado(creado);
      }

    } catch (e) {
      console.error('Error guardando examen:', e);
      setError(e.message || 'No se pudo guardar el examen');
      setCargando(false);
    }
  };

  const handleVolver = () => {
    onClose();
  };

  const handleAsignarYCerrar = () => {
    if (examenGuardado && onExamenCreado) {
      onExamenCreado(examenGuardado);
    }
    setExamenGuardado(null);
    onClose();
  };

  const handleCerrarSinAsignar = () => {
    setExamenGuardado(null);
    onClose();
  };

  if (!abierto) return null;

  // Vista de exito
  if (examenGuardado) {
    return (
      <div className="fixed inset-0 z-[9999] bg-white flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Examen creado con exito</h2>
              <p className="text-sm text-gray-500">
                "{examenGuardado.titulo}" esta listo para asignar
              </p>
            </div>
          </div>
        </div>

        {/* Contenido central */}
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <div className="max-w-md text-center">
            <div className="w-24 h-24 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-12 h-12 text-emerald-500" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Examen guardado</h3>
            <p className="text-gray-500 mb-8">
              El examen "{examenGuardado.titulo}" se ha creado correctamente y esta disponible para asignar al curso "{cursoTitulo}".
            </p>
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={handleCerrarSinAsignar}
                className="px-6 py-3 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
              >
                Cerrar
              </button>
              <button
                onClick={handleAsignarYCerrar}
                className="px-8 py-3 text-sm font-medium text-white bg-[#0f766e] hover:bg-[#0d5e57] rounded-xl transition-colors"
              >
                Asignar al curso
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Vista del creador de examen (pantalla completa)
  return (
    <div className="fixed inset-0 z-[9999] bg-white flex flex-col">
      {/* Header - Panel de examenes */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200 bg-white flex-shrink-0 shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={handleVolver}
            disabled={cargando}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver al curso
          </button>
          <div className="h-6 w-px bg-gray-200" />
          <div>
            <h2 className="text-base font-bold text-gray-900">Crear Examen</h2>
            <p className="text-xs text-gray-400">Para el curso: {cursoTitulo}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {cargando && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 rounded-lg">
              <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
              <span className="text-xs text-amber-600 font-medium">Guardando...</span>
            </div>
          )}
          <button
            onClick={handleVolver}
            disabled={cargando}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Contenido - CreadorExamen completo */}
      <div className="flex-1 overflow-y-auto bg-gray-50">
        {error && (
          <div className="mx-6 mt-4 bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-lg flex items-center gap-2">
            <span className="font-medium">Error:</span> {error}
            <button onClick={() => setError('')} className="ml-auto text-red-400 hover:text-red-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        
        <CreadorExamen
          examen={null}
          onGuardar={handleGuardarExamen}
          onVolver={handleVolver}
          grupoId={null}
        />
      </div>
    </div>
  );
};

export default ModalCrearExamenRapido;
