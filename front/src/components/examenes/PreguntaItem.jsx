// src/components/examenes/PreguntaItem.jsx
// VERSION CORREGIDA - INSERTAR DESPUES
import React, { useState, useRef, useEffect } from 'react';
import { 
  Plus, Trash2, CheckCircle2, X, Eye, Type, Hash, Copy, GripVertical,
  ListChecks, ToggleLeft, ArrowLeftRight, ArrowUpDown, PenLine, AlignLeft,
  BarChart3, Star
} from 'lucide-react';
import { COLOR_PRIMARIO, TIPOS_PREGUNTA_CONFIG } from './constantes';

const ICONOS_POR_TIPO = {
  opcion_multiple: ListChecks,
  verdadero_falso: ToggleLeft,
  relacionar: ArrowLeftRight,
  ordenamiento: ArrowUpDown,
  completar: PenLine,
  respuesta_corta: Type,
  ensayo: AlignLeft,
  likert: BarChart3,
  estrellas: Star,
  escala_numerica: Hash
};

const COLORES_TIPO = {
  opcion_multiple: '#188C5D', verdadero_falso: '#2563EB',
  relacionar: '#7C3AED', ordenamiento: '#F59E0B',
  completar: '#DC2626', respuesta_corta: '#0891B2', ensayo: '#4F46E5',
  likert: '#0D9488', estrellas: '#D97706', escala_numerica: '#7C3AED'
};

const PreguntaItem = ({ 
  pregunta, index, onUpdate, onDelete, onDuplicate,
  colorTipo, nombreTipo,
  onAgregarPregunta
}) => {
  const [mostrarPreview, setMostrarPreview] = useState(false);
  const [menuAbierto, setMenuAbierto] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuAbierto(false);
      }
    };
    if (menuAbierto) {
      document.addEventListener('mousedown', handler);
      document.addEventListener('touchstart', handler);
    }
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [menuAbierto]);

  // ========== VERDADERO/FALSO ==========
  const agregarAfirmacion = () => onUpdate('afirmaciones', [...(pregunta.afirmaciones || []), { id: Date.now().toString(), texto: '', esVerdadero: true }]);
  const actAfirmacion = (afId, campo, valor) => onUpdate('afirmaciones', (pregunta.afirmaciones || []).map(a => a.id === afId ? { ...a, [campo]: valor } : a));
  const delAfirmacion = (afId) => onUpdate('afirmaciones', (pregunta.afirmaciones || []).filter(a => a.id !== afId));

  // ========== RELACIONAR ==========
  const agregarPar = () => onUpdate(null, { columna_a: [...(pregunta.columna_a || []), ''], columna_b: [...(pregunta.columna_b || []), ''] });
  const actColA = (i, v) => { const n = [...(pregunta.columna_a || [])]; n[i] = v; onUpdate('columna_a', n); };
  const actColB = (i, v) => { const n = [...(pregunta.columna_b || [])]; n[i] = v; onUpdate('columna_b', n); };
  const delPar = (i) => {
    const llenos = (pregunta.columna_a || []).filter(x => x?.trim()).length;
    if (llenos <= 2) return;
    onUpdate(null, { columna_a: (pregunta.columna_a || []).filter((_, idx) => idx !== i), columna_b: (pregunta.columna_b || []).filter((_, idx) => idx !== i) });
  };

  // ========== ORDENAMIENTO ==========
  const actElem = (i, v) => { const n = [...(pregunta.elementos || [])]; n[i] = v; onUpdate('elementos', n); };

  // ========== COMPLETAR ==========
  const agregarFrase = () => onUpdate('frases', [...(pregunta.frases || []), { id: Date.now().toString(), segmentos: [], puntos: 1 }]);
  const agregarSegmento = (fraseId, tipo) => onUpdate('frases', (pregunta.frases || []).map(f => f.id === fraseId ? { ...f, segmentos: [...(f.segmentos || []), { id: Date.now().toString(), tipo, texto: tipo === 'texto' ? '' : undefined, respuesta: tipo === 'espacio' ? '' : undefined }] } : f));
  const actSegmento = (fraseId, segId, campo, valor) => onUpdate('frases', (pregunta.frases || []).map(f => f.id === fraseId ? { ...f, segmentos: (f.segmentos || []).map(s => s.id === segId ? { ...s, [campo]: valor } : s) } : f));
  const delSegmento = (fraseId, segId) => onUpdate('frases', (pregunta.frases || []).map(f => f.id === fraseId ? { ...f, segmentos: (f.segmentos || []).filter(s => s.id !== segId) } : f));
  const delFrase = (fraseId) => onUpdate('frases', (pregunta.frases || []).filter(f => f.id !== fraseId));
  const actPtsFrase = (fraseId, pts) => onUpdate('frases', (pregunta.frases || []).map(f => f.id === fraseId ? { ...f, puntos: parseInt(pts) || 1 } : f));
  const limpiarFrase = (fraseId) => onUpdate('frases', (pregunta.frases || []).map(f => f.id === fraseId ? { ...f, segmentos: [] } : f));

  const totalPtsCompletar = (pregunta.frases || []).reduce((sum, f) => sum + (f.puntos || 1), 0);
  const totalEspacios = (pregunta.frases || []).reduce((sum, f) => sum + (f.segmentos || []).filter(s => s.tipo === 'espacio').length, 0);

  // ✅ CORREGIDO: insertar después usando el índice
  const handleInsertarDespues = () => {
    if (onAgregarPregunta) {
      // Pasar el tipo de pregunta y la posición (índice + 1)
      onAgregarPregunta('opcion_multiple', index + 1);
    }
  };

  return (
    <div className="group/pregunta bg-white rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all duration-200">
      <div className="flex flex-col sm:flex-row">
        
        <div className="flex-1 p-3 sm:p-4 space-y-4 min-w-0">
          
          <div className="flex items-center gap-2 flex-wrap">
            <GripVertical className="w-4 h-4 text-gray-300 cursor-grab opacity-0 group-hover/pregunta:opacity-100 transition-opacity duration-200 hidden sm:block flex-shrink-0"/>
            <span className="text-xs font-bold text-gray-400 flex-shrink-0">{index + 1}.</span>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-medium text-white flex-shrink-0" style={{ backgroundColor: colorTipo }}>{nombreTipo}</span>
            {pregunta.tipo === 'completar' && (pregunta.frases || []).length > 0 && (
              <span className="text-[10px] text-gray-400 truncate">{(pregunta.frases || []).length} frases / {totalPtsCompletar} pts</span>
            )}
            <div className="flex items-center gap-1 ml-auto flex-shrink-0">
              {pregunta.tipo !== 'completar' && (
                <>
                  <input type="number" value={pregunta.puntos || 1} onChange={(e) => onUpdate('puntos', parseInt(e.target.value) || 1)} min={1}
                    className="w-12 px-2 py-1 text-[11px] border border-gray-200 rounded-lg text-center font-medium outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all"/>
                  <span className="text-[10px] text-gray-400">pts</span>
                </>
              )}
              {pregunta.tipo === 'completar' && (
                <span className="text-[11px] font-semibold text-gray-500">{totalPtsCompletar} pts</span>
              )}
            </div>
          </div>

          <textarea value={pregunta.enunciado || ''} onChange={(e) => onUpdate('enunciado', e.target.value)} rows={2}
            placeholder="Enunciado de la pregunta..."
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all resize-none"
            style={{ WebkitTapHighlightColor: 'transparent', caretColor: COLOR_PRIMARIO }}/>

          {/* ============================================= */}
          {/* OPCION MULTIPLE */}
          {/* ============================================= */}
          {pregunta.tipo === 'opcion_multiple' && (
            <div className="space-y-1.5 pl-2">
              <p className="text-[11px] font-medium text-gray-400 mb-1">Opciones (marque la correcta)</p>
              {['a', 'b', 'c', 'd', 'e'].map((letra, i) => (
                <div key={letra} className="flex items-center gap-2">
                  <input type="radio" name={`c_${pregunta.id}`} checked={pregunta.respuesta_correcta === i} onChange={() => onUpdate('respuesta_correcta', i)} className="w-3.5 h-3.5 flex-shrink-0" style={{ accentColor: COLOR_PRIMARIO }}/>
                  <span className={`text-xs font-bold w-5 flex-shrink-0 ${pregunta.respuesta_correcta === i ? 'text-emerald-600' : 'text-gray-400'}`}>{letra.toUpperCase()})</span>
                  <input type="text" value={pregunta[`opcion_${letra}`] || ''} onChange={(e) => onUpdate(`opcion_${letra}`, e.target.value)} placeholder={`Opcion ${letra.toUpperCase()}`}
                    className={`flex-1 px-3 py-1.5 text-xs border rounded-lg outline-none transition-all ${pregunta.respuesta_correcta === i ? 'border-emerald-300 bg-emerald-50' : 'border-gray-200 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100'}`}
                    style={{ WebkitTapHighlightColor: 'transparent', caretColor: COLOR_PRIMARIO }}/>
                  {pregunta.respuesta_correcta === i && <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0"/>}
                </div>
              ))}
            </div>
          )}

          {/* ============================================= */}
          {/* VERDADERO/FALSO */}
          {/* ============================================= */}
          {pregunta.tipo === 'verdadero_falso' && (
            <div className="pl-2">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] font-medium text-gray-400">Afirmaciones ({(pregunta.afirmaciones || []).length})</p>
                <button onClick={agregarAfirmacion} className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-medium text-white rounded-lg hover:shadow-sm transition-all" style={{ backgroundColor: COLOR_PRIMARIO, WebkitTapHighlightColor: 'transparent' }}><Plus className="w-3 h-3"/> Agregar</button>
              </div>
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="hidden sm:flex items-center gap-2 px-3 py-2 bg-gray-50 text-[10px] font-medium text-gray-400 border-b border-gray-200">
                  <span className="w-6 text-center">#</span><span className="flex-1">Afirmacion</span><span className="w-24 text-center">Verdadero</span><span className="w-24 text-center">Falso</span><span className="w-8"></span>
                </div>
                <div className="divide-y divide-gray-100">
                  {(pregunta.afirmaciones || []).map((af, i) => (
                    <div key={af.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-2 px-3 py-2 hover:bg-gray-50/50 transition-colors">
                      <div className="flex items-center gap-2 w-full sm:w-auto sm:flex-1">
                        <span className="w-6 text-center text-[10px] text-gray-400">{i + 1}</span>
                        <input type="text" value={af.texto || ''} onChange={(e) => actAfirmacion(af.id, 'texto', e.target.value)} placeholder="Afirmacion..."
                          className="flex-1 px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg outline-none focus:border-emerald-400 transition-all"
                          style={{ WebkitTapHighlightColor: 'transparent', caretColor: COLOR_PRIMARIO }}/>
                      </div>
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <button onClick={() => actAfirmacion(af.id, 'esVerdadero', true)}
                          className={`flex-1 sm:flex-initial sm:w-20 py-2 text-[10px] font-bold rounded-lg border transition-all ${af.esVerdadero === true ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm' : 'bg-white text-gray-400 border-gray-200 hover:bg-emerald-50 hover:text-emerald-600'}`}
                          style={{ WebkitTapHighlightColor: 'transparent' }}><CheckCircle2 className="w-3 h-3 inline mr-0.5"/> V</button>
                        <button onClick={() => actAfirmacion(af.id, 'esVerdadero', false)}
                          className={`flex-1 sm:flex-initial sm:w-20 py-2 text-[10px] font-bold rounded-lg border transition-all ${af.esVerdadero === false ? 'bg-red-500 text-white border-red-500 shadow-sm' : 'bg-white text-gray-400 border-gray-200 hover:bg-red-50 hover:text-red-500'}`}
                          style={{ WebkitTapHighlightColor: 'transparent' }}><X className="w-3 h-3 inline mr-0.5"/> F</button>
                        <button onClick={() => delAfirmacion(af.id)} className="p-2 hover:bg-red-50 rounded transition-colors" style={{ WebkitTapHighlightColor: 'transparent' }}><Trash2 className="w-3.5 h-3.5 text-gray-400 hover:text-red-500"/></button>
                      </div>
                    </div>
                  ))}
                  {(pregunta.afirmaciones || []).length === 0 && (
                    <div className="px-4 py-6 text-center"><p className="text-xs text-gray-400">Sin afirmaciones</p></div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ============================================= */}
          {/* RELACIONAR */}
          {/* ============================================= */}
          {pregunta.tipo === 'relacionar' && (
            <div className="pl-2">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] font-medium text-gray-400">Pares ({(pregunta.columna_a || []).filter(x => x?.trim()).length})</p>
                <button onClick={agregarPar} className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-medium text-white rounded-lg hover:shadow-sm transition-all" style={{ backgroundColor: COLOR_PRIMARIO, WebkitTapHighlightColor: 'transparent' }}><Plus className="w-3 h-3"/> Agregar</button>
              </div>
              <p className="text-[10px] text-gray-400 mb-2">La Columna B se muestra aleatoria al alumno.</p>
              <div className="space-y-2">
                {(pregunta.columna_a || []).map((itemA, i) => {
                  const itemB = (pregunta.columna_b || [])[i] || '';
                  const llenos = (pregunta.columna_a || []).filter(x => x?.trim()).length;
                  return (
                    <div key={i} className="flex flex-col sm:flex-row items-start sm:items-center gap-1.5 sm:gap-2 bg-gray-50 sm:bg-transparent rounded-lg p-2 sm:p-0">
                      <div className="flex items-center gap-2 w-full sm:flex-1">
                        <span className="text-[10px] text-gray-400 w-5 flex-shrink-0">{i + 1}.</span>
                        <input type="text" value={itemA} onChange={(e) => actColA(i, e.target.value)} placeholder={`A${i + 1}`}
                          className="flex-1 px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg outline-none focus:border-emerald-400 transition-all bg-white"
                          style={{ WebkitTapHighlightColor: 'transparent', caretColor: COLOR_PRIMARIO }}/>
                      </div>
                      <span className="hidden sm:block text-gray-300 text-xs flex-shrink-0">-</span>
                      <span className="sm:hidden text-[10px] text-gray-400 pl-7">con</span>
                      <div className="flex items-center gap-2 w-full sm:flex-1">
                        <input type="text" value={itemB} onChange={(e) => actColB(i, e.target.value)} placeholder={`B${i + 1}`}
                          className="flex-1 px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg outline-none focus:border-emerald-400 transition-all bg-white"
                          style={{ WebkitTapHighlightColor: 'transparent', caretColor: COLOR_PRIMARIO }}/>
                        <button onClick={() => delPar(i)} disabled={llenos <= 2} 
                          className="p-2 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 flex-shrink-0" 
                          style={{ WebkitTapHighlightColor: 'transparent' }}>
                          <X className="w-3.5 h-3.5 text-gray-400 hover:text-red-500"/>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="text-[10px] text-gray-300 mt-1">Mínimo 2 pares.</p>
            </div>
          )}

          {/* ============================================= */}
          {/* ORDENAMIENTO */}
          {/* ============================================= */}
          {pregunta.tipo === 'ordenamiento' && (
            <div className="pl-2 space-y-1.5">
              <p className="text-[11px] font-medium text-gray-400 mb-1">Elementos en orden correcto (1 = primero)</p>
              {(pregunta.elementos || []).map((elem, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-400 w-5 flex-shrink-0">{i + 1}.</span>
                  <input type="text" value={elem || ''} onChange={(e) => actElem(i, e.target.value)} placeholder={`Elemento ${i + 1}`}
                    className="flex-1 px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg outline-none focus:border-emerald-400 transition-all"
                    style={{ WebkitTapHighlightColor: 'transparent', caretColor: COLOR_PRIMARIO }}/>
                </div>
              ))}
            </div>
          )}

          {/* ============================================= */}
          {/* COMPLETAR */}
          {/* ============================================= */}
          {pregunta.tipo === 'completar' && (
            <div className="pl-2">
              <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                <p className="text-[11px] font-medium text-gray-400">Frases ({(pregunta.frases || []).length}) / {totalEspacios} espacios</p>
                <div className="flex items-center gap-1.5">
                  {(pregunta.frases || []).length > 0 && (
                    <button onClick={() => setMostrarPreview(!mostrarPreview)}
                      className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-gray-500 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-all" style={{ WebkitTapHighlightColor: 'transparent' }}><Eye className="w-3 h-3"/> Preview</button>
                  )}
                  <button onClick={agregarFrase} className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-medium text-white rounded-lg hover:shadow-sm transition-all" style={{ backgroundColor: COLOR_PRIMARIO, WebkitTapHighlightColor: 'transparent' }}><Plus className="w-3 h-3"/> Frase</button>
                </div>
              </div>
              {mostrarPreview && (pregunta.frases || []).length > 0 && (
                <div className="mb-3 p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                  <p className="text-[10px] font-medium text-emerald-600 mb-1.5">Vista previa</p>
                  <div className="space-y-1">
                    {(pregunta.frases || []).map((f, i) => (
                      <div key={f.id} className="text-xs text-gray-700">
                        <span className="text-gray-400 mr-1">{i + 1}.</span>
                        {(f.segmentos || []).map((seg) => (
                          <span key={seg.id}>{seg.tipo === 'texto' ? <span>{seg.texto || '...'}</span> : <span className="inline-block mx-0.5 px-2 py-0.5 bg-white border border-dashed border-emerald-300 rounded text-emerald-500 text-[10px] min-w-[40px] text-center">____</span>}</span>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="space-y-2">
                {(pregunta.frases || []).map((frase, i) => (
                  <div key={frase.id} className="border border-gray-200 rounded-xl p-3 hover:border-gray-300 transition-all">
                    <div className="flex items-center justify-between mb-2 pb-2 border-b border-gray-100 flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-medium text-gray-500">Frase {i + 1}</span>
                        <span className="text-[10px] text-gray-300">{(frase.segmentos || []).filter(s => s.tipo === 'espacio').length} espacios</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-gray-400">Pts:</span>
                          <input type="number" value={frase.puntos || 1} onChange={(e) => actPtsFrase(frase.id, e.target.value)} min={1}
                            className="w-10 px-1 py-0.5 text-[10px] border border-gray-200 rounded text-center font-medium outline-none focus:border-emerald-400 transition-all"/>
                        </div>
                        <button onClick={() => delFrase(frase.id)} className="p-1 hover:bg-red-50 rounded transition-colors" style={{ WebkitTapHighlightColor: 'transparent' }}><Trash2 className="w-3 h-3 text-gray-400 hover:text-red-500"/></button>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                      <button onClick={() => agregarSegmento(frase.id, 'texto')} className="flex items-center gap-1 px-2 py-1 text-[10px] text-gray-600 bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-all" style={{ WebkitTapHighlightColor: 'transparent' }}><Type className="w-3 h-3"/> Texto</button>
                      <button onClick={() => agregarSegmento(frase.id, 'espacio')} className="flex items-center gap-1 px-2 py-1 text-[10px] text-white rounded-md hover:shadow-sm transition-all" style={{ backgroundColor: COLOR_PRIMARIO, WebkitTapHighlightColor: 'transparent' }}><Hash className="w-3 h-3"/> Espacio</button>
                      {(frase.segmentos || []).length > 0 && (
                        <button onClick={() => limpiarFrase(frase.id)} className="ml-auto text-[10px] text-gray-400 hover:text-red-500 transition-colors" style={{ WebkitTapHighlightColor: 'transparent' }}>Limpiar</button>
                      )}
                    </div>
                    <div className="bg-gray-50 rounded-lg p-2.5 min-h-[36px] border border-gray-100">
                      {(frase.segmentos || []).length > 0 ? (
                        <div className="flex flex-wrap items-center gap-1.5">
                          {(frase.segmentos || []).map((seg) => (
                            <span key={seg.id} className="inline-flex items-center group/seg">
                              {seg.tipo === 'texto' ? (
                                <span className="relative bg-white border border-gray-200 rounded-md shadow-sm">
                                  <input type="text" value={seg.texto || ''} onChange={(e) => actSegmento(frase.id, seg.id, 'texto', e.target.value)} placeholder="texto"
                                    className="px-2 py-0.5 text-[11px] bg-transparent outline-none rounded-md min-w-[50px]" style={{ caretColor: COLOR_PRIMARIO }}/>
                                  <button onClick={() => delSegmento(frase.id, seg.id)} className="absolute -top-2 -right-2 w-5 h-5 bg-white border border-gray-200 rounded-full flex items-center justify-center opacity-100 sm:opacity-0 sm:group-hover/seg:opacity-100 shadow-sm hover:bg-red-50 transition-all" style={{ WebkitTapHighlightColor: 'transparent' }}><X className="w-3 h-3 text-gray-400 hover:text-red-500"/></button>
                                </span>
                              ) : (
                                <span className="relative bg-emerald-50 border border-emerald-200 rounded-md px-1.5 py-0.5 flex items-center gap-1 shadow-sm">
                                  <span className="w-3.5 h-3.5 rounded bg-emerald-200 flex items-center justify-center text-[8px] font-bold text-emerald-700">{(frase.segmentos || []).filter(s => s.tipo === 'espacio').findIndex(s => s.id === seg.id) + 1}</span>
                                  <input type="text" value={seg.respuesta || ''} onChange={(e) => actSegmento(frase.id, seg.id, 'respuesta', e.target.value)} placeholder="rpta"
                                    className="w-20 px-1 py-0.5 text-[11px] bg-transparent text-emerald-700 font-medium outline-none" style={{ caretColor: COLOR_PRIMARIO }}/>
                                  <button onClick={() => delSegmento(frase.id, seg.id)} className="absolute -top-2 -right-2 w-5 h-5 bg-white border border-gray-200 rounded-full flex items-center justify-center opacity-100 sm:opacity-0 sm:group-hover/seg:opacity-100 shadow-sm hover:bg-red-50 transition-all" style={{ WebkitTapHighlightColor: 'transparent' }}><X className="w-3 h-3 text-gray-400 hover:text-red-500"/></button>
                                </span>
                              )}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[10px] text-gray-300 text-center py-1">Use Texto y Espacio para construir</p>
                      )}
                    </div>
                  </div>
                ))}
                {(pregunta.frases || []).length === 0 && (
                  <div className="py-6 text-center border-2 border-dashed border-gray-200 rounded-xl">
                    <Type className="w-6 h-6 text-gray-300 mx-auto mb-1.5"/>
                    <p className="text-xs text-gray-400">Sin frases</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ============================================= */}
          {/* RESPUESTA CORTA */}
          {/* ============================================= */}
          {pregunta.tipo === 'respuesta_corta' && (
            <div className="pl-2">
              <p className="text-[11px] font-medium text-gray-400 mb-1.5">Respuesta correcta</p>
              <input type="text" value={pregunta.respuesta_corta || ''} onChange={(e) => onUpdate('respuesta_corta', e.target.value)} placeholder="Escriba la respuesta correcta"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all"
                style={{ WebkitTapHighlightColor: 'transparent', caretColor: COLOR_PRIMARIO }}/>
              <p className="text-[10px] text-gray-400 mt-1.5">Alternativas aceptadas (separadas por coma)</p>
              <input type="text" value={(pregunta.respuestas_alternativas || []).join(', ')} onChange={(e) => onUpdate('respuestas_alternativas', e.target.value.split(',').map(s => s.trim()).filter(Boolean))} placeholder="h2o, H2O, agua"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all mt-1"
                style={{ WebkitTapHighlightColor: 'transparent', caretColor: COLOR_PRIMARIO }}/>
            </div>
          )}

          {/* ============================================= */}
          {/* ENSAYO */}
          {/* ============================================= */}
          {pregunta.tipo === 'ensayo' && (
            <div className="pl-2 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <p className="text-[11px] font-medium text-gray-400 mb-1">Longitud minima (caracteres)</p>
                  <input type="number" value={pregunta.longitud_minima || 100} onChange={(e) => onUpdate('longitud_minima', parseInt(e.target.value) || 100)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all text-center"/>
                </div>
                <div>
                  <p className="text-[11px] font-medium text-gray-400 mb-1">Puntaje maximo</p>
                  <input type="number" value={pregunta.puntos || 10} onChange={(e) => onUpdate('puntos', parseInt(e.target.value) || 10)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all text-center"/>
                </div>
              </div>
              <div>
                <p className="text-[11px] font-medium text-gray-400 mb-1">Rubrica de evaluacion (opcional)</p>
                <textarea value={pregunta.rubrica || ''} onChange={(e) => onUpdate('rubrica', e.target.value)} rows={2} placeholder="Criterios de evaluacion..."
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all resize-none"/>
              </div>
            </div>
          )}

          {/* ============================================= */}
          {/* LIKERT (ENCUESTA) */}
          {/* ============================================= */}
          {pregunta.tipo === 'likert' && (
            <div className="pl-2 space-y-3">
              <div className="bg-teal-50 border border-teal-200 rounded-xl p-3">
                <p className="text-[11px] font-medium text-teal-600 mb-2">Vista previa de la escala Likert</p>
                <div className="space-y-1.5">
                  {['Totalmente en desacuerdo', 'En desacuerdo', 'Neutral', 'De acuerdo', 'Totalmente de acuerdo'].map((label, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded-full border-2 border-teal-300 flex-shrink-0"/>
                      <span className="text-xs text-gray-600">{label}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <p className="text-[11px] font-medium text-gray-400 mb-1">Numero de opciones</p>
                  <select value={pregunta.escala_opciones || 5} onChange={(e) => onUpdate('escala_opciones', parseInt(e.target.value))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:border-emerald-400 transition-all">
                    <option value={3}>3 opciones</option>
                    <option value={5}>5 opciones (estandar)</option>
                    <option value={7}>7 opciones</option>
                  </select>
                </div>
                <div>
                  <p className="text-[11px] font-medium text-gray-400 mb-1">Etiqueta minima</p>
                  <input type="text" value={pregunta.escala_min_label || 'Totalmente en desacuerdo'} onChange={(e) => onUpdate('escala_min_label', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:border-emerald-400 transition-all"/>
                </div>
                <div>
                  <p className="text-[11px] font-medium text-gray-400 mb-1">Etiqueta maxima</p>
                  <input type="text" value={pregunta.escala_max_label || 'Totalmente de acuerdo'} onChange={(e) => onUpdate('escala_max_label', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:border-emerald-400 transition-all"/>
                </div>
              </div>
              <p className="text-[10px] text-teal-500 flex items-center gap-1">
                <BarChart3 className="w-3 h-3"/> Pregunta de encuesta: no se califica automaticamente
              </p>
            </div>
          )}

          {/* ============================================= */}
          {/* ESTRELLAS (ENCUESTA) */}
          {/* ============================================= */}
          {pregunta.tipo === 'estrellas' && (
            <div className="pl-2 space-y-3">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                <p className="text-[11px] font-medium text-amber-600 mb-2">Vista previa</p>
                <div className="flex items-center gap-1">
                  {[1,2,3,4,5].map(n => (
                    <Star key={n} className="w-6 h-6 text-amber-300 fill-amber-300"/>
                  ))}
                  <span className="text-xs text-gray-500 ml-2">(1-5 estrellas)</span>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <p className="text-[11px] font-medium text-gray-400 mb-1">Numero maximo de estrellas</p>
                  <select value={pregunta.escala_max || 5} onChange={(e) => onUpdate('escala_max', parseInt(e.target.value))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:border-emerald-400 transition-all">
                    <option value={3}>3 estrellas</option>
                    <option value={5}>5 estrellas</option>
                    <option value={7}>7 estrellas</option>
                    <option value={10}>10 estrellas</option>
                  </select>
                </div>
                <div>
                  <p className="text-[11px] font-medium text-gray-400 mb-1">Etiqueta izquierda</p>
                  <input type="text" value={pregunta.escala_min_label || 'Muy malo'} onChange={(e) => onUpdate('escala_min_label', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:border-emerald-400 transition-all"/>
                </div>
                <div>
                  <p className="text-[11px] font-medium text-gray-400 mb-1">Etiqueta derecha</p>
                  <input type="text" value={pregunta.escala_max_label || 'Excelente'} onChange={(e) => onUpdate('escala_max_label', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:border-emerald-400 transition-all"/>
                </div>
              </div>
              <p className="text-[10px] text-amber-500 flex items-center gap-1">
                <Star className="w-3 h-3"/> Pregunta de encuesta: no se califica automaticamente
              </p>
            </div>
          )}

          {/* ============================================= */}
          {/* ESCALA NUMERICA (ENCUESTA) */}
          {/* ============================================= */}
          {pregunta.tipo === 'escala_numerica' && (
            <div className="pl-2 space-y-3">
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-3">
                <p className="text-[11px] font-medium text-purple-600 mb-2">Vista previa de la escala</p>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-500">{pregunta.escala_min || 1}</span>
                  <input type="range" min={pregunta.escala_min || 1} max={pregunta.escala_max || 10} defaultValue={Math.round(((pregunta.escala_min || 1) + (pregunta.escala_max || 10)) / 2)} className="flex-1" disabled/>
                  <span className="text-xs text-gray-500">{pregunta.escala_max || 10}</span>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <p className="text-[11px] font-medium text-gray-400 mb-1">Valor minimo</p>
                  <input type="number" value={pregunta.escala_min || 1} onChange={(e) => onUpdate('escala_min', parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:border-emerald-400 transition-all text-center"/>
                </div>
                <div>
                  <p className="text-[11px] font-medium text-gray-400 mb-1">Valor maximo</p>
                  <input type="number" value={pregunta.escala_max || 10} onChange={(e) => onUpdate('escala_max', parseInt(e.target.value) || 10)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:border-emerald-400 transition-all text-center"/>
                </div>
                <div>
                  <p className="text-[11px] font-medium text-gray-400 mb-1">Paso</p>
                  <input type="number" value={pregunta.escala_paso || 1} onChange={(e) => onUpdate('escala_paso', parseInt(e.target.value) || 1)} min={1}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:border-emerald-400 transition-all text-center"/>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <p className="text-[11px] font-medium text-gray-400 mb-1">Etiqueta minima</p>
                  <input type="text" value={pregunta.escala_min_label || 'Nada'} onChange={(e) => onUpdate('escala_min_label', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:border-emerald-400 transition-all"/>
                </div>
                <div>
                  <p className="text-[11px] font-medium text-gray-400 mb-1">Etiqueta maxima</p>
                  <input type="text" value={pregunta.escala_max_label || 'Mucho'} onChange={(e) => onUpdate('escala_max_label', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:border-emerald-400 transition-all"/>
                </div>
              </div>
              <p className="text-[10px] text-purple-500 flex items-center gap-1">
                <Hash className="w-3 h-3"/> Pregunta de encuesta: no se califica automaticamente
              </p>
            </div>
          )}
        </div>

        {/* ============================================= */}
        {/* BARRA LATERAL CON FAB - INSERTAR DESPUES CORREGIDO */}
        {/* ============================================= */}
        <div className="flex sm:flex-col items-center gap-1 p-2 sm:p-2 sm:pt-4 sm:pr-3 border-t sm:border-t-0 sm:border-l border-gray-100 flex-shrink-0 flex-row sm:flex-col justify-end">
          
          {/* Botón + con dropdown - INSERTAR DESPUÉS */}
          <div className="relative" ref={menuRef}>
            <button 
              onClick={() => setMenuAbierto(!menuAbierto)}
              className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all duration-200"
              style={{ WebkitTapHighlightColor: 'transparent' }}>
              <Plus className="w-4 h-4"/>
            </button>
            
            {menuAbierto && (
              <div className="absolute bottom-full right-0 mb-1 z-[99999] animate-in">
                <div className="bg-white rounded-xl shadow-2xl border border-gray-100 py-1.5 w-48">
                  <p className="px-3 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Insertar después</p>
                  {TIPOS_PREGUNTA_CONFIG.map((tipo) => {
                    const Icon = ICONOS_POR_TIPO[tipo.id] || ListChecks;
                    const color = COLORES_TIPO[tipo.id] || COLOR_PRIMARIO;
                    return (
                      <button key={tipo.id} type="button" 
                        onClick={() => { 
                          // ✅ CORREGIDO: pasar el tipo y la posición (índice + 1)
                          if (onAgregarPregunta) {
                            onAgregarPregunta(tipo.id, index + 1);
                          }
                          setMenuAbierto(false); 
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all duration-150 text-left"
                        style={{ WebkitTapHighlightColor: 'transparent' }}>
                        <Icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color }}/>
                        <span>{tipo.nombre}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {onDuplicate && (
            <button onClick={onDuplicate} className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all duration-200" style={{ WebkitTapHighlightColor: 'transparent' }} title="Duplicar">
              <Copy className="w-4 h-4"/>
            </button>
          )}
          <button onClick={onDelete} className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all duration-200" style={{ WebkitTapHighlightColor: 'transparent' }} title="Eliminar">
            <Trash2 className="w-4 h-4"/>
          </button>
        </div>
      </div>
    </div>
  );
};

export default PreguntaItem;