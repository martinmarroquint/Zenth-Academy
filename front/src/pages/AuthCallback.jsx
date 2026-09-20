// front/src/pages/AuthCallback.jsx
// =====================================================
// RETORNO DEL LOGIN SOCIAL (Google / Microsoft)
//
// El backend nos redirige aquí con los tokens en la query string.
// Guardamos la sesión, cargamos el perfil y llevamos al dashboard
// según el rol. Muestra un estado de carga profesional.
// =====================================================

import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { authService } from '../services/authService';

const AuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [estado, setEstado] = useState('procesando'); // procesando | ok | error
  const [mensaje, setMensaje] = useState('');
  const yaProcesado = useRef(false);

  useEffect(() => {
    // Evita el doble procesamiento de StrictMode
    if (yaProcesado.current) return;
    yaProcesado.current = true;

    const procesar = async () => {
      const error = searchParams.get('error');
      if (error) {
        const mensajes = {
          cancelado: 'Cancelaste el inicio de sesión.',
          oauth_fallido: 'No se pudo completar el inicio de sesión con el proveedor.',
          sesion_expirada: 'La sesión expiró. Intenta de nuevo.',
          usuario_inactivo: 'Tu cuenta está inactiva. Contacta al administrador.',
          proveedor_invalido: 'Proveedor no válido.',
          parametros_faltantes: 'Faltan datos para completar el inicio de sesión.',
        };
        setEstado('error');
        setMensaje(mensajes[error] || 'No se pudo iniciar sesión.');
        setTimeout(() => navigate('/', { replace: true }), 3000);
        return;
      }

      const resultado = await authService.procesarCallbackOAuth(searchParams);

      if (!resultado.success) {
        setEstado('error');
        setMensaje(resultado.error || 'No se pudo iniciar sesión.');
        setTimeout(() => navigate('/', { replace: true }), 3000);
        return;
      }

      setEstado('ok');
      setMensaje('¡Bienvenido! Redirigiendo…');

      const rol = resultado.user?.rol || authService.getRol();
      const destino = resultado.redirect;
      const ruta = destino || (rol === 'admin' ? '/admin' : rol === 'docente' ? '/docente' : '/estudiante');

      setTimeout(() => navigate(ruta, { replace: true }), 700);
    };

    procesar();
  }, [navigate, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8f9fa] px-4">
      <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm p-8 w-full max-w-sm text-center">
        {estado === 'procesando' && (
          <>
            <Loader2 className="w-10 h-10 animate-spin text-[#0f766e] mx-auto mb-4" />
            <p className="text-sm font-medium text-gray-700">Iniciando sesión…</p>
            <p className="text-xs text-gray-400 mt-1">Estamos validando tu cuenta</p>
          </>
        )}

        {estado === 'ok' && (
          <>
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-4" />
            <p className="text-sm font-medium text-gray-700">{mensaje}</p>
          </>
        )}

        {estado === 'error' && (
          <>
            <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-4" />
            <p className="text-sm font-medium text-gray-700">{mensaje}</p>
            <p className="text-xs text-gray-400 mt-1">Volviendo al inicio de sesión…</p>
          </>
        )}
      </div>
    </div>
  );
};

export default AuthCallback;
