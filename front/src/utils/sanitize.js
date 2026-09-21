// front/src/utils/sanitize.js
// ✅ SEGURIDAD: Sanitización de HTML para prevenir XSS almacenado.
// Usar SIEMPRE que se renderice HTML con dangerouslySetInnerHTML.
import DOMPurify from 'dompurify';

// ✅ SEGURIDAD: fuerza rel="noopener noreferrer" en enlaces con target
// (evita "reverse tabnabbing": la página destino no puede controlar la nuestra).
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A' && node.getAttribute('target')) {
    node.setAttribute('rel', 'noopener noreferrer');
  }
});

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
    // ✅ Allowlist explícita (sin USE_PROFILES: evita el advisory de prototype
    // pollution de DOMPurify y da control total sobre lo permitido).
    ALLOWED_TAGS: [
      'p', 'br', 'hr', 'strong', 'b', 'em', 'i', 'u', 's', 'del', 'mark', 'sub', 'sup',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li', 'blockquote', 'pre', 'code',
      'a', 'img', 'span', 'div', 'figure', 'figcaption',
      'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
    ],
    ALLOWED_ATTR: [
      'href', 'title', 'target', 'rel', 'src', 'alt', 'width', 'height',
      'class', 'colspan', 'rowspan', 'loading',
    ],
    FORBID_TAGS: ['style', 'script', 'iframe', 'object', 'embed', 'form', 'input', 'button', 'textarea', 'select'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur', 'style'],
  });
}

export default sanitizeHtml;
