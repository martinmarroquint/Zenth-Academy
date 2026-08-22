// front/src/components/cursos/CalificacionesEstudiante.jsx
// Vista de calificaciones del estudiante en un curso: notas por lección/evaluación y promedio.

import React, { useState, useEffect, useCallback } from 'react';
import {
  Award, BookOpen, FileText, Video, Link as LinkIcon,
  Loader2, TrendingUp, CheckCircle, XCircle, AlertCircle
} from 'lucide-react';
import cursosService from '../../services/cursosService';

const getTipoIcon = (tipo) => {
  switch (tipo) {
    case 'video': return <Video className="w-4 h-4" />;
    case 'texto': return <FileText className="w-4 h-4" />;
    case 'quiz': return <BookOpen className="w-4 h-4" />;
    case 'examen': return <Award className="w-4 h-4" />;
    case 'recurso': return <LinkIcon className="w-4 h-4" />;
    default: return <FileText className="w-4 h-4" />;
  }
};

const getNotaColor = (nota, aprobado) => {
  if (nota == null) return 'text-gray-400';
  if (aprobado) return 'text-emerald-600';
  return 'text-red-500';
};

const CalificacionesEstudiante = ({ cursoId }) => {
  const [data, setData] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      const resultado = await cursosService.obtenerProgresoDetallado(cursoId);
      setData(resultado);
    } catch (e) {
      console.error('Error cargando calificaciones:', e);
      setError(e.message || 'No se pudieron cargar las calificaciones');
    } finally {
      setCargando(false);
    }
  }, [cursoId]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  if (cargando) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
        <p className="text-sm text-red-500 mb-3">{error}</p>
        <button onClick={cargar} className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm">
          Reintentar
        </button>
      </div>
    );
  }

  // Recolectar todas las lecciones con nota
  const todasLecciones = (data?.modulos || []).flatMap(m =>
    (m.lecciones || []).map(l => ({ ...l, modulo: m.titulo }))
  );
  const conNota = todasLecciones.filter(l => l.nota != null);
  const evaluadas = todasLecciones.filter(l => l.tipo === 'examen' || l.tipo === 'quiz');
  const promedio = conNota.length
    ? (conNota.reduce((s, l) => s + l.nota, 0) / conNota.length)
    : 0;
  const aprobadas = conNota.filter(l => l.aprobado).length;

  return (
    <div className="space-y-6">
      {/* Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{conNota.length}</p>
          <p className="text-xs text-gray-500">Actividades con nota</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className={`text-2xl font-bold ${promedio >= 11 ? 'text-emerald-600' : 'text-amber-600'}`}>
            {conNota.length ? promedio.toFixed(1) : '—'}
          </p>
          <p className="text-xs text-gray-500">Promedio general</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-emerald-600">{aprobadas}/{conNota.length}</p>
          <p className="text-xs text-gray-500">Aprobadas</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{data?.progreso_total || 0}%</p>
          <p className="text-xs text-gray-500">Progreso del curso</p>
        </div>
      </div>

      {/* Lista de lecciones con nota */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-indigo-600" />
          <h3 className="font-semibold text-gray-900">Calificaciones por actividad</h3>
        </div>

        {conNota.length === 0 ? (
          <div className="text-center py-12">
            <Award className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-700">Aún no tienes calificaciones</p>
            <p className="text-xs text-gray-500 mt-1">
              Las notas aparecerán al completar evaluaciones y cuestionarios del curso
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {conNota.map((leccion) => (
              <div key={leccion.id} className="px-5 py-3.5 flex items-center gap-4">
                <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 flex-shrink-0">
                  {getTipoIcon(leccion.tipo)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{leccion.titulo}</p>
                  <p className="text-xs text-gray-400 truncate">
                    {leccion.modulo} • {leccion.intentos || 0} intento(s)
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {leccion.aprobado ? (
                    <span className="flex items-center gap-1 text-xs text-emerald-600">
                      <CheckCircle className="w-3.5 h-3.5" /> Aprobado
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-red-500">
                      <XCircle className="w-3.5 h-3.5" /> No aprobado
                    </span>
                  )}
                  <span className={`text-lg font-bold ${getNotaColor(leccion.nota, leccion.aprobado)}`}>
                    {leccion.nota.toFixed(1)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Nota sobre exámenes sin calificar */}
      {evaluadas.length > conNota.length && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-700">
            Hay {evaluadas.length - conNota.length} evaluación(es) pendiente(s) de calificar.
            Las notas aparecerán cuando completes los exámenes.
          </p>
        </div>
      )}
    </div>
  );
};

export default CalificacionesEstudiante;