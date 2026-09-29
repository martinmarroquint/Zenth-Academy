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

  // Ficha trazable del alumno: identidad + cursos + exámenes + certificados.
  // Acepta el id del catálogo (Alumno.id) o el de la cuenta (Usuario.id).
  ficha: async (id) => {
    try {
      return await api.get(`/alumnos/${id}/ficha`);
    } catch (error) {
      console.error('Error obteniendo la ficha del alumno:', error);
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

};

export default alumnosService;