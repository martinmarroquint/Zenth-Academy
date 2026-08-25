// front/src/services/solicitudesDocenteService.js
// SERVICE PARA SOLICITUDES DE DOCENTE

import api from '../config/api.config';

const solicitudesDocenteService = {
  // =============================================
  // ESTUDIANTE: Crear solicitud
  // =============================================
  crear: async (data) => {
    try {
      return await api.post('/solicitudes-docente', data);
    } catch (error) {
      console.error('Error creando solicitud:', error);
      throw error;
    }
  },

  // =============================================
  // ESTUDIANTE: Ver mis solicitudes
  // =============================================
  misSolicitudes: async () => {
    try {
      return await api.get('/solicitudes-docente/mis-solicitudes');
    } catch (error) {
      console.error('Error obteniendo mis solicitudes:', error);
      throw error;
    }
  },

  // =============================================
  // ESTUDIANTE: Cancelar solicitud
  // =============================================
  cancelar: async (solicitudId) => {
    try {
      return await api.delete(`/solicitudes-docente/${solicitudId}`);
    } catch (error) {
      console.error('Error cancelando solicitud:', error);
      throw error;
    }
  },

  // =============================================
  // ADMIN: Listar todas las solicitudes
  // =============================================
  listar: async (filtros = {}) => {
    try {
      const params = {};
      if (filtros.estado) params.estado = filtros.estado;
      if (filtros.limit) params.limit = filtros.limit;
      if (filtros.offset) params.offset = filtros.offset;
      
      return await api.get('/solicitudes-docente', params);
    } catch (error) {
      console.error('Error listando solicitudes:', error);
      throw error;
    }
  },

  // =============================================
  // ADMIN: Contar pendientes
  // =============================================
  contarPendientes: async () => {
    try {
      return await api.get('/solicitudes-docente/pendientes/count');
    } catch (error) {
      console.error('Error contando pendientes:', error);
      throw error;
    }
  },

  // =============================================
  // ADMIN: Obtener solicitud por ID
  // =============================================
  obtener: async (solicitudId) => {
    try {
      return await api.get(`/solicitudes-docente/${solicitudId}`);
    } catch (error) {
      console.error('Error obteniendo solicitud:', error);
      throw error;
    }
  },

  // =============================================
  // ADMIN: Marcar en revisión
  // =============================================
  marcarEnRevision: async (solicitudId) => {
    try {
      return await api.post(`/solicitudes-docente/${solicitudId}/en-revision`);
    } catch (error) {
      console.error('Error marcando en revisión:', error);
      throw error;
    }
  },

  // =============================================
  // ADMIN: Aprobar solicitud
  // =============================================
  aprobar: async (solicitudId, comentario = '') => {
    try {
      return await api.post(`/solicitudes-docente/${solicitudId}/aprobar`, {
        comentario_admin: comentario
      });
    } catch (error) {
      console.error('Error aprobando solicitud:', error);
      throw error;
    }
  },

  // =============================================
  // ADMIN: Rechazar solicitud
  // =============================================
  rechazar: async (solicitudId, comentario = '') => {
    try {
      return await api.post(`/solicitudes-docente/${solicitudId}/rechazar`, {
        comentario_admin: comentario
      });
    } catch (error) {
      console.error('Error rechazando solicitud:', error);
      throw error;
    }
  },
};

export default solicitudesDocenteService;
