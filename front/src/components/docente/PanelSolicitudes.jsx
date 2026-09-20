// front/src/components/docente/PanelSolicitudes.jsx
// PANEL DE SOLICITUDES DE ACCESO PARA DOCENTE

import React, { useState, useMemo, useEffect } from 'react';
import {
  Loader2,
  Check,
  X,
  Clock,
  Mail,
  Phone,
  Calendar,
  CreditCard,
  Send,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Search
} from 'lucide-react';
import cursosService from '../../services/cursosService';
import { useSolicitudes } from '../../hooks/useSolicitudes';
import Modal from '../ui/Modal';

// ============================================================
// TOAST
// ============================================================
const Toast = ({ message, type = 'success', onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const styles = {
    success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    warning: 'bg-amber-50 border-amber-200 text-amber-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800'
  };

  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-emerald-500" />,
    error: <AlertCircle className="w-5 h-5 text-red-500" />,
    warning: <AlertCircle className="w-5 h-5 text-amber-500" />,
    info: <AlertCircle className="w-5 h-5 text-blue-500" />
  };

  return (
    <div className={`fixed bottom-4 right-4 z-[9999] flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg ${styles[type]}`}>
      {icons[type]}
      <p className="text-sm font-medium">{message}</p>
      <button onClick={onClose} className="ml-2 p-1 hover:bg-black/5 rounded-lg transition-colors">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

// ============================================================
// HELPERS
// ============================================================
const obtenerIniciales = (nombre) => {
  if (!nombre) return 'E';
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return 'E';
  const primera = partes[0].charAt(0);
  const segunda = partes.length > 1 ? partes[partes.length - 1].charAt(0) : '';
  return (primera + segunda).toUpperCase();
};

const tiempoRelativo = (fecha) => {
  if (!fecha) return '';
  const diffMs = Date.now() - new Date(fecha).getTime();
  if (isNaN(diffMs)) return '';
  if (diffMs < 0) return 'hace un momento';

  const minutos = Math.floor(diffMs / 60000);
  if (minutos < 1) return 'hace un momento';
  if (minutos < 60) return `hace ${minutos} min`;

  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `hace ${horas} h`;

  const dias = Math.floor(horas / 24);
  if (dias < 30) return `hace ${dias} día${dias !== 1 ? 's' : ''}`;

  const meses = Math.floor(dias / 30);
  if (meses < 12) return `hace ${meses} mes${meses !== 1 ? 'es' : ''}`;

  const anios = Math.floor(meses / 12);
  return `hace ${anios} año${anios !== 1 ? 's' : ''}`;
};

const DIAS_URGENCIA = 3;
const esUrgente = (solicitud) => {
  if (!solicitud || solicitud.estado !== 'pendiente' || !solicitud.created_at) return false;
  const diffMs = Date.now() - new Date(solicitud.created_at).getTime();
  return !isNaN(diffMs) && diffMs > DIAS_URGENCIA * 24 * 60 * 60 * 1000;
};

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================
const PanelSolicitudes = ({ cursoId = null }) => {
  const { solicitudes, cargando, error, refetch } = useSolicitudes();
  const [procesando, setProcesando] = useState(null);
  const [filtro, setFiltro] = useState('pendientes');
  const [busqueda, setBusqueda] = useState('');
  const [toast, setToast] = useState(null);
  const [confirmAprobar, setConfirmAprobar] = useState(null);
  const [rechazo, setRechazo] = useState(null);
  const [motivoRechazo, setMotivoRechazo] = useState('');

  // El contexto trae TODAS las solicitudes; el filtrado por curso es local.
  const solicitudesDelCurso = useMemo(
    () => (cursoId ? solicitudes.filter((s) => s.curso_id === cursoId) : solicitudes),
    [solicitudes, cursoId]
  );

  const conteos = useMemo(() => ({
    pendientes: solicitudesDelCurso.filter((s) => s.estado === 'pendiente').length,
    aprobados: solicitudesDelCurso.filter((s) => s.estado === 'aprobado').length,
    rechazados: solicitudesDelCurso.filter((s) => s.estado === 'rechazado').length,
  }), [solicitudesDelCurso]);

  const solicitudesFiltradas = useMemo(() => {
    const term = busqueda.trim().toLowerCase();
    return solicitudesDelCurso.filter((s) => {
      if (filtro === 'pendientes' && s.estado !== 'pendiente') return false;
      if (filtro === 'aprobados' && s.estado !== 'aprobado') return false;
      if (filtro === 'rechazados' && s.estado !== 'rechazado') return false;
      if (term) {
        const nombre = (s.estudiante_nombre || '').toLowerCase();
        const email = (s.estudiante_email || '').toLowerCase();
        if (!nombre.includes(term) && !email.includes(term)) return false;
      }
      return true;
    });
  }, [solicitudesDelCurso, filtro, busqueda]);

  const mostrarToast = (message, type = 'success') => setToast({ message, type });

  const handleAprobarConfirm = async () => {
    if (!confirmAprobar) return;
    const { id } = confirmAprobar;
    setProcesando(id);
    try {
      await cursosService.aprobarSolicitud(id, 'Acceso aprobado');
      await refetch();
      setConfirmAprobar(null);
      mostrarToast('Solicitud aprobada');
    } catch (e) {
      console.error('Error aprobando solicitud:', e);
      mostrarToast(e.message || 'No se pudo aprobar la solicitud', 'error');
    } finally {
      setProcesando(null);
    }
  };

  const handleRechazarConfirm = async () => {
    if (!rechazo) return;
    const { id } = rechazo;
    setProcesando(id);
    try {
      await cursosService.rechazarSolicitud(id, motivoRechazo.trim() || 'Acceso denegado');
      await refetch();
      setRechazo(null);
      setMotivoRechazo('');
      mostrarToast('Solicitud rechazada');
    } catch (e) {
      console.error('Error rechazando solicitud:', e);
      mostrarToast(e.message || 'No se pudo rechazar la solicitud', 'error');
    } finally {
      setProcesando(null);
    }
  };

  const cerrarRechazo = () => {
    if (procesando) return;
    setRechazo(null);
    setMotivoRechazo('');
  };

  const cerrarAprobar = () => {
    if (procesando) return;
    setConfirmAprobar(null);
  };

  const obtenerFecha = (fecha) => {
    if (!fecha) return '';
    const d = new Date(fecha);
    return d.toLocaleDateString('es-PE', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (cargando) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  const filtros = [
    { id: 'pendientes', label: 'Pendientes', count: conteos.pendientes },
    { id: 'aprobados', label: 'Aprobados', count: conteos.aprobados },
    { id: 'rechazados', label: 'Rechazados', count: conteos.rechazados },
  ];

  const mensajeVacio = busqueda.trim()
    ? 'No hay resultados para tu búsqueda'
    : filtro === 'pendientes'
      ? '¡Todo al día! No tienes solicitudes pendientes.'
      : filtro === 'aprobados'
        ? 'No hay solicitudes aprobadas'
        : 'No hay solicitudes rechazadas';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 bg-gray-50">
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 tracking-tight">
            Solicitudes de acceso
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Gestiona las solicitudes de acceso a tus cursos
          </p>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre o email..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#0f766e] focus:ring-2 focus:ring-[#0f766e]/20 transition-all bg-white"
            />
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            {conteos.pendientes > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-full">
                <Clock className="w-3.5 h-3.5" />
                {conteos.pendientes} pendiente{conteos.pendientes !== 1 ? 's' : ''}
              </span>
            )}
            <button
              onClick={refetch}
              className="p-2.5 text-gray-400 hover:text-gray-600 transition-colors rounded-lg hover:bg-gray-100 flex items-center gap-2"
              title="Actualizar"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        {filtros.map((f) => (
          <button
            key={f.id}
            onClick={() => setFiltro(f.id)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              filtro === f.id
                ? 'bg-primary-dark text-white'
                : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
            }`}
          >
            {f.label} ({f.count})
          </button>
        ))}
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
            {filtro === 'pendientes' && !busqueda.trim() ? (
              <CheckCircle2 className="w-6 h-6 text-emerald-400" />
            ) : (
              <Send className="w-6 h-6 text-gray-300" />
            )}
          </div>
          <p className="text-sm text-gray-500">{mensajeVacio}</p>
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
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#0f766e] flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-semibold text-white">
                        {obtenerIniciales(solicitud.estudiante_nombre)}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-medium text-gray-900 truncate">
                          {solicitud.estudiante_nombre || 'Estudiante'}
                        </h3>
                        {esUrgente(solicitud) && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium text-amber-600 bg-amber-50 border border-amber-200 rounded-full">
                            <AlertTriangle className="w-3 h-3" />
                            Urgente
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-gray-500">
                        {solicitud.estudiante_email && (
                          <a
                            href={`mailto:${solicitud.estudiante_email}`}
                            className="flex items-center gap-1 hover:text-[#0f766e] transition-colors"
                          >
                            <Mail className="w-3 h-3" />
                            {solicitud.estudiante_email}
                          </a>
                        )}
                        {solicitud.estudiante_telefono && (
                          <a
                            href={`tel:${solicitud.estudiante_telefono}`}
                            className="flex items-center gap-1 hover:text-[#0f766e] transition-colors"
                          >
                            <Phone className="w-3 h-3" />
                            {solicitud.estudiante_telefono}
                          </a>
                        )}
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {obtenerFecha(solicitud.created_at)}
                          {solicitud.created_at && (
                            <span className="text-gray-400">· {tiempoRelativo(solicitud.created_at)}</span>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Detalles del curso y pago */}
                  <div className="mt-3 space-y-1.5">
                    <div className="text-sm">
                      <span className="text-gray-400">Curso: </span>
                      <span className="font-medium text-gray-900">
                        {solicitud.curso_titulo || 'Sin título'}
                      </span>
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
                        onClick={() => setConfirmAprobar({ id: solicitud.id, nombre: solicitud.estudiante_nombre })}
                        disabled={procesando === solicitud.id}
                        className="px-4 py-2 text-xs font-medium text-white bg-[#0f766e] rounded-md hover:bg-[#0d5e57] transition-colors flex items-center gap-1.5 disabled:opacity-50"
                      >
                        {procesando === solicitud.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Check className="w-3.5 h-3.5" />
                        )}
                        Aprobar
                      </button>
                      <button
                        onClick={() => {
                          setRechazo({ id: solicitud.id, nombre: solicitud.estudiante_nombre });
                          setMotivoRechazo('');
                        }}
                        disabled={procesando === solicitud.id}
                        className="px-4 py-2 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 transition-colors flex items-center gap-1.5 disabled:opacity-50"
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

      {/* Modal confirmar aprobación */}
      <Modal
        isOpen={!!confirmAprobar}
        onClose={cerrarAprobar}
        title="Aprobar solicitud"
        size="sm"
      >
        <p className="text-sm text-gray-500">
          ¿Aprobar el acceso de{' '}
          <span className="font-medium text-gray-900">{confirmAprobar?.nombre || 'este estudiante'}</span>{' '}
          al curso?
        </p>
        <div className="flex items-center justify-end gap-3 mt-5">
          <button
            onClick={cerrarAprobar}
            disabled={!!procesando}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleAprobarConfirm}
            disabled={!!procesando}
            className="px-4 py-2 text-sm font-medium text-white bg-[#0f766e] hover:bg-[#0d5e57] rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5"
          >
            {procesando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Aprobar
          </button>
        </div>
      </Modal>

      {/* Modal rechazar (motivo + confirmación en uno) */}
      <Modal
        isOpen={!!rechazo}
        onClose={cerrarRechazo}
        title="Rechazar solicitud"
        size="sm"
      >
        <p className="text-sm text-gray-500">
          ¿Rechazar la solicitud de{' '}
          <span className="font-medium text-gray-900">{rechazo?.nombre || 'este estudiante'}</span>?
        </p>
        <label className="block mt-4 mb-1.5 text-xs font-medium text-gray-600">
          Motivo (opcional)
        </label>
        <textarea
          value={motivoRechazo}
          onChange={(e) => setMotivoRechazo(e.target.value)}
          rows={3}
          placeholder="Explica brevemente el motivo del rechazo..."
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#0f766e] focus:ring-2 focus:ring-[#0f766e]/20 resize-none"
        />
        <div className="flex items-center justify-end gap-3 mt-5">
          <button
            onClick={cerrarRechazo}
            disabled={!!procesando}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleRechazarConfirm}
            disabled={!!procesando}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5"
          >
            {procesando ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
            Rechazar
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default PanelSolicitudes;
