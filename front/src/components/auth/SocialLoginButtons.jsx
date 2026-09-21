// front/src/components/auth/SocialLoginButtons.jsx
// =====================================================
// BOTONES DE LOGIN SOCIAL (Google / Microsoft)
//
// - Google: usa Google Identity Services (ID token) si hay VITE_GOOGLE_CLIENT_ID.
//   El backend valida el token y emite NUESTRO JWT.
// - Microsoft: usa el flujo de redirección del backend (si está configurado).
//
// El botón de Google se muestra de inmediato (no espera al backend). Tras
// validar, navega al panel por rol SIN recargar toda la página.
// =====================================================

import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { authService } from '../../services/authService';
import GoogleIdentityButton from './GoogleIdentityButton';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

const GoogleLogo = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.57c2.08-1.92 3.27-4.74 3.27-8.09Z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.76c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
    <path fill="#FBBC05" d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84Z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.05l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z" />
  </svg>
);

const MicrosoftLogo = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#F25022" d="M2 2h9.5v9.5H2z" />
    <path fill="#7FBA00" d="M12.5 2H22v9.5h-9.5z" />
    <path fill="#00A4EF" d="M2 12.5h9.5V22H2z" />
    <path fill="#FFB900" d="M12.5 12.5H22V22h-9.5z" />
  </svg>
);

const SocialLoginButtons = ({ onError, texto = 'o continúa con' }) => {
  const navigate = useNavigate();
  const [proveedores, setProveedores] = useState({ google: false, microsoft: false });
  const [cargando, setCargando] = useState(false);
  const [listo, setListo] = useState(false);

  const usaGoogleGis = !!GOOGLE_CLIENT_ID;

  useEffect(() => {
    let activo = true;
    authService.obtenerProveedoresOAuth().then((p) => {
      if (activo) {
        setProveedores(p);
        setListo(true);
      }
    });
    return () => { activo = false; };
  }, []);

  // ✅ Pre-carga el panel de destino (tras cargar lo crítico) para que el
  // ingreso sea instantáneo: el chunk ya está descargado cuando navegamos.
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
      // ✅ Navegación SPA (sin recargar la página) → ingreso inmediato
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

  const iniciarRedirect = (provider) => {
    setCargando(provider);
    try {
      authService.iniciarOAuth(provider);
    } catch {
      setCargando(false);
      onError?.(`No se pudo iniciar sesión con ${provider}`);
    }
  };

  const muestraGoogleRedirect = !usaGoogleGis && proveedores.google;
  // ✅ El botón de Google aparece de inmediato (no espera a /oauth/providers).
  const hayAlguno = usaGoogleGis || (listo && (muestraGoogleRedirect || proveedores.microsoft));
  if (!hayAlguno) return null;

  const baseBtn =
    'flex-1 flex items-center justify-center gap-2.5 px-4 py-3 text-sm font-medium rounded-xl border transition-all disabled:opacity-50 disabled:cursor-not-allowed';

  return (
    <div className="mt-6">
      {/* Overlay mientras el backend valida el token de Google */}
      {cargando === 'google' && usaGoogleGis && (
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
        {usaGoogleGis && (
          <div className="flex justify-center">
            <GoogleIdentityButton
              clientId={GOOGLE_CLIENT_ID}
              onCredential={handleGoogleCredential}
              onError={handleGoogleError}
            />
          </div>
        )}

        {muestraGoogleRedirect && (
          <button
            type="button"
            onClick={() => iniciarRedirect('google')}
            disabled={!!cargando}
            className={`${baseBtn} border-gray-200 text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-300`}
          >
            {cargando === 'google' ? <Loader2 className="w-5 h-5 animate-spin" /> : <GoogleLogo />}
            Google
          </button>
        )}

        {proveedores.microsoft && (
          <button
            type="button"
            onClick={() => iniciarRedirect('microsoft')}
            disabled={!!cargando}
            className={`${baseBtn} border-gray-200 text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-300`}
          >
            {cargando === 'microsoft' ? <Loader2 className="w-5 h-5 animate-spin" /> : <MicrosoftLogo />}
            Microsoft
          </button>
        )}
      </div>
    </div>
  );
};

export default React.memo(SocialLoginButtons);
