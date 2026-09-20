// front/src/components/cursos/leccionUtils.jsx
// Funciones de utilidad compartidas para lecciones (usadas por DetalleCurso y LeccionItem)

import { Video, FileText, BookOpen, Award, Link as LinkIcon } from 'lucide-react';

export const getBloquesDeLeccion = (leccion) => {
  if (leccion.bloques && Array.isArray(leccion.bloques)) {
    return leccion.bloques;
  }
  return [];
};

export const getLeccionesDeModulo = (modulo) => {
  if (modulo.lecciones && Array.isArray(modulo.lecciones)) {
    return modulo.lecciones;
  }
  return [];
};

export const getTipoLeccion = (leccion) => {
  // ✅ CORREGIDO: Primero verificar tipo directo en la lección (para examenes/cuestionarios asignados)
  if (leccion.tipo && leccion.tipo !== 'bloque') {
    return leccion.tipo;
  }
  const bloques = getBloquesDeLeccion(leccion);
  if (bloques.length > 0) {
    return bloques[0].tipo || 'texto';
  }
  return 'texto';
};

export const getTipoIcon = (tipo) => {
  switch(tipo) {
    case 'video': return <Video className="w-4 h-4" />;
    case 'texto': return <FileText className="w-4 h-4" />;
    case 'quiz': return <BookOpen className="w-4 h-4" />;
    case 'examen': return <Award className="w-4 h-4" />;
    case 'recurso': return <LinkIcon className="w-4 h-4" />;
    default: return <FileText className="w-4 h-4" />;
  }
};

export const getTipoLabel = (tipo) => {
  const labels = {
    video: 'Video',
    texto: 'Texto',
    quiz: 'Cuestionario',
    examen: 'Examen',
    recurso: 'Recurso'
  };
  return labels[tipo] || tipo;
};
