// front/src/context/ModoContext.jsx
// =====================================================
// MODO ACTIVO (Docente ⇄ Estudiante)
//
// admin y docente pueden alternar entre su panel de gestión y el área de
// estudiante (para inscribirse y llevar cursos como alumno).
//
// El modo se DERIVA de la URL (no de un estado aparte) para que nunca se
// desincronice: si estás en /estudiante/* el modo es "estudiante".
// Un estudiante puro siempre está en modo estudiante.
//
// El hook `useModo` vive en hooks/useModo.js (patrón react-refresh).
// =====================================================

import React, { createContext, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';

const ModoContext = createContext(null);

export const ModoProvider = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const rol = authService.getRol();
  const puedeAlternar = rol === 'admin' || rol === 'docente';

  const enAreaEstudiante = location.pathname.startsWith('/estudiante');
  const modo = puedeAlternar ? (enAreaEstudiante ? 'estudiante' : 'docente') : 'estudiante';
  const esModoEstudiante = modo === 'estudiante';

  const setModo = useCallback((nuevo) => {
    if (!puedeAlternar) return;
    navigate(nuevo === 'estudiante' ? '/estudiante' : `/${rol}`);
  }, [puedeAlternar, navigate, rol]);

  return (
    <ModoContext.Provider value={{ modo, setModo, esModoEstudiante, puedeAlternar, rol }}>
      {children}
    </ModoContext.Provider>
  );
};

export default ModoContext;
