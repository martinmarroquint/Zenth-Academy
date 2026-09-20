// front/src/components/cursos/RecursosDisplay.jsx

import React, { useState, useEffect, useRef } from 'react';
import {
  FileText, Video, Link as LinkIcon, Eye, Download, X, AlertCircle, Lock
} from 'lucide-react';
import { useFeedback } from '../../hooks/useFeedback';

// ============================================================
// RECURSOS CON PREVISUALIZACIÓN (VERSIÓN COMPLETA)
// ============================================================
const RecursosDisplay = ({ recursos, isBlocked = false }) => {
  const { toast } = useFeedback();
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
      const fileId = url.match(/\/d\/([^/]+)/)?.[1];
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
      const folderId = url.match(/\/folders\/([^/]+)/)?.[1];
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
      toast.warning('Este contenido está bloqueado. Solicita acceso para ver los recursos.');
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
              <div className="flex items-center gap-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
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

export default React.memo(RecursosDisplay);
