// front/src/services/certificadosService.js
import api from './api';

const certificadosService = {
  // Listar certificados
  listar: async (filtros = {}) => {
    try {
      return await api.get('/certificados', filtros);
    } catch (error) {
      console.error('Error listando certificados:', error);
      throw error;
    }
  },

  // Obtener certificado por ID
  obtener: async (id) => {
    try {
      return await api.get(`/certificados/${id}`);
    } catch (error) {
      console.error('Error obteniendo certificado:', error);
      throw error;
    }
  },

  // Crear certificado
  crear: async (data) => {
    try {
      return await api.post('/certificados', data);
    } catch (error) {
      console.error('Error creando certificado:', error);
      throw error;
    }
  },

  // Actualizar certificado
  actualizar: async (id, data) => {
    try {
      return await api.put(`/certificados/${id}`, data);
    } catch (error) {
      console.error('Error actualizando certificado:', error);
      throw error;
    }
  },

  // Cancelar certificado
  cancelar: async (id) => {
    try {
      return await api.delete(`/certificados/${id}`);
    } catch (error) {
      console.error('Error cancelando certificado:', error);
      throw error;
    }
  }
};

export default certificadosService;