// front/src/components/cursos/ReproductorLeccion.jsx
// ADAPTADO PARA BLOQUES - CON NAVEGACIÓN ENTRE BLOQUES

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  X, Play, Pause, ChevronLeft, ChevronRight,
  CheckCircle, Circle, Clock, FileText, Video,
  Loader2, Maximize2, Minimize2, Volume2, VolumeX,
  Award, BookOpen, Link as LinkIcon,
  Download, Check, AlertCircle, Layout
} from 'lucide-react';
import cursosService from '../../services/cursosService';
import examenesService from '../../services/examenesService';
import { authService } from '../../services/authService';
import ExamenActivo from '../examenes/ExamenActivo';

// =============================================
// VIDEO PLAYER
// =============================================
const VideoPlayer = ({ videoId, onComplete, onProgress, onTimeUpdate }) => {
  const [player, setPlayer] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const playerRef = useRef(null);
  const containerRef = useRef(null);
  const controlsTimeoutRef = useRef(null);
  const completedRef = useRef(false);
  const progressIntervalRef = useRef(null);

  const extractVideoId = (url) => {
    if (!url) return null;
    if (/^[a-zA-Z0-9_-]{11}$/.test(url)) return url;
    const patterns = [
      /(?:youtube\.com\/watch\?v=)([^&]+)/,
      /(?:youtu\.be\/)([^?]+)/,
      /(?:youtube\.com\/embed\/)([^?]+)/,
      /(?:youtube\.com\/v\/)([^?]+)/
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  const cleanVideoId = extractVideoId(videoId);

  useEffect(() => {
    if (!cleanVideoId) return;

    const loadYouTubeAPI = () => {
      if (window.YT && window.YT.Player) {
        initPlayer();
        return;
      }

      window.onYouTubeIframeAPIReady = () => {
        initPlayer();
      };

      if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
      }
    };

    const initPlayer = () => {
      if (playerRef.current) return;
      if (!document.getElementById('youtube-player')) return;

      playerRef.current = new window.YT.Player('youtube-player', {
        height: '100%',
        width: '100%',
        videoId: cleanVideoId,
        playerVars: {
          modestbranding: 1,
          rel: 0,
          showinfo: 0,
          controls: 0,
          disablekb: 0,
          fs: 0,
          iv_load_policy: 3,
          autoplay: 0,
          origin: window.location.origin,
        },
        events: {
          onReady: (event) => {
            setIsReady(true);
            const dur = event.target.getDuration();
            setDuration(dur);
            setPlayer(event.target);
            onProgress?.(0);
          },
          onStateChange: (event) => {
            const state = event.data;
            setPlaying(state === 1);

            if (state === 1) {
              if (progressIntervalRef.current) {
                clearInterval(progressIntervalRef.current);
              }
              progressIntervalRef.current = setInterval(() => {
                if (!playerRef.current) return;
                try {
                  const current = playerRef.current.getCurrentTime();
                  const total = playerRef.current.getDuration();
                  if (total > 0 && current >= 0) {
                    const pct = Math.min((current / total) * 100, 100);
                    setProgress(pct);
                    setCurrentTime(current);
                    onTimeUpdate?.(current, total);
                    
                    if (pct >= 95 && !completedRef.current) {
                      completedRef.current = true;
                      onComplete?.();
                    }
                  }
                } catch (e) {
                  console.warn('Error actualizando progreso del video:', e);
                }
              }, 1000);
            } else {
              if (progressIntervalRef.current) {
                clearInterval(progressIntervalRef.current);
                progressIntervalRef.current = null;
              }
            }

            if (state === 0) {
              if (!completedRef.current) {
                try {
                  const current = playerRef.current?.getCurrentTime() || 0;
                  const total = playerRef.current?.getDuration() || 0;
                  if (total > 0 && current >= total - 1) {
                    completedRef.current = true;
                    setProgress(100);
                    onComplete?.();
                  }
                } catch (e) {
                  console.warn('Error verificando fin del video:', e);
                }
              }
            }
          },
          onError: (error) => {
            console.error('YouTube Player Error:', error);
          },
        },
      });
    };

    loadYouTubeAPI();

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch (e) {
          console.warn('No se pudo destruir el reproductor:', e);
        }
        playerRef.current = null;
      }
    };
  }, [cleanVideoId, onComplete, onProgress, onTimeUpdate]);

  const togglePlay = () => {
    if (!player) return;
    try {
      if (playing) {
        player.pauseVideo();
      } else {
        player.playVideo();
      }
    } catch (e) {
      console.error('Error toggling play:', e);
    }
  };

  const toggleMute = () => {
    if (!player) return;
    try {
      if (isMuted) {
        player.unMute();
      } else {
        player.mute();
      }
      setIsMuted(!isMuted);
    } catch (e) {
      console.error('Error toggling mute:', e);
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    try {
      if (!document.fullscreenElement) {
        containerRef.current.requestFullscreen?.();
        setIsFullscreen(true);
      } else {
        document.exitFullscreen?.();
        setIsFullscreen(false);
      }
    } catch (e) {
      console.error('Error toggling fullscreen:', e);
    }
  };

  const handleMouseMove = () => {
    setShowControls(true);
    clearTimeout(controlsTimeoutRef.current);
    if (playing) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  };

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds) || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const seekTo = (e) => {
    if (!player || !duration) return;
    try {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const time = Math.min(Math.max(x * duration, 0), duration);
      player.seekTo(time, true);
    } catch (e) {
      console.error('Error seeking:', e);
    }
  };

  if (!cleanVideoId) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-900 text-white">
        <div className="text-center">
          <Video className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">No hay video disponible</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-black"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setShowControls(false)}
    >
      <div id="youtube-player" className="w-full h-full" />

      {!isReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80">
          <Loader2 className="w-12 h-12 animate-spin text-white/50" />
        </div>
      )}

      {isReady && (
        <div
          className={`absolute inset-0 transition-opacity duration-300 ${
            showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30" />

          <button
            onClick={togglePlay}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-all flex items-center justify-center border border-white/30"
          >
            {playing ? (
              <Pause className="w-10 h-10 text-white" />
            ) : (
              <Play className="w-10 h-10 text-white ml-1" />
            )}
          </button>

          <div className="absolute bottom-16 left-0 right-0 px-4">
            <div className="flex items-center gap-3">
              <span className="text-white text-xs font-medium min-w-[40px]">
                {formatTime(currentTime)}
              </span>
              <div
                className="flex-1 h-1 bg-white/30 rounded-full cursor-pointer hover:h-1.5 transition-all"
                onClick={seekTo}
              >
                <div
                  className="h-full bg-white rounded-full transition-all"
                  style={{ width: `${Math.min(progress, 100)}%` }}
                />
              </div>
              <span className="text-white text-xs font-medium min-w-[40px] text-right">
                {formatTime(duration)}
              </span>
            </div>
          </div>

          <div className="absolute bottom-4 left-0 right-0 px-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={togglePlay}
                className="p-2 rounded hover:bg-white/10 transition-colors text-white"
              >
                {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              </button>
              <button
                onClick={toggleMute}
                className="p-2 rounded hover:bg-white/10 transition-colors text-white"
              >
                {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>
              <span className="text-white text-xs">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={toggleFullscreen}
                className="p-2 rounded hover:bg-white/10 transition-colors text-white"
              >
                {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {progress >= 95 && (
            <div className="absolute top-4 right-4 bg-emerald-500/90 text-white px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 shadow-lg">
              <Check className="w-3.5 h-3.5" />
              Completado
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// =============================================
// RICH TEXT DISPLAY
// =============================================
const RichTextDisplay = ({ content }) => {
  if (!content) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        <p>No hay contenido</p>
      </div>
    );
  }
  return (
    <div className="prose prose-slate max-w-none p-6 overflow-y-auto h-full">
      <div dangerouslySetInnerHTML={{ __html: content }} />
    </div>
  );
};

// =============================================
// RECURSOS DISPLAY
// =============================================
const RecursosDisplay = ({ recursos }) => {
  if (!recursos || recursos.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <p>No hay recursos adicionales</p>
      </div>
    );
  }
  return (
    <div className="p-6 space-y-3 overflow-y-auto h-full">
      <h3 className="text-sm font-medium text-gray-700 mb-4">Recursos de la lección</h3>
      {recursos.map((recurso, index) => (
        <a
          key={index}
          href={recurso.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200"
        >
          <div className="w-10 h-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center flex-shrink-0">
            {recurso.tipo === 'pdf' ? <FileText className="w-5 h-5 text-red-500" /> :
             <LinkIcon className="w-5 h-5 text-gray-400" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-800 truncate">{recurso.nombre || 'Recurso'}</p>
          </div>
          <Download className="w-4 h-4 text-gray-400 flex-shrink-0" />
        </a>
      ))}
    </div>
  );
};

// =============================================
// EXAMEN WRAPPER
// =============================================
const ExamenActivoWrapper = ({ contenido, leccion, curso, onComplete, onClose, usuarioId }) => {
  const [examen, setExamen] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [completado, setCompletado] = useState(false);

  const usuario = authService.getCurrentUser();

  useEffect(() => {
    let activo = true;
    const cargarExamen = async () => {
      try {
        const data = await examenesService.obtenerExamen(contenido.examen_id);
        if (activo) setExamen(data);
      } catch (err) {
        if (activo) setError(err.message || 'Error cargando el examen');
      } finally {
        if (activo) setCargando(false);
      }
    };
    cargarExamen();
    return () => { activo = false; };
  }, [contenido.examen_id]);

  const handleFinalizar = useCallback(async (resultado) => {
    setCompletado(true);
    if (curso?.id && leccion?.id && usuarioId) {
      try {
        await cursosService.completarLeccion(curso.id, leccion.id, usuarioId);
      } catch (error) {
        console.warn('No se pudo actualizar progreso:', error);
      }
    }
    onComplete?.({ ...resultado, tipo: 'examen' });
  }, [curso?.id, leccion?.id, usuarioId, onComplete]);

  if (cargando) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error || !examen) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
        <p className="text-gray-600">{error || 'No se pudo cargar el examen'}</p>
        <button onClick={onClose} className="mt-4 px-4 py-2 bg-gray-900 text-white rounded-lg">
          Volver
        </button>
      </div>
    );
  }

  if (completado) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <CheckCircle className="w-16 h-16 text-emerald-500 mb-4" />
        <h3 className="text-2xl font-bold text-gray-900 mb-2">¡Examen entregado!</h3>
        <button onClick={onClose} className="mt-4 px-6 py-2 bg-gray-900 text-white rounded-lg">
          Volver
        </button>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <ExamenActivo
        examen={examen}
        alumno={{ id: usuario?.id || usuarioId }}
        onFinalizar={handleFinalizar}
        onAbandonar={onClose}
      />
    </div>
  );
};

// =============================================
// RENDERIZADOR DE BLOQUE
// =============================================
const RenderBloque = ({ 
  bloque, 
  leccion, 
  curso, 
  onComplete, 
  onClose, 
  usuarioId 
}) => {
  const contenido = bloque.contenido || {};

  switch (bloque.tipo) {
    case 'video':
      return (
        <div className="h-full w-full flex items-center justify-center bg-black p-3 sm:p-6">
          <div className="w-full max-w-5xl aspect-video relative">
            <VideoPlayer
              videoId={contenido.video_url}
              onComplete={onComplete}
            />
          </div>
        </div>
      );

    case 'texto':
      return (
        <div className="h-full overflow-y-auto">
          <RichTextDisplay content={contenido.texto || ''} />
        </div>
      );

    case 'examen':
      return (
        <ExamenActivoWrapper
          contenido={contenido}
          leccion={leccion}
          curso={curso}
          usuarioId={usuarioId}
          onComplete={onComplete}
          onClose={onClose}
        />
      );

    case 'recurso':
      return <RecursosDisplay recursos={contenido.archivos || []} />;

    default:
      return (
        <div className="h-full flex items-center justify-center p-6">
          <div className="text-center text-gray-400">
            <FileText className="w-16 h-16 mx-auto mb-3 text-gray-300" />
            <p>Tipo de bloque no soportado: {bloque.tipo}</p>
          </div>
        </div>
      );
  }
};

// =============================================
// COMPONENTE PRINCIPAL
// =============================================
const ReproductorLeccion = ({
  isOpen,
  onClose,
  curso,
  leccion,
  moduloId,
  leccionesDelModulo,
  onLeccionCompletada,
  onNavegarLeccion,
  usuarioId,
  progresoActual,
  isCompletada,
  tieneAcceso,
  esDocente
}) => {
  const [bloqueActualIndex, setBloqueActualIndex] = useState(0);
  const [bloqueCompletado, setBloqueCompletado] = useState(false);
  const [marcando, setMarcando] = useState(false);

  // Resetear al abrir
  useEffect(() => {
    setBloqueActualIndex(0);
    setBloqueCompletado(false);
  }, [leccion?.id]);

  const bloques = leccion?.bloques || [];
  const bloqueActual = bloques[bloqueActualIndex] || null;
  const totalBloques = bloques.length;

  const handleBloqueComplete = useCallback(() => {
    setBloqueCompletado(true);
    
    // Si es el último bloque, marcar la lección como completada
    if (bloqueActualIndex === totalBloques - 1) {
      handleMarcarCompletada();
    }
  }, [bloqueActualIndex, totalBloques]);

  const handleMarcarCompletada = useCallback(async () => {
    if (!usuarioId || !curso?.id || !leccion?.id) return;
    if (isCompletada) return;

    setMarcando(true);
    try {
      await cursosService.completarLeccion(curso.id, leccion.id, usuarioId);
      onLeccionCompletada?.();
    } catch (error) {
      console.error('Error completando lección:', error);
    } finally {
      setMarcando(false);
    }
  }, [usuarioId, curso?.id, leccion?.id, isCompletada, onLeccionCompletada]);

  const handleNavegarBloque = (direccion) => {
    const nuevoIndex = bloqueActualIndex + direccion;
    if (nuevoIndex >= 0 && nuevoIndex < totalBloques) {
      setBloqueActualIndex(nuevoIndex);
      setBloqueCompletado(false);
    }
  };

  const indexActual = leccionesDelModulo?.findIndex(l => l.id === leccion?.id) ?? -1;
  const leccionAnterior = indexActual > 0 ? leccionesDelModulo[indexActual - 1] : null;
  const leccionSiguiente = indexActual < leccionesDelModulo?.length - 1 ? leccionesDelModulo[indexActual + 1] : null;

  if (!isOpen || !leccion) return null;

  const estaCompletada = isCompletada || (bloqueCompletado && bloqueActualIndex === totalBloques - 1);
  const estaBloqueado = curso?.precio_tipo === 'pago' && !tieneAcceso && !esDocente;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-0">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-gray-900 truncate">{leccion.titulo}</h2>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-gray-400">
                <span>{moduloId ? `Módulo ${moduloId}` : ''}</span>
                {totalBloques > 0 && (
                  <>
                    <span>•</span>
                    <span>{bloqueActualIndex + 1} de {totalBloques} bloques</span>
                  </>
                )}
                {estaCompletada && (
                  <span className="text-emerald-500 flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    Completada
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {progresoActual !== undefined && (
              <div className="hidden sm:flex items-center gap-2 text-xs text-gray-400">
                <span>Progreso:</span>
                <span className="font-medium text-gray-700">{progresoActual}%</span>
              </div>
            )}
          </div>
        </div>

        {/* Navegación entre bloques */}
        {totalBloques > 1 && !estaBloqueado && (
          <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-100 flex-shrink-0">
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Layout className="w-3.5 h-3.5" />
              <span>Bloque {bloqueActualIndex + 1}:</span>
              <span className="font-medium text-gray-700 truncate max-w-[150px]">
                {bloqueActual?.titulo || `Bloque ${bloqueActualIndex + 1}`}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => handleNavegarBloque(-1)}
                disabled={bloqueActualIndex === 0}
                className={`p-1 rounded hover:bg-gray-200 transition-colors ${
                  bloqueActualIndex === 0 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600'
                }`}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs text-gray-400 px-2">
                {bloqueActualIndex + 1}/{totalBloques}
              </span>
              <button
                onClick={() => handleNavegarBloque(1)}
                disabled={bloqueActualIndex === totalBloques - 1}
                className={`p-1 rounded hover:bg-gray-200 transition-colors ${
                  bloqueActualIndex === totalBloques - 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600'
                }`}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Contenido */}
        <div className="flex-1 overflow-hidden relative">
          {estaBloqueado ? (
            <div className="h-full flex items-center justify-center p-6">
              <div className="text-center text-gray-400">
                <Lock className="w-16 h-16 mx-auto mb-3 text-gray-300" />
                <p className="text-gray-500 font-medium">Contenido bloqueado</p>
                <p className="text-sm text-gray-400 mt-1">Este curso requiere pago para acceder</p>
              </div>
            </div>
          ) : bloqueActual ? (
            <RenderBloque
              bloque={bloqueActual}
              leccion={leccion}
              curso={curso}
              usuarioId={usuarioId}
              onComplete={handleBloqueComplete}
              onClose={onClose}
            />
          ) : (
            <div className="h-full flex items-center justify-center p-6">
              <div className="text-center text-gray-400">
                <FileText className="w-16 h-16 mx-auto mb-3 text-gray-300" />
                <p>Esta lección no tiene contenido</p>
              </div>
            </div>
          )}

          {/* Indicador de bloque completado */}
          {bloqueCompletado && bloqueActualIndex < totalBloques - 1 && !estaBloqueado && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-emerald-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-fadeIn">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm font-medium">¡Bloque completado!</span>
              <button
                onClick={() => handleNavegarBloque(1)}
                className="ml-2 px-3 py-1 bg-white/20 hover:bg-white/30 rounded text-sm"
              >
                Siguiente bloque →
              </button>
            </div>
          )}

          {/* Confirmación de lección completada */}
          {bloqueCompletado && bloqueActualIndex === totalBloques - 1 && !estaCompletada && !estaBloqueado && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-emerald-500 text-white px-6 py-3 rounded-xl shadow-lg flex flex-wrap items-center justify-center gap-3 animate-fadeIn">
              <span className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5" />
                <span className="text-sm font-medium">¡Lección completada!</span>
              </span>
              <button
                onClick={handleMarcarCompletada}
                disabled={marcando}
                className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors"
              >
                {marcando ? 'Guardando...' : 'Guardar progreso'}
              </button>
            </div>
          )}
        </div>

        {/* Footer - Navegación entre lecciones */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200 flex-shrink-0">
          <button
            onClick={() => onNavegarLeccion?.('anterior')}
            disabled={!leccionAnterior}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              leccionAnterior
                ? 'text-gray-700 hover:bg-gray-100'
                : 'text-gray-300 cursor-not-allowed'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
            Anterior
          </button>

          <div className="flex items-center gap-1 text-xs text-gray-400">
            <span>{indexActual + 1}</span>
            <span>/</span>
            <span>{leccionesDelModulo?.length || 0}</span>
          </div>

          <button
            onClick={() => onNavegarLeccion?.('siguiente')}
            disabled={!leccionSiguiente}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              leccionSiguiente
                ? 'text-gray-700 hover:bg-gray-100'
                : 'text-gray-300 cursor-not-allowed'
            }`}
          >
            Siguiente
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translate(-50%, 10px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        .prose {
          max-width: 100%;
        }
        .prose h1, .prose h2, .prose h3, .prose h4 {
          color: #1e293b;
        }
        .prose p {
          color: #475569;
          line-height: 1.8;
        }
        .prose ul, .prose ol {
          color: #475569;
        }
        .prose a {
          color: #4f46e5;
          text-decoration: underline;
        }
        .prose img {
          border-radius: 8px;
          max-width: 100%;
          height: auto;
        }
        .prose pre {
          background: #f1f5f9;
          border-radius: 8px;
          padding: 16px;
          overflow-x: auto;
        }
        .prose code {
          background: #f1f5f9;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 0.9em;
        }
      `}</style>
    </div>
  );
};

export default ReproductorLeccion;