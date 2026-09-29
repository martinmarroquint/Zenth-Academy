// front/src/services/examenesService.js
// VERSION COMPLETA - CORREGIDA (USANDO /alumnos UNIFICADO)

import apiClient from './api';

// ✅ SEGURIDAD: neutraliza inyección de fórmulas al abrir el CSV en Excel/Sheets.
// Un nombre como `=HYPERLINK(...)` o `=cmd|...` se ejecutaría. Se antepone `'`.
const _csvCell = (cell) => {
  let s = String(cell ?? '').replace(/[\r\n\t]/g, ' ');
  if (/^[=+\-@]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
};

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

  obtenerExamen(id) {
    return this.request(`/examenes/${id}`);
  }

  // ✅ Autoridad de tiempo: inicia/reanuda un intento en el servidor.
  iniciarIntento(examenId) {
    return this.request(`/examenes/${examenId}/intentos`, { method: 'POST' });
  }

  async iniciarIntentoPublico(codigo, password = null) {
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
    const response = await fetch(`${baseUrl}/examenes/publico/${codigo}/intentos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'No se pudo iniciar el intento' }));
      throw new Error(error.detail || 'No se pudo iniciar el intento');
    }
    return response.json();
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

  /**
   * Reintenta enviar los resultados guardados offline (localStorage).
   * Se llama al entrar al área autenticada (una vez por carga de página).
   *
   * - Descarta entradas legacy sin `intento_id` (el backend ahora las rechaza).
   * - Descarta errores permanentes (4xx salvo 401/429); conserva los transitorios.
   */
  async reintentarResultadosPendientes() {
    let pendientes = [];
    try {
      pendientes = JSON.parse(localStorage.getItem('resultados_pendientes') || '[]');
    } catch {
      return;
    }
    if (!Array.isArray(pendientes) || pendientes.length === 0) return;

    const restantes = [];
    for (const datos of pendientes) {
      // Entradas legacy (sin intento) ya no son aceptadas por el backend.
      if (!datos || !datos.intento_id) continue;

      try {
        await this.guardarResultado(datos);
      } catch (e) {
        const status = e?.status;
        const transitorio = !status || status >= 500 || status === 401 || status === 429;
        if (transitorio) restantes.push(datos);
      }
    }
    if (restantes.length === 0) {
      localStorage.removeItem('resultados_pendientes');
    } else {
      localStorage.setItem('resultados_pendientes', JSON.stringify(restantes));
    }
  }

  listarResultados(examenId) {
    return this.request(`/examenes/resultados/${examenId}`);
  }

  limpiarResultados(examenId) {
    return this.request(`/examenes/resultados/${examenId}`, { 
      method: 'DELETE' 
    });
  }

  eliminarResultadoAlumno(examenId, alumnoId) {
    return this.request(`/examenes/resultados/${examenId}/${alumnoId}`, { 
      method: 'DELETE' 
    });
  }

  listarResultadosAlumno(alumnoId) {
    return this.request(`/examenes/resultados/alumno/${alumnoId}`);
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
      ...rows.map(row => row.map(_csvCell).join(','))
    ].join('\n');
    
    // ✅ CORREGIDO: Agregar BOM UTF-8 para que Excel muestre caracteres español correctamente
    return '\uFEFF' + csvContent;
  }

  // =============================================
  // ACCESO PUBLICO (sin autenticacion)
  // =============================================
  
  async obtenerExamenPublico(codigo) {
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
    const response = await fetch(`${baseUrl}/examenes/publico/${codigo}`);
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Error al obtener examen' }));
      throw new Error(error.detail || 'Error al obtener examen');
    }
    return response.json();
  }

  async verificarPasswordExamenPublico(codigo, password) {
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
    const response = await fetch(`${baseUrl}/examenes/publico/${codigo}/verificar-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Password incorrecto' }));
      throw new Error(error.detail || 'Password incorrecto');
    }
    return response.json();
  }

  async guardarResultadoPublico(codigo, data) {
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
    const response = await fetch(`${baseUrl}/examenes/publico/${codigo}/resultado`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Error al guardar resultado' }));
      throw new Error(error.detail || 'Error al guardar resultado');
    }
    return response.json();
  }
}

const examenesService = new ExamenesService();
export default examenesService;