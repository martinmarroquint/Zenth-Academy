// front/src/components/cursos/EstudiantesCurso.jsx
// GESTIÓN DE ESTUDIANTES DEL CURSO (docente) - VERSIÓN MEJORADA
// - Lista de estudiantes con acceso y progreso
// - Progreso individual detallado por módulo/lección
// - Liberar lecciones bloqueadas manualmente
// - Desactivar acceso
// - Calificación manual por lección
// - Exportar a CSV
// - Paginación y filtros avanzados
// - Notificaciones toast

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Users, Loader2, Search, ChevronDown, ChevronRight,
  CheckCircle2, Lock, GraduationCap, BookOpen,
  Play, FileText, Award, Link as LinkIcon, AlertCircle,
  UserX, RotateCcw, Download, Trash2, Save,
  Filter, X, ChevronLeft, ChevronRight as ChevronRightIcon,
  TrendingUp, TrendingDown, Minus, Clock, UserCheck,
  FileSpreadsheet, Eye, EyeOff
} from 'lucide-react';
// ✅ CORREGIDO: usar '../../services' en lugar de '../services'
import cursosService from '../../services/cursosService';
import certificadosService from '../../services/certificadosService';
import { authService } from '../../services/authService';

// ============================================================
// COMPONENTE DE TOAST NOTIFICATIONS
// ============================================================
const Toast = ({ message, type = 'success', onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
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
    <div className={`fixed bottom-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg animate-in slide-in-from-right ${styles[type]}`}>
      {icons[type]}
      <p className="text-sm font-medium">{message}</p>
      <button onClick={onClose} className="ml-2 p-1 hover:bg-black/5 rounded-lg transition-colors">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

// ============================================================
// COMPONENTE DE CONFIRMACIÓN MODAL
// ============================================================
const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirmar', cancelText = 'Cancelar', type = 'danger' }) => {
  if (!isOpen) return null;

  const colors = {
    danger: 'bg-red-600 hover:bg-red-700',
    warning: 'bg-amber-600 hover:bg-amber-700',
    info: 'bg-blue-600 hover:bg-blue-700'
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-6 h-6 text-red-500" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-500 mt-1">{message}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 mt-6 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors ${colors[type]}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================
const EstudiantesCurso = ({ cursoId }) => {
  const usuario = authService.getCurrentUser();
  const [data, setData] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos'); // todos, completado, en_progreso, sin_iniciar
  const [ordenarPor, setOrdenarPor] = useState('nombre'); // nombre, progreso, completado, fecha
  const [ordenDireccion, setOrdenDireccion] = useState('asc');
  const [estudianteSeleccionado, setEstudianteSeleccionado] = useState(null);
  const [progresoDetalle, setProgresoDetalle] = useState(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [liberando, setLiberando] = useState(null);
  const [desactivando, setDesactivando] = useState(null);
  const [desinscribiendo, setDesinscribiendo] = useState(null);
  const [exportando, setExportando] = useState(false);
  const [editandoNota, setEditandoNota] = useState(null);
  const [notaEdicion, setNotaEdicion] = useState('');
  const [guardandoNota, setGuardandoNota] = useState(null);
  const [toast, setToast] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);
  
  // Paginación
  const [paginaActual, setPaginaActual] = useState(1);
  const [itemsPorPagina, setItemsPorPagina] = useState(10);

  // Mostrar toast
  const mostrarToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  // Cerrar toast
  const cerrarToast = () => {
    setToast(null);
  };

  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      const res = await cursosService.listarEstudiantes(cursoId);
      setData(res);
    } catch (e) {
      console.error('Error cargando estudiantes:', e);
      setError(e.message || 'No se pudieron cargar los estudiantes');
      mostrarToast('Error al cargar estudiantes', 'error');
    } finally {
      setCargando(false);
    }
  }, [cursoId]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  // Resetear página cuando cambia la búsqueda o filtro
  useEffect(() => {
    setPaginaActual(1);
  }, [busqueda, filtroEstado, ordenarPor, ordenDireccion]);

  const verDetalle = async (estudianteId) => {
    if (estudianteSeleccionado === estudianteId) {
      setEstudianteSeleccionado(null);
      setProgresoDetalle(null);
      return;
    }
    setEstudianteSeleccionado(estudianteId);
    setCargandoDetalle(true);
    setProgresoDetalle(null);
    try {
      const detalle = await cursosService.obtenerProgresoDetallado(cursoId, estudianteId);
      setProgresoDetalle(detalle);
    } catch (e) {
      console.error('Error cargando progreso detallado:', e);
      setError(e.message || 'No se pudo cargar el progreso del estudiante');
      mostrarToast('Error al cargar progreso', 'error');
    } finally {
      setCargandoDetalle(false);
    }
  };

  const handleLiberar = async (leccionId, estudianteId, titulo) => {
    setConfirmModal({
      title: 'Liberar lección',
      message: `¿Estás seguro de liberar la lección "${titulo}" para este estudiante?`,
      confirmText: 'Liberar',
      type: 'info',
      onConfirm: async () => {
        setLiberando(leccionId);
        setConfirmModal(null);
        try {
          await cursosService.liberarLeccion(cursoId, leccionId, estudianteId);
          const detalle = await cursosService.obtenerProgresoDetallado(cursoId, estudianteId);
          setProgresoDetalle(detalle);
          await cargar();
          mostrarToast(`Lección "${titulo}" liberada correctamente`);
        } catch (e) {
          console.error('Error liberando lección:', e);
          mostrarToast(e.message || 'No se pudo liberar la lección', 'error');
        } finally {
          setLiberando(null);
        }
      }
    });
  };

  const handleDesactivarAcceso = async (estudianteId, nombre) => {
    setConfirmModal({
      title: 'Desactivar acceso',
      message: `¿Desactivar el acceso de "${nombre}" al curso? Podrá reactivarse posteriormente.`,
      confirmText: 'Desactivar',
      type: 'warning',
      onConfirm: async () => {
        setDesactivando(estudianteId);
        setConfirmModal(null);
        try {
          await cursosService.desactivarAcceso(cursoId, estudianteId);
          await cargar();
          mostrarToast(`Acceso de "${nombre}" desactivado`);
        } catch (e) {
          console.error('Error desactivando acceso:', e);
          mostrarToast(e.message || 'No se pudo desactivar el acceso', 'error');
        } finally {
          setDesactivando(null);
        }
      }
    });
  };

  const handleDesinscribir = async (estudianteId, nombre) => {
    setConfirmModal({
      title: 'Desinscribir estudiante',
      message: `¿Desinscribir a "${nombre}" del curso?\n\nSe eliminará su inscripción, acceso y todo su progreso. Esta acción no se puede deshacer.`,
      confirmText: 'Desinscribir',
      type: 'danger',
      onConfirm: async () => {
        setDesinscribiendo(estudianteId);
        setConfirmModal(null);
        try {
          await cursosService.desinscribirEstudiante(cursoId, estudianteId);
          if (estudianteSeleccionado === estudianteId) {
            setEstudianteSeleccionado(null);
            setProgresoDetalle(null);
          }
          await cargar();
          mostrarToast(`Estudiante "${nombre}" desinscrito correctamente`);
        } catch (e) {
          console.error('Error desinscribiendo estudiante:', e);
          mostrarToast(e.message || 'No se pudo desinscribir al estudiante', 'error');
        } finally {
          setDesinscribiendo(null);
        }
      }
    });
  };

  const handleExportar = async () => {
    setExportando(true);
    try {
      const nombre = (data?.curso_titulo || 'curso').toLowerCase().replace(/[^a-z0-9]+/g, '_');
      await cursosService.exportarEstudiantes(cursoId, `estudiantes_${nombre}.csv`);
      mostrarToast('Exportación completada exitosamente');
    } catch (e) {
      console.error('Error exportando:', e);
      mostrarToast(e.message || 'No se pudo exportar el CSV', 'error');
    } finally {
      setExportando(false);
    }
  };

  const iniciarEdicionNota = (leccion, estudianteId) => {
    setEditandoNota({ estudianteId, leccionId: leccion.id });
    setNotaEdicion(leccion.nota != null ? String(leccion.nota) : '');
  };

  const guardarNota = async (leccion) => {
    if (!editandoNota) return;
    const notaNum = parseFloat(notaEdicion);
    if (isNaN(notaNum) || notaNum < 0 || notaNum > 20) {
      mostrarToast('Ingresa una nota válida entre 0 y 20', 'error');
      return;
    }
    setGuardandoNota(editandoNota.leccionId);
    try {
      await cursosService.asignarNota(
        cursoId,
        editandoNota.estudianteId,
        editandoNota.leccionId,
        { nota: notaNum, aprobado: notaNum >= 10 }
      );
      setEditandoNota(null);
      setNotaEdicion('');
      const detalle = await cursosService.obtenerProgresoDetallado(cursoId, editandoNota.estudianteId);
      setProgresoDetalle(detalle);
      await cargar();
      mostrarToast(`Nota ${notaNum} guardada correctamente`);
    } catch (e) {
      console.error('Error guardando nota:', e);
      mostrarToast(e.message || 'No se pudo guardar la calificación', 'error');
    } finally {
      setGuardandoNota(null);
    }
  };

  const getTipoIcon = (tipo) => {
    switch (tipo) {
      case 'video': return <Play className="w-3.5 h-3.5 text-blue-500" />;
      case 'texto': return <FileText className="w-3.5 h-3.5 text-gray-500" />;
      case 'quiz': return <BookOpen className="w-3.5 h-3.5 text-indigo-500" />;
      case 'examen': return <Award className="w-3.5 h-3.5 text-amber-500" />;
      case 'recurso': return <LinkIcon className="w-3.5 h-3.5 text-green-500" />;
      default: return <FileText className="w-3.5 h-3.5 text-gray-500" />;
    }
  };

  // Filtrar estudiantes
  const estudiantesFiltrados = useMemo(() => {
    let filtered = data?.estudiantes || [];

    // Búsqueda por nombre o ID
    if (busqueda) {
      const searchLower = busqueda.toLowerCase();
      filtered = filtered.filter(e =>
        (e.estudiante_nombre || '').toLowerCase().includes(searchLower) ||
        (e.estudiante_id || '').toLowerCase().includes(searchLower)
      );
    }

    // Filtro por estado
    if (filtroEstado === 'completado') {
      filtered = filtered.filter(e => e.completado);
    } else if (filtroEstado === 'en_progreso') {
      filtered = filtered.filter(e => !e.completado && (e.progreso || 0) > 0);
    } else if (filtroEstado === 'sin_iniciar') {
      filtered = filtered.filter(e => (e.progreso || 0) === 0);
    }

    // Ordenar
    filtered.sort((a, b) => {
      let valA, valB;
      switch (ordenarPor) {
        case 'nombre':
          valA = (a.estudiante_nombre || '').toLowerCase();
          valB = (b.estudiante_nombre || '').toLowerCase();
          break;
        case 'progreso':
          valA = a.progreso || 0;
          valB = b.progreso || 0;
          break;
        case 'completado':
          valA = a.completado ? 1 : 0;
          valB = b.completado ? 1 : 0;
          break;
        case 'fecha':
          valA = new Date(a.fecha_inscripcion || 0);
          valB = new Date(b.fecha_inscripcion || 0);
          break;
        default:
          valA = (a.estudiante_nombre || '').toLowerCase();
          valB = (b.estudiante_nombre || '').toLowerCase();
      }

      if (valA < valB) return ordenDireccion === 'asc' ? -1 : 1;
      if (valA > valB) return ordenDireccion === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [data, busqueda, filtroEstado, ordenarPor, ordenDireccion]);

  // Paginación
  const totalPaginas = Math.ceil(estudiantesFiltrados.length / itemsPorPagina);
  const estudiantesPaginados = estudiantesFiltrados.slice(
    (paginaActual - 1) * itemsPorPagina,
    paginaActual * itemsPorPagina
  );

  // Estadísticas
  const estadisticas = useMemo(() => {
    const total = data?.estudiantes?.length || 0;
    const completados = data?.estudiantes?.filter(e => e.completado).length || 0;
    const enProgreso = data?.estudiantes?.filter(e => !e.completado && (e.progreso || 0) > 0).length || 0;
    const sinIniciar = data?.estudiantes?.filter(e => (e.progreso || 0) === 0).length || 0;
    const promedio = total > 0 ? Math.round(data?.estudiantes?.reduce((a, e) => a + (e.progreso || 0), 0) / total) : 0;
    return { total, completados, enProgreso, sinIniciar, promedio };
  }, [data]);

  // Alternar orden
  const toggleOrden = (campo) => {
    if (ordenarPor === campo) {
      setOrdenDireccion(ordenDireccion === 'asc' ? 'desc' : 'asc');
    } else {
      setOrdenarPor(campo);
      setOrdenDireccion('asc');
    }
  };

  if (cargando) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="relative">
          <div className="w-12 h-12 border-4 border-[#e6f4f2] border-t-[#0f766e] rounded-full animate-spin"></div>
        </div>
        <p className="text-sm text-gray-400 mt-4">Cargando estudiantes...</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
        <AlertCircle className="w-12 h-12 text-red-300 mx-auto mb-3" />
        <p className="text-sm text-red-500 mb-4">{error}</p>
        <button
          onClick={cargar}
          className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm hover:bg-gray-800 transition-colors"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={cerrarToast}
        />
      )}

      {/* Confirm Modal */}
      {confirmModal && (
        <ConfirmModal
          isOpen={true}
          onClose={() => setConfirmModal(null)}
          onConfirm={confirmModal.onConfirm}
          title={confirmModal.title}
          message={confirmModal.message}
          confirmText={confirmModal.confirmText}
          cancelText="Cancelar"
          type={confirmModal.type}
        />
      )}

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-[#0f766e]" />
            Estudiantes del curso
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {estadisticas.total} estudiante{estadisticas.total !== 1 ? 's' : ''} en total
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full lg:w-auto">
          {estadisticas.total > 0 && (
            <button
              onClick={handleExportar}
              disabled={exportando}
              className="px-3 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50 whitespace-nowrap"
            >
              {exportando ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
              Exportar CSV
            </button>
          )}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar estudiante..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#0f766e] focus:ring-2 focus:ring-[#0f766e]/20 transition-all"
            />
          </div>
        </div>
      </div>

      {/* Estadísticas */}
      {estadisticas.total > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{estadisticas.total}</p>
            <p className="text-xs text-gray-500 flex items-center justify-center gap-1">
              <Users className="w-3 h-3" /> Inscritos
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-2xl font-bold text-emerald-600">{estadisticas.completados}</p>
            <p className="text-xs text-gray-500 flex items-center justify-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Completaron
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{estadisticas.enProgreso}</p>
            <p className="text-xs text-gray-500 flex items-center justify-center gap-1">
              <TrendingUp className="w-3 h-3" /> En progreso
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-2xl font-bold text-[#0f766e]">{estadisticas.promedio}%</p>
            <p className="text-xs text-gray-500 flex items-center justify-center gap-1">
              <TrendingUp className="w-3 h-3" /> Promedio
            </p>
          </div>
        </div>
      )}

      {/* Filtros y ordenamiento */}
      {estadisticas.total > 0 && (
        <div className="flex flex-wrap items-center gap-3 bg-white rounded-xl border border-gray-200 p-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <span className="text-xs font-medium text-gray-600">Filtrar:</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {[
              { id: 'todos', label: 'Todos' },
              { id: 'completado', label: 'Completaron' },
              { id: 'en_progreso', label: 'En progreso' },
              { id: 'sin_iniciar', label: 'Sin iniciar' }
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFiltroEstado(f.id)}
                className={`px-2.5 py-1 text-xs font-medium rounded-full transition-colors ${
                  filtroEstado === f.id
                    ? 'bg-[#0f766e] text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="w-px h-6 bg-gray-200 mx-1 hidden sm:block" />
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-600">Ordenar:</span>
            <select
              value={ordenarPor}
              onChange={(e) => setOrdenarPor(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1 outline-none focus:border-[#0f766e]"
            >
              <option value="nombre">Nombre</option>
              <option value="progreso">Progreso</option>
              <option value="completado">Estado</option>
              <option value="fecha">Fecha</option>
            </select>
            <button
              onClick={() => setOrdenDireccion(ordenDireccion === 'asc' ? 'desc' : 'asc')}
              className="p-1 hover:bg-gray-100 rounded-lg transition-colors text-gray-400"
            >
              {ordenDireccion === 'asc' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            </button>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-gray-400">Mostrar:</span>
            <select
              value={itemsPorPagina}
              onChange={(e) => setItemsPorPagina(Number(e.target.value))}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1 outline-none focus:border-[#0f766e]"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>
      )}

      {/* Lista */}
      {estudiantesFiltrados.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <GraduationCap className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No hay estudiantes</h3>
          <p className="text-sm text-gray-500 mt-1">
            {busqueda || filtroEstado !== 'todos'
              ? 'Ningún resultado coincide con los filtros aplicados'
              : 'Los estudiantes aparecerán aquí cuando se inscriban o sean aprobados'}
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {estudiantesPaginados.map((est) => {
              const expandido = estudianteSeleccionado === est.estudiante_id;
              const pct = Math.min(est.progreso || 0, 100);
              const iconoEstado = est.completado ? 'completado' : (pct > 0 ? 'en_progreso' : 'sin_iniciar');

              return (
                <div key={est.estudiante_id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow duration-200">
                  {/* Fila principal */}
                  <div className="px-4 py-3 flex items-center gap-4">
                    <button
                      onClick={() => verDetalle(est.estudiante_id)}
                      className="flex-1 flex items-center gap-4 text-left group min-w-0"
                    >
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                        est.completado ? 'bg-emerald-50' : (pct > 0 ? 'bg-blue-50' : 'bg-gray-50')
                      }`}>
                        {est.completado ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        ) : pct > 0 ? (
                          <TrendingUp className="w-4 h-4 text-blue-500" />
                        ) : (
                          <Minus className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium text-gray-800 truncate">
                            {est.estudiante_nombre || 'Sin nombre'}
                          </p>
                          {est.completado && (
                            <span className="text-[10px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full flex-shrink-0">
                              Completado
                            </span>
                          )}
                          {!est.completado && pct > 0 && (
                            <span className="text-[10px] font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full flex-shrink-0">
                              {pct}%
                            </span>
                          )}
                          {!est.completado && pct === 0 && (
                            <span className="text-[10px] font-medium text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full flex-shrink-0">
                              Sin iniciar
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          <div className="flex-1 max-w-[160px] h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                est.completado ? 'bg-emerald-500' : (pct > 0 ? 'bg-blue-500' : 'bg-gray-300')
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-gray-400 font-medium min-w-[30px]">{pct}%</span>
                          <span className="text-[10px] text-gray-400 hidden sm:inline">
                            {est.lecciones_completadas || 0}/{est.lecciones_totales || 0} lecciones
                          </span>
                          {est.fecha_inscripcion && (
                            <span className="text-[10px] text-gray-400 hidden md:inline">
                              • {new Date(est.fecha_inscripcion).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>

                    {/* Acciones */}
                    <div className="flex items-center gap-0.5 flex-shrink-0">
                      <button
                        onClick={() => handleDesinscribir(est.estudiante_id, est.estudiante_nombre)}
                        disabled={desinscribiendo === est.estudiante_id}
                        title="Desinscribir del curso (elimina acceso y progreso)"
                        className="p-2.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50 min-w-[44px] min-h-[44px] flex items-center justify-center"
                      >
                        {desinscribiendo === est.estudiante_id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => handleDesactivarAcceso(est.estudiante_id, est.estudiante_nombre)}
                        disabled={desactivando === est.estudiante_id}
                        title="Desactivar acceso (puede reactivarse)"
                        className="p-2.5 hover:bg-amber-50 rounded-lg text-gray-400 hover:text-amber-600 transition-colors disabled:opacity-50 min-w-[44px] min-h-[44px] flex items-center justify-center"
                      >
                        {desactivando === est.estudiante_id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <UserX className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => verDetalle(est.estudiante_id)}
                        className="p-2.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                        title={expandido ? 'Ocultar detalle' : 'Ver progreso detallado'}
                      >
                        {expandido ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Detalle de progreso */}
                  {expandido && (
                    <div className="border-t border-gray-100 bg-gray-50/50 px-4 py-4">
                      {cargandoDetalle ? (
                        <div className="flex flex-col items-center justify-center py-8">
                          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                          <p className="text-xs text-gray-400 mt-2">Cargando progreso...</p>
                        </div>
                      ) : progresoDetalle ? (
                        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                          {progresoDetalle.modulos?.map((modulo) => (
                            <div key={modulo.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                              <div className="px-3 py-2 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                                <p className="text-xs font-medium text-gray-700">{modulo.titulo}</p>
                                <span className="text-[10px] text-gray-400">
                                  {modulo.lecciones?.filter(l => l.completado).length || 0}/{modulo.lecciones?.length || 0}
                                </span>
                              </div>
                              <div className="divide-y divide-gray-50 max-h-[200px] overflow-y-auto">
                                {modulo.lecciones?.map((leccion) => (
                                  <div key={leccion.id} className="px-3 py-2 flex items-center gap-3 hover:bg-gray-50/50 transition-colors">
                                    {getTipoIcon(leccion.tipo)}
                                    <span className="flex-1 text-xs text-gray-600 truncate" title={leccion.titulo}>
                                      {leccion.titulo}
                                    </span>
                                    {editandoNota && editandoNota.estudianteId === est.estudiante_id && editandoNota.leccionId === leccion.id ? (
                                      <div className="flex items-center gap-1.5 flex-shrink-0">
                                        <input
                                          type="number"
                                          min="0"
                                          max="20"
                                          step="0.5"
                                          value={notaEdicion}
                                          onChange={(e) => setNotaEdicion(e.target.value)}
                                          className="w-16 px-2 py-2 text-xs border border-[#0f766e]/30 rounded-lg outline-none focus:ring-2 focus:ring-[#0f766e]/20 min-h-[44px]"
                                          placeholder="Nota"
                                          autoFocus
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter') guardarNota(leccion);
                                            if (e.key === 'Escape') setEditandoNota(null);
                                          }}
                                        />
                                        <button
                                          onClick={() => guardarNota(leccion)}
                                          disabled={guardandoNota === leccion.id}
                                          title="Guardar nota"
                                          className="p-2 hover:bg-emerald-50 rounded-lg text-gray-400 hover:text-emerald-600 transition-colors disabled:opacity-50 min-w-[44px] min-h-[44px] flex items-center justify-center"
                                        >
                                          {guardandoNota === leccion.id ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                          ) : (
                                            <Save className="w-4 h-4" />
                                          )}
                                        </button>
                                        <button
                                          onClick={() => setEditandoNota(null)}
                                          className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                                        >
                                          <X className="w-4 h-4" />
                                        </button>
                                      </div>
                                    ) : (
                                      <button
                                        onClick={() => iniciarEdicionNota(leccion, est.estudiante_id)}
                                        title={leccion.nota != null ? 'Editar nota' : 'Calificar'}
                                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full transition-colors flex-shrink-0 ${
                                          leccion.nota != null
                                            ? (leccion.aprobado ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' : 'bg-red-50 text-red-600 hover:bg-red-100')
                                            : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                                        }`}
                                      >
                                        {leccion.nota != null ? leccion.nota : '—'}
                                      </button>
                                    )}
                                    {leccion.completado ? (
                                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                                    ) : leccion.bloqueada ? (
                                      <div className="flex items-center gap-1.5 flex-shrink-0">
                                        <span className="text-[10px] text-amber-600 flex items-center gap-1">
                                          <Lock className="w-3 h-3" /> Bloqueada
                                        </span>
                                        <button
                                          onClick={() => handleLiberar(leccion.id, est.estudiante_id, leccion.titulo)}
                                          disabled={liberando === leccion.id}
                                          title="Liberar manualmente"
                                          className="p-1 hover:bg-emerald-50 rounded-lg text-gray-400 hover:text-emerald-600 transition-colors disabled:opacity-50"
                                        >
                                          {liberando === leccion.id ? (
                                            <Loader2 className="w-3 h-3 animate-spin" />
                                          ) : (
                                            <RotateCcw className="w-3 h-3" />
                                          )}
                                        </button>
                                      </div>
                                    ) : (
                                      <span className="text-[10px] text-gray-300 flex-shrink-0">Pendiente</span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                          {!progresoDetalle.modulos?.length && (
                            <p className="text-xs text-gray-400 text-center py-4">
                              El curso no tiene contenido configurado
                            </p>
                          )}
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Paginación */}
          {totalPaginas > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-400">
                Mostrando {(paginaActual - 1) * itemsPorPagina + 1} - {Math.min(paginaActual * itemsPorPagina, estudiantesFiltrados.length)} de {estudiantesFiltrados.length}
              </p>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setPaginaActual(p => Math.max(1, p - 1))}
                  disabled={paginaActual === 1}
                  className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPaginas) }, (_, i) => {
                    let pagina;
                    if (totalPaginas <= 5) {
                      pagina = i + 1;
                    } else if (paginaActual <= 3) {
                      pagina = i + 1;
                    } else if (paginaActual >= totalPaginas - 2) {
                      pagina = totalPaginas - 4 + i;
                    } else {
                      pagina = paginaActual - 2 + i;
                    }
                    return (
                      <button
                        key={pagina}
                        onClick={() => setPaginaActual(pagina)}
                        className={`w-8 h-8 text-xs font-medium rounded-lg transition-colors ${
                          paginaActual === pagina
                            ? 'bg-[#0f766e] text-white'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        {pagina}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => setPaginaActual(p => Math.min(totalPaginas, p + 1))}
                  disabled={paginaActual === totalPaginas}
                  className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRightIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Estilos CSS para animaciones */}
      <style>{`
        @keyframes slideInFromRight {
          from { opacity: 0; transform: translateX(100px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes zoomIn95 {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-in {
          animation: fadeIn 0.2s ease-out forwards;
        }
        .slide-in-from-right {
          animation: slideInFromRight 0.3s ease-out forwards;
        }
        .zoom-in-95 {
          animation: zoomIn95 0.2s ease-out forwards;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default EstudiantesCurso;