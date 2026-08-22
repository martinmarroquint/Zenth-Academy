// front/src/services/cuestionariosService.js
// VERSION COMPLETA - USANDO apiClient PARA AUTENTICACIÓN

import apiClient from './api';

class CuestionariosService {
  constructor() {
    // Usamos apiClient para todas las peticiones
    // apiClient ya maneja el token automáticamente
  }

  // =============================================
  // MÉTODO BASE DE PETICIÓN (usa apiClient)
  // =============================================
  async request(endpoint, options = {}) {
    try {
      // apiClient.request maneja headers, token, timeout, etc.
      return await apiClient.request(endpoint, options);
    } catch (error) {
      console.error(`Error en petición a ${endpoint}:`, error);
      throw error;
    }
  }

  // =============================================
  // CUESTIONARIOS
  // =============================================
  
  listar(filtros = {}) {
    const params = new URLSearchParams();
    if (filtros.tipo) params.append('tipo', filtros.tipo);
    if (filtros.estado) params.append('estado', filtros.estado);
    if (filtros.empresa_id) params.append('empresa_id', filtros.empresa_id);
    const queryString = params.toString();
    return this.request(`/cuestionarios/${queryString ? '?' + queryString : ''}`);
  }

  obtener(id) {
    return this.request(`/cuestionarios/${id}`);
  }

  crear(data) {
    return this.request('/cuestionarios/', { 
      method: 'POST', 
      body: JSON.stringify(data) 
    });
  }

  actualizar(id, data) {
    return this.request(`/cuestionarios/${id}`, { 
      method: 'PUT', 
      body: JSON.stringify(data) 
    });
  }

  eliminar(id) {
    return this.request(`/cuestionarios/${id}`, { 
      method: 'DELETE' 
    });
  }

  // =============================================
  // RESPUESTAS
  // =============================================
  
  responder(cuestionarioId, data) {
    return this.request(`/cuestionarios/${cuestionarioId}/responder`, { 
      method: 'POST', 
      body: JSON.stringify(data) 
    });
  }

  obtenerRespuestas(cuestionarioId) {
    return this.request(`/cuestionarios/${cuestionarioId}/respuestas`);
  }

  // =============================================
  // ANÁLISIS
  // =============================================
  
  obtenerAnalisis(cuestionarioId, filtros = {}) {
    return this.request(`/cuestionarios/${cuestionarioId}/analisis`, {
      method: 'POST',
      body: JSON.stringify(filtros)
    });
  }

  exportarResultados(cuestionarioId, formato = 'csv') {
    return this.request(`/cuestionarios/${cuestionarioId}/exportar?formato=${formato}`);
  }
}

const cuestionariosService = new CuestionariosService();
export default cuestionariosService;