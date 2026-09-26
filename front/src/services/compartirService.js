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

  // ✅ Crea la pantalla de proyección del aula (URL FIJA /proyectar).
  // Sin sesión nace pendiente (muestra QR para escanear); con sesión de docente
  // queda vinculada al instante, sin códigos ni credenciales.
  crearPantalla: async (pantallaSecret) => {
    try {
      return await api.post('/compartir/pantallas', {
        pantalla_secret: pantallaSecret,
      });
    } catch (error) {
      console.error('Error creando pantalla:', error);
      throw error;
    }
  },

  // ✅ Estado público de la sala. Si se pasa el secreto de pantalla, el backend
  // entrega el material activo (solo la pantalla emparejada lo recibe).
  estadoSala: async (codigo, pantallaSecret = null) => {
    try {
      const options = pantallaSecret
        ? { headers: { 'X-Pantalla-Secret': pantallaSecret } }
        : {};
      return await api.get(`/compartir/${codigo}`, options);
    } catch (error) {
      console.error('Error obteniendo estado de sala:', error);
      throw error;
    }
  },

  // ✅ Vincular la pantalla del aula (escaneo del QR, estilo WhatsApp Web):
  // el celular del docente envía el token del QR y el secreto de la pantalla.
  vincular: async (codigo, qrToken, pantallaSecret) => {
    try {
      return await api.post(`/compartir/${codigo}/vincular`, {
        qr_token: qrToken,
        pantalla_secret: pantallaSecret,
      });
    } catch (error) {
      console.error('Error vinculando sala:', error);
      throw error;
    }
  },

  // ✅ Desvincular la pantalla (deja de recibir contenido al instante)
  revocarPantalla: async (codigo) => {
    try {
      return await api.post(`/compartir/${codigo}/pantalla/revocar`, {});
    } catch (error) {
      console.error('Error desvinculando pantalla:', error);
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