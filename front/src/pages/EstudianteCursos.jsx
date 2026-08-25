// front/src/pages/EstudianteCursos.jsx
// CURSOS PARA EL ESTUDIANTE - VERSIÓN PROFESIONAL ACTUALIZADA

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  Award,
  Search,
  Filter,
  X,
  TrendingUp,
  GraduationCap,
  FileCheck,
  BarChart3,
  Eye,
  User
} from 'lucide-react';
import cursosService from '../services/cursosService';
import certificadosService from '../services/certificadosService';
import { authService } from '../services/authService';
import Badge from '../components/ui/Badge';
import { resolveImageUrl } from '../config/api.config';

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
  const [busqueda, setBusqueda] = useState('');
  const [solicitudes, setSolicitudes] = useState([]);
  const [certificados, setCertificados] = useState([]);
  const [ordenarPor, setOrdenarPor] = useState('fecha');
  const [ordenDireccion, setOrdenDireccion] = useState('desc');
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [filtroCategoria, setFiltroCategoria] = useState('todas');
  const [filtroNivel, setFiltroNivel] = useState('todos');

  const verCurso = (cursoId) => navigate(`/estudiante/cursos/${cursoId}`);

  const cargar = useCallback(async () => {
    setCargando(true);
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
  }, [usuario?.id]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const handleInscribirse = async (curso) => {
    setInscribiendo(curso.id);
    try {
      if (curso.precio_tipo === 'pago') {
        // Curso de pago → enviar solicitud de acceso
        await cursosService.solicitarAcceso(curso.id, {});
        alert('Solicitud enviada. El docente revisará tu acceso.');
      } else {
        // Curso gratuito → inscripción directa
        await cursosService.inscribirme(curso.id);
      }
      await cargar();
    } catch (e) {
      alert('No se pudo completar: ' + (e.message || ''));
    } finally {
      setInscribiendo(null);
    }
  };

  // Memoizar cálculos
  const { progresoPorCurso, solicitudesPendientes, cursosConEstado } = useMemo(() => {
    const progreso = {};
    inscripciones.forEach((i) => {
      progreso[i.curso_id] = {
        progreso: i.progreso || 0,
        completado: !!i.completado,
        fecha: i.fecha_inscripcion,
      };
    });

    const pendientes = {};
    solicitudes.filter(s => s.estado === 'pendiente').forEach((s) => {
      pendientes[s.curso_id] = true;
    });

    const catalogoPorId = {};
    cursos.forEach((c) => { catalogoPorId[c.id] = c; });

    const conEstado = cursos.map((curso) => {
      const inscrito = progreso[curso.id];
      const tieneSolicitudPendiente = pendientes[curso.id] || false;
      return {
        ...curso,
        inscrito: !!inscrito,
        progreso: inscrito?.progreso || 0,
        completado: inscrito?.completado || false,
        fecha_inscripcion: inscrito?.fecha,
        tiene_solicitud_pendiente: tieneSolicitudPendiente,
      };
    });

    return {
      progresoPorCurso: progreso,
      solicitudesPendientes: pendientes,
      cursosConEstado: conEstado,
    };
  }, [cursos, inscripciones, solicitudes]);

  const misCursos = useMemo(() => 
    cursosConEstado.filter((c) => c.inscrito),
    [cursosConEstado]
  );

  const catalogoDisponible = useMemo(() => 
    cursosConEstado.filter((c) => !c.inscrito),
    [cursosConEstado]
  );

  const enProgreso = useMemo(() => 
    misCursos.filter((i) => !i.completado).length,
    [misCursos]
  );

  const completados = useMemo(() => 
    misCursos.filter((i) => i.completado).length,
    [misCursos]
  );

  const formatearProgreso = (p) => Math.min(Math.round(p || 0), 100);

  const obtenerFecha = (fecha) => {
    if (!fecha) return '';
    const d = new Date(fecha);
    return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  // Filtrar y ordenar cursos
  const filtrarCursos = useMemo(() => {
    let filtered = [...misCursos];

    if (filtro === 'progreso') {
      filtered = filtered.filter((i) => !i.completado);
    } else if (filtro === 'completados') {
      filtered = filtered.filter((i) => i.completado);
    }

    if (busqueda) {
      const searchLower = busqueda.toLowerCase();
      filtered = filtered.filter((c) =>
        c.titulo.toLowerCase().includes(searchLower) ||
        (c.descripcion && c.descripcion.toLowerCase().includes(searchLower))
      );
    }

    // Ordenar
    filtered.sort((a, b) => {
      let valA, valB;
      switch (ordenarPor) {
        case 'fecha':
          valA = new Date(a.fecha_inscripcion || 0);
          valB = new Date(b.fecha_inscripcion || 0);
          break;
        case 'progreso':
          valA = a.progreso || 0;
          valB = b.progreso || 0;
          break;
        case 'titulo':
          valA = a.titulo.toLowerCase();
          valB = b.titulo.toLowerCase();
          break;
        default:
          valA = new Date(a.fecha_inscripcion || 0);
          valB = new Date(b.fecha_inscripcion || 0);
      }
      if (valA < valB) return ordenDireccion === 'asc' ? -1 : 1;
      if (valA > valB) return ordenDireccion === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [misCursos, filtro, busqueda, ordenarPor, ordenDireccion]);

  // Filtrar catálogo
  const catalogoFiltrado = useMemo(() => {
    let filtered = [...catalogoDisponible];

    if (busqueda) {
      const searchLower = busqueda.toLowerCase();
      filtered = filtered.filter((c) =>
        c.titulo.toLowerCase().includes(searchLower) ||
        (c.descripcion && c.descripcion.toLowerCase().includes(searchLower))
      );
    }

    if (filtroCategoria !== 'todas') {
      filtered = filtered.filter((c) => c.categoria === filtroCategoria);
    }

    if (filtroNivel !== 'todos') {
      filtered = filtered.filter((c) => c.nivel === filtroNivel);
    }

    return filtered;
  }, [catalogoDisponible, busqueda, filtroCategoria, filtroNivel]);

  // Categorías únicas para filtros
  const categorias = useMemo(() => {
    const cats = new Set();
    cursos.forEach(c => { if (c.categoria) cats.add(c.categoria); });
    return ['todas', ...Array.from(cats)];
  }, [cursos]);

  // Niveles únicos para filtros
  const niveles = useMemo(() => {
    const nivs = new Set();
    cursos.forEach(c => { if (c.nivel) nivs.add(c.nivel); });
    return ['todos', ...Array.from(nivs)];
  }, [cursos]);

  if (cargando) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-24 text-center">
        <div className="relative">
          <div className="w-12 h-12 border-4 border-[#e6f4f2] border-t-[#0f766e] rounded-full animate-spin mx-auto"></div>
        </div>
        <p className="text-sm text-gray-400 mt-4">Cargando tus cursos...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 mb-6">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError('')} className="ml-auto p-1 hover:bg-red-100 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header con perfil */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#e6f4f2] flex items-center justify-center">
            <span className="text-2xl font-semibold text-[#0f766e]">
              {usuario?.nombres?.charAt(0) || 'E'}
            </span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              Hola, {usuario?.nombres?.split(' ')[0] || 'Estudiante'}
            </h1>
            <p className="text-sm text-gray-400 flex items-center gap-2">
              <User className="w-3.5 h-3.5" />
              {usuario?.email || 'Sin email'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {misCursos.length > 0 && (
            <div className="flex items-center gap-3 text-xs">
              <span className="text-gray-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                {enProgreso} en curso
              </span>
              <span className="text-gray-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                {completados} completados
              </span>
            </div>
          )}
        </div>
      </div>

      {/* KPIs profesionales */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
        <div className="bg-white rounded-2xl border border-gray-200/60 p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#e6f4f2] flex items-center justify-center flex-shrink-0">
              <GraduationCap className="w-5 h-5 text-[#0f766e]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 leading-tight">{misCursos.length}</p>
              <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wide">Inscritos</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200/60 p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
              <Play className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 leading-tight">{enProgreso}</p>
              <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wide">En curso</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200/60 p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 leading-tight">{completados}</p>
              <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wide">Completados</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200/60 p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
              <Award className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 leading-tight">{certificados.length}</p>
              <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wide">Certificados</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros y búsqueda para mis cursos */}
      {misCursos.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setFiltro('todos')}
              className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                filtro === 'todos'
                  ? 'bg-[#0f766e] text-white'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setFiltro('progreso')}
              className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                filtro === 'progreso'
                  ? 'bg-[#0f766e] text-white'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              En curso
            </button>
            <button
              onClick={() => setFiltro('completados')}
              className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                filtro === 'completados'
                  ? 'bg-[#0f766e] text-white'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              Completados
            </button>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar cursos..."
                className="w-full sm:w-48 pl-9 pr-4 py-1.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#0f766e] focus:ring-2 focus:ring-[#0f766e]/20 transition-all"
              />
            </div>
          </div>
        </div>
      )}

      {/* Mis Cursos */}
      {misCursos.length === 0 ? (
        <div className="bg-white border border-gray-200/60 rounded-2xl px-8 py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-6 h-6 text-gray-300" />
          </div>
          <h3 className="text-lg font-semibold text-gray-700 mb-1">Aún no estás inscrito</h3>
          <p className="text-sm text-gray-400 mb-4">Explora el catálogo y comienza tu aprendizaje</p>
          <button
            onClick={() => document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth' })}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white rounded-lg transition-colors"
            style={{ backgroundColor: '#0f766e' }}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#0d5e57'}
            onMouseLeave={(e) => e.target.style.backgroundColor = '#0f766e'}
          >
            Explorar cursos
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtrarCursos.map((curso) => {
            const pct = formatearProgreso(curso.progreso);
            return (
              <div
                key={curso.id}
                onClick={() => verCurso(curso.id)}
                className="group bg-white border border-gray-200/60 rounded-xl hover:border-[#0f766e]/30 hover:shadow-md transition-all cursor-pointer"
              >
                <div className="px-5 py-4 flex items-center gap-4">
                  {/* Icono de estado */}
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    curso.completado ? 'bg-emerald-50' : 'bg-gray-50'
                  }`}>
                    {curso.completado ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    ) : (
                      <BookOpen className="w-5 h-5 text-gray-400" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-medium text-gray-800 truncate">
                        {curso.titulo}
                      </h3>
                      {curso.completado && (
                        <Badge variant="success" size="sm">Completado</Badge>
                      )}
                      {curso.precio_tipo === 'pago' && (
                        <Badge variant="warning" size="sm" className="flex items-center gap-0.5">
                          <DollarSign className="w-2.5 h-2.5" />
                          Pago
                        </Badge>
                      )}
                      {curso.categoria && (
                        <Badge variant="secondary" size="sm">{curso.categoria}</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1.5">
                      <div className="flex items-center gap-2 flex-1 max-w-[200px]">
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              curso.completado ? 'bg-emerald-500' : 'bg-[#0f766e]'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-gray-400 font-medium min-w-[30px]">
                          {pct}%
                        </span>
                      </div>
                      {curso.fecha_inscripcion && (
                        <span className="text-[10px] text-gray-400 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {obtenerFecha(curso.fecha_inscripcion)}
                        </span>
                      )}
                      {(curso.docente_nombre || curso.instructor) && (
                        <span className="text-[10px] text-gray-400 flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {curso.docente_nombre || curso.instructor}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Acción */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {!curso.completado && (
                      <span className="text-xs font-medium text-[#0f766e] group-hover:text-[#0d5e57] transition-colors flex items-center gap-1">
                        <Play className="w-3 h-3" />
                        Continuar
                      </span>
                    )}
                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Catálogo mejorado */}
      <section id="catalogo" className="mt-12">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              Catálogo de Cursos
            </h2>
            <p className="text-sm text-gray-400 mt-0.5">
              {catalogoFiltrado.length} cursos disponibles para ti
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setMostrarFiltros(!mostrarFiltros)}
              className="px-3 py-1.5 text-xs font-medium text-gray-500 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-1.5"
            >
              <Filter className="w-3.5 h-3.5" />
              Filtros
            </button>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar en catálogo..."
                className="w-full sm:w-56 pl-9 pr-4 py-1.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#0f766e] focus:ring-2 focus:ring-[#0f766e]/20 transition-all"
              />
            </div>
          </div>
        </div>

        {/* Filtros expandibles */}
        {mostrarFiltros && (
          <div className="bg-white border border-gray-200/60 rounded-xl p-4 mb-6 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-500">Categoría:</span>
              <select
                value={filtroCategoria}
                onChange={(e) => setFiltroCategoria(e.target.value)}
                className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg outline-none focus:border-[#0f766e] bg-white"
              >
                {categorias.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat === 'todas' ? 'Todas' : cat}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-500">Nivel:</span>
              <select
                value={filtroNivel}
                onChange={(e) => setFiltroNivel(e.target.value)}
                className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg outline-none focus:border-[#0f766e] bg-white"
              >
                {niveles.map((niv) => (
                  <option key={niv} value={niv}>
                    {niv === 'todos' ? 'Todos' : niv}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={() => {
                setFiltroCategoria('todas');
                setFiltroNivel('todos');
                setBusqueda('');
              }}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              Limpiar filtros
            </button>
          </div>
        )}

        {catalogoFiltrado.length === 0 ? (
          <div className="bg-white border border-gray-200/60 rounded-2xl px-8 py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-6 h-6 text-gray-300" />
            </div>
            <h3 className="text-lg font-semibold text-gray-700 mb-1">No hay cursos disponibles</h3>
            <p className="text-sm text-gray-400">
              {busqueda || filtroCategoria !== 'todas' || filtroNivel !== 'todos'
                ? 'Intenta con otros filtros de búsqueda'
                : 'Vuelve más tarde para nuevos cursos'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {catalogoFiltrado.map((curso) => (
              <div
                key={curso.id}
                className="bg-white border border-gray-200/60 rounded-xl overflow-hidden hover:border-[#0f766e]/30 hover:shadow-lg transition-all group"
              >
                <div className="relative h-32 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center overflow-hidden">
                  {curso.imagen_url ? (
                    <img 
                      src={resolveImageUrl(curso.imagen_url)} 
                      alt={curso.titulo}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.parentElement.style.background = 'linear-gradient(135deg, #f9fafb, #f3f4f6)';
                      }}
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-2xl bg-white/80 backdrop-blur-sm border border-gray-200 flex items-center justify-center shadow-sm">
                      <GraduationCap className="w-7 h-7 text-[#0f766e]" />
                    </div>
                  )}
                  {curso.nivel && (
                    <span className="absolute top-3 right-3 px-2.5 py-0.5 text-[9px] font-medium rounded-full bg-white/90 backdrop-blur-sm border border-gray-200 text-gray-500">
                      {curso.nivel}
                    </span>
                  )}
                  {curso.precio_tipo === 'pago' && (
                    <span className="absolute top-3 left-3 px-2.5 py-0.5 text-[9px] font-medium rounded-full bg-amber-100 text-amber-700 flex items-center gap-0.5">
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
                  {curso.categoria && (
                    <span className="absolute bottom-3 right-3 px-2.5 py-0.5 text-[9px] font-medium rounded-full bg-white/90 backdrop-blur-sm border border-gray-200 text-gray-500">
                      {curso.categoria}
                    </span>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-medium text-gray-800 text-sm mb-1 line-clamp-1">
                    {curso.titulo}
                  </h3>
                  <p className="text-xs text-gray-400 line-clamp-2 mb-3 min-h-[2.5rem]">
                    {curso.descripcion || 'Sin descripción'}
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
                    {curso.rating && (
                      <span className="inline-flex items-center gap-1">
                        <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                        {curso.rating}
                      </span>
                    )}
                    {(curso.docente_nombre || curso.instructor) && (
                      <span className="inline-flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {curso.docente_nombre || curso.instructor}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => verCurso(curso.id)}
                      className="flex-1 px-3 py-2 text-xs font-medium text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-center gap-1"
                    >
                      <Eye className="w-3 h-3" />
                      Ver detalles
                    </button>
                    {curso.tiene_solicitud_pendiente ? (
                      <button
                        disabled
                        className="flex-1 px-3 py-2 text-xs font-medium text-amber-600 bg-amber-50 rounded-lg cursor-not-allowed flex items-center justify-center gap-1"
                      >
                        <Send className="w-3 h-3" />
                        Pendiente
                      </button>
                    ) : (
                      <button
                        onClick={() => handleInscribirse(curso)}
                        disabled={inscribiendo === curso.id}
                        className="flex-1 px-3 py-2 text-xs font-medium text-white rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
                        style={{ backgroundColor: '#0f766e' }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = '#0d5e57'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = '#0f766e'}
                      >
                        {inscribiendo === curso.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : curso.precio_tipo === 'pago' ? (
                          <Lock className="w-3 h-3" />
                        ) : (
                          <Plus className="w-3.5 h-3.5" />
                        )}
                        {curso.precio_tipo === 'pago' ? 'Solicitar' : 'Inscribirme'}
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