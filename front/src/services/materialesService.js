// front/src/services/materialesService.js
// SERVICIO DE MATERIALES - CRUD COMPLETO

import apiClient from './api';

const BASE_URL = '/materiales';

class MaterialesService {
  // =============================================
  // MÉTODO BASE
  // =============================================
  async request(endpoint, options = {}) {
    try {
      return await apiClient.request(`${BASE_URL}${endpoint}`, options);
    } catch (error) {
      console.error(`Error en petición a ${endpoint}:`, error);
      throw error;
    }
  }

  // =============================================
  // LISTAR MATERIALES
  // =============================================
  async listar(filtros = {}) {
    const params = new URLSearchParams();
    if (filtros.activo !== undefined) params.append('activo', filtros.activo);
    if (filtros.grupo_id) params.append('grupo_id', filtros.grupo_id);
    if (filtros.curso_id) params.append('curso_id', filtros.curso_id);
    if (filtros.busqueda) params.append('busqueda', filtros.busqueda);
    if (filtros.limit) params.append('limit', filtros.limit);
    if (filtros.offset) params.append('offset', filtros.offset);
    
    const query = params.toString();
    return this.request(`/${query ? '?' + query : ''}`);
  }

  // =============================================
  // OBTENER MATERIAL POR ID
  // =============================================
  async obtener(id) {
    return this.request(`/${id}`);
  }

  // =============================================
  // CREAR MATERIAL
  // =============================================
  async crear(data) {
    return this.request('/', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // =============================================
  // ACTUALIZAR MATERIAL
  // =============================================
  async actualizar(id, data) {
    return this.request(`/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  // =============================================
  // ELIMINAR MATERIAL
  // =============================================
  async eliminar(id) {
    return this.request(`/${id}`, {
      method: 'DELETE'
    });
  }

  // =============================================
  // ACTIVAR/DESACTIVAR MATERIAL
  // =============================================
  async toggle(id) {
    return this.request(`/${id}/toggle`, {
      method: 'PATCH'
    });
  }

  // =============================================
  // OBTENER MATERIAL PÚBLICO (sin login)
  // =============================================
  async obtenerPublico(token) {
    try {
      return await apiClient.request(`/materiales/publico/${token}`, {
        method: 'GET'
      });
    } catch (error) {
      console.error('Error obteniendo material público:', error);
      throw error;
    }
  }

  // =============================================
  // MATERIALES POR GRUPO
  // =============================================
  async listarPorGrupo(grupoId) {
    return this.request(`/grupo/${grupoId}`);
  }
}

export default new MaterialesService();