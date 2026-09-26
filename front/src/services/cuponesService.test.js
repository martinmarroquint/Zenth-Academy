// src/services/cuponesService.test.js
// Tests del módulo de cupones (admin + validación del alumno)
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
import cuponesService from './cuponesService';

describe('cuponesService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('listar pasa los filtros como query params', async () => {
    api.get.mockResolvedValue([]);

    await cuponesService.listar({ q: 'PROMO', activo: true });

    expect(api.get).toHaveBeenCalledWith('/cupones', { q: 'PROMO', activo: true });
  });

  it('crear envía el cupón', async () => {
    api.post.mockResolvedValue({ id: 'c1' });

    await cuponesService.crear({ codigo: 'PROMO25', tipo: 'porcentaje', valor: 25 });

    expect(api.post).toHaveBeenCalledWith('/cupones', {
      codigo: 'PROMO25',
      tipo: 'porcentaje',
      valor: 25,
    });
  });

  it('actualizar y desactivar apuntan al cupón', async () => {
    api.put.mockResolvedValue({ id: 'c1' });
    api.delete.mockResolvedValue({ ok: true });

    await cuponesService.actualizar('c1', { valor: 30 });
    await cuponesService.desactivar('c1');

    expect(api.put).toHaveBeenCalledWith('/cupones/c1', { valor: 30 });
    expect(api.delete).toHaveBeenCalledWith('/cupones/c1');
  });

  it('usos y validar usan los endpoints correctos', async () => {
    api.get.mockResolvedValue([]);
    api.post.mockResolvedValue({ valido: true });

    await cuponesService.usos('c1');
    await cuponesService.validar('PROMO25', 'curso-1');

    expect(api.get).toHaveBeenCalledWith('/cupones/c1/usos');
    expect(api.post).toHaveBeenCalledWith('/cupones/validar', {
      codigo: 'PROMO25',
      curso_id: 'curso-1',
    });
  });
});
