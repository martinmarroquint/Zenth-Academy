// front/src/pages/modulos/CuestionariosPage.jsx
// Página del módulo de cuestionarios con sub-vistas (crear/editar).

import React, { useState } from 'react';
import PanelCuestionarios from '../../components/cuestionarios/PanelCuestionarios';
import CreadorCuestionario from '../../components/cuestionarios/CreadorCuestionario';

const CuestionariosPage = () => {
  const [modo, setModo] = useState(null); // null | 'crear' | 'editar'
  const [editando, setEditando] = useState(null);
  const [recargar, setRecargar] = useState(false);

  const volver = () => {
    setModo(null);
    setEditando(null);
  };

  if (modo === 'crear' || modo === 'editar') {
    return (
      <CreadorCuestionario
        cuestionario={editando}
        onGuardar={() => {
          volver();
          setRecargar((r) => !r);
        }}
        onVolver={volver}
        empresaId="default"
      />
    );
  }

  return (
    <PanelCuestionarios
      empresaId="default"
      onEditar={(cuestionario) => {
        setEditando(cuestionario || null);
        setModo(cuestionario ? 'editar' : 'crear');
      }}
      key={recargar}
    />
  );
};

export default CuestionariosPage;