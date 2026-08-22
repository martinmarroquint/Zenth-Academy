// front/src/services/foroService.js
import api from './api';

const foroService = {
  // Listar publicaciones
  listar: async (filtros = {}) => {
    try {
      return await api.get('/foro', filtros);
    } catch (error) {
      console.error('Error listando publicaciones:', error);
      throw error;
    }
  },

  // Obtener publicación por ID
  obtener: async (id) => {
    try {
      return await api.get(`/foro/${id}`);
    } catch (error) {
      console.error('Error obteniendo publicación:', error);
      throw error;
    }
  },

  // Crear publicación
  crear: async (data) => {
    try {
      return await api.post('/foro', data);
    } catch (error) {
      console.error('Error creando publicación:', error);
      throw error;
    }
  },

  // Actualizar publicación
  actualizar: async (id, data) => {
    try {
      return await api.put(`/foro/${id}`, data);
    } catch (error) {
      console.error('Error actualizando publicación:', error);
      throw error;
    }
  },

  // Eliminar publicación
  eliminar: async (id) => {
    try {
      return await api.delete(`/foro/${id}`);
    } catch (error) {
      console.error('Error eliminando publicación:', error);
      throw error;
    }
  },

  // Agregar comentario
  comentar: async (publicacionId, data) => {
    try {
      return await api.post(`/foro/${publicacionId}/comentarios`, data);
    } catch (error) {
      console.error('Error agregando comentario:', error);
      throw error;
    }
  },

  // Dar like
  like: async (publicacionId) => {
    try {
      return await api.post(`/foro/${publicacionId}/like`);
    } catch (error) {
      console.error('Error dando like:', error);
      throw error;
    }
  }
};

export default foroService;