// src/components/examenes/constantes.js
// VERSION COMPLETA - ACTUALIZADA CON TODOS LOS TIPOS DE PREGUNTAS
import {
  ListChecks, ToggleLeft, ArrowLeftRight, ArrowUpDown,
  PenLine, Type, AlignLeft, CheckCircle2, XCircle,
  Clock, Shield, Eye, RotateCcw, Lock, Calendar,
  Settings, Award, AlertTriangle, BarChart3, Star, Hash
} from 'lucide-react';

export const COLOR_PRIMARIO = '#188C5D';
export const COLOR_PRIMARIO_CLARO = '#D1FAE5';
export const COLOR_PRIMARIO_OSCURO = '#065F46';
export const COLOR_ERROR = '#DC2626';
export const COLOR_ADVERTENCIA = '#F59E0B';
export const COLOR_INFO = '#2563EB';
export const COLOR_NEUTRO = '#6B7280';

// Tipos de preguntas como constantes
export const TIPOS_PREGUNTA = {
  OPCION_MULTIPLE: 'opcion_multiple',
  VERDADERO_FALSO: 'verdadero_falso',
  RESPUESTA_CORTA: 'respuesta_corta',
  ENSAYO: 'ensayo',
  RELACIONAR: 'relacionar',
  ORDENAMIENTO: 'ordenamiento',
  COMPLETAR: 'completar',
  LIKERT: 'likert',
  ESTRELLAS: 'estrellas',
  ESCALA_NUMERICA: 'escala_numerica'
};

// Configuracion de tipos de preguntas
export const TIPOS_PREGUNTA_CONFIG = [
  {
    id: TIPOS_PREGUNTA.OPCION_MULTIPLE,
    nombre: 'Opcion Multiple',
    icon: ListChecks,
    descripcion: 'Una respuesta correcta entre varias opciones',
    color: '#188C5D',
    bgColor: 'bg-emerald-100',
    textColor: 'text-emerald-700',
    requiereOpciones: true,
    opcionesMinimas: 2,
    opcionesMaximas: 6
  },
  {
    id: TIPOS_PREGUNTA.VERDADERO_FALSO,
    nombre: 'Verdadero / Falso',
    icon: ToggleLeft,
    descripcion: 'Tabla de afirmaciones para marcar V o F',
    color: '#2563EB',
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-700',
    requiereOpciones: false,
    usaAfirmaciones: true
  },
  {
    id: TIPOS_PREGUNTA.RELACIONAR,
    nombre: 'Relacionar Columnas',
    icon: ArrowLeftRight,
    descripcion: 'Emparejar elementos de dos columnas',
    color: '#7C3AED',
    bgColor: 'bg-purple-100',
    textColor: 'text-purple-700',
    requiereOpciones: false,
    usaColumnas: true
  },
  {
    id: TIPOS_PREGUNTA.ORDENAMIENTO,
    nombre: 'Ordenamiento',
    icon: ArrowUpDown,
    descripcion: 'Ordenar elementos en secuencia correcta',
    color: '#F59E0B',
    bgColor: 'bg-amber-100',
    textColor: 'text-amber-700',
    requiereOpciones: false,
    usaElementos: true
  },
  {
    id: TIPOS_PREGUNTA.COMPLETAR,
    nombre: 'Completar Espacios',
    icon: PenLine,
    descripcion: 'Llenar palabras faltantes en un texto',
    color: '#DC2626',
    bgColor: 'bg-red-100',
    textColor: 'text-red-700',
    requiereOpciones: false,
    usaTextoConEspacios: true
  },
  {
    id: TIPOS_PREGUNTA.RESPUESTA_CORTA,
    nombre: 'Respuesta Corta',
    icon: Type,
    descripcion: 'Respuesta de texto breve',
    color: '#0891B2',
    bgColor: 'bg-cyan-100',
    textColor: 'text-cyan-700',
    requiereOpciones: false,
    requiereTexto: true
  },
  {
    id: TIPOS_PREGUNTA.ENSAYO,
    nombre: 'Ensayo / Desarrollo',
    icon: AlignLeft,
    descripcion: 'Respuesta de texto extensa',
    color: '#4F46E5',
    bgColor: 'bg-indigo-100',
    textColor: 'text-indigo-700',
    requiereOpciones: false,
    requiereTexto: true,
    textoExtenso: true
  },
  {
    id: TIPOS_PREGUNTA.LIKERT,
    nombre: 'Likert (Encuesta)',
    icon: BarChart3,
    descripcion: 'Escala de acuerdo/entendimiento (sin calificacion)',
    color: '#0D9488',
    bgColor: 'bg-teal-100',
    textColor: 'text-teal-700',
    requiereOpciones: false,
    esEncuesta: true
  },
  {
    id: TIPOS_PREGUNTA.ESTRELLAS,
    nombre: 'Calificacion con Estrellas',
    icon: Star,
    descripcion: 'Del 1 al 5 estrellas (sin calificacion)',
    color: '#D97706',
    bgColor: 'bg-amber-100',
    textColor: 'text-amber-700',
    requiereOpciones: false,
    esEncuesta: true
  },
  {
    id: TIPOS_PREGUNTA.ESCALA_NUMERICA,
    nombre: 'Escala Numerica',
    icon: Hash,
    descripcion: 'Rango numerico personalizado (sin calificacion)',
    color: '#7C3AED',
    bgColor: 'bg-purple-100',
    textColor: 'text-purple-700',
    requiereOpciones: false,
    esEncuesta: true
  }
];

// Estados del examen
export const ESTADOS_EXAMEN = {
  BORRADOR: 'BORRADOR',
  PUBLICADO: 'PUBLICADO',
  CERRADO: 'CERRADO'
};

export const ESTADOS_EXAMEN_CONFIG = [
  { id: ESTADOS_EXAMEN.BORRADOR, nombre: 'Borrador', color: '#6B7280', descripcion: 'Examen en edicion, no visible para alumnos' },
  { id: ESTADOS_EXAMEN.PUBLICADO, nombre: 'Publicado', color: '#188C5D', descripcion: 'Examen disponible para rendir' },
  { id: ESTADOS_EXAMEN.CERRADO, nombre: 'Cerrado', color: '#DC2626', descripcion: 'Examen cerrado, solo consulta' }
];

export const ESTADOS_SESION = {
  PENDIENTE: 'PENDIENTE',
  EN_CURSO: 'EN_CURSO',
  COMPLETADO: 'COMPLETADO',
  ABANDONO: 'ABANDONO',
  TRAMPA: 'TRAMPA',
  EXPIRADO: 'EXPIRADO'
};

// Seguridad
export const MAX_VIOLACIONES = 3;
export const TIEMPO_GRACIA_SEGURIDAD = 30;

export const EVENTOS_SEGURIDAD = {
  CAMBIO_PESTANA: 'CAMBIO_PESTANA',
  PERDIDA_FOCO: 'PERDIDA_FOCO',
  INTENTO_COPIA: 'INTENTO_COPIA',
  PANTALLA_COMPLETA: 'PANTALLA_COMPLETA',
  TECLA_PROHIBIDA: 'TECLA_PROHIBIDA',
  RECONEXION: 'RECONEXION',
  DISPOSITIVO_MOVIL: 'DISPOSITIVO_MOVIL'
};

// Configuracion por defecto
export const CONFIGURACION_EXAMEN_DEFAULT = {
  aleatorizar_preguntas: false,
  aleatorizar_opciones: false,
  preguntas_por_examen: 0,
  mostrar_una_sola_pregunta: false,
  mostrar_resultados_inmediatos: true,
  permitir_navegacion_libre: true,
  limite_violaciones: 3,
  puntaje_aprobacion: 60,
  puntos_por_pregunta: 1,
  mostrar_progreso: true,
  modo_estricto: true,
  intentos_permitidos: 2,
  mostrar_mejor_nota: true,
  accion_violaciones: 'anular',
  detectar_tab_change: true,
  detectar_copy_paste: true,
  mostrar_resultados: true,
  mostrar_respuestas: false,
  navegacion_libre: true,
  fecha_inicio: null,
  fecha_fin: null,
  password_examen: null,
  acceso_publico: false,
  anonimo: false
};

// Grados academicos reconocidos para parseo (opcional)
export const GRADOS_RECONOCIDOS = [
  'INICIAL', 'PRIMARIA', 'SECUNDARIA', 'PREPARATORIA', 'BACHILLERATO',
  '1RO', '2DO', '3RO', '4TO', '5TO', '6TO', '1ERO', '1ER',
  '1°', '2°', '3°', '4°', '5°', '6°'
];

// Funciones utilitarias
export const generarCodigoExamen = () => {
  const ahora = new Date();
  const anio = ahora.getFullYear();
  const mes = String(ahora.getMonth() + 1).padStart(2, '0');
  const dia = String(ahora.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 9999) + 1;
  return `EXA-${anio}${mes}${dia}-${String(random).padStart(4, '0')}`;
};

export const getColorEstadoExamen = (estado) => {
  const colores = {
    BORRADOR: 'bg-gray-100 text-gray-700',
    PUBLICADO: 'bg-green-100 text-green-700',
    CERRADO: 'bg-red-100 text-red-700'
  };
  return colores[estado] || 'bg-gray-100 text-gray-700';
};

export const getColorCalificacion = (nota) => {
  if (nota >= 80) return 'text-green-600';
  if (nota >= 60) return 'text-emerald-600';
  if (nota >= 40) return 'text-amber-600';
  return 'text-red-600';
};

export const formatearTiempo = (segundos) => {
  if (!segundos || segundos < 0) return '0m 0s';
  const horas = Math.floor(segundos / 3600);
  const minutos = Math.floor((segundos % 3600) / 60);
  const segs = segundos % 60;
  if (horas > 0) return `${horas}h ${minutos}m ${segs}s`;
  return `${minutos}m ${segs}s`;
};

export const formatearFecha = (fecha) => {
  if (!fecha) return '';
  return new Date(fecha).toLocaleString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const calcularTotalPuntos = (preguntas) => {
  if (!preguntas || !preguntas.length) return 0;
  return preguntas.reduce((sum, p) => {
    // Tipos de encuesta no suman puntos (sin calificacion)
    if ([TIPOS_PREGUNTA.LIKERT, TIPOS_PREGUNTA.ESTRELLAS, TIPOS_PREGUNTA.ESCALA_NUMERICA].includes(p.tipo)) {
      return sum;
    }
    if (p.tipo === TIPOS_PREGUNTA.VERDADERO_FALSO) {
      return sum + ((p.afirmaciones?.length || 0) * (p.puntos || 1));
    }
    if (p.tipo === TIPOS_PREGUNTA.COMPLETAR) {
      const totalEspacios = (p.frases || []).reduce((s, f) =>
        s + (f.segmentos || []).filter(seg => seg.tipo === 'espacio').length, 0
      );
      return sum + (totalEspacios * (p.puntos || 1));
    }
    if (p.tipo === TIPOS_PREGUNTA.RELACIONAR) {
      return sum + ((p.columna_a?.filter(x => x?.trim()).length || 0) * (p.puntos || 1));
    }
    if (p.tipo === TIPOS_PREGUNTA.ORDENAMIENTO) {
      return sum + ((p.elementos?.filter(x => x?.trim()).length || 0) * (p.puntos || 1));
    }
    return sum + (p.puntos || 1);
  }, 0);
};

export const validarPregunta = (pregunta, index) => {
  const num = index + 1;
  if (!pregunta.enunciado || !pregunta.enunciado.trim()) {
    return `La pregunta ${num} no tiene enunciado`;
  }
  switch (pregunta.tipo) {
    case TIPOS_PREGUNTA.OPCION_MULTIPLE:
      if (!pregunta.opcion_a?.trim() || !pregunta.opcion_b?.trim()) {
        return `La pregunta ${num} debe tener al menos las opciones A y B`;
      }
      break;
    case TIPOS_PREGUNTA.VERDADERO_FALSO:
      if (!pregunta.afirmaciones || pregunta.afirmaciones.length === 0) {
        return `La pregunta ${num} debe tener al menos una afirmacion`;
      }
      break;
    case TIPOS_PREGUNTA.RELACIONAR:
      const colA = (pregunta.columna_a || []).filter(x => x?.trim());
      const colB = (pregunta.columna_b || []).filter(x => x?.trim());
      if (colA.length < 2 || colB.length < 2) {
        return `La pregunta ${num} debe tener al menos 2 elementos en cada columna`;
      }
      break;
    case TIPOS_PREGUNTA.ORDENAMIENTO:
      if (((pregunta.elementos || []).filter(x => x?.trim())).length < 2) {
        return `La pregunta ${num} debe tener al menos 2 elementos para ordenar`;
      }
      break;
    case TIPOS_PREGUNTA.COMPLETAR:
      if (!pregunta.frases || pregunta.frases.length === 0) {
        return `La pregunta ${num} no tiene frases con espacios`;
      }
      const tieneEspacios = pregunta.frases.some(f =>
        (f.segmentos || []).some(s => s.tipo === 'espacio')
      );
      if (!tieneEspacios) {
        return `La pregunta ${num} debe contener al menos un espacio para completar`;
      }
      break;
    case TIPOS_PREGUNTA.RESPUESTA_CORTA:
      if (!pregunta.respuesta_corta?.trim()) {
        return `La pregunta ${num} no tiene respuesta correcta definida`;
      }
      break;
    case TIPOS_PREGUNTA.LIKERT:
    case TIPOS_PREGUNTA.ESTRELLAS:
    case TIPOS_PREGUNTA.ESCALA_NUMERICA:
      // Tipos de encuesta: solo requieren enunciado
      break;
  }
  return null;
};

export const validarExamen = (datos) => {
  if (!datos.titulo || !datos.titulo.trim()) {
    return 'El titulo del examen es obligatorio';
  }
  if (!datos.preguntas || datos.preguntas.length === 0) {
    return 'Debe agregar al menos una pregunta';
  }
  for (let i = 0; i < datos.preguntas.length; i++) {
    const error = validarPregunta(datos.preguntas[i], i);
    if (error) return error;
  }
  return null;
};

export const ICONOS = {
  CheckCircle: CheckCircle2,
  XCircle: XCircle,
  Clock: Clock,
  Shield: Shield,
  Eye: Eye,
  RotateCcw: RotateCcw,
  Lock: Lock,
  Calendar: Calendar,
  Settings: Settings,
  Award: Award,
  AlertTriangle: AlertTriangle
};