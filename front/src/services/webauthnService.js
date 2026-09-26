// front/src/services/webauthnService.js
// ✅ WEBAUTHN / PASSKEYS: login con huella, Face ID o Windows Hello.
// La biometría la verifica el dispositivo; el backend valida la firma con la
// clave pública. Aquí solo se traduce entre el navegador y la API.

import api from './api';
import { authService } from './authService';

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

const webauthnService = {
  /** ¿El navegador soporta WebAuthn? */
  soportado() {
    return (
      typeof window !== 'undefined' &&
      !!window.PublicKeyCredential &&
      typeof navigator?.credentials?.create === 'function'
    );
  },

  /** ¿Este dispositivo tiene biometría (huella/Face ID/Windows Hello)? */
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

  // ---- Gestión de passkeys ----
  estado: () => api.get('/webauthn/estado'),
  credenciales: () => api.get('/webauthn/credenciales'),
  eliminarCredencial: (id) => api.delete(`/webauthn/credenciales/${id}`),

  /** Activa huella/Face ID en ESTE dispositivo (usuario logueado). */
  async registrar(nombre = 'Mi dispositivo') {
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

    const credencial = await navigator.credentials.create({ publicKey });
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

  /** Login con huella/Face ID: devuelve la sesión y la guarda. */
  async login(email) {
    const opciones = await api.post('/webauthn/login/iniciar', { email });
    const { challenge_id: challengeId, ...resto } = opciones;

    const publicKey = {
      ...resto,
      challenge: b64urlToBuffer(opciones.challenge),
      allowCredentials: (opciones.allowCredentials || []).map((c) => ({
        ...c,
        id: b64urlToBuffer(c.id),
      })),
    };

    const credencial = await navigator.credentials.get({ publicKey });
    if (!credencial) throw new Error('No se pudo verificar la huella');

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
    }
    return data;
  },
};

export default webauthnService;
