// front/src/pages/BibliotecaRecursoPublico.jsx
// Página PÚBLICA de un recurso de la biblioteca compartido por link/QR (sin login)

import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AlertTriangle, BookOpen, ExternalLink, Loader2, User } from 'lucide-react';
import bibliotecaService from '../services/bibliotecaService';

const BibliotecaRecursoPublico = () => {
  const { token } = useParams();
  const [recurso, setRecurso] = useState(null);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let activo = true;
    (async () => {
      try {
        const data = await bibliotecaService.obtenerPublico(token);
        if (activo) setRecurso(data);
      } catch (e) {
        if (activo) setError(e?.message || 'No se encontró el recurso');
      } finally {
        if (activo) setCargando(false);
      }
    })();
    return () => {
      activo = false;
    };
  }, [token]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <Link to="/" className="flex items-center justify-center gap-2 mb-6">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: '#0f766e' }}
          >
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-gray-900">Zenth Academy · Biblioteca</span>
        </Link>

        {cargando && (
          <div className="bg-white border border-gray-200 rounded-3xl p-10 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400 mx-auto" />
          </div>
        )}

        {!cargando && error && (
          <div className="bg-white border border-gray-200 rounded-3xl p-10 text-center">
            <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
            <h1 className="text-lg font-semibold text-gray-900 mb-1">Recurso no disponible</h1>
            <p className="text-sm text-gray-500">{error}</p>
          </div>
        )}

        {!cargando && recurso && (
          <div className="bg-white border border-gray-200 rounded-3xl overflow-hidden">
            {recurso.portada_url && (
              <img
                src={recurso.portada_url}
                alt=""
                className="w-full h-44 object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            )}
            <div className="p-6 sm:p-8 space-y-4">
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <span className="uppercase tracking-wider">{recurso.tipo}</span>
                {recurso.tema && (
                  <>
                    <span>·</span>
                    <span>{recurso.tema}</span>
                  </>
                )}
              </div>

              <h1 className="text-2xl font-bold text-gray-900 break-words">{recurso.titulo}</h1>

              <p className="text-sm text-gray-500 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" />
                {recurso.autor_nombre || 'Zenth Academy'}
              </p>

              {recurso.descripcion && (
                <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">
                  {recurso.descripcion}
                </p>
              )}

              {recurso.contenido && (
                <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 text-sm text-gray-700 whitespace-pre-wrap break-words max-h-96 overflow-y-auto">
                  {recurso.contenido}
                </div>
              )}

              {recurso.url && (
                <a
                  href={recurso.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl text-white font-semibold"
                  style={{ backgroundColor: '#0f766e' }}
                >
                  <ExternalLink className="w-5 h-5" />
                  Abrir recurso
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BibliotecaRecursoPublico;
