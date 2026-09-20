// front/src/context/SolicitudesContext.jsx
// PROVIDER CENTRALIZADO DE SOLICITUDES DE ACCESO
// Un solo polling (60s) compartido por todos los consumidores.
// Solo hace polling para usuarios autenticados con rol docente/admin.

import React, {
  createContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import { useLocation } from 'react-router-dom';
import cursosService from '../services/cursosService';
import { authService } from '../services/authService';

const INTERVALO_MS = 60000;
const ROLES_CON_ACCESO = ['admin', 'docente'];

const SolicitudesContext = createContext(null);

export const SolicitudesProvider = ({ children }) => {
  const location = useLocation();
  const [solicitudes, setSolicitudes] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);

  // Re-evaluamos el rol en cada navegación porque el provider vive por encima
  // de las rutas y no se remonta tras el login (que usa navigate, no recarga).
  const [rol, setRol] = useState(() => authService.getRol());

  useEffect(() => {
    setRol(authService.getRol());
  }, [location.pathname]);

  const tieneAcceso = ROLES_CON_ACCESO.includes(rol);

  const cargar = useCallback(async () => {
    if (!tieneAcceso) return;
    setCargando(true);
    try {
      const data = await cursosService.solicitudesPendientes();
      setSolicitudes(Array.isArray(data) ? data : []);
      setError(null);
    } catch (e) {
      // Manejo silencioso: no rompemos la UI si falla el polling.
      setError(e?.message || 'No se pudieron cargar las solicitudes');
    } finally {
      setCargando(false);
    }
  }, [tieneAcceso]);

  useEffect(() => {
    if (!tieneAcceso) {
      setSolicitudes([]);
      setCargando(false);
      setError(null);
      return undefined;
    }

    cargar();
    const interval = setInterval(cargar, INTERVALO_MS);
    return () => clearInterval(interval);
  }, [tieneAcceso, cargar]);

  const pendientes = useMemo(
    () => solicitudes.filter((s) => s.estado === 'pendiente').length,
    [solicitudes]
  );

  const value = useMemo(
    () => ({
      solicitudes,
      pendientes,
      cargando,
      error,
      refetch: cargar,
    }),
    [solicitudes, pendientes, cargando, error, cargar]
  );

  return (
    <SolicitudesContext.Provider value={value}>
      {children}
    </SolicitudesContext.Provider>
  );
};

export default SolicitudesContext;
