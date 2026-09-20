// front/src/pages/DashboardAdmin.jsx
// DASHBOARD DEL ADMINISTRADOR - CON COMPONENTES UI

import React, { useState, useEffect } from 'react';
import { 
  Users, Search, Loader2, AlertCircle, CheckCircle, XCircle,
  Plus, X, Save, Edit3, Key, Eye, EyeOff,
  BookOpen, FileText, ClipboardList, PenTool,
  MessageCircle, Award, FolderOpen, LayoutDashboard,
  DollarSign, Tag, Percent, Calendar, TrendingUp,
  Settings, Shield, Bell, Mail, CreditCard, Building
} from 'lucide-react';
import { 
  Button, Input, Modal, Badge, Tabs, Switch, Dropdown 
} from '../components/ui';
import { authService } from '../services/authService';
import { useFeedback } from '../hooks/useFeedback';

// =============================================
// COMPONENTE: TABS DE NAVEGACIÓN (usando Tabs UI)
// =============================================
const AdminTabs = ({ activeTab, onChange }) => {
  const tabs = [
    { id: 'usuarios', label: 'Usuarios', icon: <Users className="w-4 h-4" /> },
    { id: 'cursos', label: 'Cursos', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'pagos', label: 'Pagos', icon: <DollarSign className="w-4 h-4" /> },
    { id: 'promociones', label: 'Promociones', icon: <Tag className="w-4 h-4" /> },
    { id: 'configuracion', label: 'Configuración', icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <Tabs
      tabs={tabs}
      activeTab={activeTab}
      onChange={onChange}
      variant="default"
    />
  );
};

// =============================================
// COMPONENTE: GESTIÓN DE USUARIOS
// =============================================
const AdminUsuarios = () => {
  const { toast, confirmar } = useFeedback();
  const [usuarios, setUsuarios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [filtroRol, setFiltroRol] = useState('');
  const [mostrarModal, setMostrarModal] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [usuarioEditando, setUsuarioEditando] = useState(null);
  const [creando, setCreando] = useState(false);
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    nombres: '',
    apellidos: '',
    rol: 'estudiante',
    plan: 'basico'
  });

  const cargarUsuarios = async () => {
    setCargando(true);
    try {
      const data = await authService.listarUsuarios();
      setUsuarios(data?.usuarios || []);
    } catch (err) {
      setError(err.message || 'Error cargando usuarios');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { cargarUsuarios(); }, []);

  const handleCrearUsuario = async (e) => {
    e.preventDefault();
    setCreando(true);
    try {
      await authService.crearUsuario({
        ...formData,
        plan: formData.rol === 'estudiante' ? 'gratis' : formData.plan
      });
      setMostrarModal(false);
      resetFormulario();
      await cargarUsuarios();
    } catch (err) {
      toast.error(err.message || 'Error al crear usuario');
    } finally {
      setCreando(false);
    }
  };

  const handleActualizarUsuario = async (e) => {
    e.preventDefault();
    setCreando(true);
    try {
      const data = {};
      if (formData.nombres !== usuarioEditando.nombres) data.nombres = formData.nombres;
      if (formData.apellidos !== usuarioEditando.apellidos) data.apellidos = formData.apellidos;
      if (formData.rol !== usuarioEditando.rol) data.rol = formData.rol;
      if (formData.plan !== usuarioEditando.plan) data.plan = formData.plan;
      if (formData.password) data.password = formData.password;
      
      if (Object.keys(data).length > 0) {
        await authService.actualizarUsuario(usuarioEditando.id, data);
        await cargarUsuarios();
      }
      setMostrarModal(false);
      resetFormulario();
    } catch (err) {
      toast.error(err.message || 'Error al actualizar usuario');
    } finally {
      setCreando(false);
    }
  };

  const handleEliminarUsuario = async (id) => {
    const ok = await confirmar({
      titulo: 'Desactivar usuario',
      mensaje: '¿Desactivar este usuario?',
      confirmText: 'Desactivar',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await authService.eliminarUsuario(id);
      await cargarUsuarios();
    } catch {
      toast.error('Error al desactivar usuario');
    }
  };

  const handleResetearPassword = async (user) => {
    const newPassword = await confirmar({
      titulo: 'Restablecer contraseña',
      mensaje: `Nueva contraseña para ${user.email}:`,
      confirmText: 'Actualizar',
      input: { placeholder: 'Mínimo 6 caracteres', label: 'Nueva contraseña' },
    });
    if (newPassword === null) return;
    if (!newPassword || newPassword.length < 6) {
      toast.warning('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    try {
      await authService.actualizarUsuario(user.id, { password: newPassword });
      toast.success('Contraseña actualizada correctamente');
    } catch {
      toast.error('Error al actualizar contraseña');
    }
  };

  const resetFormulario = () => {
    setFormData({ email: '', password: '', nombres: '', apellidos: '', rol: 'estudiante', plan: 'basico' });
    setUsuarioEditando(null);
    setModoEdicion(false);
    setMostrarPassword(false);
  };

  const usuariosFiltrados = usuarios.filter(u => {
    const matchBusqueda = 
      (u.nombres || '').toLowerCase().includes(busqueda.toLowerCase()) ||
      (u.apellidos || '').toLowerCase().includes(busqueda.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(busqueda.toLowerCase());
    const matchRol = filtroRol ? u.rol === filtroRol : true;
    return matchBusqueda && matchRol;
  });

  const stats = {
    total: usuarios.length,
    admin: usuarios.filter(u => u.rol === 'admin').length,
    docente: usuarios.filter(u => u.rol === 'docente').length,
    estudiante: usuarios.filter(u => u.rol === 'estudiante').length,
  };

  const planes = {
    gratis: { label: 'Gratis', variant: 'default' },
    basico: { label: 'Básico', variant: 'info' },
    profesional: { label: 'Profesional', variant: 'primary' },
    institucional: { label: 'Institucional', variant: 'warning' }
  };

  const rolesOptions = [
    { value: 'estudiante', label: 'Estudiante' },
    { value: 'docente', label: 'Docente' },
    { value: 'admin', label: 'Admin' },
  ];

  const planOptions = [
    { value: 'gratis', label: 'Gratis' },
    { value: 'basico', label: 'Básico (S/.29/mes)' },
    { value: 'profesional', label: 'Profesional (S/.79/mes)' },
    { value: 'institucional', label: 'Institucional (S/.199/mes)' },
  ];

  return (
    <div>
      {/* Stats con Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          <Badge variant="default">Total usuarios</Badge>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-2xl font-bold text-purple-600">{stats.admin}</p>
          <Badge variant="primary">Administradores</Badge>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-2xl font-bold text-blue-600">{stats.docente}</p>
          <Badge variant="info">Docentes</Badge>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-2xl font-bold text-gray-600">{stats.estudiante}</p>
          <Badge variant="default">Estudiantes</Badge>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar usuarios..."
            icon={<Search className="w-4 h-4" />}
            size="sm"
          />
        </div>
        <Dropdown
          options={[
            { value: '', label: 'Todos los roles' },
            { value: 'admin', label: 'Admin' },
            { value: 'docente', label: 'Docente' },
            { value: 'estudiante', label: 'Estudiante' },
          ]}
          value={filtroRol}
          onChange={setFiltroRol}
          placeholder="Filtrar por rol"
          size="sm"
          className="w-full sm:w-auto sm:min-w-[180px]"
        />
        <Button
          variant="primary"
          size="sm"
          onClick={() => { resetFormulario(); setMostrarModal(true); }}
        >
          <Plus className="w-4 h-4 mr-1" />
          Nuevo usuario
        </Button>
      </div>

      {/* Tabla */}
      {cargando ? (
        <div className="text-center py-12">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-gray-400" />
        </div>
      ) : error ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <p className="text-sm text-red-500">{error}</p>
          <Button variant="secondary" size="sm" onClick={cargarUsuarios} className="mt-3">
            Reintentar
          </Button>
        </div>
      ) : usuariosFiltrados.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">No hay usuarios registrados</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usuario</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rol</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plan</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {usuariosFiltrados.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-medium text-gray-600">
                            {u.nombres?.charAt(0) || u.email?.charAt(0) || 'U'}
                          </span>
                        </div>
                        <span className="font-medium text-gray-800">
                          {u.nombres ? `${u.nombres} ${u.apellidos || ''}` : u.email}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{u.email}</td>
                    <td className="px-4 py-3">
                      <Badge variant={
                        u.rol === 'admin' ? 'primary' :
                        u.rol === 'docente' ? 'info' : 'default'
                      }>
                        {u.rol || 'estudiante'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={planes[u.plan]?.variant || 'default'}>
                        {planes[u.plan]?.label || 'Gratis'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {u.activo !== false ? (
                        <Badge variant="success">Activo</Badge>
                      ) : (
                        <Badge variant="danger">Inactivo</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => { setUsuarioEditando(u); setFormData({...u, password: ''}); setModoEdicion(true); setMostrarModal(true); }}
                          className="p-1 text-gray-400 hover:text-blue-600"
                        >
                          <Edit3 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleResetearPassword(u)}
                          className="p-1 text-gray-400 hover:text-amber-600"
                        >
                          <Key className="w-4 h-4" />
                        </Button>
                        {u.email !== 'admin@zenthacademy.com' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEliminarUsuario(u.id)}
                            className="p-1 text-gray-400 hover:text-red-500"
                          >
                            <XCircle className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal usando componente Modal UI */}
      <Modal
        isOpen={mostrarModal}
        onClose={() => { setMostrarModal(false); resetFormulario(); }}
        title={modoEdicion ? 'Editar usuario' : 'Nuevo usuario'}
        size="md"
      >
        <form onSubmit={modoEdicion ? handleActualizarUsuario : handleCrearUsuario} className="space-y-4">
          <Input
            label="Correo electrónico"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            disabled={modoEdicion}
            required={!modoEdicion}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {modoEdicion ? 'Nueva contraseña (opcional)' : 'Contraseña *'}
            </label>
            <div className="relative">
              <Input
                type={mostrarPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                minLength="6"
                required={!modoEdicion}
              />
              <button
                type="button"
                onClick={() => setMostrarPassword(!mostrarPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {mostrarPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1">Mínimo 6 caracteres</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Nombres"
              value={formData.nombres}
              onChange={(e) => setFormData({ ...formData, nombres: e.target.value })}
            />
            <Input
              label="Apellidos"
              value={formData.apellidos}
              onChange={(e) => setFormData({ ...formData, apellidos: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rol *</label>
              <Dropdown
                options={rolesOptions}
                value={formData.rol}
                onChange={(val) => setFormData({ ...formData, rol: val })}
                placeholder="Seleccionar rol"
                size="md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Plan</label>
              <Dropdown
                options={planOptions}
                value={formData.plan}
                onChange={(val) => setFormData({ ...formData, plan: val })}
                placeholder="Seleccionar plan"
                size="md"
                disabled={formData.rol === 'estudiante'}
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
            <Button
              variant="outline"
              onClick={() => { setMostrarModal(false); resetFormulario(); }}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              type="submit"
              loading={creando}
            >
              {creando ? 'Guardando...' : modoEdicion ? 'Actualizar' : 'Crear usuario'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

// =============================================
// COMPONENTE: GESTIÓN DE PAGOS
// =============================================
const AdminPagos = () => {
  // ✅ NOTA: no existe un backend de pagos. El cobro real se gestiona mediante
  // las SOLICITUDES DE ACCESO a cursos de pago (con método y referencia de pago).
  // Antes este módulo mostraba pagos y estadísticas INVENTADOS.
  const pagos = [];

  if (pagos.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200/60 p-10 text-center">
        <div className="w-14 h-14 rounded-2xl bg-[#e6f4f2] flex items-center justify-center mx-auto mb-4">
          <CreditCard className="w-7 h-7 text-[#0f766e]" />
        </div>
        <h3 className="text-base font-semibold text-gray-800">Sin pagos registrados</h3>
        <p className="text-sm text-gray-500 mt-1.5 max-w-md mx-auto">
          Los cobros se gestionan desde las <strong>solicitudes de acceso</strong> a cursos
          de pago (el estudiante indica su método y referencia de pago, y el docente aprueba).
        </p>
      </div>
    );
  }

  return null;
};

// =============================================
// COMPONENTE: PROMOCIONES
// =============================================
const AdminPromociones = () => {
  // ✅ NOTA: no existe backend de promociones/cupones.
  // Antes este módulo mostraba promociones INVENTADAS (ZENTHACADEMY2024, 2X1CURSOS).
  return (
    <div className="bg-white rounded-2xl border border-gray-200/60 p-10 text-center">
      <div className="w-14 h-14 rounded-2xl bg-[#e6f4f2] flex items-center justify-center mx-auto mb-4">
        <Tag className="w-7 h-7 text-[#0f766e]" />
      </div>
      <h3 className="text-base font-semibold text-gray-800">Sin promociones</h3>
      <p className="text-sm text-gray-500 mt-1.5 max-w-md mx-auto">
        El sistema de cupones y descuentos aún no está disponible.
      </p>
    </div>
  );
};

// =============================================
// COMPONENTE: CONFIGURACIÓN
// =============================================
const AdminConfiguracion = () => {
  const { toast } = useFeedback();
  const [config, setConfig] = useState({
    nombre_plataforma: 'Zenth Academy',
    email_contacto: 'admin@zenthacademy.com',
    moneda: 'PEN',
    comision_porcentaje: 10,
    mantenimiento: false,
    registro_abierto: true
  });

  const handleSave = () => {
    // ✅ NOTA: aún no existe endpoint de configuración global de la plataforma.
    // Se avisa al usuario en vez de simular un guardado exitoso.
    toast.warning('La configuración global estará disponible próximamente.');
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-sm font-medium text-gray-900 mb-4">Configuración general</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Nombre de la plataforma"
            value={config.nombre_plataforma}
            onChange={(e) => setConfig({...config, nombre_plataforma: e.target.value})}
          />
          <Input
            label="Email de contacto"
            type="email"
            value={config.email_contacto}
            onChange={(e) => setConfig({...config, email_contacto: e.target.value})}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Moneda</label>
            <Dropdown
              options={[
                { value: 'PEN', label: 'PEN (S/.)' },
                { value: 'USD', label: 'USD ($)' },
                { value: 'EUR', label: 'EUR (€)' },
              ]}
              value={config.moneda}
              onChange={(val) => setConfig({...config, moneda: val})}
              placeholder="Seleccionar moneda"
            />
          </div>
          <Input
            label="Comisión por curso (%)"
            type="number"
            value={config.comision_porcentaje}
            onChange={(e) => setConfig({...config, comision_porcentaje: parseInt(e.target.value)})}
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-sm font-medium text-gray-900 mb-4">Estado del sistema</h3>
        <div className="space-y-3">
          <Switch
            checked={config.mantenimiento}
            onChange={(checked) => setConfig({...config, mantenimiento: checked})}
            label="Modo mantenimiento (solo administradores pueden acceder)"
          />
          <Switch
            checked={config.registro_abierto}
            onChange={(checked) => setConfig({...config, registro_abierto: checked})}
            label="Registro abierto (cualquier persona puede registrarse)"
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button variant="primary" onClick={handleSave}>
          <Save className="w-4 h-4 mr-1" />
          Guardar configuración
        </Button>
      </div>
    </div>
  );
};

// =============================================
// COMPONENTE PRINCIPAL
// =============================================
const DashboardAdmin = () => {
  const [activeTab, setActiveTab] = useState('usuarios');

  const renderContent = () => {
    switch (activeTab) {
      case 'usuarios':
        return <AdminUsuarios />;
      case 'cursos':
        return <div className="text-center py-12 text-gray-500">Gestión de cursos (próximamente)</div>;
      case 'pagos':
        return <AdminPagos />;
      case 'promociones':
        return <AdminPromociones />;
      case 'configuracion':
        return <AdminConfiguracion />;
      default:
        return null;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight flex items-center gap-2">
            <LayoutDashboard className="w-6 h-6 text-gray-400" />
            Panel de Administración
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Gestiona usuarios, pagos, promociones y configuración del sistema
          </p>
        </div>
        <div className="flex items-center gap-3 text-sm text-gray-500">
          <Badge variant="primary">1,234 usuarios</Badge>
          <Badge variant="info">45 cursos</Badge>
          <Badge variant="success">S/. 2,847 ingresos</Badge>
        </div>
      </div>

      {/* Tabs con componente UI */}
      <AdminTabs activeTab={activeTab} onChange={setActiveTab} />

      {/* Contenido */}
      {renderContent()}
    </div>
  );
};

export default DashboardAdmin;