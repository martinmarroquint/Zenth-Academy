// src/config/api.config.js
// =====================================================
// CONFIGURACIÓN DE API - ZENTH ACADEMY
// Fuente unificada para URLs, timeouts y endpoints
// =====================================================

export const API_CONFIG = {
  // =====================================================
  // URL BASE SEGÚN ENTORNO
  // =====================================================
  BASE_URL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1',

  // =====================================================
  // TIME OUTS
  // =====================================================
  TIMEOUT: 30000, // 30 segundos
  QR_TIMEOUT: 15000, // 15 segundos para QR

  // =====================================================
  // HEADERS POR DEFECTO
  // =====================================================
  HEADERS: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },

  HEADERS_MULTIPART: {
    'Accept': 'application/json'
    // Content-Type lo pone el navegador automáticamente con boundary
  },

  // =====================================================
  // AUTENTICACIÓN
  // =====================================================
  AUTH: {
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    PERFIL: '/auth/perfil',
    VERIFICAR: '/auth/verificar',
    CAMBIAR_PASSWORD: '/auth/cambiar-password'
  },

  // =====================================================
  // EXÁMENES ONLINE
  // =====================================================
  EXAMENES: {
    BASE: '/examenes',
    PUBLICADOS: '/examenes/publicados',
    GRUPOS: '/examenes/grupos',
    ALUMNOS: '/examenes/alumnos',
    RESULTADOS: '/examenes/resultados',
    SINCRONIZAR: '/examenes/sincronizar',
    HISTORIAL: '/examenes/historial/comparticiones'
  },

  // =====================================================
  // CUESTIONARIOS DINÁMICOS
  // =====================================================
  CUESTIONARIOS: {
    BASE: '/cuestionarios'
  },

  // =====================================================
  // PIZARRA INTERACTIVA
  // =====================================================
  PIZARRA: {
    BASE: '/pizarra'
  },

  // =====================================================
  // CURSOS ONLINE
  // =====================================================
  CURSOS: {
    BASE: '/cursos'
  },

  // =====================================================
  // FORO / COMUNIDAD
  // =====================================================
  FORO: {
    BASE: '/foro'
  },

  // =====================================================
  // CERTIFICADOS
  // =====================================================
  CERTIFICADOS: {
    BASE: '/certificados'
  },

  // =====================================================
  // CARPETA DOCENTE
  // =====================================================
  CARPETA_DOCENTE: {
    BASE: '/carpeta-docente'
  },

  // =====================================================
  // INTEGRACIONES EDM TEAM
  // =====================================================
  INTEGRACIONES: {
    BASE: '/integraciones/edm'
  },

  // =====================================================
  // ENDPOINTS DE DIAGNÓSTICO
  // =====================================================
  DIAGNOSTICO: {
    ROOT: '/',
    HEALTH: '/health',
    DB_CHECK: '/db-check'
  }
};

// =====================================================
// FUNCIÓN PARA OBTENER URL COMPLETA
// =====================================================
export const getApiUrl = (endpoint) => {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
};

// =====================================================
// VERIFICACIÓN DE CONFIGURACIÓN EN DESARROLLO
// =====================================================
if (import.meta.env.DEV) {
  console.log('[API_CONFIG] cargado:', {
    BASE_URL: API_CONFIG.BASE_URL,
    TIMEOUT: API_CONFIG.TIMEOUT,
    MODE: import.meta.env.MODE
  });
}

export default API_CONFIG;