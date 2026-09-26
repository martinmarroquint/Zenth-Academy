// src/services/compartirService.test.js
// Tests del emparejamiento de pantalla (QR + secreto en memoria)
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

import api from './api';
import compartirService from './compartirService';

describe('compartirService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('crearPantalla', () => {
    it('crea la pantalla de proyección enviando el secreto en memoria', async () => {
      api.post.mockResolvedValue({ codigo: 'ABC123', qr_token: 'tok' });

      await compartirService.crearPantalla('secreto-abc');

      expect(api.post).toHaveBeenCalledWith('/compartir/pantallas', {
        pantalla_secret: 'secreto-abc',
      });
    });
  });

  describe('estadoSala', () => {
    it('envía el secreto de pantalla como header', async () => {
      api.get.mockResolvedValue({ pantalla_vinculada: true });

      await compartirService.estadoSala('ABC123', 'secreto-123');

      expect(api.get).toHaveBeenCalledWith('/compartir/ABC123', {
        headers: { 'X-Pantalla-Secret': 'secreto-123' },
      });
    });

    it('sin secreto no envía headers', async () => {
      api.get.mockResolvedValue({ pantalla_vinculada: false });

      await compartirService.estadoSala('ABC123');

      expect(api.get).toHaveBeenCalledWith('/compartir/ABC123', {});
    });
  });

  describe('vincular', () => {
    it('envía el token del QR y el secreto de la pantalla', async () => {
      api.post.mockResolvedValue({ ok: true });

      await compartirService.vincular('ABC123', 'tok-1', 'sec-1');

      expect(api.post).toHaveBeenCalledWith('/compartir/ABC123/vincular', {
        qr_token: 'tok-1',
        pantalla_secret: 'sec-1',
      });
    });
  });

  describe('revocarPantalla', () => {
    it('llama al endpoint de revocación', async () => {
      api.post.mockResolvedValue({ ok: true });

      await compartirService.revocarPantalla('ABC123');

      expect(api.post).toHaveBeenCalledWith('/compartir/ABC123/pantalla/revocar', {});
    });
  });
});
