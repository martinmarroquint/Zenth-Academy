// front/src/App.jsx
// APP CON LAYOUT PRINCIPAL COMPARTIDO Y RUTAS ANIDADAS POR ROL
// ✅ ACTUALIZADO: Home unificado (Login + QR) como página principal
// ✅ AGREGADO: Ruta para UI Demo (/ui-demo) - ACCESO PÚBLICO
// ✅ AGREGADO: Ruta para solicitud de docente

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import Registro from './pages/Registro';
import UiDemo from './pages/UiDemo';
import ExamenPublicoPage from './pages/ExamenPublicoPage';
import SolicitarDocente from './pages/SolicitarDocente';
import AdminSolicitudesDocente from './pages/AdminSolicitudesDocente';
import MainLayout from './components/layout/MainLayout';
import ProtectedRoute from './components/layout/ProtectedRoute';
import { authService } from './services/authService';

// =============================================
// DASHBOARDS PRINCIPALES
// =============================================
import DashboardAdmin from './pages/DashboardAdmin';
import GeographicAnalytics from './components/admin/GeographicAnalytics';

// =============================================
// MÓDULOS (se renderizan dentro del MainLayout)
// =============================================
import PanelAdminExamenes from './components/examenes/PanelAdminExamenes';
import PanelAlumnos from './components/alumnos/PanelAlumnos';
import CursosPage from './pages/modulos/CursosPage';
import PizarrasPage from './pages/modulos/PizarrasPage';
import ForoPage from './pages/modulos/ForoPage';
import CertificadosPage from './pages/modulos/CertificadosPage';
import ConfiguracionPage from './pages/modulos/ConfiguracionPage';
import MaterialesPage from './pages/modulos/MaterialesPage';
import EstudianteCursos from './pages/EstudianteCursos';
import EstudianteCursoDetalle from './pages/EstudianteCursoDetalle';
import EstudianteCertificados from './pages/EstudianteCertificados';
import CompartirSala from './pages/CompartirSala';
import PanelSolicitudes from './components/docente/PanelSolicitudes';

// =============================================
// RUTAS DE MÓDULOS COMPARTIDAS POR TODOS LOS ROLES
// =============================================
const rutasModulos = (
  <>
    <Route path="examenes" element={<PanelAdminExamenes />} />
    <Route path="cursos" element={<CursosPage />} />
    <Route path="alumnos" element={<PanelAlumnos />} />
    <Route path="materiales" element={<MaterialesPage />} />
    <Route path="pizarra" element={<PizarrasPage />} />
    <Route path="foro" element={<ForoPage />} />
    <Route path="certificados" element={<CertificadosPage />} />
    <Route path="solicitudes" element={<PanelSolicitudes />} />
    <Route path="configuracion" element={<ConfiguracionPage />} />
  </>
);

function App() {
  return (
    <BrowserRouter>
      <Routes>
            {/* PAGINA PRINCIPAL UNIFICADA (Login + QR) */}
            {/* Como WhatsApp Web: login a la izquierda, QR a la derecha */}
        <Route path="/" element={<Home />} />

            {/* UI DEMO - PAGINA DE DEMOSTRACION DE COMPONENTES */}
            {/* ACCESO PUBLICO - PARA DESARROLLO Y REVISION */}
        <Route path="/ui-demo" element={<UiDemo />} />

        {/* =============================================
            RUTAS PÚBLICAS (independientes)
        ============================================= */}
        <Route path="/login" element={<Login />} />
        <Route path="/registro" element={<Registro />} />
        <Route path="/solicitar-docente" element={<SolicitarDocente />} />

        {/* =============================================
            COMPARTIR EN CLASE — PANTALLA DEL AULA (PÚBLICO, sin login)
            El QR SIEMPRE visible aquí (como WhatsApp Web)
        ============================================= */}
        <Route path="/compartir/:codigo" element={<CompartirSala />} />

        {/* =============================================
            EXAMEN PUBLICO — SIN LOGIN (acceso con codigo)
        ============================================= */}
        <Route path="/examen/:codigo" element={<ExamenPublicoPage />} />

        {/* =============================================
            PANEL DE ADMINISTRACIÓN
        ============================================= */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardAdmin />} />
          <Route path="solicitudes-docente" element={<AdminSolicitudesDocente />} />
          <Route path="analytics-geografico" element={<GeographicAnalytics />} />
          {rutasModulos}
        </Route>

        {/* =============================================
            PANEL DEL DOCENTE
            PRIMERA PANTALLA: MIS CURSOS
        ============================================= */}
        <Route
          path="/docente"
          element={
            <ProtectedRoute allowedRoles={['admin', 'docente']}>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<CursosPage />} />
          {rutasModulos}
        </Route>

        {/* =============================================
            PANEL DEL ESTUDIANTE
            PRIMERA PANTALLA: MIS CURSOS
        ============================================= */}
        <Route
          path="/estudiante"
          element={
            <ProtectedRoute allowedRoles={['estudiante']}>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<EstudianteCursos />} />
          <Route path="cursos" element={<EstudianteCursos />} />
          <Route path="cursos/:id" element={<EstudianteCursoDetalle />} />
          <Route path="foro" element={<ForoPage />} />
          <Route path="certificados" element={<EstudianteCertificados />} />
          <Route path="configuracion" element={<ConfiguracionPage />} />
        </Route>

        {/* =============================================
            REDIRECCIÓN RAÍZ SEGÚN ROL (si accede a /dashboard)
        ============================================= */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <RedirectByRol />
            </ProtectedRoute>
          }
        />

        {/* 404 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

// Componente para redirigir según rol
const RedirectByRol = () => {
  const rol = authService.getRol();
  if (rol === 'admin') return <Navigate to="/admin" replace />;
  if (rol === 'docente') return <Navigate to="/docente" replace />;
  return <Navigate to="/estudiante" replace />;
};

export default App;