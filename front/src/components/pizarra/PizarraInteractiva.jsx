// front/src/components/pizarra/PizarraInteractiva.jsx
// PIZARRA INTERACTIVA - VERSION CORREGIDA
// Título editable, toolbar nativa de Excalidraw, autoguardado funcional

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X, Save, Download, Trash2,
  Maximize2, Minimize2,
  PenTool, Check, Pencil
} from 'lucide-react';
import { Excalidraw, MainMenu } from '@excalidraw/excalidraw';
import '@excalidraw/excalidraw/index.css';
import pizarraService from '../../services/pizarraService';

// =============================================
// COMPONENTE PRINCIPAL
// =============================================
const PizarraInteractiva = ({
  pizarraId: initialPizarraId,
  rol = 'EDITOR',
  onCerrar,
  initialData = null,
  titulo: initialTitulo = 'Pizarra Interactiva',
  usuario = null
}) => {
  // Estados
  const [pizarraId, setPizarraId] = useState(initialPizarraId);
  const [titulo, setTitulo] = useState(initialTitulo);
  const [editandoTitulo, setEditandoTitulo] = useState(false);
  const [tituloTemp, setTituloTemp] = useState(initialTitulo);
  const [isSaving, setIsSaving] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [excalidrawAPI, setExcalidrawAPI] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [elementosIniciales, setElementosIniciales] = useState([]);
  const [cargandoInicial, setCargandoInicial] = useState(false);
  const [creandoPizarra, setCreandoPizarra] = useState(false);

  // Refs
  const containerRef = useRef(null);
  const isMountedRef = useRef(true);
  const apiRef = useRef(null);
  const elementosCargadosRef = useRef(null);
  const cargandoInicialRef = useRef(false);
  const autosaveRef = useRef(null);
  const pizarraIdRef = useRef(initialPizarraId);

  // Mantener ref sincronizada
  useEffect(() => {
    pizarraIdRef.current = pizarraId;
  }, [pizarraId]);

  // =============================================
  // CREAR PIZARRA SI NO EXISTE
  // =============================================
  useEffect(() => {
    if (pizarraId || creandoPizarra) return;

    let activo = true;
    setCreandoPizarra(true);

    pizarraService.crear({
      titulo: titulo || 'Pizarra sin título',
      descripcion: '',
      tipo: 'blanca',
      creado_por: usuario?.id || 'default',
      es_publica: false,
    })
      .then((creada) => {
        if (!activo) return;
        if (creada?.id) {
          setPizarraId(creada.id);
          setTitulo(creada.titulo || titulo);
        }
      })
      .catch((e) => {
        console.error('Error creando pizarra automáticamente:', e);
      })
      .finally(() => {
        if (activo) setCreandoPizarra(false);
      });

    return () => { activo = false; };
  }, [pizarraId, creandoPizarra, titulo, usuario]);

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

  // Autoguardado con debounce
  const handleChange = useCallback((elements) => {
    if (!isMountedRef.current) return;
    if (cargandoInicialRef.current) return;
    const currentId = pizarraIdRef.current;
    if (!currentId) return;
    if (autosaveRef.current) clearTimeout(autosaveRef.current);
    autosaveRef.current = setTimeout(() => {
      pizarraService.actualizarElementos(currentId, elements).catch((e) => {
        console.warn('Error en autoguardado de la pizarra:', e);
      });
    }, 1500);
  }, []);

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
    const currentId = pizarraIdRef.current;
    if (!currentId) {
      alert('La pizarra aún se está creando, intenta de nuevo en unos segundos.');
      return;
    }
    setIsSaving(true);
    try {
      const elements = excalidrawAPI.getSceneElements();
      await pizarraService.actualizarElementos(currentId, elements);
      showToast('Pizarra guardada correctamente');
    } catch (error) {
      console.error('Error guardando:', error);
      alert('Error al guardar la pizarra');
    } finally {
      setIsSaving(false);
    }
  }, [excalidrawAPI]);

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
    if (excalidrawAPI && pizarraIdRef.current) {
      try {
        const elements = excalidrawAPI.getSceneElements();
        await pizarraService.actualizarElementos(pizarraIdRef.current, elements);
      } catch (error) {
        console.error('Error guardando antes de cerrar:', error);
      }
    }
    if (onCerrar) onCerrar();
  }, [excalidrawAPI, onCerrar]);

  // Guardar título editado
  const guardarTitulo = useCallback(async () => {
    const nuevoTitulo = tituloTemp.trim() || 'Pizarra sin título';
    setEditandoTitulo(false);
    setTitulo(nuevoTitulo);

    const currentId = pizarraIdRef.current;
    if (currentId) {
      try {
        await pizarraService.actualizar(currentId, { titulo: nuevoTitulo });
      } catch (e) {
        console.warn('Error actualizando título:', e);
      }
    }
  }, [tituloTemp]);

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

  // Cargar elementos desde el backend al montar (solo si ya existe pizarraId)
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
  // UTILS
  // =============================================
  const showToast = (mensaje) => {
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg text-sm z-50';
    toast.textContent = mensaje;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  };

  // =============================================
  // RENDER
  // =============================================
  const isEditor = rol === 'EDITOR';

  return (
    <div
      ref={containerRef}
      className="flex flex-col h-full bg-white rounded-lg overflow-hidden border border-gray-200"
    >
      {/* ============================================= */}
      {/* HEADER BAR - Título editable + acciones       */}
      {/* ============================================= */}
      <div className="bg-white border-b border-gray-200 px-2 sm:px-4 py-2 flex items-center justify-between flex-shrink-0 gap-2">
        {/* Izquierda: Título */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <PenTool className="w-5 h-5 text-gray-400 flex-shrink-0 hidden sm:block" />

          {editandoTitulo ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={tituloTemp}
                onChange={(e) => setTituloTemp(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') guardarTitulo();
                  if (e.key === 'Escape') {
                    setTituloTemp(titulo);
                    setEditandoTitulo(false);
                  }
                }}
                onBlur={guardarTitulo}
                autoFocus
                className="text-lg font-semibold text-gray-800 border border-gray-300 rounded px-2 py-0.5 outline-none focus:border-indigo-400 min-w-[200px]"
              />
              <button
                onClick={guardarTitulo}
                className="p-1 rounded hover:bg-green-50 text-green-600"
                title="Guardar título"
              >
                <Check className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                if (isEditor) {
                  setTituloTemp(titulo);
                  setEditandoTitulo(true);
                }
              }}
              className="text-lg font-semibold text-gray-800 truncate hover:text-indigo-600 transition-colors flex items-center gap-2 group"
              title={isEditor ? 'Clic para editar nombre' : titulo}
            >
              {titulo}
              {isEditor && (
                <Pencil className="w-3.5 h-3.5 text-gray-300 group-hover:text-indigo-400 flex-shrink-0 hidden sm:block" />
              )}
            </button>
          )}

          {creandoPizarra && (
            <span className="text-xs text-gray-400 flex-shrink-0">Creando...</span>
          )}
        </div>

        {/* Derecha: Acciones */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {isEditor && (
            <>
              <button
                onClick={clearBoard}
                className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                title="Limpiar pizarra"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                onClick={exportImage}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                title="Exportar como imagen"
              >
                <Download className="w-4 h-4" />
              </button>
              <button
                onClick={saveBoard}
                disabled={isSaving || !pizarraId}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 disabled:opacity-50 transition-colors"
                title="Guardar pizarra"
              >
                <Save className={`w-4 h-4 ${isSaving ? 'animate-spin' : ''}`} />
              </button>
            </>
          )}

          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
            title="Pantalla completa"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          <button
            onClick={handleClose}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
            title="Cerrar pizarra"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ============================================= */}
      {/* ÁREA DE EXCALIDRAW (toolbar nativa incluida)   */}
      {/* ============================================= */}
      <div className="flex-1 relative" style={{ minHeight: '500px' }}>
        {/* Indicador de carga inicial */}
        {cargandoInicial && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-4 border-gray-200 border-t-indigo-600 rounded-full animate-spin" />
              <span className="text-sm text-gray-500">Cargando pizarra...</span>
            </div>
          </div>
        )}

        <Excalidraw
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
          viewModeEnabled={!isEditor}
          zenModeEnabled={false}
          gridModeEnabled={true}
          UIOptions={{
            canvasActions: {
              changeViewBackground: false,
              loadScene: false,
            }
          }}
        >
          <MainMenu>
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
          </MainMenu>
        </Excalidraw>
      </div>

      {/* ============================================= */}
      {/* STATUS BAR                                    */}
      {/* ============================================= */}
      <div className="bg-white border-t border-gray-200 px-4 py-1.5 flex items-center justify-between text-xs text-gray-400 flex-shrink-0">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <PenTool className="w-3 h-3" />
            {isEditor ? 'Editando' : 'Solo lectura'}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span>Zenth Academy</span>
        </div>
      </div>
    </div>
  );
};

export default PizarraInteractiva;
