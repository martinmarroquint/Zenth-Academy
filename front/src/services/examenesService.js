// front/src/services/examenesService.js
// VERSION COMPLETA - CORREGIDA (USANDO /alumnos UNIFICADO)

import apiClient from './api';

class ExamenesService {
  constructor() {
    // Usamos apiClient para todas las peticiones
    // apiClient ya maneja el token automáticamente
  }

  // =============================================
  // MÉTODO BASE DE PETICIÓN (usa apiClient)
  // =============================================
  async request(endpoint, options = {}) {
    try {
      return await apiClient.request(endpoint, options);
    } catch (error) {
      console.error(`Error en petición a ${endpoint}:`, error);
      throw error;
    }
  }

  // =============================================
  // MÉTODO PARA PETICIONES CON PREFIJO PERSONALIZADO
  // =============================================
  async requestCustom(basePath, endpoint, options = {}) {
    try {
      return await apiClient.request(`${basePath}${endpoint}`, options);
    } catch (error) {
      console.error(`Error en petición a ${basePath}${endpoint}:`, error);
      throw error;
    }
  }

  // =============================================
  // 🚀 MÉTODOS OPTIMIZADOS PARA RENDIMIENTO
  // =============================================

  listarExamenesPorGrupos(grupoIds, filtros = {}) {
    if (!grupoIds || grupoIds.length === 0) {
      return Promise.resolve({});
    }
    const params = new URLSearchParams();
    grupoIds.forEach(id => params.append('grupo_ids', id));
    if (filtros.estado) params.append('estado', filtros.estado);
    if (filtros.busqueda) params.append('busqueda', filtros.busqueda);
    return this.request(`/examenes/bulk?${params.toString()}`);
  }

  listarExamenesDelGrupo(grupoId, filtros = {}) {
    const params = new URLSearchParams();
    params.append('grupo_id', grupoId);
    if (filtros.limit) params.append('limit', filtros.limit);
    if (filtros.offset) params.append('offset', filtros.offset);
    if (filtros.estado) params.append('estado', filtros.estado);
    if (filtros.busqueda) params.append('busqueda', filtros.busqueda);
    return this.request(`/examenes/grupo/${grupoId}?${params.toString()}`);
  }

  obtenerResumen(grupoIds = null) {
    const params = new URLSearchParams();
    if (grupoIds && grupoIds.length > 0) {
      grupoIds.forEach(id => params.append('grupo_ids', id));
    }
    return this.request(`/examenes/resumen?${params.toString()}`);
  }

  // =============================================
  // GRUPOS
  // =============================================
  
  listarGrupos(docenteId = null) {
    const params = docenteId ? `?docente_id=${docenteId}` : '';
    return this.request(`/examenes/grupos${params}`);
  }

  obtenerGrupo(id) {
    return this.request(`/examenes/grupos/${id}`);
  }

  crearGrupo(data) {
    return this.request('/examenes/grupos', { 
      method: 'POST', 
      body: JSON.stringify(data) 
    });
  }

  actualizarGrupo(id, data) {
    return this.request(`/examenes/grupos/${id}`, { 
      method: 'PUT', 
      body: JSON.stringify(data) 
    });
  }

  eliminarGrupo(id) {
    return this.request(`/examenes/grupos/${id}`, { 
      method: 'DELETE' 
    });
  }

  guardarAsistencia(grupoId, data) {
    return this.request(`/examenes/grupos/${grupoId}/asistencia`, { 
      method: 'POST', 
      body: JSON.stringify(data) 
    });
  }

  // =============================================
  // RECURSOS DE GRUPO (CARPETA DOCENTE)
  // =============================================
  
  listarRecursosGrupo(grupoId) {
    return this.request(`/examenes/grupos/${grupoId}/recursos`);
  }

  agregarRecursoGrupo(grupoId, data) {
    return this.request(`/examenes/grupos/${grupoId}/recursos`, { 
      method: 'POST', 
      body: JSON.stringify(data) 
    });
  }

  eliminarRecursoGrupo(grupoId, recursoId) {
    return this.request(`/examenes/grupos/${grupoId}/recursos/${recursoId}`, { 
      method: 'DELETE' 
    });
  }

  // =============================================
  // SINCRONIZACIÓN CARPETA DOCENTE (QR)
  // =============================================
  
  iniciarSesionCarpeta(sessionId) {
    return this.request('/examenes/sincronizar/iniciar', {
      method: 'POST',
      body: JSON.stringify({ session_id: sessionId })
    });
  }

  consultarEstadoCarpeta(sessionId) {
    return this.request(`/examenes/sincronizar/estado/${sessionId}`);
  }

  escanearQRCarpeta(sessionId) {
    return this.request(`/examenes/sincronizar/escanear/${sessionId}`);
  }

  vincularGrupoCarpeta(sessionId, grupoId) {
    return this.request('/examenes/sincronizar/vincular', {
      method: 'POST',
      body: JSON.stringify({ session_id: sessionId, grupo_id: grupoId })
    });
  }

  cerrarSesionCarpeta(sessionId) {
    return this.request(`/examenes/sincronizar/cerrar/${sessionId}`, {
      method: 'DELETE'
    });
  }

  obtenerCarpetaSincronizada(sessionId) {
    return this.consultarEstadoCarpeta(sessionId);
  }

  // =============================================
  // HISTORIAL DE COMPARTICIONES
  // Router canónico: /historial (recursos unificados)
  // =============================================
  
  listarHistorial(docenteId, filtros = {}) {
    const params = new URLSearchParams();
    if (docenteId) params.append('docente_id', docenteId);
    if (filtros.fecha_desde) params.append('fecha_desde', filtros.fecha_desde);
    if (filtros.fecha_hasta) params.append('fecha_hasta', filtros.fecha_hasta);
    if (filtros.estado) params.append('estado', filtros.estado);
    const queryString = params.toString();
    return this.request(`/historial/comparticiones${queryString ? '?' + queryString : ''}`);
  }

  obtenerHistorial(comparticionId) {
    return this.request(`/historial/comparticiones/${comparticionId}`);
  }

  crearHistorial(data) {
    return this.request('/historial/comparticiones', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  cerrarHistorial(comparticionId) {
    return this.request(`/historial/comparticiones/${comparticionId}/cerrar`, {
      method: 'PUT'
    });
  }

  // =============================================
  // COMPARTIR CON ALUMNOS ESPECÍFICOS
  // =============================================
  
  compartirConAlumnos(data) {
    return this.request('/examenes/compartir/alumnos', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  obtenerAlumnosConectados(sessionId) {
    return this.request(`/examenes/sincronizar/alumnos/${sessionId}`);
  }

  // =============================================
  // ✅ ALUMNOS - CORREGIDO: Usa /alumnos (sin prefijo /examenes)
  // El catálogo unificado de alumnos está en /alumnos
  // =============================================
  
  listarAlumnos(busqueda = '') {
    const params = busqueda ? `?busqueda=${encodeURIComponent(busqueda)}` : '';
    // ✅ Cambiado: /examenes/alumnos -> /alumnos
    return this.request(`/alumnos${params}`)
      .catch(error => {
        console.warn('⚠️ Error al listar alumnos:', error.message);
        return [];
      });
  }

  buscarAlumnos(q) {
    if (!q || q.length < 2) {
      return Promise.resolve([]);
    }
    // ✅ Cambiado: /examenes/alumnos/buscar -> /alumnos/buscar
    return this.request(`/alumnos/buscar?q=${encodeURIComponent(q)}`)
      .catch(error => {
        console.warn('⚠️ Error al buscar alumnos:', error.message);
        return [];
      });
  }

  guardarAlumnos(data) {
    // ✅ Cambiado: /examenes/alumnos -> /alumnos
    return this.request('/alumnos', { 
      method: 'POST', 
      body: JSON.stringify(data) 
    });
  }

  eliminarTodosAlumnos() {
    // ✅ Cambiado: /examenes/alumnos -> /alumnos
    return this.request('/alumnos', { 
      method: 'DELETE' 
    });
  }

  obtenerAlumnosPorGrupo(grupoId) {
    // ✅ Cambiado: /examenes/alumnos/grupo -> /alumnos/grupo
    return this.request(`/alumnos/grupo/${grupoId}`)
      .catch(error => {
        console.warn('⚠️ Error al obtener alumnos por grupo:', error.message);
        return [];
      });
  }

  // =============================================
  // EXAMENES
  // =============================================
  
  listarExamenes(filtros = {}) {
    const params = new URLSearchParams();
    if (filtros.estado) params.append('estado', filtros.estado);
    if (filtros.busqueda) params.append('busqueda', filtros.busqueda);
    if (filtros.grupo_id) params.append('grupo_id', filtros.grupo_id);
    if (filtros.limit) params.append('limit', filtros.limit);
    if (filtros.offset) params.append('offset', filtros.offset);
    const queryString = params.toString();
    return this.request(`/examenes/${queryString ? '?' + queryString : ''}`);
  }

  listarPublicados() {
    return this.request('/examenes/publicados');
  }

  obtenerExamen(id) {
    return this.request(`/examenes/${id}`);
  }

  crearExamen(data) {
    return this.request('/examenes/', { 
      method: 'POST', 
      body: JSON.stringify(data) 
    });
  }

  actualizarExamen(id, data) {
    return this.request(`/examenes/${id}`, { 
      method: 'PUT', 
      body: JSON.stringify(data) 
    });
  }

  eliminarExamen(id) {
    return this.request(`/examenes/${id}`, { 
      method: 'DELETE' 
    });
  }

  cambiarEstado(id, estado) {
    return this.request(`/examenes/${id}/estado?estado=${estado}`, { 
      method: 'PUT' 
    });
  }

  // =============================================
  // RESULTADOS
  // =============================================
  
  guardarResultado(data) {
    return this.request('/examenes/resultados', { 
      method: 'POST', 
      body: JSON.stringify(data) 
    });
  }

  listarResultados(examenId) {
    return this.request(`/examenes/resultados/${examenId}`);
  }

  obtenerRevision(examenId, resultadoId) {
    return this.request(`/examenes/resultados/${examenId}/revision/${resultadoId}`);
  }

  limpiarResultados(examenId) {
    return this.request(`/examenes/resultados/${examenId}`, { 
      method: 'DELETE' 
    });
  }

  reiniciarIntento(examenId, alumnoId) {
    return this.request(`/examenes/resultados/${examenId}/${alumnoId}`, { 
      method: 'DELETE' 
    });
  }

  eliminarResultadoAlumno(examenId, alumnoId) {
    return this.reiniciarIntento(examenId, alumnoId);
  }

  listarResultadosAlumno(alumnoId) {
    return this.request(`/examenes/resultados/alumno/${alumnoId}`);
  }

  obtenerMejorResultado(examenId, alumnoId) {
    return this.request(`/examenes/resultados/${examenId}/mejor/${alumnoId}`);
  }

  // =============================================
  // MÉTODOS DE UTILIDAD
  // =============================================
  
  generarSessionId() {
    return 'carpeta_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  async verificarBackend() {
    try {
      await apiClient.request('/examenes/grupos', { method: 'HEAD' });
      return true;
    } catch {
      return false;
    }
  }

  async obtenerEstadisticas(examenId) {
    try {
      const resultados = await this.listarResultados(examenId);
      
      if (!resultados || resultados.length === 0) {
        return {
          total: 0,
          aprobados: 0,
          promedio: 0,
          maximo: 0,
          minimo: 0,
          distribucion: { '0-20': 0, '20-40': 0, '40-60': 0, '60-80': 0, '80-100': 0 }
        };
      }
      
      const notas = resultados.map(r => r.calificacion || 0);
      const promedio = notas.reduce((a, b) => a + b, 0) / notas.length;
      const maximo = Math.max(...notas);
      const minimo = Math.min(...notas);
      
      let aprobacion = 60;
      try {
        const examen = await this.obtenerExamen(examenId);
        aprobacion = examen?.puntaje_aprobacion || 60;
      } catch {
        // Ignorar error
      }
      
      const aprobados = notas.filter(n => n >= aprobacion).length;
      
      const distribucion = { '0-20': 0, '20-40': 0, '40-60': 0, '60-80': 0, '80-100': 0 };
      notas.forEach(n => {
        if (n < 20) distribucion['0-20']++;
        else if (n < 40) distribucion['20-40']++;
        else if (n < 60) distribucion['40-60']++;
        else if (n < 80) distribucion['60-80']++;
        else distribucion['80-100']++;
      });
      
      return {
        total: resultados.length,
        aprobados,
        promedio: Math.round(promedio * 100) / 100,
        maximo: Math.round(maximo * 100) / 100,
        minimo: Math.round(minimo * 100) / 100,
        distribucion
      };
    } catch (error) {
      console.error('Error obteniendo estadísticas:', error);
      return {
        total: 0,
        aprobados: 0,
        promedio: 0,
        maximo: 0,
        minimo: 0,
        distribucion: { '0-20': 0, '20-40': 0, '40-60': 0, '60-80': 0, '80-100': 0 }
      };
    }
  }

  async exportarResultadosCSV(examenId) {
    const resultados = await this.listarResultados(examenId);
    
    if (!resultados || resultados.length === 0) {
      return 'No hay resultados para exportar';
    }
    
    const headers = ['Alumno', 'Grado', 'Calificación', 'Correctas', 'Total', 'Tiempo', 'Violaciones', 'Estado', 'Fecha'];
    const rows = resultados.map(r => [
      r.alumno_nombre || 'Sin nombre',
      r.alumno_grado || '',
      `${(r.calificacion || 0).toFixed(1)}%`,
      `${r.correctas || 0}/${r.total_preguntas || 0}`,
      `${r.puntos_obtenidos || 0}/${r.total_puntos || 0}`,
      `${Math.floor((r.tiempo_usado || 0) / 60)}m ${(r.tiempo_usado || 0) % 60}s`,
      r.violaciones || 0,
      r.estado || 'COMPLETADO',
      r.entregado_en ? new Date(r.entregado_en).toLocaleString() : ''
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    
    return csvContent;
  }

  generarCodigoExamen() {
    const ahora = new Date();
    const anio = ahora.getFullYear();
    const mes = String(ahora.getMonth() + 1).padStart(2, '0');
    const dia = String(ahora.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 9999) + 1;
    return `EXA-${anio}${mes}${dia}-${String(random).padStart(4, '0')}`;
  }
}

const examenesService = new ExamenesService();
export default examenesService;