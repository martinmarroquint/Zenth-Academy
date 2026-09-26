// front/src/services/adminService.js
// Analítica global del panel de administración (solo admin)
import api from './api';

const adminService = {
  estadisticas: async () => {
    try {
      return await api.get('/admin/estadisticas');
    } catch (error) {
      console.error('Error cargando la analítica global:', error);
      throw error;
    }
  },

  cursos: async () => {
    try {
      return await api.get('/admin/cursos');
    } catch (error) {
      console.error('Error cargando los cursos del panel:', error);
      throw error;
    }
  },
};

export default adminService;
