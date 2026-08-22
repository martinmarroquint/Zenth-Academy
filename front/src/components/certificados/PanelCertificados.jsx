// front/src/components/certificados/PanelCertificados.jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  Award, Search, Download, Eye, Users, Clock,
  Loader2, Plus, FileText, CheckCircle, XCircle
} from 'lucide-react';
import certificadosService from '../../services/certificadosService';

const PanelCertificados = ({ onGenerarCertificado, onVerCertificado }) => {
  const [certificados, setCertificados] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [busqueda, setBusqueda] = useState('');

  const cargarCertificados = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      const data = await certificadosService.listar({});
      setCertificados(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Error cargando certificados:', e);
      setError(e.message || 'No se pudieron cargar los certificados');
      setCertificados([]);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarCertificados();
  }, [cargarCertificados]);

  const handleDownload = async (id) => {
    try {
      await certificadosService.obtener(id);
      alert('El certificado se descargará en breve (integración de descarga próximamente)');
    } catch (e) {
      console.error('Error obteniendo certificado:', e);
    }
  };

  const certificadosFiltrados = (certificados || []).filter(c =>
    (c.titulo || c.nombre || '').toLowerCase().includes(busqueda.toLowerCase()) ||
    (c.estudiante || c.nombre_estudiante || '').toLowerCase().includes(busqueda.toLowerCase())
  );

  const getEstadoColor = (estado) => {
    const colores = {
      EMITIDO: 'bg-green-100 text-green-700',
      PENDIENTE: 'bg-amber-100 text-amber-700',
      CANCELADO: 'bg-red-100 text-red-700'
    };
    return colores[estado] || 'bg-gray-100 text-gray-700';
  };

  if (cargando) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
        <p className="text-sm text-red-500 mb-4">{error}</p>
        <button
          onClick={cargarCertificados}
          className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Certificados</h2>
          <p className="text-sm text-gray-500">Gestiona los certificados de tus cursos</p>
        </div>
        <button
          onClick={() => onGenerarCertificado?.(null)}
          className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors flex items-center gap-2 text-sm"
        >
          <Plus className="w-4 h-4" />
          Nuevo Certificado
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{certificados.length}</p>
          <p className="text-xs text-gray-500">Total</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{certificados.filter(c => c.estado === 'EMITIDO').length}</p>
          <p className="text-xs text-gray-500">Emitidos</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-amber-600">{certificados.filter(c => c.estado === 'PENDIENTE').length}</p>
          <p className="text-xs text-gray-500">Pendientes</p>
        </div>
      </div>

      {/* Buscador */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar certificados..."
          className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-amber-300 focus:ring-2 focus:ring-amber-100 transition-all"
        />
      </div>

      {/* Lista */}
      {certificadosFiltrados.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <Award className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No hay certificados</h3>
          <p className="text-sm text-gray-500 mt-1">Genera tu primer certificado</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {certificadosFiltrados.map((cert) => (
            <div key={cert.id} className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <Award className="w-8 h-8 text-amber-500" />
                  <div>
                    <h3 className="font-semibold text-gray-900">{cert.titulo || cert.nombre}</h3>
                    <p className="text-sm text-gray-500">{cert.curso_nombre || cert.curso || ''}</p>
                  </div>
                </div>
                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getEstadoColor(cert.estado)}`}>
                  {cert.estado}
                </span>
              </div>
              <div className="flex items-center gap-4 text-xs text-gray-400">
                <span className="flex items-center gap-1"><Users className="w-3 h-3" />{cert.estudiante || cert.nombre_estudiante || ''}</span>
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(cert.fecha_emision || cert.fecha || Date.now()).toLocaleDateString()}</span>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2">
                <button
                  onClick={() => onVerCertificado?.(cert.id)}
                  className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <Eye className="w-4 h-4" />
                </button>
                <button onClick={() => handleDownload(cert.id)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors">
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PanelCertificados;