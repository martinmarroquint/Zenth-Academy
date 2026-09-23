// src/services/cursosService.test.js
// Tests de cursosService con el módulo api mockeado
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    download: vi.fn()
  }
}));

import api from './api';
import cursosService from './cursosService';

describe('cursosService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('inscribirme', () => {
    it('llama a api.post con el endpoint de inscripción', async () => {
      api.post.mockResolvedValue({ ok: true });
      const result = await cursosService.inscribirme(42);

      expect(api.post).toHaveBeenCalledWith('/cursos/42/inscribirse');
      expect(result).toEqual({ ok: true });
    });
  });

  describe('solicitarAcceso', () => {
    it('llama a api.post con endpoint y data', async () => {
      const data = { mensaje: 'Quiero entrar' };
      api.post.mockResolvedValue({ ok: true });

      await cursosService.solicitarAcceso(7, data);

      expect(api.post).toHaveBeenCalledWith('/cursos/7/solicitar-acceso', data);
    });
  });

  describe('completarLeccion', () => {
    it('envía usuario_id y tiempo_invertido sin nota cuando no se pasa', async () => {
      api.post.mockResolvedValue({ ok: true });

      await cursosService.completarLeccion(1, 2, 3, 120);

      expect(api.post).toHaveBeenCalledWith('/cursos/1/lecciones/2/completar', {
        usuario_id: 3,
        tiempo_invertido: 120
      });
    });

    it('envía nota y aprobado cuando se pasa nota', async () => {
      api.post.mockResolvedValue({ ok: true });

      await cursosService.completarLeccion(1, 2, 3, 120, 15);

      const [, body] = api.post.mock.calls[0];
      expect(body.nota).toBe(15);
      expect(body.aprobado).toBe(true);
    });

    it('usa aprobado explícito cuando se proporciona', async () => {
      api.post.mockResolvedValue({ ok: true });

      await cursosService.completarLeccion(1, 2, 3, 120, 5, false);

      const [, body] = api.post.mock.calls[0];
      expect(body.nota).toBe(5);
      expect(body.aprobado).toBe(false);
    });
  });

  describe('aprobarSolicitud', () => {
    it('envía el comentario correctamente', async () => {
      api.post.mockResolvedValue({ ok: true });

      await cursosService.aprobarSolicitud(99, 'Buen trabajo');

      expect(api.post).toHaveBeenCalledWith('/cursos/solicitudes/99/aprobar', {
        estado: 'aprobado',
        comentario_docente: 'Buen trabajo'
      });
    });

    it('usa el comentario por defecto si no se pasa', async () => {
      api.post.mockResolvedValue({ ok: true });

      await cursosService.aprobarSolicitud(99);

      expect(api.post).toHaveBeenCalledWith('/cursos/solicitudes/99/aprobar', {
        estado: 'aprobado',
        comentario_docente: 'Acceso aprobado'
      });
    });
  });

  describe('listar / obtener / progreso', () => {
    it('listar llama GET /cursos con filtros', async () => {
      api.get.mockResolvedValue([{ id: 'c1' }]);

      const result = await cursosService.listar({ estado: 'publicado' });

      expect(api.get).toHaveBeenCalledWith('/cursos', { estado: 'publicado' });
      expect(result).toEqual([{ id: 'c1' }]);
    });

    it('obtener llama GET /cursos/{id}', async () => {
      api.get.mockResolvedValue({ id: 'c1', titulo: 'Curso' });

      const result = await cursosService.obtener('c1');

      expect(api.get).toHaveBeenCalledWith('/cursos/c1');
      expect(result.id).toBe('c1');
    });

    it('obtenerProgreso llama GET /cursos/{id}/progreso/{uid}', async () => {
      api.get.mockResolvedValue({ progreso: 50, lecciones_completadas: ['l1'] });

      const result = await cursosService.obtenerProgreso('c1', 'u1');

      expect(api.get).toHaveBeenCalledWith('/cursos/c1/progreso/u1');
      expect(result.progreso).toBe(50);
    });

    it('misCursos llama GET /cursos/mis-cursos', async () => {
      api.get.mockResolvedValue([{ curso_id: 'c1' }]);

      await cursosService.misCursos();

      expect(api.get).toHaveBeenCalledWith('/cursos/mis-cursos');
    });
  });

  describe('comentarios por lección', () => {
    it('listarComentariosLeccion llama al endpoint correcto', async () => {
      api.get.mockResolvedValue([]);

      const result = await cursosService.listarComentariosLeccion(1, 2);

      expect(api.get).toHaveBeenCalledWith('/cursos/1/lecciones/2/comentarios');
      expect(result).toEqual([]);
    });

    it('crearComentarioLeccion envía el contenido', async () => {
      api.post.mockResolvedValue({ id: 'c1' });

      await cursosService.crearComentarioLeccion(1, 2, 'Hola');

      expect(api.post).toHaveBeenCalledWith('/cursos/1/lecciones/2/comentarios', {
        contenido: 'Hola'
      });
    });

    it('eliminarComentarioLeccion llama al endpoint del comentario', async () => {
      api.delete.mockResolvedValue({ ok: true });

      await cursosService.eliminarComentarioLeccion(1, 2, 'c1');

      expect(api.delete).toHaveBeenCalledWith('/cursos/1/lecciones/2/comentarios/c1');
    });

    it('darLikeComentarioLeccion llama al endpoint de like', async () => {
      api.post.mockResolvedValue({ liked: true, likes_count: 1 });

      await cursosService.darLikeComentarioLeccion(1, 2, 'c1');

      expect(api.post).toHaveBeenCalledWith('/cursos/1/lecciones/2/comentarios/c1/like');
    });
  });
});
