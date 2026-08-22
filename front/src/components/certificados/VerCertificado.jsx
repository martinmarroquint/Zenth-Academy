// front/src/components/certificados/VerCertificado.jsx
import React, { useState, useEffect } from 'react';
import {
  ArrowLeft, Award, Loader2, Download, Printer, Share2
} from 'lucide-react';
import certificadosService from '../../services/certificadosService';

const VerCertificado = ({ certificadoId, onVolver }) => {
  const [certificado, setCertificado] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!certificadoId) return;
    setCargando(true);
    setError('');
    certificadosService.obtener(certificadoId)
      .then((data) => setCertificado(data))
      .catch((e) => {
        console.error('Error cargando certificado:', e);
        setError(e.message || 'No se pudo cargar el certificado');
      })
      .finally(() => setCargando(false));
  }, [certificadoId]);

  if (cargando) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <p className="text-red-500 text-sm mb-4">{error}</p>
        <button onClick={onVolver} className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm">
          Volver
        </button>
      </div>
    );
  }

  if (!certificado) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500">Certificado no encontrado</p>
        <button onClick={onVolver} className="mt-4 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm">
          Volver
        </button>
      </div>
    );
  }

  const handleDescargar = () => {
    alert('La descarga de PDF se añadirá próximamente.');
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={onVolver}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver
        </button>
        <h2 className="text-lg font-semibold text-gray-900">Certificado</h2>
        <div className="w-20" />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
        <div className="border-2 border-gray-200 rounded-lg p-6">
          <Award className="w-16 h-16 text-amber-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900">Certificado de Finalización</h3>
          <p className="text-sm text-gray-500 mt-1">Otorgado a</p>
          <p className="text-lg font-semibold text-gray-900 mt-2">{certificado.estudiante_nombre}</p>
          <p className="text-sm text-gray-500 mt-3">Por completar el curso</p>
          <p className="text-md font-medium text-gray-800">{certificado.curso_titulo}</p>
          <p className="text-xs text-gray-400 mt-4">Código: {certificado.codigo}</p>
          <p className="text-xs text-gray-400">Fecha: {new Date(certificado.fecha_emision || Date.now()).toLocaleDateString()}</p>
        </div>

        <div className="flex items-center justify-center gap-3 mt-6">
          <button
            onClick={handleDescargar}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 text-sm"
          >
            <Download className="w-4 h-4" />
            Descargar
          </button>
          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors flex items-center gap-2 text-sm"
          >
            <Printer className="w-4 h-4" />
            Imprimir
          </button>
          <button
            className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2 text-sm"
          >
            <Share2 className="w-4 h-4" />
            Compartir
          </button>
        </div>
      </div>
    </div>
  );
};

export default VerCertificado;