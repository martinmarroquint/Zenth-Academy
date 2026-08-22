// front/src/pages/EstudianteCursos.jsx
// CURSOS PARA EL ESTUDIANTE - SIN EMOJIS

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Clock,
  Users,
  Star,
  Loader2,
  Plus,
  CheckCircle2,
  ChevronRight,
  Play,
  AlertCircle,
  Sparkles,
  ArrowRight,
  Calendar,
  DollarSign,
  Lock,
  Send,
  Award
} from 'lucide-react';
import cursosService from '../services/cursosService';
import certificadosService from '../services/certificadosService';
import { authService } from '../services/authService';

const EstudianteCursos = () => {
  const navigate = useNavigate();
  const usuario = authService.getCurrentUser();
  const usuarioId = usuario?.id;
  const [cursos, setCursos] = useState([]);
  const [inscripciones, setInscripciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [inscribiendo, setInscribiendo] = useState(null);
  const [filtro, setFiltro] = useState('todos');
  const [solicitudes, setSolicitudes] = useState([]);
  const [certificados, setCertificados] = useState([]);

  const verCurso = (cursoId) => navigate(`/estudiante/cursos/${cursoId}`);

  const cargar = async () => {
    try {
      const [cat, mis, sol, cert] = await Promise.allSettled([
        cursosService.listar({ estado: 'publicado' }),
        cursosService.misCursos(),
        cursosService.misSolicitudes().catch(() => []),
        certificadosService.listar({ estudiante_id: usuario?.id }).catch(() => []),
      ]);
      setCursos(Array.isArray(cat.value) ? cat.value : []);
      setInscripciones(Array.isArray(mis.value) ? mis.value : []);
      setSolicitudes(Array.isArray(sol.value) ? sol.value : []);
      setCertificados(Array.isArray(cert.value) ? cert.value : []);
      setError('');
    } catch (e) {
      console.error('Error cargando cursos:', e);
      setError('No se pudieron cargar los cursos');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  const handleInscribirse = async (cursoId) => {
    setInscribiendo(cursoId);
    try {
      await cursosService.inscribirme(cursoId);
      await cargar();
    } catch (e) {
      alert('No se pudo inscribir: ' + (e.message || ''));
    } finally {
      setInscribiendo(null);
    }
  };

  const progresoPorCurso = {};
  inscripciones.forEach((i) => {
    progresoPorCurso[i.curso_id] = {
      progreso: i.progreso || 0,
      completado: !!i.completado,
      fecha: i.fecha_inscripcion,
    };
  });

  const solicitudesPendientes = {};
  solicitudes.filter(s => s.estado === 'pendiente').forEach((s) => {
    solicitudesPendientes[s.curso_id] = true;
  });

  const catalogoPorId = {};
  cursos.forEach((c) => { catalogoPorId[c.id] = c; });

  const cursosConEstado = cursos.map((curso) => {
    const inscrito = progresoPorCurso[curso.id];
    const tieneSolicitudPendiente = solicitudesPendientes[curso.id] || false;
    return {
      ...curso,
      inscrito: !!inscrito,
      progreso: inscrito?.progreso || 0,
      completado: inscrito?.completado || false,
      fecha_inscripcion: inscrito?.fecha,
      tiene_solicitud_pendiente: tieneSolicitudPendiente,
    };
  });

  const misCursos = cursosConEstado.filter((c) => c.inscrito);
  const catalogoDisponible = cursosConEstado.filter((c) => !c.inscrito);

  const enProgreso = misCursos.filter((i) => !i.completado).length;
  const completados = misCursos.filter((i) => i.completado).length;

  const formatearProgreso = (p) => Math.min(Math.round(p || 0), 100);

  const obtenerFecha = (fecha) => {
    if (!fecha) return '';
    const d = new Date(fecha);
    return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  };

  const filtrarCursos = () => {
    if (filtro === 'todos') return misCursos;
    if (filtro === 'progreso') return misCursos.filter((i) => !i.completado);
    if (filtro === 'completados') return misCursos.filter((i) => i.completado);
    return misCursos;
  };

  if (cargando) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-24 text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-gray-300" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-md text-sm text-red-600 mb-6">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">
            Hola, {usuario?.nombres?.split(' ')[0] || 'Estudiante'}
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {misCursos.length} curso{misCursos.length !== 1 ? 's' : ''} en total
          </p>
        </div>
        {misCursos.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">
              {enProgreso} en curso · {completados} completados
            </span>
          </div>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
        <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
            <BookOpen className="w-5 h-5 text-indigo-500" />
          </div>
          <div className="min-w-0">
            <p className="text-xl font-bold text-gray-900 leading-tight">{misCursos.length}</p>
            <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wide">Inscritos</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
            <Play className="w-5 h-5 text-blue-500" />
          </div>
          <div className="min-w-0">
            <p className="text-xl font-bold text-gray-900 leading-tight">{enProgreso}</p>
            <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wide">En curso</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="min-w-0">
            <p className="text-xl font-bold text-gray-900 leading-tight">{completados}</p>
            <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wide">Completados</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
            <Award className="w-5 h-5 text-amber-500" />
          </div>
          <div className="min-w-0">
            <p className="text-xl font-bold text-gray-900 leading-tight">{certificados.length}</p>
            <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wide">Certificados</p>
          </div>
        </div>
      </div>

      {/* Filtros */}
      {misCursos.length > 0 && (
        <div className="flex items-center gap-2 mb-6">
          <button
            onClick={() => setFiltro('todos')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              filtro === 'todos'
                ? 'bg-gray-900 text-white'
                : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => setFiltro('progreso')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              filtro === 'progreso'
                ? 'bg-gray-900 text-white'
                : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
            }`}
          >
            En curso
          </button>
          <button
            onClick={() => setFiltro('completados')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              filtro === 'completados'
                ? 'bg-gray-900 text-white'
                : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
            }`}
          >
            Completados
          </button>
        </div>
      )}

      {/* Mis Cursos */}
      {misCursos.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-lg px-8 py-16 text-center">
          <div className="w-12 h-12 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-5 h-5 text-gray-300" />
          </div>
          <p className="text-sm text-gray-500 mb-3">Aún no estás inscrito en ningún curso</p>
          <button
            onClick={() => document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth' })}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-md hover:bg-gray-800 transition-colors"
          >
            Explorar cursos
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtrarCursos().map((curso) => {
            const pct = formatearProgreso(curso.progreso);
            return (
              <div
                key={curso.id}
                onClick={() => verCurso(curso.id)}
                className="group bg-white border border-gray-100 rounded-lg hover:border-gray-200 hover:shadow-sm transition-all cursor-pointer"
              >
                <div className="px-5 py-4 flex items-center gap-4">
                  {/* Icono */}
                  <div className={`w-10 h-10 rounded-md flex items-center justify-center flex-shrink-0 ${
                    curso.completado ? 'bg-emerald-50' : 'bg-gray-50'
                  }`}>
                    {curso.completado ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <BookOpen className="w-4 h-4 text-gray-400" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <h3 className="text-sm font-medium text-gray-800 truncate">
                        {curso.titulo}
                      </h3>
                      {curso.completado && (
                        <span className="text-[10px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full flex-shrink-0">
                          Completado
                        </span>
                      )}
                      {curso.precio_tipo === 'pago' && (
                        <span className="text-[10px] font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full flex-shrink-0 flex items-center gap-1">
                          <DollarSign className="w-2.5 h-2.5" />
                          Pago
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1.5">
                      <div className="flex items-center gap-2 flex-1 max-w-[180px]">
                        <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              curso.completado ? 'bg-emerald-500' : 'bg-gray-700'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-gray-400 font-medium min-w-[28px]">
                          {pct}%
                        </span>
                      </div>
                      {curso.fecha_inscripcion && (
                        <span className="text-[10px] text-gray-400 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {obtenerFecha(curso.fecha_inscripcion)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Acción */}
                  {!curso.completado && (
                    <div className="flex items-center gap-1 text-xs font-medium text-gray-500 group-hover:text-gray-700 transition-colors flex-shrink-0">
                      <Play className="w-3 h-3" />
                      Continuar
                    </div>
                  )}
                  <ChevronRight className="w-4 h-4 text-gray-200 group-hover:text-gray-400 transition-colors flex-shrink-0" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Catálogo */}
      <section id="catalogo" className="mt-12">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 tracking-tight">
              Catálogo
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Cursos disponibles para inscribirte
            </p>
          </div>
          <span className="text-xs font-medium text-gray-500 bg-gray-50 px-2.5 py-1 rounded-full">
            {catalogoDisponible.length} disponibles
          </span>
        </div>

        {catalogoDisponible.length === 0 ? (
          <div className="bg-white border border-gray-100 rounded-lg px-8 py-12 text-center">
            <div className="w-12 h-12 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-5 h-5 text-gray-300" />
            </div>
            <p className="text-sm text-gray-400">No hay más cursos disponibles por ahora</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {catalogoDisponible.map((curso) => (
              <div
                key={curso.id}
                className="bg-white border border-gray-100 rounded-lg overflow-hidden hover:border-gray-200 hover:shadow-sm transition-all group"
              >
                <div className="relative h-28 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
                  <BookOpen className="w-8 h-8 text-gray-300" />
                  {curso.nivel && (
                    <span className="absolute top-3 right-3 px-2 py-0.5 text-[9px] font-medium rounded-full bg-white border border-gray-100 text-gray-400">
                      {curso.nivel}
                    </span>
                  )}
                  {curso.precio_tipo === 'pago' && (
                    <span className="absolute top-3 left-3 px-2 py-0.5 text-[9px] font-medium rounded-full bg-amber-100 text-amber-700 flex items-center gap-0.5">
                      <DollarSign className="w-2.5 h-2.5" />
                      {curso.moneda} {curso.precio_monto}
                    </span>
                  )}
                  {curso.tiene_solicitud_pendiente && (
                    <span className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-0.5 text-[9px] font-medium rounded-full bg-amber-100 text-amber-700 flex items-center gap-1">
                      <Send className="w-2.5 h-2.5" />
                      Solicitud pendiente
                    </span>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-medium text-gray-800 text-sm mb-0.5 line-clamp-1">
                    {curso.titulo}
                  </h3>
                  <p className="text-xs text-gray-400 line-clamp-2 mb-3 min-h-[2.5rem]">
                    {curso.descripcion}
                  </p>
                  <div className="flex items-center gap-3 text-[10px] text-gray-400 mb-3">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {curso.duracion || 'Sin duración'}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {curso.estudiantes_count || 0}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                      {curso.rating || 0}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => verCurso(curso.id)}
                      className="flex-1 px-3 py-2 text-xs font-medium text-gray-600 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors"
                    >
                      Ver
                    </button>
                    {curso.tiene_solicitud_pendiente ? (
                      <button
                        disabled
                        className="flex-1 px-3 py-2 text-xs font-medium text-amber-600 bg-amber-50 rounded-md cursor-not-allowed flex items-center justify-center gap-1"
                      >
                        <Send className="w-3 h-3" />
                        Pendiente
                      </button>
                    ) : (
                      <button
                        onClick={() => handleInscribirse(curso.id)}
                        disabled={inscribiendo === curso.id}
                        className="flex-1 px-3 py-2 text-xs font-medium text-white bg-gray-900 rounded-md hover:bg-gray-800 transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-1"
                      >
                        {inscribiendo === curso.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          curso.precio_tipo === 'pago' ? (
                            <>
                              <Lock className="w-3 h-3" />
                              Solicitar
                            </>
                          ) : (
                            <Plus className="w-3.5 h-3.5" />
                          )
                        )}
                        {curso.precio_tipo === 'pago' ? 'Solicitar acceso' : 'Inscribirme'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default EstudianteCursos;