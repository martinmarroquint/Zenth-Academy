// front/src/pages/EstudianteCursoDetalle.jsx
// DETALLE DE CURSO PARA ESTUDIANTE - RUTA /estudiante/cursos/:id

import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DetalleCurso from '../components/cursos/DetalleCurso';
import { authService } from '../services/authService';

const EstudianteCursoDetalle = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const usuario = authService.getCurrentUser();

  return (
    <DetalleCurso
      cursoId={id}
      usuarioId={usuario?.id}
      onVolver={() => navigate('/estudiante/cursos')}
    />
  );
};

export default EstudianteCursoDetalle;