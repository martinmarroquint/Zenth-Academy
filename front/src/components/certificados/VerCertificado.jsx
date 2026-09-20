// front/src/components/certificados/VerCertificado.jsx
import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft, Award, Loader2, Download, Printer, Share2, XCircle
} from 'lucide-react';
import certificadosService from '../../services/certificadosService';
import { Button } from '../ui';
import { useFeedback } from '../../hooks/useFeedback';

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
  const certificadoRef = useRef(null);
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
        setFechaEmision(new Date(data.fecha_emision || Date.now()).toLocaleDateString());
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

  const handleDescargar = async () => {
    if (!certificadoRef.current) return;
    setDescargando(true);
    try {
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf')
      ]);
      const canvas = await html2canvas(certificadoRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const ratio = Math.min(
        (pageWidth - margin * 2) / canvas.width,
        (pageHeight - margin * 2) / canvas.height
      );
      const imgWidth = canvas.width * ratio;
      const imgHeight = canvas.height * ratio;
      pdf.addImage(
        imgData,
        'PNG',
        (pageWidth - imgWidth) / 2,
        (pageHeight - imgHeight) / 2,
        imgWidth,
        imgHeight
      );
      pdf.save(`certificado-${String(certificado.codigo || certificado.id || 'zenth').toLowerCase()}.pdf`);
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
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between no-print">
        <button
          onClick={onVolver}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver
        </button>
        <h2 className="text-lg font-semibold text-gray-900">Certificado</h2>
        <div className="w-20" />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
        <div ref={certificadoRef} className="certificado-print border-2 border-gray-200 rounded-lg p-6 bg-white">
          <Award className="w-16 h-16 text-amber-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900">Certificado de Finalización</h3>
          <p className="text-sm text-gray-500 mt-1">Otorgado a</p>
          <p className="text-lg font-semibold text-gray-900 mt-2">{certificado.estudiante_nombre}</p>
          <p className="text-sm text-gray-500 mt-3">Por completar el curso</p>
          <p className="text-md font-medium text-gray-800">{certificado.curso_titulo}</p>
          <p className="text-xs text-gray-400 mt-4">Código: {certificado.codigo}</p>
          <p className="text-xs text-gray-400">Fecha: {fechaEmision}</p>
        </div>

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
          .certificado-print { position: absolute; left: 0; top: 0; width: 100%; border: none !important; }
        }
      `}</style>
    </div>
  );
};

export default VerCertificado;
