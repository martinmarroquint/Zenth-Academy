// src/services/api.js
// =====================================================
// SERVICIO DE API - CONEXIÓN CON BACKEND ZENTH ACADEMY
// =====================================================
// Soporta:
// - Desarrollo local: http://localhost:8000/api/v1
// - Producción: https://zenth-academy.onrender.com/api/v1
// - Cancelación de peticiones (AbortController)
// - Timeouts personalizados
// - Headers dinámicos
// =====================================================

// Importar configuración unificada
import { API_CONFIG } from '../config/api.config';

// =====================================================
// 📡 CONFIGURACIÓN BASE
// =====================================================
export const API_BASE_CONFIG = API_CONFIG;

// URL base según entorno (VITE_API_URL se define en .env o .env.production)
const BASE_URL = import.meta.env.VITE_API_URL || API_CONFIG.BASE_URL || 'http://localhost:8000/api/v1';
const WS_URL = import.meta.env.VITE_WS_URL || API_CONFIG.WS_URL || 'ws://localhost:8000';
const TIMEOUT = API_CONFIG.TIMEOUT || 30000;

// Promesa de refresco en curso (single-flight) para evitar múltiples renovaciones simultáneas
let refreshing = null;

// Log de configuración en desarrollo
if (import.meta.env.DEV) {
  console.log('🔧 [API] Configuración cargada:', {
    BASE_URL,
    WS_URL,
    TIMEOUT,
    ENVIRONMENT: import.meta.env.MODE,
    VITE_API_URL: import.meta.env.VITE_API_URL
  });
}

// =====================================================
// 🛠️ FUNCIONES AUXILIARES
// =====================================================

/**
 * Construir URL con query params
 */
const buildUrl = (endpoint, params = {}) => {
  let url = endpoint;
  
  // Filtrar params especiales (no se incluyen en query string)
  const queryParams = {};
  const specialParams = ['signal', 'timeout', 'headers', 'body', 'method', 'onProgress', 'cancelToken'];
  
  Object.entries(params).forEach(([key, value]) => {
    if (!specialParams.includes(key) && value !== undefined && value !== null && value !== '') {
      queryParams[key] = value;
    }
  });
  
  // Construir query string
  if (Object.keys(queryParams).length > 0) {
    const searchParams = new URLSearchParams();
    Object.entries(queryParams).forEach(([key, value]) => {
      searchParams.append(key, value);
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url = `${endpoint}?${queryString}`;
    }
  }
  
  return url;
};

/**
 * Extraer opciones de la configuración de la petición
 */
const extractOptions = (params = {}, additionalOptions = {}) => {
  // Extraer opciones especiales de params
  const signal = params.signal || additionalOptions.signal || null;
  const timeout = params.timeout || additionalOptions.timeout || null;
  
  return { signal, timeout };
};

// =====================================================
// 🔧 CLIENTE HTTP PRINCIPAL
// =====================================================
export const apiClient = {
  /**
   * Método base para realizar peticiones HTTP
   * @param {string} endpoint - Ruta del endpoint (ej: '/auth/login')
   * @param {object} options - Opciones de fetch (method, headers, body, signal, timeout)
   * @returns {Promise<any>} - Respuesta JSON del servidor
   */
  async request(endpoint, options = {}) {
    const url = `${BASE_URL}${endpoint}`;
    const token = localStorage.getItem('token');
    
    // 🆕 Extraer opciones especiales
    const requestTimeout = options.timeout || TIMEOUT;
    const externalSignal = options.signal || null;
    
    // Headers por defecto
    const headers = {
      'Accept': 'application/json',
      ...options.headers
    };
    
    // Si no es FormData ni URLSearchParams, agregar Content-Type JSON
    if (!(options.body instanceof FormData) && !(options.body instanceof URLSearchParams)) {
      headers['Content-Type'] = 'application/json';
    }
    
    // Agregar token de autenticación si existe
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // 🆕 Soporte para AbortController externo o crear uno nuevo
    let controller = null;
    let timeoutId = null;
    
    if (externalSignal) {
      // Si se proporciona una señal externa, usarla
      // Pero también aplicamos timeout si está especificado
      if (requestTimeout && !externalSignal.aborted) {
        timeoutId = setTimeout(() => {
          // No podemos abortar una señal externa, solo podemos ignorar
          console.warn(`⏱️ [API] Timeout externo en ${endpoint} (${requestTimeout}ms)`);
          clearTimeout(timeoutId);
        }, requestTimeout);
      }
    } else {
      // Crear nuestro propio controller si no hay señal externa
      controller = new AbortController();
      
      // Configurar timeout
      if (requestTimeout) {
        timeoutId = setTimeout(() => {
          controller.abort();
          console.warn(`⏱️ [API] Timeout en ${endpoint} (${requestTimeout}ms)`);
        }, requestTimeout);
      }
    }

    // Señal final a usar
    const signal = externalSignal || controller?.signal;

    try {
      const response = await fetch(url, {
        method: options.method || 'GET',
        headers,
        body: options.body,
        signal
      });
      
      // Limpiar timeout
      if (timeoutId) clearTimeout(timeoutId);
      
      // Manejo de errores HTTP
      if (!response.ok) {
        // Token expirado o inválido: intentar renovar con refresh token (una vez)
        if (response.status === 401 && !options._skipRefresh) {
          const refreshed = await apiClient.tryRefresh();
          if (refreshed) {
            return apiClient.request(endpoint, { ...options, _skipRefresh: true });
          }
        }

        // No se pudo renovar → cerrar sesión
        if (response.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          localStorage.removeItem('userData');
          localStorage.removeItem('refresh_token');

          // Redirigir al login si no estamos ya en login
          if (!window.location.pathname.includes('/login')) {
            window.location.href = '/login';
          }
        }
        
        // Intentar obtener mensaje de error del backend
        let errorMessage = `Error ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorData.message || errorData.error || errorMessage;
        } catch {
          // Si no se puede parsear JSON, usar texto plano
          errorMessage = await response.text().catch(() => errorMessage);
        }
        
        throw new Error(errorMessage);
      }
      
      // Si la respuesta es 204 No Content
      if (response.status === 204) {
        return null;
      }
      
      // Parsear respuesta JSON
      return await response.json();
      
    } catch (error) {
      // Limpiar timeout
      if (timeoutId) clearTimeout(timeoutId);
      
      // 🆕 Manejo mejorado de errores
      if (error.name === 'AbortError') {
        // Si fue cancelado externamente
        if (externalSignal?.aborted) {
          console.log(`🛑 [API] Petición cancelada externamente: ${endpoint}`);
          const cancelError = new Error('Petición cancelada');
          cancelError.name = 'CanceledError';
          throw cancelError;
        }
        // Si fue timeout interno
        if (controller) {
          console.error(`⏱️ [API] Timeout interno en ${endpoint}`);
          const timeoutError = new Error('La petición ha excedido el tiempo de espera');
          timeoutError.name = 'TimeoutError';
          throw timeoutError;
        }
      }
      
      console.error(`❌ [API] Error en ${endpoint}:`, error.message);
      throw error;
    }
  },

  /**
   * 🆕 Renueva el par de tokens usando el refresh token (single-flight).
   * Devuelve true si se renovó y guarda los nuevos tokens.
   */
  async tryRefresh() {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) return false;

    // Si ya hay un refresco en curso, esperar su resultado
    if (refreshing) {
      try {
        await refreshing;
        return !!localStorage.getItem('token');
      } catch {
        return false;
      }
    }

    refreshing = this.request('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: refreshToken }),
      _skipRefresh: true,
    });

    try {
      const data = await refreshing;
      if (data?.access_token) {
        localStorage.setItem('token', data.access_token);
        if (data.refresh_token) {
          localStorage.setItem('refresh_token', data.refresh_token);
        }
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ [API] No se pudo renovar la sesión:', error.message);
      return false;
    } finally {
      refreshing = null;
    }
  },

  /**
   * 🆕 Petición GET - Soporta opciones avanzadas
   * @param {string} endpoint - Ruta del endpoint
   * @param {object} params - Parámetros de consulta (query params) Y opciones especiales (signal, timeout)
   */
  get(endpoint, params = {}) {
    // Si params no es un objeto, asumir endpoint simple
    if (typeof params !== 'object' || params === null) {
      return this.request(endpoint, { method: 'GET' });
    }
    
    // Extraer opciones especiales (no van en query string)
    const { signal, timeout } = extractOptions(params);
    
    // Construir URL con query params normales
    const url = buildUrl(endpoint, params);
    
    // Opciones de la petición
    const requestOptions = { method: 'GET' };
    if (signal) requestOptions.signal = signal;
    if (timeout) requestOptions.timeout = timeout;
    
    return this.request(url, requestOptions);
  },

  /**
   * 🆕 Petición POST - Soporta opciones avanzadas
   * @param {string} endpoint - Ruta del endpoint
   * @param {object|FormData} data - Datos a enviar
   * @param {object} options - Opciones adicionales (signal, timeout, headers)
   */
  post(endpoint, data = null, options = {}) {
    const requestOptions = {
      method: 'POST',
      ...options
    };
    
    if (data instanceof FormData) {
      requestOptions.body = data;
      // No establecer Content-Type, el navegador lo hará con boundary
    } else if (data) {
      requestOptions.body = JSON.stringify(data);
    }
    
    return this.request(endpoint, requestOptions);
  },

  /**
   * 🆕 Petición PUT - Soporta opciones avanzadas
   * @param {string} endpoint - Ruta del endpoint
   * @param {object} data - Datos a enviar (puede ser null)
   * @param {object} options - Opciones adicionales (signal, timeout, headers)
   */
  put(endpoint, data = null, options = {}) {
    const requestOptions = {
      method: 'PUT',
      ...options
    };
    
    if (data) {
      requestOptions.body = JSON.stringify(data);
    }
    
    return this.request(endpoint, requestOptions);
  },

  /**
   * 🆕 Petición PATCH - Soporta opciones avanzadas
   * @param {string} endpoint - Ruta del endpoint
   * @param {object} data - Datos a enviar
   * @param {object} options - Opciones adicionales (signal, timeout, headers)
   */
  patch(endpoint, data, options = {}) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
      ...options
    });
  },

  /**
   * 🆕 Petición DELETE - Soporta opciones avanzadas
   * @param {string} endpoint - Ruta del endpoint
   * @param {object} options - Opciones adicionales (signal, timeout, headers)
   */
  delete(endpoint, options = {}) {
    return this.request(endpoint, {
      method: 'DELETE',
      ...options
    });
  },

  /**
   * Login especial (form-urlencoded como espera FastAPI)
   * @param {string} username - Nombre de usuario
   * @param {string} password - Contraseña
   */
  login(username, password) {
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);
    
    return this.request('/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData
    });
  },

  /**
   * Subida de archivos (un solo archivo)
   * @param {string} endpoint - Ruta del endpoint
   * @param {FormData} formData - FormData con el archivo
   * @param {object} options - Opciones adicionales (signal, timeout, onProgress)
   */
  upload(endpoint, formData, options = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: formData,
      ...options
    });
  },

  /**
   * Subida de múltiples archivos
   * @param {string} endpoint - Ruta del endpoint
   * @param {FormData} formData - FormData con los archivos
   * @param {object} options - Opciones adicionales (signal, timeout)
   */
  uploadMultiple(endpoint, formData, options = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: formData,
      ...options
    });
  },

  /**
   * 🆕 Descargar archivo (blob) - Con soporte de opciones
   * @param {string} endpoint - Ruta del endpoint
   * @param {object} params - Parámetros de consulta
   * @param {object} options - Opciones adicionales (signal, timeout)
   * @returns {Promise<Blob>} - Blob del archivo
   */
  async download(endpoint, params = {}, options = {}) {
    const token = localStorage.getItem('token');
    const headers = {};
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    // Construir URL
    let finalUrl = `${BASE_URL}${buildUrl(endpoint, params)}`;
    
    // Configurar señal
    const controller = new AbortController();
    const timeoutMs = options.timeout || TIMEOUT;
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    
    try {
      const response = await fetch(finalUrl, {
        headers,
        signal: options.signal || controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Error al descargar: ${response.status}`);
      }
      
      return await response.blob();
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }
};

// =====================================================
// 🔐 GESTIÓN DE AUTENTICACIÓN
// =====================================================

/**
 * Guardar token y datos de usuario
 * @param {string} token - Token JWT
 * @param {object} userData - Datos del usuario
 */
export const setAuthToken = (token, userData = null, refreshToken = null) => {
  if (token) {
    localStorage.setItem('token', token);
    if (userData) {
      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('userData', JSON.stringify(userData));
    }
    if (refreshToken) {
      localStorage.setItem('refresh_token', refreshToken);
    }
  } else {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('userData');
    localStorage.removeItem('refresh_token');
  }
};

/**
 * Obtener usuario actual del localStorage
 * @returns {object|null} - Datos del usuario o null
 */
export const getCurrentUser = () => {
  const userStr = localStorage.getItem('user') || localStorage.getItem('userData');
  if (userStr) {
    try {
      return JSON.parse(userStr);
    } catch (e) {
      console.error('Error parsing user data:', e);
      return null;
    }
  }
  return null;
};

/**
 * Obtener token actual
 * @returns {string|null} - Token JWT o null
 */
export const getToken = () => {
  return localStorage.getItem('token');
};

/**
 * Verificar si el usuario está autenticado
 * @returns {boolean} - True si está autenticado
 */
export const isAuthenticated = () => {
  const token = getToken();
  return !!token && token !== 'undefined' && token !== 'null';
};

/**
 * Cerrar sesión (limpiar localStorage)
 */
export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.removeItem('userData');
  localStorage.removeItem('refresh_token');
  window.location.href = '/login';
};

// =====================================================
// 📊 INTERCEPTOR DE LOGS MEJORADO (solo en desarrollo)
// =====================================================
// Usa performance.now() en lugar de console.time para mayor precisión
// y evitar problemas con timers anidados
// =====================================================

if (import.meta.env.DEV) {
  // Guardar referencia original de forma segura
  const originalRequest = apiClient.request;
  const originalGet = apiClient.get;
  const originalPost = apiClient.post;
  const originalPut = apiClient.put;
  const originalPatch = apiClient.patch;
  const originalDelete = apiClient.delete;
  
  // Función wrapper para logging
  const logRequest = (method, originalFn) => {
    return async function(...args) {
      const startTime = performance.now();
      const endpoint = typeof args[0] === 'string' ? args[0] : 'unknown';
      
      console.log(`📡 [API] ${method} ${endpoint}`);
      
      try {
        const response = await originalFn.apply(this, args);
        const duration = performance.now() - startTime;
        
        if (duration < 1000) {
          console.log(`✅ [API] ${method} ${endpoint} - OK (${duration.toFixed(2)}ms)`);
        } else {
          console.log(`✅ [API] ${method} ${endpoint} - OK (${(duration / 1000).toFixed(2)}s)`);
        }
        
        return response;
      } catch (error) {
        const duration = performance.now() - startTime;
        
        // Formatear tiempo
        const timeStr = duration < 1000 
          ? `${duration.toFixed(2)}ms` 
          : `${(duration / 1000).toFixed(2)}s`;
        
        // Tipo de error
        let errorType = 'ERROR';
        if (error.name === 'AbortError' || error.name === 'CanceledError') {
          errorType = '🛑 CANCELADO';
        } else if (error.name === 'TimeoutError') {
          errorType = '⏱️ TIMEOUT';
        }
        
        console.error(`❌ [API] ${method} ${endpoint} - ${errorType} (${timeStr}):`, error.message);
        
        throw error;
      }
    };
  };
  
  // Aplicar logging a todos los métodos
  apiClient.request = logRequest('REQUEST', originalRequest);
  apiClient.get = logRequest('GET', originalGet);
  apiClient.post = logRequest('POST', originalPost);
  apiClient.put = logRequest('PUT', originalPut);
  apiClient.patch = logRequest('PATCH', originalPatch);
  apiClient.delete = logRequest('DELETE', originalDelete);
  
  console.log('🔧 [API] Interceptor de logs mejorado activado (performance.now)');
}

// =====================================================
// 📦 EXPORTACIONES ADICIONALES
// =====================================================

// Exportar URLs base para uso en otros servicios
export const API_URL = BASE_URL;
export const WEBSOCKET_URL = WS_URL;

// Exportar configuración completa
export default apiClient;