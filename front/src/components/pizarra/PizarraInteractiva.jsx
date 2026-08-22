// front/src/components/pizarra/PizarraInteractiva.jsx
// VERSION QUE TE GUSTA - SIN LIBRARY Y SIN APPTOOL

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  X, Save, Download, Users, Share2, 
  PenTool, Trash2, FolderOpen, 
  Undo, Redo, ZoomIn, ZoomOut, 
  Grid, Eye, EyeOff, Maximize2, Minimize2,
  Eraser, Square, Circle, Type, 
  Move, Image as ImageIcon,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import { Excalidraw, MainMenu } from '@excalidraw/excalidraw';
import '@excalidraw/excalidraw/index.css';
import pizarraService from '../../services/pizarraService';

// =============================================
// CONFIGURACIÓN
// =============================================

const TOOLS_CONFIG = [
  { id: 'pen', icon: PenTool, label: 'Lápiz', shortcut: 'P' },
  { id: 'eraser', icon: Eraser, label: 'Borrador', shortcut: 'E' },
  { id: 'rectangle', icon: Square, label: 'Rectángulo', shortcut: 'R' },
  { id: 'circle', icon: Circle, label: 'Círculo', shortcut: 'C' },
  { id: 'text', icon: Type, label: 'Texto', shortcut: 'T' },
  { id: 'selection', icon: Move, label: 'Selección', shortcut: 'V' },
  { id: 'image', icon: ImageIcon, label: 'Imagen', shortcut: 'I' },
];

// =============================================
// TOOLBAR PERSONALIZADA
// =============================================
const Toolbar = ({ 
  zoom, setZoom,
  onClear, onExport, onSave, isSaving,
  onFullscreen, isFullscreen,
  onClose
}) => {
  const [showTools, setShowTools] = useState(true);

  return (
    <div className="bg-white border-b border-gray-200 px-3 py-2 flex items-center justify-between flex-shrink-0">
      {/* Izquierda */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <FolderOpen className="w-4 h-4 text-gray-600" />
          <span className="text-sm font-medium text-gray-700">Pizarra Zenth Academy</span>
        </div>
        <button
          onClick={() => setShowTools(!showTools)}
          className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
        >
          {showTools ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
      </div>

      {/* Centro - Herramientas */}
      {showTools && (
        <div className="flex items-center gap-1">
          {TOOLS_CONFIG.map(({ id, icon: Icon, label, shortcut }) => (
            <button
              key={id}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors relative group"
              title={`${label} (${shortcut})`}
            >
              <Icon className="w-4 h-4" />
              <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                {shortcut}
              </span>
            </button>
          ))}
          <div className="w-px h-6 bg-gray-200 mx-1" />
          <button
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
            title="Alternar grid"
          >
            <Grid className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Derecha - Acciones */}
      <div className="flex items-center gap-1">
        {/* Zoom */}
        <div className="flex items-center gap-0.5 bg-gray-50 rounded-lg border border-gray-200 px-1">
          <button
            onClick={() => setZoom(z => Math.max(0.2, z - 0.1))}
            className="p-1 rounded hover:bg-gray-200 text-gray-500 transition-colors"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-xs font-mono w-12 text-center text-gray-600">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom(z => Math.min(3, z + 0.1))}
            className="p-1 rounded hover:bg-gray-200 text-gray-500 transition-colors"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setZoom(1)}
            className="px-1.5 py-0.5 text-[10px] text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded transition-colors"
          >
            1:1
          </button>
        </div>

        <div className="w-px h-6 bg-gray-200 mx-1" />

        {/* Acciones */}
        <button
          onClick={onClear}
          className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
          title="Limpiar pizarra"
        >
          <Trash2 className="w-4 h-4" />
        </button>
        <button
          onClick={onExport}
          className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          title="Exportar imagen"
        >
          <Download className="w-4 h-4" />
        </button>
        <button
          onClick={onSave}
          disabled={isSaving}
          className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 disabled:opacity-50 transition-colors"
          title="Guardar"
        >
          <Save className={`w-4 h-4 ${isSaving ? 'animate-spin' : ''}`} />
        </button>
        <button
          onClick={onFullscreen}
          className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          title="Pantalla completa"
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
        <button
          onClick={onClose}
          className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          title="Cerrar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

// =============================================
// STATUS BAR
// =============================================
const StatusBar = ({ elements, collaborators, zoom }) => (
  <div className="bg-white border-t border-gray-200 px-4 py-1.5 flex items-center justify-between text-xs text-gray-400 flex-shrink-0">
    <div className="flex items-center gap-4">
      <span className="flex items-center gap-1">
        <PenTool className="w-3 h-3" />
        {elements} elementos
      </span>
      {collaborators > 0 && (
        <span className="flex items-center gap-1">
          <Users className="w-3 h-3" />
          {collaborators} colaboradores
        </span>
      )}
    </div>
    <div className="flex items-center gap-4">
      <span>Zoom: {Math.round(zoom * 100)}%</span>
      <span>Zenth Academy</span>
    </div>
  </div>
);

// =============================================
// COMPONENTE PRINCIPAL
// =============================================
const PizarraInteractiva = ({ 
  pizarraId, 
  rol = 'EDITOR', 
  onCerrar,
  initialData = null,
  titulo = 'Pizarra Interactiva'
}) => {
  // Estados
  const [zoom, setZoom] = useState(1);
  const [elementCount, setElementCount] = useState(0);
  const [collaborators] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [excalidrawAPI, setExcalidrawAPI] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [elementosIniciales, setElementosIniciales] = useState([]);
  const [cargandoInicial, setCargandoInicial] = useState(false);
  
  // Refs
  const excalidrawRef = useRef(null);
  const containerRef = useRef(null);
  const isMountedRef = useRef(true);
  const apiRef = useRef(null);
  const elementosCargadosRef = useRef(null);
  const cargandoInicialRef = useRef(false);
  const autosaveRef = useRef(null);

  // =============================================
  // HANDLERS
  // =============================================
  
  const aplicarElementosCargados = useCallback((api) => {
    const cargados = elementosCargadosRef.current;
    if (!cargados) return;
    const actuales = api.getSceneElements?.() || [];
    if (cargados.length > 0 && actuales.length === 0) {
      api.updateScene({ elements: cargados });
    }
    elementosCargadosRef.current = null;
  }, []);

  const handleExcalidrawAPI = useCallback((api) => {
    apiRef.current = api;
    setExcalidrawAPI(api);
    setIsReady(true);
    aplicarElementosCargados(api);
  }, [aplicarElementosCargados]);

  const handleChange = useCallback((elements) => {
    if (!isMountedRef.current) return;
    setElementCount(elements.length);
    if (cargandoInicialRef.current) return;
    if (!pizarraId) return;
    if (autosaveRef.current) clearTimeout(autosaveRef.current);
    autosaveRef.current = setTimeout(() => {
      pizarraService.actualizarElementos(pizarraId, elements).catch((e) => {
        console.warn('Error en autoguardado de la pizarra:', e);
      });
    }, 1200);
  }, [pizarraId]);

  // =============================================
  // ACCIONES
  // =============================================

  const exportImage = useCallback(async () => {
    if (!excalidrawAPI) return;
    
    try {
      const elements = excalidrawAPI.getSceneElements();
      const appState = excalidrawAPI.getAppState();
      
      const { exportToBlob } = await import('@excalidraw/excalidraw');
      const blob = await exportToBlob({
        elements,
        appState,
        files: null,
        mimeType: 'image/png',
      });
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `pizarra_${pizarraId || 'export'}_${Date.now()}.png`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exportando:', error);
    }
  }, [excalidrawAPI, pizarraId]);

  const saveBoard = useCallback(async () => {
    if (!excalidrawAPI) return;
    
    setIsSaving(true);
    try {
      const elements = excalidrawAPI.getSceneElements();
      
      if (pizarraId) {
        await pizarraService.actualizarElementos(pizarraId, elements);
      }
      
      const toast = document.createElement('div');
      toast.className = 'fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg text-sm animate-slideUp z-50';
      toast.textContent = '✅ Pizarra guardada correctamente';
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
      
    } catch (error) {
      console.error('Error guardando:', error);
      alert('Error al guardar la pizarra');
    } finally {
      setIsSaving(false);
    }
  }, [excalidrawAPI, pizarraId]);

  const clearBoard = useCallback(() => {
    if (!excalidrawAPI) return;
    if (!window.confirm('¿Limpiar toda la pizarra?')) return;
    excalidrawAPI.resetScene();
  }, [excalidrawAPI]);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  const handleClose = useCallback(async () => {
    if (excalidrawAPI && pizarraId) {
      try {
        const elements = excalidrawAPI.getSceneElements();
        await pizarraService.actualizarElementos(pizarraId, elements);
      } catch (error) {
        console.error('Error guardando antes de cerrar:', error);
      }
    }
    
    if (onCerrar) onCerrar();
  }, [excalidrawAPI, pizarraId, onCerrar]);

  // =============================================
  // EFECTOS
  // =============================================
  
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (autosaveRef.current) clearTimeout(autosaveRef.current);
      if (document.fullscreenElement) {
        document.exitFullscreen();
      }
    };
  }, []);

  // Cargar elementos desde el backend al montar
  useEffect(() => {
    if (!pizarraId) return;
    let activo = true;
    setCargandoInicial(true);
    cargandoInicialRef.current = true;
    pizarraService.obtenerElementos(pizarraId)
      .then((res) => {
        if (!activo) return;
        const elementos = res?.elementos || [];
        setElementosIniciales(elementos);
        elementosCargadosRef.current = elementos;
        if (apiRef.current) aplicarElementosCargados(apiRef.current);
      })
      .catch((e) => {
        if (!activo) return;
        console.warn('No se pudieron cargar elementos de la pizarra:', e);
      })
      .finally(() => {
        cargandoInicialRef.current = false;
        if (activo) setCargandoInicial(false);
      });
    return () => { activo = false; };
  }, [pizarraId, aplicarElementosCargados]);

  // =============================================
  // RENDER
  // =============================================
  
  return (
    <div 
      ref={containerRef}
      className="flex flex-col h-full bg-white rounded-lg overflow-hidden border border-gray-200"
    >
      {/* Toolbar */}
      <Toolbar
        zoom={zoom}
        setZoom={setZoom}
        onClear={clearBoard}
        onExport={exportImage}
        onSave={saveBoard}
        isSaving={isSaving}
        onFullscreen={toggleFullscreen}
        isFullscreen={isFullscreen}
        onClose={handleClose}
      />

      {/* Área de Excalidraw */}
      <div className="flex-1 relative" style={{ minHeight: '500px' }}>
        <Excalidraw
          ref={excalidrawRef}
          excalidrawAPI={handleExcalidrawAPI}
          initialData={{
            elements: elementosIniciales.length > 0 ? elementosIniciales : (
              initialData ? (
                typeof initialData === 'string' 
                  ? JSON.parse(initialData) 
                  : initialData
              ) : []
            ),
            appState: {
              viewBackgroundColor: '#ffffff',
              currentItemStrokeColor: '#000000',
              currentItemBackgroundColor: '#ffffff',
            }
          }}
          onChange={handleChange}
          theme="light"
          viewModeEnabled={rol === 'VISOR'}
          zenModeEnabled={false}
          gridModeEnabled={true}
          renderTopRightUI={() => null}
        >
          {/* Welcome Screen */}
          {!isReady && (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              {cargandoInicial ? (
                <>
                  <div className="w-12 h-12 mb-4 border-4 border-gray-200 border-t-indigo-600 rounded-full animate-spin" />
                  <h2 className="text-2xl font-bold text-gray-800 mb-2">Cargando pizarra...</h2>
                </>
              ) : (
                <>
              <div className="w-20 h-20 mb-4 bg-gray-100 rounded-2xl flex items-center justify-center">
                <PenTool className="w-10 h-10 text-gray-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                {titulo}
              </h2>
              <p className="text-sm text-gray-500 max-w-md">
                {rol === 'EDITOR' 
                  ? 'Usa las herramientas para dibujar, escribir y crear contenido interactivo'
                  : 'Visualizando pizarra en modo solo lectura'
                }
              </p>
              <div className="mt-4 flex flex-wrap gap-2 justify-center">
                {['Dibujo libre', 'Formas', 'Texto', 'Imágenes'].map(item => (
                  <span key={item} className="bg-gray-100 px-3 py-1 rounded-full text-xs text-gray-600">
                    {item}
                  </span>
                ))}
              </div>
              {rol === 'EDITOR' && (
                <button
                  onClick={() => {
                    if (excalidrawAPI) {
                      const textElement = {
                        type: 'text',
                        x: 100,
                        y: 100,
                        width: 300,
                        height: 50,
                        text: '¡Empieza a dibujar!',
                        fontSize: 28,
                        fontFamily: 1,
                        textAlign: 'left',
                        verticalAlign: 'top',
                        strokeColor: '#000000',
                        backgroundColor: 'transparent',
                        fillStyle: 'solid',
                        strokeWidth: 1,
                        strokeStyle: 'solid',
                        roughness: 1,
                        opacity: 100,
                        groupIds: [],
                        seed: Date.now(),
                        version: 1,
                        versionNonce: Date.now(),
                        isDeleted: false,
                        boundElements: null,
                        updated: Date.now(),
                        link: null,
                      };
                      excalidrawAPI.updateScene({
                        elements: [textElement],
                      });
                    }
                  }}
                  className="mt-4 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm"
                >
                  Agregar ejemplo
                </button>
              )}
            </>
          )}
          </div>
        )}
          
          {/* Menú principal - SIN LIBRARY */}
          <MainMenu>
            <MainMenu.DefaultItems.LoadScene />
            <MainMenu.DefaultItems.SaveAsImage />
            <MainMenu.DefaultItems.Export />
            <MainMenu.DefaultItems.ClearCanvas />
            <MainMenu.Separator />
            <MainMenu.Item
              onSelect={saveBoard}
              className="flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Guardar en Zenth Academy
            </MainMenu.Item>
            <MainMenu.Item
              onSelect={exportImage}
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Exportar como PNG
            </MainMenu.Item>
          </MainMenu>
        </Excalidraw>
      </div>

      {/* Status Bar */}
      <StatusBar
        elements={elementCount}
        collaborators={collaborators}
        zoom={zoom}
      />

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slideUp {
          animation: slideUp 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default PizarraInteractiva;