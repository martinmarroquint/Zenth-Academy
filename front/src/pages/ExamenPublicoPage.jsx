// front/src/pages/ExamenPublicoPage.jsx
// PAGINA PUBLICA PARA RENDIR EXAMENES SIN LOGIN
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Clock, Shield, AlertTriangle, Send, Eye, EyeOff } from 'lucide-react';
import examenesService from '../services/examenesService';
import ExamenActivo from '../components/examenes/ExamenActivo';

const ExamenPublicoPage = () => {
  const { codigo } = useParams();
  const [examen, setExamen] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [verificando, setVerificando] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [accesoConcedido, setAccesoConcedido] = useState(false);
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [alumnoInfo, setAlumnoInfo] = useState({
    nombre: '',
    grado: '',
    dni: ''
  });

  useEffect(() => {
    const cargarExamen = async () => {
      try {
        const data = await examenesService.obtenerExamenPublico(codigo);
        setExamen(data);
      } catch (err) {
        setError(err.message || 'Examen no encontrado');
      } finally {
        setCargando(false);
      }
    };
    cargarExamen();
  }, [codigo]);

  const verificarPassword = async () => {
    if (!password.trim()) {
      setPasswordError('Ingrese el password');
      return;
    }
    setVerificando(true);
    setPasswordError('');
    try {
      await examenesService.verificarPasswordExamenPublico(codigo, password);
      setAccesoConcedido(true);
    } catch (err) {
      setPasswordError(err.message || 'Password incorrecto');
    } finally {
      setVerificando(false);
    }
  };

  const handleFinalizar = async (resultado) => {
    // El ExamenActivo ya mane la llamada al endpoint
  };

  if (cargando) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-[#0f766e] border-t-transparent rounded-full animate-spin mx-auto mb-3"/>
          <p className="text-sm text-gray-500">Cargando examen...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 max-w-md w-full text-center">
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-3"/>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Examen no disponible</h2>
          <p className="text-sm text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  if (!examen) return null;

  const config = examen.configuracion || {};
  const requierePassword = config.password_examen && !accesoConcedido;

  // Pantalla de password
  if (requierePassword && !accesoConcedido) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 max-w-md w-full">
          <div className="text-center mb-6">
            <Shield className="w-12 h-12 text-[#0f766e] mx-auto mb-3"/>
            <h2 className="text-lg font-semibold text-gray-900">{examen.titulo}</h2>
            <p className="text-sm text-gray-500 mt-1">Este examen requiere password de acceso</p>
          </div>
          <div className="space-y-4">
            <div className="relative">
              <input
                type={mostrarPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setPasswordError(''); }}
                placeholder="Ingrese el password"
                className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl outline-none focus:border-[#0f766e] focus:ring-2 focus:ring-[#e6f4f2] transition-all pr-10"
                onKeyDown={(e) => e.key === 'Enter' && verificarPassword()}
              />
              <button onClick={() => setMostrarPassword(!mostrarPassword)} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-gray-600 rounded-lg">
                {mostrarPassword ? <EyeOff className="w-5 h-5"/> : <Eye className="w-5 h-5"/>}
              </button>
            </div>
            {passwordError && <p className="text-xs text-red-500">{passwordError}</p>}
            <button onClick={verificarPassword} disabled={verificando}
              className="w-full py-3 bg-[#0f766e] text-white text-sm font-medium rounded-xl hover:bg-[#0d5e57] transition-colors disabled:opacity-50">
              {verificando ? 'Verificando...' : 'Ingresar'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Pantalla de informacion del alumno (antes de comenzar)
  if (!accesoConcedido && !requierePassword) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 max-w-md w-full">
          <div className="text-center mb-6">
            <div className="w-12 h-12 bg-[#e6f4f2] rounded-xl flex items-center justify-center mx-auto mb-3">
              <Send className="w-6 h-6 text-[#0f766e]"/>
            </div>
            <h2 className="text-lg font-semibold text-gray-900">{examen.titulo}</h2>
            {examen.descripcion && <p className="text-sm text-gray-500 mt-1">{examen.descripcion}</p>}
          </div>
          
          <div className="space-y-3 mb-6">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <Clock className="w-4 h-4 text-gray-400"/>
              <span className="text-sm text-gray-600">Tiempo: {examen.tiempo_limite} minutos</span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <Shield className="w-4 h-4 text-gray-400"/>
              <span className="text-sm text-gray-600">Preguntas: {examen.preguntas?.length || 0}</span>
            </div>
          </div>

          {!config.anonimo && (
            <div className="space-y-3 mb-6">
              <p className="text-xs font-medium text-gray-400">Datos del participante</p>
              <input type="text" value={alumnoInfo.nombre} onChange={(e) => setAlumnoInfo({...alumnoInfo, nombre: e.target.value})}
                placeholder="Nombre completo" className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-[#0f766e] transition-all"/>
              <input type="text" value={alumnoInfo.grado} onChange={(e) => setAlumnoInfo({...alumnoInfo, grado: e.target.value})}
                placeholder="Grado (opcional)" className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-[#0f766e] transition-all"/>
              <input type="text" value={alumnoInfo.dni} onChange={(e) => setAlumnoInfo({...alumnoInfo, dni: e.target.value})}
                placeholder="DNI (opcional)" className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-[#0f766e] transition-all"/>
            </div>
          )}

          <button onClick={() => setAccesoConcedido(true)}
            className="w-full py-3 bg-[#0f766e] text-white text-sm font-medium rounded-xl hover:bg-[#0d5e57] transition-colors">
            Comenzar Examen
          </button>
        </div>
      </div>
    );
  }

  // Examen activo
  return (
    <ExamenActivo 
      examen={examen}
      alumno={config.anonimo ? { nombre: 'Anonimo', id: null } : { ...alumnoInfo, id: null }}
      onFinalizar={handleFinalizar}
    />
  );
};

export default ExamenPublicoPage;
