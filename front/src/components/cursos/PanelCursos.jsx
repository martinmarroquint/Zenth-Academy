// front/src/components/cursos/PanelCursos.jsx
// PANEL DE CURSOS - CON COMPONENTES UI

import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus, Search, BookOpen, Users, Clock, Star,
  GraduationCap, Loader2, FileText, Award,
  Trash2, Eye, Play, Edit3, Send, ChevronRight
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

  // Opciones para dropdowns
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
                          (c.descripcion || '').toLowerCase().includes(busqueda.toLowerCase());
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
        <p className="text-sm text-red-500 mb-4">{error}</p>
        <Button variant="secondary" onClick={cargarCursos}>
          Reintentar
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Mis Cursos</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {esAdmin ? 'Administra los cursos de la plataforma' : 'Crea, publica y gestiona tus cursos'}
          </p>
        </div>
        <Button variant="primary" onClick={onCrearCurso}>
          <Plus className="w-4 h-4" />
          Nuevo Curso
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3 shadow-sm">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#e6f4f2' }}>
            <BookOpen className="w-5 h-5" style={{ color: '#0f766e' }} />
          </div>
          <div className="min-w-0">
            <p className="text-xl font-bold text-gray-900 leading-tight">{cursos.length}</p>
            <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wide">Cursos</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3 shadow-sm">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#e6f4f2' }}>
            <Send className="w-5 h-5" style={{ color: '#0f766e' }} />
          </div>
          <div className="min-w-0">
            <p className="text-xl font-bold text-gray-900 leading-tight">{publicados}</p>
            <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wide">Publicados</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3 shadow-sm">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#e6f4f2' }}>
            <Users className="w-5 h-5" style={{ color: '#0f766e' }} />
          </div>
          <div className="min-w-0">
            <p className="text-xl font-bold text-gray-900 leading-tight">{totalEstudiantes}</p>
            <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wide">Estudiantes</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3 shadow-sm">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#e6f4f2' }}>
            <FileText className="w-5 h-5" style={{ color: '#0f766e' }} />
          </div>
          <div className="min-w-0">
            <p className="text-xl font-bold text-gray-900 leading-tight">{totalLecciones}</p>
            <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wide">Lecciones</p>
          </div>
        </div>
        <div
          onClick={() => window.location.assign(`${esAdmin ? '/admin' : '/docente'}/solicitudes`)}
          className={`bg-white rounded-2xl border p-4 flex items-center gap-3 shadow-sm cursor-pointer transition-colors ${
            solicitudesPendientes > 0 ? 'border-amber-200 hover:border-amber-300' : 'border-gray-100'
          }`}
          title="Ver solicitudes de acceso pendientes"
        >
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
            solicitudesPendientes > 0 ? 'bg-amber-50' : 'bg-gray-50'
          }`}>
            <Award className={`w-5 h-5 ${solicitudesPendientes > 0 ? 'text-amber-500' : 'text-gray-400'}`} />
          </div>
          <div className="min-w-0">
            <p className="text-xl font-bold text-gray-900 leading-tight flex items-center gap-2">
              {solicitudesPendientes}
              {solicitudesPendientes > 0 && (
                <Badge variant="warning" size="sm">pendientes</Badge>
              )}
            </p>
            <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wide">Solicitudes</p>
          </div>
        </div>
      </div>

      {/* Filtros con componentes UI */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar cursos..."
            icon={<Search className="w-4 h-4" />}
            size="sm"
            fullWidth
          />
        </div>
        <div className="sm:w-48">
          <Dropdown
            options={categoriasOptions}
            value={filtro}
            onChange={setFiltro}
            placeholder="Categoría"
            size="sm"
            fullWidth
            searchable={true}
            clearable={false}
            showChevron={true}
          />
        </div>
        <div className="sm:w-48">
          <Dropdown
            options={estadoOptions}
            value={filtroEstado}
            onChange={setFiltroEstado}
            placeholder="Estado"
            size="sm"
            fullWidth
            searchable={false}
            clearable={false}
            showChevron={true}
          />
        </div>
      </div>

      {/* Lista de Cursos - TARJETAS MEJORADAS */}
      {cursosFiltrados.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <GraduationCap className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No hay cursos</h3>
          <p className="text-sm text-gray-500 mt-1">Crea tu primer curso</p>
          <Button variant="primary" onClick={onCrearCurso} className="mt-4">
            <Plus className="w-4 h-4" />
            Crear Curso
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cursosFiltrados.map((curso) => (
            <div
              key={curso.id}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group"
              onClick={() => onVerCurso?.(curso.id)}
            >
              {/* Imagen */}
              <div className="relative h-48 bg-gradient-to-br flex items-center justify-center" style={{ backgroundImage: 'linear-gradient(to bottom right, #e6f4f2, #d1e8e5)' }}>
                <BookOpen className="w-16 h-16" style={{ color: '#0f766e', opacity: 0.4 }} />
                <Badge variant="default" className="absolute top-3 right-3">
                  {curso.nivel}
                </Badge>
                <Badge 
                  variant={String(curso.estado || '').toUpperCase() === 'PUBLICADO' ? 'success' : 'default'} 
                  className="absolute top-3 left-3"
                >
                  {(curso.estado || 'BORRADOR').toUpperCase()}
                </Badge>
              </div>

              {/* Contenido */}
              <div className="p-4">
                <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{curso.duracion || 'Sin duración'}</span>
                  <span className="flex items-center gap-1"><FileText className="w-3 h-3" />{(curso.modulos || []).reduce((acc, m) => acc + (m.lecciones || []).length, 0)} lecciones</span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-1 line-clamp-1">{curso.titulo}</h3>
                <p className="text-sm text-gray-500 line-clamp-2 mb-3">{curso.descripcion}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">{curso.instructor || curso.docente_nombre || 'Instructor'}</span>
                  <span className="text-sm font-semibold" style={{ color: '#0f766e' }}>{curso.precio}</span>
                </div>
                <div className="mt-3 flex items-center gap-4 text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                    {curso.rating || 0}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {curso.estudiantes_count || 0}
                  </span>
                  <div className="flex-1" />
                  {String(curso.estado || '').toUpperCase() !== 'PUBLICADO' && (esAdmin || curso.docente_id === usuarioId) && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handlePublicar(curso.id, curso.titulo); }}
                      disabled={publicando === curso.id}
                      className="p-1.5 rounded-lg transition-colors text-gray-400 hover:text-white"
                      style={{ hover: { backgroundColor: '#0f766e' } }}
                      onMouseEnter={(e) => { e.target.style.backgroundColor = '#0f766e'; e.target.style.color = 'white' }}
                      onMouseLeave={(e) => { e.target.style.backgroundColor = ''; e.target.style.color = '' }}
                      title="Publicar"
                    >
                      {publicando === curso.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    </button>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); onEditarCurso?.(curso); }}
                    className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors"
                    title="Editar"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleEliminar(curso.id, curso.titulo); }}
                    disabled={eliminando === curso.id}
                    className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500 transition-colors"
                    title="Eliminar"
                  >
                    {eliminando === curso.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PanelCursos;