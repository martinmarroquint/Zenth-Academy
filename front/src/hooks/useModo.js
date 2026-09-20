// front/src/hooks/useModo.js
// Hook para leer/alternar el MODO activo (Docente ⇄ Estudiante).
import { useContext } from 'react';
import ModoContext from '../context/ModoContext';

export const useModo = () => {
  const ctx = useContext(ModoContext);
  if (!ctx) {
    throw new Error('useModo debe usarse dentro de ModoProvider');
  }
  return ctx;
};

export default useModo;
