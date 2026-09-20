// src/utils/sanitize.test.js
// Tests de seguridad XSS para sanitizeHtml
import { describe, it, expect } from 'vitest';
import { sanitizeHtml } from './sanitize';

describe('sanitizeHtml', () => {
  it('preserva HTML normal', () => {
    expect(sanitizeHtml('<p>Hola</p>')).toBe('<p>Hola</p>');
  });

  it('preserva etiquetas de formato y atributos permitidos', () => {
    const result = sanitizeHtml('<strong>Hola</strong> <a href="https://x.com" target="_blank">link</a>');
    expect(result).toContain('<strong>Hola</strong>');
    expect(result).toContain('href="https://x.com"');
    expect(result).toContain('target="_blank"');
  });

  it('elimina etiquetas <script>', () => {
    const result = sanitizeHtml('<script>alert(1)</script>');
    expect(result).not.toContain('<script');
    expect(result).not.toContain('alert(1)');
  });

  it('elimina handlers inline onerror/onclick', () => {
    expect(sanitizeHtml('<img src=x onerror=alert(1)>')).not.toContain('onerror');
    expect(sanitizeHtml('<div onclick="alert(1)">x</div>')).not.toContain('onclick');
  });

  it('elimina <iframe>', () => {
    const result = sanitizeHtml('<iframe src="https://evil.com"></iframe>');
    expect(result).not.toContain('<iframe');
  });

  it('devuelve cadena vacía para entradas vacías/null/undefined', () => {
    expect(sanitizeHtml('')).toBe('');
    expect(sanitizeHtml(null)).toBe('');
    expect(sanitizeHtml(undefined)).toBe('');
  });

  it('devuelve cadena vacía para entradas no-string', () => {
    expect(sanitizeHtml(123)).toBe('');
    expect(sanitizeHtml({})).toBe('');
    expect(sanitizeHtml([])).toBe('');
    expect(sanitizeHtml(true)).toBe('');
  });
});
