// front/src/pages/modulos/CertificadosPage.jsx
// Página del módulo de certificados con sub-vistas (generar/ver).

import React, { useState } from 'react';
import PanelCertificados from '../../components/certificados/PanelCertificados';
import GenerarCertificado from '../../components/certificados/GenerarCertificado';
import VerCertificado from '../../components/certificados/VerCertificado';

const CertificadosPage = () => {
  const [certificadoViendo, setCertificadoViendo] = useState(null);
  const [certificadoGenerando, setCertificadoGenerando] = useState(null);

  if (certificadoViendo) {
    return (
      <VerCertificado
        certificadoId={certificadoViendo}
        onVolver={() => setCertificadoViendo(null)}
      />
    );
  }

  if (certificadoGenerando) {
    return (
      <GenerarCertificado
        cursoId={certificadoGenerando}
        onVolver={() => setCertificadoGenerando(null)}
        onGenerado={() => setCertificadoGenerando(null)}
      />
    );
  }

  return (
    <PanelCertificados
      onGenerarCertificado={(cursoId) => setCertificadoGenerando(cursoId)}
      onVerCertificado={(id) => setCertificadoViendo(id)}
    />
  );
};

export default CertificadosPage;