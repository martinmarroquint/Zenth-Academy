// front/src/components/certificados/GenerarCertificado.jsx

import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft, Award, CheckCircle, Download, Printer, Share2, Palette, RotateCcw
} from 'lucide-react';
import certificadosService from '../../services/certificadosService';
import cursosService from '../../services/cursosService';
import { authService } from '../../services/authService';
import { Dropdown, Button, Switch } from '../ui';
import { useFeedback } from '../../hooks/useFeedback';
import CertificateTemplates from './CertificateTemplates';
import {
  TEMPLATE_DEFAULT, TEMPLATES, loadTemplateConfig, saveTemplateConfig
} from './certificateConfig';

const inputCls =
  'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#0f766e] transition-colors';

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

  const [config, setConfig] = useState(() => loadTemplateConfig());

  const [copiado, setCopiado] = useState(false);
  const [descargando, setDescargando] = useState(false);
  const copiadoTimer = useRef(null);

  useEffect(() => () => clearTimeout(copiadoTimer.current), []);

  useEffect(() => {
    saveTemplateConfig(config);
  }, [config]);

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
    // setState vía función anidada (patrón del repo — evita set-state-in-effect)
    const limpiar = () => setEstudiantes([]);
    if (!cursoSeleccionado) {
      limpiar();
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

  const actualizarConfig = (campo, valor) => {
    setConfig((prev) => ({ ...prev, [campo]: valor }));
  };

  const restablecerConfig = () => setConfig({ ...TEMPLATE_DEFAULT });

  const estudiante = estudiantes.find((e) => e.estudiante_id === estudianteSeleccionado);

  const opcionesCursos = cursos.map((c) => ({ value: c.id, label: c.titulo }));
  const opcionesEstudiantes = estudiantes.map((e) => ({
    value: e.estudiante_id,
    label: e.estudiante_nombre || 'Estudiante'
  }));

  const fechaPreview = fecha
    ? new Date(fecha).toLocaleDateString('es-ES')
    : new Date().toLocaleDateString('es-ES');

  const certificadoPreview = {
    estudiante_nombre: estudiante?.estudiante_nombre || 'Nombre del estudiante',
    curso_titulo: cursoTitulo || 'Título del curso',
    codigo: 'CERT-XXXXXXXX',
    docente_nombre: usuarioActual?.nombre || usuarioActual?.usuario || '',
  };

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
    setDescargando(true);
    try {
      const { generarPDF } = await import('./CertificatePDF');
      await generarPDF({
        certificado: certFinal,
        config,
        fechaEmision: fechaEmisionFinal,
      });
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

  const certFinal = {
    ...certificadoGenerado,
    estudiante_nombre:
      certificadoGenerado?.estudiante_nombre ||
      estudiante?.estudiante_nombre ||
      'Estudiante',
    curso_titulo: certificadoGenerado?.curso_titulo || cursoTitulo || 'Curso',
    codigo: certificadoGenerado?.codigo || '',
  };

  const fechaEmisionFinal = new Date(
    certificadoGenerado?.fecha_emision || fecha
  ).toLocaleDateString('es-ES');

  if (generado) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="text-center no-print">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">¡Certificado Generado!</h2>
          <p className="text-sm text-gray-500 mt-1">El certificado se ha creado correctamente</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 sm:p-8">
          <CertificateTemplates
            certificado={certFinal}
            config={config}
            fechaEmision={fechaEmisionFinal}
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
            .certificado-print { position: absolute; left: 0; top: 0; width: 100%; border: none !important; box-shadow: none !important; }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
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
            className={inputCls}
          />
        </div>

        {/* ===== DISEÑO DEL CERTIFICADO ===== */}
        <div className="border-t border-gray-200 pt-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
              <Palette className="w-4 h-4 text-[#0f766e]" />
              Diseño del certificado
            </h3>
            <button
              type="button"
              onClick={restablecerConfig}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Restablecer diseño
            </button>
          </div>

          {/* Selector de plantilla */}
          <div className="grid grid-cols-3 gap-2">
            {TEMPLATES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => actualizarConfig('template', t.id)}
                className={`rounded-lg border-2 px-2.5 py-2.5 text-left transition-all ${
                  config.template === t.id
                    ? 'border-[#0f766e] bg-[#e6f4f2]'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <span className="block text-xs font-semibold text-gray-900">{t.label}</span>
                <span className="block text-[10px] text-gray-500 leading-tight mt-0.5">
                  {t.desc}
                </span>
              </button>
            ))}
          </div>

          {/* Colores */}
          <div className="grid grid-cols-2 gap-3">
            <label className="flex items-center justify-between gap-2 text-xs font-medium text-gray-700 bg-gray-50 rounded-lg px-3 py-2">
              Color principal
              <input
                type="color"
                value={config.color_primario}
                onChange={(e) => actualizarConfig('color_primario', e.target.value)}
                className="w-8 h-8 p-0 border border-gray-200 rounded cursor-pointer bg-transparent"
              />
            </label>
            <label className="flex items-center justify-between gap-2 text-xs font-medium text-gray-700 bg-gray-50 rounded-lg px-3 py-2">
              Color de acento
              <input
                type="color"
                value={config.color_acento}
                onChange={(e) => actualizarConfig('color_acento', e.target.value)}
                className="w-8 h-8 p-0 border border-gray-200 rounded cursor-pointer bg-transparent"
              />
            </label>
          </div>

          {/* Textos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Nombre de la firma
              </label>
              <input
                type="text"
                value={config.firma_nombre}
                onChange={(e) => actualizarConfig('firma_nombre', e.target.value)}
                placeholder="Ej. María López"
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Cargo de la firma
              </label>
              <input
                type="text"
                value={config.firma_cargo}
                onChange={(e) => actualizarConfig('firma_cargo', e.target.value)}
                placeholder="Instructor Certificado"
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Título del certificado
              </label>
              <input
                type="text"
                value={config.texto_titulo}
                onChange={(e) => actualizarConfig('texto_titulo', e.target.value)}
                placeholder="Certificado de Finalización"
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Párrafo
              </label>
              <input
                type="text"
                value={config.texto_parrafo}
                onChange={(e) => actualizarConfig('texto_parrafo', e.target.value)}
                placeholder="Por completar satisfactoriamente el curso"
                className={inputCls}
              />
            </div>
          </div>

          {/* Nota */}
          <div className="flex items-center justify-between gap-3 bg-gray-50 rounded-lg px-3 py-2.5">
            <Switch
              checked={config.mostrar_nota}
              onChange={(v) => actualizarConfig('mostrar_nota', v)}
              label="Mostrar calificación"
              size="sm"
            />
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500" htmlFor="cert-nota">Nota</label>
              <input
                id="cert-nota"
                type="number"
                min="0"
                max="100"
                disabled={!config.mostrar_nota}
                value={config.nota ?? ''}
                onChange={(e) =>
                  actualizarConfig(
                    'nota',
                    e.target.value === '' ? null : Number(e.target.value)
                  )
                }
                className="w-20 px-2 py-1.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#0f766e] transition-colors disabled:opacity-50 disabled:bg-gray-100"
              />
            </div>
          </div>

          {/* Logo */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Logo (URL, opcional)
            </label>
            <input
              type="url"
              value={config.logo_url || ''}
              onChange={(e) =>
                actualizarConfig('logo_url', e.target.value.trim() || null)
              }
              placeholder="https://..."
              className={inputCls}
            />
          </div>

          {/* Vista previa */}
          <div>
            <p className="text-xs font-medium text-gray-700 mb-2">Vista previa</p>
            <CertificateTemplates
              certificado={certificadoPreview}
              config={config}
              fechaEmision={fechaPreview}
            />
          </div>
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

export default GenerarCertificado;
