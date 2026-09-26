// front/src/App.jsx
// APP CON LAYOUT PRINCIPAL COMPARTIDO Y RUTAS ANIDADAS POR ROL
// ✅ ACTUALIZADO: Home unificado (Login + QR) como página principal
// ✅ AGREGADO: Ruta para UI Demo (/ui-demo) - ACCESO PÚBLICO
// ✅ AGREGADO: Ruta para solicitud de docente
// ✅ OPTIMIZADO: Code splitting con React.lazy + Suspense (reduce ~60-80% el bundle inicial)

import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// =============================================
// CARGA EAGER (crítico para el primer paint)
// =============================================
import MainLayout from './components/layout/MainLayout';
import ProtectedRoute from './components/layout/ProtectedRoute';
import { SolicitudesProvider } from './context/SolicitudesContext';
import { FeedbackProvider } from './context/FeedbackContext';
import { ModoProvider } from './context/ModoContext';
import { authService } from './services/authService';
import { Loader2 } from 'lucide-react';

// =============================================
// PÁGINAS PÚBLICAS (lazy)
// =============================================
const Home = lazy(() => import('./pages/Home'));
const Registro = lazy(() => import('./pages/Registro'));
const UiDemo = lazy(() => import('./pages/UiDemo'));
const ExamenPublicoPage = lazy(() => import('./pages/ExamenPublicoPage'));
const ValidarCertificado = lazy(() => import('./pages/ValidarCertificado'));
const ManualPage = lazy(() => import('./pages/ManualPage'));
const SolicitarDocente = lazy(() => import('./pages/SolicitarDocente'));
const AdminSolicitudesDocente = lazy(() => import('./pages/AdminSolicitudesDocente'));

// =============================================
// DASHBOARDS (lazy)
// =============================================
const DashboardAdmin = lazy(() => import('./pages/DashboardAdmin'));
const DashboardDocente = lazy(() => import('./pages/DashboardDocente'));
const GeographicAnalytics = lazy(() => import('./components/admin/GeographicAnalytics'));

// =============================================
// MÓDULOS (lazy)
// =============================================
const PanelAdminExamenes = lazy(() => import('./components/examenes/PanelAdminExamenes'));
const PanelAlumnos = lazy(() => import('./components/alumnos/PanelAlumnos'));
const CursosPage = lazy(() => import('./pages/modulos/CursosPage'));
const PizarrasPage = lazy(() => import('./pages/modulos/PizarrasPage'));
const ForoPage = lazy(() => import('./pages/modulos/ForoPage'));
const CertificadosPage = lazy(() => import('./pages/modulos/CertificadosPage'));
const ConfiguracionPage = lazy(() => import('./pages/modulos/ConfiguracionPage'));
const MaterialesPage = lazy(() => import('./pages/modulos/MaterialesPage'));
const EstudianteCursos = lazy(() => import('./pages/EstudianteCursos'));
const EstudianteCursoDetalle = lazy(() => import('./pages/EstudianteCursoDetalle'));
const EstudianteCertificados = lazy(() => import('./pages/EstudianteCertificados'));
const HistorialEstudiante = lazy(() => import('./components/examenes/HistorialEstudiante'));
const CompartirSala = lazy(() => import('./pages/CompartirSala'));
const VincularPantalla = lazy(() => import('./pages/VincularPantalla'));
const PanelSolicitudes = lazy(() => import('./components/docente/PanelSolicitudes'));

// =============================================
// FALLBACK DE CARGA (mientras se descarga el chunk)
// =============================================
const CargandoPagina = () => (
  <div className="flex items-center justify-center min-h-[60vh] w-full">
    <div className="flex flex-col items-center gap-3">
      <Loader2 className="w-8 h-8 animate-spin text-[#0f766e]" />
      <p className="text-sm text-gray-400">Cargando…</p>
    </div>
  </div>
);

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
      <FeedbackProvider>
        <SolicitudesProvider>
          <ModoProvider>
          <Suspense fallback={<CargandoPagina />}>
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
          {/* LOGIN ÚNICO: la página de inicio (Home) es el único login.
              /login se conserva solo como redirección por compatibilidad. */}
          <Route path="/login" element={<Navigate to="/" replace />} />
          <Route path="/registro" element={<Registro />} />

          {/* MANUALES — PÚBLICOS (con botones de descarga) */}
          <Route path="/manual" element={<ManualPage />} />
          <Route path="/manual-docentes" element={<ManualPage manual="docentes" />} />
          <Route path="/manual-alumnos" element={<ManualPage manual="alumnos" />} />
          <Route
            path="/solicitar-docente"
            element={
              <ProtectedRoute allowedRoles={['estudiante']}>
                <SolicitarDocente />
              </ProtectedRoute>
            }
          />

          {/* =============================================
              COMPARTIR EN CLASE — PANTALLA DEL AULA (PÚBLICO, sin login)
              El QR SIEMPRE visible aquí (como WhatsApp Web)
          ============================================= */}
          <Route path="/compartir/:codigo" element={<CompartirSala />} />
          {/* ✅ URL FIJA para la PC del aula: sin código, sin credenciales.
              Muestra el QR y se vincula escaneando (estilo WhatsApp Web). */}
          <Route path="/proyectar" element={<CompartirSala autoCrear />} />
          {/* Alias corto heredado */}
          <Route path="/p/:codigo" element={<CompartirSala />} />

          {/* =============================================
              VINCULAR PANTALLA — landing del escaneo del QR
              El celular del docente (autenticado) autoriza la pantalla
          ============================================= */}
          <Route path="/vincular/:codigo" element={<VincularPantalla />} />

          {/* =============================================
              EXAMEN PUBLICO — SIN LOGIN (acceso con codigo)
          ============================================= */}
          <Route path="/examen/:codigo" element={<ExamenPublicoPage />} />

          {/* =============================================
              VERIFICACIÓN DE CERTIFICADOS — PÚBLICO (sin login)
          ============================================= */}
          <Route path="/validar" element={<ValidarCertificado />} />
          <Route path="/validar/:codigo" element={<ValidarCertificado />} />

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
              PRIMERA PANTALLA: DASHBOARD DOCENTE
          ============================================= */}
          <Route
            path="/docente"
            element={
              <ProtectedRoute allowedRoles={['admin', 'docente']}>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardDocente />} />
            {rutasModulos}
          </Route>

          {/* =============================================
              PANEL DEL ESTUDIANTE
              PRIMERA PANTALLA: MIS CURSOS
          ============================================= */}
          <Route
            path="/estudiante"
            element={
              <ProtectedRoute allowedRoles={['estudiante', 'docente', 'admin']}>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<EstudianteCursos />} />
            <Route path="cursos" element={<EstudianteCursos />} />
            <Route path="cursos/:id" element={<EstudianteCursoDetalle />} />
            <Route path="historial" element={
              <React.Suspense fallback={<CargandoPagina />}>
                <HistorialEstudiante />
              </React.Suspense>
            } />
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
        </Suspense>
          </ModoProvider>
        </SolicitudesProvider>
      </FeedbackProvider>
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
