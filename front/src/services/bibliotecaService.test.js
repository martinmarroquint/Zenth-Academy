// src/services/bibliotecaService.test.js
// Tests de la biblioteca independiente (recursos + tareas)
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
import bibliotecaService from './bibliotecaService';

describe('bibliotecaService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('listar pasa los filtros como query params', async () => {
    api.get.mockResolvedValue([]);

    await bibliotecaService.listar({ q: 'álgebra', tipo: 'libro', favoritos: true });

    expect(api.get).toHaveBeenCalledWith('/biblioteca', {
      q: 'álgebra',
      tipo: 'libro',
      favoritos: true,
    });
  });

  it('crear publica el recurso', async () => {
    api.post.mockResolvedValue({ id: 'r1' });

    await bibliotecaService.crear({ titulo: 'Libro de álgebra', tipo: 'libro' });

    expect(api.post).toHaveBeenCalledWith('/biblioteca', {
      titulo: 'Libro de álgebra',
      tipo: 'libro',
    });
  });

  it('actualizar y eliminar apuntan al recurso', async () => {
    api.put.mockResolvedValue({ id: 'r1' });
    api.delete.mockResolvedValue({ ok: true });

    await bibliotecaService.actualizar('r1', { titulo: 'Nuevo' });
    await bibliotecaService.eliminar('r1');

    expect(api.put).toHaveBeenCalledWith('/biblioteca/r1', { titulo: 'Nuevo' });
    expect(api.delete).toHaveBeenCalledWith('/biblioteca/r1');
  });

  it('alternarFavorito llama al endpoint del recurso', async () => {
    api.post.mockResolvedValue({ activo: true });

    await bibliotecaService.alternarFavorito('r1');

    expect(api.post).toHaveBeenCalledWith('/biblioteca/r1/favorito');
  });

  it('alternarCompletado envía el comentario del alumno', async () => {
    api.post.mockResolvedValue({ activo: true, completados_count: 1 });

    await bibliotecaService.alternarCompletado('r1', 'Listo, profe');

    expect(api.post).toHaveBeenCalledWith('/biblioteca/r1/completar', {
      comentario: 'Listo, profe',
    });
  });

  it('listarCompletados y obtenerPublico usan el id/token', async () => {
    api.get.mockResolvedValue([]);

    await bibliotecaService.listarCompletados('r1');
    await bibliotecaService.obtenerPublico('tok123');

    expect(api.get).toHaveBeenCalledWith('/biblioteca/r1/completados');
    expect(api.get).toHaveBeenCalledWith('/biblioteca/publico/tok123');
  });

  it('registrarEvento envía el tipo de actividad', async () => {
    api.post.mockResolvedValue({ veces: 1 });

    await bibliotecaService.registrarEvento('r1', 'descarga');

    expect(api.post).toHaveBeenCalledWith('/biblioteca/r1/evento', { tipo: 'descarga' });
  });

  it('analítica y ruta del alumno usan los endpoints correctos', async () => {
    api.get.mockResolvedValue({});

    await bibliotecaService.analitica();
    await bibliotecaService.analiticaAlumno('u1');
    await bibliotecaService.miActividad();

    expect(api.get).toHaveBeenCalledWith('/biblioteca/analitica');
    expect(api.get).toHaveBeenCalledWith('/biblioteca/analitica/alumno/u1');
    expect(api.get).toHaveBeenCalledWith('/biblioteca/mi-actividad');
  });
});
