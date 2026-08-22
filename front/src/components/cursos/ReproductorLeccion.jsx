// front/src/components/cursos/ReproductorLeccion.jsx
// REPRODUCTOR DE LECCIONES EN MODAL - CON INTEGRACIÓN DE EXÁMENES (ExamenActivo)
// CORREGIDO: onProgress memoizado, integración con cursos

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X, Play, Pause, ChevronLeft, ChevronRight,
  CheckCircle, Circle, Clock, FileText, Video,
  Loader2, Maximize2, Minimize2, Volume2, VolumeX,
  Settings, Eye, EyeOff, Award, BookOpen, Link as LinkIcon,
  Download, ExternalLink, Check, AlertCircle
} from 'lucide-react';
import cursosService from '../../services/cursosService';
import examenesService from '../../services/examenesService';
import { authService } from '../../services/authService';
import ExamenActivo from '../examenes/ExamenActivo';

// =============================================
// COMPONENTE REPRODUCTOR DE VIDEO (YouTube)
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
// COMPONENTE DE TEXTO ENRIQUECIDO (SOLO LECTURA)
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
// COMPONENTE DE RECURSOS
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
      <h3 className="text-sm font-medium text-gray-700 mb-4">Recursos de la leccion</h3>
      {recursos.map((recurso, index) => (
        <a
          key={index}
          href={recurso.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200"
        >
          <div className="w-10 h-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center flex-shrink-0">
            {recurso.tipo === 'video' ? <Video className="w-5 h-5 text-blue-500" /> :
             recurso.tipo === 'pdf' ? <FileText className="w-5 h-5 text-red-500" /> :
             <LinkIcon className="w-5 h-5 text-gray-400" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-800 truncate">{recurso.nombre || recurso.titulo || 'Recurso'}</p>
            <p className="text-xs text-gray-400">{recurso.tipo || 'link'}</p>
          </div>
          <Download className="w-4 h-4 text-gray-400 flex-shrink-0" />
        </a>
      ))}
    </div>
  );
};

// =============================================
// COMPONENTE DE EXAMEN (WRAPPER) - USA ExamenActivo
// =============================================
const ExamenActivoWrapper = ({ contenido, leccion, curso, onComplete, onClose, usuarioId }) => {
  const [examen, setExamen] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [completado, setCompletado] = useState(false);

  const usuario = authService.getCurrentUser();

  // Cargar el examen completo (con preguntas y configuración)
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

    // ✅ Actualizar progreso del curso al completar el examen
    if (curso?.id && leccion?.id && usuarioId) {
      try {
        await cursosService.completarLeccion(curso.id, leccion.id, usuarioId);
        console.log('✅ Progreso del curso actualizado después del examen');
      } catch (error) {
        console.warn('No se pudo actualizar progreso del curso:', error);
      }
    }

    onComplete?.({
      ...resultado,
      tipo: 'examen'
    });
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
        <button
          onClick={onClose}
          className="mt-4 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
        >
          Volver al curso
        </button>
      </div>
    );
  }

  if (completado) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <CheckCircle className="w-16 h-16 text-emerald-500 mb-4" />
        <h3 className="text-2xl font-bold text-gray-900 mb-2">¡Examen entregado!</h3>
        <button
          onClick={onClose}
          className="mt-4 px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
        >
          Volver al curso
        </button>
      </div>
    );
  }

  const alumno = {
    id: usuario?.id || usuarioId,
    apellidos: usuario?.apellidos || '',
    nombres: usuario?.nombres || '',
    grado: usuario?.grado || '',
    dni: usuario?.dni || ''
  };

  return (
    <div className="h-full overflow-y-auto">
      <ExamenActivo
        examen={examen}
        alumno={alumno}
        onFinalizar={handleFinalizar}
        onAbandonar={onClose}
      />
    </div>
  );
};

// =============================================
// COMPONENTE DE CUESTIONARIO EMBED (WRAPPER)
// =============================================
const CuestionarioEmbedWrapper = ({ contenido }) => {
  return (
    <div className="h-full flex items-center justify-center p-6">
      <div className="text-center">
        <div className="w-20 h-20 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center mx-auto mb-4">
          <BookOpen className="w-10 h-10 text-indigo-500" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Cuestionario</h3>
        <p className="text-gray-500 mb-4">Esta leccion contiene un cuestionario</p>
        <button
          onClick={() => {
            const url = `/cuestionario/${contenido.cuestionario_id}`;
            window.open(url, '_blank');
          }}
          className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 mx-auto"
        >
          <ExternalLink className="w-4 h-4" />
          Abrir cuestionario
        </button>
      </div>
    </div>
  );
};

// =============================================
// COMPONENTE PRINCIPAL: REPRODUCTOR DE LECCIONES
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
  const [videoCompletado, setVideoCompletado] = useState(false);
  const [marcando, setMarcando] = useState(false);
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);

  const handleVideoProgress = useCallback(() => {}, []);

  useEffect(() => {
    setVideoCompletado(false);
    setMostrarConfirmacion(false);
  }, [leccion?.id]);

  const indexActual = leccionesDelModulo?.findIndex(l => l.id === leccion?.id) ?? -1;
  const leccionAnterior = indexActual > 0 ? leccionesDelModulo[indexActual - 1] : null;
  const leccionSiguiente = indexActual < leccionesDelModulo?.length - 1 ? leccionesDelModulo[indexActual + 1] : null;

  const handleVideoComplete = useCallback(() => {
    if (videoCompletado) return;
    setVideoCompletado(true);
    setMostrarConfirmacion(true);
  }, [videoCompletado]);

  const handleMarcarCompletada = useCallback(async () => {
    if (!usuarioId || !curso?.id || !leccion?.id) return;
    if (isCompletada) return;

    setMarcando(true);
    try {
      await cursosService.completarLeccion(curso.id, leccion.id, usuarioId);
      setVideoCompletado(true);
      setMostrarConfirmacion(false);
      onLeccionCompletada?.();
    } catch (error) {
      console.error('Error completando leccion:', error);
      alert('No se pudo marcar la leccion como completada');
    } finally {
      setMarcando(false);
    }
  }, [usuarioId, curso?.id, leccion?.id, isCompletada, onLeccionCompletada]);

  const handleEmbedComplete = useCallback((resultado) => {
    setMostrarConfirmacion(true);
    setVideoCompletado(true);
    // Auto-marcar como completada si fue aprobado
    if (resultado?.aprobado) {
      setTimeout(() => {
        handleMarcarCompletada();
      }, 500);
    }
  }, [handleMarcarCompletada]);

  const renderContenido = () => {
    if (!leccion) return null;

    const tipo = leccion.tipo || 'video';
    const contenido = leccion.contenido || {};

    // Verificar si el usuario tiene acceso (para cursos pagos)
    const estaBloqueado = curso?.precio_tipo === 'pago' && !tieneAcceso && !esDocente;

    if (estaBloqueado) {
      return (
        <div className="h-full flex items-center justify-center p-6">
          <div className="text-center text-gray-400">
            <Lock className="w-16 h-16 mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500 font-medium">Contenido bloqueado</p>
            <p className="text-sm text-gray-400 mt-1">Este curso requiere pago para acceder al contenido</p>
          </div>
        </div>
      );
    }

    switch (tipo) {
      case 'video':
        return (
          <div className="h-full w-full flex items-center justify-center bg-black p-3 sm:p-6">
            <div className="w-full max-w-5xl aspect-video relative">
              <VideoPlayer
                videoId={contenido.video_url}
                onComplete={handleVideoComplete}
                onProgress={handleVideoProgress}
                onTimeUpdate={handleVideoProgress}
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
            onComplete={handleEmbedComplete}
            onClose={onClose}
          />
        );

      case 'quiz':
        return (
          <CuestionarioEmbedWrapper
            contenido={contenido}
            leccion={leccion}
            curso={curso}
            onComplete={handleEmbedComplete}
          />
        );

      case 'recurso':
        return <RecursosDisplay recursos={contenido.archivos || contenido.links || []} />;

      default:
        return (
          <div className="h-full flex items-center justify-center p-6">
            <div className="text-center text-gray-400">
              <FileText className="w-16 h-16 mx-auto mb-3 text-gray-300" />
              <p>Tipo de leccion no soportado: {tipo}</p>
            </div>
          </div>
        );
    }
  };

  if (!isOpen || !leccion) return null;

  const isCompletadaEstado = isCompletada || videoCompletado;

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
              <h2 className="text-sm font-semibold text-gray-900 truncate">{leccion.titulo || 'Leccion'}</h2>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-gray-400">
                <span>{moduloId ? `Modulo ${moduloId}` : ''}</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {leccion.duracion || 'Sin duracion'}
                </span>
                {isCompletadaEstado && (
                  <span className="text-emerald-500 flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    Completada
                  </span>
                )}
                {leccion.tipo === 'examen' && (
                  <span className="text-amber-500 flex items-center gap-1">
                    <Award className="w-3 h-3" />
                    Examen
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
            {leccion.tipo !== 'examen' && leccion.tipo !== 'quiz' && (
              <button
                onClick={handleMarcarCompletada}
                disabled={marcando || isCompletadaEstado}
                className={`px-3 py-2 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
                  isCompletadaEstado
                    ? 'bg-emerald-50 text-emerald-600'
                    : 'bg-gray-900 text-white hover:bg-gray-800'
                } disabled:opacity-50`}
              >
                {marcando ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : isCompletadaEstado ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    Completada
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    Completar
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-hidden relative">
          {renderContenido()}

          {mostrarConfirmacion && !isCompletada && leccion.tipo !== 'examen' && (
            <div className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-emerald-500 text-white px-6 py-3 rounded-xl shadow-lg flex flex-wrap items-center justify-center gap-3 animate-fadeIn max-w-[calc(100%-2rem)] text-center">
              <span className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5" />
                <span className="text-sm font-medium">¡Completado!</span>
              </span>
              <button
                onClick={handleMarcarCompletada}
                className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors"
              >
                Marcar como completada
              </button>
            </div>
          )}
        </div>

        {/* Footer - Navegación */}
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