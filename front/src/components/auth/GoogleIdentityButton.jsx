// front/src/components/auth/GoogleIdentityButton.jsx
// =====================================================
// BOTÓN DE GOOGLE (Google Identity Services)
//
// Carga el script oficial de Google y renderiza su botón. Al autenticarse,
// Google devuelve un ID token (credential) que enviamos al backend para que
// lo valide con las claves públicas de Google y emita NUESTRO JWT.
// =====================================================

import React, { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';

const GSI_SRC = 'https://accounts.google.com/gsi/client';

const GoogleIdentityButton = ({ clientId, onCredential, onError }) => {
  const contenedorRef = useRef(null);
  const [cargando, setCargando] = useState(true);

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
          width: 320,
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

    return () => { cancelado = true; };
  }, [clientId, onCredential, onError]);

  return (
    <div className="flex flex-col items-center gap-2">
      <div ref={contenedorRef} />
      {cargando && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
    </div>
  );
};

export default React.memo(GoogleIdentityButton);
