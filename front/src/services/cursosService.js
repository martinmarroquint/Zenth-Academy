// front/src/services/cursosService.js
// COMPLETO - CON SISTEMA DE PAGOS, SOLICITUDES, BLOQUEOS Y PROGRESO
// CORREGIDO: aprobarSolicitud y rechazarSolicitud envían estado + comentario

import api from './api';

const cursosService = {
  // =============================================
  // CRUD DE CURSOS
  // =============================================

  listar: async (filtros = {}) => {
    try {
      return await api.get('/cursos', filtros);
    } catch (error) {
      console.error('Error listando cursos:', error);
      throw error;
    }
  },

  obtener: async (id) => {
    try {
      return await api.get(`/cursos/${id}`);
    } catch (error) {
      console.error('Error obteniendo curso:', error);
      throw error;
    }
  },

  crear: async (data) => {
    try {
      return await api.post('/cursos', data);
    } catch (error) {
      console.error('Error creando curso:', error);
      throw error;
    }
  },

  actualizar: async (id, data) => {
    try {
      return await api.put(`/cursos/${id}`, data);
    } catch (error) {
      console.error('Error actualizando curso:', error);
      throw error;
    }
  },

  eliminar: async (id) => {
    try {
      return await api.delete(`/cursos/${id}`);
    } catch (error) {
      console.error('Error eliminando curso:', error);
      throw error;
    }
  },

  publicar: async (id) => {
    try {
      return await api.post(`/cursos/${id}/publicar`);
    } catch (error) {
      console.error('Error publicando curso:', error);
      throw error;
    }
  },

  // =============================================
  // INSCRIPCIÓN Y PROGRESO
  // =============================================

  inscribirme: async (cursoId) => {
    try {
      return await api.post(`/cursos/${cursoId}/inscribirse`);
    } catch (error) {
      console.error('Error inscribiendose al curso:', error);
      throw error;
    }
  },

  desinscribirme: async (cursoId) => {
    try {
      return await api.delete(`/cursos/${cursoId}/inscripcion`);
    } catch (error) {
      console.error('Error desinscribiendose del curso:', error);
      throw error;
    }
  },

  misCursos: async () => {
    try {
      return await api.get('/cursos/mis-cursos');
    } catch (error) {
      console.error('Error obteniendo mis cursos:', error);
      throw error;
    }
  },

  obtenerProgreso: async (cursoId, usuarioId) => {
    try {
      return await api.get(`/cursos/${cursoId}/progreso/${usuarioId}`);
    } catch (error) {
      console.error('Error obteniendo progreso:', error);
      throw error;
    }
  },

  obtenerProgresoDetallado: async (cursoId, estudianteId = null) => {
    try {
      const params = estudianteId ? { estudiante_id: estudianteId } : {};
      return await api.get(`/cursos/${cursoId}/progreso-detallado`, params);
    } catch (error) {
      console.error('Error obteniendo progreso detallado:', error);
      throw error;
    }
  },

  completarLeccion: async (cursoId, leccionId, usuarioId, tiempoInvertido = 0) => {
    try {
      return await api.post(`/cursos/${cursoId}/lecciones/${leccionId}/completar`, {
        usuario_id: usuarioId,
        tiempo_invertido: tiempoInvertido
      });
    } catch (error) {
      console.error('Error completando leccion:', error);
      throw error;
    }
  },

  obtenerLeccion: async (cursoId, leccionId) => {
    try {
      const curso = await cursosService.obtener(cursoId);
      if (!curso?.modulos) return null;
      for (const modulo of curso.modulos) {
        const leccion = modulo.lecciones?.find(l => l.id === leccionId);
        if (leccion) return { ...leccion, moduloId: modulo.id };
      }
      return null;
    } catch (error) {
      console.error('Error obteniendo leccion:', error);
      throw error;
    }
  },

  // =============================================
  // SOLICITUDES DE ACCESO (ESTUDIANTE)
  // =============================================

  solicitarAcceso: async (cursoId, data) => {
    try {
      return await api.post(`/cursos/${cursoId}/solicitar-acceso`, data);
    } catch (error) {
      console.error('Error solicitando acceso:', error);
      throw error;
    }
  },

  misSolicitudes: async () => {
    try {
      return await api.get('/cursos/mis-solicitudes');
    } catch (error) {
      console.error('Error obteniendo mis solicitudes:', error);
      throw error;
    }
  },

  // =============================================
  // SOLICITUDES DE ACCESO (DOCENTE)
  // =============================================

  solicitudesPendientes: async (cursoId = null) => {
    try {
      const params = cursoId ? { curso_id: cursoId } : {};
      return await api.get('/cursos/solicitudes-pendientes', params);
    } catch (error) {
      console.error('Error obteniendo solicitudes pendientes:', error);
      throw error;
    }
  },

  // ✅ CORREGIDO: Envía estado + comentario
  aprobarSolicitud: async (solicitudId, comentario = '') => {
    try {
      return await api.post(`/cursos/solicitudes/${solicitudId}/aprobar`, {
        estado: 'aprobado',
        comentario_docente: comentario || 'Acceso aprobado'
      });
    } catch (error) {
      console.error('Error aprobando solicitud:', error);
      throw error;
    }
  },

  // ✅ CORREGIDO: Envía estado + comentario
  rechazarSolicitud: async (solicitudId, comentario = '') => {
    try {
      return await api.post(`/cursos/solicitudes/${solicitudId}/rechazar`, {
        estado: 'rechazado',
        comentario_docente: comentario || 'Acceso denegado'
      });
    } catch (error) {
      console.error('Error rechazando solicitud:', error);
      throw error;
    }
  },

  // =============================================
  // ACCESOS (DOCENTE)
  // =============================================

  listarAccesos: async (cursoId) => {
    try {
      return await api.get(`/cursos/${cursoId}/accesos`);
    } catch (error) {
      console.error('Error listando accesos:', error);
      throw error;
    }
  },

  // Docente: lista de estudiantes del curso con progreso (vista unificada)
  listarEstudiantes: async (cursoId) => {
    try {
      return await api.get(`/cursos/${cursoId}/estudiantes`);
    } catch (error) {
      console.error('Error listando estudiantes del curso:', error);
      throw error;
    }
  },

  activarAccesoDirecto: async (cursoId, estudianteId, data = {}) => {
    try {
      return await api.post(`/cursos/${cursoId}/acceso`, {
        estudiante_id: estudianteId,
        ...data
      });
    } catch (error) {
      console.error('Error activando acceso directo:', error);
      throw error;
    }
  },

  desactivarAcceso: async (cursoId, estudianteId) => {
    try {
      return await api.delete(`/cursos/${cursoId}/acceso/${estudianteId}`);
    } catch (error) {
      console.error('Error desactivando acceso:', error);
      throw error;
    }
  },

  // Docente: desinscribe a un estudiante (elimina inscripción + acceso + progreso)
  desinscribirEstudiante: async (cursoId, estudianteId) => {
    try {
      return await api.delete(`/cursos/${cursoId}/inscripcion/${estudianteId}`);
    } catch (error) {
      console.error('Error desinscribiendo estudiante:', error);
      throw error;
    }
  },

  // Docente: asigna nota manual a una lección de un estudiante
  asignarNota: async (cursoId, estudianteId, leccionId, data = {}) => {
    try {
      return await api.put(`/cursos/${cursoId}/calificaciones/${estudianteId}/${leccionId}`, data);
    } catch (error) {
      console.error('Error asignando nota:', error);
      throw error;
    }
  },

  // Docente: exporta los estudiantes del curso a CSV
  exportarEstudiantes: async (cursoId, nombreArchivo = 'estudiantes.csv') => {
    try {
      const blob = await api.download(`/cursos/${cursoId}/estudiantes/exportar`);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = nombreArchivo;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exportando estudiantes:', error);
      throw error;
    }
  },

  verificarAcceso: async (cursoId, estudianteId) => {
    try {
      return await api.get(`/cursos/${cursoId}/tiene-acceso/${estudianteId}`);
    } catch (error) {
      console.error('Error verificando acceso:', error);
      throw error;
    }
  },

  // =============================================
  // BLOQUEO Y EVALUACIONES
  // =============================================

  verificarBloqueoLeccion: async (cursoId, leccionId) => {
    try {
      return await api.get(`/cursos/${cursoId}/leccion/${leccionId}/estado-bloqueo`);
    } catch (error) {
      console.error('Error verificando bloqueo:', error);
      throw error;
    }
  },

  actualizarProgresoLeccion: async (cursoId, leccionId, data) => {
    try {
      return await api.post(`/cursos/${cursoId}/lecciones/${leccionId}/progreso`, data);
    } catch (error) {
      console.error('Error actualizando progreso de leccion:', error);
      throw error;
    }
  },

  configurarEvaluacion: async (cursoId, leccionId, data) => {
    try {
      return await api.post(`/cursos/${cursoId}/lecciones/${leccionId}/evaluacion`, data);
    } catch (error) {
      console.error('Error configurando evaluacion:', error);
      throw error;
    }
  },

  obtenerEvaluacion: async (cursoId, leccionId) => {
    try {
      return await api.get(`/cursos/${cursoId}/lecciones/${leccionId}/evaluacion`);
    } catch (error) {
      console.error('Error obteniendo evaluacion:', error);
      throw error;
    }
  },

  eliminarEvaluacion: async (cursoId, leccionId) => {
    try {
      return await api.delete(`/cursos/${cursoId}/lecciones/${leccionId}/evaluacion`);
    } catch (error) {
      console.error('Error eliminando evaluacion:', error);
      throw error;
    }
  },

  liberarLeccion: async (cursoId, leccionId, estudianteId = null) => {
    try {
      const body = estudianteId ? { estudiante_id: estudianteId } : {};
      return await api.post(`/cursos/${cursoId}/lecciones/${leccionId}/liberar`, body);
    } catch (error) {
      console.error('Error liberando leccion:', error);
      throw error;
    }
  }
};

export default cursosService;