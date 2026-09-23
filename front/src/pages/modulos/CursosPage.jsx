// front/src/pages/modulos/CursosPage.jsx
// Wrapper de panel/creador/detalle (admin, docente y modo estudiante)
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PanelCursos from '../../components/cursos/PanelCursos';
import CreadorCurso from '../../components/cursos/CreadorCurso';
import DetalleCurso from '../../components/cursos/DetalleCurso';
import { authService } from '../../services/authService';

const CursosPage = () => {
  const navigate = useNavigate();
  const [vista, setVista] = useState('lista');
  const [cursoSeleccionado, setCursoSeleccionado] = useState(null);
  const [cursoIdDetalle, setCursoIdDetalle] = useState(null);
  // ✅ Sin usuarioId, DetalleCurso no cargaba progreso ni completaba lecciones
  // (importante en modo estudiante que entre por /admin|/docente/cursos)
  const usuario = authService.getCurrentUser();

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

  const handleGuardarCurso = (_cursoGuardado) => {
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
          usuarioId={usuario?.id || null}
          onVolver={handleVolver}
          onEditarCurso={handleEditarCurso}
          onGenerarCertificado={handleGenerarCertificado}
        />
      )}
    </div>
  );
};

export default CursosPage;