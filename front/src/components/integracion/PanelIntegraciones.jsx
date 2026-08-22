// front/src/components/integracion/PanelIntegraciones.jsx
// RENOMBRADO: PanelCursos.jsx - CREADOR DE CURSOS COMPLETO

import React, { useState, useEffect } from 'react';
import {
  Plus, Search, Edit3, Trash2,
  Eye, Users, Clock, Play, 
  BookOpen, Video, FileText, Award,
  Star, TrendingUp, Calendar, CheckCircle,
  Loader2, Link as LinkIcon, Filter,
  GraduationCap, Layers, BarChart3,
  X, Save, ArrowLeft, GripVertical,
  Type, List, Image, ChevronDown
} from 'lucide-react';

// =============================================
// COMPONENTE: CREADOR DE CURSOS (REUTILIZADO)
// =============================================
const CreadorCurso = ({ curso: cursoInicial = null, onGuardar, onVolver }) => {
  const [datos, setDatos] = useState({
    titulo: cursoInicial?.titulo || '',
    descripcion: cursoInicial?.descripcion || '',
    categoria: cursoInicial?.categoria || 'programacion',
    nivel: cursoInicial?.nivel || 'principiante',
    precio: cursoInicial?.precio || 'Gratis',
    duracion: cursoInicial?.duracion || '',
    instructor: cursoInicial?.instructor || '',
    imagen: cursoInicial?.imagen || '',
  });

  const [modulos, setModulos] = useState(() => {
    if (cursoInicial?.modulos) return cursoInicial.modulos;
    return [{ id: 1, titulo: 'Módulo 1', lecciones: [{ id: 1, titulo: 'Lección 1', tipo: 'video', contenido: '' }] }];
  });

  const [moduloEditando, setModuloEditando] = useState(null);

  const agregarModulo = () => {
    const nuevoModulo = {
      id: Date.now(),
      titulo: `Módulo ${modulos.length + 1}`,
      lecciones: [{ id: Date.now() + 1, titulo: 'Nueva Lección', tipo: 'video', contenido: '' }]
    };
    setModulos([...modulos, nuevoModulo]);
    setModuloEditando(nuevoModulo.id);
  };

  const eliminarModulo = (id) => {
    if (!window.confirm('¿Eliminar este módulo?')) return;
    setModulos(modulos.filter(m => m.id !== id));
  };

  const agregarLeccion = (moduloId) => {
    setModulos(modulos.map(m => {
      if (m.id !== moduloId) return m;
      const nuevaLeccion = { id: Date.now(), titulo: `Lección ${m.lecciones.length + 1}`, tipo: 'video', contenido: '' };
      return { ...m, lecciones: [...m.lecciones, nuevaLeccion] };
    }));
  };

  const eliminarLeccion = (moduloId, leccionId) => {
    setModulos(modulos.map(m => {
      if (m.id !== moduloId) return m;
      return { ...m, lecciones: m.lecciones.filter(l => l.id !== leccionId) };
    }));
  };

  const actualizarModulo = (id, campo, valor) => {
    setModulos(modulos.map(m => m.id === id ? { ...m, [campo]: valor } : m));
  };

  const actualizarLeccion = (moduloId, leccionId, campo, valor) => {
    setModulos(modulos.map(m => {
      if (m.id !== moduloId) return m;
      return {
        ...m,
        lecciones: m.lecciones.map(l => l.id === leccionId ? { ...l, [campo]: valor } : l)
      };
    }));
  };

  const handleGuardar = () => {
    const cursoData = { ...datos, modulos };
    onGuardar(cursoData);
  };

  return (
    <div className="min-h-screen bg-[#fbfbfa]">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-sm border-b border-gray-200/50">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onVolver} className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-600">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-medium text-gray-700">
              {cursoInicial?.id ? 'Editar Curso' : 'Nuevo Curso'}
            </span>
          </div>
          <button
            onClick={handleGuardar}
            className="px-4 py-1.5 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            Guardar Curso
          </button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-6 space-y-6">
        {/* Información del curso */}
        <div className="bg-white rounded-xl border border-gray-200/60 p-6 space-y-4">
          <input
            type="text"
            value={datos.titulo}
            onChange={(e) => setDatos({ ...datos, titulo: e.target.value })}
            placeholder="Título del curso"
            className="w-full text-xl font-semibold text-gray-900 bg-transparent border-0 border-b-2 pb-2 transition-colors placeholder:text-gray-300 focus:outline-none border-transparent hover:border-gray-200 focus:border-gray-300"
          />
          
          <textarea
            value={datos.descripcion}
            onChange={(e) => setDatos({ ...datos, descripcion: e.target.value })}
            placeholder="Descripción del curso..."
            rows={2}
            className="w-full text-sm text-gray-500 bg-transparent border-0 border-b-2 pb-2 resize-none transition-colors border-transparent hover:border-gray-200 focus:border-gray-300 focus:outline-none placeholder:text-gray-300"
          />

          <div className="flex flex-wrap gap-4 pt-2 border-t border-gray-100">
            <select
              value={datos.categoria}
              onChange={(e) => setDatos({ ...datos, categoria: e.target.value })}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-gray-300 bg-transparent"
            >
              <option value="programacion">Programación</option>
              <option value="web">Desarrollo Web</option>
              <option value="datos">Data Science</option>
              <option value="diseno">Diseño</option>
              <option value="marketing">Marketing</option>
              <option value="negocios">Negocios</option>
            </select>

            <select
              value={datos.nivel}
              onChange={(e) => setDatos({ ...datos, nivel: e.target.value })}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-gray-300 bg-transparent"
            >
              <option value="principiante">Principiante</option>
              <option value="intermedio">Intermedio</option>
              <option value="avanzado">Avanzado</option>
            </select>

            <input
              type="text"
              value={datos.duracion}
              onChange={(e) => setDatos({ ...datos, duracion: e.target.value })}
              placeholder="Duración (ej: 40 horas)"
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-gray-300 bg-transparent"
            />

            <input
              type="text"
              value={datos.precio}
              onChange={(e) => setDatos({ ...datos, precio: e.target.value })}
              placeholder="Precio (ej: Gratis / $49.99)"
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-gray-300 bg-transparent"
            />

            <input
              type="text"
              value={datos.instructor}
              onChange={(e) => setDatos({ ...datos, instructor: e.target.value })}
              placeholder="Nombre del instructor"
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-gray-300 bg-transparent"
            />
          </div>
        </div>

        {/* Módulos y Lecciones */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-700">Contenido del Curso</h3>
            <button
              onClick={agregarModulo}
              className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
            >
              <Plus className="w-4 h-4" /> Agregar Módulo
            </button>
          </div>

          {modulos.map((modulo, index) => (
            <div key={modulo.id} className="bg-white rounded-xl border border-gray-200/60 overflow-hidden">
              {/* Header del módulo */}
              <div 
                className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50/50 transition-colors"
                onClick={() => setModuloEditando(moduloEditando === modulo.id ? null : modulo.id)}
              >
                <GripVertical className="w-4 h-4 text-gray-300 cursor-grab" />
                <span className="text-sm font-medium text-gray-700">
                  {modulo.titulo || `Módulo ${index + 1}`}
                </span>
                <span className="text-xs text-gray-400">{modulo.lecciones.length} lecciones</span>
                <div className="flex-1" />
                <button
                  onClick={(e) => { e.stopPropagation(); eliminarModulo(modulo.id); }}
                  className="p-1 hover:bg-red-50 rounded text-gray-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${moduloEditando === modulo.id ? 'rotate-180' : ''}`} />
              </div>

              {/* Contenido del módulo */}
              {moduloEditando === modulo.id && (
                <div className="border-t border-gray-100 px-4 py-4 space-y-3">
                  <input
                    type="text"
                    value={modulo.titulo}
                    onChange={(e) => actualizarModulo(modulo.id, 'titulo', e.target.value)}
                    placeholder="Nombre del módulo"
                    className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-gray-300 transition-colors"
                  />

                  <div className="space-y-2">
                    {modulo.lecciones.map((leccion, idx) => (
                      <div key={leccion.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                        <GripVertical className="w-3.5 h-3.5 text-gray-300" />
                        <select
                          value={leccion.tipo}
                          onChange={(e) => actualizarLeccion(modulo.id, leccion.id, 'tipo', e.target.value)}
                          className="px-2 py-1 text-xs border border-gray-200 rounded bg-white outline-none"
                        >
                          <option value="video">Video</option>
                          <option value="texto">Texto</option>
                          <option value="quiz">Quiz</option>
                          <option value="archivo">Archivo</option>
                        </select>
                        <input
                          type="text"
                          value={leccion.titulo}
                          onChange={(e) => actualizarLeccion(modulo.id, leccion.id, 'titulo', e.target.value)}
                          placeholder="Título de la lección"
                          className="flex-1 px-2 py-1 text-sm border border-gray-200 rounded bg-white outline-none focus:border-gray-300"
                        />
                        <button
                          onClick={() => eliminarLeccion(modulo.id, leccion.id)}
                          className="p-1 hover:bg-red-50 rounded text-gray-400 hover:text-red-500"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => agregarLeccion(modulo.id)}
                      className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Agregar lección
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// =============================================
// COMPONENTE: PANEL DE CURSOS (LISTA)
// =============================================
const PanelCursos = ({ empresaId, onEditar, onVerCurso }) => {
  const [cursos, setCursos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('todos');
  const [filtroNivel, setFiltroNivel] = useState('todos');

  useEffect(() => {
    // Simular carga - Conectar con API real
    setTimeout(() => {
      setCursos([
        {
          id: '1',
          titulo: 'Fundamentos de Programación',
          descripcion: 'Aprende los conceptos básicos de programación',
          categoria: 'programacion',
          nivel: 'principiante',
          duracion: '40h',
          lecciones: 45,
          estudiantes: 1234,
          rating: 4.8,
          instructor: 'Ana Martínez',
          precio: 'Gratis',
          estado: 'PUBLICADO'
        }
      ]);
      setCargando(false);
    }, 500);
  }, []);

  const categorias = ['todos', 'programacion', 'web', 'datos', 'diseno', 'marketing', 'negocios'];
  const niveles = ['todos', 'principiante', 'intermedio', 'avanzado'];

  const cursosFiltrados = cursos.filter(c => {
    const matchBusqueda = c.titulo.toLowerCase().includes(busqueda.toLowerCase());
    const matchCategoria = filtroCategoria === 'todos' || c.categoria === filtroCategoria;
    const matchNivel = filtroNivel === 'todos' || c.nivel === filtroNivel;
    return matchBusqueda && matchCategoria && matchNivel;
  });

  if (cargando) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">EDM Team</h2>
          <p className="text-sm text-gray-400">Cursos Online para tu equipo</p>
        </div>
        <button
          onClick={() => onEditar?.(null)}
          className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-2 text-sm"
        >
          <Plus className="w-4 h-4" />
          Nuevo Curso
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <BookOpen className="w-6 h-6 text-gray-500 mx-auto mb-2" />
          <p className="text-2xl font-bold text-gray-900">{cursos.length}</p>
          <p className="text-xs text-gray-500">Cursos</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <Users className="w-6 h-6 text-gray-500 mx-auto mb-2" />
          <p className="text-2xl font-bold text-gray-900">0</p>
          <p className="text-xs text-gray-500">Estudiantes</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <Clock className="w-6 h-6 text-gray-500 mx-auto mb-2" />
          <p className="text-2xl font-bold text-gray-900">0h</p>
          <p className="text-xs text-gray-500">Contenido</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <Award className="w-6 h-6 text-gray-500 mx-auto mb-2" />
          <p className="text-2xl font-bold text-gray-900">0</p>
          <p className="text-xs text-gray-500">Certificados</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar cursos..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-gray-300 transition-all"
          />
        </div>
        <select
          value={filtroCategoria}
          onChange={(e) => setFiltroCategoria(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-gray-300 bg-white"
        >
          {categorias.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
        </select>
        <select
          value={filtroNivel}
          onChange={(e) => setFiltroNivel(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-gray-300 bg-white"
        >
          {niveles.map(n => <option key={n} value={n}>{n.charAt(0).toUpperCase() + n.slice(1)}</option>)}
        </select>
      </div>

      {/* Lista */}
      {cursosFiltrados.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <GraduationCap className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No hay cursos</h3>
          <p className="text-sm text-gray-500 mt-1">Crea tu primer curso</p>
          <button onClick={() => onEditar?.(null)} className="mt-4 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors">
            <Plus className="w-4 h-4 inline mr-2" /> Crear Curso
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cursosFiltrados.map((curso) => (
            <div key={curso.id} className="bg-white rounded-xl border border-gray-200/60 p-4 hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer" onClick={() => onVerCurso?.(curso.id)}>
              <div className="flex items-start justify-between mb-3">
                <span className="text-xs font-medium text-gray-400 uppercase">{curso.categoria}</span>
                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                  curso.nivel === 'principiante' ? 'bg-green-100 text-green-700' :
                  curso.nivel === 'intermedio' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                }`}>{curso.nivel}</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-1 truncate">{curso.titulo}</h3>
              <p className="text-sm text-gray-400 line-clamp-2 mb-3">{curso.descripcion}</p>
              <div className="flex items-center gap-4 text-xs text-gray-400">
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{curso.duracion}</span>
                <span className="flex items-center gap-1"><FileText className="w-3 h-3" />{curso.lecciones}</span>
                <span className="flex items-center gap-1"><Users className="w-3 h-3" />{curso.estudiantes}</span>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                <span className="text-xs text-gray-500">{curso.instructor}</span>
                <span className="text-sm font-semibold text-gray-900">{curso.precio}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// =============================================
// EXPORTACIÓN PRINCIPAL
// =============================================
const PanelIntegraciones = ({ empresaId, onEditar, onVerCurso }) => {
  // Este componente ahora maneja la lógica de creación/edición
  // Reutiliza CreadorCurso y PanelCursos
  
  if (onEditar && typeof onEditar === 'function') {
    // Si se está editando un curso, mostrar el creador
    return <CreadorCurso onGuardar={onEditar} onVolver={() => onEditar(null)} />;
  }
  
  return <PanelCursos empresaId={empresaId} onEditar={onEditar} onVerCurso={onVerCurso} />;
};

export default PanelIntegraciones;