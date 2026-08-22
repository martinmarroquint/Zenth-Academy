// front/src/pages/Home.jsx
// PAGINA PRINCIPAL - QR arriba, Login abajo

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import {
  GraduationCap, Lock, Mail, Eye, EyeOff, Loader2, AlertCircle,
  Monitor
} from 'lucide-react';
import { authService } from '../services/authService';
import compartirService from '../services/compartirService';

const Home = () => {
  const navigate = useNavigate();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [sala, setSala] = useState(null);
  const [cargandoQR, setCargandoQR] = useState(false);
  const [qrKey, setQrKey] = useState(0);
  const [tieneToken, setTieneToken] = useState(false);
  
  const pollingIntervalRef = useRef(null);
  const isPollingActiveRef = useRef(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    setTieneToken(!!token && token !== 'undefined' && token !== 'null');
  }, []);

  const cargarSalaActiva = async () => {
    const token = localStorage.getItem('token');
    const tokenValido = token && token !== 'undefined' && token !== 'null';
    
    if (!tokenValido) {
      setSala(null);
      setCargandoQR(false);
      detenerPolling();
      return;
    }

    try {
      const data = await compartirService.salaActiva();
      if (data) {
        setSala(data);
        if (data.qr_token) {
          setQrKey(prev => prev + 1);
        }
        reconfigurarPolling(data);
      } else {
        setSala(null);
        reconfigurarPolling(null);
      }
    } catch (e) {
      if (e?.response?.status === 401) {
        setSala(null);
        detenerPolling();
      } else {
        reconfigurarPolling(null);
      }
    } finally {
      setCargandoQR(false);
    }
  };

  const reconfigurarPolling = (data) => {
    let intervalo = 30000;
    if (data) {
      if (data.estado === 'ACTIVO') {
        intervalo = 10000;
      } else if (data.estado === 'ESPERANDO') {
        intervalo = 5000;
      }
    }
    iniciarPolling(intervalo);
  };

  const iniciarPolling = (intervaloMs) => {
    detenerPolling();
    isPollingActiveRef.current = true;
    pollingIntervalRef.current = setInterval(() => {
      if (isPollingActiveRef.current) {
        cargarSalaActiva();
      }
    }, intervaloMs);
  };

  const detenerPolling = () => {
    isPollingActiveRef.current = false;
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    const tokenValido = token && token !== 'undefined' && token !== 'null';
    
    if (tokenValido) {
      setCargandoQR(true);
      cargarSalaActiva();
    }
    
    return () => {
      detenerPolling();
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await authService.login(email, password);
      if (result.success) {
        setTieneToken(true);
        const rol = authService.getRol();
        setCargandoQR(true);
        cargarSalaActiva();
        
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

  const urlSala = sala?.codigo ? `${window.location.origin}/compartir/${sala.codigo}` : '';

  return (
    <div className="min-h-screen bg-gradient-to-b from-[var(--color-bg)] via-[var(--color-bg-subtle)] to-gray-50 flex flex-col items-center justify-center p-4">
      
      <Link to="/" className="flex items-center gap-2 mb-8 animate-fade-in-up-delay-1">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#0f766e' }}>
          <span className="text-white font-bold text-sm">CV</span>
        </div>
        <span className="font-bold text-gray-900 text-base tracking-tight">Zenth Academy</span>
      </Link>

      <div className="w-full max-w-sm container-premium shadow-elevated rounded-3xl p-6 shadow-glow-primary mb-8 animate-fade-in-up-delay-2" style={{ borderColor: '#0f766e', borderTopWidth: '2px', borderBottomWidth: '2px' }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Monitor className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">Compartir en clase</span>
          </div>
          {sala?.estado === 'ACTIVO' && (
            <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ color: '#0f766e', backgroundColor: '#e6f4f2' }}>
              Vinculado
            </span>
          )}
        </div>

        {!tieneToken ? (
          <div className="text-center py-4">
            <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
              <Monitor className="w-8 h-8 text-gray-300" />
            </div>
            <p className="text-sm text-gray-400">Inicia sesion para compartir en clase</p>
          </div>
        ) : cargandoQR ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#0f766e' }} />
          </div>
        ) : sala?.estado === 'CERRADO' ? (
          <div className="text-center py-4">
            <p className="text-sm text-gray-400">Sesion terminada</p>
            <button 
              onClick={() => {
                setSala(null);
                cargarSalaActiva();
              }}
              className="mt-2 text-xs font-medium transition-colors hover:underline"
              style={{ color: '#0f766e' }}
            >
              Iniciar nueva sesion
            </button>
          </div>
        ) : sala ? (
          <div className="flex justify-center">
            <div className="bg-white p-3 rounded-xl border-2 shadow-inner-card" style={{ borderColor: '#0f766e' }}>
              <QRCodeSVG 
                key={qrKey}
                value={sala.qr_token ? `${urlSala}?token=${sala.qr_token}` : urlSala}
                size={180} 
                level="M" 
                bgColor="#fff" 
                fgColor="#0f172a" 
              />
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-gray-400">No hay sala activa</p>
            <p className="text-xs text-gray-300 mt-1">Crea una desde tu carpeta</p>
          </div>
        )}
      </div>

      <div className="w-full max-w-sm container-premium shadow-elevated rounded-3xl p-6 border-y-2 border-gray-200 animate-fade-in-up-delay-3">
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

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-400">
            No tienes cuenta?{' '}
            <Link to="/registro" className="font-medium transition-colors hover:underline" style={{ color: '#0f766e' }}>
              Registrate
            </Link>
          </p>
        </div>
      </div>

      <p className="text-[10px] text-gray-300 mt-8 animate-fade-in-up-delay-4">Zenth Academy v2.0 Sistema Educativo</p>
    </div>
  );
};

export default Home;