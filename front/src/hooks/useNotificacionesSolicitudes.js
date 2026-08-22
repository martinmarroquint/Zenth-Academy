// front/src/hooks/useNotificacionesSolicitudes.js
// HOOK PARA OBTENER NOTIFICACIONES DE SOLICITUDES PENDIENTES

import { useState, useEffect, useCallback } from 'react';
import cursosService from '../services/cursosService';
import { authService } from '../services/authService';

export const useNotificacionesSolicitudes = () => {
  const [pendientes, setPendientes] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [solicitudes, setSolicitudes] = useState([]);

  const cargar = useCallback(async () => {
    const usuario = authService.getCurrentUser();
    if (!usuario || (usuario.rol !== 'admin' && usuario.rol !== 'docente')) {
      setCargando(false);
      return;
    }
    try {
      const data = await cursosService.solicitudesPendientes();
      const pendientesList = Array.isArray(data) ? data.filter(s => s.estado === 'pendiente') : [];
      setSolicitudes(pendientesList);
      setPendientes(pendientesList.length);
    } catch (e) {
      console.error('Error cargando notificaciones:', e);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
    // Recargar cada 60 segundos
    const interval = setInterval(cargar, 60000);
    return () => clearInterval(interval);
  }, [cargar]);

  return { 
    pendientes, 
    solicitudes, 
    cargando, 
    recargar: cargar 
  };
};