// src/components/examenes/ResultadosExamen.jsx
// VERSION CORREGIDA - COLORES CON PUNTAJE_APROBACION
import React, { useState, useEffect } from 'react';
import { 
  Search, Download, Trash2, BarChart3, RotateCcw, 
  ChevronDown, ChevronRight, ArrowLeft, Target, Users,
  TrendingUp, Award, Copy, CheckCircle2
} from 'lucide-react';
import { COLOR_PRIMARIO } from './constantes';
import examenesService from '../../services/examenesService';

const ResultadosExamen = ({ examenId, examenes, alumnos, onVolver }) => {
  const examen = (examenes || []).find(e => e.id === examenId) || null;
  const [resultados, setResultados] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [filtroAprobado, setFiltroAprobado] = useState('todos');
  const [cargando, setCargando] = useState(false);
  const [expandirAlumnos, setExpandirAlumnos] = useState({});
  const [mensaje, setMensaje] = useState(null);

  useEffect(() => { if (examenId) cargarResultados(); }, [examenId]);

  const cargarResultados = async () => {
    setCargando(true);
    try { const data = await examenesService.listarResultados(examenId); setResultados(data || []); } 
    catch { setResultados([]); } 
    finally { setCargando(false); }
  };

  const mostrarMensaje = (t) => { setMensaje(t); setTimeout(() => setMensaje(null), 2000); };

  const getNombreAlumno = (r) => r.alumno_nombre || 'Sin datos';
  const getGradoAlumno = (r) => r.alumno_grado || '';
  const getAlumnoId = (r) => r.alumno_id || r.alumnoId;
  
  // ✅ CORREGIDO: Usar puntaje_aprobacion del examen
  const aprobacion = examen?.puntaje_aprobacion || 60;

  // ✅ CORREGIDO: Color usando puntaje_aprobacion
  const getColor = (nota) => {
    const n = nota || 0;
    if (n >= aprobacion) return 'text-emerald-600';
    if (n >= aprobacion * 0.7) return 'text-amber-600';
    return 'text-red-600';
  };

  const agruparPorAlumno = () => {
    const grupos = {};
    resultados.forEach(r => {
      const id = getAlumnoId(r);
      if (!grupos[id]) grupos[id] = { alumnoId: id, nombre: getNombreAlumno(r), grado: getGradoAlumno(r), intentos: [], mejorNota: null, ultimoIntento: null, intentosRestantes: Math.max(0, (examen?.intentos_permitidos || 1)) };
      grupos[id].intentos.push(r);
    });
    Object.values(grupos).forEach(grupo => {
      grupo.intentos.sort((a, b) => new Date(a.entregado_en || 0) - new Date(b.entregado_en || 0));
      grupo.ultimoIntento = grupo.intentos[grupo.intentos.length - 1];
      const validos = grupo.intentos.filter(r => r.estado !== 'TRAMPA');
      grupo.mejorNota = validos.length > 0 ? validos.reduce((mejor, actual) => (actual.calificacion || 0) > (mejor.calificacion || 0) ? actual : mejor) : null;
      grupo.intentosRestantes = Math.max(0, (examen?.intentos_permitidos || 1) - grupo.intentos.length);
    });
    return Object.values(grupos);
  };

  const gruposAlumnos = agruparPorAlumno();

  const gruposFiltrados = gruposAlumnos.filter(grupo => {
    const nombre = grupo.nombre.toLowerCase();
    const b = !busqueda || nombre.includes(busqueda.toLowerCase());
    const nota = grupo.mejorNota?.calificacion || grupo.ultimoIntento?.calificacion || 0;
    if (filtroAprobado === 'aprobados') return b && nota >= aprobacion;
    if (filtroAprobado === 'desaprobados') return b && nota < aprobacion;
    return b;
  });

  const stats = {
    total: resultados.length,
    aprobados: gruposAlumnos.filter(g => (g.mejorNota?.calificacion || 0) >= aprobacion).length,
    promedio: gruposAlumnos.length ? (gruposAlumnos.reduce((s, g) => s + (g.mejorNota?.calificacion || 0), 0) / gruposAlumnos.length).toFixed(1) : 0,
    max: gruposAlumnos.length ? Math.max(...gruposAlumnos.map(g => g.mejorNota?.calificacion || 0)).toFixed(1) : 0,
    totalIntentos: resultados.length
  };

  const fmtTiempo = (s) => { const seg = s || 0; return `${Math.floor(seg / 60)}m ${seg % 60}s`; };
  const fmtFecha = (f) => f ? new Date(f).toLocaleString('es-PE', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' }) : '';

  const handleExportar = () => {
    if (!resultados.length) return;
    const csv = 'Alumno,Grado,Intento,Puntos,Porcentaje,Tiempo,Violaciones,Estado,Fecha\n' + resultados.map(r =>
      `${getNombreAlumno(r)},${getGradoAlumno(r)},${r.intento_numero || '-'},${r.puntos_obtenidos||0}/${r.total_puntos||0},${(r.calificacion||0).toFixed(1)}%,${fmtTiempo(r.tiempo_usado||0)},${r.violaciones||0},${r.estado},${fmtFecha(r.entregado_en)}`
    ).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' }); const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `resultados_${examen?.codigo||'examen'}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    mostrarMensaje('Exportado');
  };

  const handleLimpiar = async () => {
    if (!window.confirm('Eliminar todos los resultados?')) return;
    try { await examenesService.limpiarResultados(examenId); setResultados([]); mostrarMensaje('Resultados eliminados'); } 
    catch { mostrarMensaje('Error al limpiar'); }
  };

  const handleReiniciarIntento = async (alumnoId, nombre) => {
    if (!window.confirm(`Reiniciar intento de ${nombre}?`)) return;
    try { await examenesService.eliminarResultadoAlumno(examenId, alumnoId); await cargarResultados(); mostrarMensaje('Intento reiniciado'); } 
    catch { mostrarMensaje('Error al reiniciar'); }
  };

  const toggleExpandir = (alumnoId) => setExpandirAlumnos(prev => ({ ...prev, [alumnoId]: !prev[alumnoId] }));

  const chipsFiltro = [
    { value: 'todos', label: 'Todos' },
    { value: 'aprobados', label: 'Aprobados' },
    { value: 'desaprobados', label: 'Desaprobados' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      
      {mensaje && (
        <div className="fixed top-4 right-4 z-50 px-4 py-2.5 bg-white rounded-xl shadow-xl border border-gray-100 text-sm font-medium text-gray-700 animate-fadeIn flex items-center gap-2"
          style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.06))' }}>
          <CheckCircle2 className="w-4 h-4 text-emerald-500"/> {mensaje}
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 py-6">
        
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <button onClick={onVolver} className="p-2 hover:bg-gray-100 rounded-lg transition-colors" style={{ WebkitTapHighlightColor: 'transparent' }}>
              <ArrowLeft className="w-5 h-5 text-gray-600"/>
            </button>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Resultados</h1>
              <p className="text-xs text-gray-400 mt-0.5">
                {examen?.titulo} <code className="text-gray-500">{examen?.codigo}</code>
                {cargando && <span className="ml-2 text-emerald-500">Cargando...</span>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleExportar} disabled={!resultados.length}
              className="px-3 py-2 text-xs font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all flex items-center gap-1.5 disabled:opacity-40"
              style={{ WebkitTapHighlightColor: 'transparent' }}>
              <Download className="w-3.5 h-3.5"/> Exportar
            </button>
            {resultados.length > 0 && (
              <button onClick={handleLimpiar}
                className="px-3 py-2 text-xs font-medium text-red-500 hover:bg-red-50 rounded-lg transition-all flex items-center gap-1.5"
                style={{ WebkitTapHighlightColor: 'transparent' }}>
                <Trash2 className="w-3.5 h-3.5"/> Limpiar
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4 mb-6 flex-wrap">
          {[
            { label: 'Rindieron', value: `${gruposAlumnos.length}/${(alumnos||[]).length}`, icon: Users },
            { label: 'Aprobados', value: stats.aprobados, icon: Award },
            { label: 'Promedio', value: stats.promedio + '%', icon: Target },
            { label: 'Maxima', value: stats.max + '%', icon: TrendingUp },
            { label: 'Intentos', value: stats.totalIntentos, icon: RotateCcw },
          ].map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={i} className="flex items-center gap-2">
                <Icon className="w-3.5 h-3.5 text-gray-400"/>
                <span className="text-xs text-gray-500">{s.label}</span>
                <span className="text-sm font-semibold text-gray-700">{s.value}</span>
                {i < 4 && <span className="text-gray-200">|</span>}
              </div>
            );
          })}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"/>
            <input type="text" value={busqueda} onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar alumno..."
              className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-gray-200 rounded-xl outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all duration-200"
              style={{ WebkitTapHighlightColor: 'transparent', caretColor: COLOR_PRIMARIO }}/>
          </div>
          <div className="flex gap-1 sm:flex-shrink-0">
            {chipsFiltro.map(({ value, label }) => (
              <button key={value} onClick={() => setFiltroAprobado(value)}
                className={`flex-1 sm:flex-none px-3 py-2 text-[11px] font-medium rounded-lg border transition-all duration-200 ${
                  filtroAprobado === value ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                }`}
                style={{ WebkitTapHighlightColor: 'transparent' }}>{label}</button>
            ))}
          </div>
        </div>

        {gruposFiltrados.length > 0 ? (
          <div className="space-y-2">
            {gruposFiltrados.map((grupo) => {
              const expandido = expandirAlumnos[grupo.alumnoId];
              const notaMostrar = grupo.mejorNota || grupo.ultimoIntento;
              const nota = notaMostrar?.calificacion || 0;
              const esTrampa = notaMostrar?.estado === 'TRAMPA';
              const aprob = nota >= aprobacion;
              
              return (
                <div key={grupo.alumnoId} className="bg-white rounded-xl border border-gray-200 overflow-hidden transition-all duration-200">
                  
                  <button 
                    onClick={() => toggleExpandir(grupo.alumnoId)}
                    className="w-full flex flex-wrap items-center gap-x-4 gap-y-2 p-4 hover:bg-gray-50 transition-colors text-left"
                    style={{ WebkitTapHighlightColor: 'transparent' }}
                  >
                    <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <Users className="w-4 h-4 text-gray-400"/>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{grupo.nombre}</p>
                      <p className="text-[11px] text-gray-400">{grupo.grado}</p>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <p className={`text-sm font-bold ${getColor(nota)}`}>
                        {esTrampa ? 'Anulado' : `${notaMostrar?.puntos_obtenidos || 0}/${notaMostrar?.total_puntos || 0}`}
                      </p>
                      <p className="text-[11px] text-gray-400">{nota.toFixed(1)}%</p>
                    </div>

                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-medium ${
                      esTrampa ? 'bg-red-50 text-red-600' : aprob ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'
                    }`}>
                      {esTrampa ? 'Anulado' : aprob ? 'Aprobado' : 'Desaprobado'}
                    </span>

                    <div className="text-center flex-shrink-0 hidden sm:block">
                      <p className="text-[11px] font-medium text-gray-600">{grupo.intentos.length}/{examen?.intentos_permitidos || 1}</p>
                      <p className="text-[10px] text-gray-400">intentos</p>
                    </div>

                    <div className="flex items-center gap-1">
                      {grupo.intentosRestantes > 0 && (
                        <button onClick={(e) => { e.stopPropagation(); handleReiniciarIntento(grupo.alumnoId, grupo.nombre); }}
                          className="p-1.5 hover:bg-emerald-50 rounded-lg text-gray-400 hover:text-emerald-500 transition-all" title="Reiniciar intento"
                          style={{ WebkitTapHighlightColor: 'transparent' }}>
                          <RotateCcw className="w-3.5 h-3.5"/>
                        </button>
                      )}
                      {expandido ? <ChevronDown className="w-4 h-4 text-gray-400"/> : <ChevronRight className="w-4 h-4 text-gray-400"/>}
                    </div>
                  </button>

                  {expandido && (
                    <div className="border-t border-gray-100 bg-gray-50/50 overflow-x-auto">
                      <div className="px-4 py-2 grid grid-cols-3 sm:grid-cols-6 gap-2 text-[10px] font-medium text-gray-400 uppercase tracking-wider min-w-[260px] sm:min-w-[520px]">
                        <span>Intento</span><span>Puntos</span><span>Nota</span><span className="hidden sm:block">Tiempo</span><span className="hidden sm:block">Viol.</span><span>Fecha</span>
                      </div>
                      {grupo.intentos.map((intento, i) => (
                        <div key={intento.id || i} className={`px-4 py-2 grid grid-cols-3 sm:grid-cols-6 gap-2 text-xs items-center min-w-[260px] sm:min-w-[520px] ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                          <span className="font-medium text-gray-600">{i + 1}</span>
                          <span className="font-semibold text-gray-700">{intento.puntos_obtenidos || 0}/{intento.total_puntos || 0}</span>
                          <span className={`font-semibold ${getColor(intento.calificacion)}`}>{(intento.calificacion || 0).toFixed(1)}%</span>
                          <span className="text-gray-500 hidden sm:block">{fmtTiempo(intento.tiempo_usado)}</span>
                          <span className={`hidden sm:block ${(intento.violaciones || 0) > 0 ? 'text-red-500 font-semibold' : 'text-gray-400'}`}>
                            {intento.violaciones || 0}
                          </span>
                          <span className="text-gray-400">{fmtFecha(intento.entregado_en)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
              <BarChart3 className="w-7 h-7 text-gray-400"/>
            </div>
            <p className="text-sm font-medium text-gray-500 mb-1">Sin resultados</p>
            <p className="text-xs text-gray-400">
              {!(alumnos || []).length ? 'Cargue alumnos primero' : 'Ningún alumno ha rendido este examen'}
            </p>
          </div>
        )}

        {examen?.intentos_permitidos > 1 && (
          <div className="mt-4 px-4 py-3 bg-white rounded-xl border border-gray-200 flex items-center gap-3">
            <RotateCcw className="w-4 h-4 text-gray-400 flex-shrink-0"/>
            <p className="text-xs text-gray-500">
              <span className="font-medium text-gray-700">{examen?.intentos_permitidos} intentos</span> configurados por alumno.
              Use el botón de reinicio para permitir un nuevo intento individual.
            </p>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.2s ease-out; }
        * { -webkit-tap-highlight-color: transparent; }
        *:focus { outline: none !important; }
        input:focus, button:focus { outline: none !important; box-shadow: none !important; }
      `}</style>
    </div>
  );
};

export default ResultadosExamen;