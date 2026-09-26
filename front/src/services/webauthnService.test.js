// src/services/webauthnService.test.js
// Tests del servicio de huella / Face ID (la ceremonia completa necesita un
// autenticador real, así que se cubren detección de soporte y endpoints)
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('./authService', () => ({
  authService: { setAuthData: vi.fn() },
}));

import api from './api';
import webauthnService from './webauthnService';

describe('webauthnService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('soportado() es false cuando el navegador no expone PublicKeyCredential', () => {
    expect(webauthnService.soportado()).toBe(false);
  });

  it('disponibleEnDispositivo() no rompe si no hay soporte', async () => {
    await expect(webauthnService.disponibleEnDispositivo()).resolves.toBe(false);
  });

  it('estado, credenciales y eliminación usan los endpoints correctos', async () => {
    api.get.mockResolvedValue({});
    api.delete.mockResolvedValue({ ok: true });

    await webauthnService.estado();
    await webauthnService.credenciales();
    await webauthnService.eliminarCredencial('cred-1');

    expect(api.get).toHaveBeenCalledWith('/webauthn/estado');
    expect(api.get).toHaveBeenCalledWith('/webauthn/credenciales');
    expect(api.delete).toHaveBeenCalledWith('/webauthn/credenciales/cred-1');
  });

  it('login/iniciar pide el challenge con el correo', async () => {
    api.post.mockResolvedValue({
      challenge: 'Y2hhbGxlbmdl',
      challenge_id: 'ch-1',
      allowCredentials: [],
      userVerification: 'required',
    });
    // Sin autenticador disponible, la ceremonia falla pero la llamada inicial ya salió
    await expect(webauthnService.login('ana@zenth.test')).rejects.toBeTruthy();

    expect(api.post).toHaveBeenCalledWith('/webauthn/login/iniciar', {
      email: 'ana@zenth.test',
    });
  });
});
