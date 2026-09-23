// front/src/components/certificados/certificateConfig.js
// CONFIGURACION DE DISENO DE CERTIFICADOS (templates, colores, textos)
// Se persiste en localStorage para que el docente no pierda su diseño.

export const TEMPLATE_DEFAULT = {
  template: 'clasico',
  color_primario: '#0f766e',
  color_acento: '#d4af37',
  logo_url: null,
  firma_nombre: '',
  firma_cargo: 'Instructor Certificado',
  texto_titulo: 'Certificado de Finalización',
  texto_parrafo: 'Por completar satisfactoriamente el curso',
  mostrar_nota: false,
  nota: null,
};

export const TEMPLATES = [
  { id: 'clasico', label: 'Clásico', desc: 'Bordes ornamentales y estilo tradicional' },
  { id: 'moderno', label: 'Moderno', desc: 'Barra lateral geométrica y limpia' },
  { id: 'academico', label: 'Académico', desc: 'Banda institucional y sello dorado' },
];

export const loadTemplateConfig = () => {
  try {
    const raw = localStorage.getItem('cert_template_config');
    if (raw) {
      return { ...TEMPLATE_DEFAULT, ...JSON.parse(raw) };
    }
  } catch {
    // localStorage corrupto o no disponible → usar defaults
  }
  return { ...TEMPLATE_DEFAULT };
};

export const saveTemplateConfig = (cfg) => {
  try {
    localStorage.setItem('cert_template_config', JSON.stringify(cfg || TEMPLATE_DEFAULT));
  } catch {
    // sin persistencia disponible (modo privado etc.)
  }
};

/**
 * Diseño propio de UN certificado (snapshot en metadata_extra.diseno).
 * Si el certificado no tiene diseño guardado, cae a DEFAULT (no al draft global)
 * para que un cambio de borrador no reescribe certs antiguos.
 */
export const getDisenoCertificado = (certificado) => {
  const guardado = certificado?.metadata_extra?.diseno;
  if (guardado && typeof guardado === 'object' && !Array.isArray(guardado)) {
    return { ...TEMPLATE_DEFAULT, ...guardado };
  }
  return { ...TEMPLATE_DEFAULT };
};

export const getValidacionUrl = (codigo) =>
  `${window.location.origin}/validar/${codigo}`;
