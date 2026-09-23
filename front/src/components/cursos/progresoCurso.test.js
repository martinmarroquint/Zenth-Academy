// front/src/components/cursos/progresoCurso.test.js
// Tests de la lógica pura de avance (espejo de DetalleCurso / backend)
import { describe, it, expect } from 'vitest';
import {
  esLeccionCompletada,
  esModuloCompleto,
  puedeAvanzar,
  mostrarBannerContinuar,
  construirPlanLecciones,
  leccionBloqueadaSecuencial,
} from './progresoCurso';

describe('esLeccionCompletada', () => {
  it('coincide string vs number (evita bucle de completada)', () => {
    expect(esLeccionCompletada('l1', ['l1'])).toBe(true);
    expect(esLeccionCompletada(1, ['1'])).toBe(true);
    expect(esLeccionCompletada('1', [1])).toBe(true);
  });

  it('devuelve false con id null/undefined o lista vacía', () => {
    expect(esLeccionCompletada(null, ['l1'])).toBe(false);
    expect(esLeccionCompletada(undefined, ['l1'])).toBe(false);
    expect(esLeccionCompletada('l1', [])).toBe(false);
    expect(esLeccionCompletada('l1')).toBe(false);
  });

  it('devuelve false si no está en la lista', () => {
    expect(esLeccionCompletada('l2', ['l1', 'l3'])).toBe(false);
  });
});

describe('esModuloCompleto', () => {
  const lecciones = [{ id: 'a' }, { id: 'b' }];

  it('true solo si todas completadas', () => {
    expect(esModuloCompleto(lecciones, ['a', 'b'])).toBe(true);
    expect(esModuloCompleto(lecciones, ['a'])).toBe(false);
    expect(esModuloCompleto(lecciones, [])).toBe(false);
  });

  it('false con módulo vacío', () => {
    expect(esModuloCompleto([], ['a'])).toBe(false);
  });
});

describe('puedeAvanzar', () => {
  it('false sin siguiente o sin completar', () => {
    expect(puedeAvanzar({ haySiguiente: false, estaCompletada: true, mismoModulo: true })).toBe(false);
    expect(puedeAvanzar({ haySiguiente: true, estaCompletada: false, mismoModulo: true })).toBe(false);
  });

  it('true si siguiente en el mismo módulo y completada', () => {
    expect(
      puedeAvanzar({
        haySiguiente: true,
        estaCompletada: true,
        mismoModulo: true,
        moduloActualCompleto: false,
      })
    ).toBe(true);
  });

  it('si cruza de módulo, exige módulo actual al 100%', () => {
    expect(
      puedeAvanzar({
        haySiguiente: true,
        estaCompletada: true,
        mismoModulo: false,
        moduloActualCompleto: false,
      })
    ).toBe(false);
    expect(
      puedeAvanzar({
        haySiguiente: true,
        estaCompletada: true,
        mismoModulo: false,
        moduloActualCompleto: true,
      })
    ).toBe(true);
  });
});

describe('mostrarBannerContinuar', () => {
  it('solo con completada, no bloqueada y con siguiente', () => {
    expect(
      mostrarBannerContinuar({ estaCompletada: true, esBloqueada: false, haySiguiente: true })
    ).toBe(true);
    expect(
      mostrarBannerContinuar({ estaCompletada: true, esBloqueada: true, haySiguiente: true })
    ).toBe(false);
    expect(
      mostrarBannerContinuar({ estaCompletada: false, esBloqueada: false, haySiguiente: true })
    ).toBe(false);
    expect(
      mostrarBannerContinuar({ estaCompletada: true, esBloqueada: false, haySiguiente: false })
    ).toBe(false);
  });
});

describe('construirPlanLecciones / leccionBloqueadaSecuencial', () => {
  const getLecciones = (m) => m.lecciones || [];
  const modulos = [
    {
      id: 'm1',
      lecciones: [{ id: 'l1' }, { id: 'l2' }],
    },
    {
      id: 'm2',
      lecciones: [{ id: 'l3' }],
    },
  ];
  const plan = construirPlanLecciones(modulos, getLecciones);

  it('ordena en plano por módulo', () => {
    expect(plan.map((p) => p.leccion.id)).toEqual(['l1', 'l2', 'l3']);
  });

  it('la primera lección nunca está bloqueada por secuencia', () => {
    expect(
      leccionBloqueadaSecuencial({ plan, leccionId: 'l1', leccionesCompletadas: [] })
    ).toBe(false);
  });

  it('bloquea si falta una anterior (incluso cruzando módulo)', () => {
    expect(
      leccionBloqueadaSecuencial({ plan, leccionId: 'l2', leccionesCompletadas: ['l1'] })
    ).toBe(false);
    expect(
      leccionBloqueadaSecuencial({ plan, leccionId: 'l2', leccionesCompletadas: [] })
    ).toBe(true);
    expect(
      leccionBloqueadaSecuencial({
        plan,
        leccionId: 'l3',
        leccionesCompletadas: ['l1', 'l2'],
      })
    ).toBe(false);
    expect(
      leccionBloqueadaSecuencial({
        plan,
        leccionId: 'l3',
        leccionesCompletadas: ['l1'],
      })
    ).toBe(true);
  });

  it('id inexistente o null no bloquea (idx <= 0)', () => {
    expect(
      leccionBloqueadaSecuencial({ plan, leccionId: 'no-existe', leccionesCompletadas: [] })
    ).toBe(false);
    expect(
      leccionBloqueadaSecuencial({ plan, leccionId: null, leccionesCompletadas: [] })
    ).toBe(false);
  });
});
