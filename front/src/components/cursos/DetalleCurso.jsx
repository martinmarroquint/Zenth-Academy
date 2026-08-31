// front/src/components/cursos/DetalleCurso.jsx
// VERSIÓN COMPLETA ACTUALIZADA - NAVEGACIÓN CORREGIDA

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Play, Clock, Users, BookOpen,
  Award, CheckCircle, Loader2,
  FileText, Video, ChevronDown,
  Link as LinkIcon, Lock, DollarSign,
  CreditCard, Send, AlertCircle, Check,
  Settings, GraduationCap, MessageSquare,
  BarChart3, Eye, Download, ThumbsUp,
  Pause, FolderOpen, User, X, Layers,
  ChevronLeft, ChevronRight, Sparkles,
  Globe, Target, Star, EyeOff, Info, Edit3
} from 'lucide-react';
import cursosService from '../../services/cursosService';
import certificadosService from '../../services/certificadosService';
import examenesService from '../../services/examenesService';
import { authService } from '../../services/authService';
import { Badge, Button } from '../ui';
import ForoCurso from './ForoCurso';
import CalificacionesEstudiante from './CalificacionesEstudiante';
import EstudiantesCurso from './EstudiantesCurso';
import VerCertificado from '../certificados/VerCertificado';
import PanelSolicitudes from '../docente/PanelSolicitudes';
import ExamenActivo from '../examenes/ExamenActivo';
import { resolveImageUrl } from '../../config/api.config';

// ============================================================
// VIDEO PLAYER
// ============================================================
const VideoPlayer = ({ videoId, onComplete, isBlocked = false }) => {
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const playerRef = useRef(null);
  const intervalRef = useRef(null);

  if (isBlocked) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-gray-100 rounded-xl min-h-[300px] border-2 border-dashed border-gray-300">
        <Lock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-400 font-medium">Video bloqueado</p>
        <p className="text-sm text-gray-300">Solicita acceso para ver este video</p>
      </div>
    );
  }

  const extractVideoId = (url) => {
    if (!url) return null;
    if (/^[a-zA-Z0-9_-]{11}$/.test(url)) return url;
    const patterns = [
      /(?:youtube\.com\/watch\?v=)([^&]+)/,
      /(?:youtu\.be\/)([^?]+)/,
      /(?:youtube\.com\/embed\/)([^?]+)/
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  const cleanVideoId = extractVideoId(videoId);

  useEffect(() => {
    if (!cleanVideoId) {
      setCargando(false);
      setError(true);
      return;
    }

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
            setCargando(false);
            const dur = event.target.getDuration();
            setDuration(dur);
            setPlayer(event.target);
          },
          onStateChange: (event) => {
            const state = event.data;
            setPlaying(state === 1);

            if (state === 1) {
              if (intervalRef.current) clearInterval(intervalRef.current);
              intervalRef.current = setInterval(() => {
                if (!playerRef.current) return;
                try {
                  const current = playerRef.current.getCurrentTime();
                  const total = playerRef.current.getDuration();
                  if (total > 0 && current >= 0) {
                    const pct = Math.min((current / total) * 100, 100);
                    setProgress(pct);
                    setCurrentTime(current);
                    if (pct >= 95) {
                      onComplete?.();
                    }
                  }
                } catch (e) {
                  console.warn('Error:', e);
                }
              }, 1000);
            } else {
              if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
              }
            }

            if (state === 0) {
              try {
                const current = playerRef.current?.getCurrentTime() || 0;
                const total = playerRef.current?.getDuration() || 0;
                if (total > 0 && current >= total - 1) {
                  setProgress(100);
                  onComplete?.();
                }
              } catch (e) {
                console.warn('Error:', e);
              }
            }
          },
          onError: () => {
            setCargando(false);
            setError(true);
          },
        },
      });
    };

    loadYouTubeAPI();

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (playerRef.current) {
        try { playerRef.current.destroy(); } catch (e) {}
        playerRef.current = null;
      }
    };
  }, [cleanVideoId, onComplete]);

  const togglePlay = () => {
    if (!playerRef.current) return;
    try {
      if (playing) {
        playerRef.current.pauseVideo();
      } else {
        playerRef.current.playVideo();
      }
    } catch (e) {
      console.error('Error:', e);
    }
  };

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds) || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (error || !cleanVideoId) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-900 text-white rounded-xl min-h-[300px]">
        <div className="text-center">
          <Video className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">Video no disponible</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full bg-black rounded-xl overflow-hidden aspect-video">
      <div id="youtube-player" className="w-full h-full" />

      {cargando && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80">
          <Loader2 className="w-12 h-12 animate-spin text-white/50" />
        </div>
      )}

      {!cargando && (
        <button
          onClick={togglePlay}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-all flex items-center justify-center border border-white/30"
        >
          {playing ? (
            <Pause className="w-8 h-8 text-white" />
          ) : (
            <Play className="w-8 h-8 text-white ml-1" />
          )}
        </button>
      )}

      {!cargando && (
        <div className="absolute bottom-0 left-0 right-0 px-4 pb-4">
          <div className="flex items-center gap-3">
            <span className="text-white text-xs font-medium min-w-[40px]">
              {formatTime(currentTime)}
            </span>
            <div className="flex-1 h-1 bg-white/30 rounded-full">
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
      )}

      {progress >= 95 && (
        <div className="absolute top-4 right-4 bg-emerald-500/90 text-white px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 shadow-lg">
          <Check className="w-3.5 h-3.5" />
          Completado
        </div>
      )}
    </div>
  );
};

// ============================================================
// TEXTO ENRIQUECIDO
// ============================================================
const RichTextDisplay = ({ content, isBlocked = false }) => {
  if (isBlocked) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[200px] bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 p-8">
        <Lock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-400 font-medium">Contenido bloqueado</p>
        <p className="text-sm text-gray-300">Solicita acceso para ver este contenido</p>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="text-center py-8 text-gray-400">
        <FileText className="w-12 h-12 mx-auto mb-2 text-gray-300" />
        <p>No hay contenido disponible</p>
      </div>
    );
  }

  return (
    <div className="prose prose-slate max-w-none">
      <div dangerouslySetInnerHTML={{ __html: content }} />
    </div>
  );
};

// ============================================================
// RECURSOS CON PREVISUALIZACIÓN (VERSIÓN COMPLETA)
// ============================================================
const RecursosDisplay = ({ recursos, isBlocked = false }) => {
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewTitle, setPreviewTitle] = useState('');
  const [previewType, setPreviewType] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const iframeRef = useRef(null);
  const modalRef = useRef(null);

  const detectFileType = (url, nombre) => {
    if (!url) return 'link';
    
    const extension = nombre?.split('.').pop()?.toLowerCase() || '';
    const extensionMap = {
      'pdf': 'pdf',
      'doc': 'word',
      'docx': 'word',
      'xls': 'excel',
      'xlsx': 'excel',
      'ppt': 'powerpoint',
      'pptx': 'powerpoint',
      'jpg': 'image',
      'jpeg': 'image',
      'png': 'image',
      'gif': 'image',
      'svg': 'image',
      'mp4': 'video',
      'mp3': 'audio',
      'zip': 'archive',
      'rar': 'archive'
    };

    if (url.includes('drive.google.com') || url.includes('docs.google.com')) {
      if (url.includes('document')) return 'google-doc';
      if (url.includes('spreadsheets')) return 'google-sheet';
      if (url.includes('presentation')) return 'google-slide';
      if (url.includes('file/d/')) return 'google-file';
      return 'google-drive';
    }

    return extensionMap[extension] || 'link';
  };

  const getDrivePreviewUrl = (url) => {
    if (!url) return null;
    
    if (url.includes('docs.google.com/document')) {
      return url.replace('/edit', '/preview').replace('/edit?', '/preview?');
    }
    if (url.includes('docs.google.com/presentation')) {
      return url.replace('/edit', '/preview').replace('/edit?', '/preview?');
    }
    if (url.includes('docs.google.com/spreadsheets')) {
      return url.replace('/edit', '/preview').replace('/edit?', '/preview?');
    }
    if (url.includes('drive.google.com/file')) {
      const fileId = url.match(/\/d\/([^\/]+)/)?.[1];
      if (fileId) {
        return `https://drive.google.com/file/d/${fileId}/preview`;
      }
    }
    if (url.includes('drive.google.com/open?id=')) {
      const fileId = url.match(/id=([^&]+)/)?.[1];
      if (fileId) {
        return `https://drive.google.com/file/d/${fileId}/preview`;
      }
    }
    if (url.includes('drive.google.com/drive/folders')) {
      const folderId = url.match(/\/folders\/([^\/]+)/)?.[1];
      if (folderId) {
        return `https://drive.google.com/embeddedfolderview?id=${folderId}#list`;
      }
    }
    return null;
  };

  const getFileIcon = (url, nombre) => {
    const type = detectFileType(url, nombre);
    const icons = {
      'pdf': <FileText className="w-5 h-5 text-red-500" />,
      'word': <FileText className="w-5 h-5 text-blue-600" />,
      'excel': <FileText className="w-5 h-5 text-green-600" />,
      'powerpoint': <FileText className="w-5 h-5 text-orange-500" />,
      'image': <FileText className="w-5 h-5 text-purple-500" />,
      'video': <Video className="w-5 h-5 text-red-400" />,
      'audio': <FileText className="w-5 h-5 text-indigo-500" />,
      'archive': <FileText className="w-5 h-5 text-yellow-600" />,
      'google-doc': <FileText className="w-5 h-5 text-blue-500" />,
      'google-sheet': <FileText className="w-5 h-5 text-green-500" />,
      'google-slide': <FileText className="w-5 h-5 text-amber-500" />,
      'google-drive': <FileText className="w-5 h-5 text-[#0f766e]" />,
      'link': <LinkIcon className="w-5 h-5 text-gray-400" />
    };
    return icons[type] || icons.link;
  };

  const getFileTypeLabel = (url, nombre) => {
    const type = detectFileType(url, nombre);
    const labels = {
      'pdf': 'PDF',
      'word': 'Word',
      'excel': 'Excel',
      'powerpoint': 'PowerPoint',
      'image': 'Imagen',
      'video': 'Video',
      'audio': 'Audio',
      'archive': 'Comprimido',
      'google-doc': 'Google Documento',
      'google-sheet': 'Google Hoja de cálculo',
      'google-slide': 'Google Presentación',
      'google-drive': 'Google Drive',
      'link': 'Enlace'
    };
    return labels[type] || 'Documento';
  };

  const getFileColor = (url, nombre) => {
    const type = detectFileType(url, nombre);
    const colors = {
      'pdf': 'border-red-200 bg-red-50 hover:border-red-300',
      'word': 'border-blue-200 bg-blue-50 hover:border-blue-300',
      'excel': 'border-green-200 bg-green-50 hover:border-green-300',
      'powerpoint': 'border-orange-200 bg-orange-50 hover:border-orange-300',
      'image': 'border-purple-200 bg-purple-50 hover:border-purple-300',
      'video': 'border-red-200 bg-red-50 hover:border-red-300',
      'audio': 'border-indigo-200 bg-indigo-50 hover:border-indigo-300',
      'archive': 'border-yellow-200 bg-yellow-50 hover:border-yellow-300',
      'google-doc': 'border-blue-200 bg-blue-50 hover:border-blue-300',
      'google-sheet': 'border-green-200 bg-green-50 hover:border-green-300',
      'google-slide': 'border-amber-200 bg-amber-50 hover:border-amber-300',
      'google-drive': 'border-[#0f766e]/20 bg-[#e6f4f2] hover:border-[#0f766e]/40',
      'link': 'border-gray-200 bg-gray-50 hover:border-gray-300'
    };
    return colors[type] || 'border-gray-200 bg-gray-50 hover:border-gray-300';
  };

  const handlePreview = (recurso) => {
    if (isBlocked) {
      alert('Este contenido está bloqueado. Solicita acceso para ver los recursos.');
      return;
    }

    setError(null);
    setIsLoading(true);
    setIsFullscreen(false);
    
    const preview = getDrivePreviewUrl(recurso.url);
    
    if (preview) {
      setPreviewUrl(preview);
      setPreviewTitle(recurso.nombre || 'Documento');
      setPreviewType(detectFileType(recurso.url, recurso.nombre));
    } else {
      window.open(recurso.url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleIframeLoad = () => {
    setIsLoading(false);
  };

  const handleIframeError = () => {
    setIsLoading(false);
    setError('No se pudo cargar la vista previa. Puedes abrir el enlace directamente.');
  };

  const closePreview = () => {
    setPreviewUrl(null);
    setPreviewTitle('');
    setPreviewType('');
    setError(null);
    setIsLoading(true);
    setIsFullscreen(false);
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && previewUrl) {
        closePreview();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [previewUrl]);

  useEffect(() => {
    if (previewUrl) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [previewUrl]);

  useEffect(() => {
    if (previewUrl) {
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [previewUrl]);

  if (isBlocked) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[200px] bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 p-8">
        <Lock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-400 font-medium">Recursos bloqueados</p>
        <p className="text-sm text-gray-300">Solicita acceso para ver los recursos</p>
      </div>
    );
  }

  if (!recursos || recursos.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <FileText className="w-12 h-12 mx-auto mb-2 text-gray-300" />
        <p>No hay recursos disponibles</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {recursos.map((recurso, index) => {
          const isDrive = getDrivePreviewUrl(recurso.url) !== null;
          const fileType = getFileTypeLabel(recurso.url, recurso.nombre);
          const icon = getFileIcon(recurso.url, recurso.nombre);
          const colorClass = getFileColor(recurso.url, recurso.nombre);
          
          return (
            <div
              key={index}
              className={`group flex items-center gap-3 p-3 rounded-xl border ${colorClass} hover:shadow-md transition-all duration-200 cursor-pointer`}
              onClick={() => handlePreview(recurso)}
            >
              <div className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                {icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate group-hover:text-[#0f766e] transition-colors">
                  {recurso.nombre || 'Recurso sin nombre'}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-gray-400">{fileType}</span>
                  {isDrive && (
                    <span className="text-[10px] font-medium text-[#0f766e] bg-[#e6f4f2] px-1.5 py-0.5 rounded-full">
                      Drive
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePreview(recurso);
                  }}
                  className="p-1.5 rounded-lg hover:bg-white/50 text-gray-400 hover:text-[#0f766e] transition-colors"
                  title="Vista previa"
                >
                  <Eye className="w-4 h-4" />
                </button>
                <a
                  href={recurso.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="p-1.5 rounded-lg hover:bg-white/50 text-gray-400 hover:text-gray-600 transition-colors"
                  title="Abrir enlace"
                >
                  <Download className="w-4 h-4" />
                </a>
              </div>
            </div>
          );
        })}
      </div>

      {previewUrl && (
        <div 
          className={`fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm transition-all duration-300 ${
            isFullscreen ? 'p-0' : 'p-2 sm:p-4'
          }`}
          onClick={(e) => {
            if (e.target === e.currentTarget && !isFullscreen) {
              closePreview();
            }
          }}
        >
          <div 
            ref={modalRef}
            className={`bg-white shadow-2xl flex flex-col overflow-hidden transition-all duration-300 ${
              isFullscreen 
                ? 'w-full h-full rounded-none' 
                : 'w-full max-w-6xl rounded-2xl max-h-[95vh]'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-gray-100 flex-shrink-0 bg-white">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  previewType === 'google-slide' ? 'bg-amber-50' :
                  previewType === 'google-doc' ? 'bg-blue-50' :
                  previewType === 'google-sheet' ? 'bg-green-50' :
                  'bg-[#e6f4f2]'
                }`}>
                  {getFileIcon(previewUrl, previewTitle)}
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-gray-900 truncate max-w-[200px] sm:max-w-[400px]">
                    {previewTitle}
                  </h3>
                  <p className="text-xs text-gray-400 flex items-center gap-1">
                    <span>{getFileTypeLabel(previewUrl, previewTitle)}</span>
                    <span className="hidden sm:inline">• Vista previa</span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-0.5 flex-shrink-0 ml-2">
                <button
                  onClick={toggleFullscreen}
                  className="p-1.5 sm:p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
                >
                  {isFullscreen ? (
                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9L4 4m0 0l5 5M4 4l5 5m-5-5v5m0-5h5m6 6l5 5m0 0l-5-5m5 5v-5m0 5h-5" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
                    </svg>
                  )}
                </button>
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 sm:p-2 text-gray-400 hover:text-[#0f766e] hover:bg-[#e6f4f2] rounded-lg transition-colors"
                  title="Abrir en nueva ventana"
                >
                  <Download className="w-4 h-4 sm:w-5 sm:h-5" />
                </a>
                <button
                  onClick={closePreview}
                  className="p-1.5 sm:p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Cerrar (ESC)"
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
            </div>

            <div className={`flex-1 relative bg-gray-50 ${isFullscreen ? '' : 'min-h-[500px]'}`}>
              {isLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 z-10">
                  <div className="w-12 h-12 border-4 border-[#e6f4f2] border-t-[#0f766e] rounded-full animate-spin"></div>
                  <p className="text-sm text-gray-400 mt-4 font-medium">Cargando vista previa...</p>
                </div>
              )}
              
              {error ? (
                <div className="flex flex-col items-center justify-center h-full p-6 sm:p-8 text-center">
                  <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center mb-4">
                    <AlertCircle className="w-8 h-8 text-amber-500" />
                  </div>
                  <p className="text-sm text-gray-600 max-w-md">{error}</p>
                  <div className="flex flex-col sm:flex-row items-center gap-3 mt-4">
                    <a
                      href={previewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-[#0f766e] text-white rounded-lg hover:bg-[#0d5e57] transition-colors text-sm font-medium w-full sm:w-auto text-center"
                    >
                      Abrir enlace directamente
                    </a>
                    <button
                      onClick={closePreview}
                      className="px-4 py-2 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors text-sm w-full sm:w-auto"
                    >
                      Cerrar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="w-full h-full" style={{ minHeight: '500px' }}>
                  <iframe
                    ref={iframeRef}
                    src={previewUrl}
                    className="w-full h-full border-0"
                    allowFullScreen
                    title={`Vista previa de ${previewTitle}`}
                    onLoad={handleIframeLoad}
                    onError={handleIframeError}
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-presentation"
                    loading="lazy"
                    style={{
                      width: '100%',
                      height: '100%',
                      minHeight: '500px',
                      display: 'block'
                    }}
                  />
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-4 sm:px-6 py-2.5 border-t border-gray-100 flex-shrink-0 bg-white gap-2 sm:gap-0">
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400 flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-[#0f766e]" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/>
                  </svg>
                  {previewType === 'google-slide' ? 'Google Slides' :
                   previewType === 'google-doc' ? 'Google Docs' :
                   previewType === 'google-sheet' ? 'Google Sheets' :
                   'Google Drive'}
                </span>
                <span className="hidden sm:block w-px h-3 bg-gray-200" />
                <span className="text-xs text-gray-400 hidden sm:inline">
                  {isFullscreen ? 'Pantalla completa' : 'Vista previa'}
                </span>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  onClick={closePreview}
                  className="text-xs text-gray-400 hover:text-gray-600 transition-colors px-3 py-1 hover:bg-gray-100 rounded-lg"
                >
                  Cerrar
                </button>
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-medium text-white bg-[#0f766e] hover:bg-[#0d5e57] transition-colors px-3 py-1 rounded-lg whitespace-nowrap"
                >
                  Abrir en Drive
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        .min-h-\\[500px\\] {
          min-height: 500px;
        }
        @media (max-width: 640px) {
          .min-h-\\[500px\\] {
            min-height: 350px;
          }
        }
      `}</style>
    </>
  );
};

// ============================================================
// COMENTARIOS
// ============================================================
const ComentariosLeccion = ({ isBlocked = false }) => {
  const [comentarios] = useState([
    {
      id: 1,
      usuario: 'Robert Araujo',
      rol: 'Estudiante',
      fecha: 'Hace un año',
      contenido: 'Pfff, este curso promete mucho! Y la edición es tremenda.',
      likes: 25
    }
  ]);
  const [nuevoComentario, setNuevoComentario] = useState('');

  const handleEnviar = () => {
    if (!nuevoComentario.trim()) return;
    setNuevoComentario('');
  };

  if (isBlocked) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[200px] bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 p-8">
        <Lock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-400 font-medium">Comentarios bloqueados</p>
        <p className="text-sm text-gray-300">Solicita acceso para participar en los comentarios</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <MessageSquare className="w-5 h-5 text-gray-400" />
        <h3 className="text-sm font-semibold text-gray-700">Comentarios</h3>
        <Badge variant="secondary" size="sm">{comentarios.length}</Badge>
      </div>

      <div className="flex gap-3">
        <div className="w-10 h-10 rounded-full bg-[#e6f4f2] flex items-center justify-center flex-shrink-0">
          <span className="text-sm font-medium text-[#0f766e]">T</span>
        </div>
        <div className="flex-1">
          <textarea
            value={nuevoComentario}
            onChange={(e) => setNuevoComentario(e.target.value)}
            placeholder="Escribe tu comentario..."
            className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl outline-none focus:border-[#0f766e] focus:ring-2 focus:ring-[#0f766e]/20 transition-all resize-none min-h-[80px]"
          />
          <div className="flex justify-end mt-2">
            <button
              onClick={handleEnviar}
              disabled={!nuevoComentario.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-[#0f766e] rounded-lg hover:bg-[#0d5e57] transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              Comentar
            </button>
          </div>
        </div>
      </div>

      {comentarios.map((comentario) => (
        <div key={comentario.id} className="border-b border-gray-100 pb-4">
          <div className="flex gap-3">
            <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-medium text-gray-600">
                {comentario.usuario.charAt(0)}
              </span>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-gray-800">{comentario.usuario}</span>
                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{comentario.rol}</span>
                <span className="text-xs text-gray-400">• {comentario.fecha}</span>
              </div>
              <p className="text-sm text-gray-700 mt-1">{comentario.contenido}</p>
              <button className="flex items-center gap-1 text-xs text-gray-400 hover:text-[#0f766e] transition-colors mt-2">
                <ThumbsUp className="w-3.5 h-3.5" />
                {comentario.likes > 0 && comentario.likes}
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// ============================================================
// FUNCIONES DE UTILIDAD
// ============================================================

const getBloquesDeLeccion = (leccion) => {
  if (leccion.bloques && Array.isArray(leccion.bloques)) {
    return leccion.bloques;
  }
  return [];
};

const getLeccionesDeModulo = (modulo) => {
  if (modulo.lecciones && Array.isArray(modulo.lecciones)) {
    return modulo.lecciones;
  }
  return [];
};

const getTipoLeccion = (leccion) => {
  // ✅ CORREGIDO: Primero verificar tipo directo en la lección (para examenes/cuestionarios asignados)
  if (leccion.tipo && leccion.tipo !== 'bloque') {
    return leccion.tipo;
  }
  const bloques = getBloquesDeLeccion(leccion);
  if (bloques.length > 0) {
    return bloques[0].tipo || 'texto';
  }
  return 'texto';
};

const getTipoIcon = (tipo) => {
  switch(tipo) {
    case 'video': return <Video className="w-4 h-4" />;
    case 'texto': return <FileText className="w-4 h-4" />;
    case 'quiz': return <BookOpen className="w-4 h-4" />;
    case 'examen': return <Award className="w-4 h-4" />;
    case 'recurso': return <LinkIcon className="w-4 h-4" />;
    default: return <FileText className="w-4 h-4" />;
  }
};

const getTipoLabel = (tipo) => {
  const labels = {
    video: 'Video',
    texto: 'Texto',
    quiz: 'Cuestionario',
    examen: 'Examen',
    recurso: 'Recurso'
  };
  return labels[tipo] || tipo;
};

// ============================================================
// COMPONENTE DE LECCIÓN (con soporte para bloqueado)
// ============================================================
const LeccionItem = ({ 
  leccion, 
  index, 
  isCompletada, 
  isBloqueada, 
  onClick,
  modulo 
}) => {
  const bloques = getBloquesDeLeccion(leccion);
  const tipoPrincipal = getTipoLeccion(leccion);
  const totalBloques = bloques.length;

  if (isBloqueada) {
    return (
      <div 
        className="w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 text-left border border-gray-100/50 bg-gray-50/30 cursor-pointer hover:bg-gray-50/80 group"
        onClick={onClick}
      >
        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-400 flex-shrink-0">
          {index + 1}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-gray-500 truncate group-hover:text-gray-700 transition-colors">
              {leccion.titulo}
            </p>
            <div className="flex items-center gap-1">
              <Badge variant="secondary" size="sm" className="text-[10px] bg-gray-100/50">
                {getTipoLabel(tipoPrincipal)}
              </Badge>
              {totalBloques > 1 && (
                <Badge variant="secondary" size="sm" className="text-[10px] bg-gray-100/50">
                  <Layers className="w-3 h-3 inline mr-0.5" />
                  {totalBloques}
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5">
            <span className="flex items-center gap-0.5">
              {getTipoIcon(tipoPrincipal)}
              {getTipoLabel(tipoPrincipal)}
            </span>
            {leccion.duracion && (
              <>
                <span>•</span>
                <span className="flex items-center gap-0.5">
                  <Clock className="w-3 h-3" />
                  {leccion.duracion}
                </span>
              </>
            )}
            <span className="flex items-center gap-0.5 text-gray-300 ml-1">
              <Lock className="w-3 h-3" />
              <span className="text-[10px]">Vista previa</span>
            </span>
          </div>
        </div>
        <div className="flex-shrink-0">
          <Eye className="w-4 h-4 text-gray-300 group-hover:text-gray-400 transition-colors" />
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 text-left ${
        isCompletada ? 'bg-gray-50/50 hover:bg-gray-100' : 'hover:bg-gray-50'
      } border border-transparent hover:border-gray-200 group`}
    >
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 ${
        isCompletada ? 'bg-[#0f766e] text-white' : 'bg-gray-100 text-gray-500'
      }`}>
        {isCompletada ? <Check className="w-4 h-4" /> : index + 1}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className={`text-sm font-medium truncate ${
            isCompletada ? 'text-gray-500' : 'text-gray-800'
          }`}>
            {leccion.titulo}
          </p>
          {isCompletada && (
            <Badge variant="success" size="sm" className="text-[10px]">Completada</Badge>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <span className="flex items-center gap-1">
            {getTipoIcon(tipoPrincipal)}
            {getTipoLabel(tipoPrincipal)}
          </span>
          {totalBloques > 1 && (
            <>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Layers className="w-3 h-3" />
                {totalBloques} bloques
              </span>
            </>
          )}
        </div>
      </div>
      <div className="flex-shrink-0">
        {isCompletada ? (
          <CheckCircle className="w-5 h-5 text-[#0f766e]" />
        ) : (
          <Play className="w-5 h-5 text-gray-300 group-hover:text-[#0f766e] transition-colors" />
        )}
      </div>
    </button>
  );
};

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================
const DetalleCurso = ({ 
  cursoId: cursoIdProp = null,
  usuarioId = null, 
  onVolver, 
  onGenerarCertificado, 
  onEditarCurso 
}) => {
  const { cursoId: cursoIdParams } = useParams();
  const cursoId = cursoIdProp || cursoIdParams;
  const navigate = useNavigate();

  const [tabActiva, setTabActiva] = useState('contenido');
  const [curso, setCurso] = useState(null);
  const [progreso, setProgreso] = useState(0);
  const [leccionesCompletadas, setLeccionesCompletadas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [moduloAbierto, setModuloAbierto] = useState([]);
  const [tieneAcceso, setTieneAcceso] = useState(false);
  const [tieneSolicitudPendiente, setTieneSolicitudPendiente] = useState(false);
  const [solicitando, setSolicitando] = useState(false);
  const [mensajeSolicitud, setMensajeSolicitud] = useState('');
  const [mostrarFormularioSolicitud, setMostrarFormularioSolicitud] = useState(false);

  const [leccionActual, setLeccionActual] = useState(null);
  const [moduloActual, setModuloActual] = useState(null);
  const [mostrandoLeccion, setMostrandoLeccion] = useState(false);
  const [seccionLeccion, setSeccionLeccion] = useState('contenido');
  const [videoCompletado, setVideoCompletado] = useState(false);
  const [marcando, setMarcando] = useState(false);

  // ✅ ESTADOS PARA EXAMEN
  const [examenActivo, setExamenActivo] = useState(null);
  const [cargandoExamen, setCargandoExamen] = useState(false);
  const [errorExamen, setErrorExamen] = useState('');

  const [certificado, setCertificado] = useState(null);
  const [cursoCompletado, setCursoCompletado] = useState(false);
  const [certificadosCurso, setCertificadosCurso] = useState([]);
  const [cargandoCertificados, setCargandoCertificados] = useState(false);
  const [verCertificadoId, setVerCertificadoId] = useState(null);

  const usuario = authService.getCurrentUser();
  const esDocente = usuario?.rol === 'docente' || usuario?.rol === 'admin';
  const esEstudiante = usuario?.rol === 'estudiante';

  // ✅ HANDLER CORREGIDO PARA VOLVER A CURSOS
  const handleVolverCursos = () => {
    const rol = usuario?.rol || 'estudiante';
    
    // Si hay una función onVolver prop, usarla
    if (onVolver) {
      onVolver();
      return;
    }
    
    // Navegar a la ruta correcta según el rol
    if (rol === 'admin') {
      navigate('/admin/cursos');
    } else if (rol === 'docente') {
      navigate('/docente/cursos');
    } else {
      navigate('/estudiante/cursos');
    }
  };

  const tabs = [
    { id: 'contenido', label: 'Contenido', icon: BookOpen, visible: true },
    { id: 'foro', label: 'Foro', icon: MessageSquare, visible: true },
    ...(esEstudiante ? [{ id: 'calificaciones', label: 'Calificaciones', icon: BarChart3, visible: true }] : []),
    ...(esDocente ? [{ id: 'estudiantes', label: 'Estudiantes', icon: Users, visible: true }] : []),
    ...(esDocente ? [{ id: 'solicitudes', label: 'Solicitudes', icon: Send, visible: true }] : []),
    ...(esDocente ? [{ id: 'certificados', label: 'Certificados', icon: Award, visible: true }] : []),
    ...(esDocente && onEditarCurso ? [{ id: 'configuracion', label: 'Configuración', icon: Settings, visible: true }] : []),
  ].filter(t => t.visible);

  // Cargar curso
  useEffect(() => {
    const cargarCurso = async () => {
      if (!cursoId) {
        setError('ID del curso no proporcionado');
        setCargando(false);
        return;
      }
      
      setCargando(true);
      setError('');
      try {
        const data = await cursosService.obtener(cursoId);
        setCurso(data);
        setModuloAbierto(data?.modulos?.[0]?.id ? [data.modulos[0].id] : []);
        setTieneAcceso(data?.tiene_acceso || false);
        setTieneSolicitudPendiente(data?.tiene_solicitud_pendiente || false);

        if (usuarioId && !esDocente) {
          if (data.tiene_acceso || data.precio_tipo !== 'pago') {
            try {
              const prog = await cursosService.obtenerProgreso(cursoId, usuarioId);
              setProgreso(prog?.progreso || 0);
              setLeccionesCompletadas(prog?.lecciones_completadas || []);
              setCursoCompletado(prog?.completado || false);
            } catch (e) {
              console.warn('No se pudo obtener progreso:', e);
            }
            try {
              const certs = await certificadosService.listar({ curso_id: cursoId, estudiante_id: usuarioId });
              const activos = (Array.isArray(certs) ? certs : []).filter(c => c.estado !== 'cancelado');
              setCertificado(activos[0] || null);
            } catch (e) {
              console.warn('No se pudo obtener certificado:', e);
            }
          } else {
            setProgreso(0);
            setLeccionesCompletadas([]);
          }
        }
      } catch (e) {
        console.error('Error cargando curso:', e);
        setError(e.message || 'No se pudo cargar el curso');
      } finally {
        setCargando(false);
      }
    };
    cargarCurso();
  }, [cursoId, usuarioId, esDocente]);

  // El progreso y completado vienen del backend (inscripcion.progreso / inscripcion.completado)
  // NO se recalcula localmente para evitar desincronización.
  // Los valores se actualizan cuando se carga el curso o se completa una lección.

  // Handlers
  const handleAbrirLeccion = (modulo, leccion) => {
    if (curso?.precio_tipo === 'pago' && !tieneAcceso && !esDocente) {
      setModuloActual(modulo);
      setLeccionActual(leccion);
      setMostrandoLeccion(true);
      setVideoCompletado(false);
      setSeccionLeccion('contenido');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    
    setModuloActual(modulo);
    setLeccionActual(leccion);
    setMostrandoLeccion(true);
    setVideoCompletado(false);
    setSeccionLeccion('contenido');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCerrarLeccion = () => {
    setMostrandoLeccion(false);
    setLeccionActual(null);
    setModuloActual(null);
  };

  const handleMarcarCompletada = async () => {
    if (!usuarioId || !curso?.id || !leccionActual?.id) return;
    if (leccionesCompletadas.includes(leccionActual.id)) return;

    setMarcando(true);
    try {
      await cursosService.completarLeccion(curso.id, leccionActual.id, usuarioId);
      const prog = await cursosService.obtenerProgreso(cursoId, usuarioId);
      setProgreso(prog?.progreso || 0);
      setLeccionesCompletadas(prog?.lecciones_completadas || []);
      setCursoCompletado(prog?.completado || false);
      setVideoCompletado(true);
      
      // Si el curso se completó, cargar el certificado (puede tardar un momento en crearse)
      if (prog?.completado) {
        setTimeout(async () => {
          try {
            const certs = await certificadosService.listar({ curso_id: cursoId, estudiante_id: usuarioId });
            const activos = (Array.isArray(certs) ? certs : []).filter(c => c.estado !== 'cancelado');
            setCertificado(activos[0] || null);
          } catch (e) {
            console.warn('Certificado aún no disponible:', e);
          }
        }, 1000); // Esperar 1 segundo para que el backend cree el certificado
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setMarcando(false);
    }
  };

  const handleSolicitarAcceso = async () => {
    if (!mensajeSolicitud.trim()) {
      alert('Por favor, escribe un mensaje para el docente');
      return;
    }
    setSolicitando(true);
    try {
      await cursosService.solicitarAcceso(cursoId, {
        mensaje_estudiante: mensajeSolicitud
      });
      setTieneSolicitudPendiente(true);
      setMostrarFormularioSolicitud(false);
      setMensajeSolicitud('');
      alert('Solicitud enviada.');
    } catch (e) {
      alert(e.message || 'No se pudo enviar la solicitud');
    } finally {
      setSolicitando(false);
    }
  };

  const handleCertificado = (idCurso) => {
    if (onGenerarCertificado) {
      onGenerarCertificado(idCurso);
      return;
    }
    if (esDocente) {
      setTabActiva('certificados');
      cargarCertificadosCurso();
      return;
    }
    navigate('/estudiante/certificados');
  };

  const cargarCertificadosCurso = async () => {
    setCargandoCertificados(true);
    try {
      const certs = await certificadosService.listar({ curso_id: cursoId });
      setCertificadosCurso(Array.isArray(certs) ? certs : []);
    } catch (e) {
      setCertificadosCurso([]);
    } finally {
      setCargandoCertificados(false);
    }
  };

  // Renderizar contenido de la lección
  const renderContenidoLeccion = () => {
    if (!leccionActual) return null;
    
    const bloques = getBloquesDeLeccion(leccionActual);
    const tipoLeccion = getTipoLeccion(leccionActual);
    const estaBloqueado = curso?.precio_tipo === 'pago' && !tieneAcceso && !esDocente;

    // ✅ CORREGIDO: Lecciones tipo examen o quiz no tienen bloques — manejar directamente
    if (bloques.length === 0) {
      // Si hay examen activo cargado, mostrar ExamenActivo
      if (tipoLeccion === 'examen' && examenActivo) {
        return (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden" style={{ minHeight: '600px' }}>
            <ExamenActivo
              examen={examenActivo}
              alumno={{ id: usuario?.id || usuarioId }}
              onFinalizar={(resultado) => {
                setExamenActivo(null);
                setSeccionLeccion('contenido');
                // Marcar lección como completada
                if (curso?.id && leccionActual?.id && usuarioId) {
                  cursosService.completarLeccion(curso.id, leccionActual.id, usuarioId).catch(() => {});
                }
              }}
              onAbandonar={() => {
                setExamenActivo(null);
                setSeccionLeccion('contenido');
              }}
            />
          </div>
        );
      }

      // Si hay examen cargando
      if (tipoLeccion === 'examen' && cargandoExamen) {
        return (
          <div className="flex flex-col items-center justify-center min-h-[300px] bg-white rounded-xl border border-gray-200">
            <Loader2 className="w-8 h-8 animate-spin text-[#0f766e] mx-auto mb-3" />
            <p className="text-gray-500 text-sm">Cargando examen...</p>
          </div>
        );
      }

      // Si hubo error cargando examen
      if (tipoLeccion === 'examen' && errorExamen) {
        return (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
            <AlertCircle className="w-12 h-12 text-red-300 mx-auto mb-2" />
            <p className="text-red-500 font-medium">{errorExamen}</p>
            <button onClick={() => { setErrorExamen(''); setSeccionLeccion('contenido'); }}
              className="mt-3 px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
              Volver
            </button>
          </div>
        );
      }

      // Lecciones tipo examen sin cargar — mostrar botón para iniciar
      if (tipoLeccion === 'examen') {
        const contenidoLeccion = leccionActual.contenido || {};
        return (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <Award className="w-16 h-16 text-amber-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Examen</h3>
            <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
              Responde todas las preguntas dentro del tiempo límite. Tu calificación se calculará automáticamente.
            </p>
            {contenidoLeccion.examen_id ? (
              <button
                onClick={async () => {
                  if (!contenidoLeccion.examen_id) return;
                  setCargandoExamen(true);
                  setErrorExamen('');
                  try {
                    const datos = await examenesService.obtenerExamen(contenidoLeccion.examen_id);
                    setExamenActivo(datos);
                  } catch (e) {
                    setErrorExamen('No se pudo cargar el examen. Intenta de nuevo.');
                  } finally {
                    setCargandoExamen(false);
                  }
                }}
                disabled={estaBloqueado}
                className="px-8 py-3 bg-[#0f766e] text-white rounded-lg hover:bg-[#0d5e57] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {estaBloqueado ? 'Examen bloqueado' : 'Comenzar examen'}
              </button>
            ) : (
              <p className="text-sm text-gray-400">Sin examen asignado</p>
            )}
          </div>
        );
      }

      // Para cualquier otro tipo sin bloques
      return (
        <div className="text-center py-12 text-gray-400 bg-white rounded-xl border border-gray-200">
          <FileText className="w-12 h-12 mx-auto mb-2 text-gray-300" />
          <p>Esta lección no tiene contenido</p>
        </div>
      );
    }

    const bloquePrincipal = bloques[0];
    const contenido = bloquePrincipal.contenido || {};

    switch (bloquePrincipal.tipo) {
      case 'video':
        return <VideoPlayer videoId={contenido.video_url} isBlocked={estaBloqueado} />;
        
      case 'texto':
        return (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <RichTextDisplay content={contenido.texto || ''} isBlocked={estaBloqueado} />
          </div>
        );
        
      case 'recurso':
        return (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <RecursosDisplay recursos={contenido.archivos || []} isBlocked={estaBloqueado} />
          </div>
        );
        
      case 'examen':
        if (estaBloqueado) {
          return (
            <div className="flex flex-col items-center justify-center min-h-[200px] bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 p-8">
              <Lock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-400 font-medium">Examen bloqueado</p>
              <p className="text-sm text-gray-300">Solicita acceso para realizar este examen</p>
            </div>
          );
        }
        return (
          <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
            <Award className="w-12 h-12 text-amber-500 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-gray-900">Examen</h3>
            <p className="text-sm text-gray-500 mb-4">
              {contenido.examen_id ? 'Examen asignado' : 'Sin examen asignado'}
            </p>
            {contenido.examen_id ? (
              <button
                onClick={async () => {
                  setCargandoExamen(true);
                  setErrorExamen('');
                  try {
                    const datos = await examenesService.obtenerExamen(contenido.examen_id);
                    setExamenActivo(datos);
                  } catch (e) {
                    setErrorExamen('No se pudo cargar el examen. Intenta de nuevo.');
                  } finally {
                    setCargandoExamen(false);
                  }
                }}
                className="px-6 py-2 bg-[#0f766e] text-white rounded-lg hover:bg-[#0d5e57] transition-colors text-sm"
              >
                Comenzar examen
              </button>
            ) : (
              <p className="text-sm text-gray-400">Sin examen asignado</p>
            )}
          </div>
        );
        
      case 'quiz':
        return (
          <div className="text-center py-12 text-gray-400 bg-white rounded-xl border border-gray-200">
            <BookOpen className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p>Los cuestionarios fueron integrados en el sistema de exámenes</p>
          </div>
        );
        
      default:
        return (
          <div className="text-center py-12 text-gray-400 bg-white rounded-xl border border-gray-200">
            <FileText className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p>Contenido no disponible</p>
          </div>
        );
    }
  };

  // Renderizar lista de bloques adicionales
  const renderListaBloques = () => {
    if (!leccionActual) return null;
    const bloques = getBloquesDeLeccion(leccionActual);
    const estaBloqueado = curso?.precio_tipo === 'pago' && !tieneAcceso && !esDocente;
    
    const bloquesAdicionales = bloques.slice(1).filter(b => 
      b.tipo === 'texto' || b.tipo === 'video'
    );
    
    if (bloquesAdicionales.length === 0) {
      return <p className="text-gray-400 text-sm text-center py-4">No hay contenido adicional</p>;
    }

    if (estaBloqueado) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[150px] bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 p-6">
          <Lock className="w-10 h-10 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-400 font-medium text-sm">Contenido adicional bloqueado</p>
          <p className="text-xs text-gray-300">Solicita acceso para ver el contenido completo</p>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        <p className="text-sm font-medium text-gray-700 mb-2">Contenido adicional:</p>
        {bloquesAdicionales.map((bloque, index) => {
          const contenido = bloque.contenido || {};
          let preview = '';
          
          if (bloque.tipo === 'texto') {
            preview = contenido.texto || 'Sin contenido';
          } else if (bloque.tipo === 'video') {
            preview = contenido.video_url || 'Sin video';
          }
          
          return (
            <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100 hover:bg-gray-100 transition-colors">
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600 flex-shrink-0 mt-0.5">
                {index + 2}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800">
                  {bloque.titulo || `Bloque ${index + 2}`}
                </p>
                {bloque.tipo === 'texto' && (
                  <div className="text-sm text-gray-600 mt-1 prose prose-slate max-w-none">
                    <div dangerouslySetInnerHTML={{ __html: preview }} />
                  </div>
                )}
                {bloque.tipo === 'video' && (
                  <p className="text-xs text-gray-500 truncate">
                    {preview}
                  </p>
                )}
              </div>
              <Badge variant="secondary" size="sm" className="flex-shrink-0">
                {getTipoLabel(bloque.tipo)}
              </Badge>
            </div>
          );
        })}
      </div>
    );
  };

  // ============================================================
  // RENDER
  // ============================================================

  if (cargando) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="relative">
          <div className="w-12 h-12 border-4 border-[#e6f4f2] border-t-[#0f766e] rounded-full animate-spin"></div>
        </div>
        <span className="text-sm text-gray-400 mt-4">Cargando curso...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <button onClick={() => navigate('/cursos')} className="text-gray-500 hover:text-gray-700 mb-4">
          ← Volver
        </button>
        <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-red-600 font-medium">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (!curso) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <button onClick={() => navigate('/cursos')} className="text-gray-500 hover:text-gray-700 mb-4">
          ← Volver
        </button>
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-8 text-center">
          <FolderOpen className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
          <p className="text-gray-700 font-medium">Curso no encontrado</p>
          <button onClick={() => navigate('/cursos')} className="mt-4 px-4 py-2 bg-gray-900 text-white rounded-lg">
            Volver a cursos
          </button>
        </div>
      </div>
    );
  }

  const estaBloqueado = curso?.precio_tipo === 'pago' && !tieneAcceso && !esDocente;

  // ============================================================
  // RENDER: LECCIÓN EMBEBIDA (CON SOPORTE PARA BLOQUEADO)
  // ============================================================
  if (mostrandoLeccion && leccionActual) {
    const estaCompletada = leccionesCompletadas.includes(leccionActual.id) || videoCompletado;
    const leccionesDelModulo = getLeccionesDeModulo(moduloActual || {});
    const indexActual = leccionesDelModulo.findIndex(l => l.id === leccionActual.id);
    const bloques = getBloquesDeLeccion(leccionActual);
    const esBloqueada = curso?.precio_tipo === 'pago' && !tieneAcceso && !esDocente;

    return (
      <div className="bg-[#f8f9fa] min-h-screen">
        {/* Header */}
        <div className="sticky top-0 z-20 bg-white border-b border-gray-200/50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <button onClick={handleCerrarLeccion} className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-600 flex-shrink-0">
                <ArrowLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-medium text-gray-700 truncate min-w-0">
                {leccionActual?.titulo || 'Lección'}
              </span>
              <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
                {esBloqueada && (
                  <Badge variant="secondary" size="sm" className="gap-1">
                    <Lock className="w-3 h-3" /> Vista previa
                  </Badge>
                )}
                {estaCompletada && !esBloqueada && (
                  <Badge variant="success" size="sm" className="gap-1">
                    <Check className="w-3 h-3" /> Completada
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-xs text-gray-400 hidden sm:block">
                {progreso}% completado
              </span>
              {!esBloqueada && (
                <button
                  onClick={handleMarcarCompletada}
                  disabled={marcando || estaCompletada}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
                    estaCompletada ? 'bg-emerald-50 text-emerald-600' : 'bg-[#0f766e] text-white hover:bg-[#0d5e57]'
                  } disabled:opacity-50`}
                >
                  {marcando ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : estaCompletada ? (
                    <><Check className="w-3.5 h-3.5" /> Completada</>
                  ) : (
                    <><Check className="w-3.5 h-3.5" /> Completar</>
                  )}
                </button>
              )}
              {esBloqueada && (
                <button
                  onClick={() => setMostrarFormularioSolicitud(true)}
                  className="px-3 py-1.5 text-xs font-medium text-white rounded-lg transition-colors flex items-center gap-1.5"
                  style={{ backgroundColor: '#0f766e' }}
                >
                  <Send className="w-3.5 h-3.5" /> Solicitar acceso
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Contenido */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{leccionActual?.titulo || 'Lección sin título'}</h1>
            <div className="flex items-center gap-3 mt-2 text-xs text-gray-400 flex-wrap">
              <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{leccionActual?.duracion || 'Sin duración'}</span>
              <span className="flex items-center gap-1"><BookOpen className="w-3.5 h-3.5" />{moduloActual?.titulo || 'Módulo'}</span>
              <span className="flex items-center gap-1"><Layers className="w-3.5 h-3.5" />{bloques.length} bloques</span>
              {esBloqueada && (
                <span className="flex items-center gap-1 text-amber-600">
                  <Lock className="w-3.5 h-3.5" />
                  Vista previa
                </span>
              )}
            </div>
          </div>

          {/* Contenido principal (primer bloque) */}
          {renderContenidoLeccion()}

          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="flex gap-4 sm:gap-6 overflow-x-auto">
              {[
                { id: 'contenido', label: 'Contenido', icon: FileText },
                { id: 'recursos', label: 'Recursos', icon: LinkIcon },
                { id: 'comentarios', label: 'Comentarios', icon: MessageSquare }
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = seccionLeccion === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setSeccionLeccion(tab.id)}
                    className={`flex items-center gap-2 pb-3 text-sm font-medium transition-colors whitespace-nowrap ${
                      isActive ? 'text-[#0f766e] border-b-2 border-[#0f766e]' : 'text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Contenido de tabs */}
          <div>
            {seccionLeccion === 'contenido' && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                {renderListaBloques()}
              </div>
            )}
            
            {seccionLeccion === 'recursos' && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                {bloques.filter(b => b.tipo === 'recurso').map((bloque, index) => (
                  <RecursosDisplay key={index} recursos={bloque.contenido?.archivos || []} isBlocked={esBloqueada} />
                ))}
                {bloques.filter(b => b.tipo === 'recurso').length === 0 && (
                  <p className="text-gray-400 text-center py-4">No hay recursos disponibles</p>
                )}
              </div>
            )}
            
            {seccionLeccion === 'comentarios' && <ComentariosLeccion isBlocked={esBloqueada} />}
          </div>

          {/* Navegación entre lecciones */}
          {leccionesDelModulo.length > 1 && !esBloqueada && (
            <div className="flex items-center justify-between pt-6 border-t border-gray-200">
              <button
                onClick={() => {
                  if (indexActual > 0) {
                    setLeccionActual(leccionesDelModulo[indexActual - 1]);
                    setVideoCompletado(false);
                  }
                }}
                disabled={indexActual === 0}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  indexActual > 0 ? 'text-gray-600 hover:bg-gray-100' : 'text-gray-300 cursor-not-allowed'
                }`}
              >
                <ChevronLeft className="w-4 h-4" /> Anterior
              </button>
              <span className="text-xs text-gray-400">
                {indexActual + 1} / {leccionesDelModulo.length}
              </span>
              <button
                onClick={() => {
                  if (indexActual < leccionesDelModulo.length - 1) {
                    setLeccionActual(leccionesDelModulo[indexActual + 1]);
                    setVideoCompletado(false);
                  }
                }}
                disabled={indexActual === leccionesDelModulo.length - 1}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  indexActual < leccionesDelModulo.length - 1 ? 'text-gray-600 hover:bg-gray-100' : 'text-gray-300 cursor-not-allowed'
                }`}
              >
                Siguiente <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
          
          {/* Mensaje para lección bloqueada */}
          {esBloqueada && (
            <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 text-center">
              <p className="text-sm text-blue-600">
                Esta es una vista previa de la lección. Solicita acceso al docente para desbloquear todo el contenido.
              </p>
              <button
                onClick={() => setMostrarFormularioSolicitud(true)}
                className="mt-3 px-6 py-2 text-sm font-medium text-white rounded-lg transition-colors"
                style={{ backgroundColor: '#0f766e' }}
              >
                Solicitar acceso
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ============================================================
  // RENDER: VISTA PRINCIPAL DEL CURSO
  // ============================================================
  
  // Si el docente seleccionó "Ver" un certificado específico
  if (verCertificadoId) {
    return <VerCertificado certificadoId={verCertificadoId} onVolver={() => setVerCertificadoId(null)} />;
  }
  
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header - CON BOTÓN CORREGIDO */}
      <div className="flex items-center justify-between">
        <button 
          onClick={handleVolverCursos} 
          className="flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" /> Volver a cursos
        </button>
        {esDocente && (
          <button onClick={() => handleCertificado(curso.id)} className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors flex items-center gap-2 text-sm">
            <Award className="w-4 h-4" /> Certificado
          </button>
        )}
      </div>

      {/* Info del curso */}
      <div className="bg-white rounded-2xl border border-gray-200/60 overflow-hidden shadow-sm">
        {/* Imagen de portada */}
        {curso.imagen_url && (
          <div className="relative h-48 sm:h-56 bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
            <img 
              src={resolveImageUrl(curso.imagen_url)} 
              alt={curso.titulo}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
          </div>
        )}
        
        <div className="p-6 space-y-4">
          <div className="flex items-start gap-4">
            {!curso.imagen_url && (
              <div className="w-14 h-14 rounded-2xl bg-[#0f766e]/10 flex items-center justify-center flex-shrink-0">
                <GraduationCap className="w-7 h-7 text-[#0f766e]" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-gray-900">{curso.titulo}</h1>
              <p className="text-sm text-gray-500 mt-1">{curso.descripcion}</p>
            </div>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100">
            <Badge variant="secondary" size="sm" className="gap-1">
              <BookOpen className="w-3 h-3" />
              {curso.modulos?.reduce((acc, m) => acc + getLeccionesDeModulo(m).length, 0) || 0} lecciones
            </Badge>
            <Badge variant="secondary" size="sm" className="gap-1">
              <Clock className="w-3 h-3" />
              {curso.duracion ? `Duración: ${curso.duracion}` : 'Sin duración definida'}
            </Badge>
            <Badge variant="secondary" size="sm" className="gap-1">
              <Users className="w-3 h-3" />
              {curso.estudiantes_count || 0} estudiantes
            </Badge>
            <Badge variant={curso.estado === 'PUBLICADO' ? 'success' : 'default'} size="sm">
              {curso.estado || 'BORRADOR'}
            </Badge>
            {curso.nivel && <Badge variant="secondary" size="sm">{curso.nivel}</Badge>}
            {curso.categoria && <Badge variant="secondary" size="sm">{curso.categoria}</Badge>}
            {(curso.docente_nombre || curso.instructor) && (
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <User className="w-3 h-3" /> {curso.docente_nombre || curso.instructor}
              </span>
            )}
          </div>

          {/* Estado de acceso */}
          {esEstudiante && (
            <div className="pt-2 border-t border-gray-100">
              {estaBloqueado ? (
                <div className="flex items-center gap-3 text-sm bg-gray-50/50 px-4 py-2.5 rounded-xl border border-gray-100/50">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <Lock className="w-4 h-4 text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-600">
                      {tieneSolicitudPendiente 
                        ? 'Solicitud de acceso pendiente de aprobación' 
                        : 'Este curso requiere acceso para ver el contenido completo'}
                    </p>
                  </div>
                  {!tieneSolicitudPendiente && (
                    <button
                      onClick={() => setMostrarFormularioSolicitud(true)}
                      className="px-4 py-1.5 text-xs font-medium text-white rounded-lg transition-colors flex-shrink-0"
                      style={{ backgroundColor: '#0f766e' }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = '#0d5e57'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = '#0f766e'}
                    >
                      Solicitar
                    </button>
                  )}
                  {tieneSolicitudPendiente && (
                    <span className="text-xs text-amber-600 bg-amber-50 px-3 py-1 rounded-full flex-shrink-0">
                      Pendiente
                    </span>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50/50 px-4 py-2.5 rounded-xl border border-emerald-100/50 text-sm">
                  <Check className="w-4 h-4 text-emerald-500" />
                  <span>Tienes acceso completo al contenido del curso</span>
                </div>
              )}
            </div>
          )}

          {/* Progreso */}
          {(esEstudiante && (tieneAcceso || curso.precio_tipo !== 'pago')) && (
            <div className="pt-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Progreso del curso</span>
                <span className="font-medium text-gray-700">{progreso}%</span>
              </div>
              <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden mt-1">
                <div className="h-full bg-[#0f766e] rounded-full transition-all duration-500" style={{ width: `${progreso}%` }} />
              </div>
            </div>
          )}

          {/* Solicitud de acceso - Formulario */}
          {esEstudiante && estaBloqueado && mostrarFormularioSolicitud && !tieneSolicitudPendiente && (
            <div className="pt-2 border-t border-gray-100">
              <div className="bg-gray-50 rounded-xl p-4 space-y-3 border border-gray-100">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-gray-400" />
                  <p className="text-sm font-medium text-gray-700">Solicitar acceso al curso</p>
                </div>
                <p className="text-xs text-gray-400">Escribe un mensaje para el docente explicando por qué deseas acceder a este curso.</p>
                <textarea
                  value={mensajeSolicitud}
                  onChange={(e) => setMensajeSolicitud(e.target.value)}
                  placeholder="Hola, me gustaría acceder a este curso porque..."
                  rows={3}
                  className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#0f766e] focus:ring-2 focus:ring-[#0f766e]/20 transition-all resize-none bg-white"
                />
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSolicitarAcceso}
                    disabled={solicitando}
                    className="px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                    style={{ backgroundColor: '#0f766e' }}
                  >
                    {solicitando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Enviar solicitud
                  </button>
                  <button
                    onClick={() => setMostrarFormularioSolicitud(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Certificado */}
          {esEstudiante && curso?.certificado_habilitado !== false && (certificado || cursoCompletado) && (
            <div className={`rounded-xl border p-4 flex items-center justify-between ${certificado ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
              <div className="flex items-center gap-3">
                <Award className={`w-5 h-5 ${certificado ? 'text-emerald-600' : 'text-amber-600'}`} />
                <div>
                  <p className="text-sm font-medium text-gray-900">{certificado ? 'Curso completado' : 'Completa el curso para obtener tu certificado'}</p>
                  {certificado && <p className="text-xs text-gray-500">{certificado.codigo} - {new Date(certificado.fecha_emision || Date.now()).toLocaleDateString()}</p>}
                </div>
              </div>
              {certificado && (
                <button onClick={() => handleCertificado(curso.id)} className="px-4 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm">
                  Ver certificado
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-4 sm:gap-6 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = tabActiva === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setTabActiva(tab.id);
                  if (tab.id === 'certificados') cargarCertificadosCurso();
                }}
                className={`flex items-center gap-2 pb-3 text-sm font-medium transition-colors whitespace-nowrap ${
                  isActive ? 'text-[#0f766e] border-b-2 border-[#0f766e]' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <Icon className="w-4 h-4" /> {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Contenido de tabs */}
      <div>
        {tabActiva === 'contenido' && (
          <div className="space-y-4">
            {(curso.modulos || []).map((modulo) => {
              const leccionesModulo = getLeccionesDeModulo(modulo);
              const completadasModulo = leccionesModulo.filter(l => leccionesCompletadas.includes(l.id)).length;
              const totalModulo = leccionesModulo.length;
              const moduloBloqueado = curso.precio_tipo === 'pago' && !tieneAcceso && !esDocente;

              return (
                <div key={modulo.id} className="bg-white rounded-xl border border-gray-200/60 overflow-hidden shadow-sm">
                  <button
                    onClick={() => setModuloAbierto(prev => 
                      prev.includes(modulo.id) 
                        ? prev.filter(id => id !== modulo.id) 
                        : [...prev, modulo.id]
                    )}
                    className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-gray-900">{modulo.titulo}</span>
                      {totalModulo > 0 && (
                        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                          {moduloBloqueado ? totalModulo : `${completadasModulo}/${totalModulo}`} lecciones
                        </span>
                      )}
                      {moduloBloqueado && (
                        <span className="text-xs text-gray-300 flex items-center gap-1">
                          <Lock className="w-3 h-3" />
                          Bloqueado
                        </span>
                      )}
                    </div>
                    <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${moduloAbierto.includes(modulo.id) ? 'rotate-180' : ''}`} />
                  </button>

                  {moduloAbierto.includes(modulo.id) && (
                    <div className="px-5 pb-4 space-y-1.5 border-t border-gray-100 pt-3">
                      {leccionesModulo.map((leccion, index) => {
                        const isCompletada = leccionesCompletadas.includes(leccion.id);
                        const esBloqueada = moduloBloqueado;

                        return (
                          <LeccionItem
                            key={leccion.id}
                            leccion={leccion}
                            index={index}
                            isCompletada={isCompletada}
                            isBloqueada={esBloqueada}
                            onClick={() => handleAbrirLeccion(modulo, leccion)}
                            modulo={modulo}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {(!curso.modulos || curso.modulos.length === 0) && (
              <div className="text-center py-16 bg-white rounded-xl border-2 border-dashed border-gray-200">
                <FolderOpen className="w-14 h-14 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 font-medium">Este curso aún no tiene contenido</p>
                {esDocente && (
                  <button onClick={() => onEditarCurso?.(curso)} className="mt-4 px-4 py-2 bg-[#0f766e] text-white rounded-lg hover:bg-[#0d5e57] transition-colors text-sm">
                    Agregar contenido
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {tabActiva === 'foro' && <ForoCurso cursoId={cursoId} />}
        {esEstudiante && tabActiva === 'calificaciones' && <CalificacionesEstudiante cursoId={cursoId} />}
        {esDocente && tabActiva === 'estudiantes' && <EstudiantesCurso cursoId={cursoId} />}
        {esDocente && tabActiva === 'solicitudes' && <PanelSolicitudes cursoId={cursoId} />}
        {esDocente && tabActiva === 'certificados' && (
          <div className="bg-white rounded-xl border border-gray-200/60 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-900">Certificados</h3>
                <p className="text-xs text-gray-400">{certificadosCurso.length} emitidos</p>
              </div>
              <button onClick={() => handleCertificado(curso.id)} className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors text-sm font-medium flex items-center gap-2">
                <Award className="w-4 h-4" /> Generar
              </button>
            </div>
            {cargandoCertificados ? (
              <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
            ) : certificadosCurso.length === 0 ? (
              <div className="text-center py-8"><Award className="w-8 h-8 text-gray-300 mx-auto mb-2" /><p className="text-sm text-gray-400">No hay certificados</p></div>
            ) : (
              <div className="divide-y divide-gray-100">
                {certificadosCurso.map((cert) => (
                  <div key={cert.id} className="px-6 py-3 flex items-center justify-between">
                    <div><p className="text-sm font-medium text-gray-800">{cert.estudiante_nombre || cert.estudiante_id}</p><p className="text-xs text-gray-400">{cert.codigo}</p></div>
                    <button onClick={() => setVerCertificadoId(cert.id)} className="px-3 py-1 text-xs text-[#0f766e] border border-[#0f766e]/20 rounded-lg hover:bg-[#e6f4f2] transition-colors">Ver</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {esDocente && tabActiva === 'configuracion' && onEditarCurso && (
          <div className="bg-white rounded-xl border border-gray-200/60 p-6">
            <h3 className="text-sm font-medium text-gray-900 mb-4">Configuración del curso</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-sm text-gray-600">Estado</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${curso.estado === 'PUBLICADO' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                  {curso.estado || 'BORRADOR'}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-sm text-gray-600">Nivel</span>
                <span className="text-sm text-gray-900">{curso.nivel || 'No definido'}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-sm text-gray-600">Categoría</span>
                <span className="text-sm text-gray-900">{curso.categoria || 'Sin categoría'}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-sm text-gray-600">Precio</span>
                <span className="text-sm text-gray-900">
                  {curso.precio_tipo === 'pago' ? `${curso.moneda} ${curso.precio_monto}` : 'Gratis'}
                </span>
              </div>
              <button onClick={() => onEditarCurso(curso)} className="mt-2 px-4 py-2 bg-[#0f766e] text-white rounded-lg hover:bg-[#0d5e57] transition-colors text-sm flex items-center gap-2">
                <Edit3 className="w-4 h-4" /> Editar curso completo
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes zoomIn95 {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-in {
          animation: fadeIn 0.2s ease-out forwards;
        }
        .zoom-in-95 {
          animation: zoomIn95 0.2s ease-out forwards;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default DetalleCurso;