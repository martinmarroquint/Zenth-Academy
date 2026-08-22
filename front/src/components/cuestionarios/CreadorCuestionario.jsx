// front/src/components/cuestionarios/CreadorCuestionario.jsx
// VERSION NOTION STYLE - SIN REDUNDANCIAS

import React, { useState } from 'react';
import {
  ArrowLeft, Save, Plus, Trash2, Copy, GripVertical,
  Type, CheckCircle, Circle, Star, Sliders,
  Calendar, Clock, Image, FileText,
  Grid, SortAsc, Hash,
  ChevronDown, AlertTriangle, Eye, EyeOff,
  Loader2, X
} from 'lucide-react';
import cuestionariosService from '../../services/cuestionariosService';

const TIPOS_PREGUNTA = [
  { id: 'opcion_unica', label: 'Opción Única', icon: Circle },
  { id: 'opcion_multiple', label: 'Opción Múltiple', icon: CheckCircle },
  { id: 'texto_corto', label: 'Texto Corto', icon: Type },
  { id: 'texto_largo', label: 'Texto Largo', icon: FileText },
  { id: 'escala_likert', label: 'Escala Likert', icon: Sliders },
  { id: 'escala_numerica', label: 'Escala Numérica', icon: Hash },
  { id: 'estrellas', label: 'Valoración Estrellas', icon: Star },
  { id: 'fecha', label: 'Fecha', icon: Calendar },
  { id: 'hora', label: 'Hora', icon: Clock },
  { id: 'archivo', label: 'Archivo', icon: Image },
  { id: 'matriz', label: 'Matriz', icon: Grid },
  { id: 'ordenamiento', label: 'Ordenamiento', icon: SortAsc },
];

const CreadorCuestionario = ({ 
  cuestionario: cuestionarioInicial = null, 
  onGuardar, 
  onVolver,
  empresaId = 'default'
}) => {
  const [datos, setDatos] = useState({
    titulo: cuestionarioInicial?.titulo || '',
    descripcion: cuestionarioInicial?.descripcion || '',
    tipo: cuestionarioInicial?.tipo || 'encuesta',
    es_anonimo: cuestionarioInicial?.es_anonimo || false,
    limite_respuestas: cuestionarioInicial?.limite_respuestas || 0,
    fecha_inicio: cuestionarioInicial?.fecha_inicio || '',
    fecha_fin: cuestionarioInicial?.fecha_fin || '',
    mostrar_resultados: cuestionarioInicial?.mostrar_resultados || false,
    password: cuestionarioInicial?.password || '',
  });

  const [preguntas, setPreguntas] = useState(() => {
    if (cuestionarioInicial?.preguntas) {
      return cuestionarioInicial.preguntas.map((p, i) => ({
        ...p,
        id: p.id || `pregunta_${Date.now()}_${i}`,
        orden: p.orden ?? i,
        opciones: p.opciones || [],
        configuracion: p.configuracion || {},
        obligatoria: p.obligatoria ?? true,
        visible: p.visible ?? true,
      }));
    }
    return [];
  });

  const [errores, setErrores] = useState({});
  const [preguntaEditando, setPreguntaEditando] = useState(null);
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [configAbierta, setConfigAbierta] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [guardadoExitoso, setGuardadoExitoso] = useState(false);

  // =============================================
  // GESTIÓN DE PREGUNTAS
  // =============================================
  const agregarPregunta = (tipo) => {
    const nuevaPregunta = {
      id: `pregunta_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      tipo: tipo,
      titulo: '',
      descripcion: '',
      seccion: '',
      obligatoria: true,
      visible: true,
      orden: preguntas.length,
      opciones: [],
      configuracion: {},
      puntaje: 0,
    };

    if (tipo === 'escala_likert') {
      nuevaPregunta.configuracion = { min: 1, max: 5 };
      nuevaPregunta.opciones = ['Muy en desacuerdo', 'En desacuerdo', 'Neutral', 'De acuerdo', 'Muy de acuerdo'];
    } else if (tipo === 'estrellas') {
      nuevaPregunta.configuracion = { max: 5 };
    } else if (tipo === 'opcion_unica' || tipo === 'opcion_multiple') {
      nuevaPregunta.opciones = ['Opción 1', 'Opción 2'];
    } else if (tipo === 'matriz') {
      nuevaPregunta.configuracion = { filas: ['Item 1', 'Item 2'], columnas: ['Malo', 'Neutral', 'Bueno'] };
    } else if (tipo === 'ordenamiento') {
      nuevaPregunta.opciones = ['Elemento 1', 'Elemento 2', 'Elemento 3'];
    }

    setPreguntas([...preguntas, nuevaPregunta]);
    setPreguntaEditando(nuevaPregunta.id);
    setMenuAbierto(false);
  };

  const eliminarPregunta = (id) => {
    if (!window.confirm('¿Eliminar esta pregunta?')) return;
    setPreguntas(preguntas.filter(p => p.id !== id));
    if (preguntaEditando === id) setPreguntaEditando(null);
  };

  const duplicarPregunta = (id) => {
    const original = preguntas.find(p => p.id === id);
    if (!original) return;
    const copia = {
      ...original,
      id: `pregunta_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      orden: preguntas.length,
    };
    const nuevas = [...preguntas];
    const idx = nuevas.findIndex(p => p.id === id);
    nuevas.splice(idx + 1, 0, copia);
    setPreguntas(nuevas);
    setPreguntaEditando(copia.id);
  };

  const moverPregunta = (id, direccion) => {
    const idx = preguntas.findIndex(p => p.id === id);
    if (idx === -1) return;
    if (direccion === 'up' && idx === 0) return;
    if (direccion === 'down' && idx === preguntas.length - 1) return;
    const nuevas = [...preguntas];
    const [item] = nuevas.splice(idx, 1);
    nuevas.splice(direccion === 'up' ? idx - 1 : idx + 1, 0, item);
    setPreguntas(nuevas.map((p, i) => ({ ...p, orden: i })));
  };

  const actualizarPregunta = (id, campo, valor) => {
    setPreguntas(preguntas.map(p => 
      p.id === id ? { ...p, [campo]: valor } : p
    ));
  };

  const actualizarOpcion = (id, idx, valor) => {
    setPreguntas(preguntas.map(p => {
      if (p.id !== id) return p;
      const nuevasOpciones = [...(p.opciones || [])];
      nuevasOpciones[idx] = valor;
      return { ...p, opciones: nuevasOpciones };
    }));
  };

  const agregarOpcion = (id) => {
    setPreguntas(preguntas.map(p => {
      if (p.id !== id) return p;
      const nuevasOpciones = [...(p.opciones || []), `Opción ${(p.opciones || []).length + 1}`];
      return { ...p, opciones: nuevasOpciones };
    }));
  };

  const eliminarOpcion = (id, idx) => {
    setPreguntas(preguntas.map(p => {
      if (p.id !== id) return p;
      const nuevasOpciones = (p.opciones || []).filter((_, i) => i !== idx);
      return { ...p, opciones: nuevasOpciones };
    }));
  };

  // =============================================
  // VALIDACIÓN Y GUARDADO
  // =============================================
  const validar = () => {
    const err = {};
    if (!datos.titulo.trim()) err.titulo = 'El título es obligatorio';
    if (preguntas.length === 0) err.preguntas = 'Agregue al menos una pregunta';
    
    preguntas.forEach((p, idx) => {
      if (!p.titulo.trim()) {
        err[`pregunta_${idx}`] = `La pregunta ${idx + 1} no tiene título`;
      }
      if ((p.tipo === 'opcion_unica' || p.tipo === 'opcion_multiple') && (p.opciones || []).length < 2) {
        err[`pregunta_${idx}`] = `La pregunta ${idx + 1} debe tener al menos 2 opciones`;
      }
    });

    setErrores(err);
    return Object.keys(err).length === 0;
  };

  const handleGuardar = async () => {
    if (!validar()) return;
    
    setCargando(true);
    try {
      const data = {
        ...datos,
        fecha_inicio: datos.fecha_inicio || null,
        fecha_fin: datos.fecha_fin || null,
        preguntas: preguntas.map((pregunta) => {
          const copia = { ...pregunta };
          delete copia.id;
          return copia;
        }),
        estado: 'BORRADOR',
        empresa_id: empresaId
      };

      let resultado;
      if (cuestionarioInicial?.id) {
        resultado = await cuestionariosService.actualizar(cuestionarioInicial.id, data);
      } else {
        resultado = await cuestionariosService.crear(data);
      }

      setGuardadoExitoso(true);
      setTimeout(() => setGuardadoExitoso(false), 3000);
      
      if (onGuardar) {
        onGuardar(resultado);
      }
    } catch (error) {
      console.error('Error guardando:', error);
      setErrores({ general: 'Error al guardar. Intenta nuevamente.' });
    } finally {
      setCargando(false);
    }
  };

  // =============================================
  // RENDER PREGUNTA
  // =============================================
  const renderPregunta = (pregunta) => {
    switch (pregunta.tipo) {
      case 'opcion_unica':
      case 'opcion_multiple':
        return (
          <div className="space-y-2">
            {(pregunta.opciones || []).map((opcion, idx) => (
              <div key={idx} className="flex items-center gap-2">
                {pregunta.tipo === 'opcion_unica' ? (
                  <Circle className="w-4 h-4 text-gray-300" />
                ) : (
                  <CheckCircle className="w-4 h-4 text-gray-300" />
                )}
                <input
                  type="text"
                  value={opcion}
                  onChange={(e) => actualizarOpcion(pregunta.id, idx, e.target.value)}
                  className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-gray-300 transition-colors"
                  placeholder={`Opción ${idx + 1}`}
                />
                <button
                  onClick={() => eliminarOpcion(pregunta.id, idx)}
                  className="p-1 hover:bg-red-50 rounded text-gray-400 hover:text-red-500 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            <button
              onClick={() => agregarOpcion(pregunta.id)}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Agregar opción
            </button>
          </div>
        );

      case 'escala_likert':
        return (
          <div className="flex gap-2">
            {Array.from({ length: pregunta.configuracion?.max || 5 }, (_, i) => (
              <button key={i} className="w-10 h-10 rounded-lg border border-gray-200 text-gray-400 hover:border-gray-300 transition-colors">
                {i + 1}
              </button>
            ))}
          </div>
        );

      case 'estrellas':
        return (
          <div className="flex gap-1">
            {Array.from({ length: 5 }, (_, i) => (
              <Star key={i} className="w-6 h-6 text-gray-200" />
            ))}
          </div>
        );

      default:
        return <div className="text-sm text-gray-400">Vista previa</div>;
    }
  };

  const getTipoInfo = (tipoId) => {
    return TIPOS_PREGUNTA.find(t => t.id === tipoId) || { label: tipoId, icon: Type };
  };

  // =============================================
  // RENDER PRINCIPAL - NOTION STYLE
  // =============================================
  return (
    <div className="min-h-full bg-[#fbfbfa]">
      {/* Header - Notion style */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-sm border-b border-gray-200/50">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onVolver}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-600"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-700">
                {cuestionarioInicial?.id ? 'Editar Cuestionario' : 'Nuevo Cuestionario'}
              </span>
              {guardadoExitoso && (
                <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                  Guardado
                </span>
              )}
            </div>
          </div>
          <button
            onClick={handleGuardar}
            disabled={cargando}
            className="px-4 py-1.5 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {cargando ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {cargando ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-6 space-y-6">
        {/* Información básica - Notion style */}
        <div className="bg-white rounded-xl border border-gray-200/60 p-6">
          <input
            type="text"
            value={datos.titulo}
            onChange={(e) => setDatos({ ...datos, titulo: e.target.value })}
            placeholder="Título del cuestionario"
            className={`w-full text-xl font-semibold text-gray-900 bg-transparent border-0 border-b-2 pb-2 transition-colors placeholder:text-gray-300 focus:outline-none ${
              errores.titulo ? 'border-red-300' : 'border-transparent hover:border-gray-200 focus:border-gray-300'
            }`}
          />
          {errores.titulo && <p className="text-xs text-red-500 mt-1">{errores.titulo}</p>}
          
          <textarea
            value={datos.descripcion}
            onChange={(e) => setDatos({ ...datos, descripcion: e.target.value })}
            placeholder="Descripción del cuestionario..."
            rows={2}
            className="w-full mt-3 text-sm text-gray-500 bg-transparent border-0 border-b-2 pb-2 resize-none transition-colors border-transparent hover:border-gray-200 focus:border-gray-300 focus:outline-none placeholder:text-gray-300"
          />

          <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-gray-100">
            <select
              value={datos.tipo}
              onChange={(e) => setDatos({ ...datos, tipo: e.target.value })}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-gray-300 bg-transparent"
            >
              <option value="encuesta">Encuesta</option>
              <option value="examen">Examen</option>
              <option value="evaluacion">Evaluación</option>
              <option value="feedback">Feedback</option>
            </select>

            <label className="flex items-center gap-2 text-sm text-gray-500">
              <input
                type="checkbox"
                checked={datos.es_anonimo}
                onChange={(e) => setDatos({ ...datos, es_anonimo: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
              />
              Anónimo
            </label>

            <label className="flex items-center gap-2 text-sm text-gray-500">
              <input
                type="checkbox"
                checked={datos.mostrar_resultados}
                onChange={(e) => setDatos({ ...datos, mostrar_resultados: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
              />
              Mostrar resultados
            </label>
          </div>

          <button
            onClick={() => setConfigAbierta(!configAbierta)}
            className="mt-4 flex items-center gap-2 text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors"
          >
            <Sliders className="w-3.5 h-3.5" />
            Configuración avanzada
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${configAbierta ? 'rotate-180' : ''}`} />
          </button>

          {configAbierta && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-100">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Contraseña de acceso (opcional)
                </label>
                <input
                  type="text"
                  value={datos.password || ''}
                  onChange={(e) => setDatos({ ...datos, password: e.target.value })}
                  placeholder="Solo quien tenga la contraseña podrá responder"
                  className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-gray-300 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Límite de respuestas (0 = sin límite)
                </label>
                <input
                  type="number"
                  min={0}
                  value={datos.limite_respuestas || 0}
                  onChange={(e) => setDatos({ ...datos, limite_respuestas: parseInt(e.target.value, 10) || 0 })}
                  className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-gray-300 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Disponible desde
                </label>
                <input
                  type="datetime-local"
                  value={datos.fecha_inicio || ''}
                  onChange={(e) => setDatos({ ...datos, fecha_inicio: e.target.value })}
                  className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-gray-300 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Cierra el
                </label>
                <input
                  type="datetime-local"
                  value={datos.fecha_fin || ''}
                  onChange={(e) => setDatos({ ...datos, fecha_fin: e.target.value })}
                  className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-gray-300 transition-colors"
                />
              </div>
            </div>
          )}
        </div>

        {/* Lista de preguntas */}
        <div className="space-y-2">
          {errores.preguntas && (
            <div className="flex items-center gap-2 text-red-500 bg-red-50 border border-red-200 px-3 py-2 rounded-lg text-xs">
              <AlertTriangle className="w-4 h-4" />
              <span>{errores.preguntas}</span>
            </div>
          )}

          {preguntas.map((pregunta, index) => {
            const TipoIcon = getTipoInfo(pregunta.tipo).icon;
            const esEditando = preguntaEditando === pregunta.id;

            return (
              <div
                key={pregunta.id}
                className={`bg-white rounded-xl border transition-all ${
                  esEditando 
                    ? 'border-gray-300 shadow-sm' 
                    : 'border-gray-200/60 hover:border-gray-300'
                }`}
              >
                <div
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50/50 transition-colors"
                  onClick={() => setPreguntaEditando(esEditando ? null : pregunta.id)}
                >
                  <GripVertical className="w-4 h-4 text-gray-300 cursor-grab" />
                  <TipoIcon className="w-4 h-4 text-gray-400" />
                  <span className="text-xs font-medium text-gray-400 uppercase">
                    {getTipoInfo(pregunta.tipo).label}
                  </span>
                  <span className="text-sm text-gray-700 truncate flex-1">
                    {pregunta.titulo || `Pregunta ${index + 1}`}
                  </span>
                  {pregunta.obligatoria && (
                    <span className="text-xs text-red-400">*</span>
                  )}
                  <div className="flex items-center gap-0.5">
                    <button
                      onClick={(e) => { e.stopPropagation(); moverPregunta(pregunta.id, 'up'); }}
                      className="p-1 hover:bg-gray-100 rounded text-gray-300 hover:text-gray-500 transition-colors"
                    >
                      ↑
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); moverPregunta(pregunta.id, 'down'); }}
                      className="p-1 hover:bg-gray-100 rounded text-gray-300 hover:text-gray-500 transition-colors"
                    >
                      ↓
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); duplicarPregunta(pregunta.id); }}
                      className="p-1 hover:bg-gray-100 rounded text-gray-300 hover:text-gray-500 transition-colors"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); eliminarPregunta(pregunta.id); }}
                      className="p-1 hover:bg-red-50 rounded text-gray-300 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {esEditando && (
                  <div className="border-t border-gray-100 px-4 py-4 space-y-4">
                    <input
                      type="text"
                      value={pregunta.titulo}
                      onChange={(e) => actualizarPregunta(pregunta.id, 'titulo', e.target.value)}
                      placeholder="Título de la pregunta"
                      className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-gray-300 transition-colors"
                    />
                    <textarea
                      value={pregunta.descripcion || ''}
                      onChange={(e) => actualizarPregunta(pregunta.id, 'descripcion', e.target.value)}
                      placeholder="Descripción (opcional)"
                      rows={1}
                      className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-gray-300 transition-colors resize-none"
                    />

                    <div className="flex flex-wrap items-center gap-4 text-sm">
                      <input
                        type="text"
                        value={pregunta.seccion || ''}
                        onChange={(e) => actualizarPregunta(pregunta.id, 'seccion', e.target.value)}
                        placeholder="Sección (ej: Datos personales)"
                        className="w-full md:w-64 px-3 py-1.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-gray-300 transition-colors"
                      />
                      <label className="flex items-center gap-2 text-gray-500">
                        <input
                          type="checkbox"
                          checked={pregunta.obligatoria}
                          onChange={(e) => actualizarPregunta(pregunta.id, 'obligatoria', e.target.checked)}
                          className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                        />
                        Obligatoria
                      </label>
                      <label className="flex items-center gap-2 text-gray-500">
                        <span className="text-xs">Puntaje</span>
                        <input
                          type="number"
                          min={0}
                          step={0.5}
                          value={pregunta.puntaje || 0}
                          onChange={(e) => actualizarPregunta(pregunta.id, 'puntaje', parseFloat(e.target.value) || 0)}
                          className="w-20 px-3 py-1.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-gray-300 transition-colors"
                        />
                      </label>
                    </div>

                    <div className="bg-gray-50/50 rounded-lg p-4">
                      <p className="text-xs text-gray-400 mb-2">Vista previa</p>
                      {renderPregunta(pregunta)}
                    </div>

                    {errores[`pregunta_${index}`] && (
                      <p className="text-xs text-red-500">{errores[`pregunta_${index}`]}</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Botón agregar pregunta - Notion style */}
          <div className="relative">
            <button
              onClick={() => setMenuAbierto(!menuAbierto)}
              className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 hover:border-gray-300 hover:text-gray-600 transition-colors flex items-center justify-center gap-2 text-sm"
            >
              <Plus className="w-4 h-4" />
              Agregar pregunta
            </button>

            {menuAbierto && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-lg border border-gray-200 p-3 z-50 max-h-72 overflow-y-auto">
                <div className="grid grid-cols-3 gap-1">
                  {TIPOS_PREGUNTA.map((tipo) => {
                    const Icon = tipo.icon;
                    return (
                      <button
                        key={tipo.id}
                        onClick={() => agregarPregunta(tipo.id)}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors text-left"
                      >
                        <Icon className="w-4 h-4 text-gray-400" />
                        <span className="text-xs text-gray-600">{tipo.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Resumen */}
        {preguntas.length > 0 && (
          <div className="text-center text-xs text-gray-400 py-2">
            {preguntas.length} pregunta{preguntas.length !== 1 ? 's' : ''}
          </div>
        )}

        {errores.general && (
          <div className="flex items-center gap-2 text-red-500 bg-red-50 border border-red-200 px-3 py-2 rounded-lg text-xs">
            <AlertTriangle className="w-4 h-4" />
            <span>{errores.general}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreadorCuestionario;