// front/src/components/docente/PanelSolicitudes.jsx
// PANEL DE SOLICITUDES DE ACCESO PARA DOCENTE

import React, { useState, useEffect } from 'react';
import {
  Loader2,
  Check,
  X,
  Clock,
  User,
  Mail,
  Phone,
  Calendar,
  CreditCard,
  Send,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import cursosService from '../../services/cursosService';

const PanelSolicitudes = ({ cursoId = null }) => {
  const [solicitudes, setSolicitudes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [procesando, setProcesando] = useState(null);
  const [filtro, setFiltro] = useState('pendientes');

  const cargarSolicitudes = async () => {
    setCargando(true);
    setError('');
    try {
      const data = await cursosService.solicitudesPendientes(cursoId);
      setSolicitudes(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Error cargando solicitudes:', e);
      setError('No se pudieron cargar las solicitudes');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarSolicitudes();
    const interval = setInterval(cargarSolicitudes, 30000);
    return () => clearInterval(interval);
  }, [cursoId]);

  const handleAprobar = async (solicitudId, estudianteNombre) => {
    if (!window.confirm(`¿Aprobar acceso para ${estudianteNombre}?`)) return;
    setProcesando(solicitudId);
    try {
      await cursosService.aprobarSolicitud(solicitudId, 'Acceso aprobado');
      await cargarSolicitudes();
    } catch (e) {
      console.error('Error aprobando solicitud:', e);
      alert(e.message || 'No se pudo aprobar la solicitud');
    } finally {
      setProcesando(null);
    }
  };

  const handleRechazar = async (solicitudId, estudianteNombre) => {
    const motivo = prompt('Motivo del rechazo (opcional):');
    if (motivo === null) return;
    if (!window.confirm(`¿Rechazar acceso para ${estudianteNombre}?`)) return;
    setProcesando(solicitudId);
    try {
      await cursosService.rechazarSolicitud(solicitudId, motivo || 'Acceso denegado');
      await cargarSolicitudes();
    } catch (e) {
      console.error('Error rechazando solicitud:', e);
      alert(e.message || 'No se pudo rechazar la solicitud');
    } finally {
      setProcesando(null);
    }
  };

  const obtenerFecha = (fecha) => {
    if (!fecha) return '';
    const d = new Date(fecha);
    return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const solicitudesFiltradas = solicitudes.filter(s => {
    if (filtro === 'pendientes') return s.estado === 'pendiente';
    if (filtro === 'aprobados') return s.estado === 'aprobado';
    if (filtro === 'rechazados') return s.estado === 'rechazado';
    return true;
  });

  const pendientes = solicitudes.filter(s => s.estado === 'pendiente').length;

  if (cargando) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 bg-gray-50">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 tracking-tight">
            Solicitudes de acceso
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Gestiona las solicitudes de acceso a tus cursos
          </p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {pendientes > 0 && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-full">
              <Clock className="w-3.5 h-3.5" />
              {pendientes} pendiente{pendientes !== 1 ? 's' : ''}
            </span>
          )}
          <button
            onClick={cargarSolicitudes}
            className="p-2.5 text-gray-400 hover:text-gray-600 transition-colors rounded-lg hover:bg-gray-100 flex items-center gap-2"
            title="Actualizar"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-2 mb-6">
        <button
          onClick={() => setFiltro('pendientes')}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            filtro === 'pendientes'
              ? 'bg-primary-dark text-white'
              : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
          }`}
        >
          Pendientes ({solicitudes.filter(s => s.estado === 'pendiente').length})
        </button>
        <button
          onClick={() => setFiltro('aprobados')}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            filtro === 'aprobados'
              ? 'bg-primary-dark text-white'
              : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
          }`}
        >
          Aprobados
        </button>
        <button
          onClick={() => setFiltro('rechazados')}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            filtro === 'rechazados'
              ? 'bg-primary-dark text-white'
              : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
          }`}
        >
          Rechazados
        </button>
      </div>

      {error && (
        <div className="error-state mb-6">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Lista de solicitudes */}
      {solicitudesFiltradas.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <Send className="w-6 h-6 text-gray-300" />
          </div>
          <p className="text-sm text-gray-500">
            {filtro === 'pendientes' 
              ? 'No hay solicitudes pendientes' 
              : filtro === 'aprobados'
                ? 'No hay solicitudes aprobadas'
                : 'No hay solicitudes rechazadas'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {solicitudesFiltradas.map((solicitud) => (
            <div
              key={solicitud.id}
              className="card-premium hover:border-primary hover:shadow-glow-primary transition-all duration-300"
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 p-5 sm:p-6">
                {/* Información del estudiante */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-md bg-primary-light flex items-center justify-center flex-shrink-0">
                      <User className="w-5 h-5 text-gray-400" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-medium text-gray-900">
                        {solicitud.estudiante_nombre || 'Estudiante'}
                      </h3>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400">
                        {solicitud.estudiante_email && (
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {solicitud.estudiante_email}
                          </span>
                        )}
                        {solicitud.estudiante_telefono && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {solicitud.estudiante_telefono}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {obtenerFecha(solicitud.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Detalles del curso y pago */}
                  <div className="mt-3 space-y-1.5">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <span className="font-medium text-gray-700">Curso:</span>
                      {solicitud.curso_titulo || 'Sin titulo'}
                    </div>
                    {solicitud.metodo_pago && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <CreditCard className="w-3.5 h-3.5 text-gray-400" />
                        <span>Pago: {solicitud.metodo_pago.toUpperCase()}</span>
                        {solicitud.referencia_pago && (
                          <span className="text-gray-400">
                            · Ref: {solicitud.referencia_pago}
                          </span>
                        )}
                      </div>
                    )}
                    {solicitud.mensaje_estudiante && (
                      <div className="bg-gray-50 rounded-md p-2 text-sm text-gray-600">
                        <p className="text-gray-500">{solicitud.mensaje_estudiante}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Estado y acciones */}
                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                    solicitud.estado === 'pendiente'
                      ? 'bg-amber-50 text-amber-600'
                      : solicitud.estado === 'aprobado'
                        ? 'bg-primary-dark text-white'
                        : 'bg-red-50 text-red-600'
                  }`}>
                    {solicitud.estado === 'pendiente' ? 'Pendiente' :
                     solicitud.estado === 'aprobado' ? 'Aprobado' : 'Rechazado'}
                  </span>

                  {solicitud.estado === 'pendiente' && (
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() => handleAprobar(solicitud.id, solicitud.estudiante_nombre)}
                        disabled={procesando === solicitud.id}
                        className="px-4 py-2 text-xs font-medium text-white bg-emerald-600 rounded-md hover:bg-emerald-700 transition-colors flex items-center gap-1.5"
                      >
                        {procesando === solicitud.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Check className="w-3.5 h-3.5" />
                        )}
                        Aprobar
                      </button>
                      <button
                        onClick={() => handleRechazar(solicitud.id, solicitud.estudiante_nombre)}
                        disabled={procesando === solicitud.id}
                        className="px-4 py-2 text-xs font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors flex items-center gap-1.5"
                      >
                        {procesando === solicitud.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <X className="w-3.5 h-3.5" />
                        )}
                        Rechazar
                      </button>
                    </div>
                  )}

                  {solicitud.comentario_docente && (
                    <p className="text-xs text-gray-400 mt-1 max-w-[200px] text-right">
                      {solicitud.comentario_docente}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PanelSolicitudes;