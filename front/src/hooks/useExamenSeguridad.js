// src/hooks/useExamenSeguridad.js
// VERSION CORREGIDA - TODOS LOS PROBLEMAS SOLUCIONADOS

import { useState, useEffect, useCallback, useRef } from 'react';
import { MAX_VIOLACIONES, EVENTOS_SEGURIDAD } from '../components/examenes/constantes';

const useExamenSeguridad = (examenActivo, configuracion = {}) => {
  const [violaciones, setViolaciones] = useState(0);
  const [eventosSeguridad, setEventosSeguridad] = useState([]);
  const [advertenciaActiva, setAdvertenciaActiva] = useState(false);
  
  const examenActivoRef = useRef(examenActivo);
  const violacionesRef = useRef(violaciones);
  const eventosRef = useRef(eventosSeguridad);
  const configRef = useRef(configuracion);
  const onViolacionMaximaRef = useRef(null);
  const fullscreenIntentadoRef = useRef(false);
  const reingresandoFullscreenRef = useRef(false);
  const fullscreenChangeRef = useRef(false);
  
  // ✅ REF para límite de violaciones (se actualiza dinámicamente)
  const limiteViolacionesRef = useRef(configuracion.limiteViolaciones || MAX_VIOLACIONES);

  // ✅ Actualizar límite cuando cambia la configuración
  useEffect(() => {
    limiteViolacionesRef.current = configuracion.limiteViolaciones || MAX_VIOLACIONES;
  }, [configuracion.limiteViolaciones]);

  const soportaFullscreen = () => {
    const doc = document.documentElement;
    return !!(doc.requestFullscreen || doc.webkitRequestFullscreen || 
              doc.mozRequestFullScreen || doc.msRequestFullscreen);
  };

  const esDispositivoMovil = () => {
    return /Android|iPhone|iPad|iPod|webOS/i.test(navigator.userAgent) ||
           ('ontouchstart' in window && window.innerWidth < 1024);
  };

  // ✅ REINGRESAR FULLSCREEN CORREGIDO
  const reingresarFullscreen = useCallback(() => {
    if (reingresandoFullscreenRef.current) return;
    if (document.fullscreenElement || document.webkitFullscreenElement || 
        document.mozFullScreenElement || document.msFullscreenElement) return;
    if (esDispositivoMovil()) return;
    
    reingresandoFullscreenRef.current = true;
    
    const elem = document.documentElement;
    
    // ✅ Usar el método correcto según el navegador
    if (elem.requestFullscreen) {
      elem.requestFullscreen().catch(() => {}).finally(() => {
        setTimeout(() => { reingresandoFullscreenRef.current = false; }, 500);
      });
    } else if (elem.webkitRequestFullscreen) {
      elem.webkitRequestFullscreen();
      setTimeout(() => { reingresandoFullscreenRef.current = false; }, 500);
    } else if (elem.mozRequestFullScreen) {
      elem.mozRequestFullScreen();
      setTimeout(() => { reingresandoFullscreenRef.current = false; }, 500);
    } else if (elem.msRequestFullscreen) {
      elem.msRequestFullscreen();
      setTimeout(() => { reingresandoFullscreenRef.current = false; }, 500);
    } else {
      reingresandoFullscreenRef.current = false;
    }
  }, []);

  useEffect(() => { 
    examenActivoRef.current = examenActivo; 
    configRef.current = configuracion; 
  }, [examenActivo, configuracion]);
  
  useEffect(() => { violacionesRef.current = violaciones; }, [violaciones]);
  useEffect(() => { eventosRef.current = eventosSeguridad; }, [eventosSeguridad]);

  const setOnViolacionMaxima = useCallback((callback) => { 
    onViolacionMaximaRef.current = callback; 
  }, []);

  const registrarEvento = useCallback((tipo, descripcion) => {
    const evento = { 
      id: Date.now(), 
      tipo, 
      descripcion, 
      timestamp: new Date().toISOString(), 
      violacionNumero: violacionesRef.current + 1 
    };
    setEventosSeguridad(prev => { 
      const nuevos = [...prev, evento]; 
      eventosRef.current = nuevos; 
      return nuevos; 
    });
    return evento;
  }, []);

  const mostrarAdvertencia = useCallback(() => { 
    setAdvertenciaActiva(true); 
    setTimeout(() => setAdvertenciaActiva(false), 3000); 
  }, []);

  // ✅ INCREMENTAR VIOLACION CORREGIDO
  const incrementarViolacion = useCallback((tipo, descripcion) => {
    if (!examenActivoRef.current) return;
    
    const nuevas = violacionesRef.current + 1;
    setViolaciones(nuevas);
    violacionesRef.current = nuevas;
    
    registrarEvento(tipo, descripcion);
    mostrarAdvertencia();
    
    // ✅ Ejecutar callback inmediatamente si se alcanza el límite
    if (nuevas >= limiteViolacionesRef.current && onViolacionMaximaRef.current) {
      // Pequeño delay para asegurar que el estado se actualice
      setTimeout(() => {
        onViolacionMaximaRef.current(eventosRef.current);
      }, 50);
    }
  }, [registrarEvento, mostrarAdvertencia]);

  // ✅ FULLSCREEN CHANGE CORREGIDO
  const handleFullscreenChange = useCallback(() => {
    if (fullscreenChangeRef.current) return;
    fullscreenChangeRef.current = true;
    
    try {
      const isFullscreen = !!(document.fullscreenElement || 
                             document.webkitFullscreenElement || 
                             document.mozFullScreenElement || 
                             document.msFullscreenElement);
      
      if (!isFullscreen && examenActivoRef.current && !esDispositivoMovil()) {
        incrementarViolacion(EVENTOS_SEGURIDAD.PANTALLA_COMPLETA, 'Salida de pantalla completa detectada');
        setTimeout(() => reingresarFullscreen(), 300);
      }
    } catch (error) {
      console.error('Error en fullscreenchange:', error);
    }
    
    setTimeout(() => { fullscreenChangeRef.current = false; }, 200);
  }, [incrementarViolacion, reingresarFullscreen]);

  // ✅ KEYDOWN CON ESCAPE CORREGIDO
  const handleKeyDown = useCallback((e) => {
    if (!examenActivoRef.current) return;

    // ESCAPE = salida de pantalla completa
    if (e.key === 'Escape' || e.keyCode === 27) {
      e.preventDefault();
      if (!esDispositivoMovil()) {
        incrementarViolacion(EVENTOS_SEGURIDAD.PANTALLA_COMPLETA, 'Intento de salir de pantalla completa (Escape)');
        setTimeout(() => reingresarFullscreen(), 200);
      }
      return;
    }

    const teclasProhibidas = ['F12', 'PrintScreen', 'ScrollLock', 'Pause'];
    if (teclasProhibidas.includes(e.key)) {
      e.preventDefault();
      incrementarViolacion(EVENTOS_SEGURIDAD.TECLA_PROHIBIDA, `Tecla prohibida: ${e.key}`);
      return;
    }

    if (e.ctrlKey || e.metaKey || e.altKey) {
      const combinaciones = ['p', 'u', 's', 'c', 't', 'n', 'h', 'j', 'k'];
      if (combinaciones.includes(e.key.toLowerCase())) {
        e.preventDefault();
        incrementarViolacion(EVENTOS_SEGURIDAD.TECLA_PROHIBIDA, 
          `Combinación: ${e.ctrlKey ? 'Ctrl' : e.metaKey ? 'Cmd' : 'Alt'}+${e.key.toUpperCase()}`);
      }
    }
  }, [incrementarViolacion, reingresarFullscreen]);

  useEffect(() => {
    if (!examenActivo) { 
      setAdvertenciaActiva(false); 
      return; 
    }

    // Handlers
    const handleVisibilityChange = () => {
      if (document.hidden && examenActivoRef.current) {
        incrementarViolacion(EVENTOS_SEGURIDAD.CAMBIO_PESTANA, 'Cambio de pestaña o ventana detectado');
      }
    };

    const handleWindowBlur = () => {
      if (examenActivoRef.current && !document.hidden) {
        incrementarViolacion(EVENTOS_SEGURIDAD.PERDIDA_FOCO, 'La ventana del examen perdió el foco');
      }
    };

    const handleContextMenu = (e) => { 
      e.preventDefault(); 
      if (examenActivoRef.current) {
        incrementarViolacion(EVENTOS_SEGURIDAD.INTENTO_COPIA, 'Intento de usar menú contextual');
      }
    };
    
    const handleCopy = (e) => { 
      e.preventDefault(); 
      if (examenActivoRef.current) {
        incrementarViolacion(EVENTOS_SEGURIDAD.INTENTO_COPIA, 'Intento de copiar contenido');
      }
    };
    
    const handlePaste = (e) => { e.preventDefault(); };
    const handleCut = (e) => { e.preventDefault(); };
    const handleDragStart = (e) => { e.preventDefault(); };
    
    const handleSelectStart = (e) => { 
      if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault();
      }
    };

    const handleBeforeUnload = (e) => { 
      if (examenActivoRef.current) { 
        e.preventDefault(); 
        e.returnValue = ''; 
      } 
    };
    
    const handleOnline = () => { 
      if (examenActivoRef.current) {
        incrementarViolacion(EVENTOS_SEGURIDAD.RECONEXION, 'Conexión restablecida');
      }
    };
    
    const handleOffline = () => { 
      if (examenActivoRef.current) {
        incrementarViolacion(EVENTOS_SEGURIDAD.RECONEXION, 'Pérdida de conexión');
      }
    };

    // ✅ Registrar listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('copy', handleCopy);
    document.addEventListener('paste', handlePaste);
    document.addEventListener('cut', handleCut);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('dragstart', handleDragStart);
    document.addEventListener('selectstart', handleSelectStart);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // ✅ Activar pantalla completa solo en desktop (una sola vez)
    if (configRef.current.modoEstricto !== false && !fullscreenIntentadoRef.current) {
      fullscreenIntentadoRef.current = true;
      if (!esDispositivoMovil() && soportaFullscreen()) {
        setTimeout(() => reingresarFullscreen(), 500);
      }
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('paste', handlePaste);
      document.removeEventListener('cut', handleCut);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('dragstart', handleDragStart);
      document.removeEventListener('selectstart', handleSelectStart);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    };
  }, [examenActivo, incrementarViolacion, handleKeyDown, handleFullscreenChange, reingresarFullscreen]);

  const resetearViolaciones = useCallback(() => { 
    setViolaciones(0); 
    setEventosSeguridad([]); 
    setAdvertenciaActiva(false); 
  }, []);

  return { 
    violaciones, 
    eventosSeguridad, 
    advertenciaActiva, 
    maxViolaciones: limiteViolacionesRef.current, 
    resetearViolaciones, 
    setOnViolacionMaxima 
  };
};

export default useExamenSeguridad;