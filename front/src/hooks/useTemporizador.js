// src/hooks/useTemporizador.js
import { useState, useEffect, useCallback, useRef } from 'react';

const useTemporizador = (configuracion = {}) => {
  const {
    tiempoTotalSegundos = 3600,
    onTiempoAgotado = null,
    onTick = null,
    intervaloActualizacion = 1000,
    alertas = [300, 600, 900] // Alertas en segundos: 5min, 10min, 15min
  } = configuracion;

  const [tiempoRestante, setTiempoRestante] = useState(tiempoTotalSegundos);
  const [estaCorriendo, setEstaCorriendo] = useState(false);
  const [progreso, setProgreso] = useState(100);
  const [alertaActiva, setAlertaActiva] = useState(null);
  
  const intervaloRef = useRef(null);
  const tiempoInicioRef = useRef(null);
  const tiempoPausadoRef = useRef(0);
  const onTiempoAgotadoRef = useRef(onTiempoAgotado);
  const onTickRef = useRef(onTick);
  const alertasRef = useRef(alertas);

  useEffect(() => {
    onTiempoAgotadoRef.current = onTiempoAgotado;
  }, [onTiempoAgotado]);

  useEffect(() => {
    onTickRef.current = onTick;
  }, [onTick]);

  useEffect(() => {
    alertasRef.current = alertas;
  }, [alertas]);

  useEffect(() => {
    setTiempoRestante(tiempoTotalSegundos);
    setProgreso(100);
  }, [tiempoTotalSegundos]);

  const verificarAlertas = useCallback((tiempo) => {
    const alertasConfig = alertasRef.current;
    if (alertasConfig.includes(tiempo)) {
      setAlertaActiva(tiempo);
      setTimeout(() => setAlertaActiva(null), 5000);
    }
  }, []);

  const iniciar = useCallback(() => {
    if (estaCorriendo) return;
    
    setEstaCorriendo(true);
    tiempoInicioRef.current = Date.now() - tiempoPausadoRef.current;
    
    intervaloRef.current = setInterval(() => {
      const tiempoTranscurrido = Math.floor((Date.now() - tiempoInicioRef.current) / 1000);
      const nuevoTiempo = Math.max(0, tiempoTotalSegundos - tiempoTranscurrido);
      const nuevoProgreso = (nuevoTiempo / tiempoTotalSegundos) * 100;
      
      setTiempoRestante(nuevoTiempo);
      setProgreso(nuevoProgreso);
      
      verificarAlertas(nuevoTiempo);
      
      if (onTickRef.current) {
        onTickRef.current(nuevoTiempo);
      }
      
      if (nuevoTiempo <= 0) {
        clearInterval(intervaloRef.current);
        setEstaCorriendo(false);
        if (onTiempoAgotadoRef.current) {
          setTimeout(() => onTiempoAgotadoRef.current(), 100);
        }
      }
    }, intervaloActualizacion);
  }, [tiempoTotalSegundos, estaCorriendo, intervaloActualizacion, verificarAlertas]);

  const pausar = useCallback(() => {
    if (intervaloRef.current) {
      clearInterval(intervaloRef.current);
      tiempoPausadoRef.current = Date.now() - tiempoInicioRef.current;
    }
    setEstaCorriendo(false);
  }, []);

  const reanudar = useCallback(() => {
    if (!estaCorriendo && tiempoRestante > 0) {
      iniciar();
    }
  }, [estaCorriendo, tiempoRestante, iniciar]);

  const detener = useCallback(() => {
    if (intervaloRef.current) {
      clearInterval(intervaloRef.current);
    }
    setEstaCorriendo(false);
    tiempoPausadoRef.current = 0;
  }, []);

  const reiniciar = useCallback((nuevoTiempo = null) => {
    detener();
    const tiempo = nuevoTiempo || tiempoTotalSegundos;
    setTiempoRestante(tiempo);
    setProgreso(100);
  }, [detener, tiempoTotalSegundos]);

  useEffect(() => {
    return () => {
      if (intervaloRef.current) {
        clearInterval(intervaloRef.current);
      }
    };
  }, []);

  const formatearTiempo = useCallback((segundos) => {
    if (segundos < 0) segundos = 0;
    
    const horas = Math.floor(segundos / 3600);
    const minutos = Math.floor((segundos % 3600) / 60);
    const segs = segundos % 60;
    
    if (horas > 0) {
      return `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}:${String(segs).padStart(2, '0')}`;
    }
    return `${String(minutos).padStart(2, '0')}:${String(segs).padStart(2, '0')}`;
  }, []);

  const getTiempoUsado = useCallback(() => {
    return tiempoTotalSegundos - tiempoRestante;
  }, [tiempoTotalSegundos, tiempoRestante]);

  const getPorcentajeRestante = useCallback(() => {
    return progreso;
  }, [progreso]);

  const esTiempoCritico = useCallback(() => {
    return progreso < 25;
  }, [progreso]);

  return {
    tiempoRestante,
    tiempoFormateado: formatearTiempo(tiempoRestante),
    estaCorriendo,
    progreso,
    alertaActiva,
    iniciar,
    pausar,
    reanudar,
    detener,
    reiniciar,
    getTiempoUsado,
    getPorcentajeRestante,
    esTiempoCritico
  };
};

export default useTemporizador;