// front/src/components/modals/ModalSolicitudDocente.jsx
// MODAL PARA SOLICITAR SER DOCENTE

import React, { useState, useEffect } from 'react';
import {
  X, GraduationCap, Loader2, AlertCircle, CheckCircle,
  Building2, BookOpen, Clock, FileText, Link as LinkIcon, Send
} from 'lucide-react';
import solicitudesDocenteService from '../../services/solicitudesDocenteService';

const ModalSolicitudDocente = ({ abierto, onCerrar, onSolicitudEnviada }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [solicitudExistente, setSolicitudExistente] = useState(null);

  const [formData, setFormData] = useState({
    especialidad: '',
    institucion: '',
    experiencia_anos: '',
    experiencia_detalle: '',
    motivacion: '',
    portafolio_url: '',
    documentos_url: '',
  });

  // Verificar solicitud existente al abrir
  useEffect(() => {
    if (abierto) {
      verificarSolicitud();
    }
  }, [abierto]);

  const verificarSolicitud = async () => {
    try {
      const solicitudes = await solicitudesDocenteService.misSolicitudes();
      const pendiente = solicitudes.find(s => 
        s.estado === 'pendiente' || s.estado === 'en_revision'
      );
      if (pendiente) {
        setSolicitudExistente(pendiente);
      } else {
        setSolicitudExistente(null);
      }
    } catch (e) {
      // Silenciar
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!formData.especialidad.trim()) {
        setError('La especialidad es obligatoria');
        setLoading(false);
        return;
      }

      if (!formData.experiencia_detalle.trim()) {
        setError('Describe tu experiencia profesional');
        setLoading(false);
        return;
      }

      if (!formData.motivacion.trim()) {
        setError('Cuéntanos tu motivación para ser docente');
        setLoading(false);
        return;
      }

      await solicitudesDocenteService.crear(formData);
      setSuccess(true);
      
      setTimeout(() => {
        onSolicitudEnviada();
        // Reset form
        setFormData({
          especialidad: '',
          institucion: '',
          experiencia_anos: '',
          experiencia_detalle: '',
          motivacion: '',
          portafolio_url: '',
          documentos_url: '',
        });
        setSuccess(false);
        setSolicitudExistente(null);
      }, 2000);
    } catch (e) {
      console.error('Error:', e);
      setError(e.response?.data?.detail || 'Error al enviar la solicitud');
    } finally {
      setLoading(false);
    }
  };

  const handleCerrar = () => {
    setFormData({
      especialidad: '',
      institucion: '',
      experiencia_anos: '',
      experiencia_detalle: '',
      motivacion: '',
      portafolio_url: '',
      documentos_url: '',
    });
    setError('');
    setSuccess(false);
    setSolicitudExistente(null);
    onCerrar();
  };

  if (!abierto) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleCerrar}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#e6f4f2' }}>
              <GraduationCap className="w-5 h-5" style={{ color: '#0f766e' }} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Ser Docente</h2>
              <p className="text-xs text-gray-400">Solicita acceso para enseñar</p>
            </div>
          </div>
          <button
            onClick={handleCerrar}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido */}
        <div className="overflow-y-auto max-h-[calc(90vh-140px)] p-6">
          {/* Si ya tiene solicitud pendiente */}
          {solicitudExistente ? (
            <div className="text-center py-6">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                solicitudExistente.estado === 'en_revision' ? 'bg-blue-50' : 'bg-amber-50'
              }`}>
                {solicitudExistente.estado === 'en_revision' ? (
                  <Clock className="w-8 h-8 text-blue-600" />
                ) : (
                  <Send className="w-8 h-8 text-amber-600" />
                )}
              </div>
              
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {solicitudExistente.estado === 'en_revision' 
                  ? 'Tu solicitud está siendo revisada' 
                  : 'Solicitud enviada'}
              </h3>
              
              <p className="text-sm text-gray-500 mb-4">
                {solicitudExistente.estado === 'en_revision'
                  ? 'Un administrador está revisando tu solicitud. Te notificaremos cuando se apruebe.'
                  : 'Tu solicitud está en cola de revisión. Te notificaremos cuando sea procesada.'}
              </p>

              <div className="bg-gray-50 rounded-xl p-4 text-left mb-4">
                <p className="text-xs text-gray-400 mb-1">Especialidad:</p>
                <p className="text-sm text-gray-700">{solicitudExistente.especialidad}</p>
              </div>

              <button
                onClick={handleCerrar}
                className="px-6 py-2.5 text-sm font-medium text-white rounded-xl transition-colors"
                style={{ backgroundColor: '#0f766e' }}
              >
                Cerrar
              </button>
            </div>
          ) : success ? (
            /* Éxito */
            <div className="text-center py-6">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: '#e6f4f2' }}>
                <CheckCircle className="w-8 h-8" style={{ color: '#0f766e' }} />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">¡Solicitud Enviada!</h3>
              <p className="text-sm text-gray-400 mt-1">
                Un administrador revisará tu solicitud pronto.
              </p>
            </div>
          ) : (
            /* Formulario */
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-sm text-red-600">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              {/* Especialidad */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Especialidad * <span className="text-xs text-gray-400">(áreas que dominas)</span>
                </label>
                <div className="relative">
                  <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <input
                    type="text"
                    name="especialidad"
                    value={formData.especialidad}
                    onChange={handleChange}
                    placeholder="Ej: Matemáticas, Programación..."
                    className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-200 transition-all"
                    style={{ '--tw-ring-color': '#0f766e' }}
                    required
                  />
                </div>
              </div>

              {/* Institución */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Institución Educativa
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <input
                    type="text"
                    name="institucion"
                    value={formData.institucion}
                    onChange={handleChange}
                    placeholder="Universidad, Instituto..."
                    className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-200 transition-all"
                    style={{ '--tw-ring-color': '#0f766e' }}
                  />
                </div>
              </div>

              {/* Años de experiencia */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Años de Experiencia
                </label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <input
                    type="text"
                    name="experiencia_anos"
                    value={formData.experiencia_anos}
                    onChange={handleChange}
                    placeholder="Ej: 5 años"
                    className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-200 transition-all"
                    style={{ '--tw-ring-color': '#0f766e' }}
                  />
                </div>
              </div>

              {/* Experiencia detallada */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Experiencia Profesional * <span className="text-xs text-gray-400">(describe tu trayectoria)</span>
                </label>
                <textarea
                  name="experiencia_detalle"
                  value={formData.experiencia_detalle}
                  onChange={handleChange}
                  placeholder="Describe tu experiencia enseñando, proyectos, certificaciones..."
                  rows={3}
                  className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-200 transition-all resize-none"
                  style={{ '--tw-ring-color': '#0f766e' }}
                  required
                />
              </div>

              {/* Motivación */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ¿Por qué quieres ser docente? *
                </label>
                <textarea
                  name="motivacion"
                  value={formData.motivacion}
                  onChange={handleChange}
                  placeholder="Cuéntanos tu motivación..."
                  rows={2}
                  className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-200 transition-all resize-none"
                  style={{ '--tw-ring-color': '#0f766e' }}
                  required
                />
              </div>

              {/* Portafolio */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  URL de Portafolio <span className="text-xs text-gray-400">(opcional)</span>
                </label>
                <div className="relative">
                  <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <input
                    type="url"
                    name="portafolio_url"
                    value={formData.portafolio_url}
                    onChange={handleChange}
                    placeholder="https://tuportafolio.com"
                    className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-200 transition-all"
                    style={{ '--tw-ring-color': '#0f766e' }}
                  />
                </div>
              </div>

              {/* Documentos */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  URL de Documentos <span className="text-xs text-gray-400">(certificados - opcional)</span>
                </label>
                <div className="relative">
                  <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <input
                    type="url"
                    name="documentos_url"
                    value={formData.documentos_url}
                    onChange={handleChange}
                    placeholder="https://drive.google.com/..."
                    className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-200 transition-all"
                    style={{ '--tw-ring-color': '#0f766e' }}
                  />
                </div>
              </div>
            </form>
          )}
        </div>

        {/* Footer - Botones */}
        {!solicitudExistente && !success && (
          <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
            <button
              onClick={handleCerrar}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-white rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ backgroundColor: '#0f766e' }}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Enviar Solicitud
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ModalSolicitudDocente;
