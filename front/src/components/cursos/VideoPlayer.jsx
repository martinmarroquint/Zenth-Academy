// front/src/components/cursos/VideoPlayer.jsx
//
// ✅ REESCRITO para arreglar el conflicto React <-> YouTube IFrame API.
//
// PROBLEMA ANTERIOR:
//   `new YT.Player('youtube-player', ...)` REEMPLAZA el <div> que React controla
//   por un <iframe>. Eso deja el DOM virtual de React desincronizado.
//   Con <StrictMode> (React 19, dev) los efectos se ejecutan 2 veces
//   (montar → desmontar → montar): el cleanup destruía el player y el segundo
//   intento no encontraba el div → `initPlayer()` salía en silencio y el
//   spinner quedaba girando PARA SIEMPRE. Además el id estaba hardcodeado,
//   así que dos videos en pantalla colisionaban.
//
// SOLUCIÓN:
//   1. React controla un `containerRef` (nunca lo toca YouTube).
//   2. El div objetivo se crea IMPERATIVAMENTE dentro del contenedor, con un id
//      único por instancia. YouTube reemplaza ESE div, no uno de React.
//   3. Timeout de seguridad: si la API no carga, se muestra error (no spinner infinito).
//   4. Cleanup robusto que limpia listeners globales y remueve el iframe.

import React, { useState, useEffect, useRef } from 'react';
import { Loader2, Video, Lock, Check } from 'lucide-react';

// Contador para ids únicos por instancia (evita colisiones)
let _instanciaCounter = 0;

const extractVideoId = (url) => {
  if (!url) return null;
  const limpio = String(url).trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(limpio)) return limpio;
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([^&#?]+)/,
    /(?:youtu\.be\/)([^&#?]+)/,
    /(?:youtube\.com\/embed\/)([^&#?]+)/,
    /(?:youtube\.com\/shorts\/)([^&#?]+)/,
  ];
  for (const pattern of patterns) {
    const match = limpio.match(pattern);
    if (match) return match[1];
  }
  return null;
};

const VideoPlayer = ({ videoId, onComplete, isBlocked = false }) => {
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);
  const [progress, setProgress] = useState(0);

  const containerRef = useRef(null);
  const playerRef = useRef(null);
  const intervalRef = useRef(null);
  const timeoutRef = useRef(null);
  const idRef = useRef(`yt-${++_instanciaCounter}-${Date.now()}`);
  const completadoRef = useRef(false);

  const cleanVideoId = extractVideoId(videoId);

  useEffect(() => {
    if (isBlocked || !cleanVideoId) return undefined;

    let cancelado = false;
    const targetId = idRef.current;
    // Copiamos el nodo a una variable: el ref puede haber cambiado al ejecutarse el cleanup.
    const contenedor = containerRef.current;

    // --- Cargar la API de YouTube (una sola vez globalmente) ---
    const cargarAPI = () =>
      new Promise((resolve) => {
        if (window.YT && window.YT.Player) {
          resolve();
          return;
        }
        // Si ya hay una promesa en curso (otra instancia), reutilizarla
        if (window.__ytApiPromise) {
          window.__ytApiPromise.then(resolve);
          return;
        }
        window.__ytApiPromise = new Promise((res) => {
          const previo = window.onYouTubeIframeAPIReady;
          window.onYouTubeIframeAPIReady = () => {
            if (typeof previo === 'function') {
              try { previo(); } catch { /* ignorar */ }
            }
            res();
          };
          if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
            const tag = document.createElement('script');
            tag.src = 'https://www.youtube.com/iframe_api';
            document.head.appendChild(tag);
          }
        });
        window.__ytApiPromise.then(resolve);
      });

    const initPlayer = () => {
      if (cancelado || !contenedor || playerRef.current) return;

      // Crear el div objetivo de forma imperativa (YouTube lo reemplazará).
      // React NO gestiona este nodo, así que su reemplazo no lo desincroniza.
      const target = document.createElement('div');
      target.id = targetId;
      target.style.width = '100%';
      target.style.height = '100%';
      contenedor.innerHTML = '';
      contenedor.appendChild(target);

      playerRef.current = new window.YT.Player(targetId, {
        height: '100%',
        width: '100%',
        videoId: cleanVideoId,
        playerVars: {
          modestbranding: 1,
          rel: 0,
          showinfo: 0,
          // ✅ Controles NATIVOS de YouTube: más confiables, accesibles y
          // profesionales que un botón propio. Evita además el warning de
          // postMessage del widget API y depende menos de nuestra lógica.
          controls: 1,
          disablekb: 0,
          fs: 1,               // permitir pantalla completa
          iv_load_policy: 3,
          autoplay: 0,
          playsinline: 1,
          origin: window.location.origin,
          widget_referrer: window.location.origin,
        },
        events: {
          onReady: () => {
            if (cancelado) return;
            setCargando(false);
            setError(false);
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
          },
          onStateChange: (event) => {
            if (cancelado) return;
            const state = event.data;

            // Solo rastreamos progreso para marcar la lección como completada
            // al 95%. Los controles los provee YouTube (nativo).
            if (state === 1) {
              if (intervalRef.current) clearInterval(intervalRef.current);
              intervalRef.current = setInterval(() => {
                const p = playerRef.current;
                if (!p || typeof p.getCurrentTime !== 'function') return;
                try {
                  const current = p.getCurrentTime();
                  const total = p.getDuration();
                  if (total > 0 && current >= 0) {
                    const pct = Math.min((current / total) * 100, 100);
                    setProgress(pct);
                    if (pct >= 95 && !completadoRef.current) {
                      completadoRef.current = true;
                      onComplete?.();
                    }
                  }
                } catch { /* ignorar */ }
              }, 1000);
            } else if (intervalRef.current) {
              clearInterval(intervalRef.current);
              intervalRef.current = null;
            }

            if (state === 0) {
              try {
                const current = playerRef.current?.getCurrentTime() || 0;
                const total = playerRef.current?.getDuration() || 0;
                if (total > 0 && current >= total - 1 && !completadoRef.current) {
                  completadoRef.current = true;
                  setProgress(100);
                  onComplete?.();
                }
              } catch { /* ignorar */ }
            }
          },
          onError: () => {
            if (cancelado) return;
            setCargando(false);
            setError(true);
          },
        },
      });
    };

    // Timeout de seguridad: si en 15s no cargó, mostramos error (no spinner infinito)
    timeoutRef.current = setTimeout(() => {
      if (!cancelado && !playerRef.current) {
        setCargando(false);
        setError(true);
      }
    }, 15000);

    cargarAPI().then(() => {
      if (!cancelado) initPlayer();
    });

    return () => {
      cancelado = true;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
      if (playerRef.current) {
        try { playerRef.current.destroy(); } catch { /* ignorar */ }
        playerRef.current = null;
      }
      // Limpiar el contenedor (el iframe que dejó YouTube)
      if (contenedor) {
        try { contenedor.innerHTML = ''; } catch { /* ignorar */ }
      }
    };
  }, [cleanVideoId, onComplete, isBlocked]);

  if (isBlocked) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-gray-100 rounded-xl min-h-[300px] border-2 border-dashed border-gray-300">
        <Lock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-400 font-medium">Video bloqueado</p>
        <p className="text-sm text-gray-300">Solicita acceso para ver este video</p>
      </div>
    );
  }

  if (!cleanVideoId) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-900 text-white rounded-xl min-h-[300px]">
        <div className="text-center">
          <Video className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">Video no disponible</p>
          <p className="text-xs text-gray-500 mt-1">La URL del video no es válida</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full bg-black rounded-xl overflow-hidden aspect-video">
      {/* Contenedor gestionado por React: YouTube NUNCA toca este nodo */}
      <div ref={containerRef} className="w-full h-full" />

      {cargando && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80">
          <Loader2 className="w-12 h-12 animate-spin text-white/50" />
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/90 text-center px-4">
          <div>
            <Video className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">No se pudo cargar el video</p>
            <p className="text-xs text-gray-500 mt-1">
              Verifica tu conexión o que el video permita ser embebido.
            </p>
          </div>
        </div>
      )}

      {progress >= 95 && (
        <div className="absolute top-4 right-4 bg-emerald-500/90 text-white px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 shadow-lg pointer-events-none">
          <Check className="w-3.5 h-3.5" />
          Completado
        </div>
      )}
    </div>
  );
};

export default React.memo(VideoPlayer);
