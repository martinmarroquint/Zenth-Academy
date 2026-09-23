// front/src/components/cursos/progresoCurso.js
// Lógica pura de avance de lecciones/módulos (testable sin React).
// IDs del backend son string; comparar SIEMPRE con String().

/**
 * ¿La lección está en la lista de completadas del backend?
 * @param {*} id id de lección (string|number)
 * @param {Array} leccionesCompletadas lista del backend
 */
export function esLeccionCompletada(id, leccionesCompletadas = []) {
  if (id === null || id === undefined) return false;
  const clave = String(id);
  return leccionesCompletadas.some((x) => String(x) === clave);
}

/**
 * ¿El módulo está al 100%?
 * @param {Array} lecciones del módulo
 * @param {Array} leccionesCompletadas
 */
export function esModuloCompleto(lecciones = [], leccionesCompletadas = []) {
  if (!lecciones.length) return false;
  return lecciones.every((l) => esLeccionCompletada(l.id, leccionesCompletadas));
}

/**
 * ¿Se puede pulsar Siguiente/Continuar?
 * - debe haber siguiente lección
 * - la actual debe estar completada en backend
 * - si el siguiente cruza de módulo, el módulo actual debe estar al 100%
 */
export function puedeAvanzar({
  haySiguiente,
  estaCompletada,
  mismoModulo,
  moduloActualCompleto,
} = {}) {
  if (!haySiguiente || !estaCompletada) return false;
  if (mismoModulo) return true;
  return !!moduloActualCompleto;
}

/**
 * ¿Mostrar banner verde Continuar? (completada, no bloqueada, hay siguiente)
 */
export function mostrarBannerContinuar({
  estaCompletada,
  esBloqueada,
  haySiguiente,
} = {}) {
  return !!estaCompletada && !esBloqueada && !!haySiguiente;
}

/**
 * Plan plano de lecciones en orden de curso (para secuencial y siguiente/anterior).
 * @param {Array} modulos
 * @param {(m: any) => Array} getLeccionesDeModulo
 */
export function construirPlanLecciones(modulos = [], getLeccionesDeModulo) {
  const plan = [];
  for (const modulo of modulos || []) {
    const lecciones = getLeccionesDeModulo(modulo);
    for (const leccion of lecciones) {
      plan.push({ modulo, leccion });
    }
  }
  return plan;
}

/**
 * Lección bloqueada por secuencia: cualquier anterior del plan incompleta.
 * Refleja `_verificar_bloqueo_leccion_internal` del backend (orden plano).
 */
export function leccionBloqueadaSecuencial({
  plan = [],
  leccionId,
  leccionesCompletadas = [],
} = {}) {
  if (leccionId === null || leccionId === undefined) return false;
  const idx = plan.findIndex((x) => String(x.leccion.id) === String(leccionId));
  if (idx <= 0) return false;
  for (let i = 0; i < idx; i++) {
    if (!esLeccionCompletada(plan[i].leccion.id, leccionesCompletadas)) {
      return true;
    }
  }
  return false;
}
