// front/src/components/certificados/VerCertificado.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, Loader2, Download, Printer, Share2, XCircle, ShieldCheck
} from 'lucide-react';
import certificadosService from '../../services/certificadosService';
import { Button, Badge } from '../ui';
import { useFeedback } from '../../hooks/useFeedback';
import CertificateTemplates from './CertificateTemplates';
import { getDisenoCertificado } from './certificateConfig';

const normalizarEstado = (estado) => String(estado || '').toLowerCase();

const VerCertificado = ({ certificadoId, onVolver }) => {
  const { toast, confirmar } = useFeedback();
  const [certificado, setCertificado] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [fechaEmision, setFechaEmision] = useState('');
  const [prevCertificadoId, setPrevCertificadoId] = useState(certificadoId);
  const [copiado, setCopiado] = useState(false);
  const [descargando, setDescargando] = useState(false);
  const [cancelando, setCancelando] = useState(false);
  const copiadoTimer = useRef(null);

  if (certificadoId !== prevCertificadoId) {
    setPrevCertificadoId(certificadoId);
    setCargando(true);
    setError('');
  }

  useEffect(() => {
    if (!certificadoId) return;
    certificadosService.obtener(certificadoId)
      .then((data) => {
        setCertificado(data);
        setFechaEmision(new Date(data.fecha_emision || Date.now()).toLocaleDateString('es-ES'));
      })
      .catch((e) => {
        console.error('Error cargando certificado:', e);
        setError(e.message || 'No se pudo cargar el certificado');
      })
      .finally(() => setCargando(false));
  }, [certificadoId]);

  useEffect(() => () => clearTimeout(copiadoTimer.current), []);

  if (cargando) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <p className="text-red-500 text-sm mb-4">{error}</p>
        <Button variant="secondary" size="sm" onClick={onVolver}>
          Volver
        </Button>
      </div>
    );
  }

  if (!certificado) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500">Certificado no encontrado</p>
        <Button variant="secondary" size="sm" className="mt-4" onClick={onVolver}>
          Volver
        </Button>
      </div>
    );
  }

  const config = getDisenoCertificado(certificado);

  const handleDescargar = async () => {
    setDescargando(true);
    try {
      const { generarPDF } = await import('./CertificatePDF');
      await generarPDF({ certificado, config, fechaEmision });
      toast.success('PDF descargado');
    } catch (e) {
      console.error('Error generando PDF:', e);
      toast.error('No se pudo generar el PDF del certificado');
    } finally {
      setDescargando(false);
    }
  };

  const handleCompartir = async () => {
    try {
      await navigator.clipboard.writeText(certificado.codigo || '');
      setCopiado(true);
      toast.success('Código copiado');
      clearTimeout(copiadoTimer.current);
      copiadoTimer.current = setTimeout(() => setCopiado(false), 2000);
    } catch (e) {
      console.error('Error copiando código:', e);
      toast.error('No se pudo copiar el código del certificado');
    }
  };

  const handleCancelar = async () => {
    const ok = await confirmar({
      titulo: 'Cancelar certificado',
      mensaje: '¿Cancelar este certificado? Esta acción no se puede deshacer.',
      confirmText: 'Cancelar certificado',
      cancelText: 'Volver',
      variant: 'danger',
    });
    if (!ok) return;
    setCancelando(true);
    try {
      await certificadosService.cancelar(certificado.id);
      setCertificado((prev) => ({ ...prev, estado: 'cancelado' }));
    } catch (e) {
      console.error('Error cancelando certificado:', e);
      toast.error(e.message || 'No se pudo cancelar el certificado');
    } finally {
      setCancelando(false);
    }
  };

  const esEmitido = normalizarEstado(certificado.estado) === 'emitido';

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-2 no-print">
        <button
          onClick={onVolver}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver
        </button>
        <h2 className="text-base sm:text-lg font-semibold text-gray-900 truncate">
          Certificado
        </h2>
        <div className="w-14 sm:w-20 shrink-0" />
      </div>

      {certificado.firma && (
        <div className="flex items-center justify-center gap-2 no-print">
          <Badge variant="success" size="md">Firmado ✓</Badge>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-6 md:p-8">
        <CertificateTemplates
          certificado={certificado}
          config={config}
          fechaEmision={fechaEmision}
        />

        <div className="flex flex-wrap items-center justify-center gap-3 mt-6 no-print">
          <Button
            variant="primary"
            size="sm"
            icon={<Download className="w-4 h-4" />}
            loading={descargando}
            onClick={handleDescargar}
          >
            Descargar
          </Button>
          <Button
            variant="outline"
            size="sm"
            icon={<Printer className="w-4 h-4" />}
            onClick={() => window.print()}
          >
            Imprimir
          </Button>
          <Button
            variant="ghost"
            size="sm"
            icon={<Share2 className="w-4 h-4" />}
            onClick={handleCompartir}
          >
            {copiado ? '¡Copiado!' : 'Compartir'}
          </Button>
          <Link
            to={`/validar/${certificado.codigo}`}
            className="inline-flex items-center justify-center gap-2 font-medium rounded-xl px-3 py-1.5 text-xs border border-gray-300 hover:border-gray-400 bg-transparent hover:bg-gray-50 text-gray-700 transition-all"
          >
            <ShieldCheck className="w-4 h-4" />
            Verificar en línea
          </Link>
          {esEmitido && (
            <Button
              variant="danger"
              size="sm"
              icon={<XCircle className="w-4 h-4" />}
              loading={cancelando}
              onClick={handleCancelar}
            >
              Cancelar
            </Button>
          )}
        </div>
      </div>

      <style>{`
        @page { size: A4 landscape; margin: 10mm; }
        @media print {
          .no-print, .no-print * { display: none !important; }
          body * { visibility: hidden; }
          .certificado-print, .certificado-print * { visibility: visible; }
          .certificado-print { position: absolute; left: 0; top: 0; width: 100%; border: none !important; box-shadow: none !important; }
        }
      `}</style>
    </div>
  );
};

export default VerCertificado;
