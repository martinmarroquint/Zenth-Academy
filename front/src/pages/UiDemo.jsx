// src/pages/UiDemo.jsx
// PÁGINA DE DEMOSTRACIÓN DE COMPONENTES UI

import React, { useState } from 'react';
import {
  Dropdown,
  DatePicker,
  Switch,
  Button,
  Modal,
  Badge,
  Input,
  Tabs,
  Tooltip
} from '../components/ui';
import {
  User, Mail, Lock, Search, Plus, Save, X,
  ChevronDown, Calendar, Star, Heart, Bell,
  Settings, Home, Users, BookOpen
} from 'lucide-react';

const UiDemo = () => {
  // Estados para los componentes
  const [dropdownValue, setDropdownValue] = useState('');
  const [dropdownValue2, setDropdownValue2] = useState('opcion1');
  const [dateValue, setDateValue] = useState('');
  const [dateValue2, setDateValue2] = useState('2024-12-25');
  const [switchValue, setSwitchValue] = useState(false);
  const [switchValue2, setSwitchValue2] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalSize, setModalSize] = useState('md');
  const [inputValue, setInputValue] = useState('');
  const [inputPassword, setInputPassword] = useState('');
  const [activeTab, setActiveTab] = useState('tab1');
  const [loading, setLoading] = useState(false);

  // Opciones para dropdowns
  const opciones = [
    { value: 'opcion1', label: 'Opción 1' },
    { value: 'opcion2', label: 'Opción 2' },
    { value: 'opcion3', label: 'Opción 3' },
    { value: 'opcion4', label: 'Opción 4' },
    { value: 'opcion5', label: 'Opción 5' },
  ];

  const opcionesConIconos = [
    { value: 'usuario', label: '👤 Usuario' },
    { value: 'admin', label: '👑 Administrador' },
    { value: 'docente', label: '📚 Docente' },
    { value: 'estudiante', label: '🎓 Estudiante' },
  ];

  const opcionesPaises = [
    { value: 'pe', label: '🇵🇪 Perú' },
    { value: 'mx', label: '🇲🇽 México' },
    { value: 'ar', label: '🇦🇷 Argentina' },
    { value: 'cl', label: '🇨🇱 Chile' },
    { value: 'co', label: '🇨🇴 Colombia' },
    { value: 'es', label: '🇪🇸 España' },
  ];

  // Tabs para demostración
  const tabs = [
    { id: 'tab1', label: 'Tab 1', icon: <Home className="w-4 h-4" /> },
    { id: 'tab2', label: 'Tab 2', icon: <Users className="w-4 h-4" />, badge: 3 },
    { id: 'tab3', label: 'Tab 3', icon: <Settings className="w-4 h-4" /> },
  ];

  const handleModalOpen = (size) => {
    setModalSize(size);
    setModalOpen(true);
  };

  const handleSimularCarga = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">🎨 Sistema de Componentes UI</h1>
          <p className="text-sm text-gray-500 mt-1">
            Demostración de todos los componentes disponibles en la aplicación
          </p>
        </div>

        {/* ============================================================ */}
        {/* SECCIÓN 1: DROPDOWNS */}
        {/* ============================================================ */}
        <section className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <ChevronDown className="w-5 h-5 text-[#0f766e]" />
            Dropdowns
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Dropdown básico */}
            <div>
              <h3 className="text-xs font-medium text-gray-500 mb-2">Básico</h3>
              <Dropdown
                options={opciones}
                value={dropdownValue}
                onChange={setDropdownValue}
                placeholder="Selecciona una opción..."
                label="Opción"
              />
              <p className="text-xs text-gray-400 mt-1">
                Valor seleccionado: {dropdownValue || 'ninguno'}
              </p>
            </div>

            {/* Dropdown con búsqueda */}
            <div>
              <h3 className="text-xs font-medium text-gray-500 mb-2">Con búsqueda</h3>
              <Dropdown
                options={opcionesPaises}
                value={dropdownValue2}
                onChange={setDropdownValue2}
                placeholder="Buscar país..."
                label="País"
                searchable
                clearable
              />
              <p className="text-xs text-gray-400 mt-1">
                Seleccionado: {dropdownValue2 || 'ninguno'}
              </p>
            </div>

            {/* Dropdown con opciones con iconos */}
            <div>
              <h3 className="text-xs font-medium text-gray-500 mb-2">Con iconos</h3>
              <Dropdown
                options={opcionesConIconos}
                value={dropdownValue}
                onChange={setDropdownValue}
                placeholder="Selecciona un rol..."
                label="Rol"
                searchable
              />
            </div>

            {/* Dropdown deshabilitado */}
            <div>
              <h3 className="text-xs font-medium text-gray-500 mb-2">Deshabilitado</h3>
              <Dropdown
                options={opciones}
                value="opcion1"
                onChange={() => {}}
                placeholder="Deshabilitado"
                label="No editable"
                disabled
              />
            </div>

            {/* Dropdown con error */}
            <div>
              <h3 className="text-xs font-medium text-gray-500 mb-2">Con error</h3>
              <Dropdown
                options={opciones}
                value=""
                onChange={() => {}}
                placeholder="Selecciona..."
                label="Campo requerido"
                error="Este campo es obligatorio"
              />
            </div>

            {/* Dropdown tamaño pequeño */}
            <div>
              <h3 className="text-xs font-medium text-gray-500 mb-2">Tamaño pequeño</h3>
              <Dropdown
                options={opciones}
                value={dropdownValue}
                onChange={setDropdownValue}
                placeholder="Pequeño"
                label="Tamaño sm"
                size="sm"
              />
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/* SECCIÓN 2: DATE PICKER */}
        {/* ============================================================ */}
        <section className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#0f766e]" />
            Date Picker
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* DatePicker básico */}
            <div>
              <h3 className="text-xs font-medium text-gray-500 mb-2">Básico</h3>
              <DatePicker
                value={dateValue}
                onChange={setDateValue}
                label="Fecha de nacimiento"
                placeholder="Seleccionar fecha..."
              />
              <p className="text-xs text-gray-400 mt-1">
                Fecha: {dateValue || 'ninguna'}
              </p>
            </div>

            {/* DatePicker con fecha predefinida */}
            <div>
              <h3 className="text-xs font-medium text-gray-500 mb-2">Con fecha predefinida</h3>
              <DatePicker
                value={dateValue2}
                onChange={setDateValue2}
                label="Fecha de inicio"
                placeholder="Seleccionar fecha..."
              />
              <p className="text-xs text-gray-400 mt-1">
                Fecha: {dateValue2 || 'ninguna'}
              </p>
            </div>

            {/* DatePicker con restricciones */}
            <div>
              <h3 className="text-xs font-medium text-gray-500 mb-2">Con restricciones</h3>
              <DatePicker
                value={dateValue}
                onChange={setDateValue}
                label="Fecha (solo futuro)"
                placeholder="Seleccionar fecha..."
                minDate={new Date().toISOString().split('T')[0]}
              />
              <p className="text-xs text-gray-400 mt-1">
                Solo fechas futuras
              </p>
            </div>

            {/* DatePicker deshabilitado */}
            <div>
              <h3 className="text-xs font-medium text-gray-500 mb-2">Deshabilitado</h3>
              <DatePicker
                value="2024-12-25"
                onChange={() => {}}
                label="Fecha fija"
                placeholder="Deshabilitado"
                disabled
              />
            </div>

            {/* DatePicker con error */}
            <div>
              <h3 className="text-xs font-medium text-gray-500 mb-2">Con error</h3>
              <DatePicker
                value={dateValue}
                onChange={setDateValue}
                label="Fecha requerida"
                placeholder="Seleccionar..."
                error="La fecha es obligatoria"
              />
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/* SECCIÓN 3: INPUTS */}
        {/* ============================================================ */}
        <section className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Mail className="w-5 h-5 text-[#0f766e]" />
            Inputs
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Input básico */}
            <div>
              <h3 className="text-xs font-medium text-gray-500 mb-2">Básico</h3>
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                label="Nombre"
                placeholder="Ingresa tu nombre..."
              />
            </div>

            {/* Input con icono */}
            <div>
              <h3 className="text-xs font-medium text-gray-500 mb-2">Con icono</h3>
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                label="Correo electrónico"
                placeholder="ejemplo@correo.com"
                icon={<Mail className="w-4 h-4" />}
              />
            </div>

            {/* Input con limpieza */}
            <div>
              <h3 className="text-xs font-medium text-gray-500 mb-2">Con limpieza</h3>
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onClear={() => setInputValue('')}
                label="Buscador"
                placeholder="Escribe para buscar..."
                icon={<Search className="w-4 h-4" />}
                clearable
              />
            </div>

            {/* Input de contraseña */}
            <div>
              <h3 className="text-xs font-medium text-gray-500 mb-2">Contraseña</h3>
              <Input
                type="password"
                value={inputPassword}
                onChange={(e) => setInputPassword(e.target.value)}
                label="Contraseña"
                placeholder="Ingresa tu contraseña..."
                icon={<Lock className="w-4 h-4" />}
              />
            </div>

            {/* Input con error */}
            <div>
              <h3 className="text-xs font-medium text-gray-500 mb-2">Con error</h3>
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                label="Campo requerido"
                placeholder="Escribe algo..."
                error="Este campo es obligatorio"
              />
            </div>

            {/* Input deshabilitado */}
            <div>
              <h3 className="text-xs font-medium text-gray-500 mb-2">Deshabilitado</h3>
              <Input
                value="Valor fijo"
                onChange={() => {}}
                label="Campo bloqueado"
                placeholder="No editable"
                disabled
              />
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/* SECCIÓN 4: BADGES */}
        {/* ============================================================ */}
        <section className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Star className="w-5 h-5 text-[#0f766e]" />
            Badges
          </h2>

          <div className="flex flex-wrap items-center gap-4">
            <Badge variant="default">Default</Badge>
            <Badge variant="primary">Primary</Badge>
            <Badge variant="success">Success</Badge>
            <Badge variant="warning">Warning</Badge>
            <Badge variant="danger">Danger</Badge>
            <Badge variant="info">Info</Badge>
          </div>

          <div className="flex flex-wrap items-center gap-4 mt-4">
            <Badge size="sm">Pequeño</Badge>
            <Badge size="md">Mediano</Badge>
            <Badge variant="primary" className="px-4 py-1.5 text-sm rounded-lg">
              Personalizado
            </Badge>
          </div>
        </section>

        {/* ============================================================ */}
        {/* SECCIÓN 5: SWITCHES */}
        {/* ============================================================ */}
        <section className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Heart className="w-5 h-5 text-[#0f766e]" />
            Switches
          </h2>

          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-8">
              <Switch
                checked={switchValue}
                onChange={setSwitchValue}
                label="Switch pequeño"
                size="sm"
              />
              <Switch
                checked={switchValue2}
                onChange={setSwitchValue2}
                label="Switch mediano (default)"
                size="md"
              />
              <Switch
                checked={switchValue}
                onChange={setSwitchValue}
                label="Switch grande"
                size="lg"
              />
            </div>

            <div className="flex flex-wrap items-center gap-8">
              <Switch
                checked={true}
                onChange={() => {}}
                label="Activado"
                disabled
              />
              <Switch
                checked={false}
                onChange={() => {}}
                label="Desactivado"
                disabled
              />
            </div>

            <p className="text-xs text-gray-400">
              Estado del switch: {switchValue ? '✅ Activado' : '⭕ Desactivado'}
            </p>
          </div>
        </section>

        {/* ============================================================ */}
        {/* SECCIÓN 6: TABS */}
        {/* ============================================================ */}
        <section className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Settings className="w-5 h-5 text-[#0f766e]" />
            Tabs
          </h2>

          <div className="space-y-6">
            {/* Tabs default */}
            <div>
              <h3 className="text-xs font-medium text-gray-500 mb-2">Default</h3>
              <Tabs
                tabs={tabs}
                activeTab={activeTab}
                onChange={setActiveTab}
                variant="default"
              />
              <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-100">
                <p className="text-sm text-gray-600">
                  Contenido de la {tabs.find(t => t.id === activeTab)?.label || 'tab'}
                </p>
              </div>
            </div>

            {/* Tabs pills */}
            <div>
              <h3 className="text-xs font-medium text-gray-500 mb-2">Pills</h3>
              <Tabs
                tabs={tabs}
                activeTab={activeTab}
                onChange={setActiveTab}
                variant="pills"
              />
            </div>

            {/* Tabs underlined */}
            <div>
              <h3 className="text-xs font-medium text-gray-500 mb-2">Underlined</h3>
              <Tabs
                tabs={tabs}
                activeTab={activeTab}
                onChange={setActiveTab}
                variant="underlined"
              />
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/* SECCIÓN 7: BUTTONS */}
        {/* ============================================================ */}
        <section className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Plus className="w-5 h-5 text-[#0f766e]" />
            Botones
          </h2>

          <div className="space-y-6">
            {/* Variantes */}
            <div>
              <h3 className="text-xs font-medium text-gray-500 mb-3">Variantes</h3>
              <div className="flex flex-wrap gap-3">
                <Button variant="primary">Primary</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="danger">Danger</Button>
                <Button variant="success">Success</Button>
              </div>
            </div>

            {/* Tamaños */}
            <div>
              <h3 className="text-xs font-medium text-gray-500 mb-3">Tamaños</h3>
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="primary" size="sm">Pequeño</Button>
                <Button variant="primary" size="md">Mediano</Button>
                <Button variant="primary" size="lg">Grande</Button>
              </div>
            </div>

            {/* Con iconos */}
            <div>
              <h3 className="text-xs font-medium text-gray-500 mb-3">Con iconos</h3>
              <div className="flex flex-wrap gap-3">
                <Button variant="primary" icon={<Plus className="w-4 h-4" />}>
                  Agregar
                </Button>
                <Button variant="success" icon={<Save className="w-4 h-4" />}>
                  Guardar
                </Button>
                <Button variant="danger" icon={<X className="w-4 h-4" />}>
                  Eliminar
                </Button>
                <Button 
                  variant="primary" 
                  icon={<Search className="w-4 h-4" />} 
                  iconPosition="right"
                >
                  Buscar
                </Button>
              </div>
            </div>

            {/* Estados */}
            <div>
              <h3 className="text-xs font-medium text-gray-500 mb-3">Estados</h3>
              <div className="flex flex-wrap gap-3">
                <Button variant="primary" loading>
                  Cargando...
                </Button>
                <Button variant="primary" disabled>
                  Deshabilitado
                </Button>
                <Button variant="primary" fullWidth>
                  Ancho completo
                </Button>
              </div>
            </div>

            {/* Acción */}
            <div>
              <Button variant="primary" onClick={handleSimularCarga} loading={loading}>
                {loading ? 'Cargando...' : 'Simular carga (2s)'}
              </Button>
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/* SECCIÓN 8: TOOLTIP */}
        {/* ============================================================ */}
        <section className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Bell className="w-5 h-5 text-[#0f766e]" />
            Tooltips
          </h2>

          <div className="flex flex-wrap items-center gap-6">
            <Tooltip content="Tooltip arriba" position="top">
              <Button variant="outline">Arriba</Button>
            </Tooltip>

            <Tooltip content="Tooltip abajo" position="bottom">
              <Button variant="outline">Abajo</Button>
            </Tooltip>

            <Tooltip content="Tooltip izquierda" position="left">
              <Button variant="outline">Izquierda</Button>
            </Tooltip>

            <Tooltip content="Tooltip derecha" position="right">
              <Button variant="outline">Derecha</Button>
            </Tooltip>

            <Tooltip content="Este es un tooltip más largo con más texto" position="top">
              <Badge variant="primary" className="cursor-pointer">Hover me</Badge>
            </Tooltip>
          </div>
        </section>

        {/* ============================================================ */}
        {/* SECCIÓN 9: MODAL */}
        {/* ============================================================ */}
        <section className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-[#0f766e]" />
            Modales
          </h2>

          <div className="flex flex-wrap gap-3">
            <Button variant="primary" onClick={() => handleModalOpen('sm')}>
              Modal Pequeño
            </Button>
            <Button variant="primary" onClick={() => handleModalOpen('md')}>
              Modal Mediano
            </Button>
            <Button variant="primary" onClick={() => handleModalOpen('lg')}>
              Modal Grande
            </Button>
            <Button variant="primary" onClick={() => handleModalOpen('xl')}>
              Modal XL
            </Button>
            <Button variant="primary" onClick={() => handleModalOpen('full')}>
              Modal Full
            </Button>
          </div>

          {/* Modal */}
          <Modal
            isOpen={modalOpen}
            onClose={() => setModalOpen(false)}
            title={`Modal ${modalSize.toUpperCase()}`}
            size={modalSize}
          >
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Este es un modal de demostración con tamaño <strong>{modalSize}</strong>.
              </p>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                  <p className="text-xs text-gray-500">Dropdown dentro del modal</p>
                  <Dropdown
                    options={opciones}
                    value={dropdownValue}
                    onChange={setDropdownValue}
                    placeholder="Selecciona..."
                    size="sm"
                  />
                </div>
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                  <p className="text-xs text-gray-500">Switch dentro del modal</p>
                  <Switch
                    checked={switchValue}
                    onChange={setSwitchValue}
                    label="Activar"
                    size="sm"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <Button variant="outline" onClick={() => setModalOpen(false)}>
                  Cancelar
                </Button>
                <Button variant="primary" onClick={() => setModalOpen(false)}>
                  Aceptar
                </Button>
              </div>
            </div>
          </Modal>
        </section>

        {/* ============================================================ */}
        {/* FOOTER */}
        {/* ============================================================ */}
        <div className="text-center py-6 text-xs text-gray-400 border-t border-gray-200">
          <p>✅ Todos los componentes UI están disponibles y funcionando correctamente</p>
          <p className="mt-1">Color primario: <span className="inline-block w-3 h-3 rounded-full align-middle" style={{ backgroundColor: '#0f766e' }} /> #0f766e</p>
        </div>
      </div>
    </div>
  );
};

export default UiDemo;