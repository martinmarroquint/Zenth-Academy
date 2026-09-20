// front/src/components/auth/GoogleIdentityButton.jsx
// =====================================================
// BOTÓN DE GOOGLE (Google Identity Services)
//
// Carga el script oficial de Google y renderiza su botón. Al autenticarse,
// Google devuelve un ID token (credential) que enviamos al backend para que
// lo valide con las claves públicas de Google y emita NUESTRO JWT.
//
// ✅ Responsive: el ancho del botón se calcula según el contenedor (Google
// exige un ancho en px), así no se desborda en celulares.
// =====================================================

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Loader2 } from 'lucide-react';

const GSI_SRC = 'https://accounts.google.com/gsi/client';

const GoogleIdentityButton = ({ clientId, onCredential, onError }) => {
  const wrapperRef = useRef(null);
  const contenedorRef = useRef(null);
  const [cargando, setCargando] = useState(true);

  const anchoDisponible = useCallback(() => {
    const w = wrapperRef.current?.clientWidth || 320;
    // Google acepta entre 200 y 400 px
    return Math.max(200, Math.min(Math.floor(w), 400));
  }, []);

  useEffect(() => {
    if (!clientId) return undefined;
    let cancelado = false;
    let reintentos = 0;

    const renderizar = () => {
      if (cancelado) return;
      if (!window.google?.accounts?.id) {
        if (reintentos++ < 40) {
          setTimeout(renderizar, 200);
        } else {
          setCargando(false);
          onError?.('No se pudo cargar Google. Revisa tu conexión.');
        }
        return;
      }

      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response) => {
          if (response?.credential) {
            onCredential(response.credential);
          } else {
            onError?.('Google no devolvió credencial');
          }
        },
      });

      if (contenedorRef.current) {
        window.google.accounts.id.renderButton(contenedorRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          shape: 'pill',
          text: 'continue_with',
          logo_alignment: 'left',
          width: anchoDisponible(),
        });
      }
      setCargando(false);
    };

    if (document.getElementById('gsi-client')) {
      renderizar();
    } else {
      const script = document.createElement('script');
      script.id = 'gsi-client';
      script.src = GSI_SRC;
      script.async = true;
      script.defer = true;
      script.onload = renderizar;
      script.onerror = () => {
        if (!cancelado) {
          setCargando(false);
          onError?.('No se pudo cargar Google Identity Services');
        }
      };
      document.head.appendChild(script);
    }

    // Re-renderizar al cambiar el tamaño (el ancho depende del contenedor)
    const onResize = () => {
      if (!cancelado && window.google?.accounts?.id) renderizar();
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelado = true;
      window.removeEventListener('resize', onResize);
    };
  }, [clientId, onCredential, onError, anchoDisponible]);

  return (
    <div ref={wrapperRef} className="w-full flex flex-col items-center gap-2">
      <div ref={contenedorRef} className="max-w-full" />
      {cargando && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
    </div>
  );
};

export default React.memo(GoogleIdentityButton);
