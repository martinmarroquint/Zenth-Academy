// front/src/components/cursos/CreadorCurso.jsx
// COMPLETO - CON EDITOR DE TEXTO ENRIQUECIDO TIPTAP
// ACTUALIZADO: Cursos pagos, bloqueos, metadata, y creación completa de exámenes

import React, { useState, useEffect } from 'react';
import {
  ArrowLeft, Save, Plus, Trash2, GripVertical,
  Type, Video, FileText, BookOpen, X,
  ChevronDown, Image, Link as LinkIcon, Loader2,
  Edit3, Eye, Award, ExternalLink, Send,
  Tag, Target, ListChecks, Users, DollarSign, CreditCard,
  Calendar, Lock as LockIcon
} from 'lucide-react';
import cursosService from '../../services/cursosService';
import examenesService from '../../services/examenesService';
import cuestionariosService from '../../services/cuestionariosService';
import EditorTexto from './EditorTexto';
import ModalCrearExamenRapido from './ModalCrearExamenRapido';

// =============================================
// CONSTANTES
// =============================================

const CATEGORIAS = [
  { id: 'general', label: 'General' },
  { id: 'programacion', label: 'Programación' },
  { id: 'web', label: 'Desarrollo Web' },
  { id: 'movil', label: 'Desarrollo Móvil' },
  { id: 'datos', label: 'Data Science' },
  { id: 'ia', label: 'Inteligencia Artificial' },
  { id: 'diseno', label: 'Diseño' },
  { id: 'marketing', label: 'Marketing' },
  { id: 'negocios', label: 'Negocios' },
  { id: 'educacion', label: 'Educación' },
  { id: 'salud', label: 'Salud' },
  { id: 'idiomas', label: 'Idiomas' },
  { id: 'musica', label: 'Música' },
  { id: 'arte', label: 'Arte' },
  { id: 'fotografia', label: 'Fotografía' },
  { id: 'finanzas', label: 'Finanzas' },
  { id: 'emprendimiento', label: 'Emprendimiento' },
  { id: 'liderazgo', label: 'Liderazgo' },
  { id: 'productividad', label: 'Productividad' },
  { id: 'bienestar', label: 'Bienestar' },
];

const NIVELES = [
  { id: 'principiante', label: 'Principiante' },
  { id: 'intermedio', label: 'Intermedio' },
  { id: 'avanzado', label: 'Avanzado' },
  { id: 'todos', label: 'Todos los niveles' },
];

const MONEDAS = [
  { id: 'PEN', label: 'PEN (S/)' },
  { id: 'USD', label: 'USD ($)' },
  { id: 'EUR', label: 'EUR (€)' },
];

const METODOS_PAGO = [
  { id: 'yape', label: 'Yape' },
  { id: 'plin', label: 'Plin' },
  { id: 'ambos', label: 'Yape y Plin' },
];

const TIPOS_BLOQUEO = [
  { id: 'ninguno', label: 'Sin bloqueo' },
  { id: 'fecha', label: 'Por fecha' },
  { id: 'secuencial', label: 'Secuencial' },
  { id: 'desempeno', label: 'Por desempeño' },
  { id: 'mixto', label: 'Mixto' },
];

// =============================================
// COMPONENTE EDITOR DE LECCIONES
// =============================================
const EditorLeccion = ({ 
  leccion, 
  onUpdate, 
  onEliminar, 
  examenesDisponibles = [], 
  cuestionariosDisponibles = [],
  onExamenCreado,
  cursoTitulo = 'Curso'
}) => {
  const [editando, setEditando] = useState(false);
  const [vistaPrevia, setVistaPrevia] = useState(false);
  const [tempLeccion, setTempLeccion] = useState(leccion);
  const [mostrarModalExamen, setMostrarModalExamen] = useState(false);

  const handleSave = () => {
    onUpdate(tempLeccion);
    setEditando(false);
  };

  const handleCancel = () => {
    setTempLeccion(leccion);
    setEditando(false);
  };

  if (!editando) {
    return (
      <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group">
        <GripVertical className="w-3.5 h-3.5 text-gray-300 cursor-grab" />
        <span className="text-xs text-gray-400 min-w-[50px]">{leccion.tipo}</span>
        <span className="flex-1 text-sm text-gray-700 truncate">{leccion.titulo}</span>
        {leccion.tipo === 'examen' && (
          <Award className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
        )}
        <button
          onClick={() => setEditando(true)}
          className="p-1 hover:bg-white rounded text-gray-400 hover:text-gray-600 transition-colors opacity-0 group-hover:opacity-100"
        >
          <Edit3 className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onEliminar}
          className="p-1 hover:bg-red-50 rounded text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-500">EDITANDO LECCIÓN</span>
          {vistaPrevia && (
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: '#e6f4f2', color: '#0f766e' }}>
              Vista previa
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setVistaPrevia(!vistaPrevia)}
            className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600 transition-colors"
          >
            {vistaPrevia ? <Edit3 className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={handleCancel}
            className="px-3 py-1 text-xs text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="px-3 py-1 text-xs font-medium text-white rounded-lg transition-colors"
            style={{ backgroundColor: '#0f766e' }}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#0d5e57'}
            onMouseLeave={(e) => e.target.style.backgroundColor = '#0f766e'}
          >
            Guardar
          </button>
        </div>
      </div>

      <input
        type="text"
        value={tempLeccion.titulo}
        onChange={(e) => setTempLeccion({ ...tempLeccion, titulo: e.target.value })}
        placeholder="Título de la lección"
        className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg outline-none transition-colors focus:border-[#0f766e] focus:ring-2 focus:ring-[#0f766e]/20"
      />

      <div className="space-y-3">
        <select
          value={tempLeccion.tipo}
          onChange={(e) => {
            const nuevoTipo = e.target.value;
            setTempLeccion({
              ...tempLeccion,
              tipo: nuevoTipo,
              contenido: nuevoTipo === 'video' ? { video_url: '' } :
                        nuevoTipo === 'texto' ? { texto: '' } :
                        nuevoTipo === 'quiz' ? { cuestionario_id: '' } :
                        nuevoTipo === 'examen' ? { examen_id: '' } :
                        { archivos: [] }
            });
          }}
          className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#0f766e] focus:ring-2 focus:ring-[#0f766e]/20 bg-white w-full"
        >
          <option value="video">Video (YouTube)</option>
          <option value="texto">Texto Enriquecido</option>
          <option value="quiz">Cuestionario</option>
          <option value="examen">Examen</option>
          <option value="recurso">Recurso / Archivos</option>
          <option value="pizarra">Pizarra</option>
        </select>

        {!vistaPrevia && (
          <>
            {tempLeccion.tipo === 'video' && (
              <div>
                <label className="text-xs text-gray-500">ID o URL de YouTube</label>
                <input
                  type="text"
                  value={tempLeccion.contenido?.video_url || ''}
                  onChange={(e) => setTempLeccion({
                    ...tempLeccion,
                    contenido: { ...tempLeccion.contenido, video_url: e.target.value }
                  })}
                  placeholder="ej: dQw4w9WgXcQ o https://youtu.be/..."
                  className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#0f766e] focus:ring-2 focus:ring-[#0f766e]/20 transition-colors"
                />
              </div>
            )}

            {tempLeccion.tipo === 'texto' && (
              <div>
                <label className="text-xs text-gray-500">Contenido enriquecido</label>
                <EditorTexto
                  contenido={tempLeccion.contenido?.texto || ''}
                  onUpdate={(html) => setTempLeccion({
                    ...tempLeccion,
                    contenido: { ...tempLeccion.contenido, texto: html }
                  })}
                  placeholder="Escribe el contenido de la lección..."
                />
              </div>
            )}

            {tempLeccion.tipo === 'quiz' && (
              <div>
                <label className="text-xs text-gray-500">Cuestionario</label>
                <select
                  value={tempLeccion.contenido?.cuestionario_id || ''}
                  onChange={(e) => setTempLeccion({
                    ...tempLeccion,
                    contenido: { ...tempLeccion.contenido, cuestionario_id: e.target.value }
                  })}
                  className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#0f766e] focus:ring-2 focus:ring-[#0f766e]/20 bg-white transition-colors"
                >
                  <option value="">— Seleccionar cuestionario —</option>
                  {cuestionariosDisponibles.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.titulo}{c.estado ? ` (${String(c.estado).toUpperCase()})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {tempLeccion.tipo === 'examen' && (
              <div>
                <label className="text-xs text-gray-500">Examen</label>
                <div className="flex items-center gap-2">
                  <select
                    value={tempLeccion.contenido?.examen_id || ''}
                    onChange={(e) => setTempLeccion({
                      ...tempLeccion,
                      contenido: { ...tempLeccion.contenido, examen_id: e.target.value }
                    })}
                    className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#0f766e] focus:ring-2 focus:ring-[#0f766e]/20 bg-white transition-colors"
                  >
                    <option value="">— Seleccionar examen —</option>
                    {examenesDisponibles.map((ex) => (
                      <option key={ex.id} value={ex.id}>
                        {ex.titulo}{ex.total_preguntas ? ` (${ex.total_preguntas} preguntas)` : ''}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => setMostrarModalExamen(true)}
                    className="px-3 py-1.5 text-xs font-medium text-white rounded-lg transition-colors flex items-center gap-1 whitespace-nowrap"
                    style={{ backgroundColor: '#0f766e' }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = '#0d5e57'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = '#0f766e'}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Nuevo
                  </button>
                </div>
                {examenesDisponibles.length === 0 && (
                  <p className="text-xs text-amber-500 mt-1">No hay exámenes disponibles. Crea uno nuevo.</p>
                )}
                <p className="text-xs text-gray-400 mt-1">El estudiante lo resolverá embebido en el curso</p>
              </div>
            )}

            {tempLeccion.tipo === 'recurso' && (
              <div>
                <label className="text-xs text-gray-500">Recursos (links)</label>
                <div className="space-y-2">
                  {(tempLeccion.contenido?.archivos || []).map((recurso, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={recurso.nombre || ''}
                        onChange={(e) => {
                          const nuevos = [...(tempLeccion.contenido?.archivos || [])];
                          nuevos[index] = { ...nuevos[index], nombre: e.target.value };
                          setTempLeccion({
                            ...tempLeccion,
                            contenido: { ...tempLeccion.contenido, archivos: nuevos }
                          });
                        }}
                        placeholder="Nombre del recurso"
                        className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#0f766e] focus:ring-2 focus:ring-[#0f766e]/20 transition-colors"
                      />
                      <input
                        type="text"
                        value={recurso.url || ''}
                        onChange={(e) => {
                          const nuevos = [...(tempLeccion.contenido?.archivos || [])];
                          nuevos[index] = { ...nuevos[index], url: e.target.value };
                          setTempLeccion({
                            ...tempLeccion,
                            contenido: { ...tempLeccion.contenido, archivos: nuevos }
                          });
                        }}
                        placeholder="URL"
                        className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#0f766e] focus:ring-2 focus:ring-[#0f766e]/20 transition-colors"
                      />
                      <button
                        onClick={() => {
                          const nuevos = (tempLeccion.contenido?.archivos || []).filter((_, i) => i !== index);
                          setTempLeccion({
                            ...tempLeccion,
                            contenido: { ...tempLeccion.contenido, archivos: nuevos }
                          });
                        }}
                        className="p-1 hover:bg-red-50 rounded text-gray-400 hover:text-red-500"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => {
                      const actuales = tempLeccion.contenido?.archivos || [];
                      setTempLeccion({
                        ...tempLeccion,
                        contenido: {
                          ...tempLeccion.contenido,
                          archivos: [...actuales, { nombre: '', url: '', tipo: 'link' }]
                        }
                      });
                    }}
                    className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Agregar recurso
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {vistaPrevia && (
          <div className="border border-gray-200 rounded-lg p-4 min-h-[200px]">
            {tempLeccion.tipo === 'video' && (
              <div className="text-center text-gray-400">
                <Video className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>Video: {tempLeccion.contenido?.video_url || 'Sin video'}</p>
              </div>
            )}
            {tempLeccion.tipo === 'texto' && (
              <div 
                className="prose prose-slate max-w-none"
                dangerouslySetInnerHTML={{ __html: tempLeccion.contenido?.texto || '' }}
              />
            )}
            {tempLeccion.tipo === 'quiz' && (
              <div className="text-center text-gray-400">
                <BookOpen className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>{cuestionariosDisponibles.find(c => c.id === tempLeccion.contenido?.cuestionario_id)?.titulo || 'Cuestionario sin asignar'}</p>
              </div>
            )}
            {tempLeccion.tipo === 'examen' && (
              <div className="text-center text-gray-400">
                <Award className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>{examenesDisponibles.find(e => e.id === tempLeccion.contenido?.examen_id)?.titulo || 'Examen sin asignar'}</p>
              </div>
            )}
            {tempLeccion.tipo === 'recurso' && (
              <div className="space-y-2">
                {(tempLeccion.contenido?.archivos || []).map((r, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-gray-600">
                    <LinkIcon className="w-4 h-4 text-gray-400" />
                    <span>{r.nombre || 'Recurso sin nombre'}</span>
                    <span className="text-xs text-gray-400">{r.url || 'Sin URL'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal de creación de examen - usa el componente completo */}
      <ModalCrearExamenRapido
        abierto={mostrarModalExamen}
        onClose={() => setMostrarModalExamen(false)}
        onExamenCreado={(examen) => {
          setTempLeccion({
            ...tempLeccion,
            contenido: { ...tempLeccion.contenido, examen_id: examen.id }
          });
          if (onExamenCreado) {
            onExamenCreado(examen);
          }
          setMostrarModalExamen(false);
        }}
        cursoTitulo={cursoTitulo}
      />
    </div>
  );
};

// =============================================
// COMPONENTE PRINCIPAL
// =============================================
const CreadorCurso = ({ cursoInicial = null, onGuardar, onVolver }) => {
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [examenesDisponibles, setExamenesDisponibles] = useState([]);
  const [cuestionariosDisponibles, setCuestionariosDisponibles] = useState([]);
  const [mostrarBloqueo, setMostrarBloqueo] = useState(false);
  const [mostrarCertificado, setMostrarCertificado] = useState(false);

  useEffect(() => {
    let activo = true;
    
    const cargarDatos = async () => {
      try {
        const [examenes, cuestionarios] = await Promise.allSettled([
          examenesService.listarExamenes({ limit: 100 }),
          cuestionariosService.listar()
        ]);
        
        if (activo) {
          if (examenes.status === 'fulfilled') {
            setExamenesDisponibles(Array.isArray(examenes.value) ? examenes.value : []);
          }
          if (cuestionarios.status === 'fulfilled') {
            setCuestionariosDisponibles(Array.isArray(cuestionarios.value) ? cuestionarios.value : []);
          }
        }
      } catch (e) {
        console.warn('Error cargando datos:', e);
      }
    };
    
    cargarDatos();
    
    return () => { activo = false; };
  }, []);

  const [datos, setDatos] = useState({
    titulo: cursoInicial?.titulo || '',
    descripcion: cursoInicial?.descripcion || '',
    categoria: cursoInicial?.categoria || 'general',
    nivel: cursoInicial?.nivel || 'principiante',
    precio_tipo: cursoInicial?.precio_tipo || 'gratis',
    precio_monto: cursoInicial?.precio_monto || '',
    moneda: cursoInicial?.moneda || 'PEN',
    metodo_pago: cursoInicial?.metodo_pago || '',
    numero_pago: cursoInicial?.numero_pago || '',
    instrucciones_pago: cursoInicial?.instrucciones_pago || '',
    duracion: cursoInicial?.duracion || '',
    instructor: cursoInicial?.instructor || '',
    imagen_url: cursoInicial?.imagen_url || '',
    etiquetas: cursoInicial?.etiquetas || [],
    requisitos: cursoInicial?.requisitos || [],
    objetivos: cursoInicial?.objetivos || [],
    publico_objetivo: cursoInicial?.publico_objetivo || '',
    tipo_bloqueo: cursoInicial?.tipo_bloqueo || 'ninguno',
    bloqueo_config: cursoInicial?.bloqueo_config || {},
    certificado_habilitado: cursoInicial?.certificado_habilitado !== false,
    certificado_nota_minima: cursoInicial?.certificado_nota_minima ?? '',
  });

  const [etiquetaInput, setEtiquetaInput] = useState('');
  const [requisitoInput, setRequisitoInput] = useState('');
  const [objetivoInput, setObjetivoInput] = useState('');

  const [modulos, setModulos] = useState(() => {
    if (cursoInicial?.modulos) return cursoInicial.modulos;
    return [{ 
      id: Date.now(), 
      titulo: 'Módulo 1', 
      lecciones: [
        { 
          id: Date.now() + 1, 
          titulo: 'Introducción', 
          tipo: 'video', 
          contenido: { video_url: '' } 
        }
      ] 
    }];
  });

  const [moduloEditando, setModuloEditando] = useState(null);

  const agregarModulo = () => {
    const nuevoModulo = {
      id: Date.now(),
      titulo: `Módulo ${modulos.length + 1}`,
      lecciones: [{ 
        id: Date.now() + 1, 
        titulo: 'Nueva Lección', 
        tipo: 'video', 
        contenido: { video_url: '' } 
      }]
    };
    setModulos([...modulos, nuevoModulo]);
    setModuloEditando(nuevoModulo.id);
  };

  const eliminarModulo = (id) => {
    if (!window.confirm('¿Eliminar este módulo?')) return;
    setModulos(modulos.filter(m => m.id !== id));
    if (moduloEditando === id) setModuloEditando(null);
  };

  const agregarLeccion = (moduloId) => {
    setModulos(modulos.map(m => {
      if (m.id !== moduloId) return m;
      const nuevaLeccion = { 
        id: Date.now(), 
        titulo: `Lección ${m.lecciones.length + 1}`, 
        tipo: 'video', 
        contenido: { video_url: '' } 
      };
      return { ...m, lecciones: [...m.lecciones, nuevaLeccion] };
    }));
  };

  const eliminarLeccion = (moduloId, leccionId) => {
    setModulos(modulos.map(m => {
      if (m.id !== moduloId) return m;
      return { ...m, lecciones: m.lecciones.filter(l => l.id !== leccionId) };
    }));
  };

  const actualizarLeccion = (moduloId, leccionActualizada) => {
    setModulos(modulos.map(m => {
      if (m.id !== moduloId) return m;
      return {
        ...m,
        lecciones: m.lecciones.map(l => 
          l.id === leccionActualizada.id ? leccionActualizada : l
        )
      };
    }));
  };

  const actualizarModulo = (id, campo, valor) => {
    setModulos(modulos.map(m => m.id === id ? { ...m, [campo]: valor } : m));
  };

  const handleExamenCreado = (examen) => {
    setExamenesDisponibles(prev => {
      if (prev.some(e => e.id === examen.id)) return prev;
      return [...prev, examen];
    });
  };

  const agregarEtiqueta = () => {
    if (etiquetaInput.trim() && !datos.etiquetas.includes(etiquetaInput.trim())) {
      setDatos({ ...datos, etiquetas: [...datos.etiquetas, etiquetaInput.trim()] });
      setEtiquetaInput('');
    }
  };

  const eliminarEtiqueta = (etiqueta) => {
    setDatos({ ...datos, etiquetas: datos.etiquetas.filter(e => e !== etiqueta) });
  };

  const agregarRequisito = () => {
    if (requisitoInput.trim() && !datos.requisitos.includes(requisitoInput.trim())) {
      setDatos({ ...datos, requisitos: [...datos.requisitos, requisitoInput.trim()] });
      setRequisitoInput('');
    }
  };

  const eliminarRequisito = (requisito) => {
    setDatos({ ...datos, requisitos: datos.requisitos.filter(r => r !== requisito) });
  };

  const agregarObjetivo = () => {
    if (objetivoInput.trim() && !datos.objetivos.includes(objetivoInput.trim())) {
      setDatos({ ...datos, objetivos: [...datos.objetivos, objetivoInput.trim()] });
      setObjetivoInput('');
    }
  };

  const eliminarObjetivo = (objetivo) => {
    setDatos({ ...datos, objetivos: datos.objetivos.filter(o => o !== objetivo) });
  };

  const guardarCurso = async () => {
    if (!datos.titulo.trim()) {
      setError('El título del curso es obligatorio');
      return null;
    }
    setError('');
    
    const cursoData = {
      titulo: datos.titulo.trim(),
      descripcion: datos.descripcion.trim(),
      categoria: datos.categoria,
      nivel: datos.nivel,
      duracion: datos.duracion,
      instructor: datos.instructor,
      imagen_url: datos.imagen_url,
      precio_tipo: datos.precio_tipo || 'gratis',
      precio_monto: datos.precio_tipo === 'pago' && datos.precio_monto ? parseFloat(datos.precio_monto) : null,
      moneda: datos.moneda || 'PEN',
      metodo_pago: datos.precio_tipo === 'pago' ? datos.metodo_pago : null,
      numero_pago: datos.precio_tipo === 'pago' ? datos.numero_pago : null,
      instrucciones_pago: datos.precio_tipo === 'pago' ? datos.instrucciones_pago : null,
      etiquetas: datos.etiquetas || [],
      requisitos: datos.requisitos || [],
      objetivos: datos.objetivos || [],
      publico_objetivo: datos.publico_objetivo || null,
      tipo_bloqueo: datos.tipo_bloqueo || 'ninguno',
      bloqueo_config: datos.bloqueo_config || {},
      certificado_habilitado: !!datos.certificado_habilitado,
      certificado_nota_minima: datos.certificado_nota_minima
        ? parseFloat(datos.certificado_nota_minima)
        : null,
      modulos: modulos.map(m => ({
        ...m,
        lecciones: m.lecciones.map(l => ({
          ...l,
          contenido: l.contenido || {}
        }))
      }))
    };
    
    if (cursoInicial?.id) {
      await cursosService.actualizar(cursoInicial.id, cursoData);
      return { ...cursoData, id: cursoInicial.id };
    }
    const creado = await cursosService.crear(cursoData);
    return creado?.id ? { ...cursoData, ...creado } : { ...cursoData };
  };

  const handleGuardar = async () => {
    setCargando(true);
    setError('');
    try {
      const guardado = await guardarCurso();
      if (!guardado) return;
      onGuardar(guardado);
    } catch (e) {
      console.error('Error guardando curso:', e);
      setError(e.message || 'No se pudo guardar el curso');
    } finally {
      setCargando(false);
    }
  };

  const handlePublicar = async () => {
    setCargando(true);
    setError('');
    try {
      const guardado = await guardarCurso();
      if (!guardado) return;
      await cursosService.publicar(guardado.id);
      onGuardar(guardado);
    } catch (e) {
      console.error('Error publicando curso:', e);
      setError(e.message || 'No se pudo publicar el curso');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fbfbfa]">
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-sm border-b border-gray-200/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onVolver} className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-600">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-medium text-gray-700">
              {cursoInicial?.id ? 'Editar Curso' : 'Nuevo Curso'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePublicar}
              disabled={cargando}
              className="px-4 py-1.5 text-sm font-medium text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
              style={{ backgroundColor: '#0f766e' }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#0d5e57'}
              onMouseLeave={(e) => e.target.style.backgroundColor = '#0f766e'}
            >
              {cargando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {cargando ? 'Procesando...' : 'Publicar'}
            </button>
            <button
              onClick={handleGuardar}
              disabled={cargando}
              className="px-4 py-1.5 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {cargando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {cargando ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Información básica */}
        <div className="bg-white rounded-xl border border-gray-200/60 p-6 space-y-4">
          <input
            type="text"
            value={datos.titulo}
            onChange={(e) => setDatos({ ...datos, titulo: e.target.value })}
            placeholder="Título del curso"
            className="w-full text-xl font-semibold text-gray-900 bg-transparent border-0 border-b-2 pb-2 transition-colors placeholder:text-gray-300 focus:outline-none border-transparent hover:border-gray-200 focus:border-[#0f766e]"
          />
          
          <textarea
            value={datos.descripcion}
            onChange={(e) => setDatos({ ...datos, descripcion: e.target.value })}
            placeholder="Descripción del curso..."
            rows={2}
            className="w-full text-sm text-gray-500 bg-transparent border-0 border-b-2 pb-2 resize-none transition-colors border-transparent hover:border-gray-200 focus:border-[#0f766e] focus:outline-none placeholder:text-gray-300"
          />

          <div className="flex flex-wrap gap-3 pt-2 border-t border-gray-100">
            <select
              value={datos.categoria}
              onChange={(e) => setDatos({ ...datos, categoria: e.target.value })}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#0f766e] focus:ring-2 focus:ring-[#0f766e]/20 bg-transparent"
            >
              {CATEGORIAS.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.label}</option>
              ))}
            </select>

            <select
              value={datos.nivel}
              onChange={(e) => setDatos({ ...datos, nivel: e.target.value })}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#0f766e] focus:ring-2 focus:ring-[#0f766e]/20 bg-transparent"
            >
              {NIVELES.map((n) => (
                <option key={n.id} value={n.id}>{n.label}</option>
              ))}
            </select>

            <input
              type="text"
              value={datos.duracion}
              onChange={(e) => setDatos({ ...datos, duracion: e.target.value })}
              placeholder="Duración (ej: 40 horas)"
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#0f766e] focus:ring-2 focus:ring-[#0f766e]/20 bg-transparent"
            />

            <input
              type="text"
              value={datos.instructor}
              onChange={(e) => setDatos({ ...datos, instructor: e.target.value })}
              placeholder="Instructor"
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#0f766e] focus:ring-2 focus:ring-[#0f766e]/20 bg-transparent"
            />

            <input
              type="text"
              value={datos.imagen_url}
              onChange={(e) => setDatos({ ...datos, imagen_url: e.target.value })}
              placeholder="URL de la imagen de portada"
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#0f766e] focus:ring-2 focus:ring-[#0f766e]/20 bg-transparent flex-1 min-w-[200px]"
            />
          </div>
        </div>

        {/* SECCIÓN DE PAGOS */}
        <div className="bg-white rounded-xl border border-gray-200/60 p-6 space-y-4">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-gray-400" />
            <h3 className="text-sm font-medium text-gray-700">Configuración de pago</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Tipo de precio</label>
              <select
                value={datos.precio_tipo}
                onChange={(e) => setDatos({ ...datos, precio_tipo: e.target.value })}
                className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#0f766e] focus:ring-2 focus:ring-[#0f766e]/20 bg-white transition-colors"
              >
                <option value="gratis">Gratis</option>
                <option value="pago">Pago</option>
              </select>
            </div>

            {datos.precio_tipo === 'pago' && (
              <>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Monto</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={datos.precio_monto}
                      onChange={(e) => setDatos({ ...datos, precio_monto: e.target.value })}
                      placeholder="49.99"
                      min="0"
                      step="0.01"
                      className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#0f766e] focus:ring-2 focus:ring-[#0f766e]/20 transition-colors"
                    />
                    <select
                      value={datos.moneda}
                      onChange={(e) => setDatos({ ...datos, moneda: e.target.value })}
                      className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#0f766e] focus:ring-2 focus:ring-[#0f766e]/20 bg-white transition-colors"
                    >
                      {MONEDAS.map((m) => (
                        <option key={m.id} value={m.id}>{m.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-gray-500 block mb-1">Método de pago</label>
                  <select
                    value={datos.metodo_pago}
                    onChange={(e) => setDatos({ ...datos, metodo_pago: e.target.value })}
                    className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#0f766e] focus:ring-2 focus:ring-[#0f766e]/20 bg-white transition-colors"
                  >
                    <option value="">Seleccionar...</option>
                    {METODOS_PAGO.map((m) => (
                      <option key={m.id} value={m.id}>{m.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-gray-500 block mb-1">Número de teléfono (Yape/Plin)</label>
                  <input
                    type="text"
                    value={datos.numero_pago}
                    onChange={(e) => setDatos({ ...datos, numero_pago: e.target.value })}
                    placeholder="ej: 987654321"
                    className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#0f766e] focus:ring-2 focus:ring-[#0f766e]/20 transition-colors"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-xs text-gray-500 block mb-1">Instrucciones para el pago</label>
                  <textarea
                    value={datos.instrucciones_pago}
                    onChange={(e) => setDatos({ ...datos, instrucciones_pago: e.target.value })}
                    placeholder="Instrucciones adicionales para el estudiante..."
                    rows={2}
                    className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#0f766e] focus:ring-2 focus:ring-[#0f766e]/20 transition-colors resize-none"
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* SECCIÓN DE METADATA */}
        <div className="bg-white rounded-xl border border-gray-200/60 p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-gray-400" />
            <h3 className="text-sm font-medium text-gray-700">Metadatos</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="text-xs text-gray-500 block mb-1">Público objetivo</label>
              <input
                type="text"
                value={datos.publico_objetivo}
                onChange={(e) => setDatos({ ...datos, publico_objetivo: e.target.value })}
                placeholder="Ej: Estudiantes de programación, profesionales de marketing..."
                className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#0f766e] focus:ring-2 focus:ring-[#0f766e]/20 transition-colors"
              />
            </div>

            <div>
              <label className="text-xs text-gray-500 block mb-1">Etiquetas</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={etiquetaInput}
                  onChange={(e) => setEtiquetaInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && agregarEtiqueta()}
                  placeholder="Agregar etiqueta..."
                  className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#0f766e] focus:ring-2 focus:ring-[#0f766e]/20 transition-colors"
                />
                <button
                  onClick={agregarEtiqueta}
                  className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {datos.etiquetas.map((etiqueta) => (
                  <span key={etiqueta} className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">
                    {etiqueta}
                    <button onClick={() => eliminarEtiqueta(etiqueta)} className="hover:text-red-500">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-500 block mb-1">Requisitos</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={requisitoInput}
                  onChange={(e) => setRequisitoInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && agregarRequisito()}
                  placeholder="Agregar requisito..."
                  className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#0f766e] focus:ring-2 focus:ring-[#0f766e]/20 transition-colors"
                />
                <button
                  onClick={agregarRequisito}
                  className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {datos.requisitos.map((requisito) => (
                  <span key={requisito} className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">
                    {requisito}
                    <button onClick={() => eliminarRequisito(requisito)} className="hover:text-red-500">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="text-xs text-gray-500 block mb-1">Objetivos del curso</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={objetivoInput}
                  onChange={(e) => setObjetivoInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && agregarObjetivo()}
                  placeholder="Agregar objetivo..."
                  className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#0f766e] focus:ring-2 focus:ring-[#0f766e]/20 transition-colors"
                />
                <button
                  onClick={agregarObjetivo}
                  className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {datos.objetivos.map((objetivo) => (
                  <span key={objetivo} className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">
                    {objetivo}
                    <button onClick={() => eliminarObjetivo(objetivo)} className="hover:text-red-500">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* SECCIÓN DE BLOQUEO */}
        <div className="bg-white rounded-xl border border-gray-200/60 p-6 space-y-4">
          <button
            onClick={() => setMostrarBloqueo(!mostrarBloqueo)}
            className="flex items-center justify-between w-full"
          >
            <div className="flex items-center gap-2">
              <LockIcon className="w-4 h-4 text-gray-400" />
              <h3 className="text-sm font-medium text-gray-700">Control de bloqueo</h3>
              {datos.tipo_bloqueo !== 'ninguno' && (
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: '#e6f4f2', color: '#0f766e' }}>
                  {TIPOS_BLOQUEO.find(t => t.id === datos.tipo_bloqueo)?.label || datos.tipo_bloqueo}
                </span>
              )}
            </div>
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${mostrarBloqueo ? 'rotate-180' : ''}`} />
          </button>

          {mostrarBloqueo && (
            <div className="space-y-4 pt-4 border-t border-gray-100">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Tipo de bloqueo</label>
                <select
                  value={datos.tipo_bloqueo}
                  onChange={(e) => setDatos({ ...datos, tipo_bloqueo: e.target.value })}
                  className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#0f766e] focus:ring-2 focus:ring-[#0f766e]/20 bg-white transition-colors"
                >
                  {TIPOS_BLOQUEO.map((t) => (
                    <option key={t.id} value={t.id}>{t.label}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-400 mt-1">
                  {datos.tipo_bloqueo === 'ninguno' && 'Sin restricciones de acceso'}
                  {datos.tipo_bloqueo === 'fecha' && 'Las lecciones se liberan en fechas específicas'}
                  {datos.tipo_bloqueo === 'secuencial' && 'Debes completar cada lección antes de avanzar'}
                  {datos.tipo_bloqueo === 'desempeno' && 'Debes aprobar evaluaciones para avanzar'}
                  {datos.tipo_bloqueo === 'mixto' && 'Combinación de bloqueos (configuración avanzada)'}
                </p>
              </div>

              {(datos.tipo_bloqueo === 'fecha' || datos.tipo_bloqueo === 'mixto') && (
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Fechas de liberación por lección</label>
                  <p className="text-xs text-gray-400 mb-2">
                    Configura las fechas en las que cada lección estará disponible.
                    El formato debe ser: <code className="bg-gray-100 px-1 rounded">YYYY-MM-DDTHH:mm:ss</code>
                  </p>
                  <div className="space-y-2">
                    {modulos.map((modulo) => (
                      modulo.lecciones.map((leccion) => (
                        <div key={leccion.id} className="flex items-center gap-2">
                          <span className="text-xs text-gray-500 min-w-[150px] truncate">{leccion.titulo}</span>
                          <input
                            type="datetime-local"
                            value={datos.bloqueo_config?.fechas?.[leccion.id] || ''}
                            onChange={(e) => {
                              const nuevasFechas = {
                                ...(datos.bloqueo_config?.fechas || {}),
                                [leccion.id]: e.target.value
                              };
                              setDatos({
                                ...datos,
                                bloqueo_config: {
                                  ...datos.bloqueo_config,
                                  fechas: nuevasFechas
                                }
                              });
                            }}
                            className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#0f766e] focus:ring-2 focus:ring-[#0f766e]/20 transition-colors"
                          />
                          {datos.bloqueo_config?.fechas?.[leccion.id] && (
                            <button
                              onClick={() => {
                                const nuevasFechas = { ...datos.bloqueo_config?.fechas };
                                delete nuevasFechas[leccion.id];
                                setDatos({
                                  ...datos,
                                  bloqueo_config: {
                                    ...datos.bloqueo_config,
                                    fechas: nuevasFechas
                                  }
                                });
                              }}
                              className="p-1 hover:bg-red-50 rounded text-gray-400 hover:text-red-500"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))
                    ))}
                  </div>
                </div>
              )}

              {(datos.tipo_bloqueo === 'desempeno' || datos.tipo_bloqueo === 'mixto') && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-xs text-amber-700">
                    <strong>Nota:</strong> Para configurar evaluaciones por lección, ve a la lección y usa la opción 
                    "Configurar evaluación" en el panel de edición.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* SECCIÓN DE CERTIFICADO */}
        <div className="bg-white rounded-xl border border-gray-200/60 p-6 space-y-4">
          <button
            onClick={() => setMostrarCertificado(!mostrarCertificado)}
            className="flex items-center justify-between w-full"
          >
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-gray-400" />
              <h3 className="text-sm font-medium text-gray-700">Certificado</h3>
              {datos.certificado_habilitado && (
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: '#e6f4f2', color: '#0f766e' }}>
                  Habilitado
                </span>
              )}
            </div>
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${mostrarCertificado ? 'rotate-180' : ''}`} />
          </button>

          {mostrarCertificado && (
            <div className="space-y-4 pt-4 border-t border-gray-100">
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={datos.certificado_habilitado}
                  onChange={(e) => setDatos({ ...datos, certificado_habilitado: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 focus:ring-[#0f766e]"
                  style={{ accentColor: '#0f766e' }}
                />
                Emitir certificado al completar el curso
              </label>
              <p className="text-xs text-gray-400">
                Cuando un estudiante complete el 100% de las lecciones, se generará automáticamente
                su certificado con un código único.
              </p>

              {datos.certificado_habilitado && (
                <div>
                  <label className="text-xs text-gray-500 block mb-1">
                    Nota mínima requerida (opcional)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    step="0.5"
                    value={datos.certificado_nota_minima}
                    onChange={(e) => setDatos({ ...datos, certificado_nota_minima: e.target.value })}
                    placeholder="Ej: 11"
                    className="w-full sm:w-64 px-3 py-1.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#0f766e] focus:ring-2 focus:ring-[#0f766e]/20 transition-colors"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Si se define, el estudiante debe tener un promedio igual o mayor a esta nota
                    (escala 0–20) para recibir su certificado.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Módulos y lecciones */}
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

              {moduloEditando === modulo.id && (
                <div className="border-t border-gray-100 px-4 py-4 space-y-3">
                  <input
                    type="text"
                    value={modulo.titulo}
                    onChange={(e) => actualizarModulo(modulo.id, 'titulo', e.target.value)}
                    placeholder="Nombre del módulo"
                    className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#0f766e] focus:ring-2 focus:ring-[#0f766e]/20 transition-colors"
                  />

                  <div className="space-y-2">
                    {modulo.lecciones.map((leccion) => (
                      <EditorLeccion
                        key={leccion.id}
                        leccion={leccion}
                        onUpdate={(updated) => actualizarLeccion(modulo.id, updated)}
                        onEliminar={() => eliminarLeccion(modulo.id, leccion.id)}
                        examenesDisponibles={examenesDisponibles}
                        cuestionariosDisponibles={cuestionariosDisponibles}
                        onExamenCreado={handleExamenCreado}
                        cursoTitulo={datos.titulo || 'Curso'}
                      />
                    ))}
                    <button
                      onClick={() => agregarLeccion(modulo.id)}
                      className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 mt-2"
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

export default CreadorCurso;