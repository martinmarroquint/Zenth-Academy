// front/src/components/biblioteca/ModalAnaliticas.jsx
// Analítica de la biblioteca: qué revisó/descargó cada alumno (ruta de aprendizaje)

import React, { useEffect, useState } from 'react';
import {
  ArrowLeft, ChartColumn, Check, Download, Eye, Loader2, Star, Users, X,
} from 'lucide-react';
import bibliotecaService from '../../services/bibliotecaService';

const fmtFecha = (iso) => {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return '';
  }
};

const KpiCard = ({ icono: Icono, label, valor, color }) => (
  <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
    <div className="flex items-center gap-2 text-gray-400 mb-1">
      <Icono className="w-3.5 h-3.5" />
      <span className="text-[11px] uppercase tracking-wider">{label}</span>
    </div>
    <p className={`text-xl font-bold ${color || 'text-gray-900'}`}>{valor}</p>
  </div>
);

const ListaRuta = ({ items }) => {
  if (!items || items.length === 0) {
    return <p className="text-sm text-gray-400 py-4 text-center">Sin actividad registrada.</p>;
  }
  return (
    <div className="space-y-2">
      {items.map((i, idx) => (
        <div
          key={`${i.recurso_id}-${i.evento}-${idx}`}
          className="flex items-start justify-between gap-3 bg-white border border-gray-200 rounded-xl p-3"
        >
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-800 break-words">{i.titulo}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">
              {i.tipo_recurso} · {i.evento === 'descarga' ? 'abrió / descargó' : 'revisó'} ·{' '}
              {fmtFecha(i.ultima_vez)}
            </p>
          </div>
          <span className="text-xs font-semibold text-gray-600 whitespace-nowrap">{i.veces}×</span>
        </div>
      ))}
    </div>
  );
};

const ModalAnaliticas = ({ modo = 'docente', onCerrar }) => {
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);
  const [ruta, setRuta] = useState(null);
  const [cargandoRuta, setCargandoRuta] = useState(false);

  useEffect(() => {
    let activo = true;
    (async () => {
      try {
        const res =
          modo === 'docente'
            ? await bibliotecaService.analitica()
            : await bibliotecaService.miActividad();
        if (activo) setData(res);
      } catch (e) {
        if (activo) setError(e?.message || 'No se pudieron cargar las analíticas');
      } finally {
        if (activo) setCargando(false);
      }
    })();
    return () => {
      activo = false;
    };
  }, [modo]);

  const verRuta = async (usuarioId) => {
    setCargandoRuta(true);
    setError('');
    try {
      const res = await bibliotecaService.analiticaAlumno(usuarioId);
      setRuta(res);
    } catch (e) {
      setError(e?.message || 'No se pudo cargar la ruta del alumno');
    } finally {
      setCargandoRuta(false);
    }
  };

  const esDocente = modo === 'docente';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            {ruta && (
              <button
                onClick={() => setRuta(null)}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
                aria-label="Volver"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <ChartColumn className="w-5 h-5" style={{ color: '#0f766e' }} />
            <h3 className="text-lg font-semibold text-gray-900">
              {ruta
                ? `Ruta de ${ruta.usuario_nombre || 'alumno'}`
                : esDocente
                  ? 'Analíticas de la biblioteca'
                  : 'Mi actividad'}
            </h3>
          </div>
          <button
            onClick={onCerrar}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4">
          {cargando && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-7 h-7 animate-spin text-gray-400" />
            </div>
          )}

          {!cargando && error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-3 py-2 rounded-lg">
              {error}
            </div>
          )}

          {/* Ruta de un alumno */}
          {!cargando && ruta && (
            <>
              <p className="text-xs text-gray-500">
                {ruta.total_eventos} interacción(es) registradas en tus recursos.
              </p>
              {cargandoRuta ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                </div>
              ) : (
                <ListaRuta items={ruta.items} />
              )}
            </>
          )}

          {/* Mi actividad (alumno) */}
          {!cargando && !ruta && !esDocente && data && (
            <>
              <p className="text-xs text-gray-500">
                {data.total_eventos} interacción(es) en la biblioteca.
              </p>
              <ListaRuta items={data.items} />
            </>
          )}

          {/* Panel del docente */}
          {!cargando && !ruta && esDocente && data && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <KpiCard icono={ChartColumn} label="Recursos" valor={data.total_recursos} />
                <KpiCard icono={Eye} label="Visitas" valor={data.total_visitas} />
                <KpiCard
                  icono={Download}
                  label="Descargas"
                  valor={data.total_descargas}
                  color="text-[#0f766e]"
                />
                <KpiCard
                  icono={Users}
                  label="Alumnos activos"
                  valor={data.alumnos_activos}
                  color="text-amber-600"
                />
              </div>

              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Recursos más usados
                </h4>
                {data.top_recursos.length === 0 ? (
                  <p className="text-sm text-gray-400">Todavía no hay recursos publicados.</p>
                ) : (
                  <div className="space-y-2">
                    {data.top_recursos.map((r) => (
                      <div
                        key={r.recurso_id}
                        className="flex items-center justify-between gap-3 bg-white border border-gray-200 rounded-xl p-3"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-800 break-words">
                            {r.titulo}
                          </p>
                          <p className="text-[11px] text-gray-400">
                            {r.tipo} · {r.usuarios_unicos} alumno(s)
                          </p>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-gray-500 whitespace-nowrap">
                          <span className="flex items-center gap-1">
                            <Eye className="w-3 h-3" /> {r.visitas}
                          </span>
                          <span className="flex items-center gap-1">
                            <Download className="w-3 h-3" /> {r.descargas}
                          </span>
                          <span className="flex items-center gap-1">
                            <Star className="w-3 h-3" /> {r.favoritos}
                          </span>
                          <span className="flex items-center gap-1">
                            <Check className="w-3 h-3" /> {r.completados}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Alumnos (clic para ver su ruta)
                </h4>
                {data.alumnos.length === 0 ? (
                  <p className="text-sm text-gray-400">Todavía no hay actividad de alumnos.</p>
                ) : (
                  <div className="space-y-2">
                    {data.alumnos.map((a) => (
                      <button
                        key={a.usuario_id}
                        onClick={() => verRuta(a.usuario_id)}
                        className="w-full flex items-center justify-between gap-3 bg-white border border-gray-200 hover:border-[#0f766e] rounded-xl p-3 text-left transition-colors"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-800 break-words">
                            {a.usuario_nombre || 'Alumno'}
                          </p>
                          <p className="text-[11px] text-gray-400">
                            Última vez: {fmtFecha(a.ultima_vez)}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-gray-500 whitespace-nowrap">
                          <span className="flex items-center gap-1">
                            <Eye className="w-3 h-3" /> {a.vistas}
                          </span>
                          <span className="flex items-center gap-1">
                            <Download className="w-3 h-3" /> {a.descargas}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ModalAnaliticas;
