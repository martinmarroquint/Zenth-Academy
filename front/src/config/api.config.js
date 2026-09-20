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
// URL BASE DEL SERVIDOR (sin /api/v1)
// =====================================================
export const API_HOST = (API_CONFIG.BASE_URL || 'http://localhost:8000/api/v1')
  .replace('/api/v1', '')
  .replace('/api', '');

// =====================================================
// CONVERSOR DE URLs DE GOOGLE DRIVE
// Convierte links de compartir a URLs servidas por NUESTRO backend.
//
// ⚠️ POR QUÉ USAMOS UN PROXY:
//   - `lh3.googleusercontent.com/d/{id}` → Google lo rate-limita (HTTP 429)
//     y las imágenes desaparecen de forma intermitente.
//   - `drive.google.com/thumbnail` → funciona, pero depende de la IP/red del
//     usuario y puede fallar o tardar.
//   - NUESTRO proxy (`/api/v1/media/drive/{id}`) descarga la imagen UNA vez,
//     la cachea en disco y la sirve al instante. Sin dependencias externas.
// =====================================================
const DRIVE_THUMB_SIZE = 'w2000'; // calidad buena para portadas (≈200 KB)

const _driveProxyUrl = (fileId) =>
  `${API_CONFIG.BASE_URL}/media/drive/${fileId}?sz=${DRIVE_THUMB_SIZE}`;

export const convertGoogleDriveUrl = (url) => {
  if (!url) return url;
  
  const trimmed = url.trim();
  
  // Patrón 1: https://drive.google.com/file/d/{FILE_ID}/view...
  const filePattern = /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/;
  const fileMatch = trimmed.match(filePattern);
  if (fileMatch) {
    return _driveProxyUrl(fileMatch[1]);
  }
  
  // Patrón 2: https://drive.google.com/open?id={FILE_ID}
  const openPattern = /drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/;
  const openMatch = trimmed.match(openPattern);
  if (openMatch) {
    return _driveProxyUrl(openMatch[1]);
  }
  
  // Patrón 3: https://drive.google.com/uc?id={FILE_ID}&export=view
  const ucPattern = /drive\.google\.com\/uc\?id=([a-zA-Z0-9_-]+)/;
  const ucMatch = trimmed.match(ucPattern);
  if (ucMatch) {
    return _driveProxyUrl(ucMatch[1]);
  }

  // Patrón 4: thumbnail directo de Drive → extraer el id y usar el proxy
  const thumbPattern = /drive\.google\.com\/thumbnail\?id=([a-zA-Z0-9_-]+)/;
  const thumbMatch = trimmed.match(thumbPattern);
  if (thumbMatch) {
    return _driveProxyUrl(thumbMatch[1]);
  }

  // Patrón 5: ya es nuestro proxy → dejarlo tal cual
  if (trimmed.includes('/media/drive/')) {
    return trimmed;
  }
  
  // Patrón 6: https://drive.google.com/drive/folders/... (carpetas - no convertible)
  if (trimmed.includes('drive.google.com/drive/folders/')) {
    console.warn('No se puede usar una carpeta de Google Drive como imagen. Usa un enlace directo al archivo.');
    return url;
  }
  
  // Si no es Google Drive, devolver tal cual
  return url;
};

// =====================================================
// FUNCIÓN PARA RESOLVER URLs DE IMAGEN
// =====================================================
export const resolveImageUrl = (url) => {
  if (!url) return null;
  
  // Data URLs y URLs absolutas http/https
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    // Si es Google Drive, convertir
    if (url.includes('drive.google.com')) {
      return convertGoogleDriveUrl(url);
    }
    return url;
  }
  
  // URLs relativas del servidor (uploads/cursos/...)
  if (url.startsWith('/')) return `${API_HOST}${url}`;
  
  return url;
};

// =====================================================
// VERIFICAR SI UNA URL ES DE GOOGLE DRIVE
// =====================================================
export const isGoogleDriveUrl = (url) => {
  return url && url.includes('drive.google.com');
};

// =====================================================
// EXTRAER FILE ID DE GOOGLE DRIVE
// =====================================================
export const extractGoogleDriveFileId = (url) => {
  if (!url) return null;
  
  const fileMatch = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileMatch) return fileMatch[1];
  
  const openMatch = url.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/);
  if (openMatch) return openMatch[1];
  
  const ucMatch = url.match(/drive\.google\.com\/uc\?id=([a-zA-Z0-9_-]+)/);
  if (ucMatch) return ucMatch[1];
  
  return null;
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