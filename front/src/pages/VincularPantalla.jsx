// front/src/pages/VincularPantalla.jsx
// =====================================================
// LANDING DEL ESCANEO DEL QR — "USB en la nube"
// El docente escanea con su celular (ya autenticado) el QR que muestra la
// pantalla del aula y desde acá autoriza ESA pantalla. Nunca se tipean
// credenciales en la máquina ajena.
// =====================================================

import React, { useEffect, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, FolderOpen, Loader2, LogIn, Monitor } from 'lucide-react';
import compartirService from '../services/compartirService';
import { authService } from '../services/authService';

const VincularPantalla = () => {
  const { codigo } = useParams();
  const [searchParams] = useSearchParams();
  const qrToken = searchParams.get('t');
  const pantallaSecret = searchParams.get('s');

  // Resultado del emparejamiento: null = todavía no respondió
  const [resultado, setResultado] = useState(null);
  const yaIntento = useRef(false);

  const autenticado = authService.isAuthenticated();
  const rol = authService.getRol();
  const rutaCarpeta = rol === 'admin' ? '/admin/materiales' : '/docente/materiales';
  const datosIncompletos = !qrToken || !pantallaSecret;

  // ✅ Estado derivado (sin setState dentro del efecto)
  const estado = !autenticado
    ? 'sin-sesion'
    : datosIncompletos
      ? 'qr-invalido'
      : !resultado
        ? 'cargando'
        : resultado.ok
          ? 'ok'
          : 'error';

  useEffect(() => {
    if (!autenticado || datosIncompletos || yaIntento.current) return;
    // El token del QR es de un solo uso: garantizamos UN único intento
    yaIntento.current = true;

    compartirService
      .vincular(codigo, qrToken, pantallaSecret)
      .then((data) => {
        setResultado(
          data?.ok
            ? { ok: true, expira: data.pantalla_expira || null }
            : { ok: false, mensaje: data?.mensaje || 'No se pudo vincular la pantalla' }
        );
      })
      .catch((e) => {
        setResultado({
          ok: false,
          mensaje: e?.message || 'No se pudo vincular la pantalla',
        });
      });
  }, [autenticado, datosIncompletos, codigo, qrToken, pantallaSecret]);

  const horaExpira = (() => {
    if (!resultado?.expira) return null;
    try {
      return new Date(resultado.expira).toLocaleTimeString();
    } catch {
      return null;
    }
  })();

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
      <div className="w-full max-w-md text-center">
        <div className="flex items-center justify-center gap-2 text-gray-400 mb-6">
          <Monitor className="w-4 h-4" />
          <span className="text-sm font-medium">Compartir en clase</span>
        </div>

        {estado === 'cargando' && (
          <div className="bg-gray-900 border border-gray-800 rounded-3xl p-8">
            <Loader2 className="w-10 h-10 animate-spin text-[#0f766e] mx-auto mb-4" />
            <p className="text-white font-semibold">Vinculando la pantalla…</p>
            <p className="text-sm text-gray-400 mt-1">Sala {codigo}</p>
          </div>
        )}

        {estado === 'ok' && (
          <div className="bg-gray-900 border border-emerald-800/60 rounded-3xl p-8">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            </div>
            <h1 className="text-xl font-bold text-white mb-2">Pantalla vinculada</h1>
            <p className="text-sm text-gray-400 mb-1">
              La pantalla del aula ya está conectada a tu carpeta.
            </p>
            {horaExpira && (
              <p className="text-xs text-gray-500 mb-5">La sesión expira a las {horaExpira}.</p>
            )}
            <Link
              to={rutaCarpeta}
              className="inline-flex items-center gap-2 px-5 py-3 bg-[#0f766e] hover:bg-[#0d5e57] text-white rounded-2xl font-semibold transition-colors"
            >
              <FolderOpen className="w-5 h-5" />
              Ir a mi carpeta
            </Link>
            <p className="text-xs text-gray-500 mt-4">
              Desde <span className="text-gray-300">Mostrar en pantalla</span> elegís qué ve el aula.
            </p>
          </div>
        )}

        {estado === 'sin-sesion' && (
          <div className="bg-gray-900 border border-gray-800 rounded-3xl p-8">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center mx-auto mb-5">
              <LogIn className="w-8 h-8 text-amber-400" />
            </div>
            <h1 className="text-xl font-bold text-white mb-2">Iniciá sesión para vincular</h1>
            <p className="text-sm text-gray-400 mb-6">
              Necesitás tu cuenta para autorizar la pantalla. Después, volvé a escanear el QR
              que muestra el aula.
            </p>
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-5 py-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-semibold transition-colors"
            >
              <LogIn className="w-5 h-5" />
              Iniciar sesión
            </Link>
          </div>
        )}

        {estado === 'qr-invalido' && (
          <div className="bg-gray-900 border border-gray-800 rounded-3xl p-8">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center mx-auto mb-5">
              <AlertTriangle className="w-8 h-8 text-amber-400" />
            </div>
            <h1 className="text-xl font-bold text-white mb-2">Enlace incompleto</h1>
            <p className="text-sm text-gray-400">
              Este enlace no trae los datos del QR. Escaneá el QR que muestra la pantalla del aula.
            </p>
          </div>
        )}

        {estado === 'error' && (
          <div className="bg-gray-900 border border-gray-800 rounded-3xl p-8">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-5">
              <AlertTriangle className="w-8 h-8 text-red-400" />
            </div>
            <h1 className="text-xl font-bold text-white mb-2">No se pudo vincular</h1>
            <p className="text-sm text-gray-400 mb-6">{resultado?.mensaje}</p>
            <p className="text-xs text-gray-500">
              Escaneá el QR actualizado que muestra la pantalla del aula.
            </p>
          </div>
        )}

        <Link to="/" className="inline-block mt-6 text-xs text-gray-500 hover:text-gray-300 transition-colors">
          Volver al inicio
        </Link>
      </div>
    </div>
  );
};

export default VincularPantalla;
