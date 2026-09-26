// front/src/pages/Home.jsx
// PAGINA PRINCIPAL - QR de aula + Login (lado a lado en escritorio)

import React, { useState, useEffect } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import {
  Lock, Mail, Eye, EyeOff, Loader2, AlertCircle
} from 'lucide-react';
import { authService } from '../services/authService';
import SocialLoginButtons from '../components/auth/SocialLoginButtons';
import PantallaAulaQR from '../components/compartir/PantallaAulaQR';

const Home = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // ✅ Mensaje de error devuelto por el login social (OAuth)
    const params = new URLSearchParams(window.location.search);
    const err = params.get('error');
    if (err) {
      const mensajes = {
        cancelado: 'Cancelaste el inicio de sesión con el proveedor.',
        oauth_fallido: 'No se pudo completar el inicio de sesión social.',
        sesion_expirada: 'La sesión expiró. Intenta de nuevo.',
        usuario_inactivo: 'Tu cuenta está inactiva. Contacta al administrador.',
        proveedor_invalido: 'Proveedor no válido.',
        parametros_faltantes: 'Faltan datos para completar el inicio de sesión.',
      };
      setError(mensajes[err] || 'No se pudo iniciar sesión.');
      // Limpiar la URL para que no se repita al recargar
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await authService.login(email, password);
      if (result.success) {
        const rol = authService.getRol();

        if (rol === 'admin') {
          navigate('/admin');
        } else if (rol === 'docente') {
          navigate('/docente');
        } else {
          navigate('/estudiante');
        }
      } else {
        setError(result.error || 'Credenciales incorrectas');
      }
    } catch {
      setError('Error al iniciar sesion');
    } finally {
      setLoading(false);
    }
  };

  // ✅ Si ya hay sesión activa, entrar DIRECTO al panel (no mostrar el login).
  if (authService.isAuthenticated()) {
    const rolActual = authService.getRol();
    const destino = rolActual === 'admin' ? '/admin' : rolActual === 'docente' ? '/docente' : '/estudiante';
    return <Navigate to={destino} replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[var(--color-bg)] via-[var(--color-bg-subtle)] to-gray-50 flex flex-col items-center justify-center p-4">

      <Link to="/" className="flex items-center gap-2 mb-8 animate-fade-in-up-delay-1">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#0f766e' }}>
          <span className="text-white font-bold text-sm">CV</span>
        </div>
        <span className="font-bold text-gray-900 text-base tracking-tight">Zenth Academy</span>
      </Link>

      {/* ✅ QR + Login: juntos, lado a lado en escritorio */}
      <div className="w-full max-w-4xl flex flex-col lg:flex-row items-stretch justify-center gap-6 lg:gap-8">

        {/* ===== COMPARTIR EN CLASE (QR de vinculación) ===== */}
        <div
          className="w-full lg:w-[380px] flex-shrink-0 container-premium shadow-elevated rounded-3xl p-6 shadow-glow-primary animate-fade-in-up-delay-2"
          style={{ borderColor: '#0f766e', borderTopWidth: '2px', borderBottomWidth: '2px' }}
        >
          <PantallaAulaQR />
        </div>

        {/* ===== LOGIN ===== */}
        <div className="w-full lg:w-[380px] container-premium shadow-elevated rounded-3xl p-6 border-y-2 border-gray-200 animate-fade-in-up-delay-3">
          <div className="text-center mb-6">
            <h1 className="text-lg font-semibold text-gray-900">Iniciar sesion</h1>
            <p className="text-xs text-gray-400 mt-0.5">Accede a tu cuenta</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2 text-xs text-red-600 animate-fade-in">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none z-10" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Correo electronico"
                className="w-full pl-14 pr-4 py-3 text-sm border border-gray-200 rounded-xl outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-200 transition-all bg-white"
                style={{ '--tw-ring-color': '#0f766e' }}
                autoFocus
                required
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none z-10" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Contrasena"
                className="w-full pl-14 pr-14 py-3 text-sm border border-gray-200 rounded-xl outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-200 transition-all bg-white"
                style={{ '--tw-ring-color': '#0f766e' }}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-gray-600 transition-colors rounded-lg hover:bg-gray-100 z-10"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 text-sm font-medium text-white rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
              style={{ backgroundColor: '#0f766e' }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#0d5e57'}
              onMouseLeave={(e) => e.target.style.backgroundColor = '#0f766e'}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Iniciando...
                </>
              ) : (
                'Iniciar sesion'
              )}
            </button>
          </form>

          {/* Login social (Google / Microsoft) */}
          <SocialLoginButtons onError={setError} />

          <div className="mt-6 text-center">
            <p className="text-xs text-gray-400">
              No tienes cuenta?{' '}
              <Link to="/registro" className="font-medium transition-colors hover:underline" style={{ color: '#0f766e' }}>
                Registrate
              </Link>
            </p>
          </div>
        </div>
      </div>

      <p className="text-[10px] text-gray-300 mt-8 animate-fade-in-up-delay-4">
        Zenth Academy v2.0 Sistema Educativo ·{' '}
        <Link to="/manual-alumnos" className="transition-colors hover:underline" style={{ color: '#0f766e' }}>
          Manual para alumnos
        </Link>
        {' · '}
        <Link to="/manual-docentes" className="transition-colors hover:underline" style={{ color: '#0f766e' }}>
          Manual para docentes
        </Link>
        {' · '}
        <Link to="/manual" className="transition-colors hover:underline" style={{ color: '#0f766e' }}>
          Manual del sistema
        </Link>
      </p>
    </div>
  );
};

export default Home;
