// front/src/pages/SolicitarDocente.jsx
// PÁGINA PARA SOLICITAR SER DOCENTE

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GraduationCap, Loader2, AlertCircle, CheckCircle,
  ArrowLeft, Building2, BookOpen, Clock, FileText,
  Link as LinkIcon, Send, X
} from 'lucide-react';
import { authService } from '../services/authService';
import solicitudesDocenteService from '../services/solicitudesDocenteService';

const SolicitarDocente = () => {
  const navigate = useNavigate();
  const usuario = authService.getCurrentUser();
  const [loading, setLoading] = useState(false);
  const [loadingSolicitud, setLoadingSolicitud] = useState(true);
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

  // Verificar si ya tiene una solicitud pendiente
  useEffect(() => {
    const verificarSolicitud = async () => {
      try {
        const solicitudes = await solicitudesDocenteService.misSolicitudes();
        const pendiente = solicitudes.find(s => 
          s.estado === 'pendiente' || s.estado === 'en_revision'
        );
        if (pendiente) {
          setSolicitudExistente(pendiente);
        }
      } catch (e) {
        console.warn('Error verificando solicitud:', e);
      } finally {
        setLoadingSolicitud(false);
      }
    };
    verificarSolicitud();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Validaciones básicas
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

      const result = await solicitudesDocenteService.crear(formData);
      
      if (result) {
        setSuccess(true);
        setTimeout(() => {
          navigate('/estudiante');
        }, 2500);
      }
    } catch (e) {
      console.error('Error:', e);
      setError(e.response?.data?.detail || 'Error al enviar la solicitud');
    } finally {
      setLoading(false);
    }
  };

  // Si ya tiene solicitud pendiente
  if (loadingSolicitud) {
    return (
      <div className="min-h-screen bg-[#fbfbfa] flex items-center justify-center p-4">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (solicitudExistente) {
    return (
      <div className="min-h-screen bg-[#fbfbfa] flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-sm" style={{ backgroundColor: '#e6f4f2', borderColor: '#0f766e' }}>
              <GraduationCap className="w-7 h-7" style={{ color: '#0f766e' }} />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Solicitud en Proceso</h1>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <div className="text-center">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                solicitudExistente.estado === 'en_revision' 
                  ? 'bg-blue-50' 
                  : 'bg-amber-50'
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
                onClick={() => navigate('/estudiante')}
                className="w-full py-2.5 text-sm font-medium text-white rounded-xl transition-colors"
                style={{ backgroundColor: '#0f766e' }}
              >
                Volver al Inicio
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Si ya es docente
  if (usuario?.rol === 'docente' || usuario?.rol === 'admin') {
    return (
      <div className="min-h-screen bg-[#fbfbfa] flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-sm" style={{ backgroundColor: '#e6f4f2', borderColor: '#0f766e' }}>
              <GraduationCap className="w-7 h-7" style={{ color: '#0f766e' }} />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Ya eres Docente</h1>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 bg-emerald-50">
                <CheckCircle className="w-8 h-8 text-emerald-600" />
              </div>
              
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                ¡Ya tienes acceso de docente!
              </h3>
              
              <p className="text-sm text-gray-500 mb-4">
                Puedes crear y gestionar cursos desde tu panel de docente.
              </p>

              <button
                onClick={() => navigate('/docente')}
                className="w-full py-2.5 text-sm font-medium text-white rounded-xl transition-colors"
                style={{ backgroundColor: '#0f766e' }}
              >
                Ir al Panel de Docente
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Formulario de solicitud
  return (
    <div className="min-h-screen bg-[#fbfbfa] p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/estudiante')}
            className="flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors text-sm mb-4"
          >
            <ArrowLeft className="w-4 h-4" /> Volver
          </button>
          
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#e6f4f2' }}>
              <GraduationCap className="w-6 h-6" style={{ color: '#0f766e' }} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Solicitar ser Docente</h1>
              <p className="text-sm text-gray-400">Completa el formulario para comenzar a enseñar</p>
            </div>
          </div>
        </div>

        {/* Formulario */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          {success ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: '#e6f4f2' }}>
                <CheckCircle className="w-8 h-8" style={{ color: '#0f766e' }} />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">¡Solicitud Enviada!</h3>
              <p className="text-sm text-gray-400 mt-1">
                Un administrador revisará tu solicitud pronto.
              </p>
            </div>
          ) : (
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
                  <BookOpen className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                  <input
                    type="text"
                    name="especialidad"
                    value={formData.especialidad}
                    onChange={handleChange}
                    placeholder="Ej: Matemáticas, Programación, Física..."
                    className="w-full pl-14 pr-4 py-3 text-sm border border-gray-200 rounded-xl outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-200 transition-all"
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
                  <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                  <input
                    type="text"
                    name="institucion"
                    value={formData.institucion}
                    onChange={handleChange}
                    placeholder="Universidad, Instituto, Escuela..."
                    className="w-full pl-14 pr-4 py-3 text-sm border border-gray-200 rounded-xl outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-200 transition-all"
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
                  <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                  <input
                    type="text"
                    name="experiencia_anos"
                    value={formData.experiencia_anos}
                    onChange={handleChange}
                    placeholder="Ej: 5 años"
                    className="w-full pl-14 pr-4 py-3 text-sm border border-gray-200 rounded-xl outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-200 transition-all"
                    style={{ '--tw-ring-color': '#0f766e' }}
                  />
                </div>
              </div>

              {/* Experiencia detallada */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Experiencia Profesional * <span className="text-xs text-gray-400">(describe tu trayectoria)</span>
                </label>
                <div className="relative">
                  <FileText className="absolute left-4 top-3 w-5 h-5 text-gray-400 pointer-events-none" />
                  <textarea
                    name="experiencia_detalle"
                    value={formData.experiencia_detalle}
                    onChange={handleChange}
                    placeholder="Describe tu experiencia enseñando, proyectos realizados, certificaciones, logros..."
                    rows={4}
                    className="w-full pl-14 pr-4 py-3 text-sm border border-gray-200 rounded-xl outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-200 transition-all resize-none"
                    style={{ '--tw-ring-color': '#0f766e' }}
                    required
                  />
                </div>
              </div>

              {/* Motivación */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ¿Por qué quieres ser docente? * <span className="text-xs text-gray-400">(tu motivación)</span>
                </label>
                <textarea
                  name="motivacion"
                  value={formData.motivacion}
                  onChange={handleChange}
                  placeholder="Cuéntanos qué te motiva a enseñar, qué objetivo tienes como docente..."
                  rows={3}
                  className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-200 transition-all resize-none"
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
                  <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                  <input
                    type="url"
                    name="portafolio_url"
                    value={formData.portafolio_url}
                    onChange={handleChange}
                    placeholder="https://tuportafolio.com"
                    className="w-full pl-14 pr-4 py-3 text-sm border border-gray-200 rounded-xl outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-200 transition-all"
                    style={{ '--tw-ring-color': '#0f766e' }}
                  />
                </div>
              </div>

              {/* Documentos */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  URL de Documentos <span className="text-xs text-gray-400">(certificados, títulos - opcional)</span>
                </label>
                <div className="relative">
                  <FileText className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                  <input
                    type="url"
                    name="documentos_url"
                    value={formData.documentos_url}
                    onChange={handleChange}
                    placeholder="https://drive.google.com/..."
                    className="w-full pl-14 pr-4 py-3 text-sm border border-gray-200 rounded-xl outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-200 transition-all"
                    style={{ '--tw-ring-color': '#0f766e' }}
                  />
                </div>
              </div>

              {/* Botón enviar */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 text-sm font-medium text-white rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4 shadow-sm hover:shadow-md"
                style={{ backgroundColor: '#0f766e' }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#0d5e57'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#0f766e'}
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

              <p className="text-xs text-gray-400 text-center mt-3">
                Un administrador revisará tu solicitud y te notificaremos por email.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default SolicitarDocente;
