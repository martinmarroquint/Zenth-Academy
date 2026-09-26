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

  it('login avisa claramente si el navegador no soporta WebAuthn', async () => {
    // jsdom no expone PublicKeyCredential → debe avisar y NO llamar a la API
    await expect(webauthnService.login('ana@zenth.test')).rejects.toThrow(
      /no soporta|HTTPS/i
    );
    expect(api.post).not.toHaveBeenCalled();
  });

  it('motivoNoDisponible explica por qué no se puede usar', () => {
    const motivo = webauthnService.motivoNoDisponible();
    expect(typeof motivo).toBe('string');
    expect(motivo.length).toBeGreaterThan(0);
  });
});
