// front/src/config/api.config.test.js
// Tests para la conversión de URLs de Google Drive.
//
// Regresión histórica:
//  1. `lh3.googleusercontent.com` devuelve HTTP 429 (rate-limit) → imágenes rotas.
//  2. `drive.google.com/thumbnail` funciona pero depende de la red del usuario.
// Solución final: nuestro backend hace de PROXY (`/media/drive/{id}`) y cachea.
import { describe, it, expect } from 'vitest';
import { convertGoogleDriveUrl, resolveImageUrl, API_CONFIG } from './api.config';

const FILE_ID = '1h4iudvyEspoNvUzz-iHax7l3l6sSI0sA';
const ESPERADO = `${API_CONFIG.BASE_URL}/media/drive/${FILE_ID}?sz=w2000`;

describe('convertGoogleDriveUrl', () => {
  it('convierte enlace /file/d/{id}/view al proxy', () => {
    expect(convertGoogleDriveUrl(`https://drive.google.com/file/d/${FILE_ID}/view?usp=sharing`))
      .toBe(ESPERADO);
  });

  it('convierte enlace /open?id={id}', () => {
    expect(convertGoogleDriveUrl(`https://drive.google.com/open?id=${FILE_ID}`))
      .toBe(ESPERADO);
  });

  it('convierte enlace /uc?id={id}&export=view', () => {
    expect(convertGoogleDriveUrl(`https://drive.google.com/uc?id=${FILE_ID}&export=view`))
      .toBe(ESPERADO);
  });

  it('convierte un thumbnail directo al proxy', () => {
    expect(convertGoogleDriveUrl(`https://drive.google.com/thumbnail?id=${FILE_ID}&sz=w1000`))
      .toBe(ESPERADO);
  });

  it('NO usa lh3.googleusercontent.com (rate-limited)', () => {
    const r = convertGoogleDriveUrl(`https://drive.google.com/file/d/${FILE_ID}/view`);
    expect(r).not.toContain('lh3.googleusercontent.com');
  });

  it('NO usa drive.google.com directo (depende de la red)', () => {
    const r = convertGoogleDriveUrl(`https://drive.google.com/file/d/${FILE_ID}/view`);
    expect(r).not.toContain('drive.google.com/thumbnail');
    expect(r).toContain('/media/drive/');
  });

  it('deja pasar una URL del proxy ya convertida', () => {
    const ya = `${API_CONFIG.BASE_URL}/media/drive/${FILE_ID}?sz=w2000`;
    expect(convertGoogleDriveUrl(ya)).toBe(ya);
  });

  it('devuelve la URL tal cual si no es Drive', () => {
    expect(convertGoogleDriveUrl('https://ejemplo.com/foto.jpg'))
      .toBe('https://ejemplo.com/foto.jpg');
  });

  it('maneja vacío/null', () => {
    expect(convertGoogleDriveUrl('')).toBe('');
    expect(convertGoogleDriveUrl(null)).toBe(null);
  });
});

describe('resolveImageUrl', () => {
  it('resuelve una URL de Drive al proxy', () => {
    expect(resolveImageUrl(`https://drive.google.com/file/d/${FILE_ID}/view`))
      .toBe(ESPERADO);
  });

  it('devuelve null si no hay URL', () => {
    expect(resolveImageUrl(null)).toBe(null);
    expect(resolveImageUrl('')).toBe(null);
  });

  it('deja pasar URLs absolutas normales', () => {
    expect(resolveImageUrl('https://ejemplo.com/x.png')).toBe('https://ejemplo.com/x.png');
  });
});
