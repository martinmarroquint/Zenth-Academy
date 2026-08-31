// front/src/pages/modulos/ConfiguracionPage.jsx
// CONFIGURACION (pilar 3): Perfil, Notificaciones, Preferencias

import React, { useState, useEffect } from 'react';
import {
  User, Bell, Settings, Save, Loader2, Eye, EyeOff,
  CheckCircle, Lock, Palette, Globe
} from 'lucide-react';
import { authService } from '../../services/authService';

const ConfiguracionPage = () => {
  const [tabActiva, setTabActiva] = useState('perfil');
  const usuario = authService.getCurrentUser();

  // ===== PERFIL =====
  const [perfil, setPerfil] = useState({
    nombres: usuario?.nombres || '',
    apellidos: usuario?.apellidos || '',
    telefono: usuario?.telefono || '',
    especialidad: usuario?.especialidad || '',
    biografia: usuario?.biografia || '',
    institucion: usuario?.institucion || '',
  });
  const [guardandoPerfil, setGuardandoPerfil] = useState(false);
  const [mensajePerfil, setMensajePerfil] = useState('');

  // ===== SEGURIDAD =====
  const [password, setPassword] = useState({ actual: '', nueva: '', confirmar: '' });
  const [mostrarPass, setMostrarPass] = useState(false);
  const [guardandoPass, setGuardandoPass] = useState(false);
  const [mensajePass, setMensajePass] = useState('');

  // ===== NOTIFICACIONES (preferencias locales por ahora) =====
  const [notificaciones, setNotificaciones] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('cv_notificaciones') || '{}');
    } catch {
      return {};
    }
  });

  // ===== PREFERENCIAS =====
  const [preferencias, setPreferencias] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('cv_preferencias') || '{"idioma":"es","tema":"claro"}');
    } catch {
      return { idioma: 'es', tema: 'claro' };
    }
  });

  useEffect(() => {
    localStorage.setItem('cv_notificaciones', JSON.stringify(notificaciones));
  }, [notificaciones]);

  useEffect(() => {
    localStorage.setItem('cv_preferencias', JSON.stringify(preferencias));
  }, [preferencias]);

  const handleGuardarPerfil = async () => {
    setGuardandoPerfil(true);
    setMensajePerfil('');
    try {
      const data = {};
      if (perfil.nombres) data.nombres = perfil.nombres;
      if (perfil.apellidos) data.apellidos = perfil.apellidos;
      if (perfil.telefono) data.telefono = perfil.telefono;
      if (perfil.especialidad) data.especialidad = perfil.especialidad;
      if (perfil.biografia) data.biografia = perfil.biografia;
      if (perfil.institucion) data.institucion = perfil.institucion;
      await authService.actualizarPerfil(data);
      // Actualizar usuario en localStorage
      const actualizado = { ...usuario, ...data };
      localStorage.setItem('user', JSON.stringify(actualizado));
      authService.user = actualizado;
      setMensajePerfil('Perfil actualizado correctamente');
      setTimeout(() => setMensajePerfil(''), 3000);
    } catch (e) {
      console.error('Error guardando perfil:', e);
      setMensajePerfil(e.message || 'No se pudo guardar el perfil');
    } finally {
      setGuardandoPerfil(false);
    }
  };

  const handleCambiarPassword = async () => {
    setGuardandoPass(true);
    setMensajePass('');
    try {
      if (password.nueva !== password.confirmar) {
        setMensajePass('Las contraseñas no coinciden');
        return;
      }
      if (password.nueva.length < 6) {
        setMensajePass('La nueva contraseña debe tener al menos 6 caracteres');
        return;
      }
      await authService.cambiarPassword({
        current_password: password.actual,
        new_password: password.nueva,
      });
      setMensajePass('Contraseña actualizada correctamente');
      setPassword({ actual: '', nueva: '', confirmar: '' });
      setTimeout(() => setMensajePass(''), 3000);
    } catch (e) {
      console.error('Error cambiando password:', e);
      setMensajePass(e.message || 'No se pudo cambiar la contraseña');
    } finally {
      setGuardandoPass(false);
    }
  };

  const toggleNotificacion = (key) => {
    setNotificaciones(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const TABS = [
    { id: 'perfil', label: 'Perfil', icon: User },
    { id: 'seguridad', label: 'Seguridad', icon: Lock },
    { id: 'notificaciones', label: 'Notificaciones', icon: Bell },
    { id: 'preferencias', label: 'Preferencias', icon: Settings },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Configuración</h2>
        <p className="text-sm text-gray-500">Gestiona tu perfil, seguridad y preferencias</p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-gray-200 bg-white rounded-xl px-2 overflow-x-auto">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setTabActiva(tab.id)}
              className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px flex items-center gap-1.5 whitespace-nowrap ${
                tabActiva === tab.id
                  ? 'text-indigo-600 border-indigo-600'
                  : 'text-gray-500 border-transparent hover:text-gray-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ===== PERFIL ===== */}
      {tabActiva === 'perfil' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-indigo-600 flex items-center justify-center">
              <span className="text-2xl font-bold text-white">
                {(usuario?.nombres || 'U').charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{usuario?.nombres} {usuario?.apellidos}</h3>
              <p className="text-sm text-gray-500">{usuario?.email}</p>
              <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full capitalize">
                {usuario?.rol || 'usuario'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Nombres</label>
              <input
                type="text"
                value={perfil.nombres}
                onChange={(e) => setPerfil({ ...perfil, nombres: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Apellidos</label>
              <input
                type="text"
                value={perfil.apellidos}
                onChange={(e) => setPerfil({ ...perfil, apellidos: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Teléfono</label>
              <input
                type="text"
                value={perfil.telefono}
                onChange={(e) => setPerfil({ ...perfil, telefono: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Institución</label>
              <input
                type="text"
                value={perfil.institucion}
                onChange={(e) => setPerfil({ ...perfil, institucion: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Especialidad</label>
              <input
                type="text"
                value={perfil.especialidad}
                onChange={(e) => setPerfil({ ...perfil, especialidad: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Biografía</label>
            <textarea
              value={perfil.biografia}
              onChange={(e) => setPerfil({ ...perfil, biografia: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all resize-none"
            />
          </div>

          {mensajePerfil && (
            <div className={`flex items-center gap-2 text-sm px-4 py-3 rounded-lg ${
              mensajePerfil.includes('correctamente') ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
            }`}>
              <CheckCircle className="w-4 h-4" />
              {mensajePerfil}
            </div>
          )}

          <button
            onClick={handleGuardarPerfil}
            disabled={guardandoPerfil}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 text-sm font-medium disabled:opacity-50"
          >
            {guardandoPerfil ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Guardar perfil
          </button>
        </div>
      )}

      {/* ===== SEGURIDAD ===== */}
      {tabActiva === 'seguridad' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h3 className="font-semibold text-gray-900">Cambiar contraseña</h3>
          <div className="grid grid-cols-1 gap-4 max-w-md">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Contraseña actual</label>
              <div className="relative">
                <input
                  type={mostrarPass ? 'text' : 'password'}
                  value={password.actual}
                  onChange={(e) => setPassword({ ...password, actual: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all pr-10"
                />
                <button
                  onClick={() => setMostrarPass(!mostrarPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                >
                  {mostrarPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Nueva contraseña</label>
              <input
                type="password"
                value={password.nueva}
                onChange={(e) => setPassword({ ...password, nueva: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Confirmar nueva contraseña</label>
              <input
                type="password"
                value={password.confirmar}
                onChange={(e) => setPassword({ ...password, confirmar: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all"
              />
            </div>
          </div>

          {mensajePass && (
            <div className={`flex items-center gap-2 text-sm px-4 py-3 rounded-lg max-w-md ${
              mensajePass.includes('correctamente') ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
            }`}>
              <CheckCircle className="w-4 h-4" />
              {mensajePass}
            </div>
          )}

          <button
            onClick={handleCambiarPassword}
            disabled={guardandoPass}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 text-sm font-medium disabled:opacity-50"
          >
            {guardandoPass ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Cambiar contraseña
          </button>
        </div>
      )}

      {/* ===== NOTIFICACIONES ===== */}
      {tabActiva === 'notificaciones' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h3 className="font-semibold text-gray-900">Notificaciones</h3>
          <p className="text-xs text-gray-500">Configura qué notificaciones deseas recibir</p>

          {[
            { key: 'nueva_solicitud', label: 'Nueva solicitud de acceso a curso', desc: 'Cuando un estudiante solicita acceso a uno de tus cursos' },
            { key: 'curso_completado', label: 'Estudiante completó un curso', desc: 'Cuando un estudiante termina el 100% de un curso' },
            { key: 'nuevo_comentario', label: 'Nuevo comentario en el foro', desc: 'Cuando alguien comenta en una publicación del foro' },
            { key: 'certificado_emitido', label: 'Certificado emitido', desc: 'Cuando se emite un certificado automáticamente' },
            { key: 'material_compartido', label: 'Sesión de compartir en clase', desc: 'Cuando inicias o terminas una sesión de compartir en clase' },
            { key: 'recordatorios', label: 'Recordatorios de estudio', desc: 'Recordatorios periódicos para estudiantes' },
          ].map((item) => (
            <label key={item.key} className="flex items-start justify-between gap-4 py-3 border-b border-gray-100 cursor-pointer">
              <div>
                <p className="text-sm font-medium text-gray-900">{item.label}</p>
                <p className="text-xs text-gray-500">{item.desc}</p>
              </div>
              <button
                onClick={() => toggleNotificacion(item.key)}
                className={`relative w-10 h-6 rounded-full transition-colors flex-shrink-0 ${
                  notificaciones[item.key] !== false ? 'bg-indigo-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${
                    notificaciones[item.key] !== false ? 'left-[18px]' : 'left-0.5'
                  }`}
                />
              </button>
            </label>
          ))}
        </div>
      )}

      {/* ===== PREFERENCIAS ===== */}
      {tabActiva === 'preferencias' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h3 className="font-semibold text-gray-900">Preferencias</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg">
            <div>
              <label className="text-xs text-gray-500 block mb-1 flex items-center gap-1">
                <Globe className="w-3.5 h-3.5" /> Idioma
              </label>
              <select
                value={preferencias.idioma || 'es'}
                onChange={(e) => setPreferencias({ ...preferencias, idioma: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-indigo-300 bg-white"
              >
                <option value="es">Español</option>
                <option value="en">English</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1 flex items-center gap-1">
                <Palette className="w-3.5 h-3.5" /> Tema visual
              </label>
              <select
                value={preferencias.tema || 'claro'}
                onChange={(e) => setPreferencias({ ...preferencias, tema: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-indigo-300 bg-white"
              >
                <option value="claro">Claro</option>
                <option value="oscuro">Oscuro</option>
              </select>
            </div>
          </div>

          <p className="text-xs text-gray-400">
            Las preferencias se guardan en este dispositivo por ahora. La sincronización en la nube llegará en una fase posterior.
          </p>
        </div>
      )}
    </div>
  );
};

export default ConfiguracionPage;