// front/src/pages/DashboardEstudiante.jsx
// DASHBOARD DEL ESTUDIANTE - CON COMPONENTES UI

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  CheckCircle2,
  Loader2,
  ChevronRight,
  Play,
  Award,
  Clock,
  TrendingUp,
  Calendar,
  ArrowRight
} from 'lucide-react';
import { Button, Badge } from '../components/ui';
import cursosService from '../services/cursosService';
import certificadosService from '../services/certificadosService';
import { authService } from '../services/authService';

const DashboardEstudiante = () => {
  const navigate = useNavigate();
  const usuario = authService.getCurrentUser();
  const [cargando, setCargando] = useState(true);
  const [inscripciones, setInscripciones] = useState([]);
  const [cursos, setCursos] = useState([]);
  const [certificados, setCertificados] = useState([]);

  useEffect(() => {
    const cargar = async () => {
      try {
        const [mis, cat, cert] = await Promise.allSettled([
          cursosService.misCursos().catch(() => []),
          cursosService.listar({ estado: 'publicado' }).catch(() => []),
          certificadosService.listar({ estudiante_id: usuario?.id }).catch(() => []),
        ]);
        setInscripciones(Array.isArray(mis.value) ? mis.value : []);
        setCursos(Array.isArray(cat.value) ? cat.value : []);
        setCertificados(Array.isArray(cert.value) ? cert.value : []);
      } catch (e) {
        console.error('Error cargando dashboard:', e);
      } finally {
        setCargando(false);
      }
    };
    cargar();
  }, [usuario?.id]);

  const catalogoPorId = {};
  cursos.forEach((c) => { catalogoPorId[c.id] = c; });

  const misCursos = inscripciones
    .map((i) => ({ ...i, curso: catalogoPorId[i.curso_id] }))
    .filter((i) => i.curso);

  const stats = {
    activos: misCursos.filter((i) => !i.completado).length,
    completados: misCursos.filter((i) => i.completado).length,
    certificados: certificados.length,
    total: misCursos.length,
  };

  const obtenerFechaInscripcion = (fecha) => {
    if (!fecha) return '';
    const d = new Date(fecha);
    return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const formatearProgreso = (progreso) => {
    return Math.min(Math.round(progreso || 0), 100);
  };

  const handleContinuarCurso = (cursoId) => {
    navigate(`/estudiante/cursos/${cursoId}`);
  };

  if (cargando) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-gray-300" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">
          Hola, {usuario?.nombres || 'Estudiante'}
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          {stats.total} curso{stats.total !== 1 ? 's' : ''} en progreso
        </p>
      </div>

      {/* Stats Grid con Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-8">
        <div className="bg-white border border-gray-100 rounded-lg px-4 py-3">
          <p className="text-xl sm:text-2xl font-semibold text-gray-900">{stats.total}</p>
          <Badge variant="default" size="sm">Inscritos</Badge>
        </div>
        <div className="bg-white border border-gray-100 rounded-lg px-4 py-3">
          <p className="text-xl sm:text-2xl font-semibold text-gray-900">{stats.activos}</p>
          <Badge variant="primary" size="sm">En curso</Badge>
        </div>
        <div className="bg-white border border-gray-100 rounded-lg px-4 py-3">
          <p className="text-xl sm:text-2xl font-semibold text-gray-900">{stats.completados}</p>
          <Badge variant="success" size="sm">Completados</Badge>
        </div>
        <div className="bg-white border border-gray-100 rounded-lg px-4 py-3">
          <p className="text-xl sm:text-2xl font-semibold text-gray-900">{stats.certificados}</p>
          <Badge variant="warning" size="sm">Certificados</Badge>
        </div>
      </div>

      {/* Mis Cursos */}
      <div className="bg-white border border-gray-100 rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-gray-400" />
            <h2 className="text-sm font-medium text-gray-700">Mis cursos</h2>
          </div>
          {misCursos.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/estudiante/cursos')}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              Ver todos
              <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          )}
        </div>

        {misCursos.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <div className="w-12 h-12 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center mx-auto mb-3">
              <BookOpen className="w-5 h-5 text-gray-300" />
            </div>
            <p className="text-sm text-gray-400 mb-3">Aún no tienes cursos inscritos</p>
            <Button
              variant="primary"
              onClick={() => navigate('/estudiante/cursos')}
            >
              Explorar cursos
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {misCursos.slice(0, 5).map(({ curso, progreso, completado, fecha_inscripcion }) => {
              const pct = formatearProgreso(progreso);
              return (
                <div
                  key={curso.id}
                  onClick={() => handleContinuarCurso(curso.id)}
                  className="px-5 py-4 hover:bg-gray-50/50 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-9 h-9 rounded-md flex items-center justify-center flex-shrink-0 ${
                      completado ? 'bg-emerald-50' : 'bg-gray-50'
                    }`}>
                      {completado ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <BookOpen className="w-4 h-4 text-gray-400" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <h3 className="text-sm font-medium text-gray-800 truncate">
                          {curso.titulo}
                        </h3>
                        {completado && (
                          <Badge variant="success" size="sm">Completado</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-1.5">
                        <div className="flex items-center gap-2 flex-1 max-w-[200px]">
                          <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                completado ? 'bg-emerald-500' : 'bg-gray-700'
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-gray-400 font-medium min-w-[32px]">
                            {pct}%
                          </span>
                        </div>
                        {fecha_inscripcion && (
                          <span className="text-[10px] text-gray-400 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {obtenerFechaInscripcion(fecha_inscripcion)}
                          </span>
                        )}
                      </div>
                    </div>

                    {!completado && (
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
      </div>

      {/* Certificados recientes */}
      {certificados.length > 0 && (
        <div className="mt-6 bg-white border border-gray-100 rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-gray-400" />
              <h2 className="text-sm font-medium text-gray-700">Certificados recientes</h2>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/estudiante/certificados')}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              Ver todos
              <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </div>
          <div className="divide-y divide-gray-50">
            {certificados.slice(0, 3).map((cert) => (
              <div key={cert.id} className="px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-md bg-amber-50 border border-amber-100 flex items-center justify-center flex-shrink-0">
                    <Award className="w-4 h-4 text-amber-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-gray-700 truncate">{cert.curso_titulo || 'Curso'}</p>
                    <p className="text-[10px] text-gray-400">
                      {cert.codigo || `CERT-${cert.id?.slice(0, 8)}`}
                    </p>
                  </div>
                </div>
                <Badge variant="warning" size="sm">
                  {cert.fecha_emision
                    ? new Date(cert.fecha_emision).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
                    : ''}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardEstudiante;