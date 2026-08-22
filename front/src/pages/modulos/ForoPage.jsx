// front/src/pages/modulos/ForoPage.jsx
// Página del módulo comunidad con sub-vistas (crear/ver publicación).

import React, { useState } from 'react';
import PanelForo from '../../components/comunidad/PanelForo';
import CrearPublicacion from '../../components/comunidad/CrearPublicacion';
import DetallePublicacion from '../../components/comunidad/DetallePublicacion';

const ForoPage = () => {
  const [creando, setCreando] = useState(false);
  const [publicacionViendo, setPublicacionViendo] = useState(null);

  if (publicacionViendo) {
    return (
      <DetallePublicacion
        publicacionId={publicacionViendo}
        onVolver={() => setPublicacionViendo(null)}
        onEditarPublicacion={() => {
          setPublicacionViendo(null);
          setCreando(true);
        }}
      />
    );
  }

  if (creando) {
    return (
      <CrearPublicacion
        onGuardar={() => setCreando(false)}
        onVolver={() => setCreando(false)}
      />
    );
  }

  return (
    <PanelForo
      onCrearPublicacion={() => setCreando(true)}
      onVerPublicacion={(id) => setPublicacionViendo(id)}
    />
  );
};

export default ForoPage;