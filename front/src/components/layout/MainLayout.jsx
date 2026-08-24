// front/src/components/layout/MainLayout.jsx
// LAYOUT PRINCIPAL - SIDEBAR FIJO CON BOTÓN FLOTANTE MODERNO

import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  Users, FileText, BookOpen, FolderOpen,
  PenTool, MessageCircle, Award, LogOut, ChevronLeft,
  ChevronRight, HelpCircle, LayoutDashboard, Send, Settings,
  Home, GraduationCap, Calendar, Bell, UserCircle, Menu, X,
  PanelLeftClose, PanelLeftOpen, GripVertical
} from 'lucide-react';
import { authService } from '../../services/authService';
import cursosService from '../../services/cursosService';

const ICONOS_NAV = {
  dashboard: LayoutDashboard,
  usuarios: Users,
  examenes: FileText,
  cursos: BookOpen,
  alumnos: Users,
  pizarra: PenTool,
  foro: MessageCircle,
  certificados: Award,
  carpeta: FolderOpen,
  solicitudes: Send,
  configuracion: Settings,
  home: Home,
  perfil: UserCircle,
  calendario: Calendar,
  progreso: GraduationCap,
};

const MENU_POR_ROL = {
  admin: [
    {
      seccion: 'CURSOS',
      items: [
        { id: 'usuarios', label: 'Usuarios', to: '', end: true },
        { id: 'cursos', label: 'Mis Cursos', to: 'cursos' },
        { id: 'solicitudes', label: 'Solicitudes', to: 'solicitudes' },
        { id: 'certificados', label: 'Certificados', to: 'certificados' },
      ],
    },
    {
      seccion: 'MATERIALES',
      items: [
        { id: 'carpeta', label: 'Mi carpeta', to: 'materiales' },
      ],
    },
    {
      seccion: 'HERRAMIENTAS',
      items: [
        { id: 'examenes', label: 'Exámenes', to: 'examenes' },
        { id: 'pizarra', label: 'Pizarra', to: 'pizarra' },
      ],
    },
    {
      seccion: 'COMUNIDAD',
      items: [
        { id: 'foro', label: 'Foro', to: 'foro' },
      ],
    },
    {
      seccion: 'CONFIGURACIÓN',
      items: [
        { id: 'configuracion', label: 'Configuración', to: 'configuracion' },
      ],
    },
  ],
  docente: [
    {
      seccion: 'CURSOS',
      items: [
        { id: 'cursos', label: 'Mis Cursos', to: '', end: true },
        { id: 'solicitudes', label: 'Solicitudes', to: 'solicitudes' },
        { id: 'certificados', label: 'Certificados', to: 'certificados' },
      ],
    },
    {
      seccion: 'MATERIALES',
      items: [
        { id: 'carpeta', label: 'Mi carpeta', to: 'materiales' },
      ],
    },
    {
      seccion: 'HERRAMIENTAS',
      items: [
        { id: 'examenes', label: 'Exámenes', to: 'examenes' },
        { id: 'pizarra', label: 'Pizarra', to: 'pizarra' },
      ],
    },
    {
      seccion: 'COMUNIDAD',
      items: [
        { id: 'foro', label: 'Foro', to: 'foro' },
      ],
    },
    {
      seccion: 'CONFIGURACIÓN',
      items: [
        { id: 'configuracion', label: 'Configuración', to: 'configuracion' },
      ],
    },
  ],
  estudiante: [
    {
      seccion: 'CURSOS',
      items: [
        { id: 'cursos', label: 'Mis Cursos', to: '', end: true },
        { id: 'certificados', label: 'Certificados', to: 'certificados' },
      ],
    },
    {
      seccion: 'COMUNIDAD',
      items: [
        { id: 'foro', label: 'Foro', to: 'foro' },
      ],
    },
    {
      seccion: 'CONFIGURACIÓN',
      items: [
        { id: 'configuracion', label: 'Configuración', to: 'configuracion' },
      ],
    },
  ],
};

const TITULOS = {
  admin: 'Panel de Administración',
  docente: 'Panel Docente',
  estudiante: 'Mi Panel',
};

const MainLayout = () => {
  const location = useLocation();
  const [sidebarAbierto, setSidebarAbierto] = useState(() => {
    const guardado = localStorage.getItem('sidebar_abierto');
    return guardado !== null ? JSON.parse(guardado) : true;
  });

  useEffect(() => {
    localStorage.setItem('sidebar_abierto', JSON.stringify(sidebarAbierto));
  }, [sidebarAbierto]);

  const [menuMovil, setMenuMovil] = useState(false);
  const [solicitudesPendientes, setSolicitudesPendientes] = useState(0);
  const [hoverExpand, setHoverExpand] = useState(false);

  useEffect(() => {
    setMenuMovil(false);
  }, [location.pathname]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (menuMovil) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [menuMovil]);
  
  let rol = 'estudiante';
  try {
    const userRol = authService.getRol();
    rol = (userRol === 'visitante' || !userRol) ? 'estudiante' : userRol;
  } catch (error) {
    console.error('Error obteniendo rol:', error);
    rol = 'estudiante';
  }
  
  const usuario = authService.getCurrentUser();
  const base = `/${rol}`;
  const secciones = MENU_POR_ROL[rol] || MENU_POR_ROL.estudiante;
  const items = secciones.flatMap((s) => s.items);
  
  const itemActivo = items.find((i) => {
    const path = `${base}${i.to ? '/' + i.to : ''}`;
    if (i.end) {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  });

  const isItemActive = (item) => {
    const path = `${base}${item.to ? '/' + item.to : ''}`;
    if (item.end) {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  useEffect(() => {
    const cargarSolicitudes = async () => {
      if (rol !== 'admin' && rol !== 'docente') return;
      try {
        const data = await cursosService.solicitudesPendientes();
        const pendientes = Array.isArray(data) 
          ? data.filter(s => s.estado === 'pendiente').length 
          : 0;
        setSolicitudesPendientes(pendientes);
      } catch (e) {
        console.error('Error cargando solicitudes pendientes:', e);
      }
    };

    cargarSolicitudes();
    const interval = setInterval(cargarSolicitudes, 60000);
    return () => clearInterval(interval);
  }, [rol]);

  const toggleSidebar = () => {
    setSidebarAbierto(!sidebarAbierto);
  };

  const handleLogout = () => {
    try {
      authService.logout();
      window.location.href = '/login';
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  const getIniciales = () => {
    if (!usuario) return 'U';
    const nombre = usuario.nombres || usuario.nombre || '';
    if (nombre) return nombre.charAt(0).toUpperCase();
    return 'U';
  };

  const getNombreUsuario = () => {
    if (!usuario) return 'Usuario';
    return usuario.nombres || usuario.nombre || 'Usuario';
  };

  // ✅ SIDEBAR FIJO - position: fixed
  const sidebarClasses = `
    bg-white border-r border-gray-200 flex flex-col flex-shrink-0 
    transition-all duration-300 ease-in-out
    fixed inset-y-0 left-0 z-40
    ${menuMovil ? 'w-64 translate-x-0 shadow-2xl' : 'w-64 -translate-x-full'}
    lg:translate-x-0 lg:shadow-none 
    ${sidebarAbierto ? 'lg:w-64' : 'lg:w-14'}
  `;

  // ✅ CONTENIDO CON MARGEN PARA EL SIDEBAR FIJO
  const contentMarginClass = `
    transition-all duration-300 ease-in-out
    ${sidebarAbierto ? 'lg:ml-64' : 'lg:ml-14'}
  `;

  return (
    <div className="bg-[#f8f9fa] min-h-screen">
      
      {/* Overlay móvil */}
      {menuMovil && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setMenuMovil(false)}
        />
      )}

      {/* ===================== SIDEBAR FIJO ===================== */}
      <aside className={sidebarClasses}>
        {/* Logo - Versión expandida */}
        {sidebarAbierto && (
          <div className="h-14 border-b border-gray-200 flex items-center px-3 flex-shrink-0">
            <div className="flex items-center gap-2 overflow-hidden min-w-0">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#0f766e' }}>
                <span className="text-white font-bold text-xs">CV</span>
              </div>
              <span className="font-bold text-gray-900 text-sm truncate">Zenth Academy</span>
            </div>
          </div>
        )}

        {/* Logo - Versión colapsada */}
        {!sidebarAbierto && (
          <div className="h-14 border-b border-gray-200 flex items-center justify-center flex-shrink-0">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#0f766e' }}>
              <span className="text-white font-bold text-xs">CV</span>
            </div>
          </div>
        )}

        {/* Navegación - Scrollable */}
        <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-1">
          {secciones.map((seccion) => (
            <div key={seccion.seccion}>
              {sidebarAbierto && (
                <div className="px-3 pt-3 pb-1">
                  <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                    {seccion.seccion}
                  </span>
                </div>
              )}
              {!sidebarAbierto && (
                <div className="h-5" />
              )}
              <div className="space-y-0.5">
                {seccion.items.map((item) => {
                  const Icon = ICONOS_NAV[item.id] || LayoutDashboard;
                  const esSolicitudes = item.id === 'solicitudes';
                  const tieneBadge = esSolicitudes && solicitudesPendientes > 0;
                  const isActive = isItemActive(item);

                  return (
                    <NavLink
                      key={item.id}
                      to={`${base}${item.to ? '/' + item.to : ''}`}
                      end={item.end}
                      className={({ isActive }) =>
                        `w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all relative ${
                          isActive
                            ? 'text-white shadow-sm'
                            : 'text-gray-600 hover:bg-gray-100'
                        } ${!sidebarAbierto && 'lg:justify-center'}`
                      }
                      style={({ isActive }) => isActive ? { backgroundColor: '#0f766e' } : {}}
                      title={!sidebarAbierto ? item.label : ''}
                    >
                      <Icon className="w-5 h-5 flex-shrink-0" />
                      {sidebarAbierto && (
                        <>
                          <span className="text-sm font-medium whitespace-nowrap">{item.label}</span>
                          {tieneBadge && (
                            <span className="ml-auto bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">
                              {solicitudesPendientes}
                            </span>
                          )}
                        </>
                      )}
                      {!sidebarAbierto && tieneBadge && (
                        <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                          {solicitudesPendientes}
                        </span>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer - Salir */}
        <div className="border-t border-gray-200 p-2 space-y-0.5 flex-shrink-0">
          <button
            onClick={handleLogout}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors min-h-[44px] ${
              !sidebarAbierto && 'lg:justify-center'
            }`}
            title={!sidebarAbierto ? 'Salir' : ''}
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {sidebarAbierto && <span className="text-sm font-medium">Salir</span>}
          </button>
        </div>

        {/* Botón flotante para colapsar/expandir */}
        <button
          onClick={toggleSidebar}
          className={`
            hidden lg:flex items-center justify-center
            fixed top-1/2 -translate-y-1/2 z-50
            w-8 h-8 rounded-full
            bg-white border-2 border-gray-200
            hover:border-[#0f766e]
            shadow-md hover:shadow-lg
            text-gray-500 hover:text-[#0f766e]
            transition-all duration-500 ease-in-out
            hover:scale-110 active:scale-90
            group
            ${sidebarAbierto 
              ? 'left-[248px]' 
              : 'left-[52px]'
            }
          `}
          title={sidebarAbierto ? 'Colapsar menú' : 'Expandir menú'}
        >
          <div className={`
            transition-transform duration-500 ease-in-out
            ${sidebarAbierto ? 'rotate-0' : 'rotate-180'}
          `}>
            <ChevronLeft className="w-4 h-4" />
          </div>

          <span className="
            absolute inset-0 rounded-full
            border-2 border-[#0f766e]/0
            group-hover:border-[#0f766e]/30
            transition-all duration-500
            scale-0 group-hover:scale-110
          " />
          
          <span className="
            absolute -bottom-9 left-1/2 -translate-x-1/2
            px-2.5 py-1 rounded-lg
            bg-gray-900 text-white text-[10px] font-medium
            opacity-0 group-hover:opacity-100
            transition-all duration-300
            whitespace-nowrap
            pointer-events-none
            shadow-lg
            translate-y-1 group-hover:translate-y-0
          ">
            {sidebarAbierto ? 'Colapsar' : 'Expandir'}
            <span className="
              absolute -top-1 left-1/2 -translate-x-1/2
              w-2 h-2 rotate-45
              bg-gray-900
            " />
          </span>
        </button>
      </aside>

      {/* ===================== CONTENIDO CON MARGEN ===================== */}
      <div className={`flex-1 flex flex-col bg-[#f8f9fa] min-h-screen ${contentMarginClass}`}>
        {/* Header - FIJO también */}
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between flex-shrink-0 h-14 sticky top-0 z-30">
          <div className="flex items-center gap-2 min-w-0">
            {/* Botón móvil */}
            <button
              onClick={() => setMenuMovil(true)}
              className="lg:hidden p-2.5 -ml-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            >
              <Menu className="w-5 h-5" />
            </button>

            <h1 className="text-sm font-semibold text-gray-900 truncate">
              {itemActivo?.label || TITULOS[rol] || 'Panel'}
            </h1>
          </div>
          
          <div className="flex items-center gap-3 flex-shrink-0">
            <span className="text-sm text-gray-500 hidden sm:inline">
              {getNombreUsuario()}
            </span>
            <div className="w-8 h-8 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center">
              <span className="text-sm font-medium text-gray-600">
                {getIniciales()}
              </span>
            </div>
          </div>
        </header>

        {/* Main content - con padding para compensar header fijo */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;