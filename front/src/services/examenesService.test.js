// src/services/examenesService.test.js
// Tests de examenesService (autoridad de tiempo / reintentos offline)
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./api', () => ({
  default: { request: vi.fn() }
}));

import apiClient from './api';
import examenesService from './examenesService';

describe('examenesService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('iniciarIntento llama al endpoint de intentos', async () => {
    apiClient.request.mockResolvedValue({ intento_id: 'i1', segundos_restantes: 600 });

    const r = await examenesService.iniciarIntento('ex1');

    expect(apiClient.request).toHaveBeenCalledWith('/examenes/ex1/intentos', { method: 'POST' });
    expect(r.intento_id).toBe('i1');
  });

  it('reintentarResultadosPendientes limpia el storage si todo se envía', async () => {
    localStorage.setItem('resultados_pendientes', JSON.stringify([{ examen_id: 'e1', intento_id: 'i1' }]));
    apiClient.request.mockResolvedValue({ ok: true });

    await examenesService.reintentarResultadosPendientes();

    expect(localStorage.getItem('resultados_pendientes')).toBeNull();
  });

  it('descarta entradas legacy sin intento_id', async () => {
    localStorage.setItem('resultados_pendientes', JSON.stringify([{ examen_id: 'e1' }]));

    await examenesService.reintentarResultadosPendientes();

    expect(localStorage.getItem('resultados_pendientes')).toBeNull();
    expect(apiClient.request).not.toHaveBeenCalled();
  });

  it('conserva los que fallan por red (transitorio)', async () => {
    localStorage.setItem('resultados_pendientes', JSON.stringify([{ examen_id: 'e1', intento_id: 'i1' }]));
    apiClient.request.mockRejectedValue(new Error('offline'));

    await examenesService.reintentarResultadosPendientes();

    expect(JSON.parse(localStorage.getItem('resultados_pendientes'))).toHaveLength(1);
  });

  it('descarta los que fallan con un error permanente (4xx)', async () => {
    localStorage.setItem('resultados_pendientes', JSON.stringify([{ examen_id: 'e1', intento_id: 'i1' }]));
    const err = new Error('Examen no encontrado');
    err.status = 404;
    apiClient.request.mockRejectedValue(err);

    await examenesService.reintentarResultadosPendientes();

    expect(localStorage.getItem('resultados_pendientes')).toBeNull();
  });

  it('reintentarResultadosPendientes no hace nada si no hay pendientes', async () => {
    await examenesService.reintentarResultadosPendientes();
    expect(apiClient.request).not.toHaveBeenCalled();
  });
});
