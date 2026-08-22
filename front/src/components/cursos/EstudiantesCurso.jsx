// front/src/components/cursos/EstudiantesCurso.jsx
// GESTIÓN DE ESTUDIANTES DEL CURSO (docente)
// - Lista de estudiantes con acceso y progreso
// - Progreso individual detallado por módulo/lección
// - Liberar lecciones bloqueadas manualmente
// - Desactivar acceso

import React, { useState, useEffect, useCallback } from 'react';
import {
  Users, Loader2, Search, ChevronDown, ChevronRight,
  CheckCircle2, Lock, GraduationCap, BookOpen,
  Play, FileText, Award, Link as LinkIcon, AlertCircle,
  UserX, RotateCcw, Download, Trash2, Save
} from 'lucide-react';
import cursosService from '../../services/cursosService';
import { authService } from '../../services/authService';

const EstudiantesCurso = ({ cursoId }) => {
  const usuario = authService.getCurrentUser();
  const [data, setData] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [estudianteSeleccionado, setEstudianteSeleccionado] = useState(null);
  const [progresoDetalle, setProgresoDetalle] = useState(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [liberando, setLiberando] = useState(null);
  const [desactivando, setDesactivando] = useState(null);
  const [desinscribiendo, setDesinscribiendo] = useState(null);
  const [exportando, setExportando] = useState(false);
  // Calificación manual: { estudianteId, leccionId } activo + nota en edición
  const [editandoNota, setEditandoNota] = useState(null);
  const [notaEdicion, setNotaEdicion] = useState('');
  const [guardandoNota, setGuardandoNota] = useState(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      const res = await cursosService.listarEstudiantes(cursoId);
      setData(res);
    } catch (e) {
      console.error('Error cargando estudiantes:', e);
      setError(e.message || 'No se pudieron cargar los estudiantes');
    } finally {
      setCargando(false);
    }
  }, [cursoId]);

  useEffect(() => {
    cargar();
  }, [cargar]);

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
    } finally {
      setCargandoDetalle(false);
    }
  };

  const handleLiberar = async (leccionId, estudianteId, titulo) => {
    if (!window.confirm(`¿Liberar la lección "${titulo}" para este estudiante?`)) return;
    setLiberando(leccionId);
    try {
      await cursosService.liberarLeccion(cursoId, leccionId, estudianteId);
      // Recargar detalle y lista
      const detalle = await cursosService.obtenerProgresoDetallado(cursoId, estudianteId);
      setProgresoDetalle(detalle);
      await cargar();
    } catch (e) {
      console.error('Error liberando lección:', e);
      alert(e.message || 'No se pudo liberar la lección');
    } finally {
      setLiberando(null);
    }
  };

  const handleDesactivarAcceso = async (estudianteId, nombre) => {
    if (!window.confirm(`¿Desactivar el acceso de "${nombre}" al curso?`)) return;
    setDesactivando(estudianteId);
    try {
      await cursosService.desactivarAcceso(cursoId, estudianteId);
      await cargar();
    } catch (e) {
      console.error('Error desactivando acceso:', e);
      alert(e.message || 'No se pudo desactivar el acceso');
    } finally {
      setDesactivando(null);
    }
  };

  const handleDesinscribir = async (estudianteId, nombre) => {
    if (!window.confirm(
      `¿Desinscribir a "${nombre}" del curso?\n\nSe eliminará su inscripción, acceso y todo su progreso. Esta acción no se puede deshacer.`
    )) return;
    setDesinscribiendo(estudianteId);
    try {
      await cursosService.desinscribirEstudiante(cursoId, estudianteId);
      if (estudianteSeleccionado === estudianteId) {
        setEstudianteSeleccionado(null);
        setProgresoDetalle(null);
      }
      await cargar();
    } catch (e) {
      console.error('Error desinscribiendo estudiante:', e);
      alert(e.message || 'No se pudo desinscribir al estudiante');
    } finally {
      setDesinscribiendo(null);
    }
  };

  const handleExportar = async () => {
    setExportando(true);
    try {
      const nombre = (data?.curso_titulo || 'curso').toLowerCase().replace(/[^a-z0-9]+/g, '_');
      await cursosService.exportarEstudiantes(cursoId, `estudiantes_${nombre}.csv`);
    } catch (e) {
      console.error('Error exportando:', e);
      alert(e.message || 'No se pudo exportar el CSV');
    } finally {
      setExportando(false);
    }
  };

  // Iniciar edición de nota manual
  const iniciarEdicionNota = (leccion, estudianteId) => {
    setEditandoNota({ estudianteId, leccionId: leccion.id });
    setNotaEdicion(leccion.nota != null ? String(leccion.nota) : '');
  };

  const guardarNota = async (leccion) => {
    if (!editandoNota) return;
    const notaNum = parseFloat(notaEdicion);
    if (isNaN(notaNum) || notaNum < 0 || notaNum > 20) {
      alert('Ingresa una nota válida entre 0 y 20');
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
      // Recargar detalle y lista
      const detalle = await cursosService.obtenerProgresoDetallado(cursoId, editandoNota.estudianteId);
      setProgresoDetalle(detalle);
      await cargar();
    } catch (e) {
      console.error('Error guardando nota:', e);
      alert(e.message || 'No se pudo guardar la calificación');
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

  const estudiantes = (data?.estudiantes || []).filter(e =>
    (e.estudiante_nombre || '').toLowerCase().includes(busqueda.toLowerCase()) ||
    (e.estudiante_id || '').toLowerCase().includes(busqueda.toLowerCase())
  );

  if (cargando) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
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
          className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-500" />
            Estudiantes del curso
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {data?.total_estudiantes || 0} estudiante{data?.total_estudiantes !== 1 ? 's' : ''} con acceso
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto sm:flex-shrink-0">
          {data?.total_estudiantes > 0 && (
            <button
              onClick={handleExportar}
              disabled={exportando}
              className="px-3 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              title="Exportar estudiantes a CSV"
            >
              {exportando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
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
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all"
            />
          </div>
        </div>
      </div>

      {/* Estadísticas */}
      {data && data.total_estudiantes > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{data.total_estudiantes}</p>
            <p className="text-xs text-gray-500">Inscritos</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-2xl font-bold text-emerald-600">
              {estudiantes.filter(e => e.completado).length}
            </p>
            <p className="text-xs text-gray-500">Completaron el curso</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center col-span-2 md:col-span-1">
            <p className="text-2xl font-bold text-indigo-600">
              {estudiantes.length ? Math.round(estudiantes.reduce((a, e) => a + (e.progreso || 0), 0) / estudiantes.length) : 0}%
            </p>
            <p className="text-xs text-gray-500">Progreso promedio</p>
          </div>
        </div>
      )}

      {/* Lista */}
      {estudiantes.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <GraduationCap className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No hay estudiantes aún</h3>
          <p className="text-sm text-gray-500 mt-1">
            {busqueda ? 'Ningún resultado coincide con la búsqueda' : 'Los estudiantes aparecerán aquí cuando se inscriban o sean aprobados'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {estudiantes.map((est) => {
            const expandido = estudianteSeleccionado === est.estudiante_id;
            const pct = Math.min(est.progreso || 0, 100);
            return (
              <div key={est.estudiante_id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {/* Fila principal */}
                <div className="px-4 py-3 flex items-center gap-4">
                  <button
                    onClick={() => verDetalle(est.estudiante_id)}
                    className="flex-1 flex items-center gap-4 text-left group"
                  >
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                      est.completado ? 'bg-emerald-50' : 'bg-indigo-50'
                    }`}>
                      {est.completado ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <GraduationCap className="w-4 h-4 text-indigo-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-800 truncate">
                          {est.estudiante_nombre || 'Sin nombre'}
                        </p>
                        {est.completado && (
                          <span className="text-[10px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full flex-shrink-0">
                            Completado
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <div className="flex-1 max-w-[160px] h-1 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${est.completado ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-gray-400 font-medium">{pct}%</span>
                        <span className="text-[10px] text-gray-400">
                          {est.lecciones_completadas}/{est.lecciones_totales || 0} lecciones
                        </span>
                      </div>
                    </div>
                  </button>

                  {/* Acciones */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => handleDesinscribir(est.estudiante_id, est.estudiante_nombre)}
                      disabled={desinscribiendo === est.estudiante_id}
                      title="Desinscribir del curso (elimina acceso y progreso)"
                      className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-600 transition-colors"
                    >
                      {desinscribiendo === est.estudiante_id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <button
                      onClick={() => handleDesactivarAcceso(est.estudiante_id, est.estudiante_nombre)}
                      disabled={desactivando === est.estudiante_id}
                      title="Desactivar acceso"
                      className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500 transition-colors"
                    >
                      {desactivando === est.estudiante_id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <UserX className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <button
                      onClick={() => verDetalle(est.estudiante_id)}
                      className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors"
                      title={expandido ? 'Ocultar detalle' : 'Ver progreso'}
                    >
                      {expandido ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Detalle de progreso */}
                {expandido && (
                  <div className="border-t border-gray-100 bg-gray-50/50 px-4 py-4">
                    {cargandoDetalle ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                      </div>
                    ) : progresoDetalle ? (
                      <div className="space-y-4">
                        {progresoDetalle.modulos?.map((modulo) => (
                          <div key={modulo.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                            <div className="px-3 py-2 bg-gray-50 border-b border-gray-100">
                              <p className="text-xs font-medium text-gray-700">{modulo.titulo}</p>
                            </div>
                            <div className="divide-y divide-gray-50">
                              {modulo.lecciones?.map((leccion) => (
                                <div key={leccion.id} className="px-3 py-2 flex items-center gap-3">
                                  {getTipoIcon(leccion.tipo)}
                                  <span className="flex-1 text-xs text-gray-600 truncate">{leccion.titulo}</span>
                                  {editandoNota && editandoNota.estudianteId === est.estudiante_id && editandoNota.leccionId === leccion.id ? (
                                    <div className="flex items-center gap-1 flex-shrink-0">
                                      <input
                                        type="number"
                                        min="0"
                                        max="20"
                                        step="0.5"
                                        value={notaEdicion}
                                        onChange={(e) => setNotaEdicion(e.target.value)}
                                        className="w-14 px-2 py-0.5 text-xs border border-indigo-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-100"
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
                                        className="p-1 hover:bg-emerald-50 rounded text-gray-400 hover:text-emerald-600 transition-colors"
                                      >
                                        {guardandoNota === leccion.id ? (
                                          <Loader2 className="w-3 h-3 animate-spin" />
                                        ) : (
                                          <Save className="w-3 h-3" />
                                        )}
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
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-[10px] text-amber-600 flex items-center gap-1">
                                        <Lock className="w-3 h-3" /> Bloqueada
                                      </span>
                                      <button
                                        onClick={() => handleLiberar(leccion.id, est.estudiante_id, leccion.titulo)}
                                        disabled={liberando === leccion.id}
                                        title="Liberar manualmente"
                                        className="p-1 hover:bg-emerald-50 rounded text-gray-400 hover:text-emerald-600 transition-colors"
                                      >
                                        {liberando === leccion.id ? (
                                          <Loader2 className="w-3 h-3 animate-spin" />
                                        ) : (
                                          <RotateCcw className="w-3 h-3" />
                                        )}
                                      </button>
                                    </div>
                                  ) : (
                                    <span className="text-[10px] text-gray-300">Pendiente</span>
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
      )}
    </div>
  );
};

export default EstudiantesCurso;