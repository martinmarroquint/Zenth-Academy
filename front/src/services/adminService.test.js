// src/services/adminService.test.js
// Tests de la analítica global del panel admin
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
import adminService from './adminService';

describe('adminService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('estadisticas llama al endpoint de analítica global', async () => {
    api.get.mockResolvedValue({ cursos: { total: 3 } });

    const data = await adminService.estadisticas();

    expect(api.get).toHaveBeenCalledWith('/admin/estadisticas');
    expect(data.cursos.total).toBe(3);
  });

  it('cursos llama al listado real de cursos del panel', async () => {
    api.get.mockResolvedValue([{ id: 'c1', titulo: 'Curso', inscritos: 2 }]);

    const data = await adminService.cursos();

    expect(api.get).toHaveBeenCalledWith('/admin/cursos');
    expect(data[0].inscritos).toBe(2);
  });
});
