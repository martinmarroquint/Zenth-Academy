// front/src/utils/sanitize.js
// ✅ SEGURIDAD: Sanitización de HTML para prevenir XSS almacenado.
// Usar SIEMPRE que se renderice HTML con dangerouslySetInnerHTML.
import DOMPurify from 'dompurify';

/**
 * Sanitiza una cadena HTML eliminando scripts, event handlers y otros
 * vectores de XSS. Devuelve HTML seguro para dangerouslySetInnerHTML.
 *
 * @param {string} html - HTML sin confiar (puede venir de usuarios)
 * @returns {string} HTML sanitizado
 */
export function sanitizeHtml(html) {
  if (!html || typeof html !== 'string') return '';
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    ADD_ATTR: ['target', 'rel'],
    FORBID_TAGS: ['style', 'script', 'iframe', 'object', 'embed', 'form'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur'],
  });
}

export default sanitizeHtml;
