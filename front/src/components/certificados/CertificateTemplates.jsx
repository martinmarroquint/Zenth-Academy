// front/src/components/certificados/CertificateTemplates.jsx
// VISTA PREVIA HTML/CSS DEL CERTIFICADO (usado en Ver y Generar)
// 3 plantillas: clasico | moderno | academico
import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { getValidacionUrl } from './certificateConfig';

// =============================================
// PIEZAS COMPARTIDAS
// =============================================

const Marca = ({ config, claro = false }) => (
  <div className="flex items-center justify-center gap-2">
    {config.logo_url ? (
      <img
        src={config.logo_url}
        alt="Zenth Academy"
        className="h-8 max-w-[110px] object-contain"
        onError={(e) => { e.currentTarget.style.display = 'none'; }}
      />
    ) : null}
    <span
      className={`text-[11px] font-semibold tracking-[0.25em] uppercase ${
        claro ? 'text-white' : 'text-gray-700'
      }`}
    >
      Zenth Academy
    </span>
  </div>
);

const BloqueFirma = ({ config }) => (
  <div className="min-w-[130px] max-w-[170px] text-center">
    <div
      className="w-full border-t mb-1.5 mx-auto"
      style={{ borderColor: config.color_acento }}
    />
    <p className="text-[11px] font-semibold text-gray-800 truncate">
      {config.firma_nombre || '________________'}
    </p>
    <p className="text-[9px] text-gray-500 truncate">
      {config.firma_cargo || 'Instructor Certificado'}
    </p>
  </div>
);

const BloqueFecha = ({ fechaEmision }) => (
  <div className="text-center">
    <p className="text-[8px] uppercase tracking-[0.2em] text-gray-400 mb-0.5">
      Fecha de emisión
    </p>
    <p className="text-[11px] text-gray-700">{fechaEmision}</p>
  </div>
);

const BloqueQR = ({ codigo }) => (
  <div className="flex flex-col items-center">
    <QRCodeSVG
      value={getValidacionUrl(codigo)}
      size={64}
      level="M"
      bgColor="#ffffff"
      fgColor="#0f172a"
    />
    <span className="text-[8px] text-gray-500 mt-1">Escanee para verificar</span>
    <span className="font-mono text-[8px] text-gray-500 mt-0.5">
      Código: {codigo}
    </span>
  </div>
);

const ContenidoCentral = ({ config, certificado, izquierda = false }) => {
  const estudiante = certificado?.estudiante_nombre || 'Nombre del estudiante';
  const curso = certificado?.curso_titulo || 'Título del curso';
  const mostrarNota = config.mostrar_nota && config.nota != null;

  return (
    <div className={`min-w-0 max-w-full ${izquierda ? 'text-left' : 'text-center'}`}>
      {izquierda && (
        <div
          className="w-12 h-[3px] mb-3"
          style={{ background: config.color_acento }}
        />
      )}
      <h1
        className={`text-[21px] font-bold leading-tight ${izquierda ? '' : 'text-center'}`}
        style={{ color: config.color_primario }}
      >
        {config.texto_titulo}
      </h1>
      <p className="text-[9px] tracking-[0.35em] uppercase text-gray-400 mt-3">
        Otorgado a
      </p>
      <p className="text-[26px] font-bold text-gray-900 mt-1 leading-tight break-words w-full">
        {estudiante}
      </p>
      {!izquierda && (
        <div
          className="w-28 h-px mx-auto my-2.5"
          style={{ background: config.color_acento }}
        />
      )}
      <p className="text-[11px] text-gray-500 italic">{config.texto_parrafo}</p>
      <p
        className="text-[15px] font-semibold mt-1 break-words"
        style={{ color: config.color_primario }}
      >
        {curso}
      </p>
      {mostrarNota && (
        <p className="text-[11px] text-gray-600 mt-1.5">
          Calificación: {config.nota}
        </p>
      )}
    </div>
  );
};

const FooterComun = ({ config, fechaEmision, codigo }) => (
  <div className="grid grid-cols-3 items-end w-full">
    <div className="justify-self-start">
      <BloqueFirma config={config} />
    </div>
    <div className="justify-self-center">
      <BloqueFecha fechaEmision={fechaEmision} />
    </div>
    <div className="justify-self-end">
      <BloqueQR codigo={codigo} />
    </div>
  </div>
);

// =============================================
// PLANTILLA CLASICO
// =============================================

const ClasicoTemplate = ({ certificado, config, fechaEmision }) => (
  <div
    data-certificado
    className="certificado-print relative w-full bg-white overflow-hidden font-serif shadow-sm"
    style={{ aspectRatio: '1.414 / 1' }}
  >
    {/* Borde doble ornamentado */}
    <div
      className="absolute inset-0 border-[6px] pointer-events-none"
      style={{ borderColor: config.color_primario }}
    />
    <div
      className="absolute inset-[9px] border-2 pointer-events-none"
      style={{ borderColor: config.color_primario }}
    />
    <div
      className="absolute inset-[15px] border pointer-events-none"
      style={{ borderColor: config.color_acento }}
    />
    {/* Esquinas decorativas */}
    <span
      className="absolute top-[22px] left-[22px] text-sm leading-none"
      style={{ color: config.color_acento }}
    >◆</span>
    <span
      className="absolute top-[22px] right-[22px] text-sm leading-none"
      style={{ color: config.color_acento }}
    >◆</span>
    <span
      className="absolute bottom-[22px] left-[22px] text-sm leading-none"
      style={{ color: config.color_acento }}
    >◆</span>
    <span
      className="absolute bottom-[22px] right-[22px] text-sm leading-none"
      style={{ color: config.color_acento }}
    >◆</span>

    <div className="relative h-full flex flex-col items-center px-14 pt-7 pb-6">
      <Marca config={config} />
      <div
        className="w-24 h-px my-2"
        style={{ background: config.color_acento }}
      />
      <div className="flex-1 flex flex-col items-center justify-center min-h-0 w-full">
        <ContenidoCentral config={config} certificado={certificado} />
      </div>
      <FooterComun
        config={config}
        fechaEmision={fechaEmision}
        codigo={certificado?.codigo || ''}
      />
    </div>
  </div>
);

// =============================================
// PLANTILLA MODERNO
// =============================================

const ModernoTemplate = ({ certificado, config, fechaEmision }) => (
  <div
    data-certificado
    className="certificado-print relative w-full bg-white overflow-hidden font-sans shadow-sm"
    style={{ aspectRatio: '1.414 / 1' }}
  >
    {/* Barra de acento izquierda */}
    <div
      className="absolute left-0 top-0 bottom-0 w-3"
      style={{ background: config.color_primario }}
    />
    {/* Formas geométricas sutiles */}
    <div
      className="absolute -right-12 -top-12 w-40 h-40 rounded-full opacity-[0.08] pointer-events-none"
      style={{ background: config.color_primario }}
    />
    <div
      className="absolute -right-6 bottom-20 w-24 h-24 rounded-full opacity-[0.1] pointer-events-none"
      style={{ background: config.color_acento }}
    />

    <div className="relative h-full flex flex-col pl-10 pr-8 py-6">
      <div className="flex items-center justify-between">
        <Marca config={config} />
        <div
          className="h-[3px] w-16"
          style={{ background: config.color_acento }}
        />
      </div>
      <div className="flex-1 flex flex-col justify-center min-h-0 pt-2">
        <ContenidoCentral config={config} certificado={certificado} izquierda />
      </div>
      <FooterComun
        config={config}
        fechaEmision={fechaEmision}
        codigo={certificado?.codigo || ''}
      />
    </div>
  </div>
);

// =============================================
// PLANTILLA ACADEMICO
// =============================================

const AcademicoTemplate = ({ certificado, config, fechaEmision }) => (
  <div
    data-certificado
    className="certificado-print relative w-full bg-white overflow-hidden font-serif shadow-sm flex flex-col"
    style={{ aspectRatio: '1.414 / 1' }}
  >
    {/* Banda institucional oscura */}
    <div
      className="h-[72px] shrink-0 px-10 flex items-center justify-between"
      style={{ background: config.color_primario }}
    >
      <Marca config={config} claro />
      <span className="text-[9px] tracking-[0.35em] uppercase text-white/70">
        Certificación oficial
      </span>
    </div>
    {/* Sello dorado */}
    <div
      className="absolute right-8 top-16 w-14 h-14 rounded-full flex flex-col items-center justify-center shadow-md z-10"
      style={{ background: config.color_acento }}
    >
      <span className="text-[7px] font-bold text-white tracking-widest">ZENTH</span>
      <span className="text-[11px] text-white leading-none mt-0.5">★</span>
    </div>

    <div className="relative flex-1 min-h-0 flex flex-col px-12 pt-10 pb-6">
      <div className="flex-1 flex flex-col items-center justify-center min-h-0 w-full">
        <ContenidoCentral config={config} certificado={certificado} />
      </div>
      <FooterComun
        config={config}
        fechaEmision={fechaEmision}
        codigo={certificado?.codigo || ''}
      />
    </div>
  </div>
);

// =============================================
// COMPONENTE PRINCIPAL
// =============================================

const CertificateTemplates = ({ certificado, config, fechaEmision }) => {
  const cfg = config || {};
  const plantilla = cfg.template || 'clasico';

  if (plantilla === 'moderno') {
    return (
      <ModernoTemplate
        certificado={certificado}
        config={cfg}
        fechaEmision={fechaEmision}
      />
    );
  }
  if (plantilla === 'academico') {
    return (
      <AcademicoTemplate
        certificado={certificado}
        config={cfg}
        fechaEmision={fechaEmision}
      />
    );
  }
  return (
    <ClasicoTemplate
      certificado={certificado}
      config={cfg}
      fechaEmision={fechaEmision}
    />
  );
};

export default CertificateTemplates;
