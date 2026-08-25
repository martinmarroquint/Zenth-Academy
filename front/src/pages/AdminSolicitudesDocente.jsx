// front/src/pages/AdminSolicitudesDocente.jsx
// ADMIN: BANDEJA DE ENTRADA DE SOLICITUDES DE DOCENTE

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GraduationCap, Loader2, AlertCircle, CheckCircle, XCircle,
  ArrowLeft, Clock, Send, Eye, User, Building2, BookOpen,
  FileText, Link as LinkIcon, MessageSquare, Check, X
} from 'lucide-react';
import solicitudesDocenteService from '../services/solicitudesDocenteService';

const AdminSolicitudesDocente = () => {
  const navigate = useNavigate();
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('pendiente'); // pendiente, en_revision, aprobado, rechazado, todas
  const [solicitudSeleccionada, setSolicitudSeleccionada] = useState(null);
  const [comentario, setComentario] = useState('');
  const [procesando, setProcesando] = useState(false);

  useEffect(() => {
    cargarSolicitudes();
  }, [filtro]);

  const cargarSolicitudes = async () => {
    setLoading(true);
    try {
      const filtros = {};
      if (filtro !== 'todas') {
        filtros.estado = filtro;
      }
      const result = await solicitudesDocenteService.listar(filtros);
      setSolicitudes(result?.solicitudes || []);
    } catch (e) {
      console.error('Error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleMarcarEnRevision = async (id) => {
    try {
      await solicitudesDocenteService.marcarEnRevision(id);
      cargarSolicitudes();
      setSolicitudSeleccionada(null);
    } catch (e) {
      console.error('Error:', e);
    }
  };

  const handleAprobar = async (id) => {
    setProcesando(true);
    try {
      await solicitudesDocenteService.aprobar(id, comentario);
      cargarSolicitudes();
      setSolicitudSeleccionada(null);
      setComentario('');
    } catch (e) {
      console.error('Error:', e);
    } finally {
      setProcesando(false);
    }
  };

  const handleRechazar = async (id) => {
    if (!comentario.trim()) {
      alert('Por favor, agrega un comentario explicando el motivo del rechazo');
      return;
    }
    setProcesando(true);
    try {
      await solicitudesDocenteService.rechazar(id, comentario);
      cargarSolicitudes();
      setSolicitudSeleccionada(null);
      setComentario('');
    } catch (e) {
      console.error('Error:', e);
    } finally {
      setProcesando(false);
    }
  };

  const formatearFecha = (fecha) => {
    if (!fecha) return '—';
    try {
      return new Date(fecha).toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return fecha;
    }
  };

  const getEstadoBadge = (estado) => {
    const badges = {
      pendiente: { color: 'bg-amber-100 text-amber-700', icon: Clock, text: 'Pendiente' },
      en_revision: { color: 'bg-blue-100 text-blue-700', icon: Eye, text: 'En Revisión' },
      aprobado: { color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle, text: 'Aprobado' },
      rechazado: { color: 'bg-red-100 text-red-700', icon: XCircle, text: 'Rechazado' },
    };
    return badges[estado] || badges.pendiente;
  };

  // Vista de detalle de solicitud
  if (solicitudSeleccionada) {
    const sol = solicitudSeleccionada;
    const estado = getEstadoBadge(sol.estado);
    const EstadoIcon = estado.icon;

    return (
      <div className="min-h-screen bg-[#fbfbfa] p-4">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <button
              onClick={() => { setSolicitudSeleccionada(null); setComentario(''); }}
              className="flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors text-sm mb-4"
            >
              <ArrowLeft className="w-4 h-4" /> Volver a solicitudes
            </button>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-amber-50">
                  <GraduationCap className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Solicitud de Docente</h1>
                  <p className="text-sm text-gray-400">{sol.usuario_nombre || sol.usuario_email}</p>
                </div>
              </div>
              
              <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 ${estado.color}`}>
                <EstadoIcon className="w-3.5 h-3.5" />
                {estado.text}
              </span>
            </div>
          </div>

          {/* Contenido */}
          <div className="space-y-4">
            {/* Información del solicitante */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <User className="w-4 h-4" />
                Información del Solicitante
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-400 mb-1">Nombre</p>
                  <p className="text-sm text-gray-700">{sol.usuario_nombre || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">Email</p>
                  <p className="text-sm text-gray-700">{sol.usuario_email || '—'}</p>
                </div>
              </div>
            </div>

            {/* Experiencia */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                Experiencia y Especialidad
              </h3>
              
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-gray-400 mb-1">Especialidad</p>
                  <p className="text-sm text-gray-700">{sol.especialidad}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Institución</p>
                    <p className="text-sm text-gray-700">{sol.institucion || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Años de Experiencia</p>
                    <p className="text-sm text-gray-700">{sol.experiencia_anos || '—'}</p>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-gray-400 mb-1">Detalle de Experiencia</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{sol.experiencia_detalle || '—'}</p>
                </div>

                <div>
                  <p className="text-xs text-gray-400 mb-1">Motivación</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{sol.motivacion || '—'}</p>
                </div>
              </div>
            </div>

            {/* Links */}
            {(sol.portafolio_url || sol.documentos_url) && (
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <LinkIcon className="w-4 h-4" />
                  Enlaces
                </h3>
                
                <div className="space-y-2">
                  {sol.portafolio_url && (
                    <a
                      href={sol.portafolio_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-teal-600 hover:underline"
                    >
                      <LinkIcon className="w-4 h-4" />
                      Portafolio
                    </a>
                  )}
                  {sol.documentos_url && (
                    <a
                      href={sol.documentos_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-teal-600 hover:underline"
                    >
                      <FileText className="w-4 h-4" />
                      Documentos respaldo
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Información de revisión */}
            {sol.estado !== 'pendiente' && (
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Revisión
                </h3>
                
                <div className="space-y-2">
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Fecha de revisión</p>
                    <p className="text-sm text-gray-700">{formatearFecha(sol.fecha_revision)}</p>
                  </div>
                  {sol.comentario_admin && (
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Comentario del admin</p>
                      <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">{sol.comentario_admin}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Acciones */}
            {sol.estado === 'pendiente' && (
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Acciones</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Comentario (requerido para rechazar)
                    </label>
                    <textarea
                      value={comentario}
                      onChange={(e) => setComentario(e.target.value)}
                      placeholder="Agregar comentario o feedback..."
                      rows={3}
                      className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-200 transition-all resize-none"
                      style={{ '--tw-ring-color': '#0f766e' }}
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => handleMarcarEnRevision(sol.id)}
                      className="flex-1 py-2.5 text-sm font-medium text-blue-700 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors flex items-center justify-center gap-2"
                    >
                      <Eye className="w-4 h-4" />
                      Marcar en Revisión
                    </button>
                    
                    <button
                      onClick={() => handleRechazar(sol.id)}
                      disabled={procesando}
                      className="flex-1 py-2.5 text-sm font-medium text-red-700 bg-red-50 rounded-xl hover:bg-red-100 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {procesando ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <X className="w-4 h-4" />
                      )}
                      Rechazar
                    </button>
                    
                    <button
                      onClick={() => handleAprobar(sol.id)}
                      disabled={procesando}
                      className="flex-1 py-2.5 text-sm font-medium text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {procesando ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                      Aprobar
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Fecha de solicitud */}
            <div className="text-center text-xs text-gray-400">
              Solicitud enviada: {formatearFecha(sol.created_at)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Vista de lista
  return (
    <div className="min-h-screen bg-[#fbfbfa] p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/admin')}
            className="flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors text-sm mb-4"
          >
            <ArrowLeft className="w-4 h-4" /> Volver al Admin
          </button>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-amber-50">
                <GraduationCap className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Solicitudes de Docente</h1>
                <p className="text-sm text-gray-400">{solicitudes.length} solicitudes</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {[
            { id: 'pendiente', label: 'Pendientes', color: 'amber' },
            { id: 'en_revision', label: 'En Revisión', color: 'blue' },
            { id: 'aprobado', label: 'Aprobados', color: 'emerald' },
            { id: 'rechazado', label: 'Rechazados', color: 'red' },
            { id: 'todas', label: 'Todas', color: 'gray' },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFiltro(f.id)}
              className={`px-4 py-2 text-sm font-medium rounded-xl whitespace-nowrap transition-colors ${
                filtro === f.id
                  ? 'bg-gray-900 text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Contenido */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : solicitudes.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
            <GraduationCap className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">
              No hay solicitudes {filtro !== 'todas' ? `con estado "${filtro}"` : ''}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {solicitudes.map((sol) => {
              const estado = getEstadoBadge(sol.estado);
              const EstadoIcon = estado.icon;
              
              return (
                <div
                  key={sol.id}
                  className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-all cursor-pointer"
                  onClick={() => setSolicitudSeleccionada(sol)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
                        <User className="w-5 h-5 text-amber-600" />
                      </div>
                      
                      <div>
                        <h3 className="text-sm font-medium text-gray-900">
                          {sol.usuario_nombre || sol.usuario_email}
                        </h3>
                        <p className="text-xs text-gray-400">{sol.especialidad}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {formatearFecha(sol.created_at)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 ${estado.color}`}>
                        <EstadoIcon className="w-3 h-3" />
                        {estado.text}
                      </span>
                      
                      <button className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                        Ver detalle
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminSolicitudesDocente;
