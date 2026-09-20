// front/src/components/certificados/GenerarCertificado.jsx

import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft, Award, CheckCircle, Download, Printer, Share2
} from 'lucide-react';
import certificadosService from '../../services/certificadosService';
import cursosService from '../../services/cursosService';
import { authService } from '../../services/authService';
import { Dropdown, Button } from '../ui';
import { useFeedback } from '../../hooks/useFeedback';

const GenerarCertificado = ({ cursoId, onVolver, onGenerado }) => {
  const { toast } = useFeedback();
  const usuarioActual = authService.getCurrentUser();
  const esAdmin = usuarioActual?.rol === 'admin';

  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [generado, setGenerado] = useState(false);
  const [certificadoGenerado, setCertificadoGenerado] = useState(null);
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);

  const [cargandoCursos, setCargandoCursos] = useState(false);
  const [cursos, setCursos] = useState([]);
  const [cursoSeleccionado, setCursoSeleccionado] = useState(cursoId || '');
  const [cursoTitulo, setCursoTitulo] = useState('');

  const [cargandoEstudiantes, setCargandoEstudiantes] = useState(false);
  const [estudiantes, setEstudiantes] = useState([]);
  const [estudianteSeleccionado, setEstudianteSeleccionado] = useState('');

  const [copiado, setCopiado] = useState(false);
  const [descargando, setDescargando] = useState(false);
  const certificadoRef = useRef(null);
  const copiadoTimer = useRef(null);

  useEffect(() => () => clearTimeout(copiadoTimer.current), []);

  // Cargar cursos del docente cuando no se recibe un cursoId
  useEffect(() => {
    if (cursoId) return;
    let activo = true;
    const cargarCursos = async () => {
      setCargandoCursos(true);
      try {
        const filtros = esAdmin ? {} : { docente_id: usuarioActual?.id };
        const data = await cursosService.listar(filtros);
        if (activo) setCursos(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error('Error cargando cursos:', e);
        if (activo) setError(e.message || 'No se pudieron cargar los cursos');
      } finally {
        if (activo) setCargandoCursos(false);
      }
    };
    cargarCursos();
    return () => { activo = false; };
  }, [cursoId, esAdmin, usuarioActual?.id]);

  // Cargar estudiantes reales del curso seleccionado
  useEffect(() => {
    if (!cursoSeleccionado) {
      setEstudiantes([]);
      return;
    }
    let activo = true;
    const cargarEstudiantes = async () => {
      setCargandoEstudiantes(true);
      setEstudianteSeleccionado('');
      try {
        const data = await cursosService.listarEstudiantes(cursoSeleccionado);
        if (!activo) return;
        setEstudiantes(Array.isArray(data?.estudiantes) ? data.estudiantes : []);
        if (data?.curso_titulo) setCursoTitulo(data.curso_titulo);
      } catch (e) {
        console.error('Error cargando estudiantes del curso:', e);
        if (activo) {
          setError(e.message || 'No se pudieron cargar los estudiantes del curso');
          setEstudiantes([]);
        }
      } finally {
        if (activo) setCargandoEstudiantes(false);
      }
    };
    cargarEstudiantes();
    return () => { activo = false; };
  }, [cursoSeleccionado]);

  const handleSeleccionarCurso = (value) => {
    setCursoSeleccionado(value);
    const curso = cursos.find((c) => c.id === value);
    setCursoTitulo(curso?.titulo || '');
  };

  const estudiante = estudiantes.find((e) => e.estudiante_id === estudianteSeleccionado);

  const opcionesCursos = cursos.map((c) => ({ value: c.id, label: c.titulo }));
  const opcionesEstudiantes = estudiantes.map((e) => ({
    value: e.estudiante_id,
    label: e.estudiante_nombre || 'Estudiante'
  }));

  const handleGenerar = async () => {
    if (!estudianteSeleccionado || !cursoSeleccionado) return;
    setCargando(true);
    setError('');
    try {
      const payload = {
        estudiante_id: estudiante?.estudiante_id || estudianteSeleccionado,
        estudiante_nombre: estudiante?.estudiante_nombre || 'Estudiante',
        curso_id: cursoSeleccionado,
        curso_titulo: cursoTitulo || 'Curso',
        docente_id: usuarioActual?.id || usuarioActual?.usuario_id || 'docente-generico',
        docente_nombre: usuarioActual?.nombre || usuarioActual?.usuario || ''
      };
      const creado = await certificadosService.crear(payload);
      setCertificadoGenerado(creado);
      setGenerado(true);
      if (onGenerado) onGenerado();
    } catch (e) {
      console.error('Error generando certificado:', e);
      setError(e.message || 'No se pudo generar el certificado');
    } finally {
      setCargando(false);
    }
  };

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
      pdf.save(`certificado-${String(certificadoGenerado?.codigo || 'zenth').toLowerCase()}.pdf`);
      toast.success('PDF descargado');
    } catch (e) {
      console.error('Error generando PDF:', e);
      toast.error('No se pudo generar el PDF del certificado');
    } finally {
      setDescargando(false);
    }
  };

  const handleCompartir = async () => {
    const codigo = certificadoGenerado?.codigo || '';
    try {
      await navigator.clipboard.writeText(codigo);
      setCopiado(true);
      toast.success('Código copiado');
      clearTimeout(copiadoTimer.current);
      copiadoTimer.current = setTimeout(() => setCopiado(false), 2000);
    } catch (e) {
      console.error('Error copiando código:', e);
      toast.error('No se pudo copiar el código del certificado');
    }
  };

  if (generado) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center no-print">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">¡Certificado Generado!</h2>
          <p className="text-sm text-gray-500 mt-1">El certificado se ha creado correctamente</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <div ref={certificadoRef} className="certificado-print border-2 border-gray-200 rounded-lg p-6 bg-white">
            <Award className="w-16 h-16 text-amber-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900">Certificado de Finalización</h3>
            <p className="text-sm text-gray-500 mt-1">Otorgado a</p>
            <p className="text-lg font-semibold text-gray-900 mt-2">{estudiante?.estudiante_nombre || 'Estudiante'}</p>
            <p className="text-sm text-gray-500 mt-3">Por completar el curso</p>
            <p className="text-md font-medium text-gray-800">{cursoTitulo || 'Curso'}</p>
            <p className="text-xs text-gray-400 mt-4">Código: {certificadoGenerado?.codigo || ''}</p>
            <p className="text-xs text-gray-400">Fecha: {new Date(certificadoGenerado?.fecha_emision || fecha).toLocaleDateString()}</p>
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
          </div>
        </div>

        <div className="flex justify-center no-print">
          <button
            onClick={onVolver}
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            Volver a certificados
          </button>
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
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onVolver}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver
        </button>
        <h2 className="text-lg font-semibold text-gray-900">Generar Certificado</h2>
        <div className="w-20" />
      </div>

      {/* Formulario */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {!cursoId && (
          <Dropdown
            label="Curso"
            placeholder="Selecciona un curso"
            searchable
            loading={cargandoCursos}
            options={opcionesCursos}
            value={cursoSeleccionado}
            onChange={handleSeleccionarCurso}
            noOptionsMessage="No tienes cursos disponibles"
          />
        )}

        {cursoId && (
          <div>
            <p className="block text-xs font-medium text-gray-700 mb-1.5">Curso</p>
            <p className="text-sm text-gray-900 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
              {cursoTitulo || 'Curso seleccionado'}
            </p>
          </div>
        )}

        <Dropdown
          label="Estudiante"
          placeholder={cursoSeleccionado ? 'Selecciona un estudiante' : 'Selecciona primero un curso'}
          searchable
          disabled={!cursoSeleccionado || cargandoEstudiantes}
          loading={cargandoEstudiantes}
          options={opcionesEstudiantes}
          value={estudianteSeleccionado}
          onChange={setEstudianteSeleccionado}
          noOptionsMessage="Este curso no tiene estudiantes inscritos"
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Fecha de emisión
          </label>
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#0f766e] transition-colors"
          />
        </div>

        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-gray-500">
            <span className="font-medium">Código:</span> {certificadoGenerado?.codigo || 'Se generará al crear'}
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          fullWidth
          icon={<Award className="w-4 h-4" />}
          loading={cargando}
          disabled={!estudianteSeleccionado || !cursoSeleccionado}
          onClick={handleGenerar}
        >
          Generar Certificado
        </Button>
      </div>

      {/* Información adicional */}
      <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Información</h4>
        <ul className="text-xs text-gray-500 space-y-1">
          <li>• El certificado incluirá el nombre del estudiante y el curso</li>
          <li>• Se generará un código único de verificación</li>
          <li>• Puedes descargarlo en formato PDF o imprimirlo</li>
        </ul>
      </div>
    </div>
  );
};

export default GenerarCertificado;
