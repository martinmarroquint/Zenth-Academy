// front/src/utils/crypto.js
// NUEVO ARCHIVO

export class CryptoService {
  // Generar clave de sesión a partir del sessionId
  static deriveKey(sessionId) {
    // Usar PBKDF2 para derivar una clave segura
    // Simulación - en producción usar Web Crypto API
    return sessionId.padEnd(32, '0').slice(0, 32);
  }

  // Cifrar datos
  static encrypt(data, sessionId) {
    const key = this.deriveKey(sessionId);
    const json = JSON.stringify(data);
    // XOR simple para demostración - usar AES en producción
    let encrypted = '';
    for (let i = 0; i < json.length; i++) {
      encrypted += String.fromCharCode(
        json.charCodeAt(i) ^ key.charCodeAt(i % key.length)
      );
    }
    return btoa(encrypted);
  }

  // Descifrar datos
  static decrypt(encryptedData, sessionId) {
    try {
      const key = this.deriveKey(sessionId);
      const encrypted = atob(encryptedData);
      let decrypted = '';
      for (let i = 0; i < encrypted.length; i++) {
        decrypted += String.fromCharCode(
          encrypted.charCodeAt(i) ^ key.charCodeAt(i % key.length)
        );
      }
      return JSON.parse(decrypted);
    } catch {
      return null;
    }
  }
}