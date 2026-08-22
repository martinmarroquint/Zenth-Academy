// src/components/examenes/CreadorExamen.jsx
// VERSION CORREGIDA - PRESERVA IDs Y VALIDACION COMPLETA
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  ArrowLeft, Save, Plus, Copy, AlertTriangle,
  ListChecks, ToggleLeft, ArrowLeftRight, ArrowUpDown,
  PenLine, Type, AlignLeft, Shuffle, Eye, Shield, Monitor,
  RotateCcw, CheckCircle2, ChevronDown, Lock,
  Clock, Target, Hash, Calendar, Menu
} from 'lucide-react';
import { COLOR_PRIMARIO, TIPOS_PREGUNTA_CONFIG, CONFIGURACION_EXAMEN_DEFAULT, validarExamen } from './constantes';
import PreguntaItem from './PreguntaItem';

const ICONOS_POR_TIPO = {
  opcion_multiple: ListChecks, verdadero_falso: ToggleLeft,
  relacionar: ArrowLeftRight, ordenamiento: ArrowUpDown,
  completar: PenLine, respuesta_corta: Type, ensayo: AlignLeft
};

const COLORES_TIPO = {
  opcion_multiple: '#188C5D', verdadero_falso: '#2563EB',
  relacionar: '#7C3AED', ordenamiento: '#F59E0B',
  completar: '#DC2626', respuesta_corta: '#0891B2', ensayo: '#4F46E5'
};

// =============================================
// SELECT PERSONALIZADO
// =============================================
const SelectPersonalizado = ({ value, options, onChange, icon: Icon, className = '' }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selected = options.find(o => o.value === value);

  return (
    <div ref={ref} className="relative" style={{ zIndex: open ? 99999 : 1 }}>
      <button type="button" onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
          open ? 'border-gray-300 bg-gray-50 text-gray-700' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
        } ${className}`}
        style={{ WebkitTapHighlightColor: 'transparent' }}>
        {Icon && <Icon className="w-3.5 h-3.5 text-gray-400 flex-shrink-0"/>}
        <span className="truncate hidden sm:inline">{selected?.label || 'Seleccionar'}</span>
        <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}/>
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[160px] z-[99999]">
          {options.map(opt => (
            <button key={opt.value} type="button" onClick={() => { onChange(opt.value); setOpen(false); }}
              className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                opt.value === value ? 'bg-gray-50 text-gray-900 font-medium' : 'text-gray-600 hover:bg-gray-50'
              }`}
              style={{ WebkitTapHighlightColor: 'transparent' }}>
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// =============================================
// SELECTOR DE FECHA
// =============================================
const DateRangePicker = ({ inicio, fin, onInicio, onFin }) => {
  const [open, setOpen] = useState(false);
  const [vista, setVista] = useState('inicio');
  const [tempInicio, setTempInicio] = useState(inicio || '');
  const [tempFin, setTempFin] = useState(fin || '');
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const tieneFechas = inicio || fin;
  const formatDisplay = (fecha) => {
    if (!fecha) return '';
    return new Date(fecha).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' });
  };

  return (
    <div ref={ref} className="relative" style={{ zIndex: open ? 99999 : 1 }}>
      <button type="button" onClick={() => { setOpen(!open); setVista('inicio'); setTempInicio(inicio||''); setTempFin(fin||''); }}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
          tieneFechas ? 'border-gray-300 bg-gray-50 text-gray-700' : 'border-gray-200 bg-white text-gray-400 hover:border-gray-300 hover:bg-gray-50'
        }`}
        style={{ WebkitTapHighlightColor: 'transparent' }}>
        <Calendar className="w-3.5 h-3.5 flex-shrink-0"/>
        {tieneFechas ? <span className="hidden sm:inline text-[11px]">{formatDisplay(inicio)} - {formatDisplay(fin)}</span> : <span className="hidden sm:inline text-[11px]">Fechas</span>}
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 p-4 w-72 z-[99999]">
          <div className="flex bg-gray-100 rounded-lg p-0.5 mb-3">
            <button type="button" onClick={() => setVista('inicio')} className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${vista === 'inicio' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'}`}>Inicio</button>
            <button type="button" onClick={() => setVista('fin')} className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${vista === 'fin' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'}`}>Cierre</button>
          </div>
          <input type="datetime-local" value={vista === 'inicio' ? tempInicio : tempFin} onChange={(e) => vista === 'inicio' ? setTempInicio(e.target.value) : setTempFin(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-gray-300 focus:ring-0 transition-colors"/>
          <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
            <button type="button" onClick={() => { onInicio(null); onFin(null); setOpen(false); }} className="flex-1 py-2 text-xs font-medium text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50">Limpiar</button>
            <button type="button" onClick={() => { onInicio(tempInicio || null); onFin(tempFin || null); setOpen(false); }} className="flex-1 py-2 text-xs font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800">Aplicar</button>
          </div>
        </div>
      )}
    </div>
  );
};

// =============================================
// FUNCIÓN PARA NORMALIZAR PREGUNTAS
// =============================================
const normalizarPregunta = (pregunta, index) => {
  const base = {
    // ✅ PRESERVAR ID EXISTENTE
    id: pregunta.id || (Date.now().toString() + index),
    tipo: pregunta.tipo || 'opcion_multiple',
    enunciado: pregunta.enunciado || '',
    puntos: pregunta.puntos || 1,
    orden: pregunta.orden ?? index,
    opcion_a: pregunta.opcion_a || '', opcion_b: pregunta.opcion_b || '',
    opcion_c: pregunta.opcion_c || '', opcion_d: pregunta.opcion_d || '',
    opcion_e: pregunta.opcion_e || '', respuesta_correcta: pregunta.respuesta_correcta ?? 0,
    afirmaciones: Array.isArray(pregunta.afirmaciones) && pregunta.afirmaciones.length > 0 
      ? pregunta.afirmaciones.map(a => ({ id: a.id || 'vf' + Math.random(), texto: a.texto || '', esVerdadero: a.esVerdadero ?? false })) 
      : [{ id: 'vf1', texto: '', esVerdadero: true }, { id: 'vf2', texto: '', esVerdadero: false }],
    columna_a: Array.isArray(pregunta.columna_a) && pregunta.columna_a.length > 0 ? pregunta.columna_a : ['', ''],
    columna_b: Array.isArray(pregunta.columna_b) && pregunta.columna_b.length > 0 ? pregunta.columna_b : ['', ''],
    elementos: Array.isArray(pregunta.elementos) && pregunta.elementos.length > 0 ? pregunta.elementos : ['', '', '', ''],
    frases: Array.isArray(pregunta.frases) && pregunta.frases.length > 0 
      ? pregunta.frases.map(f => ({
          id: f.id || 'fr' + Math.random(), puntos: f.puntos || 1,
          segmentos: Array.isArray(f.segmentos) && f.segmentos.length > 0 
            ? f.segmentos.map(s => ({ id: s.id || 'sg' + Math.random(), tipo: s.tipo || 'texto', texto: s.texto || '', respuesta: s.respuesta || '', puntos: s.puntos || 1 })) 
            : [{ id: 's1', tipo: 'texto', texto: '', puntos: 1 }, { id: 's2', tipo: 'espacio', respuesta: '', puntos: 1 }]
        })) 
      : [{ id: 'fr1', puntos: 1, segmentos: [{ id: 's1', tipo: 'texto', texto: '', puntos: 1 }, { id: 's2', tipo: 'espacio', respuesta: '', puntos: 1 }] }],
    respuesta_corta: pregunta.respuesta_corta || '',
    respuestas_alternativas: Array.isArray(pregunta.respuestas_alternativas) ? pregunta.respuestas_alternativas : [],
    longitud_minima: pregunta.longitud_minima || 100,
    rubrica: pregunta.rubrica || ''
  };
  return base;
};

// =============================================
// COMPONENTE PRINCIPAL
// =============================================
const CreadorExamen = ({ examen: examenInicial = null, onVolver, onGuardar, grupoId = null }) => {
  
  const [datos, setDatos] = useState({
    titulo: examenInicial?.titulo || '',
    descripcion: examenInicial?.descripcion || '',
    tiempo_limite: examenInicial?.tiempo_limite || 60,
    puntaje_aprobacion: examenInicial?.puntaje_aprobacion || 60,
    intentos_permitidos: examenInicial?.intentos_permitidos || 2,
    configuracion: { ...CONFIGURACION_EXAMEN_DEFAULT, ...(examenInicial?.configuracion || {}) }
  });

  const [preguntas, setPreguntas] = useState(() => {
    if (examenInicial?.preguntas && Array.isArray(examenInicial.preguntas)) {
      return examenInicial.preguntas.map((p, i) => normalizarPregunta(p, i));
    }
    return [];
  });
  
  const [errores, setErrores] = useState({});
  const [mostrarSeguridad, setMostrarSeguridad] = useState(false);
  const [mostrarConfiguracion, setMostrarConfiguracion] = useState(false);
  const [fabAbierto, setFabAbierto] = useState(null);
  
  const puntosTotales = preguntas.reduce((s, p) => s + (p.puntos || 1), 0);

  const toggle = (campo) => setDatos(prev => ({ ...prev, configuracion: { ...prev.configuracion, [campo]: !prev.configuracion[campo] } }));
  const updateConfig = (campo, valor) => setDatos(prev => ({ ...prev, configuracion: { ...prev.configuracion, [campo]: valor } }));
  const on = (campo) => datos.configuracion[campo] === true;

  const handleFabClick = useCallback((id) => {
    setFabAbierto(prev => prev === id ? null : id);
  }, []);

  const handleUpdatePregunta = (id, campo, valor) => {
    setPreguntas(prev => prev.map(p => {
      if (p.id !== id) return p;
      if (campo === null && typeof valor === 'object' && !Array.isArray(valor)) return { ...p, ...valor };
      return { ...p, [campo]: valor };
    }));
  };

  const handleDeletePregunta = (id) => setPreguntas(prev => prev.filter(p => p.id !== id));

  const handleDuplicatePregunta = (id) => {
    const p = preguntas.find(x => x.id === id); 
    if (!p) return;
    const idx = preguntas.findIndex(x => x.id === id);
    const nuevas = [...preguntas];
    nuevas.splice(idx + 1, 0, {
      ...p, id: Date.now().toString() + '_dup', orden: preguntas.length,
      afirmaciones: (p.afirmaciones || []).map(a => ({ ...a, id: 'vf' + Math.random() })),
      frases: (p.frases || []).map(f => ({ ...f, id: 'fr' + Math.random(), segmentos: (f.segmentos || []).map(s => ({ ...s, id: 'sg' + Math.random() })) }))
    });
    setPreguntas(nuevas);
  };

  // ✅ CORREGIDO: agregarPregunta con posición
  const agregarPregunta = (tipo = 'opcion_multiple', posicion = null) => {
    const nueva = {
      id: Date.now().toString() + '_' + Math.random().toString(36).substr(2, 6),
      tipo, enunciado: '', puntos: 1, orden: preguntas.length,
      opcion_a: '', opcion_b: '', opcion_c: '', opcion_d: '', opcion_e: '', respuesta_correcta: 0,
      afirmaciones: [{ id: 'vf1', texto: '', esVerdadero: true }, { id: 'vf2', texto: '', esVerdadero: false }],
      columna_a: ['', ''], columna_b: ['', ''], elementos: ['', '', '', ''],
      frases: [{ id: 'fr1', puntos: 1, segmentos: [{ id: 's1', tipo: 'texto', texto: '', puntos: 1 }, { id: 's2', tipo: 'espacio', respuesta: '', puntos: 1 }] }],
      respuesta_corta: '', respuestas_alternativas: [], longitud_minima: 100, rubrica: ''
    };
    
    const nuevasPreguntas = [...preguntas];
    if (posicion !== null && posicion >= 0 && posicion <= preguntas.length) {
      nuevasPreguntas.splice(posicion, 0, { ...nueva, orden: posicion });
    } else {
      nuevasPreguntas.push({ ...nueva, orden: preguntas.length });
    }
    
    setPreguntas(nuevasPreguntas);
    setFabAbierto(null);
  };

  // ✅ VALIDACION COMPLETA
  const validar = () => {
    const err = {};
    if (!datos.titulo.trim()) err.titulo = 'Titulo requerido';
    if (preguntas.length === 0) err.preguntas = 'Agregue al menos una pregunta';
    
    // Validar cada pregunta
    preguntas.forEach((p, idx) => {
      if (!p.enunciado || !p.enunciado.trim()) {
        err[`pregunta_${idx}`] = `Pregunta ${idx + 1}: enunciado requerido`;
      }
      if (p.tipo === 'opcion_multiple') {
        const opciones = ['a','b','c','d','e'].map(l => p[`opcion_${l}`] || '').filter(t => t.trim());
        if (opciones.length < 2) {
          err[`pregunta_${idx}`] = `Pregunta ${idx + 1}: debe tener al menos 2 opciones`;
        }
        if (p.respuesta_correcta === undefined || p.respuesta_correcta === null) {
          err[`pregunta_${idx}`] = `Pregunta ${idx + 1}: debe seleccionar una respuesta correcta`;
        }
      }
    });
    
    setErrores(err); 
    return Object.keys(err).length === 0;
  };

  // ✅ PRESERVAR IDs AL GUARDAR
  const handleGuardar = () => {
    if (!validar()) return;
    onGuardar({
      ...datos,
      grupoId,
      preguntas: preguntas.map(p => {
        // Preservar id y todos los campos
        const { ...resto } = p;
        return resto;
      })
    });
  };

  const chips = [
    { campo: 'aleatorizarPreguntas', icon: Shuffle, label: 'Aleatorizar preguntas' },
    { campo: 'aleatorizarOpciones', icon: Shuffle, label: 'Aleatorizar opciones' },
    { campo: 'mostrarUnaSolaPregunta', icon: Eye, label: 'Una pregunta a la vez' },
    { campo: 'mostrar_resultados', icon: CheckCircle2, label: 'Mostrar resultados' },
    { campo: 'mostrar_respuestas', icon: Eye, label: 'Mostrar respuestas' },
    { campo: 'detectar_copy_paste', icon: Copy, label: 'Detectar copia' },
    { campo: 'detectar_tab_change', icon: Monitor, label: 'Detectar cambio de pestana' },
    { campo: 'mostrar_mejor_nota', icon: RotateCcw, label: 'Mostrar mejor nota' },
  ];

  const MenuTiposPregunta = ({ onSelect }) => (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-1 flex gap-0.5">
      {TIPOS_PREGUNTA_CONFIG.map((tipo) => {
        const Icon = ICONOS_POR_TIPO[tipo.id] || ListChecks;
        const color = COLORES_TIPO[tipo.id] || '#059669';
        return (
          <button key={tipo.id} type="button" onClick={() => onSelect(tipo.id)}
            className="group relative w-9 h-9 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors"
            style={{ WebkitTapHighlightColor: 'transparent' }}>
            <Icon className="w-4 h-4 transition-transform group-hover:scale-110" style={{ color }}/>
            <div className="absolute -top-9 left-1/2 -translate-x-1/2 px-2.5 py-1.5 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-[99999]">
              <p className="text-[11px] font-semibold text-gray-700">{tipo.nombre}</p>
            </div>
          </button>
        );
      })}
    </div>
  );

  const opcionesIntentos = [
    { value: 1, label: '1 intento' }, { value: 2, label: '2 intentos' },
    { value: 3, label: '3 intentos' }, { value: 5, label: '5 intentos' },
    { value: 10, label: '10 intentos' }, { value: 999, label: 'Ilimitados' },
  ];
  
  const opcionesAccionViolaciones = [
    { value: 'anular', label: 'Anular examen' }, { value: 'cerrar', label: 'Cerrar y enviar' }, { value: 'advertir', label: 'Solo advertir' },
  ];

  return (
    <div className="min-h-screen bg-[#fbfbfa] pb-20 sm:pb-6">
      
      <header className="sticky top-0 z-30 bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <button onClick={onVolver} className="p-2 hover:bg-gray-100 rounded-lg flex-shrink-0 transition-colors" style={{ WebkitTapHighlightColor: 'transparent' }}>
              <ArrowLeft className="w-4 h-4 text-gray-500"/>
            </button>
            <h1 className="text-sm font-semibold text-gray-900 truncate">
              {examenInicial ? 'Editar Examen' : 'Nuevo Examen'}
            </h1>
          </div>
          <button onClick={handleGuardar} className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-2 flex-shrink-0" style={{ WebkitTapHighlightColor: 'transparent' }}>
            <Save className="w-4 h-4"/> Guardar
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-6 space-y-6">

        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-6 pt-5 pb-3">
            <input type="text" value={datos.titulo} onChange={e => setDatos(p => ({ ...p, titulo: e.target.value }))}
              className={`w-full text-lg font-semibold text-gray-900 bg-transparent border-0 border-b-2 pb-2 transition-colors placeholder:text-gray-300 ${errores.titulo ? 'border-red-300' : 'border-gray-100 focus:border-gray-300'}`}
              style={{ outline: 'none', WebkitTapHighlightColor: 'transparent' }} placeholder="Titulo del examen *"/>
            {errores.titulo && <p className="text-xs text-red-500 mt-1">{errores.titulo}</p>}
          </div>
          <div className="px-6 pb-3">
            <textarea value={datos.descripcion} onChange={e => setDatos(p => ({ ...p, descripcion: e.target.value }))} rows={1}
              className="w-full text-sm text-gray-500 bg-transparent border-0 border-b-2 pb-2 resize-none transition-colors border-gray-100 focus:border-gray-300 placeholder:text-gray-300"
              style={{ outline: 'none', WebkitTapHighlightColor: 'transparent' }} placeholder="Descripcion opcional..."/>
          </div>

          <div className="px-6 py-2.5 bg-gray-50/50 border-t border-gray-100">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-gray-400"/>
                <input type="number" value={datos.tiempo_limite} onChange={e => setDatos(p => ({ ...p, tiempo_limite: parseInt(e.target.value) || 60 }))} min={1} max={480} className="w-14 text-xs font-medium text-gray-700 bg-transparent border-0 rounded px-1 py-0.5 text-center" style={{ outline: 'none' }}/>
                <span className="text-[10px] text-gray-400">min</span>
              </div>
              <div className="flex items-center gap-1">
                <Target className="w-3.5 h-3.5 text-gray-400"/>
                <input type="number" value={datos.puntaje_aprobacion} onChange={e => setDatos(p => ({ ...p, puntaje_aprobacion: parseInt(e.target.value) || 60 }))} min={0} max={100} className="w-14 text-xs font-medium text-gray-700 bg-transparent border-0 rounded px-1 py-0.5 text-center" style={{ outline: 'none' }}/>
                <span className="text-[10px] text-gray-400">%</span>
              </div>
              <SelectPersonalizado value={datos.intentos_permitidos} options={opcionesIntentos} onChange={(v) => setDatos(p => ({ ...p, intentos_permitidos: v }))} icon={Hash}/>
              <span className="text-xs font-medium text-gray-400">{puntosTotales} pts</span>
              <DateRangePicker inicio={datos.configuracion.fecha_inicio} fin={datos.configuracion.fecha_fin} onInicio={(v) => updateConfig('fecha_inicio', v)} onFin={(v) => updateConfig('fecha_fin', v)}/>
            </div>
          </div>

          <div className="px-6 py-2 border-t border-gray-100">
            <div className="flex items-center gap-1 overflow-x-auto">
              <span className="text-[10px] font-medium text-gray-400 mr-1 hidden sm:inline flex-shrink-0">Config:</span>
              {chips.map(({ campo, icon: Icon }) => (
                <button key={campo} onClick={() => toggle(campo)} className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors flex-shrink-0 ${on(campo) ? 'bg-gray-900 text-white' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'}`} style={{ WebkitTapHighlightColor: 'transparent' }}>
                  <Icon className="w-4 h-4"/>
                </button>
              ))}
            </div>
          </div>

          <div className="px-6 py-2 border-t border-gray-100">
            <button onClick={() => setMostrarSeguridad(!mostrarSeguridad)} className="flex items-center gap-2 text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors" style={{ WebkitTapHighlightColor: 'transparent' }}>
              <Shield className="w-3 h-3"/> Seguridad y restricciones <ChevronDown className={`w-3 h-3 transition-transform ${mostrarSeguridad ? 'rotate-180' : ''}`}/>
            </button>
            {mostrarSeguridad && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-3 pb-3">
                <div><label className="block text-[10px] font-medium text-gray-400 mb-1">Limite violaciones</label><input type="number" value={datos.configuracion.limite_violaciones || 3} onChange={e => updateConfig('limite_violaciones', parseInt(e.target.value) || 3)} min={1} max={10} className="w-full px-2.5 py-2 text-xs border border-gray-200 rounded-lg text-center outline-none focus:border-gray-300 transition-colors"/></div>
                <div><label className="block text-[10px] font-medium text-gray-400 mb-1">Al exceder</label><SelectPersonalizado value={datos.configuracion.accion_violaciones || 'anular'} options={opcionesAccionViolaciones} onChange={(v) => updateConfig('accion_violaciones', v)} className="w-full"/></div>
                <div><label className="block text-[10px] font-medium text-gray-400 mb-1">Pregs por examen</label><input type="number" value={datos.configuracion.preguntasPorExamen || 0} onChange={e => updateConfig('preguntasPorExamen', parseInt(e.target.value) || 0)} min={0} max={preguntas.length || 50} className="w-full px-2.5 py-2 text-xs border border-gray-200 rounded-lg text-center outline-none focus:border-gray-300 transition-colors"/></div>
                <div><label className="block text-[10px] font-medium text-gray-400 mb-1"><Lock className="w-3 h-3 inline mr-1"/>Contrasena</label><input type="text" value={datos.configuracion.password_examen || ''} onChange={e => updateConfig('password_examen', e.target.value || null)} className="w-full px-2.5 py-2 text-xs border border-gray-200 rounded-lg outline-none focus:border-gray-300 transition-colors" placeholder="Opcional"/></div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-3">
          {errores.preguntas && (
            <div className="flex items-center gap-2 text-red-500 bg-red-50 border border-red-200 px-3 py-2 rounded-lg text-xs">
              <AlertTriangle className="w-4 h-4 flex-shrink-0"/><span>{errores.preguntas}</span>
            </div>
          )}
          
          {preguntas.map((pregunta, index) => (
            <PreguntaItem
              key={pregunta.id}
              pregunta={pregunta}
              index={index}
              onUpdate={(campo, valor) => handleUpdatePregunta(pregunta.id, campo, valor)}
              onDelete={() => handleDeletePregunta(pregunta.id)}
              onDuplicate={() => handleDuplicatePregunta(pregunta.id)}
              colorTipo={COLORES_TIPO[pregunta.tipo] || '#059669'}
              nombreTipo={TIPOS_PREGUNTA_CONFIG.find(t => t.id === pregunta.tipo)?.nombre || pregunta.tipo}
              onAgregarPregunta={(tipo, posicion) => agregarPregunta(tipo, posicion)}
            />
          ))}

          <div className="flex justify-center py-2">
            <div className="relative" style={{ zIndex: fabAbierto === 'nuevo' ? 99999 : 10 }}>
              <button onClick={() => handleFabClick('nuevo')} 
                className="w-10 h-10 rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-400 hover:border-gray-300 hover:text-gray-600 transition-colors" 
                style={{ WebkitTapHighlightColor: 'transparent' }}>
                <Plus className="w-5 h-5"/>
              </button>
              {fabAbierto === 'nuevo' && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2" style={{ zIndex: 99999 }}>
                  <MenuTiposPregunta onSelect={(tipo) => agregarPregunta(tipo, preguntas.length)}/>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {preguntas.length > 0 && (
          <div className="text-center text-xs text-gray-400 pb-4">
            {preguntas.length} pregunta{preguntas.length !== 1 ? 's' : ''} | {puntosTotales} punto{puntosTotales !== 1 ? 's' : ''} total{puntosTotales !== 1 ? 'es' : ''}
          </div>
        )}
      </div>

      <style>{`
        * { -webkit-tap-highlight-color: transparent; }
        *:focus { outline: none !important; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
};

export default CreadorExamen;