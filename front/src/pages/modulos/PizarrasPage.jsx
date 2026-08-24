// front/src/pages/modulos/PizarrasPage.jsx
// Página del módulo de pizarras con sub-vistas (abrir/crear pizarra).

import React, { useState } from 'react';
import PanelPizarras from '../../components/pizarra/PanelPizarras';
import PizarraInteractiva from '../../components/pizarra/PizarraInteractiva';
import pizarraService from '../../services/pizarraService';
import { authService } from '../../services/authService';

const PizarrasPage = () => {
  const [pizarraAbierta, setPizarraAbierta] = useState(null);
  const [pizarraInfo, setPizarraInfo] = useState(null);
  const usuario = authService.getCurrentUser();
  const usuarioId = usuario?.id || 'default';

  const abrirPizarra = async (id) => {
    // Obtener info de la pizarra para tener el título
    try {
      const info = await pizarraService.obtener(id);
      setPizarraInfo(info);
    } catch (e) {
      console.warn('No se pudo obtener info de la pizarra:', e);
      setPizarraInfo(null);
    }
    setPizarraAbierta(id);
  };

  const crearPizarra = async () => {
    try {
      const creada = await pizarraService.crear({
        titulo: 'Pizarra sin título',
        descripcion: '',
        tipo: 'blanca',
        creado_por: usuarioId,
        es_publica: false,
      });
      if (creada?.id) {
        setPizarraInfo(creada);
        setPizarraAbierta(creada.id);
      } else {
        // Si no retorna id, dejar que PizarraInteractiva la cree
        setPizarraAbierta('nueva');
      }
    } catch (e) {
      console.error('Error creando pizarra:', e);
      setPizarraAbierta('nueva');
    }
  };

  if (pizarraAbierta) {
    return (
      <div className="h-[calc(100vh-3.5rem)]">
        <PizarraInteractiva
          pizarraId={pizarraAbierta === 'nueva' ? null : pizarraAbierta}
          usuario={{ id: usuarioId, nombre: usuario?.nombres || 'Docente' }}
          rol="EDITOR"
          titulo={pizarraInfo?.titulo || 'Pizarra sin título'}
          onCerrar={() => {
            setPizarraAbierta(null);
            setPizarraInfo(null);
          }}
        />
      </div>
    );
  }

  return (
    <PanelPizarras
      usuarioId={usuarioId}
      onAbrirPizarra={abrirPizarra}
      onCrearPizarra={crearPizarra}
    />
  );
};

export default PizarrasPage;