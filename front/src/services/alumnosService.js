// front/src/services/alumnosService.js
// SERVICIO UNIFICADO DE ALUMNOS

import api from './api';

const alumnosService = {
  // =============================================
  // CRUD BÁSICO
  // =============================================
  
  listar: async (filtros = {}) => {
    try {
      return await api.get('/alumnos', filtros);
    } catch (error) {
      console.error('Error listando alumnos:', error);
      throw error;
    }
  },

  obtener: async (id) => {
    try {
      return await api.get(`/alumnos/${id}`);
    } catch (error) {
      console.error('Error obteniendo alumno:', error);
      throw error;
    }
  },

  crear: async (data) => {
    try {
      return await api.post('/alumnos', data);
    } catch (error) {
      console.error('Error creando alumno:', error);
      throw error;
    }
  },

  actualizar: async (id, data) => {
    try {
      return await api.put(`/alumnos/${id}`, data);
    } catch (error) {
      console.error('Error actualizando alumno:', error);
      throw error;
    }
  },

  eliminar: async (id) => {
    try {
      return await api.delete(`/alumnos/${id}`);
    } catch (error) {
      console.error('Error eliminando alumno:', error);
      throw error;
    }
  },

  // =============================================
  // OPERACIONES MASIVAS
  // =============================================
  
  guardarMasivo: async (data) => {
    try {
      return await api.post('/alumnos/masivo', data);
    } catch (error) {
      console.error('Error guardando alumnos masivo:', error);
      throw error;
    }
  },

  eliminarMasivo: async (ids) => {
    try {
      return await api.post('/alumnos/eliminar-masivo', { ids });
    } catch (error) {
      console.error('Error eliminando alumnos masivo:', error);
      throw error;
    }
  },

  // =============================================
  // POR CONTEXTO
  // =============================================
  
  obtenerPorGrupo: async (grupoId) => {
    try {
      return await api.get(`/alumnos/grupo/${grupoId}`);
    } catch (error) {
      console.error('Error obteniendo alumnos por grupo:', error);
      throw error;
    }
  },

  obtenerPorCurso: async (cursoId) => {
    try {
      return await api.get(`/alumnos/curso/${cursoId}`);
    } catch (error) {
      console.error('Error obteniendo alumnos por curso:', error);
      throw error;
    }
  },

  buscar: async (query) => {
    try {
      return await api.get(`/alumnos/buscar?q=${encodeURIComponent(query)}`);
    } catch (error) {
      console.error('Error buscando alumnos:', error);
      throw error;
    }
  },
};

export default alumnosService;