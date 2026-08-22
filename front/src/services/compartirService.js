// front/src/services/compartirService.js
// SERVICIO "COMPARTIR EN CLASE" - CON QR DINÁMICO

import api from './api';

const compartirService = {
  // Crear sala (desde la carpeta del docente)
  crearSala: async () => {
    try {
      return await api.post('/compartir/salas', {});
    } catch (error) {
      console.error('Error creando sala:', error);
      throw error;
    }
  },

  // Sala activa del docente
  salaActiva: async () => {
    try {
      return await api.get('/compartir/salas/activa');
    } catch (error) {
      console.error('Error obteniendo sala activa:', error);
      throw error;
    }
  },

  // ✅ Estado público de la sala (con QR y expiración)
  estadoSala: async (codigo) => {
    try {
      return await api.get(`/compartir/${codigo}`);
    } catch (error) {
      console.error('Error obteniendo estado de sala:', error);
      throw error;
    }
  },

  // Vincular (escanea QR)
  vincular: async (codigo) => {
    try {
      return await api.post(`/compartir/${codigo}/vincular`, {});
    } catch (error) {
      console.error('Error vinculando sala:', error);
      throw error;
    }
  },

  // Enviar material
  enviarMaterial: async (codigo, materialId) => {
    try {
      return await api.post(`/compartir/${codigo}/material`, { material_id: materialId });
    } catch (error) {
      console.error('Error enviando material:', error);
      throw error;
    }
  },

  // Quitar material
  quitarMaterial: async (codigo) => {
    try {
      return await api.post(`/compartir/${codigo}/quitar`, {});
    } catch (error) {
      console.error('Error quitando material:', error);
      throw error;
    }
  },

  // Cerrar sala
  cerrarSala: async (codigo) => {
    try {
      return await api.post(`/compartir/${codigo}/cerrar`, {});
    } catch (error) {
      console.error('Error cerrando sala:', error);
      throw error;
    }
  },
};

export default compartirService;