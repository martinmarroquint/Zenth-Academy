// front/src/services/bibliotecaService.js
// BIBLIOTECA INDEPENDIENTE: recursos (artículos, libros, videos, enlaces) y tareas
import api from './api';

const bibliotecaService = {
  // ✅ Abierta para cualquier usuario autenticado (no depende de cursos)
  listar: async (filtros = {}) => {
    try {
      return await api.get('/biblioteca', filtros);
    } catch (error) {
      console.error('Error listando la biblioteca:', error);
      throw error;
    }
  },

  obtener: async (id) => api.get(`/biblioteca/${id}`),
  temas: async () => api.get('/biblioteca/temas'),

  // ✅ Publicar / gestionar (docentes y admin)
  crear: async (data) => api.post('/biblioteca', data),
  actualizar: async (id, data) => api.put(`/biblioteca/${id}`, data),
  eliminar: async (id) => api.delete(`/biblioteca/${id}`),

  // ✅ Interacciones del alumno
  alternarFavorito: async (id) => api.post(`/biblioteca/${id}/favorito`),
  alternarCompletado: async (id, comentario = null) =>
    api.post(`/biblioteca/${id}/completar`, { comentario }),
  listarCompletados: async (id) => api.get(`/biblioteca/${id}/completados`),

  // ✅ Link público del recurso (sin login)
  obtenerPublico: async (token) => api.get(`/biblioteca/publico/${token}`),
};

export default bibliotecaService;
