// front/src/pages/DashboardDocente.jsx
// PANEL ANALÍTICO DEL DOCENTE
// KPIs y gráficos scoped al docente autenticado (sin librerías externas).

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Users,
  Send,
  Award,
  Loader2,
  Check,
  X,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  BarChart3,
  FileText,
  Calendar,
  ChevronRight,
  Clock,
} from 'lucide-react';
import cursosService from '../services/cursosService';
import certificadosService from '../services/certificadosService';
import examenesService from '../services/examenesService';
import { authService } from '../services/authService';
import { useSolicitudes } from '../hooks/useSolicitudes';

// ============================================================
// TOAST
// ============================================================
const Toast = ({ message, type = 'success', onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const estilos = {
    success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    error: 'bg-red-50 border-red-200 text-red-800',
  };

  return (
          <div className={`fixed bottom-4 right-4 z-[9999] flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg max-w-[calc(100vw-2rem)] ${estilos[type]}`}>
      {type === 'success' ? (
        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
      ) : (
        <AlertCircle className="w-5 h-5 text-red-500" />
      )}
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
const formatearFecha = (fecha) => {
  if (!fecha) return '';
  const d = new Date(fecha);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
};

const DashboardDocente = () => {
  const navigate = useNavigate();
  const usuario = authService.getCurrentUser();
  const { solicitudes, pendientes, refetch } = useSolicitudes();

  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [misCursos, setMisCursos] = useState([]);
  const [resumenExamenes, setResumenExamenes] = useState(null);
  const [certificados, setCertificados] = useState([]);
  const [progresoPorCurso, setProgresoPorCurso] = useState({});
  const [procesandoSolicitud, setProcesandoSolicitud] = useState(null);
  const [toast, setToast] = useState(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      const [cursosRes, gruposRes, certRes] = await Promise.allSettled([
        cursosService.listar({ docente_id: usuario?.id }),
        examenesService.listarGrupos(usuario?.id),
        certificadosService.listar(),
      ]);

      const cursos = cursosRes.status === 'fulfilled' && Array.isArray(cursosRes.value)
        ? cursosRes.value
        : [];
      if (cursosRes.status === 'rejected') {
        setError('No se pudieron cargar tus cursos. Intenta de nuevo.');
      }
      setMisCursos(cursos);

      // Certificados emitidos para mis cursos (o a mi nombre)
      const misIds = new Set(cursos.map((c) => String(c.id)));
      const certs = certRes.status === 'fulfilled' && Array.isArray(certRes.value)
        ? certRes.value.filter(
            (c) => String(c.docente_id) === String(usuario?.id) || misIds.has(String(c.curso_id))
          )
        : [];
      setCertificados(certs);

      // Resumen de exámenes acotado a mis grupos (degrada a global si falla)
      const grupos = gruposRes.status === 'fulfilled' && Array.isArray(gruposRes.value)
        ? gruposRes.value
        : [];
      const grupoIds = grupos.map((g) => g.id).filter(Boolean);
      try {
        const resumen = await examenesService.obtenerResumen(grupoIds.length > 0 ? grupoIds : null);
        setResumenExamenes(resumen || null);
      } catch {
        setResumenExamenes(null);
      }

      // Progreso promedio de estudiantes por curso (máx. 20 cursos)
      const objetivo = cursos.slice(0, 20);
      if (objetivo.length > 0) {
        const resultados = await Promise.allSettled(
          objetivo.map((c) => cursosService.listarEstudiantes(c.id))
        );
        const mapa = {};
        resultados.forEach((r, i) => {
          const cid = String(objetivo[i].id);
          if (r.status === 'fulfilled') {
            const estudiantes = Array.isArray(r.value?.estudiantes) ? r.value.estudiantes : [];
            const total = estudiantes.length;
            const suma = estudiantes.reduce((acc, e) => acc + (Number(e.progreso) || 0), 0);
            mapa[cid] = { total, promedio: total > 0 ? Math.round(suma / total) : 0 };
          } else {
            mapa[cid] = { total: 0, promedio: 0, error: true };
          }
        });
        setProgresoPorCurso(mapa);
      } else {
        setProgresoPorCurso({});
      }
    } catch (e) {
      console.error('Error cargando el panel docente:', e);
      setError('Ocurrió un error al cargar el panel. Intenta de nuevo.');
    } finally {
      setCargando(false);
    }
  }, [usuario?.id]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const handleSolicitud = async (solicitud, accion) => {
    setProcesandoSolicitud(solicitud.id);
    try {
      if (accion === 'aprobar') {
        await cursosService.aprobarSolicitud(solicitud.id, 'Acceso aprobado');
      } else {
        await cursosService.rechazarSolicitud(solicitud.id, 'Acceso denegado');
      }
      await refetch();
      setToast({
        message: accion === 'aprobar' ? 'Solicitud aprobada' : 'Solicitud rechazada',
        type: 'success',
      });
    } catch (e) {
      console.error('Error procesando solicitud:', e);
      setToast({
        message: e?.message || 'No se pudo procesar la solicitud',
        type: 'error',
      });
    } finally {
      setProcesandoSolicitud(null);
    }
  };

  if (cargando) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#0f766e]" />
        <p className="text-sm text-gray-400 mt-3">Cargando tu panel...</p>
      </div>
    );
  }

  // ============================================================
  // DERIVADOS
  // ============================================================
  const publicados = misCursos.filter(
    (c) => String(c.estado).toUpperCase() === 'PUBLICADO'
  ).length;
  const totalEstudiantes = misCursos.reduce(
    (acc, c) => acc + (Number(c.estudiantes_count) || 0),
    0
  );

  const solicitudesRecientes = [...solicitudes]
    .filter((s) => s.estado === 'pendiente')
    .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
    .slice(0, 5);

  const cursosConProgreso = misCursos
    .map((c) => progresoPorCurso[String(c.id)])
    .filter(Boolean);
  const totalEvaluados = cursosConProgreso.reduce((acc, p) => acc + p.total, 0);
  const promedioGlobal = totalEvaluados > 0
    ? Math.round(
        cursosConProgreso.reduce((acc, p) => acc + p.promedio * p.total, 0) / totalEvaluados
      )
    : 0;

  const topCursos = [...misCursos]
    .sort((a, b) => (Number(b.estudiantes_count) || 0) - (Number(a.estudiantes_count) || 0))
    .slice(0, 5);
  const maxEstudiantes = Math.max(1, ...topCursos.map((c) => Number(c.estudiantes_count) || 0));

  const pub = resumenExamenes?.publicados || 0;
  const bor = resumenExamenes?.borradores || 0;
  const cer = resumenExamenes?.cerrados || 0;
  const totalExamenes = pub + bor + cer;

  const RADIO = 40;
  const CIRC = 2 * Math.PI * RADIO;
  let acumulado = 0;
  const arcos = [
    { label: 'Publicados', valor: pub, color: '#0f766e' },
    { label: 'Borradores', valor: bor, color: '#f59e0b' },
    { label: 'Cerrados', valor: cer, color: '#9ca3af' },
  ]
    .filter((s) => s.valor > 0)
    .map((s) => {
      const arco = { ...s, dash: (s.valor / totalExamenes) * CIRC, offset: -acumulado };
      acumulado += arco.dash;
      return arco;
    });

  const fechaActual = new Date().toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const fechaCapitalizada = fechaActual.charAt(0).toUpperCase() + fechaActual.slice(1);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}

      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl text-sm text-red-600 mb-6">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError('')} className="ml-auto p-1 hover:bg-red-100 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header con saludo */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#e6f4f2] flex items-center justify-center">
            <span className="text-2xl font-semibold text-[#0f766e]">
              {usuario?.nombres?.charAt(0) || 'D'}
            </span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              Hola, {usuario?.nombres?.split(' ')[0] || 'Docente'}
            </h1>
            <p className="text-sm text-gray-400 flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5" />
              {fechaCapitalizada}
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 self-start sm:self-auto px-3 py-1.5 text-xs font-medium text-[#0f766e] bg-[#e6f4f2] rounded-full">
          <BarChart3 className="w-3.5 h-3.5" />
          Panel Docente
        </span>
      </div>

      {/* KPIs scoped al docente */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-gray-200/60 p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#e6f4f2] flex items-center justify-center flex-shrink-0">
              <BookOpen className="w-5 h-5 text-[#0f766e]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 leading-tight">{misCursos.length}</p>
              <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wide">Mis cursos</p>
              <p className="text-[10px] text-gray-400">{publicados} publicados</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200/60 p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#e6f4f2] flex items-center justify-center flex-shrink-0">
              <Users className="w-5 h-5 text-[#0f766e]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 leading-tight">{totalEstudiantes}</p>
              <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wide">Estudiantes</p>
              <p className="text-[10px] text-gray-400">en mis cursos</p>
            </div>
          </div>
        </div>

        <div
          onClick={() => navigate('/docente/solicitudes')}
          className="bg-white rounded-2xl border border-amber-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
              <Send className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 leading-tight">{pendientes}</p>
              <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wide">Solicitudes</p>
              <p className="text-[10px] text-gray-400">
                {pendientes > 0 ? 'pendientes de revisar' : 'todo al día'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200/60 p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#e6f4f2] flex items-center justify-center flex-shrink-0">
              <Award className="w-5 h-5 text-[#0f766e]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 leading-tight">{certificados.length}</p>
              <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wide">Certificados</p>
              <p className="text-[10px] text-gray-400">emitidos</p>
            </div>
          </div>
        </div>
      </div>

      {/* Gráficos (CSS/SVG puro) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Estudiantes por curso */}
        <div className="bg-white rounded-2xl border border-gray-200/60 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-[#0f766e]" />
            Estudiantes por curso
          </h3>
          {topCursos.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Aún no tienes cursos</p>
          ) : (
            <div className="space-y-3">
              {topCursos.map((curso) => {
                const count = Number(curso.estudiantes_count) || 0;
                return (
                  <div key={curso.id}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-600 truncate pr-2">{curso.titulo}</span>
                      <span className="text-xs font-semibold text-gray-700">{count}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#0f766e] rounded-full transition-all duration-500"
                        style={{ width: `${(count / maxEstudiantes) * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Estado de exámenes */}
        <div className="bg-white rounded-2xl border border-gray-200/60 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#0f766e]" />
            Estado de exámenes
          </h3>
          {totalExamenes === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Sin exámenes registrados</p>
          ) : (
            <div className="flex items-center gap-5">
              <div className="relative flex-shrink-0">
                <svg viewBox="0 0 100 100" className="w-28 h-28">
                  <circle cx="50" cy="50" r={RADIO} fill="none" stroke="#f3f4f6" strokeWidth="12" />
                  <g transform="rotate(-90 50 50)">
                    {arcos.map((a) => (
                      <circle
                        key={a.label}
                        cx="50"
                        cy="50"
                        r={RADIO}
                        fill="none"
                        stroke={a.color}
                        strokeWidth="12"
                        strokeDasharray={`${a.dash} ${CIRC}`}
                        strokeDashoffset={a.offset}
                      />
                    ))}
                  </g>
                  <text
                    x="50"
                    y="50"
                    textAnchor="middle"
                    dominantBaseline="central"
                    style={{ fontSize: '20px', fontWeight: 700, fill: '#111827' }}
                  >
                    {totalExamenes}
                  </text>
                </svg>
              </div>
              <div className="space-y-2 flex-1">
                {arcos.map((a) => (
                  <div key={a.label} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 text-gray-500">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: a.color }} />
                      {a.label}
                    </span>
                    <span className="font-semibold text-gray-700">{a.valor}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Progreso promedio */}
        <div className="bg-white rounded-2xl border border-gray-200/60 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#0f766e]" />
            Progreso promedio
          </h3>
          {totalEvaluados === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Sin estudiantes en tus cursos</p>
          ) : (
            <div className="py-2">
              <div className="flex items-end justify-between mb-3">
                <span className="text-4xl font-bold text-gray-900 leading-none">{promedioGlobal}%</span>
                <span className="text-xs text-gray-400">
                  {totalEvaluados} estudiante{totalEvaluados !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${promedioGlobal}%`,
                    backgroundColor: promedioGlobal >= 70 ? '#0f766e' : promedioGlobal >= 40 ? '#f59e0b' : '#ef4444',
                  }}
                />
              </div>
              <p className="text-[11px] text-gray-400 mt-3">
                Promedio de avance de los estudiantes en tus cursos
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Listas accionables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Solicitudes recientes */}
        <div className="bg-white rounded-2xl border border-gray-200/60 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <Send className="w-4 h-4 text-[#0f766e]" />
              Solicitudes recientes
            </h3>
            <button
              onClick={() => navigate('/docente/solicitudes')}
              className="text-xs font-medium text-[#0f766e] hover:text-[#0d5e57] flex items-center gap-0.5"
            >
              Ver todas
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {solicitudesRecientes.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
              <p className="text-sm text-gray-500">Todo al día</p>
              <p className="text-xs text-gray-400">No tienes solicitudes pendientes</p>
            </div>
          ) : (
            <div className="space-y-3">
              {solicitudesRecientes.map((solicitud) => (
                <div
                  key={solicitud.id}
                  className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors"
                >
                  <div className="w-9 h-9 rounded-full bg-[#e6f4f2] flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-semibold text-[#0f766e]">
                      {solicitud.estudiante_nombre?.charAt(0)?.toUpperCase() || 'E'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {solicitud.estudiante_nombre || 'Estudiante'}
                    </p>
                    <p className="text-[11px] text-gray-400 truncate flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatearFecha(solicitud.created_at)}
                      <span className="truncate">· {solicitud.curso_titulo || 'Curso'}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => handleSolicitud(solicitud, 'aprobar')}
                      disabled={procesandoSolicitud === solicitud.id}
                      title="Aprobar"
                      className="p-1.5 text-white bg-[#0f766e] rounded-lg hover:bg-[#0d5e57] transition-colors disabled:opacity-50"
                    >
                      {procesandoSolicitud === solicitud.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Check className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <button
                      onClick={() => handleSolicitud(solicitud, 'rechazar')}
                      disabled={procesandoSolicitud === solicitud.id}
                      title="Rechazar"
                      className="p-1.5 text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
                    >
                      {procesandoSolicitud === solicitud.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <X className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Mis cursos */}
        <div className="bg-white rounded-2xl border border-gray-200/60 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[#0f766e]" />
              Mis cursos
            </h3>
            <button
              onClick={() => navigate('/docente/cursos')}
              className="text-xs font-medium text-[#0f766e] hover:text-[#0d5e57] flex items-center gap-0.5"
            >
              Ver todos
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {misCursos.length === 0 ? (
            <div className="text-center py-8">
              <BookOpen className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">Aún no tienes cursos</p>
              <p className="text-xs text-gray-400">Crea tu primer curso para comenzar</p>
            </div>
          ) : (
            <div className="space-y-2">
              {misCursos.slice(0, 5).map((curso) => {
                const info = progresoPorCurso[String(curso.id)];
                const pct = info ? info.promedio : 0;
                const esPublicado = String(curso.estado).toUpperCase() === 'PUBLICADO';
                return (
                  <div
                    key={curso.id}
                    onClick={() => navigate('/docente/cursos')}
                    className="group flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-[#0f766e]/30 hover:shadow-sm transition-all cursor-pointer"
                  >
                    <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0">
                      <BookOpen className="w-4 h-4 text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-800 truncate">{curso.titulo}</p>
                        <span
                          className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                            esPublicado
                              ? 'bg-emerald-50 text-emerald-600'
                              : 'bg-amber-50 text-amber-600'
                          }`}
                        >
                          {esPublicado ? 'Publicado' : 'Borrador'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden max-w-[160px]">
                          <div
                            className="h-full bg-[#0f766e] rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-gray-400">
                          {info ? `${pct}%` : 'Sin datos'}
                        </span>
                        <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                          <Users className="w-3 h-3" />
                          {Number(curso.estudiantes_count) || 0}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors flex-shrink-0" />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardDocente;
