// front/src/services/geoAnalyticsService.js
// SERVICIO DE ANALYTICS GEOGRAFICOS

import apiClient from './api';

class GeoAnalyticsService {
  /**
   * Obtiene estadisticas geograficas de logins
   * @param {number} days - Dias hacia atras (default 30)
   */
  async obtenerStats(days = 30) {
    try {
      return await apiClient.request(`/geo-analytics/stats?days=${days}`);
    } catch (error) {
      console.error('Error obteniendo stats geograficas:', error);
      throw error;
    }
  }

  /**
   * Obtiene puntos para mapa geografico
   * @param {number} days - Dias hacia atras (default 30)
   */
  async obtenerPuntosMapa(days = 30) {
    try {
      return await apiClient.request(`/geo-analytics/map-points?days=${days}`);
    } catch (error) {
      console.error('Error obteniendo puntos de mapa:', error);
      throw error;
    }
  }

  /**
   * Obtiene logins recientes con datos geograficos
   * @param {number} limit - Numero de registros (default 50)
   */
  async obtenerLoginsRecientes(limit = 50) {
    try {
      return await apiClient.request(`/geo-analytics/recent-logins?limit=${limit}`);
    } catch (error) {
      console.error('Error obteniendo logins recientes:', error);
      throw error;
    }
  }
}

export default new GeoAnalyticsService();
