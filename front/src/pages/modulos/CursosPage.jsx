// front/src/pages/modulos/CursosPage.jsx
// MANTENER IGUAL - NO CAMBIAR
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PanelCursos from '../../components/cursos/PanelCursos';
import CreadorCurso from '../../components/cursos/CreadorCurso';
import DetalleCurso from '../../components/cursos/DetalleCurso';

const CursosPage = () => {
  const navigate = useNavigate();
  const [vista, setVista] = useState('lista');
  const [cursoSeleccionado, setCursoSeleccionado] = useState(null);
  const [cursoIdDetalle, setCursoIdDetalle] = useState(null);

  const handleCrearCurso = () => {
    setCursoSeleccionado(null);
    setVista('crear');
  };

  const handleEditarCurso = (curso) => {
    setCursoSeleccionado(curso);
    setVista('editar');
  };

  const handleVerCurso = (cursoId) => {
    setCursoIdDetalle(cursoId);
    setVista('detalle');
  };

  const handleGuardarCurso = (cursoGuardado) => {
    setVista('lista');
  };

  const handleVolver = () => {
    setVista('lista');
    setCursoSeleccionado(null);
    setCursoIdDetalle(null);
  };

  const handleGenerarCertificado = () => {
    navigate('certificados');
  };

  return (
    <div className="min-h-screen bg-[#fbfbfa]">
      {vista === 'lista' && (
        <PanelCursos
          onCrearCurso={handleCrearCurso}
          onVerCurso={handleVerCurso}
          onEditarCurso={handleEditarCurso}
        />
      )}
      {vista === 'crear' && (
        <CreadorCurso
          onGuardar={handleGuardarCurso}
          onVolver={handleVolver}
        />
      )}
      {vista === 'editar' && (
        <CreadorCurso
          cursoInicial={cursoSeleccionado}
          onGuardar={handleGuardarCurso}
          onVolver={handleVolver}
        />
      )}
      {vista === 'detalle' && (
        <DetalleCurso
          cursoId={cursoIdDetalle}
          onVolver={handleVolver}
          onEditarCurso={handleEditarCurso}
          onGenerarCertificado={handleGenerarCertificado}
        />
      )}
    </div>
  );
};

export default CursosPage;