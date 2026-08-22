// front/src/services/authService.js
// SERVICIO DE AUTENTICACIÓN - CON REGISTRO Y GESTIÓN DE USUARIOS

import api from './api';

const TOKEN_KEY = 'token';
const USER_KEY = 'user';
const REFRESH_KEY = 'refresh_token';

class AuthService {
  constructor() {
    this.token = localStorage.getItem(TOKEN_KEY);
    this.user = this.getUserFromStorage();
  }

  // =============================================
  // ALMACENAMIENTO
  // =============================================

  getUserFromStorage() {
    try {
      const data = localStorage.getItem(USER_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  setAuthData(token, user, refreshToken = null) {
    this.token = token;
    this.user = user;
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    if (refreshToken) {
      localStorage.setItem(REFRESH_KEY, refreshToken);
    }
  }

  setTokens(accessToken, refreshToken) {
    this.token = accessToken;
    localStorage.setItem(TOKEN_KEY, accessToken);
    if (refreshToken) {
      localStorage.setItem(REFRESH_KEY, refreshToken);
    }
  }

  clearAuthData() {
    this.token = null;
    this.user = null;
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(REFRESH_KEY);
  }

  getRefreshToken() {
    return localStorage.getItem(REFRESH_KEY);
  }

  // =============================================
  // AUTENTICACIÓN
  // =============================================

  async login(email, password) {
    try {
      const formData = new URLSearchParams();
      formData.append('username', email);
      formData.append('password', password);

      const response = await api.request('/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData,
      });

      if (response?.access_token) {
        this.setAuthData(response.access_token, response.user, response.refresh_token);
        return { success: true, user: response.user };
      }
      return { success: false, error: 'Credenciales incorrectas' };
    } catch (error) {
      console.error('Error en login:', error);
      return { 
        success: false, 
        error: error.message || 'Error al iniciar sesión' 
      };
    }
  }

  async register(data) {
    try {
      const response = await api.request('/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      });

      if (response?.access_token) {
        this.setAuthData(response.access_token, response.user, response.refresh_token);
        return { success: true, user: response.user };
      }
      return { success: false, error: 'Error en el registro' };
    } catch (error) {
      console.error('Error en registro:', error);
      return { 
        success: false, 
        error: error.message || 'Error al registrarse' 
      };
    }
  }

  /**
   * Renueva el par de tokens usando el refresh token (rotación).
   * Devuelve true si se renovó correctamente.
   */
  async refresh() {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) return false;
    try {
      const response = await api.request('/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      if (response?.access_token) {
        this.setTokens(response.access_token, response.refresh_token);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error renovando sesión:', error);
      return false;
    }
  }

  async logout() {
    const refreshToken = this.getRefreshToken();
    if (refreshToken) {
      try {
        await api.request('/auth/logout', {
          method: 'POST',
          body: JSON.stringify({ refresh_token: refreshToken }),
        });
      } catch {
        // Best-effort: revocar en servidor; limpiar local siempre
      }
    }
    this.clearAuthData();
    window.location.href = '/login';
  }

  async verificarToken() {
    try {
      if (!this.token) return false;
      const response = await api.get('/auth/verificar');
      return response ? true : false;
    } catch (error) {
      console.error('Error verificando token:', error);
      return false;
    }
  }

  // =============================================
  // USUARIO ACTUAL
  // =============================================

  getToken() {
    return this.token || localStorage.getItem(TOKEN_KEY);
  }

  getCurrentUser() {
    return this.user || this.getUserFromStorage();
  }

  isAuthenticated() {
    return !!this.getToken();
  }

  // =============================================
  // ROLES
  // =============================================

  getRol() {
    const user = this.getCurrentUser();
    return user?.rol || 'visitante';
  }

  isAdmin() {
    return this.getRol() === 'admin';
  }

  isDocente() {
    return this.getRol() === 'docente' || this.isAdmin();
  }

  isEstudiante() {
    return this.getRol() === 'estudiante';
  }

  // =============================================
  // ADMIN - GESTIÓN DE USUARIOS
  // =============================================

  async listarUsuarios(filtros = {}) {
    try {
      const params = new URLSearchParams();
      if (filtros.rol) params.append('rol', filtros.rol);
      if (filtros.busqueda) params.append('busqueda', filtros.busqueda);
      if (filtros.activo !== undefined) params.append('activo', filtros.activo);
      
      const url = `/auth/usuarios${params.toString() ? '?' + params.toString() : ''}`;
      return await api.get(url);
    } catch (error) {
      console.error('Error listando usuarios:', error);
      throw error;
    }
  }

  async crearUsuario(data) {
    try {
      return await api.post('/auth/usuarios', data);
    } catch (error) {
      console.error('Error creando usuario:', error);
      throw error;
    }
  }

  async actualizarUsuario(id, data) {
    try {
      return await api.put(`/auth/usuarios/${id}`, data);
    } catch (error) {
      console.error('Error actualizando usuario:', error);
      throw error;
    }
  }

  async eliminarUsuario(id) {
    try {
      return await api.delete(`/auth/usuarios/${id}`);
    } catch (error) {
      console.error('Error eliminando usuario:', error);
      throw error;
    }
  }

  async cambiarPassword(data) {
    try {
      return await api.post('/auth/me/cambiar-password', data);
    } catch (error) {
      console.error('Error cambiando password:', error);
      throw error;
    }
  }

  async actualizarPerfil(data) {
    try {
      return await api.put('/auth/me', data);
    } catch (error) {
      console.error('Error actualizando perfil:', error);
      throw error;
    }
  }
}

export const authService = new AuthService();
export default authService;