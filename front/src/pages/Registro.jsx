// front/src/pages/Registro.jsx
// PÁGINA DE REGISTRO DE USUARIOS

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  GraduationCap, Lock, Mail, Eye, EyeOff, 
  Loader2, AlertCircle, User, Users, Shield,
  CheckCircle
} from 'lucide-react';
import { authService } from '../services/authService';

const Registro = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    nombres: '',
    apellidos: '',
    telefono: '',
    rol: 'estudiante',
    institucion: '',
    especialidad: '',
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await authService.register(formData);
      if (result.success) {
        setSuccess(true);
        setTimeout(() => {
          const rol = authService.getRol();
          if (rol === 'admin') {
            navigate('/admin');
          } else if (rol === 'docente') {
            navigate('/docente');
          } else {
            navigate('/estudiante');
          }
        }, 1500);
      } else {
        setError(result.error || 'Error en el registro');
      }
    } catch {
      setError('Error al registrarse');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fbfbfa] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-sm" style={{ backgroundColor: '#e6f4f2', borderColor: '#0f766e' }}>
            <GraduationCap className="w-7 h-7" style={{ color: '#0f766e' }} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Crear cuenta</h1>
          <p className="text-sm text-gray-400 mt-1">Regístrate en Zenth Academy</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          {success ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: '#e6f4f2' }}>
                <CheckCircle className="w-8 h-8" style={{ color: '#0f766e' }} />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">¡Registro exitoso!</h3>
              <p className="text-sm text-gray-400 mt-1">Redirigiendo...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-sm text-red-600">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombres
                  </label>
                  <input
                    type="text"
                    name="nombres"
                    value={formData.nombres}
                    onChange={handleChange}
                    placeholder="Nombres"
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-200 transition-all bg-white"
                    style={{ '--tw-ring-color': '#0f766e' }}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Apellidos
                  </label>
                  <input
                    type="text"
                    name="apellidos"
                    value={formData.apellidos}
                    onChange={handleChange}
                    placeholder="Apellidos"
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-200 transition-all bg-white"
                    style={{ '--tw-ring-color': '#0f766e' }}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Correo electrónico
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none z-10" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="ejemplo@zenthacademy.com"
                    className="w-full pl-14 pr-4 py-3 text-sm border border-gray-200 rounded-xl outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-200 transition-all bg-white"
                    style={{ '--tw-ring-color': '#0f766e' }}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contraseña
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none z-10" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full pl-14 pr-14 py-3 text-sm border border-gray-200 rounded-xl outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-200 transition-all bg-white"
                    style={{ '--tw-ring-color': '#0f766e' }}
                    minLength="6"
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
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Teléfono (opcional)
                </label>
                <input
                  type="text"
                  name="telefono"
                  value={formData.telefono}
                  onChange={handleChange}
                  placeholder="Teléfono de contacto"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-200 transition-all bg-white"
                  style={{ '--tw-ring-color': '#0f766e' }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de cuenta
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, rol: 'estudiante' })}
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-colors ${
                      formData.rol === 'estudiante'
                        ? 'border-teal-700 bg-teal-50 text-teal-700'
                        : 'border-gray-200 hover:border-gray-300 text-gray-600'
                    }`}
                    style={formData.rol === 'estudiante' ? { borderColor: '#0f766e', backgroundColor: '#e6f4f2', color: '#0f766e' } : {}}
                  >
                    <Users className="w-4 h-4" />
                    <span className="text-sm font-medium">Estudiante</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, rol: 'docente' })}
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-colors ${
                      formData.rol === 'docente'
                        ? 'border-teal-700 bg-teal-50 text-teal-700'
                        : 'border-gray-200 hover:border-gray-300 text-gray-600'
                    }`}
                    style={formData.rol === 'docente' ? { borderColor: '#0f766e', backgroundColor: '#e6f4f2', color: '#0f766e' } : {}}
                  >
                    <Shield className="w-4 h-4" />
                    <span className="text-sm font-medium">Docente</span>
                  </button>
                </div>
              </div>

              {formData.rol === 'docente' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Especialidad
                  </label>
                  <input
                    type="text"
                    name="especialidad"
                    value={formData.especialidad}
                    onChange={handleChange}
                    placeholder="Ej: Matemáticas, Programación..."
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-200 transition-all bg-white"
                    style={{ '--tw-ring-color': '#0f766e' }}
                  />
                </div>
              )}

              {formData.rol === 'estudiante' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Institución (opcional)
                  </label>
                  <input
                    type="text"
                    name="institucion"
                    value={formData.institucion}
                    onChange={handleChange}
                    placeholder="Nombre de tu institución"
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-200 transition-all bg-white"
                    style={{ '--tw-ring-color': '#0f766e' }}
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 text-sm font-medium text-white rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2 shadow-sm hover:shadow-md"
                style={{ backgroundColor: '#0f766e' }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#0d5e57'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#0f766e'}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Registrando...
                  </>
                ) : (
                  'Crear cuenta'
                )}
              </button>
            </form>
          )}

          <div className="mt-4 text-center">
            <p className="text-sm text-gray-400">
              ¿Ya tienes cuenta?{' '}
              <Link to="/login" className="font-medium transition-colors hover:underline" style={{ color: '#0f766e' }}>
                Inicia sesión
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center text-[10px] text-gray-300 mt-6">
          Zenth Academy v2.0 • Sistema Educativo
        </p>
      </div>
    </div>
  );
};

export default Registro;