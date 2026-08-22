// front/src/pages/ResponderCuestionarioPage.jsx
// Página para responder un cuestionario desde un enlace (usuario autenticado)

import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Loader2, CheckCircle2, AlertTriangle, Lock, Send } from 'lucide-react';
import ResponderCuestionario from '../components/cuestionarios/ResponderCuestionario';
import cuestionariosService from '../services/cuestionariosService';
import { authService } from '../services/authService';

const construirPayload = (cuestionario, respuestas) => {
  const items = [];
  (cuestionario?.preguntas || []).forEach((p) => {
    const valor = respuestas[p.id];
    if (valor === undefined || valor === null) return;
    const item = { pregunta_id: p.id, tiempo_respuesta: 0 };
    switch (p.tipo) {
      case 'opcion_unica':
        item.valor_opcion = Array.isArray(p.opciones) && typeof valor === 'number'
          ? String(p.opciones[valor] ?? valor)
          : String(valor);
        break;
      case 'opcion_multiple':
        item.valor_opciones = Array.isArray(valor)
          ? (Array.isArray(p.opciones) ? valor.map((i) => String(p.opciones[i] ?? i)) : valor.map((i) => String(i)))
          : [];
        break;
      case 'escala_likert':
      case 'escala_numerica':
      case 'estrellas':
        item.valor_numero = Number(valor);
        break;
      case 'fecha':
        item.valor_fecha = valor;
        break;
      case 'matriz':
        item.valor_matriz = valor;
        break;
      case 'ordenamiento':
        item.valor_ordenamiento = valor;
        break;
      case 'archivo':
        item.valor_texto = valor?.name || '';
        break;
      case 'texto_corto':
      case 'texto_largo':
      case 'hora':
      default:
        item.valor_texto = String(valor);
    }
    items.push(item);
  });
  return items;
};

const ResponderCuestionarioPage = () => {
  const { id } = useParams();
  const [cuestionario, setCuestionario] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [enviado, setEnviado] = useState(false);
  const [passwordIngresada, setPasswordIngresada] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [bloqueado, setBloqueado] = useState('');

  useEffect(() => {
    const cargar = async () => {
      setCargando(true);
      setError('');
      try {
        const data = await cuestionariosService.obtener(id);
        setCuestionario(data);

        const ahora = new Date();
        if (data.fecha_inicio && new Date(data.fecha_inicio) > ahora) {
          setBloqueado('Este cuestionario aún no está disponible.');
        } else if (data.fecha_fin && new Date(data.fecha_fin) < ahora) {
          setBloqueado('Este cuestionario ya no acepta respuestas.');
        }
      } catch (e) {
        setError(e.message || 'No se pudo cargar el cuestionario');
      } finally {
        setCargando(false);
      }
    };
    if (id) cargar();
  }, [id]);

  const handleEnviar = async ({ respuestas, tiempo_total }) => {
    const usuario = authService.getCurrentUser();
    const payload = {
      cuestionario_id: id,
      usuario_id: usuario?.id,
      nombre: usuario?.nombre_completo || usuario?.nombre || '',
      email: usuario?.email || '',
      tiempo_total: tiempo_total || 0,
      password: passwordIngresada || null,
      respuestas: construirPayload(cuestionario, respuestas),
    };
    await cuestionariosService.responder(id, payload);
    setEnviado(true);
  };

  const handleVerificarPassword = (e) => {
    e.preventDefault();
    if (!passwordIngresada.trim()) {
      setPasswordError('Ingresa la contraseña para continuar.');
      return;
    }
    if (passwordIngresada !== cuestionario.password) {
      setPasswordError('Contraseña incorrecta.');
      return;
    }
    setPasswordError('');
    setBloqueado('');
  };

  if (cargando) {
    return (
      <div className="min-h-screen bg-[#fbfbfa] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#fbfbfa] flex items-center justify-center p-4">
        <div className="bg-white rounded-xl border border-gray-200 p-8 max-w-md w-full text-center">
          <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <p className="text-sm text-gray-600">{error}</p>
          <Link to="/" className="mt-4 inline-block px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg">
            Volver al inicio
          </Link>
        </div>
      </div>
    );
  }

  if (enviado) {
    return (
      <div className="min-h-screen bg-[#fbfbfa] flex items-center justify-center p-4">
        <div className="bg-white rounded-xl border border-gray-200 p-8 max-w-md w-full text-center">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-gray-900 mb-1">¡Respuesta enviada!</h2>
          <p className="text-sm text-gray-500 mb-6">Tu respuesta fue registrada correctamente.</p>
          <Link to="/" className="inline-block px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg">
            Volver al inicio
          </Link>
        </div>
      </div>
    );
  }

  if (bloqueado) {
    return (
      <div className="min-h-screen bg-[#fbfbfa] flex items-center justify-center p-4">
        <div className="bg-white rounded-xl border border-gray-200 p-8 max-w-md w-full text-center">
          <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto mb-3" />
          <p className="text-sm text-gray-600 mb-4">{bloqueado}</p>
          <Link to="/" className="inline-block px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg">
            Volver al inicio
          </Link>
        </div>
      </div>
    );
  }

  if (cuestionario?.password && passwordIngresada !== cuestionario.password) {
    return (
      <div className="min-h-screen bg-[#fbfbfa] flex items-center justify-center p-4">
        <form
          onSubmit={handleVerificarPassword}
          className="bg-white rounded-xl border border-gray-200 p-8 max-w-md w-full"
        >
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-5 h-5 text-gray-600" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 text-center mb-1">{cuestionario.titulo}</h2>
          <p className="text-sm text-gray-500 text-center mb-6">
            Este cuestionario está protegido con contraseña.
          </p>
          <input
            type="password"
            value={passwordIngresada}
            onChange={(e) => { setPasswordIngresada(e.target.value); setPasswordError(''); }}
            placeholder="Contraseña"
            autoFocus
            className="w-full px-4 py-3 text-sm border border-gray-200 rounded-lg outline-none focus:border-gray-300 transition-colors mb-2"
          />
          {passwordError && (
            <p className="text-xs text-red-500 mb-2">{passwordError}</p>
          )}
          <button
            type="submit"
            className="w-full px-4 py-2.5 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
          >
            <Send className="w-4 h-4" />
            Continuar
          </button>
        </form>
      </div>
    );
  }

  return (
    <ResponderCuestionario
      cuestionario={cuestionario}
      onEnviar={handleEnviar}
      onCancelar={() => window.history.back()}
    />
  );
};

export default ResponderCuestionarioPage;
