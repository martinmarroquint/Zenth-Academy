// front/src/pages/CompartirSala.jsx
// 🖥️ PANTALLA DEL AULA - Vista pública (SIN login)
// QR DINÁMICO CON EXPIRACIÓN (como WhatsApp Web)

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import {
  Monitor, Loader2, Link as LinkIcon, FileText, Type, AlertTriangle,
  CheckCircle2, Lock, ExternalLink, Power, File, RefreshCw, Clock
} from 'lucide-react';
import compartirService from '../services/compartirService';

const POLLING_MS = 2000; // 2 segundos

// =============================================
// ICONO SEGÚN TIPO DE MATERIAL
// =============================================
const MaterialIcon = ({ tipo }) => {
  if (tipo === 'enlace') return <LinkIcon className="w-10 h-10 text-blue-400" />;
  if (tipo === 'texto') return <Type className="w-10 h-10 text-purple-400" />;
  if (tipo === 'archivo') return <FileText className="w-10 h-10 text-emerald-400" />;
  return <File className="w-10 h-10 text-gray-400" />;
};

// =============================================
// TEMPORIZADOR QR
// =============================================
const QRTimer = ({ segundosRestantes, total = 30 }) => {
  const porcentaje = (segundosRestantes / total) * 100;
  const color = segundosRestantes < 5 ? 'text-red-400' : 'text-gray-400';
  
  return (
    <div className="flex items-center gap-2">
      <div className="w-12 h-12 relative">
        <svg className="w-12 h-12 -rotate-90" viewBox="0 0 48 48">
          <circle cx="24" cy="24" r="20" fill="none" stroke="#1f2937" strokeWidth="3" />
          <circle 
            cx="24" 
            cy="24" 
            r="20" 
            fill="none" 
            stroke={segundosRestantes < 5 ? '#ef4444' : '#6b7280'}
            strokeWidth="3"
            strokeDasharray={`${2 * Math.PI * 20 * (porcentaje / 100)} ${2 * Math.PI * 20}`}
            strokeLinecap="round"
            className="transition-all duration-1000"
          />
        </svg>
        <span className={`absolute inset-0 flex items-center justify-center text-xs font-mono font-bold ${color}`}>
          {segundosRestantes}s
        </span>
      </div>
      <span className="text-xs text-gray-500">
        {segundosRestantes < 5 ? '¡Actualizando!' : 'Válido por'}
      </span>
    </div>
  );
};

// =============================================
// COMPONENTE PRINCIPAL
// =============================================

const CompartirSala = () => {
  const { codigo } = useParams();
  const [estado, setEstado] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [qrKey, setQrKey] = useState(0);
  const [segundosRestantes, setSegundosRestantes] = useState(30);
  const [expirando, setExpirando] = useState(false);
  const pollRef = useRef(null);
  const timerRef = useRef(null);

  const urlVinculacion = `${window.location.origin}/compartir/${codigo}`;

  // =============================================
  // CARGAR ESTADO DE LA SALA
  // =============================================
  const cargarEstado = useCallback(async () => {
    if (!codigo) return;
    try {
      const data = await compartirService.estadoSala(codigo);
      setEstado(data);
      setError('');
      
      // ✅ Actualizar QR si cambió el token
      if (data.qr_token) {
        setQrKey(prev => prev + 1);
      }
      
      // ✅ Actualizar tiempo restante
      if (data.qr_restante !== undefined) {
        setSegundosRestantes(data.qr_restante);
        setExpirando(data.qr_restante < 5);
      }
      
    } catch (e) {
      setError(e.message || 'No se pudo cargar la sala');
    } finally {
      setCargando(false);
    }
  }, [codigo]);

  // =============================================
  // POLLING Y TIMER
  // =============================================
  useEffect(() => {
    cargarEstado();
    
    // Polling cada 2 segundos
    pollRef.current = setInterval(cargarEstado, POLLING_MS);
    
    // Timer para cuenta regresiva local
    timerRef.current = setInterval(() => {
      setSegundosRestantes(prev => {
        if (prev <= 1) {
          // Si llega a 0, el polling actualizará con el nuevo QR
          setExpirando(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [cargarEstado]);

  // =============================================
  // RENDER
  // =============================================

  if (cargando) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-gray-600" />
      </div>
    );
  }

  if (error && !estado) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <AlertTriangle className="w-14 h-14 text-amber-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-white mb-2">Sala no disponible</h1>
          <p className="text-sm text-gray-400 mb-6">{error}</p>
          <Link to="/" className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm transition-colors">
            Volver al inicio
          </Link>
        </div>
      </div>
    );
  }

  const salaCerrada = estado?.estado === 'CERRADO';
  const materialActivo = estado?.material_activo || null;
  const qrToken = estado?.qr_token;
  const qrRestante = estado?.qr_restante || segundosRestantes;

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Header */}
      <header className="bg-gray-900/80 border-b border-gray-800 px-4 py-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 text-gray-300">
            <Monitor className="w-4 h-4" />
            <span className="text-sm font-medium">Pantalla del aula</span>
            <span className="text-xs text-gray-500">· Sala {codigo}</span>
          </div>
          <div className="flex items-center gap-3">
            {/* ✅ Timer QR */}
            {!salaCerrada && !materialActivo && (
              <QRTimer segundosRestantes={qrRestante} total={30} />
            )}
            {estado?.estado === 'ACTIVO' && (
              <span className="flex items-center gap-1.5 text-[11px] text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Vinculado
              </span>
            )}
            {estado?.estado === 'ESPERANDO' && (
              <span className="flex items-center gap-1.5 text-[11px] text-amber-400 bg-amber-500/10 px-2 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                Esperando vinculación
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Contenido */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 overflow-y-auto">
        {/* ===== SALA CERRADA ===== */}
        {salaCerrada ? (
          <div className="text-center max-w-md">
            <div className="w-16 h-16 rounded-2xl bg-gray-800 flex items-center justify-center mx-auto mb-5">
              <Power className="w-8 h-8 text-gray-500" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Sesión terminada</h1>
            <p className="text-sm text-gray-400 mb-6">
              El docente cerró esta sesión de compartir. La sala ya no muestra contenido.
            </p>
            <p className="text-xs text-gray-500">
              Duración: {Math.floor((estado?.duracion_segundos || 0) / 60)}m {(estado?.duracion_segundos || 0) % 60}s
            </p>
          </div>
        ) : /* ===== MATERIAL ACTIVO ===== */
        materialActivo ? (
          <div className="w-full max-w-3xl">
            <div className="flex items-center gap-2 mb-4 text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Mostrando en pantalla</span>
            </div>

            <div className="bg-gray-900 rounded-3xl border border-gray-800 p-8 sm:p-12 shadow-2xl">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-2xl bg-gray-800 flex items-center justify-center flex-shrink-0">
                  <MaterialIcon tipo={materialActivo.tipo} />
                </div>
                <div className="min-w-0">
                  <h1 className="text-2xl sm:text-3xl font-bold text-white break-words">
                    {materialActivo.titulo}
                  </h1>
                  {materialActivo.descripcion && (
                    <p className="text-sm text-gray-400 mt-1">{materialActivo.descripcion}</p>
                  )}
                </div>
              </div>

              {materialActivo.tipo === 'texto' && materialActivo.contenido && (
                <div className="bg-gray-800 rounded-2xl p-6 mb-6 text-gray-200 text-lg whitespace-pre-wrap break-words">
                  {materialActivo.contenido}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                {(materialActivo.tipo === 'enlace' || materialActivo.url_archivo) && (
                  <a
                    href={materialActivo.tipo === 'enlace' ? materialActivo.contenido : materialActivo.url_archivo}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 px-6 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-lg font-semibold flex items-center justify-center gap-2 transition-colors"
                  >
                    <ExternalLink className="w-5 h-5" />
                    {materialActivo.tipo === 'enlace' ? 'Abrir material' : 'Descargar archivo'}
                  </a>
                )}
                {materialActivo.nombre_archivo && (
                  <span className="text-xs text-gray-400 flex items-center gap-1.5 justify-center sm:justify-start">
                    <FileText className="w-3.5 h-3.5" /> {materialActivo.nombre_archivo}
                  </span>
                )}
              </div>
            </div>
          </div>
        ) : /* ===== QR DE VINCULACIÓN ===== */
        (
          <div className="text-center max-w-md w-full">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-800 text-gray-300 text-xs mb-6">
              <Lock className="w-3.5 h-3.5" />
              Escanea con tu celular para vincular
            </div>

            {/* ✅ QR DINÁMICO CON TOKEN */}
            <div className="bg-white rounded-3xl p-6 inline-block shadow-2xl mb-6 relative">
              <QRCodeSVG 
                key={qrKey}
                value={qrToken ? `${urlVinculacion}?token=${qrToken}` : urlVinculacion}
                size={240} 
                level="M" 
                bgColor="#fff" 
                fgColor="#0f172a" 
              />
              
              {/* ✅ Overlay cuando está expirando */}
              {qrRestante < 5 && qrRestante > 0 && (
                <div className="absolute inset-0 bg-white/80 rounded-3xl flex items-center justify-center">
                  <span className="bg-gray-800 text-white px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 animate-pulse">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    Actualizando en {qrRestante}s...
                  </span>
                </div>
              )}
              
              {/* ✅ Overlay cuando expiró (esperando nuevo QR) */}
              {qrRestante === 0 && (
                <div className="absolute inset-0 bg-white/90 rounded-3xl flex items-center justify-center">
                  <span className="bg-amber-500 text-white px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Generando nuevo QR...
                  </span>
                </div>
              )}
            </div>

            <h1 className="text-2xl font-bold text-white mb-2">Compartir en clase</h1>
            <p className="text-sm text-gray-400 mb-6 max-w-sm mx-auto">
              Escanea este QR con tu celular para vincular tu sesión y compartir material en la pantalla.
            </p>

            <div className="flex flex-col items-center gap-3">
              <div className="inline-flex items-center gap-2 bg-gray-900 border border-gray-800 rounded-xl px-4 py-2.5">
                <span className="text-[10px] text-gray-500 uppercase tracking-wider">Código</span>
                <code className="text-lg font-mono font-bold text-white tracking-widest">{codigo}</code>
              </div>
              
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  QR válido por {qrRestante}s
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <RefreshCw className={`w-3 h-3 ${qrRestante < 5 ? 'animate-spin text-amber-400' : ''}`} />
                  {qrRestante < 5 ? 'Actualizando...' : 'Auto-refresco'}
                </span>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default CompartirSala;