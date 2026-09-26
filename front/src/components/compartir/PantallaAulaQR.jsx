// front/src/components/compartir/PantallaAulaQR.jsx
// =====================================================
// QR DE VINCULACIÓN VISIBLE EN EL LOGIN ("USB en la nube")
// La PC del aula abre la plataforma sin iniciar sesión: esta tarjeta crea una
// pantalla pendiente y muestra el QR. El docente lo escanea con su celular
// (ya autenticado) y desde ahí controla qué se muestra. Sin códigos ni
// credenciales en la máquina ajena.
// =====================================================

import React, { useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  CheckCircle2, ExternalLink, FileText, Link as LinkIcon, Loader2,
  Maximize2, Minimize2, Monitor, Phone, RefreshCw, Type,
} from 'lucide-react';
import compartirService from '../../services/compartirService';

const POLLING_MS = 2000;
const STORAGE_KEY = 'zenth_pantalla_aula';

// ✅ Secreto de esta pantalla: vive en memoria/sesión del navegador, nunca
// se guarda en el servidor (allí solo queda su hash al vincular).
const generarSecreto = () => {
  const bytes = new Uint8Array(24);
  if (window.crypto?.getRandomValues) {
    window.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
};

const leerSesion = () => {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    return data?.codigo && data?.secreto ? data : null;
  } catch {
    return null;
  }
};

const guardarSesion = (codigo, secreto) => {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ codigo, secreto }));
  } catch {
    // Sin sessionStorage: se genera una pantalla nueva en cada carga
  }
};

const limpiarSesion = () => {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // nada
  }
};

const IconoMaterial = ({ tipo }) => {
  if (tipo === 'enlace') return <LinkIcon className="w-5 h-5 text-blue-500" />;
  if (tipo === 'texto') return <Type className="w-5 h-5 text-violet-500" />;
  return <FileText className="w-5 h-5 text-emerald-500" />;
};

const PantallaAulaQR = () => {
  const secretoRef = useRef(null);
  if (secretoRef.current === null) {
    secretoRef.current = leerSesion()?.secreto || generarSecreto();
  }

  const [codigo, setCodigo] = useState(() => leerSesion()?.codigo || null);
  const [estado, setEstado] = useState(null);
  const [cargando, setCargando] = useState(!leerSesion());
  const [error, setError] = useState('');
  const [segundos, setSegundos] = useState(30);
  const [pantallaCompleta, setPantallaCompleta] = useState(false);
  const contenedorRef = useRef(null);

  // 1) Crear la pantalla pendiente (solo si no reusamos una de esta sesión)
  useEffect(() => {
    if (codigo) return;
    let activo = true;
    compartirService
      .crearPantalla(secretoRef.current)
      .then((data) => {
        if (!activo || !data?.codigo) return;
        guardarSesion(data.codigo, secretoRef.current);
        setEstado(data);
        setCodigo(data.codigo);
      })
      .catch((e) => {
        if (activo) setError(e?.message || 'No se pudo iniciar la pantalla');
      })
      .finally(() => {
        if (activo) setCargando(false);
      });
    return () => {
      activo = false;
    };
  }, [codigo]);

  // 2) Polling del estado (y cuenta regresiva del QR)
  useEffect(() => {
    if (!codigo) return undefined;
    let activo = true;

    const consultar = async () => {
      try {
        const data = await compartirService.estadoSala(codigo, secretoRef.current);
        if (!activo) return;
        setEstado(data);
        setError('');
        if (typeof data?.qr_restante === 'number') setSegundos(data.qr_restante);
      } catch (e) {
        if (activo) setError(e?.message || 'No se pudo actualizar la pantalla');
      } finally {
        if (activo) setCargando(false);
      }
    };

    consultar();
    const poll = setInterval(consultar, POLLING_MS);
    const tick = setInterval(() => {
      setSegundos((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => {
      activo = false;
      clearInterval(poll);
      clearInterval(tick);
    };
  }, [codigo]);

  const alternarPantallaCompleta = () => {
    const el = contenedorRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen?.();
    } else {
      el.requestFullscreen?.();
    }
  };

  useEffect(() => {
    const onCambio = () => setPantallaCompleta(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onCambio);
    return () => document.removeEventListener('fullscreenchange', onCambio);
  }, []);

  const reiniciar = () => {
    limpiarSesion();
    setEstado(null);
    setCodigo(null);
    setCargando(true);
    setError('');
    secretoRef.current = generarSecreto();
  };

  const vinculada = !!estado?.pantalla_vinculada;
  const material = estado?.material_activo || null;
  const cerrada = estado?.estado === 'CERRADO';
  const qrValue = codigo
    ? `${window.location.origin}/vincular/${codigo}?t=${estado?.qr_token || ''}&s=${secretoRef.current}`
    : '';

  return (
    <div ref={contenedorRef} className={pantallaCompleta ? 'bg-gray-950 p-6 min-h-screen' : ''}>
      {/* Header de la tarjeta */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Monitor className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-700">Compartir en clase</span>
        </div>
        <div className="flex items-center gap-2">
          {vinculada && (
            <span className="flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Pantalla vinculada
            </span>
          )}
          {(vinculada || material) && (
            <button
              type="button"
              onClick={alternarPantallaCompleta}
              title={pantallaCompleta ? 'Salir de pantalla completa' : 'Ver en pantalla completa'}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            >
              {pantallaCompleta ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Cargando */}
      {cargando && (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="w-7 h-7 animate-spin" style={{ color: '#0f766e' }} />
        </div>
      )}

      {/* Error */}
      {!cargando && error && (
        <div className="text-center py-6">
          <p className="text-sm text-red-500 mb-3">{error}</p>
          <button
            type="button"
            onClick={reiniciar}
            className="inline-flex items-center gap-1.5 text-xs font-medium hover:underline"
            style={{ color: '#0f766e' }}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Reintentar
          </button>
        </div>
      )}

      {/* Sesión terminada */}
      {!cargando && !error && cerrada && (
        <div className="text-center py-6">
          <p className="text-sm text-gray-500 mb-3">Sesión terminada</p>
          <button
            type="button"
            onClick={reiniciar}
            className="inline-flex items-center gap-1.5 text-xs font-medium hover:underline"
            style={{ color: '#0f766e' }}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Iniciar una nueva
          </button>
        </div>
      )}

      {/* Material en pantalla (ya vinculada) */}
      {!cargando && !error && !cerrada && vinculada && material && (
        <div className="animate-scale-in space-y-3">
          <div className="flex items-center gap-2 text-emerald-600">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-[10px] font-semibold uppercase tracking-wider">
              Mostrando en pantalla
            </span>
          </div>
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-5 text-white shadow-xl">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                <IconoMaterial tipo={material.tipo} />
              </div>
              <div className="min-w-0">
                <p className="font-semibold break-words">{material.titulo}</p>
                {material.descripcion && (
                  <p className="text-xs text-gray-300 mt-1 break-words">{material.descripcion}</p>
                )}
              </div>
            </div>
            {material.tipo === 'texto' && material.contenido && (
              <p className="mt-4 text-sm text-gray-200 whitespace-pre-wrap break-words max-h-40 overflow-y-auto">
                {material.contenido}
              </p>
            )}
            {(material.tipo === 'enlace' || material.url_archivo) && (
              <a
                href={material.tipo === 'enlace' ? material.contenido : material.url_archivo}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
                style={{ backgroundColor: '#0f766e' }}
              >
                <ExternalLink className="w-4 h-4" />
                {material.tipo === 'enlace' ? 'Abrir material' : 'Descargar archivo'}
              </a>
            )}
          </div>
        </div>
      )}

      {/* Vinculada pero sin material todavía */}
      {!cargando && !error && !cerrada && vinculada && !material && (
        <div className="text-center py-6 animate-scale-in">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 className="w-7 h-7 text-emerald-500" />
          </div>
          <p className="text-sm font-medium text-gray-800">
            {estado?.pantalla_docente_nombre
              ? `Vinculada a ${estado.pantalla_docente_nombre}`
              : 'Pantalla vinculada'}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Elegí el material desde <span className="text-gray-600">Mi carpeta → Mostrar en pantalla</span>
          </p>
        </div>
      )}

      {/* QR para vincular */}
      {!cargando && !error && !cerrada && !vinculada && (
        <div className="animate-fade-in">
          <div className="flex flex-col items-center">
            {/* QR con marco premium */}
            <div className="relative mb-4">
              <div
                className="absolute -inset-4 rounded-[32px] blur-2xl opacity-60"
                style={{
                  background:
                    'radial-gradient(circle at 30% 20%, rgba(15,118,110,0.35), transparent 60%), radial-gradient(circle at 70% 80%, rgba(45,212,191,0.30), transparent 60%)',
                }}
              />
              <div className="relative bg-white rounded-3xl p-3 shadow-2xl ring-1 ring-gray-900/5">
                {qrValue && (
                  <QRCodeSVG value={qrValue} size={188} level="M" bgColor="#ffffff" fgColor="#0f172a" />
                )}

                {/* Esquinas de encuadre */}
                <span className="absolute -top-1.5 -left-1.5 w-6 h-6 rounded-tl-2xl border-t-4 border-l-4" style={{ borderColor: '#0f766e' }} />
                <span className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-tr-2xl border-t-4 border-r-4" style={{ borderColor: '#0f766e' }} />
                <span className="absolute -bottom-1.5 -left-1.5 w-6 h-6 rounded-bl-2xl border-b-4 border-l-4" style={{ borderColor: '#0f766e' }} />
                <span className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-br-2xl border-b-4 border-r-4" style={{ borderColor: '#0f766e' }} />

                {/* Aviso de renovación */}
                {segundos < 5 && (
                  <div className="absolute inset-0 rounded-3xl bg-white/85 flex items-center justify-center">
                    <span className="inline-flex items-center gap-1.5 bg-gray-900 text-white text-[11px] px-3 py-1.5 rounded-full animate-pulse">
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      Actualizando…
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Barra de vigencia del QR */}
            <div className="w-full max-w-[220px] h-1 rounded-full bg-gray-100 overflow-hidden mb-4">
              <div
                className="h-full rounded-full transition-all duration-1000"
                style={{
                  width: `${Math.max(0, Math.min(100, (segundos / 30) * 100))}%`,
                  backgroundColor: segundos < 5 ? '#f59e0b' : '#0f766e',
                }}
              />
            </div>

            <div className="flex items-center gap-2 text-sm font-medium text-gray-800 mb-1">
              <Phone className="w-4 h-4" style={{ color: '#0f766e' }} />
              Escaneá el QR con tu celular
            </div>
            <p className="text-[11px] text-gray-400 text-center leading-relaxed max-w-[240px]">
              Se vincula esta pantalla a tu carpeta. No tenés que escribir ninguna contraseña acá.
            </p>

            {codigo && (
              <div className="mt-3 inline-flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5">
                <span className="text-[10px] text-gray-400 uppercase tracking-wider">Sala</span>
                <code className="text-xs font-mono font-bold text-gray-700 tracking-widest">
                  {codigo}
                </code>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PantallaAulaQR;
