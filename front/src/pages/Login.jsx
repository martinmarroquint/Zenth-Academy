// front/src/pages/Login.jsx
// LOGIN CON REDIRECCIÓN AUTOMÁTICA

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  GraduationCap, Lock, Mail, Eye, EyeOff, Loader2, AlertCircle
} from 'lucide-react';
import { authService } from '../services/authService';

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
    } catch (error) {
      console.error('Error en login:', error);
      setError('Error al iniciar sesión. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fbfbfa] flex flex-col">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-md mx-auto px-4 py-3.5 flex items-center justify-center sm:justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl" style={{ backgroundColor: '#0f766e' }}>
              <span className="text-white font-bold text-sm flex items-center justify-center h-full">CV</span>
            </div>
            <span className="font-bold text-gray-900 text-sm">Zenth Academy</span>
          </Link>
          <span className="hidden sm:flex items-center gap-1 text-[11px] text-gray-400">
            <GraduationCap className="w-3.5 h-3.5" /> Sistema Educativo
          </span>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <h1 className="text-xl font-bold text-gray-900">Inicia sesión en tu cuenta</h1>
            <p className="text-sm text-gray-400 mt-1">Accede a tu panel según tu rol</p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-7 shadow-sm">
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-sm text-red-600">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Correo electrónico
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none z-10" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ejemplo@zenthacademy.com"
                    className="w-full pl-14 pr-4 py-3 text-sm border border-gray-200 rounded-xl outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-200 transition-all bg-white"
                    style={{ '--tw-ring-color': '#0f766e' }}
                    autoFocus
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Contraseña
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none z-10" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Ingresa tu contraseña"
                    className="w-full pl-14 pr-14 py-3 text-sm border border-gray-200 rounded-xl outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-200 transition-all bg-white"
                    style={{ '--tw-ring-color': '#0f766e' }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-gray-600 transition-colors rounded-lg hover:bg-gray-100 z-10"
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 text-sm font-medium text-white rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2 shadow-sm hover:shadow-md"
                style={{ backgroundColor: '#0f766e', hover: { backgroundColor: '#0d5e57' } }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#0d5e57'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#0f766e'}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Iniciando sesión...
                  </>
                ) : (
                  'Iniciar sesión'
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-400">
                ¿No tienes cuenta?{' '}
                <Link to="/registro" className="font-medium transition-colors hover:underline" style={{ color: '#0f766e' }}>
                  Regístrate
                </Link>
              </p>
            </div>
          </div>

          <p className="text-center text-[10px] text-gray-300 mt-6">
            Zenth Academy v2.0 • Sistema Educativo
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;