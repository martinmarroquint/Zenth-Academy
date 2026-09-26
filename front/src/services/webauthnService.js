// front/src/services/webauthnService.js
// ✅ WEBAUTHN / PASSKEYS: login con huella, Face ID o Windows Hello.
//
// Reglas que hay que respetar (si no, el navegador lo rechaza):
//   1. Requiere CONTEXTO SEGURO: HTTPS o http://localhost. Desde otra PC por IP
//      (http://192.168.x.x) NO funciona: el navegador ni expone la API.
//   2. El `rpId` (dominio) debe coincidir con el dominio del sitio.
//   3. La ceremonia debe dispararse desde un gesto del usuario (un clic).

import api from './api';
import { authService } from './authService';

const EMAIL_KEY = 'zenth_ultimo_email';

// base64url → ArrayBuffer (formato que espera la WebAuthn API)
const b64urlToBuffer = (valor) => {
  const pad = '='.repeat((4 - (valor.length % 4)) % 4);
  const base64 = (valor + pad).replace(/-/g, '+').replace(/_/g, '/');
  const bin = window.atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
};

// ArrayBuffer → base64url (formato que espera el backend)
const bufferToB64url = (buffer) => {
  const bytes = new Uint8Array(buffer);
  let bin = '';
  bytes.forEach((b) => {
    bin += String.fromCharCode(b);
  });
  return window
    .btoa(bin)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
};

// ✅ Mensajes claros para los errores del navegador
const MENSAJES = {
  NotAllowedError:
    'No se completó la verificación. Si cancelaste o tardaste demasiado, intentá de nuevo.',
  InvalidStateError: 'Este dispositivo ya está registrado en tu cuenta.',
  NotSupportedError: 'Este dispositivo no ofrece huella / Face ID.',
  SecurityError:
    'El dominio no está habilitado para huella / Face ID. Debe ser HTTPS y el mismo dominio del sitio.',
  AbortError: 'Cancelaste la operación.',
  ConstraintError: 'No se pudo usar este dispositivo. Probá con otro método de acceso.',
  UnknownError: 'El dispositivo no pudo completar la verificación.',
};

const traducirError = (e) => {
  if (!e) return 'No se pudo completar la operación';
  if (MENSAJES[e.name]) return MENSAJES[e.name];
  if (typeof e.message === 'string' && e.message) return e.message;
  return 'No se pudo completar la operación';
};

const webauthnService = {
  /** ¿Por qué NO está disponible? (null = está disponible) */
  motivoNoDisponible() {
    if (typeof window === 'undefined') return 'Entorno no disponible';
    if (window.isSecureContext === false) {
      return 'Necesita HTTPS (o localhost) para funcionar. Desde una IP de red no está permitido por el navegador.';
    }
    if (!window.PublicKeyCredential || !navigator?.credentials) {
      return 'Este navegador no soporta huella / Face ID.';
    }
    return null;
  },

  /** ¿Se puede usar la huella/Face ID en este contexto? */
  soportado() {
    return this.motivoNoDisponible() === null;
  },

  /** ¿El dispositivo tiene biometría propia? (informativo, no bloqueante) */
  async disponibleEnDispositivo() {
    try {
      if (!this.soportado()) return false;
      const fn = window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable;
      if (typeof fn !== 'function') return true;
      return await fn.call(window.PublicKeyCredential);
    } catch {
      return false;
    }
  },

  guardarEmail(email) {
    try {
      if (email) localStorage.setItem(EMAIL_KEY, email.trim().toLowerCase());
    } catch {
      // sin localStorage no pasa nada
    }
  },

  emailRecordado() {
    try {
      return localStorage.getItem(EMAIL_KEY) || '';
    } catch {
      return '';
    }
  },

  // ---- Gestión de passkeys ----
  estado: () => api.get('/webauthn/estado'),
  credenciales: () => api.get('/webauthn/credenciales'),
  eliminarCredencial: (id) => api.delete(`/webauthn/credenciales/${id}`),

  /** Activa huella/Face ID en ESTE dispositivo (usuario logueado). */
  async registrar(nombre = 'Mi dispositivo') {
    if (!this.soportado()) {
      throw new Error(this.motivoNoDisponible());
    }

    const opciones = await api.post('/webauthn/registro/iniciar', { nombre });

    const publicKey = {
      ...opciones,
      challenge: b64urlToBuffer(opciones.challenge),
      user: { ...opciones.user, id: b64urlToBuffer(opciones.user.id) },
      excludeCredentials: (opciones.excludeCredentials || []).map((c) => ({
        ...c,
        id: b64urlToBuffer(c.id),
      })),
    };

    let credencial;
    try {
      credencial = await navigator.credentials.create({ publicKey });
    } catch (e) {
      throw new Error(traducirError(e));
    }
    if (!credencial) throw new Error('No se pudo crear la credencial');

    return api.post('/webauthn/registro/completar', {
      nombre,
      credential: {
        id: credencial.id,
        rawId: bufferToB64url(credencial.rawId),
        type: credencial.type,
        response: {
          clientDataJSON: bufferToB64url(credencial.response.clientDataJSON),
          attestationObject: bufferToB64url(credencial.response.attestationObject),
        },
        transports: credencial.response.getTransports
          ? credencial.response.getTransports()
          : [],
      },
    });
  },

  /**
   * Login con huella/Face ID.
   * - Con email: usa las passkeys de esa cuenta.
   * - Sin email: el navegador muestra el selector de passkeys (usernameless).
   */
  async login(email = '') {
    if (!this.soportado()) {
      throw new Error(this.motivoNoDisponible());
    }

    const correo = (email || '').trim().toLowerCase();
    const opciones = await api.post('/webauthn/login/iniciar', {
      email: correo || null,
    });

    const { challenge_id: challengeId, ...resto } = opciones;
    const publicKey = {
      ...resto,
      challenge: b64urlToBuffer(opciones.challenge),
      allowCredentials: (opciones.allowCredentials || []).map((c) => ({
        ...c,
        id: b64urlToBuffer(c.id),
      })),
    };

    let credencial;
    try {
      credencial = await navigator.credentials.get({ publicKey });
    } catch (e) {
      throw new Error(traducirError(e));
    }
    if (!credencial) throw new Error('No se pudo verificar la huella / Face ID');

    const data = await api.post('/webauthn/login/completar', {
      challenge_id: challengeId,
      credential: {
        id: credencial.id,
        rawId: bufferToB64url(credencial.rawId),
        type: credencial.type,
        response: {
          clientDataJSON: bufferToB64url(credencial.response.clientDataJSON),
          authenticatorData: bufferToB64url(credencial.response.authenticatorData),
          signature: bufferToB64url(credencial.response.signature),
          userHandle: credencial.response.userHandle
            ? bufferToB64url(credencial.response.userHandle)
            : null,
        },
      },
    });

    if (data?.access_token) {
      authService.setAuthData(data.access_token, data.user, data.refresh_token);
      if (data?.user?.email) this.guardarEmail(data.user.email);
    }
    return data;
  },
};

export default webauthnService;
