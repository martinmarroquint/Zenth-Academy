// front/src/pages/EstudianteCertificados.jsx
// CERTIFICADOS DEL ESTUDIANTE - LISTA PROPIA + VER CERTIFICADO

import React, { useState, useEffect } from 'react';
import { Award, Loader2, Eye, CalendarDays, CheckCircle2 } from 'lucide-react';
import certificadosService from '../services/certificadosService';
import VerCertificado from '../components/certificados/VerCertificado';
import { authService } from '../services/authService';

const EstudianteCertificados = () => {
  const usuario = authService.getCurrentUser();
  const [certificados, setCertificados] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [verId, setVerId] = useState(null);

  useEffect(() => {
    const cargar = async () => {
      try {
        const data = await certificadosService.listar({ estudiante_id: usuario?.id });
        setCertificados(Array.isArray(data) ? data : []);
        setError('');
      } catch (e) {
        console.error('Error cargando certificados:', e);
        setError('No se pudieron cargar tus certificados');
        setCertificados([]);
      } finally {
        setCargando(false);
      }
    };
    cargar();
  }, [usuario?.id]);

  if (verId) {
    return <VerCertificado certificadoId={verId} onVolver={() => setVerId(null)} />;
  }

  if (cargando) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-gray-400" />
      </div>
    );
  }

  const formatearFecha = (fecha) => {
    if (!fecha) return '—';
    try {
      return new Date(fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return fecha;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <div className="flex items-center gap-2 mb-6">
        <Award className="w-6 h-6 text-amber-500" />
        <h2 className="font-semibold text-gray-900 text-sm uppercase tracking-wider">
          Mis Certificados ({certificados.length})
        </h2>
      </div>

      {error && (
        <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {error}
        </div>
      )}

      {certificados.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
          <Award className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">
            Aún no tienes certificados. Completa un curso al 100% para obtener el tuyo.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          {certificados.map((cert) => (
            <div
              key={cert.id}
              className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-all flex items-center gap-4"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-50 to-yellow-100 border border-amber-200 flex items-center justify-center flex-shrink-0">
                <Award className="w-6 h-6 text-amber-500" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 text-sm truncate">
                  {cert.curso_titulo || cert.titulo || 'Certificado'}
                </h3>
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    <CalendarDays className="w-3 h-3" />
                    {formatearFecha(cert.fecha_emision || cert.created_at)}
                  </span>
                  <span className="flex items-center gap-1 text-emerald-600">
                    <CheckCircle2 className="w-3 h-3" />
                    {cert.estado || 'emitido'}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setVerId(cert.id)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors flex-shrink-0"
              >
                <Eye className="w-3.5 h-3.5" />
                Ver
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default EstudianteCertificados;