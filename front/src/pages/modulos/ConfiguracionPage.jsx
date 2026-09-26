// front/src/pages/modulos/ConfiguracionPage.jsx
// CONFIGURACION (pilar 3): Perfil, Seguridad, Notificaciones, Preferencias, Cuenta

import React, { useState, useEffect } from 'react';
import {
  User, Bell, Settings, Save, CheckCircle, Lock, Globe,
  Info, Download, LogOut, AlertTriangle, ShieldCheck,
  Calendar, Clock, Fingerprint, Trash2, Plus
} from 'lucide-react';
import { authService } from '../../services/authService';
import webauthnService from '../../services/webauthnService';
import { Input, Button, Switch, Tabs, Badge, Modal, Dropdown } from '../../components/ui';

// =============================================
// CONSTANTES
// =============================================

const TABS = [
  { id: 'perfil', label: 'Perfil', icon: <User className="w-4 h-4" /> },
  { id: 'seguridad', label: 'Seguridad', icon: <Lock className="w-4 h-4" /> },
  { id: 'notificaciones', label: 'Notificaciones', icon: <Bell className="w-4 h-4" /> },
  { id: 'preferencias', label: 'Preferencias', icon: <Settings className="w-4 h-4" /> },
  { id: 'cuenta', label: 'Cuenta', icon: <ShieldCheck className="w-4 h-4" /> },
];

const GRUPOS_NOTIFICACIONES = [
  {
    titulo: 'Solicitudes de acceso',
    items: [
      { key: 'nueva_solicitud', label: 'Nueva solicitud de acceso a curso', desc: 'Cuando un estudiante solicita acceso a uno de tus cursos' },
    ],
  },
  {
    titulo: 'Cursos',
    items: [
      { key: 'curso_completado', label: 'Estudiante completó un curso', desc: 'Cuando un estudiante termina el 100% de un curso' },
      { key: 'certificado_emitido', label: 'Certificado emitido', desc: 'Cuando se emite un certificado automáticamente' },
      { key: 'material_compartido', label: 'Sesión de compartir en clase', desc: 'Cuando inicias o terminas una sesión de compartir en clase' },
    ],
  },
  {
    titulo: 'Comunidad',
    items: [
      { key: 'nuevo_comentario', label: 'Nuevo comentario en el foro', desc: 'Cuando alguien comenta en una publicación del foro' },
      { key: 'recordatorios', label: 'Recordatorios de estudio', desc: 'Recordatorios periódicos para estudiantes' },
    ],
  },
];

const IDIOMAS = [
  { value: 'es', label: 'Español' },
  { value: 'en', label: 'English' },
];

const FORMATOS_FECHA = [
  { value: 'dmy', label: 'DD/MM/AAAA' },
  { value: 'mdy', label: 'MM/DD/AAAA' },
];

const ZONAS_HORARIAS = [
  { value: 'America/Lima', label: '(GMT-5) Lima, Bogotá, Quito' },
  { value: 'America/Mexico_City', label: '(GMT-6) Ciudad de México' },
  { value: 'America/Bogota', label: '(GMT-5) Bogotá' },
  { value: 'America/Argentina/Buenos_Aires', label: '(GMT-3) Buenos Aires' },
  { value: 'America/Santiago', label: '(GMT-4) Santiago' },
  { value: 'Europe/Madrid', label: '(GMT+1) Madrid' },
  { value: 'UTC', label: '(GMT+0) UTC' },
];

const FORTALEZA_INFO = {
  debil: { label: 'Débil', color: 'bg-red-500', text: 'text-red-600', ancho: 'w-1/3' },
  media: { label: 'Media', color: 'bg-amber-500', text: 'text-amber-600', ancho: 'w-2/3' },
  fuerte: { label: 'Fuerte', color: 'bg-emerald-500', text: 'text-emerald-600', ancho: 'w-full' },
};

const evaluarFortaleza = (pwd) => {
  if (!pwd) return null;
  let score = 0;
  if (pwd.length >= 6) score += 1;
  if (pwd.length >= 10) score += 1;
  if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score += 1;
  if (/\d/.test(pwd)) score += 1;
  if (/[^A-Za-z0-9]/.test(pwd)) score += 1;
  if (score <= 2) return 'debil';
  if (score === 3) return 'media';
  return 'fuerte';
};

const PREFERENCIAS_DEFAULT = {
  idioma: 'es',
  formatoFecha: 'dmy',
  zonaHoraria: 'America/Lima',
};

// =============================================
// COMPONENTE
// =============================================

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
  const [guardandoPass, setGuardandoPass] = useState(false);
  const [mensajePass, setMensajePass] = useState('');

  // ===== SEGURIDAD: HUELLA / FACE ID (passkeys) =====
  // El soporte se calcula en el render (no necesita efecto)
  const motivoHuella = webauthnService.motivoNoDisponible();
  const huellaDisponible = !motivoHuella;
  const [passkeys, setPasskeys] = useState([]);
  const [cargandoPasskey, setCargandoPasskey] = useState(false);
  const [mensajePasskey, setMensajePasskey] = useState('');

  useEffect(() => {
    let activo = true;
    (async () => {
      try {
        const data = await webauthnService.credenciales();
        if (activo) setPasskeys(Array.isArray(data) ? data : []);
      } catch {
        // Sin passkeys todavía
      }
    })();
    return () => {
      activo = false;
    };
  }, []);

  const activarHuella = async () => {
    setCargandoPasskey(true);
    setMensajePasskey('');
    try {
      const nombre = `${navigator.platform || 'Dispositivo'} · ${new Date().toLocaleDateString()}`;
      await webauthnService.registrar(nombre);
      const data = await webauthnService.credenciales();
      setPasskeys(Array.isArray(data) ? data : []);
      setMensajePasskey('Huella / Face ID activado en este dispositivo.');
    } catch (e) {
      setMensajePasskey(e?.message || 'No se pudo activar la huella / Face ID');
    } finally {
      setCargandoPasskey(false);
    }
  };

  const eliminarPasskey = async (id) => {
    setCargandoPasskey(true);
    setMensajePasskey('');
    try {
      await webauthnService.eliminarCredencial(id);
      setPasskeys((prev) => prev.filter((p) => p.id !== id));
      setMensajePasskey('Dispositivo eliminado.');
    } catch (e) {
      setMensajePasskey(e?.message || 'No se pudo eliminar el dispositivo');
    } finally {
      setCargandoPasskey(false);
    }
  };

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
      const guardadas = JSON.parse(localStorage.getItem('cv_preferencias') || '{}');
      // Eliminar la preferencia de tema: el tema oscuro real aún no está implementado
      delete guardadas.tema;
      return { ...PREFERENCIAS_DEFAULT, ...guardadas };
    } catch {
      return { ...PREFERENCIAS_DEFAULT };
    }
  });

  // ===== CUENTA =====
  const [mensajeExport, setMensajeExport] = useState('');
  const [mostrarLogout, setMostrarLogout] = useState(false);
  const [cerrandoSesion, setCerrandoSesion] = useState(false);

  useEffect(() => {
    localStorage.setItem('cv_notificaciones', JSON.stringify(notificaciones));
  }, [notificaciones]);

  useEffect(() => {
    localStorage.setItem('cv_preferencias', JSON.stringify(preferencias));
  }, [preferencias]);

  // ===== HELPERS DE FORMATO =====
  const formatearFecha = (valor) => {
    if (!valor) return '—';
    const fecha = new Date(valor);
    if (Number.isNaN(fecha.getTime())) return '—';
    const dia = String(fecha.getDate()).padStart(2, '0');
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const anio = fecha.getFullYear();
    return preferencias.formatoFecha === 'mdy' ? `${mes}/${dia}/${anio}` : `${dia}/${mes}/${anio}`;
  };

  const formatearFechaHora = (valor) => {
    if (!valor) return '—';
    const fecha = new Date(valor);
    if (Number.isNaN(fecha.getTime())) return '—';
    const hora = fecha.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
    return `${formatearFecha(valor)} · ${hora}`;
  };

  const iniciales = `${(usuario?.nombres || '').charAt(0)}${(usuario?.apellidos || '').charAt(0)}`.toUpperCase() || 'U';

  const rolVariant = usuario?.rol === 'admin'
    ? 'danger'
    : usuario?.rol === 'docente'
      ? 'primary'
      : usuario?.rol === 'estudiante'
        ? 'info'
        : 'default';

  const fortaleza = evaluarFortaleza(password.nueva);
  const fortalezaInfo = fortaleza ? FORTALEZA_INFO[fortaleza] : null;

  // ===== ACCIONES =====
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

  const toggleNotificacion = (key, value) => {
    setNotificaciones((prev) => ({ ...prev, [key]: value }));
  };

  // ✅ SEGURIDAD: nunca exportar credenciales de sesión (token/refresh_token).
  const CLAVES_SENSIBLES = new Set(['token', 'refresh_token', 'user', 'userData']);

  const exportarDatos = () => {
    const almacenamiento = {};
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (CLAVES_SENSIBLES.has(key) || /token/i.test(key)) continue;
      const raw = localStorage.getItem(key);
      try {
        almacenamiento[key] = JSON.parse(raw);
      } catch {
        almacenamiento[key] = raw;
      }
    }

    const payload = {
      exportado_en: new Date().toISOString(),
      usuario: usuario
        ? { nombres: usuario.nombres, apellidos: usuario.apellidos, email: usuario.email, rol: usuario.rol }
        : null,
      almacenamiento_local: almacenamiento,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = `zenth-datos-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(enlace);
    enlace.click();
    document.body.removeChild(enlace);
    URL.revokeObjectURL(url);

    setMensajeExport('Datos exportados correctamente');
    setTimeout(() => setMensajeExport(''), 3000);
  };

  const handleLogout = async () => {
    setCerrandoSesion(true);
    try {
      await authService.logout();
    } finally {
      setCerrandoSesion(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-[#0f766e]/10 flex items-center justify-center flex-shrink-0">
          <Settings className="w-6 h-6 text-[#0f766e]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Configuración</h1>
          <p className="text-sm text-gray-500">Gestiona tu perfil, seguridad, notificaciones y preferencias</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl border border-gray-200/60 px-3 overflow-x-auto">
        <Tabs
          tabs={TABS}
          activeTab={tabActiva}
          onChange={setTabActiva}
          variant="underlined"
          className="min-w-max [&>button]:whitespace-nowrap"
        />
      </div>

      {/* ===== PERFIL ===== */}
      {tabActiva === 'perfil' && (
        <div className="bg-white rounded-2xl border border-gray-200/60 p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-5">
            <div className="w-20 h-20 rounded-full bg-[#0f766e] flex items-center justify-center flex-shrink-0">
              <span className="text-3xl font-bold text-white">{iniciales}</span>
            </div>
            <div className="space-y-1.5">
              <h3 className="text-lg font-semibold text-gray-900">
                {usuario?.nombres} {usuario?.apellidos}
              </h3>
              <p className="text-sm text-gray-500">{usuario?.email}</p>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={rolVariant} size="md" className="capitalize">
                  {usuario?.rol || 'usuario'}
                </Badge>
                {usuario?.email_verificado && (
                  <Badge variant="success" size="md" className="flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    Verificado
                  </Badge>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-xs text-gray-400">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  Registro: {formatearFecha(usuario?.fecha_registro)}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  Último acceso: {formatearFechaHora(usuario?.ultimo_acceso)}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Nombres"
              value={perfil.nombres}
              onChange={(e) => setPerfil({ ...perfil, nombres: e.target.value })}
            />
            <Input
              label="Apellidos"
              value={perfil.apellidos}
              onChange={(e) => setPerfil({ ...perfil, apellidos: e.target.value })}
            />
            <Input
              label="Teléfono"
              value={perfil.telefono}
              onChange={(e) => setPerfil({ ...perfil, telefono: e.target.value })}
            />
            <Input
              label="Institución"
              value={perfil.institucion}
              onChange={(e) => setPerfil({ ...perfil, institucion: e.target.value })}
            />
            <Input
              label="Especialidad"
              value={perfil.especialidad}
              onChange={(e) => setPerfil({ ...perfil, especialidad: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Biografía</label>
            <textarea
              value={perfil.biografia}
              onChange={(e) => setPerfil({ ...perfil, biografia: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 text-sm bg-white border border-gray-200 rounded-xl outline-none transition-all duration-200 resize-none hover:border-gray-300 focus:border-[#0f766e] focus:ring-2 focus:ring-[#0f766e]/20 placeholder:text-gray-400"
              placeholder="Cuéntanos un poco sobre ti"
            />
          </div>

          {mensajePerfil && (
            <div className={`flex items-center gap-2 text-sm px-4 py-3 rounded-xl ${
              mensajePerfil.includes('correctamente') ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
            }`}>
              <CheckCircle className="w-4 h-4" />
              {mensajePerfil}
            </div>
          )}

          <Button
            variant="primary"
            icon={<Save className="w-4 h-4" />}
            loading={guardandoPerfil}
            onClick={handleGuardarPerfil}
          >
            Guardar perfil
          </Button>
        </div>
      )}

      {/* ===== SEGURIDAD ===== */}
      {tabActiva === 'seguridad' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200/60 p-6 space-y-5">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-[#0f766e]" />
              <h3 className="font-semibold text-gray-900">Cambiar contraseña</h3>
            </div>

            <div className="grid grid-cols-1 gap-4 max-w-md">
              <Input
                type="password"
                label="Contraseña actual"
                value={password.actual}
                onChange={(e) => setPassword({ ...password, actual: e.target.value })}
              />
              <div>
                <Input
                  type="password"
                  label="Nueva contraseña"
                  value={password.nueva}
                  onChange={(e) => setPassword({ ...password, nueva: e.target.value })}
                />
                {fortalezaInfo && (
                  <div className="mt-2 space-y-1">
                    <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-300 ${fortalezaInfo.color} ${fortalezaInfo.ancho}`} />
                    </div>
                    <p className={`text-xs font-medium ${fortalezaInfo.text}`}>
                      Seguridad: {fortalezaInfo.label}
                    </p>
                  </div>
                )}
              </div>
              <Input
                type="password"
                label="Confirmar nueva contraseña"
                value={password.confirmar}
                onChange={(e) => setPassword({ ...password, confirmar: e.target.value })}
              />
            </div>

            {mensajePass && (
              <div className={`flex items-center gap-2 text-sm px-4 py-3 rounded-xl max-w-md ${
                mensajePass.includes('correctamente') ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
              }`}>
                <CheckCircle className="w-4 h-4" />
                {mensajePass}
              </div>
            )}

            <Button
              variant="primary"
              icon={<Save className="w-4 h-4" />}
              loading={guardandoPass}
              onClick={handleCambiarPassword}
            >
              Cambiar contraseña
            </Button>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200/60 p-6 space-y-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#0f766e]" />
              <h3 className="font-semibold text-gray-900">Sesión</h3>
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span>
                Último acceso: <span className="font-medium text-gray-900">{formatearFechaHora(usuario?.ultimo_acceso)}</span>
              </span>
            </div>
            <p className="text-xs text-gray-400">
              Si no reconoces este acceso, cambia tu contraseña inmediatamente.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200/60 p-6 space-y-3">
            <div className="flex items-center gap-2">
              <Fingerprint className="w-4 h-4 text-[#0f766e]" />
              <h3 className="font-semibold text-gray-900">Huella / Face ID</h3>
            </div>

            {!huellaDisponible ? (
              <p className="text-xs text-gray-500">
                Huella / Face ID no disponible: <span className="text-gray-700">{motivoHuella}</span>
              </p>
            ) : (
              <>
                <p className="text-xs text-gray-500">
                  Entrá sin contraseña usando la biometría de este dispositivo. La huella nunca
                  sale del dispositivo: solo se guarda una clave pública.
                </p>

                {passkeys.length > 0 && (
                  <div className="space-y-2">
                    {passkeys.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between gap-3 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-gray-800 truncate">
                            {p.nombre || 'Dispositivo'}
                          </p>
                          <p className="text-[11px] text-gray-400">
                            {p.last_used_at
                              ? `Último uso: ${formatearFechaHora(p.last_used_at)}`
                              : 'Sin usar todavía'}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => eliminarPasskey(p.id)}
                          disabled={cargandoPasskey}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 disabled:opacity-50"
                          title="Eliminar este dispositivo"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <Button
                  variant="secondary"
                  size="sm"
                  icon={<Plus className="w-4 h-4" />}
                  loading={cargandoPasskey}
                  onClick={activarHuella}
                >
                  Activar huella / Face ID en este dispositivo
                </Button>

                {mensajePasskey && (
                  <p className="text-xs text-[#0f766e] flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5" />
                    {mensajePasskey}
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ===== NOTIFICACIONES ===== */}
      {tabActiva === 'notificaciones' && (
        <div className="bg-white rounded-2xl border border-gray-200/60 p-6 space-y-5">
          <div>
            <h3 className="font-semibold text-gray-900">Notificaciones</h3>
            <p className="text-xs text-gray-500 mt-1">Configura qué notificaciones deseas recibir</p>
          </div>

          <div className="flex items-start gap-2 text-xs text-gray-600 bg-[#e6f4f2]/60 border border-[#0f766e]/20 rounded-xl px-3 py-2.5">
            <Info className="w-4 h-4 text-[#0f766e] flex-shrink-0 mt-0.5" />
            <span>Estas preferencias se guardan en este dispositivo y no se sincronizan con tu cuenta.</span>
          </div>

          <div className="space-y-5">
            {GRUPOS_NOTIFICACIONES.map((grupo) => (
              <div key={grupo.titulo} className="space-y-1">
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{grupo.titulo}</h4>
                {grupo.items.map((item) => (
                  <div
                    key={item.key}
                    className="flex items-start justify-between gap-4 py-3 border-b border-gray-100 last:border-0"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">{item.label}</p>
                      <p className="text-xs text-gray-500">{item.desc}</p>
                    </div>
                    <Switch
                      checked={notificaciones[item.key] !== false}
                      onChange={(checked) => toggleNotificacion(item.key, checked)}
                    />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===== PREFERENCIAS ===== */}
      {tabActiva === 'preferencias' && (
        <div className="bg-white rounded-2xl border border-gray-200/60 p-6 space-y-5">
          <div>
            <h3 className="font-semibold text-gray-900">Preferencias</h3>
            <p className="text-xs text-gray-500 mt-1">Ajustes de visualización y regionalización</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
            <Dropdown
              label="Idioma"
              value={preferencias.idioma}
              onChange={(value) => setPreferencias({ ...preferencias, idioma: value })}
              options={IDIOMAS}
            />
            <Dropdown
              label="Formato de fecha"
              value={preferencias.formatoFecha}
              onChange={(value) => setPreferencias({ ...preferencias, formatoFecha: value })}
              options={FORMATOS_FECHA}
            />
            <Dropdown
              label="Zona horaria"
              value={preferencias.zonaHoraria}
              onChange={(value) => setPreferencias({ ...preferencias, zonaHoraria: value })}
              options={ZONAS_HORARIAS}
              className="sm:col-span-2"
            />
          </div>

          <div className="flex items-start gap-2 text-xs text-gray-500">
            <Globe className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <span>Las preferencias se guardan en este dispositivo por ahora. La sincronización en la nube llegará en una fase posterior.</span>
          </div>
        </div>
      )}

      {/* ===== CUENTA ===== */}
      {tabActiva === 'cuenta' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200/60 p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Download className="w-4 h-4 text-[#0f766e]" />
              <h3 className="font-semibold text-gray-900">Exportar mis datos</h3>
            </div>
            <p className="text-sm text-gray-500">
              Descarga un archivo JSON con la información guardada en este dispositivo (preferencias,
              notificaciones y datos de sesión).
            </p>
            <Button
              variant="outline"
              icon={<Download className="w-4 h-4" />}
              onClick={exportarDatos}
            >
              Descargar mis datos
            </Button>
            {mensajeExport && (
              <div className="flex items-center gap-2 text-sm px-4 py-3 rounded-xl bg-emerald-50 text-emerald-700">
                <CheckCircle className="w-4 h-4" />
                {mensajeExport}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-red-200 p-6 space-y-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <h3 className="font-semibold text-gray-900">Zona de peligro</h3>
            </div>
            <p className="text-sm text-gray-500">
              Cerrar sesión en este dispositivo. Deberás volver a ingresar tus credenciales para acceder
              a tu cuenta.
            </p>
            <Button
              variant="danger"
              icon={<LogOut className="w-4 h-4" />}
              onClick={() => setMostrarLogout(true)}
            >
              Cerrar sesión
            </Button>
          </div>
        </div>
      )}

      {/* Modal de confirmación de cierre de sesión */}
      <Modal
        isOpen={mostrarLogout}
        onClose={() => setMostrarLogout(false)}
        title="Cerrar sesión"
        size="sm"
      >
        <div className="space-y-5">
          <p className="text-sm text-gray-600">
            ¿Seguro que deseas cerrar sesión? Tendrás que iniciar sesión nuevamente para acceder a tu
            cuenta.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setMostrarLogout(false)} disabled={cerrandoSesion}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              icon={<LogOut className="w-4 h-4" />}
              loading={cerrandoSesion}
              onClick={handleLogout}
            >
              Sí, cerrar sesión
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ConfiguracionPage;
