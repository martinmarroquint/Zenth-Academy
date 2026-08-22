// front/src/pages/modulos/PizarrasPage.jsx
// Página del módulo de pizarras con sub-vistas (abrir/crear pizarra).

import React, { useState } from 'react';
import PanelPizarras from '../../components/pizarra/PanelPizarras';
import PizarraInteractiva from '../../components/pizarra/PizarraInteractiva';
import pizarraService from '../../services/pizarraService';
import { authService } from '../../services/authService';

const PizarrasPage = () => {
  const [pizarraAbierta, setPizarraAbierta] = useState(null);
  const usuario = authService.getCurrentUser();
  const usuarioId = usuario?.id || 'default';

  if (pizarraAbierta) {
    return (
      <div className="h-[calc(100vh-58px)]">
        <PizarraInteractiva
          pizarraId={pizarraAbierta === 'nueva' ? null : pizarraAbierta}
          usuario={{ id: usuarioId, nombre: usuario?.nombres || 'Docente' }}
          rol="EDITOR"
          onCerrar={() => setPizarraAbierta(null)}
        />
      </div>
    );
  }

  return (
    <PanelPizarras
      usuarioId={usuarioId}
      onAbrirPizarra={(id) => setPizarraAbierta(id)}
      onCrearPizarra={async () => {
        try {
          const creada = await pizarraService.crear({
            titulo: 'Pizarra sin título',
            descripcion: '',
            tipo: 'blanca',
            creado_por: usuarioId,
            es_publica: false,
          });
          setPizarraAbierta(creada?.id || 'nueva');
        } catch (e) {
          console.error('Error creando pizarra:', e);
          setPizarraAbierta('nueva');
        }
      }}
    />
  );
};

export default PizarrasPage;