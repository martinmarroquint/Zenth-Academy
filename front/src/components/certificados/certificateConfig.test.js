// front/src/components/certificados/certificateConfig.test.js
import { describe, it, expect } from 'vitest';
import {
  TEMPLATE_DEFAULT,
  getDisenoCertificado,
} from './certificateConfig';

describe('getDisenoCertificado', () => {
  it('devuelve el diseño guardado del certificado', () => {
    const cert = {
      metadata_extra: {
        diseno: { template: 'moderno', color_primario: '#123456' },
      },
    };
    const cfg = getDisenoCertificado(cert);
    expect(cfg.template).toBe('moderno');
    expect(cfg.color_primario).toBe('123456'.length ? '#123456' : '');
    expect(cfg.color_acento).toBe(TEMPLATE_DEFAULT.color_acento);
  });

  it('sin diseño guardado cae a DEFAULT (no al draft global)', () => {
    const cfg = getDisenoCertificado({ metadata_extra: {} });
    expect(cfg).toEqual(TEMPLATE_DEFAULT);
  });

  it('metadata_extra malformado no revienta', () => {
    expect(getDisenoCertificado(null)).toEqual(TEMPLATE_DEFAULT);
    expect(getDisenoCertificado({ metadata_extra: { diseno: 'no-obj' } })).toEqual(
      TEMPLATE_DEFAULT
    );
    expect(getDisenoCertificado({ metadata_extra: { diseno: [] } })).toEqual(
      TEMPLATE_DEFAULT
    );
  });
});
