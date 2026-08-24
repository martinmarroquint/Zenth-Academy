// front/src/services/pizarraService.js
// SERVICIO DE PIZARRA INTERACTIVA - CORREGIDO

import apiClient from './api';

class PizarraService {
  constructor() {
    this.baseUrl = '/pizarra';
  }

  // =============================================
  // MÉTODO BASE (usa apiClient con token)
  // =============================================
  async request(endpoint, options = {}) {
    try {
      // ✅ apiClient ya maneja el token automáticamente
      return await apiClient.request(`${this.baseUrl}${endpoint}`, options);
    } catch (error) {
      console.error(`Error en petición a ${endpoint}:`, error);
      throw error;
    }
  }

  // =============================================
  // PIZARRAS
  // =============================================
  
  listar(filtros = {}) {
    const params = new URLSearchParams();
    if (filtros.creado_por) params.append('creado_por', filtros.creado_por);
    if (filtros.tipo) params.append('tipo', filtros.tipo);
    if (filtros.estado) params.append('estado', filtros.estado);
    if (filtros.grupo_id) params.append('grupo_id', filtros.grupo_id);
    const queryString = params.toString();
    return this.request(`/${queryString ? '?' + queryString : ''}`);
  }

  obtener(id) {
    return this.request(`/${id}`);
  }

  crear(data) {
    return this.request('/', { 
      method: 'POST', 
      body: JSON.stringify(data) 
    });
  }

  actualizar(id, data) {
    return this.request(`/${id}`, { 
      method: 'PUT', 
      body: JSON.stringify(data) 
    });
  }

  eliminar(id) {
    return this.request(`/${id}`, { 
      method: 'DELETE' 
    });
  }

  // =============================================
  // ELEMENTOS
  // =============================================
  
  obtenerElementos(id) {
    return this.request(`/${id}/elementos`);
  }

  actualizarElementos(id, elementos) {
    return this.request(`/${id}/elementos`, {
      method: 'POST',
      body: JSON.stringify({ elementos })
    });
  }

  // =============================================
  // SESIONES
  // =============================================
  
  iniciarSesion(pizarraId, data) {
    return this.request(`/${pizarraId}/sesion`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  finalizarSesion(sesionId) {
    return this.request(`/sesion/${sesionId}/finalizar`, {
      method: 'PUT'
    });
  }
}

const pizarraService = new PizarraService();
export default pizarraService;