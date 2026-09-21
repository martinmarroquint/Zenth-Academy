// front/src/components/auth/SocialLoginButtons.jsx
// =====================================================
// LOGIN SOCIAL — UN SOLO FLUJO (Google Identity Services)
//
// Google devuelve un ID token que el backend valida con las claves públicas
// de Google y, si es válido, emite NUESTRO JWT. Tras validar, navega al panel
// por rol SIN recargar la página.
// =====================================================

import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { authService } from '../../services/authService';
import GoogleIdentityButton from './GoogleIdentityButton';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

const SocialLoginButtons = ({ onError, texto = 'o continúa con' }) => {
  const navigate = useNavigate();
  const [cargando, setCargando] = useState(false);

  // ✅ Pre-carga el panel de destino para que el ingreso sea instantáneo.
  useEffect(() => {
    const t = setTimeout(() => {
      import('../../pages/EstudianteCursos').catch(() => {});
      import('../../pages/DashboardDocente').catch(() => {});
      import('../../pages/DashboardAdmin').catch(() => {});
    }, 1200);
    return () => clearTimeout(t);
  }, []);

  const handleGoogleCredential = useCallback(async (credential) => {
    setCargando(true);
    const res = await authService.loginConGoogle(credential);
    if (res.success) {
      const rol = authService.getRol();
      const destino = rol === 'admin' ? '/admin' : rol === 'docente' ? '/docente' : '/estudiante';
      navigate(destino, { replace: true });
    } else {
      setCargando(false);
      onError?.(res.error || 'No se pudo iniciar sesión con Google');
    }
  }, [navigate, onError]);

  const handleGoogleError = useCallback((msg) => {
    onError?.(msg);
  }, [onError]);

  // Si no hay Client ID configurado, no se muestra nada.
  if (!GOOGLE_CLIENT_ID) return null;

  return (
    <div className="mt-6">
      {/* Overlay mientras el backend valida el token de Google */}
      {cargando && (
        <div className="fixed inset-0 z-[9999] bg-white/85 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#0f766e]" />
          <p className="text-sm font-medium text-gray-700">Iniciando sesión con Google…</p>
          <p className="text-xs text-gray-400">Validando tus credenciales</p>
        </div>
      )}

      <div className="relative mb-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200" />
        </div>
        <div className="relative flex justify-center">
          <span className="px-3 bg-white text-[11px] uppercase tracking-wide text-gray-400">{texto}</span>
        </div>
      </div>

      <div className="flex flex-col items-stretch gap-3">
        <div className="flex justify-center">
          <GoogleIdentityButton
            clientId={GOOGLE_CLIENT_ID}
            onCredential={handleGoogleCredential}
            onError={handleGoogleError}
          />
        </div>
      </div>
    </div>
  );
};

export default React.memo(SocialLoginButtons);
