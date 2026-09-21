// front/src/components/examenes/HistorialEstudiante.jsx
// Historial completo de intentos de examen del estudiante.

import React, { useState, useEffect, useCallback } from 'react';
import {
  Award, BarChart3,
  ChevronDown, ChevronRight, Loader2, AlertCircle
} from 'lucide-react';
import examenesService from '../../services/examenesService';

const HistorialEstudiante = ({ usuarioId }) => {
  const [resultados, setResultados] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [filtro, setFiltro] = useState('todos');
  const [expandidos, setExpandidos] = useState({});

  const cargar = useCallback(async () => {
    if (!usuarioId) return;
    setCargando(true);
    setError('');
    try {
      const data = await examenesService.listarResultadosAlumno(usuarioId);
      setResultados(data || []);
    } catch (e) {
      console.error('Error cargando historial:', e);
      setError(e.message || 'No se pudo cargar el historial');
    } finally {
      setCargando(false);
    }
  }, [usuarioId]);

  useEffect(() => { cargar(); }, [cargar]);

  const fmtTiempo = (s) => {
    const seg = s || 0;
    return `${Math.floor(seg / 60)}m ${seg % 60}s`;
  };

  const fmtFecha = (f) => {
    if (!f) return '';
    return new Date(f).toLocaleString('es-PE', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  const getColor = (nota) => {
    const n = nota || 0;
    if (n >= 60) return 'text-emerald-600';
    if (n >= 42) return 'text-amber-600';
    return 'text-red-600';
  };

  const getEstadoBadge = (resultado) => {
    if (resultado.estado === 'TRAMPA') {
      return { label: 'Anulado', className: 'bg-red-50 text-red-600' };
    }
    if (resultado.aprobado) {
      return { label: 'Aprobado', className: 'bg-emerald-50 text-emerald-600' };
    }
    return { label: 'Desaprobado', className: 'bg-red-50 text-red-500' };
  };

  // Agrupar por examen_id
  const agrupados = {};
  resultados.forEach(r => {
    const eid = r.examen_id || r.examenId;
    if (!agrupados[eid]) {
      agrupados[eid] = {
        examenId: eid,
        titulo: r.titulo || `Examen #${eid}`,
        codigo: r.codigo || '',
        puntaje_aprobacion: r.puntaje_aprobacion || 60,
        intentos: []
      };
    }
    agrupados[eid].intentos.push(r);
  });

  const examenes = Object.values(agrupados).map(ex => {
    ex.intentos.sort((a, b) => new Date(a.entregado_en || 0) - new Date(b.entregado_en || 0));
    const validos = ex.intentos.filter(i => i.estado !== 'TRAMPA');
    ex.mejorIntento = validos.length > 0
      ? validos.reduce((mejor, actual) => (actual.calificacion || 0) > (mejor.calificacion || 0) ? actual : mejor)
      : null;
    return ex;
  });

  // Filtrar
  const examenesFiltrados = examenes.filter(ex => {
    if (filtro === 'aprobados') return ex.mejorIntento?.aprobado;
    if (filtro === 'desaprobados') return !ex.mejorIntento?.aprobado;
    return true;
  });

  // Estadísticas
  const totalExamenes = examenes.length;
  const aprobados = examenes.filter(ex => ex.mejorIntento?.aprobado).length;
  const todosCalificaciones = examenes.map(ex => ex.mejorIntento?.calificacion || 0).filter(c => c > 0);
  const promedio = todosCalificaciones.length
    ? (todosCalificaciones.reduce((s, c) => s + c, 0) / todosCalificaciones.length)
    : 0;
  const mejorCalificacion = todosCalificaciones.length ? Math.max(...todosCalificaciones) : 0;

  const toggleExpandir = (id) => setExpandidos(prev => ({ ...prev, [id]: !prev[id] }));

  const chips = [
    { value: 'todos', label: 'Todos' },
    { value: 'aprobados', label: 'Aprobados' },
    { value: 'desaprobados', label: 'Desaprobados' },
  ];

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
        <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
        <p className="text-sm text-red-500 mb-3">{error}</p>
        <button onClick={cargar} className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm">
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#e6f4f2' }}>
          <BarChart3 className="w-5 h-5" style={{ color: '#0f766e' }} />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900">Mi Historial de Exámenes</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {totalExamenes} examen{totalExamenes !== 1 ? 'es' : ''} rendido{totalExamenes !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{totalExamenes}</p>
          <p className="text-xs text-gray-500">Rendidos</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-emerald-600">{aprobados}</p>
          <p className="text-xs text-gray-500">Aprobados</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className={`text-2xl font-bold ${promedio >= 60 ? 'text-emerald-600' : 'text-amber-600'}`}>
            {promedio > 0 ? promedio.toFixed(1) + '%' : '—'}
          </p>
          <p className="text-xs text-gray-500">Promedio</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-[#0f766e]">
            {mejorCalificacion > 0 ? mejorCalificacion.toFixed(1) + '%' : '—'}
          </p>
          <p className="text-xs text-gray-500">Mejor</p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex gap-1">
        {chips.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setFiltro(value)}
            className={`px-3 py-2 text-[11px] font-medium rounded-lg border transition-all duration-200 ${
              filtro === value
                ? 'bg-gray-900 text-white border-gray-900'
                : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
            }`}
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Exam cards */}
      {examenesFiltrados.length > 0 ? (
        <div className="space-y-3">
          {examenesFiltrados.map(ex => {
            const expandido = expandidos[ex.examenId];
            const mejor = ex.mejorIntento;
            const badge = getEstadoBadge(mejor || {});

            return (
              <div key={ex.examenId} className="bg-white rounded-xl border border-gray-200 overflow-hidden transition-all duration-200">
                {/* Examen header */}
                <button
                  onClick={() => toggleExpandir(ex.examenId)}
                  className="w-full flex flex-wrap items-center gap-x-4 gap-y-2 p-4 hover:bg-gray-50 transition-colors text-left"
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                >
                  <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <Award className="w-4 h-4 text-gray-400" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{ex.titulo}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <code className="text-[11px] text-gray-400">{ex.codigo}</code>
                      <span className="text-[10px] text-gray-300">|</span>
                      <span className="text-[11px] text-gray-400">{ex.intentos.length} intento{ex.intentos.length !== 1 ? 's' : ''}</span>
                    </div>
                  </div>

                  {/* Mejor calificación */}
                  {mejor && (
                    <div className="text-right flex-shrink-0">
                      <p className={`text-sm font-bold ${getColor(mejor.calificacion)}`}>
                        {(mejor.calificacion || 0).toFixed(1)}%
                      </p>
                      <p className="text-[10px] text-gray-400">Mínimo: {ex.puntaje_aprobacion}%</p>
                    </div>
                  )}

                  {/* Badge */}
                  {mejor && (
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-medium ${badge.className}`}>
                      {badge.label}
                    </span>
                  )}

                  {/* Chevron */}
                  <div className="flex-shrink-0">
                    {expandido ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                  </div>
                </button>

                {/* Intentos expandidos */}
                {expandido && (
                  <div className="border-t border-gray-100 bg-gray-50/50 overflow-x-auto">
                    <div className="px-4 py-2 grid grid-cols-5 sm:grid-cols-6 gap-2 text-[10px] font-medium text-gray-400 uppercase tracking-wider min-w-[400px] sm:min-w-[580px]">
                      <span>Intento</span>
                      <span>Calificación</span>
                      <span>Estado</span>
                      <span className="hidden sm:block">Tiempo</span>
                      <span>Fecha</span>
                      <span className="hidden sm:block">Puntos</span>
                    </div>
                    {ex.intentos.map((intento, i) => {
                      const intentoBadge = getEstadoBadge(intento);
                      const esMejor = mejor && intento.id === mejor.id && intento.estado !== 'TRAMPA';

                      return (
                        <div
                          key={intento.id || i}
                          className={`px-4 py-2.5 grid grid-cols-5 sm:grid-cols-6 gap-2 text-xs items-center min-w-[400px] sm:min-w-[580px] ${
                            esMejor ? 'bg-emerald-50/50' : i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                          }`}
                        >
                          <span className="font-medium text-gray-600 flex items-center gap-1.5">
                            {intento.intento_numero || i + 1}
                            {esMejor && <Award className="w-3 h-3 text-emerald-500" />}
                          </span>
                          <span className={`font-semibold ${getColor(intento.calificacion)}`}>
                            {(intento.calificacion || 0).toFixed(1)}%
                          </span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium inline-block w-fit ${intentoBadge.className}`}>
                            {intentoBadge.label}
                          </span>
                          <span className="text-gray-500 hidden sm:block">{fmtTiempo(intento.tiempo_usado)}</span>
                          <span className="text-gray-400">{fmtFecha(intento.entregado_en)}</span>
                          <span className="text-gray-500 hidden sm:block">
                            {intento.puntos_obtenidos || 0}/{intento.total_puntos || 0}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
            <Award className="w-7 h-7 text-gray-400" />
          </div>
          <p className="text-sm font-medium text-gray-500 mb-1">
            {filtro !== 'todos' ? 'No hay exámenes en esta categoría' : 'No has rendido exámenes aún'}
          </p>
          <p className="text-xs text-gray-400">
            {filtro !== 'todos' ? 'Cambia el filtro para ver otros resultados' : 'Tus intentos aparecerán aquí'}
          </p>
        </div>
      )}
    </div>
  );
};

export default HistorialEstudiante;
