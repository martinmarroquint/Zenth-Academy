// front/src/services/cuponesService.js
// MÓDULO DE CUPONES Y PROMOCIONES
import api from './api';

const cuponesService = {
  // Admin
  listar: async (filtros = {}) => api.get('/cupones', filtros),
  crear: async (data) => api.post('/cupones', data),
  actualizar: async (id, data) => api.put(`/cupones/${id}`, data),
  desactivar: async (id) => api.delete(`/cupones/${id}`),
  usos: async (id) => api.get(`/cupones/${id}/usos`),

  // Alumno: valida el cupón contra un curso (sin consumirlo)
  validar: async (codigo, cursoId) =>
    api.post('/cupones/validar', { codigo, curso_id: cursoId }),
};

export default cuponesService;
