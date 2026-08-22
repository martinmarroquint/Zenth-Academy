// front/src/components/certificados/GenerarCertificado.jsx

import React, { useState } from 'react';
import {
  ArrowLeft, Award, User, BookOpen, Calendar,
  CheckCircle, Loader2, Download, Share2, Printer
} from 'lucide-react';
import certificadosService from '../../services/certificadosService';
import api from '../../services/api';

const GenerarCertificado = ({ cursoId, onVolver, onGenerado }) => {
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [generado, setGenerado] = useState(false);
  const [certificadoGenerado, setCertificadoGenerado] = useState(null);
  const [datos, setDatos] = useState({
    nombre: '',
    curso: '',
    fecha: new Date().toISOString().split('T')[0]
  });

  const handleGenerar = async () => {
    if (!datos.nombre.trim() || !datos.curso.trim()) return;
    setCargando(true);
    setError('');
    try {
      const usuarioActual = api.getCurrentUser?.() || {};
      const payload = {
        estudiante_id: usuarioActual?.id || usuarioActual?.usuario_id || 'estudiante-generico',
        estudiante_nombre: datos.nombre.trim(),
        curso_id: cursoId || 'curso-generico',
        curso_titulo: datos.curso.trim(),
        docente_id: usuarioActual?.id || usuarioActual?.usuario_id || 'docente-generico',
        docente_nombre: usuarioActual?.nombre || usuarioActual?.usuario || ''
      };
      const creado = await certificadosService.crear(payload);
      setCertificadoGenerado(creado);
      setGenerado(true);
      if (onGenerado) onGenerado();
    } catch (e) {
      console.error('Error generando certificado:', e);
      setError(e.message || 'No se pudo generar el certificado');
    } finally {
      setCargando(false);
    }
  };

  const handleDescargar = () => {
    if (certificadoGenerado?.id) {
      certificadosService.obtener(certificadoGenerado.id)
        .then(() => alert('Descarga disponible. La generación de PDF se añadirá próximamente.'))
        .catch(() => alert('No se pudo descargar el certificado'));
    } else {
      alert('Descargando certificado...');
    }
  };

  if (generado) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">¡Certificado Generado!</h2>
          <p className="text-sm text-gray-500 mt-1">El certificado se ha creado correctamente</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <div className="border-2 border-gray-200 rounded-lg p-6">
            <Award className="w-16 h-16 text-amber-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900">Certificado de Finalización</h3>
            <p className="text-sm text-gray-500 mt-1">Otorgado a</p>
            <p className="text-lg font-semibold text-gray-900 mt-2">{datos.nombre || 'Estudiante'}</p>
            <p className="text-sm text-gray-500 mt-3">Por completar el curso</p>
            <p className="text-md font-medium text-gray-800">{datos.curso || 'Curso'}</p>
            <p className="text-xs text-gray-400 mt-4">Código: {certificadoGenerado?.codigo || ''}</p>
            <p className="text-xs text-gray-400">Fecha: {new Date(certificadoGenerado?.fecha_emision || datos.fecha).toLocaleDateString()}</p>
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

        <div className="flex justify-center">
          <button
            onClick={onVolver}
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            Volver a certificados
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onVolver}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver
        </button>
        <h2 className="text-lg font-semibold text-gray-900">Generar Certificado</h2>
        <div className="w-20" />
      </div>

      {/* Formulario */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-lg">
            {error}
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nombre del estudiante
          </label>
          <input
            type="text"
            value={datos.nombre}
            onChange={(e) => setDatos({ ...datos, nombre: e.target.value })}
            placeholder="Nombre completo"
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-gray-300 transition-colors"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Curso
          </label>
          <input
            type="text"
            value={datos.curso}
            onChange={(e) => setDatos({ ...datos, curso: e.target.value })}
            placeholder="Nombre del curso"
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-gray-300 transition-colors"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Fecha de emisión
          </label>
          <input
            type="date"
            value={datos.fecha}
            onChange={(e) => setDatos({ ...datos, fecha: e.target.value })}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-gray-300 transition-colors"
          />
        </div>

        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-gray-500">
            <span className="font-medium">Código:</span> {certificadoGenerado?.codigo || 'Se generará al crear'}
          </p>
        </div>

        <button
          onClick={handleGenerar}
          disabled={cargando || !datos.nombre || !datos.curso}
          className="w-full py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 text-sm disabled:opacity-50"
        >
          {cargando ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Generando...
            </>
          ) : (
            <>
              <Award className="w-4 h-4" />
              Generar Certificado
            </>
          )}
        </button>
      </div>

      {/* Información adicional */}
      <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Información</h4>
        <ul className="text-xs text-gray-500 space-y-1">
          <li>• El certificado incluirá el nombre del estudiante y el curso</li>
          <li>• Se generará un código único de verificación</li>
          <li>• Puedes descargarlo en formato PDF o imprimirlo</li>
        </ul>
      </div>
    </div>
  );
};

export default GenerarCertificado;