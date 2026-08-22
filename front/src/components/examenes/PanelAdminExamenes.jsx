// src/components/examenes/PanelAdminExamenes.jsx
// PANEL DE EXAMENES SIN GRUPOS (FASE F)
// - Lista los examenes del sistema (sin organizarlos por grupos legacy)
// - Crear / editar / publicar / eliminar / resultados
// - Accion "Asignar a curso": enlaza el examen como leccion tipo 'examen'
//   dentro de un modulo del curso (contenido.examen_id)

import React, { useState, useEffect, useCallback } from 'react';
import {
  FileQuestion, Plus, Search, Trash2, ClipboardList, Link2,
  Edit3, Eye, EyeOff, Loader2, X, BookOpen, AlertCircle,
  CheckCircle2, Clock, ListChecks, Target, Layers, GraduationCap
} from 'lucide-react';
import examenesService from '../../services/examenesService';
import cursosService from '../../services/cursosService';
import { authService } from '../../services/authService';
import CreadorExamen from './CreadorExamen';
import ResultadosExamen from './ResultadosExamen';
import { COLOR_PRIMARIO } from './constantes';

const PanelAdminExamenes = ({ onSalir }) => {
  const usuario = authService.getCurrentUser();

  // =============================================
  // ESTADO
  // =============================================
  const [examenes, setExamenes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [mensaje, setMensaje] = useState(null);

  // Vistas internas
  const [vista, setVista] = useState('lista'); // 'lista' | 'crear' | 'editar' | 'resultados'
  const [examenEditar, setExamenEditar] = useState(null);
  const [examenResultados, setExamenResultados] = useState(null);

  // Modal detalle de preguntas
  const [detalleExamen, setDetalleExamen] = useState(null);
  const [mostrarDetalle, setMostrarDetalle] = useState(false);

  // Modal "Asignar a curso"
  const [asignando, setAsignando] = useState(null);
  const [cursos, setCursos] = useState([]);
  const [cursoSel, setCursoSel] = useState('');
  const [cursoData, setCursoData] = useState(null);
  const [moduloSel, setModuloSel] = useState('');
  const [leccionSel, setLeccionSel] = useState('__nueva__');
  const [tituloLeccion, setTituloLeccion] = useState('');
  const [guardandoAsignacion, setGuardandoAsignacion] = useState(false);

  const mostrarMensaje = (tipo, texto) => {
    setMensaje({ tipo, texto });
    setTimeout(() => setMensaje(null), 3000);
  };

  // =============================================
  // CARGA DE EXAMENES
  // =============================================
  const cargarExamenes = useCallback(async () => {
    setCargando(true);
    try {
      const data = await examenesService.listarExamenes();
      setExamenes(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Error cargando examenes:', e);
      mostrarMensaje('error', 'No se pudieron cargar los examenes');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargarExamenes(); }, [cargarExamenes]);

  // =============================================
  // FILTROS
  // =============================================
  const filtrados = examenes.filter(ex => {
    const q = busqueda.toLowerCase();
    const coincideBusqueda = !q ||
      (ex.titulo || '').toLowerCase().includes(q) ||
      (ex.codigo || '').toLowerCase().includes(q);
    const coincideEstado = filtroEstado === 'todos' || (ex.estado || 'BORRADOR') === filtroEstado;
    return coincideBusqueda && coincideEstado;
  });

  const totales = {
    total: examenes.length,
    publicados: examenes.filter(e => (e.estado || 'BORRADOR') === 'PUBLICADO').length,
    borradores: examenes.filter(e => (e.estado || 'BORRADOR') === 'BORRADOR').length,
  };

  // =============================================
  // ACCIONES SOBRE EXAMEN
  // =============================================
  const crearExamen = () => { setExamenEditar(null); setVista('crear'); };

  // ✅ CORREGIDO: Obtener examen completo antes de editar
  const editarExamen = async (examen) => {
    try {
      setCargando(true);
      const data = await examenesService.obtenerExamen(examen.id);
      setExamenEditar(data);
      setVista('editar');
      mostrarMensaje('ok', 'Examen cargado para editar');
    } catch (e) {
      console.error('Error cargando examen para editar:', e);
      mostrarMensaje('error', 'No se pudo cargar el examen para editar');
    } finally {
      setCargando(false);
    }
  };

  const guardarExamen = async (datosExamen) => {
    try {
      const { grupoId, ...datos } = datosExamen;
      if (examenEditar) {
        await examenesService.actualizarExamen(examenEditar.id, { ...datos, grupo_id: null });
        mostrarMensaje('ok', 'Examen actualizado correctamente');
      } else {
        await examenesService.crearExamen({ ...datos, grupo_id: null });
        mostrarMensaje('ok', 'Examen creado correctamente');
      }
      setVista('lista');
      setExamenEditar(null);
      cargarExamenes();
    } catch (e) {
      console.error('Error guardando examen:', e);
      mostrarMensaje('error', 'No se pudo guardar el examen');
    }
  };

  const cambiarEstado = async (examen, nuevoEstado) => {
    try {
      await examenesService.cambiarEstado(examen.id, nuevoEstado);
      mostrarMensaje('ok', nuevoEstado === 'PUBLICADO' ? 'Examen publicado' : 'Examen vuelto a borrador');
      cargarExamenes();
    } catch (e) {
      console.error('Error cambiando estado:', e);
      mostrarMensaje('error', 'No se pudo cambiar el estado');
    }
  };

  const eliminarExamen = async (examen) => {
    if (!window.confirm(`Eliminar el examen "${examen.titulo}"? Se borraran tambien sus preguntas y resultados.`)) return;
    try {
      await examenesService.eliminarExamen(examen.id);
      mostrarMensaje('ok', 'Examen eliminado');
      cargarExamenes();
    } catch (e) {
      console.error('Error eliminando examen:', e);
      mostrarMensaje('error', 'No se pudo eliminar el examen');
    }
  };

  const verResultados = (examen) => { setExamenResultados(examen); setVista('resultados'); };

  // =============================================
  // VER DETALLE CON PREGUNTAS
  // =============================================
  const verDetalle = async (examen) => {
    try {
      const data = await examenesService.obtenerExamen(examen.id);
      setDetalleExamen(data);
      setMostrarDetalle(true);
    } catch (e) {
      console.error('Error cargando detalle:', e);
      mostrarMensaje('error', 'No se pudo cargar el detalle del examen');
    }
  };

  // =============================================
  // ASIGNAR A CURSO
  // =============================================
  const abrirAsignar = async (examen) => {
    setAsignando(examen);
    setCursoSel(''); setCursoData(null); setModuloSel(''); setLeccionSel('__nueva__');
    setTituloLeccion(`Examen: ${examen.titulo}`);
    try {
      const data = await cursosService.listar({});
      setCursos(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Error cargando cursos:', e);
      setCursos([]);
    }
  };

  const seleccionarCurso = async (cursoId) => {
    setCursoSel(cursoId);
    setModuloSel('');
    setLeccionSel('__nueva__');
    if (!cursoId) { setCursoData(null); return; }
    try {
      const curso = await cursosService.obtener(cursoId);
      setCursoData(curso);
      const modulos = curso?.modulos || [];
      if (modulos.length === 1) setModuloSel(modulos[0].id);
    } catch (e) {
      console.error('Error obteniendo curso:', e);
      setCursoData(null);
      mostrarMensaje('error', 'No se pudo obtener el curso');
    }
  };

  const leccionesModulo = (moduloId) => {
    const modulo = (cursoData?.modulos || []).find(m => m.id === moduloId);
    return modulo?.lecciones || [];
  };

  const guardarAsignacion = async () => {
    if (!cursoData || !moduloSel) {
      mostrarMensaje('error', 'Selecciona un curso y un modulo');
      return;
    }
    const modulos = JSON.parse(JSON.stringify(cursoData.modulos || []));
    const idxModulo = modulos.findIndex(m => m.id === moduloSel);
    if (idxModulo === -1) {
      mostrarMensaje('error', 'Modulo no encontrado');
      return;
    }
    const lecciones = modulos[idxModulo].lecciones || [];
    let leccion;
    if (leccionSel === '__nueva__') {
      leccion = {
        id: `lec_${Date.now()}`,
        titulo: tituloLeccion.trim() || `Examen: ${asignando.titulo}`,
        tipo: 'examen',
        contenido: { examen_id: asignando.id }
      };
      lecciones.push(leccion);
    } else {
      const idxLeccion = lecciones.findIndex(l => l.id === leccionSel);
      if (idxLeccion === -1) {
        mostrarMensaje('error', 'Leccion no encontrada');
        return;
      }
      lecciones[idxLeccion] = {
        ...lecciones[idxLeccion],
        titulo: tituloLeccion.trim() || lecciones[idxLeccion].titulo,
        tipo: 'examen',
        contenido: { examen_id: asignando.id }
      };
    }
    modulos[idxModulo].lecciones = lecciones;

    setGuardandoAsignacion(true);
    try {
      await cursosService.actualizar(cursoData.id, { modulos });
      mostrarMensaje('ok', `Examen asignado a "${cursoData.titulo}"`);
      setAsignando(null);
    } catch (e) {
      console.error('Error asignando examen:', e);
      mostrarMensaje('error', 'No se pudo asignar el examen al curso');
    } finally {
      setGuardandoAsignacion(false);
    }
  };

  // =============================================
  // RENDER: vistas internas
  // =============================================
  if (vista === 'crear' || vista === 'editar') {
    return (
      <CreadorExamen
        examen={examenEditar}
        onGuardar={guardarExamen}
        onVolver={() => { setVista('lista'); setExamenEditar(null); }}
      />
    );
  }

  if (vista === 'resultados' && examenResultados) {
    return (
      <ResultadosExamen
        examenId={examenResultados.id}
        examenes={[examenResultados]}
        alumnos={[]}
        onVolver={() => { setVista('lista'); setExamenResultados(null); }}
      />
    );
  }

  const estadoBadge = (estado) => {
    const e = estado || 'BORRADOR';
    if (e === 'PUBLICADO') return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-600"><CheckCircle2 className="w-3 h-3" />Publicado</span>;
    if (e === 'CERRADO') return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-500">Cerrado</span>;
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-600">Borrador</span>;
  };

  // =============================================
  // RENDER: lista
  // =============================================
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
      {/* Mensaje flotante */}
      {mensaje && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm text-white ${mensaje.tipo === 'ok' ? 'bg-emerald-500' : 'bg-red-500'}`}>
          {mensaje.tipo === 'ok' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {mensaje.texto}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
            <FileQuestion className="w-5 h-5 text-indigo-500" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Examenes</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              Crea, publica y asigna examenes a tus cursos
            </p>
          </div>
        </div>
        <button
          onClick={crearExamen}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white rounded-xl hover:opacity-90 transition-colors shadow-sm"
          style={{ backgroundColor: COLOR_PRIMARIO }}
        >
          <Plus className="w-4 h-4" />Nuevo examen
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-8">
        <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
            <FileQuestion className="w-5 h-5 text-indigo-500" />
          </div>
          <div className="min-w-0">
            <p className="text-xl font-bold text-gray-900 leading-tight">{totales.total}</p>
            <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wide">Examenes</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
            <Eye className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="min-w-0">
            <p className="text-xl font-bold text-gray-900 leading-tight">{totales.publicados}</p>
            <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wide">Publicados</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3 shadow-sm col-span-2 lg:col-span-1">
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
            <Edit3 className="w-5 h-5 text-amber-500" />
          </div>
          <div className="min-w-0">
            <p className="text-xl font-bold text-gray-900 leading-tight">{totales.borradores}</p>
            <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wide">Borradores</p>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-gray-300 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por titulo o codigo..."
            className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all"
          />
        </div>
        <div className="flex items-center gap-2">
          {['todos', 'PUBLICADO', 'BORRADOR'].map(estado => (
            <button
              key={estado}
              onClick={() => setFiltroEstado(estado)}
              className={`px-3.5 py-2 rounded-xl text-xs font-medium transition-colors ${
                filtroEstado === estado
                  ? 'bg-gray-900 text-white'
                  : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {estado === 'todos' ? 'Todos' : estado === 'PUBLICADO' ? 'Publicados' : 'Borradores'}
            </button>
          ))}
        </div>
      </div>

      {/* Lista */}
      {cargando ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
        </div>
      ) : filtrados.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-2xl py-16 flex flex-col items-center text-center px-4 shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mb-4">
            <FileQuestion className="w-6 h-6 text-gray-300" />
          </div>
          <h3 className="text-sm font-semibold text-gray-700 mb-1">No hay examenes</h3>
          <p className="text-xs text-gray-400 mb-5 max-w-xs">
            {examenes.length === 0
              ? 'Crea tu primer examen y luego asignalo a un curso como leccion.'
              : 'Ningun examen coincide con la busqueda o el filtro.'}
          </p>
          {examenes.length === 0 && (
            <button
              onClick={crearExamen}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-xl hover:opacity-90 transition-colors"
              style={{ backgroundColor: COLOR_PRIMARIO }}
            >
              <Plus className="w-4 h-4" />Crear primer examen
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtrados.map(examen => {
            // ✅ CORREGIDO: Usar total_preguntas en lugar de preguntas.length
            const totalPreguntas = examen.total_preguntas || 0;
            const esPublicado = (examen.estado || 'BORRADOR') === 'PUBLICADO';
            return (
              <div key={examen.id} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-gray-900 truncate">{examen.titulo}</h3>
                    {examen.codigo && <p className="text-[11px] text-gray-400 mt-0.5">{examen.codigo}</p>}
                  </div>
                  {estadoBadge(examen.estado)}
                </div>

                <div className="flex items-center gap-4 text-[11px] text-gray-400 mb-4">
                  <span className="inline-flex items-center gap-1">
                    <ListChecks className="w-3.5 h-3.5" />
                    {totalPreguntas} preguntas
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {examen.tiempo_limite || 60} min
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Target className="w-3.5 h-3.5" />
                    {examen.puntaje_aprobacion || 60}%
                  </span>
                </div>

                <div className="flex items-center gap-1.5 mt-auto pt-3 border-t border-gray-50 flex-wrap">
                  <button
                    onClick={() => abrirAsignar(examen)}
                    title="Asignar a curso"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                  >
                    <Link2 className="w-3.5 h-3.5" />Asignar a curso
                  </button>
                  <button
                    onClick={() => verResultados(examen)}
                    title="Resultados"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <ClipboardList className="w-3.5 h-3.5" />Resultados
                  </button>
                  <button
                    onClick={() => verDetalle(examen)}
                    title="Ver preguntas"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
                  >
                    <FileQuestion className="w-3.5 h-3.5" />Preguntas
                  </button>
                  <button
                    onClick={() => editarExamen(examen)}
                    title="Editar"
                    className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => cambiarEstado(examen, esPublicado ? 'BORRADOR' : 'PUBLICADO')}
                    title={esPublicado ? 'Pasar a borrador' : 'Publicar'}
                    className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                  >
                    {esPublicado ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={() => eliminarExamen(examen)}
                    title="Eliminar"
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* =============================================
          MODAL: DETALLE DE EXAMEN CON PREGUNTAS
      ============================================= */}
      {mostrarDetalle && detalleExamen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white z-10 flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-bold text-gray-900">{detalleExamen.titulo}</h2>
                <p className="text-[11px] text-gray-400">{detalleExamen.codigo}</p>
              </div>
              <button
                onClick={() => setMostrarDetalle(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              <div className="mb-4">
                <p className="text-sm text-gray-500">{detalleExamen.descripcion || 'Sin descripcion'}</p>
                <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                  <span>Total preguntas: {detalleExamen.preguntas?.length || 0}</span>
                  <span>Tiempo limite: {detalleExamen.tiempo_limite || 60} min</span>
                  <span>Aprobacion: {detalleExamen.puntaje_aprobacion || 60}%</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                    detalleExamen.estado === 'PUBLICADO' 
                      ? 'bg-emerald-50 text-emerald-600' 
                      : 'bg-amber-50 text-amber-600'
                  }`}>
                    {detalleExamen.estado || 'BORRADOR'}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-700">Preguntas</h3>
                {detalleExamen.preguntas?.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-8">Este examen no tiene preguntas</p>
                ) : (
                  detalleExamen.preguntas?.map((pregunta, index) => (
                    <div key={pregunta.id} className="border border-gray-100 rounded-xl p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start gap-2">
                        <span className="text-xs font-bold text-gray-400 min-w-[24px]">{index + 1}.</span>
                        <div className="flex-1">
                          <p className="text-sm text-gray-800">{pregunta.enunciado}</p>
                          <div className="flex items-center gap-3 mt-1.5 text-[10px] text-gray-400">
                            <span className="capitalize px-2 py-0.5 bg-gray-100 rounded-full">{pregunta.tipo}</span>
                            <span>Puntos: {pregunta.puntos || 1}</span>
                            {pregunta.tipo === 'opcion_multiple' && (
                              <span>Opciones: {[pregunta.opcion_a, pregunta.opcion_b, pregunta.opcion_c, pregunta.opcion_d, pregunta.opcion_e].filter(Boolean).length}</span>
                            )}
                          </div>
                          {pregunta.tipo === 'opcion_multiple' && (
                            <div className="mt-2 space-y-1">
                              {['A', 'B', 'C', 'D', 'E'].map(letra => {
                                const opcion = pregunta[`opcion_${letra.toLowerCase()}`];
                                if (!opcion) return null;
                                const esCorrecta = pregunta.respuesta_correcta === letra;
                                return (
                                  <div key={letra} className={`text-xs px-2 py-0.5 rounded flex items-center gap-2 ${esCorrecta ? 'bg-emerald-50 text-emerald-700' : 'text-gray-600'}`}>
                                    <span className="font-medium">{letra}.</span> {opcion}
                                    {esCorrecta && <CheckCircle2 className="w-3 h-3 text-emerald-500 ml-1" />}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                          {pregunta.tipo === 'verdadero_falso' && pregunta.afirmaciones && (
                            <div className="mt-2 space-y-1">
                              {pregunta.afirmaciones.map((af, idx) => (
                                <div key={idx} className="text-xs text-gray-600 flex items-center gap-2">
                                  <span>{af.texto}</span>
                                  <span className={`px-1.5 py-0.5 rounded text-[10px] ${af.esVerdadero ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                    {af.esVerdadero ? 'Verdadero' : 'Falso'}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                          {pregunta.tipo === 'respuesta_corta' && (
                            <div className="mt-2 text-xs text-gray-500">
                              Respuesta correcta: <span className="font-medium text-gray-700">{pregunta.respuesta_corta}</span>
                              {pregunta.respuestas_alternativas?.length > 0 && (
                                <span className="ml-2">Alternativas: {pregunta.respuestas_alternativas.join(', ')}</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setMostrarDetalle(false)}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-xl transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =============================================
          MODAL: ASIGNAR EXAMEN A CURSO
      ============================================= */}
      {asignando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => !guardandoAsignacion && setAsignando(null)}>
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Asignar examen a un curso</h2>
                <p className="text-[11px] text-gray-400 mt-0.5">"{asignando.titulo}" se anadira como leccion tipo examen</p>
              </div>
              <button onClick={() => setAsignando(null)} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {/* Curso */}
              <div>
                <label className="block text-[11px] font-medium text-gray-500 mb-1.5">Curso</label>
                <select
                  value={cursoSel}
                  onChange={(e) => seleccionarCurso(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-gray-200 rounded-xl outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all"
                >
                  <option value="">Selecciona un curso...</option>
                  {cursos.map(c => (
                    <option key={c.id} value={c.id}>{c.titulo}</option>
                  ))}  
                </select>
                {cursos.length === 0 && (
                  <p className="text-[11px] text-amber-600 mt-1.5">No hay cursos disponibles. Crea un curso primero.</p>
                )}
              </div>

              {/* Modulo */}
              {cursoData && (
                <div>
                  <label className="block text-[11px] font-medium text-gray-500 mb-1.5">Modulo</label>
                  <select
                    value={moduloSel}
                    onChange={(e) => { setModuloSel(e.target.value); setLeccionSel('__nueva__'); }}
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-gray-200 rounded-xl outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all"
                  >
                    <option value="">Selecciona un modulo...</option>
                    {(cursoData.modulos || []).map(m => (
                      <option key={m.id} value={m.id}>{m.titulo}</option>
                    ))}
                  </select>
                  {(cursoData.modulos || []).length === 0 && (
                    <p className="text-[11px] text-amber-600 mt-1.5">El curso no tiene modulos. Crea un modulo en el curso primero.</p>
                  )}
                </div>
              )}

              {/* Leccion */}
              {cursoData && moduloSel && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-medium text-gray-500 mb-1.5">Leccion</label>
                    <select
                      value={leccionSel}
                      onChange={(e) => {
                        setLeccionSel(e.target.value);
                        if (e.target.value !== '__nueva__') {
                          const lec = leccionesModulo(moduloSel).find(l => l.id === e.target.value);
                          setTituloLeccion(lec?.titulo || '');
                        }
                      }}
                      className="w-full px-3.5 py-2.5 text-sm bg-white border border-gray-200 rounded-xl outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all"
                    >
                      <option value="__nueva__">Crear nueva leccion</option>
                      {leccionesModulo(moduloSel).map(l => (
                        <option key={l.id} value={l.id}>{l.titulo} {l.tipo === 'examen' ? '(examen)' : ''}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-gray-500 mb-1.5">Titulo de la leccion</label>
                    <input
                      type="text"
                      value={tituloLeccion}
                      onChange={(e) => setTituloLeccion(e.target.value)}
                      placeholder="Titulo de la leccion"
                      className="w-full px-3.5 py-2.5 text-sm bg-white border border-gray-200 rounded-xl outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all"
                    />
                  </div>
                  <div className="flex items-start gap-2 bg-indigo-50 rounded-xl p-3">
                    <Layers className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
                    <p className="text-[11px] text-indigo-600 leading-relaxed">
                      El examen se enlazara a la leccion. Los estudiantes la veran dentro del curso y el progreso se actualizara al aprobarla.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100">
              <button
                onClick={() => setAsignando(null)}
                disabled={guardandoAsignacion}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={guardarAsignacion}
                disabled={guardandoAsignacion || !cursoSel || !moduloSel}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-xl hover:opacity-90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ backgroundColor: COLOR_PRIMARIO }}
              >
                {guardandoAsignacion ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
                Asignar al curso
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PanelAdminExamenes;