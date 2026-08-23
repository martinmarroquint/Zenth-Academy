// front/src/components/cursos/PanelCursos.jsx
// VERSIÓN GOOGLE CLASSROOM - DISEÑO LIMPIO Y ENFOCADO EN ACCIÓN

import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus, Search, BookOpen, Users, Clock, Star,
  GraduationCap, Loader2, FileText, Award,
  Trash2, Eye, Play, Edit3, Send, ChevronRight,
  FolderOpen, Calendar, MoreVertical, Copy,
  Archive, Download, TrendingUp, CheckCircle,
  AlertCircle, Settings, Link as LinkIcon
} from 'lucide-react';
import { Button, Input, Dropdown, Badge } from '../ui';
import cursosService from '../../services/cursosService';
import { authService } from '../../services/authService';

const PanelCursos = ({ onCrearCurso, onVerCurso, onEditarCurso }) => {
  const usuario = authService.getCurrentUser();
  const esAdmin = usuario?.rol === 'admin';
  const usuarioId = usuario?.id;
  const [cursos, setCursos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState('todos');
  const [eliminando, setEliminando] = useState(null);
  const [publicando, setPublicando] = useState(null);
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [solicitudesPendientes, setSolicitudesPendientes] = useState(0);
  const [vista, setVista] = useState('grid'); // 'grid' | 'list'
  const [ordenando, setOrdenando] = useState(false);

  const cargarCursos = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      const filtros = esAdmin ? {} : { docente_id: usuarioId };
      const data = await cursosService.listar(filtros);
      setCursos(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Error cargando cursos:', e);
      setError(e.message || 'No se pudieron cargar los cursos');
      setCursos([]);
    } finally {
      setCargando(false);
    }
  }, [esAdmin, usuarioId]);

  useEffect(() => {
    const cargarSolicitudes = async () => {
      try {
        const data = await cursosService.solicitudesPendientes();
        setSolicitudesPendientes(
          Array.isArray(data) ? data.filter((s) => s.estado === 'pendiente').length : 0
        );
      } catch (e) {
        console.warn('No se pudieron cargar solicitudes pendientes:', e);
      }
    };
    cargarSolicitudes();
  }, []);

  useEffect(() => {
    cargarCursos();
  }, [cargarCursos]);

  const handleEliminar = async (id, titulo) => {
    if (!window.confirm(`¿Eliminar el curso "${titulo}"?`)) return;
    setEliminando(id);
    try {
      await cursosService.eliminar(id);
      await cargarCursos();
    } catch (e) {
      console.error('Error eliminando curso:', e);
      alert(e.message || 'No se pudo eliminar el curso');
    } finally {
      setEliminando(null);
    }
  };

  const handlePublicar = async (id, titulo) => {
    if (!window.confirm(`¿Publicar el curso "${titulo}"?`)) return;
    setPublicando(id);
    try {
      await cursosService.publicar(id);
      await cargarCursos();
    } catch (e) {
      console.error('Error publicando curso:', e);
      alert(e.message || 'No se pudo publicar el curso');
    } finally {
      setPublicando(null);
    }
  };

  const categoriasOptions = [
    { value: 'todos', label: 'Todos' },
    { value: 'programacion', label: 'Programación' },
    { value: 'web', label: 'Desarrollo Web' },
    { value: 'movil', label: 'Desarrollo Móvil' },
    { value: 'datos', label: 'Data Science' },
    { value: 'ia', label: 'Inteligencia Artificial' },
    { value: 'diseno', label: 'Diseño' },
    { value: 'marketing', label: 'Marketing' },
    { value: 'negocios', label: 'Negocios' },
    { value: 'educacion', label: 'Educación' },
    { value: 'salud', label: 'Salud' },
    { value: 'idiomas', label: 'Idiomas' },
    { value: 'musica', label: 'Música' },
    { value: 'arte', label: 'Arte' },
    { value: 'fotografia', label: 'Fotografía' },
    { value: 'finanzas', label: 'Finanzas' },
    { value: 'emprendimiento', label: 'Emprendimiento' },
    { value: 'liderazgo', label: 'Liderazgo' },
    { value: 'productividad', label: 'Productividad' },
    { value: 'bienestar', label: 'Bienestar' },
  ];

  const estadoOptions = [
    { value: 'todos', label: 'Todos los estados' },
    { value: 'publicado', label: 'Publicados' },
    { value: 'borrador', label: 'Borradores' },
    { value: 'archivado', label: 'Archivados' },
  ];

  const cursosFiltrados = cursos.filter(c => {
    const matchBusqueda = (c.titulo || '').toLowerCase().includes(busqueda.toLowerCase()) ||
                          (c.descripcion || '').toLowerCase().includes(busqueda.toLowerCase()) ||
                          (c.instructor || '').toLowerCase().includes(busqueda.toLowerCase());
    const matchFiltro = filtro === 'todos' || c.categoria === filtro;
    const matchEstado = filtroEstado === 'todos' || String(c.estado || '').toUpperCase() === filtroEstado.toUpperCase();
    return matchBusqueda && matchFiltro && matchEstado;
  });

  const totalLecciones = cursos.reduce((acc, c) => acc + (c.modulos || []).reduce((a, m) => a + (m.lecciones || []).length, 0), 0);
  const publicados = cursos.filter(c => String(c.estado || '').toUpperCase() === 'PUBLICADO').length;
  const totalEstudiantes = cursos.reduce((acc, c) => acc + (c.estudiantes_count || 0), 0);

  const getNivelColor = (nivel) => {
    const colores = {
      principiante: 'bg-green-100 text-green-700',
      intermedio: 'bg-blue-100 text-blue-700',
      avanzado: 'bg-purple-100 text-purple-700'
    };
    return colores[nivel] || 'bg-gray-100 text-gray-700';
  };

  const getEstadoColor = (estado) => {
    const colores = {
      PUBLICADO: 'bg-emerald-100 text-emerald-700',
      BORRADOR: 'bg-gray-100 text-gray-600',
      ARCHIVADO: 'bg-gray-100 text-gray-400'
    };
    return colores[String(estado || '').toUpperCase()] || 'bg-gray-100 text-gray-600';
  };

  if (cargando) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <p className="text-sm text-red-500 mb-4">{error}</p>
        <Button variant="secondary" onClick={cargarCursos}>
          Reintentar
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header - Estilo Google Classroom */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#0f766e]/10 flex items-center justify-center flex-shrink-0">
            <GraduationCap className="w-6 h-6 text-[#0f766e]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              {esAdmin ? 'Todos los cursos' : 'Mis cursos'}
            </h1>
            <p className="text-sm text-gray-500">
              {esAdmin ? 'Gestiona todos los cursos de la plataforma' : 'Crea y administra tus cursos'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {solicitudesPendientes > 0 && (
            <Badge variant="warning" className="flex items-center gap-1.5 px-3 py-1.5">
              <Award className="w-3.5 h-3.5" />
              {solicitudesPendientes} pendientes
            </Badge>
          )}
          <Button variant="primary" onClick={onCrearCurso} className="gap-2">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Crear curso</span>
            <span className="sm:hidden">Nuevo</span>
          </Button>
        </div>
      </div>

      {/* Estadísticas - Estilo Google Classroom */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#e6f4f2] flex items-center justify-center flex-shrink-0">
            <BookOpen className="w-5 h-5 text-[#0f766e]" />
          </div>
          <div>
            <p className="text-xl font-bold text-gray-900 leading-tight">{cursos.length}</p>
            <p className="text-xs text-gray-400">Total cursos</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
            <CheckCircle className="w-5 h-5 text-emerald-500" />
          </div>
          <div>
            <p className="text-xl font-bold text-gray-900 leading-tight">{publicados}</p>
            <p className="text-xs text-gray-400">Publicados</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
            <Users className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <p className="text-xl font-bold text-gray-900 leading-tight">{totalEstudiantes}</p>
            <p className="text-xs text-gray-400">Estudiantes</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
            <FileText className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <p className="text-xl font-bold text-gray-900 leading-tight">{totalLecciones}</p>
            <p className="text-xs text-gray-400">Lecciones</p>
          </div>
        </div>
      </div>

      {/* Barra de herramientas - Estilo Google Classroom */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar cursos..."
            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:border-[#0f766e] focus:ring-2 focus:ring-[#0f766e]/20 transition-all bg-white"
          />
        </div>
        <div className="flex gap-2">
          <Dropdown
            options={categoriasOptions}
            value={filtro}
            onChange={setFiltro}
            placeholder="Categoría"
            size="sm"
            className="w-36"
          />
          <Dropdown
            options={estadoOptions}
            value={filtroEstado}
            onChange={setFiltroEstado}
            placeholder="Estado"
            size="sm"
            className="w-36"
          />
        </div>
      </div>

      {/* Lista de Cursos - Estilo Google Classroom */}
      {cursosFiltrados.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-gray-200">
          <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <FolderOpen className="w-10 h-10 text-gray-300" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">No hay cursos</h3>
          <p className="text-sm text-gray-400 mt-1 max-w-sm mx-auto">
            {esAdmin 
              ? 'No hay cursos creados en la plataforma aún.' 
              : 'Comienza creando tu primer curso para compartir tu conocimiento.'}
          </p>
          <Button variant="primary" onClick={onCrearCurso} className="mt-4 gap-2">
            <Plus className="w-4 h-4" />
            Crear curso
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {cursosFiltrados.map((curso) => (
            <div
              key={curso.id}
              className="group bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-lg hover:border-gray-300 transition-all cursor-pointer"
              onClick={() => onVerCurso?.(curso.id)}
            >
              {/* Header con imagen y estado */}
              <div 
                className="relative h-36 bg-gradient-to-br flex items-center justify-center overflow-hidden"
                style={{ 
                  backgroundImage: `linear-gradient(to bottom right, ${curso.imagen_url ? `url(${curso.imagen_url})` : '#e6f4f2'}, ${curso.imagen_url ? 'rgba(0,0,0,0.3)' : '#d1e8e5'})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }}
              >
                {!curso.imagen_url && (
                  <BookOpen className="w-20 h-20 text-[#0f766e]/20" />
                )}
                
                {/* Badges de estado */}
                <div className="absolute top-3 left-3 flex flex-col gap-1">
                  <Badge 
                    variant={String(curso.estado || '').toUpperCase() === 'PUBLICADO' ? 'success' : 'default'} 
                    size="sm"
                  >
                    {(curso.estado || 'BORRADOR').toUpperCase()}
                  </Badge>
                  {curso.nivel && (
                    <Badge variant="secondary" size="sm" className="bg-white/80 backdrop-blur-sm">
                      {curso.nivel}
                    </Badge>
                  )}
                </div>

                {/* Acciones rápidas - hover */}
                <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {String(curso.estado || '').toUpperCase() !== 'PUBLICADO' && (esAdmin || curso.docente_id === usuarioId) && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handlePublicar(curso.id, curso.titulo); }}
                      disabled={publicando === curso.id}
                      className="p-1.5 bg-white/90 backdrop-blur-sm rounded-lg hover:bg-[#0f766e] hover:text-white transition-all shadow-sm"
                      title="Publicar"
                    >
                      {publicando === curso.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    </button>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); onEditarCurso?.(curso); }}
                    className="p-1.5 bg-white/90 backdrop-blur-sm rounded-lg hover:bg-gray-100 transition-all shadow-sm"
                    title="Editar"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-gray-600" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleEliminar(curso.id, curso.titulo); }}
                    disabled={eliminando === curso.id}
                    className="p-1.5 bg-white/90 backdrop-blur-sm rounded-lg hover:bg-red-50 transition-all shadow-sm"
                    title="Eliminar"
                  >
                    {eliminando === curso.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5 text-gray-600 hover:text-red-500" />}
                  </button>
                </div>

                {/* Categoría */}
                {curso.categoria && (
                  <div className="absolute bottom-3 left-3">
                    <Badge variant="secondary" size="sm" className="bg-black/40 text-white border-0 backdrop-blur-sm">
                      {categoriasOptions.find(c => c.value === curso.categoria)?.label || curso.categoria}
                    </Badge>
                  </div>
                )}
              </div>

              {/* Contenido */}
              <div className="p-4">
                <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {curso.duracion || 'Sin duración'}
                  </span>
                  <span className="w-1 h-1 rounded-full bg-gray-300" />
                  <span className="flex items-center gap-1">
                    <FileText className="w-3 h-3" />
                    {(curso.modulos || []).reduce((acc, m) => acc + (m.lecciones || []).length, 0)} lecciones
                  </span>
                </div>

                <h3 className="font-semibold text-gray-900 line-clamp-1 text-base">
                  {curso.titulo}
                </h3>
                <p className="text-sm text-gray-500 line-clamp-2 mt-1 min-h-[2.5rem]">
                  {curso.descripcion || 'Sin descripción'}
                </p>

                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#e6f4f2] flex items-center justify-center">
                      <span className="text-[10px] font-semibold text-[#0f766e]">
                        {curso.instructor ? curso.instructor.charAt(0).toUpperCase() : 'I'}
                      </span>
                    </div>
                    <span className="text-xs text-gray-600 truncate max-w-[100px]">
                      {curso.instructor || 'Sin instructor'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {curso.estudiantes_count || 0}
                    </span>
                    {curso.precio_tipo === 'pago' ? (
                      <Badge variant="warning" size="sm" className="text-[10px]">
                        {curso.moneda} {curso.precio_monto}
                      </Badge>
                    ) : (
                      <Badge variant="secondary" size="sm" className="text-[10px]">
                        Gratis
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Progreso (si está publicado) */}
                {String(curso.estado || '').toUpperCase() === 'PUBLICADO' && curso.progreso !== undefined && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                      <span>Progreso</span>
                      <span>{curso.progreso || 0}%</span>
                    </div>
                    <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-[#0f766e] rounded-full transition-all duration-500"
                        style={{ width: `${curso.progreso || 0}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Acción principal */}
                <button
                  onClick={() => onVerCurso?.(curso.id)}
                  className="mt-3 w-full py-2 text-sm font-medium text-[#0f766e] border border-[#0f766e]/20 rounded-xl hover:bg-[#e6f4f2] transition-colors flex items-center justify-center gap-1"
                >
                  {String(curso.estado || '').toUpperCase() === 'PUBLICADO' ? (
                    <>Ver curso <ChevronRight className="w-4 h-4" /></>
                  ) : (
                    <>Continuar editando <ChevronRight className="w-4 h-4" /></>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PanelCursos;