// src/test/setup.js
// Configuración global de Vitest + Testing Library
import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Limpieza automática del DOM entre tests
afterEach(() => {
  cleanup();
});
