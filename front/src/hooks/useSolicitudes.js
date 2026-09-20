// src/hooks/useSolicitudes.js
import { useContext } from 'react';
import SolicitudesContext from '../context/SolicitudesContext';

export const useSolicitudes = () => {
  const ctx = useContext(SolicitudesContext);
  if (!ctx) {
    throw new Error('useSolicitudes debe usarse dentro de un SolicitudesProvider');
  }
  return ctx;
};

export default useSolicitudes;
