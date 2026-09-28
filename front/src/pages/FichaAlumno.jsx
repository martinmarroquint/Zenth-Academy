// front/src/pages/FichaAlumno.jsx
// FICHA TRAZABLE DEL ALUMNO (docente/admin)
// Identidad + cursos con progreso y notas + exámenes rendidos + certificados.
// Backend: GET /api/v1/alumnos/{id}/ficha (acepta Alumno.id o Usuario.id).

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  GraduationCap,
  Mail,
  Phone,
  BookOpen,
  Award,
  FileText,
  AlertCircle,
  User,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  ExternalLink,
} from 'lucide-react';
import alumnosService from '../services/alumnosService';
import { Badge } from '../components/ui';

// =============================================
// HELPERS
// =============================================

const formatearFecha = (iso) => {
  if (!iso) return '—';
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return '—';
  return fecha.toLocaleDateString('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const minutos = (segundos) => {
  if (!segundos && segundos !== 0) return '—';
  const total = Math.round(Number(segundos) / 60);
  return total <= 0 ? '<1 min' : `${total} min`;
};

const varianteEstadoExamen = (estado) => {
  switch (estado) {
    case 'COMPLETADO':
      return 'success';
    case 'TRAMPA':
      return 'danger';
    case 'EN_CURSO':
      return 'warning';
    default:
      return 'default';
  }
};

const TarjetaKpi = ({ icono: Icono, etiqueta, valor }) => (
  <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
    <div className="w-10 h-10 rounded-lg bg-[#0f766e]/10 flex items-center justify-center flex-shrink-0">
      <Icono className="w-5 h-5 text-[#0f766e]" />
    </div>
    <div className="min-w-0">
      <p className="text-xs text-gray-500">{etiqueta}</p>
      <p className="text-lg font-bold text-gray-900 truncate">{valor}</p>
    </div>
  </div>
);

const Vacio = ({ titulo, mensaje }) => (
  <div className="bg-white rounded-xl border border-dashed border-gray-300 px-4 py-8 text-center">
    <p className="text-sm font-medium text-gray-600">{titulo}</p>
    {mensaje && <p className="text-xs text-gray-400 mt-1">{mensaje}</p>}
  </div>
);

// =============================================
// PÁGINA
// =============================================

const FichaAlumno = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const [ficha, setFicha] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [intento, setIntento] = useState(0);

  const prefijoPanel = pathname.startsWith('/admin') ? '/admin' : '/docente';

  useEffect(() => {
    let vivo = true;

    const cargar = async () => {
      if (!id) {
        setError('Alumno no proporcionado');
        setCargando(false);
        return;
      }
      try {
        const data = await alumnosService.ficha(id);
        if (vivo) {
          setFicha(data);
          setError('');
        }
      } catch (e) {
        console.error('Error cargando la ficha del alumno:', e);
        if (vivo) {
          setError(e.message || 'No se pudo cargar la ficha del alumno');
        }
      } finally {
        if (vivo) setCargando(false);
      }
    };

    setCargando(true);
    cargar();
    return () => {
      vivo = false;
    };
  }, [id, intento]);

  // --------------------------------------------
  // ESTADOS DE CARGA
  // --------------------------------------------
  if (cargando) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-12 h-12 border-4 border-[#e6f4f2] border-t-[#0f766e] rounded-full animate-spin" />
        <span className="text-sm text-gray-400 mt-4">Cargando ficha del alumno…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <button
          onClick={() => navigate(`${prefijoPanel}/alumnos`)}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-4 text-sm"
        >
          <ArrowLeft className="w-4 h-4" /> Volver a alumnos
        </button>
        <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-red-600 font-medium">{error}</p>
          <button
            onClick={() => setIntento((n) => n + 1)}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (!ficha) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <button
          onClick={() => navigate(`${prefijoPanel}/alumnos`)}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-4 text-sm"
        >
          <ArrowLeft className="w-4 h-4" /> Volver a alumnos
        </button>
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-8 text-center">
          <User className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
          <p className="text-yellow-700 font-medium">Alumno no encontrado</p>
        </div>
      </div>
    );
  }

  const { alumno, resumen, cursos, examenes, certificados } = ficha;
  const iniciales = `${(alumno.nombres || '').charAt(0)}${(alumno.apellidos || '').charAt(0)}`.toUpperCase() || 'AL';

  // --------------------------------------------
  // RENDER
  // --------------------------------------------
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Volver */}
      <button
        onClick={() => navigate(`${prefijoPanel}/alumnos`)}
        className="flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors text-sm"
      >
        <ArrowLeft className="w-4 h-4" /> Volver a alumnos
      </button>

      {/* Identidad */}
      <div className="bg-white rounded-2xl border border-gray-200/60 overflow-hidden shadow-sm">
        <div className="p-6 flex flex-col sm:flex-row sm:items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#0f766e]/10 flex items-center justify-center flex-shrink-0 text-[#0f766e] font-bold text-xl">
            {iniciales}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">{alumno.nombre_completo}</h1>
              <Badge variant={alumno.cuenta_registrada ? 'success' : 'warning'} size="sm">
                {alumno.cuenta_registrada ? 'Con cuenta' : 'Sin cuenta'}
              </Badge>
              <Badge variant={alumno.activo ? 'primary' : 'danger'} size="sm">
                {alumno.activo ? 'Activo' : 'Inactivo'}
              </Badge>
            </div>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-3 text-sm text-gray-600">
              <span className="flex items-center gap-1.5">
                <User className="w-4 h-4 text-gray-400" />
                DNI: <span className="font-mono font-medium">{alumno.dni || '—'}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <Mail className="w-4 h-4 text-gray-400" />
                {alumno.email || '—'}
              </span>
              {alumno.telefono && (
                <span className="flex items-center gap-1.5">
                  <Phone className="w-4 h-4 text-gray-400" />
                  {alumno.telefono}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-gray-400" />
                Alta: {formatearFecha(alumno.fecha_alta)}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 mt-3">
              {alumno.grado && <Badge variant="default" size="sm">Grado: {alumno.grado}</Badge>}
              {alumno.grupo && <Badge variant="default" size="sm">Grupo: {alumno.grupo}</Badge>}
              {alumno.institucion && (
                <Badge variant="info" size="sm">{alumno.institucion}</Badge>
              )}
              <Badge variant="default" size="sm" className="font-mono">
                ID: {alumno.id}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <TarjetaKpi
          icono={BookOpen}
          etiqueta="Cursos"
          valor={`${resumen.cursos_completados}/${resumen.cursos_inscritos} completados`}
        />
        <TarjetaKpi
          icono={GraduationCap}
          etiqueta="Progreso promedio"
          valor={`${resumen.progreso_promedio}%`}
        />
        <TarjetaKpi
          icono={FileText}
          etiqueta="Exámenes"
          valor={`${resumen.examenes_aprobados}/${resumen.examenes_rendidos} aprobados`}
        />
        <TarjetaKpi
          icono={Award}
          etiqueta="Certificados"
          valor={resumen.certificados_emitidos}
        />
      </div>

      {/* Cursos */}
      <section className="bg-white rounded-2xl border border-gray-200/60 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-[#0f766e]" />
          <h2 className="font-semibold text-gray-900">Cursos</h2>
          <span className="text-xs text-gray-400">({cursos.length})</span>
        </div>

        {cursos.length === 0 ? (
          <div className="px-5 py-6">
            <Vacio
              titulo="Sin cursos inscritos"
              mensaje="Este alumno aún no tiene inscripciones registradas."
            />
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {cursos.map((curso) => (
              <div key={curso.curso_id} className="px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-gray-900">{curso.titulo}</p>
                      {curso.completado && (
                        <Badge variant="success" size="sm">Completado</Badge>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {curso.docente_nombre || '—'} · Inscrito: {formatearFecha(curso.fecha_inscripcion)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">{curso.progreso}%</p>
                    <p className="text-xs text-gray-500">
                      {curso.lecciones_completadas}/{curso.lecciones_totales} lecciones
                    </p>
                  </div>
                </div>

                <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#0f766e] rounded-full transition-all"
                    style={{ width: `${Math.min(curso.progreso || 0, 100)}%` }}
                  />
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                  <span>Notas: {curso.notas_registradas}</span>
                  {curso.promedio_notas !== null && curso.promedio_notas !== undefined && (
                    <Badge variant="primary" size="sm">
                      Promedio {curso.promedio_notas}/20
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Exámenes */}
      <section className="bg-white rounded-2xl border border-gray-200/60 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <FileText className="w-5 h-5 text-[#0f766e]" />
          <h2 className="font-semibold text-gray-900">Exámenes rendidos</h2>
          <span className="text-xs text-gray-400">({examenes.length})</span>
          {resumen.promedio_examenes !== null && resumen.promedio_examenes !== undefined && (
            <span className="ml-auto text-xs text-gray-500">
              Promedio: <span className="font-semibold text-gray-900">{resumen.promedio_examenes}</span>
            </span>
          )}
        </div>

        {examenes.length === 0 ? (
          <div className="px-5 py-6">
            <Vacio
              titulo="Sin exámenes rendidos"
              mensaje="Aún no hay resultados de examen asociados a este alumno."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 uppercase tracking-wider bg-gray-50">
                  <th className="px-5 py-2.5 font-medium">Examen</th>
                  <th className="px-3 py-2.5 font-medium">Nota</th>
                  <th className="px-3 py-2.5 font-medium">Resultado</th>
                  <th className="px-3 py-2.5 font-medium">Estado</th>
                  <th className="px-3 py-2.5 font-medium">Intentos</th>
                  <th className="px-5 py-2.5 font-medium">Entregado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {examenes.map((examen) => (
                  <tr key={`${examen.examen_id}-${examen.entregado_en}`}>
                    <td className="px-5 py-3">
                      <p className="font-medium text-gray-900">{examen.titulo}</p>
                      <p className="text-xs text-gray-500">
                        {examen.correctas}/{examen.total_preguntas} correctas ·{' '}
                        {minutos(examen.tiempo_usado)}
                      </p>
                    </td>
                    <td className="px-3 py-3 font-semibold text-gray-900">
                      {examen.calificacion}
                      <span className="text-xs font-normal text-gray-400">
                        /{examen.puntaje_aprobacion} mín.
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      {examen.aprobado ? (
                        <span className="flex items-center gap-1 text-emerald-600">
                          <CheckCircle className="w-4 h-4" /> Aprobado
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-red-500">
                          <XCircle className="w-4 h-4" /> No aprobado
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <Badge variant={varianteEstadoExamen(examen.estado)} size="sm">
                        {examen.estado}
                      </Badge>
                    </td>
                    <td className="px-3 py-3 text-gray-600">
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4 text-gray-400" />
                        {examen.intentos}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-600">
                      {formatearFecha(examen.entregado_en)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Certificados */}
      <section className="bg-white rounded-2xl border border-gray-200/60 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <Award className="w-5 h-5 text-[#0f766e]" />
          <h2 className="font-semibold text-gray-900">Certificados</h2>
          <span className="text-xs text-gray-400">({certificados.length})</span>
        </div>

        {certificados.length === 0 ? (
          <div className="px-5 py-6">
            <Vacio titulo="Sin certificados emitidos" />
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {certificados.map((certificado) => (
              <div
                key={certificado.codigo}
                className="px-5 py-4 flex flex-wrap items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="font-medium text-gray-900">{certificado.curso_titulo}</p>
                  <p className="text-xs text-gray-500 font-mono mt-0.5">
                    {certificado.codigo} · Emitido: {formatearFecha(certificado.fecha_emision)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="success" size="sm">{certificado.estado}</Badge>
                  {certificado.url && (
                    <a
                      href={certificado.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 text-sm text-[#0f766e] hover:underline"
                    >
                      Ver <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default FichaAlumno;
