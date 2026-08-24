// src/hooks/useExamenes.js
// HOOK PARA GESTIÓN CENTRALIZADA DE EXÁMENES

import { useState, useCallback } from 'react';
import examenesService from '../services/examenesService';

const useExamenes = () => {
  const [examenes, setExamenes] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);

  // =============================================
  // LISTAR EXÁMENES
  // =============================================
  const listarExamenes = useCallback(async (filtros = {}) => {
    setCargando(true);
    setError(null);
    try {
      const data = await examenesService.listar(filtros);
      setExamenes(data || []);
      return data;
    } catch (e) {
      setError(e.message);
      console.error('Error listando exámenes:', e);
      return [];
    } finally {
      setCargando(false);
    }
  }, []);

  // =============================================
  // LISTAR POR GRUPOS (optimizado)
  // =============================================
  const listarPorGrupos = useCallback(async (grupoIds, filtros = {}) => {
    if (!grupoIds || grupoIds.length === 0) {
      setExamenes([]);
      return {};
    }
    setCargando(true);
    setError(null);
    try {
      const data = await examenesService.listarExamenesPorGrupos(grupoIds, filtros);
      // Aplanar el diccionario de grupos a una lista plana
      const listaPlana = Object.values(data || {}).flat();
      setExamenes(listaPlana);
      return data;
    } catch (e) {
      setError(e.message);
      console.error('Error listando exámenes por grupos:', e);
      return {};
    } finally {
      setCargando(false);
    }
  }, []);

  // =============================================
  // CREAR EXAMEN
  // =============================================
  const crearExamen = useCallback(async (datos) => {
    setError(null);
    try {
      const creada = await examenesService.crear(datos);
      setExamenes(prev => [creada, ...prev]);
      return creada;
    } catch (e) {
      setError(e.message);
      console.error('Error creando examen:', e);
      throw e;
    }
  }, []);

  // =============================================
  // ACTUALIZAR EXAMEN
  // =============================================
  const actualizarExamen = useCallback(async (id, datos) => {
    setError(null);
    try {
      const actualizado = await examenesService.actualizar(id, datos);
      setExamenes(prev => prev.map(e => e.id === id ? actualizado : e));
      return actualizado;
    } catch (e) {
      setError(e.message);
      console.error('Error actualizando examen:', e);
      throw e;
    }
  }, []);

  // =============================================
  // ELIMINAR EXAMEN
  // =============================================
  const eliminarExamen = useCallback(async (id) => {
    setError(null);
    try {
      await examenesService.eliminar(id);
      setExamenes(prev => prev.filter(e => e.id !== id));
    } catch (e) {
      setError(e.message);
      console.error('Error eliminando examen:', e);
      throw e;
    }
  }, []);

  // =============================================
  // OBTENER EXAMEN POR ID
  // =============================================
  const obtenerExamen = useCallback(async (id) => {
    setError(null);
    try {
      return await examenesService.obtener(id);
    } catch (e) {
      setError(e.message);
      console.error('Error obteniendo examen:', e);
      throw e;
    }
  }, []);

  // =============================================
  // GUARDAR RESULTADO
  // =============================================
  const guardarResultado = useCallback(async (datos) => {
    setError(null);
    try {
      return await examenesService.guardarResultado(datos);
    } catch (e) {
      setError(e.message);
      console.error('Error guardando resultado:', e);
      throw e;
    }
  }, []);

  // =============================================
  // OBTENER RESULTADOS
  // =============================================
  const obtenerResultados = useCallback(async (examenId) => {
    setError(null);
    try {
      return await examenesService.obtenerResultados(examenId);
    } catch (e) {
      setError(e.message);
      console.error('Error obteniendo resultados:', e);
      throw e;
    }
  }, []);

  return {
    examenes,
    cargando,
    error,
    listarExamenes,
    listarPorGrupos,
    crearExamen,
    actualizarExamen,
    eliminarExamen,
    obtenerExamen,
    guardarResultado,
    obtenerResultados,
  };
};

export default useExamenes;
