// front/src/pages/modulos/BibliotecaPage.jsx
// BIBLIOTECA INDEPENDIENTE: recursos y tareas abiertos para todos los alumnos,
// sin necesidad de estar en ningún curso.

import React, { useState, useEffect } from 'react';
import {
  BookOpen, Search, Star, Check, Plus, Loader2, ExternalLink, FileText,
  Video, Link2, ClipboardList, Trash2, Edit, Users, CalendarClock,
  ChevronDown, ChevronUp, StarOff, ChartColumn, History,
} from 'lucide-react';
import bibliotecaService from '../../services/bibliotecaService';
import { authService } from '../../services/authService';
import { Button, Input, Badge } from '../../components/ui';
import ModalRecurso from '../../components/biblioteca/ModalRecurso';
import ModalAnaliticas from '../../components/biblioteca/ModalAnaliticas';
import { useFeedback } from '../../hooks/useFeedback';

const TIPOS = [
  { id: '', label: 'Todos' },
  { id: 'articulo', label: 'Artículos' },
  { id: 'libro', label: 'Libros' },
  { id: 'video', label: 'Videos' },
  { id: 'documento', label: 'Documentos' },
  { id: 'enlace', label: 'Enlaces' },
  { id: 'tarea', label: 'Tareas' },
];

const META_TIPO = {
  articulo: { label: 'Artículo', icon: FileText },
  libro: { label: 'Libro', icon: BookOpen },
  video: { label: 'Video', icon: Video },
  documento: { label: 'Documento', icon: FileText },
  enlace: { label: 'Enlace', icon: Link2 },
  tarea: { label: 'Tarea', icon: ClipboardList },
};

const fmtFecha = (iso) => {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString();
  } catch {
    return '';
  }
};

const BibliotecaPage = () => {
  const esStaff = ['docente', 'admin'].includes(authService.getRol());
  const { toast, confirmar } = useFeedback();

  const [recursos, setRecursos] = useState([]);
  const [temas, setTemas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  // Filtros
  const [q, setQ] = useState('');
  const [qAplicada, setQAplicada] = useState('');
  const [tipo, setTipo] = useState('');
  const [tema, setTema] = useState('');
  const [soloFavoritos, setSoloFavoritos] = useState(false);
  const [recarga, setRecarga] = useState(0);

  // UI
  const [expandido, setExpandido] = useState(null);
  const [comentarios, setComentarios] = useState({});
  const [completados, setCompletados] = useState({});
  const [modal, setModal] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [analiticas, setAnaliticas] = useState(null);

  // ✅ Búsqueda con debounce (setState dentro del timeout: no rompe la regla de hooks)
  useEffect(() => {
    const id = setTimeout(() => setQAplicada(q), 400);
    return () => clearTimeout(id);
  }, [q]);

  // ✅ Carga del feed (biblioteca abierta: sin cursos ni inscripciones)
  useEffect(() => {
    let activo = true;
    (async () => {
      const filtros = { limit: 100 };
      if (qAplicada) filtros.q = qAplicada;
      if (tipo) filtros.tipo = tipo;
      if (tema) filtros.tema = tema;
      if (soloFavoritos) filtros.favoritos = true;
      try {
        const data = await bibliotecaService.listar(filtros);
        if (activo) {
          setRecursos(Array.isArray(data) ? data : []);
          setError('');
        }
      } catch (e) {
        if (activo) setError(e?.message || 'No se pudo cargar la biblioteca');
      } finally {
        if (activo) setCargando(false);
      }
    })();
    return () => {
      activo = false;
    };
  }, [qAplicada, tipo, tema, soloFavoritos, recarga]);

  // ✅ Temas para el filtro
  useEffect(() => {
    let activo = true;
    (async () => {
      try {
        const data = await bibliotecaService.temas();
        if (activo) setTemas(Array.isArray(data) ? data : []);
      } catch {
        // Los temas son opcionales para filtrar
      }
    })();
    return () => {
      activo = false;
    };
  }, [recarga]);

  const alternarFavorito = async (recurso) => {
    try {
      const data = await bibliotecaService.alternarFavorito(recurso.id);
      setRecursos((prev) =>
        prev.map((r) => (r.id === recurso.id ? { ...r, favorito: data.activo } : r))
      );
      if (soloFavoritos && !data.activo) setRecarga((n) => n + 1);
    } catch (e) {
      toast.error(e?.message || 'No se pudo guardar el favorito');
    }
  };

  const alternarCompletado = async (recurso) => {
    try {
      const data = await bibliotecaService.alternarCompletado(
        recurso.id,
        comentarios[recurso.id] || null
      );
      setRecursos((prev) =>
        prev.map((r) =>
          r.id === recurso.id
            ? { ...r, completado: data.activo, completados_count: data.completados_count }
            : r
        )
      );
      toast.success(data.activo ? 'Marcado como completado' : 'Desmarcado');
    } catch (e) {
      toast.error(e?.message || 'No se pudo guardar el progreso');
    }
  };

  const verCompletados = async (recurso) => {
    try {
      const data = await bibliotecaService.listarCompletados(recurso.id);
      setCompletados((prev) => ({
        ...prev,
        [recurso.id]: Array.isArray(data) ? data : [],
      }));
    } catch (e) {
      toast.error(e?.message || 'No se pudo cargar la lista de alumnos');
    }
  };

  const guardar = async (payload) => {
    setGuardando(true);
    try {
      if (modal?.recurso) {
        await bibliotecaService.actualizar(modal.recurso.id, payload);
      } else {
        await bibliotecaService.crear(payload);
      }
      setModal(null);
      setRecarga((n) => n + 1);
      toast.success(modal?.recurso ? 'Publicación actualizada' : 'Publicado en la biblioteca');
    } catch (e) {
      toast.error(e?.message || 'No se pudo guardar la publicación');
    } finally {
      setGuardando(false);
    }
  };

  const despublicar = async (recurso) => {
    const ok = await confirmar({
      titulo: 'Despublicar',
      mensaje: `¿Quitar "${recurso.titulo}" de la biblioteca?`,
      confirmText: 'Quitar',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await bibliotecaService.eliminar(recurso.id);
      setRecarga((n) => n + 1);
      toast.success('Recurso despublicado');
    } catch (e) {
      toast.error(e?.message || 'No se pudo despublicar');
    }
  };

  const linkPublico = (recurso) =>
    `${window.location.origin}/biblioteca/recurso/${recurso.token}`;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BookOpen className="w-6 h-6" style={{ color: '#0f766e' }} />
            Biblioteca
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Recursos y tareas abiertos para todos los alumnos
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            onClick={() => setAnaliticas(esStaff ? 'docente' : 'alumno')}
          >
            {esStaff ? <ChartColumn className="w-4 h-4" /> : <History className="w-4 h-4" />}
            {esStaff ? 'Analíticas' : 'Mi actividad'}
          </Button>
          {esStaff && (
            <Button variant="primary" onClick={() => setModal({ recurso: null })}>
              <Plus className="w-4 h-4" />
              Publicar
            </Button>
          )}
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <Input
            icon={<Search className="w-4 h-4" />}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onClear={() => setQ('')}
            clearable
            placeholder="Buscar por título, descripción o tema…"
          />
          <select
            value={tema}
            onChange={(e) => setTema(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:border-[#0f766e] bg-white sm:w-56"
          >
            <option value="">Todos los temas</option>
            {temas.map((t) => (
              <option key={t.tema} value={t.tema}>
                {t.tema} ({t.total})
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {TIPOS.map((t) => (
            <button
              key={t.id || 'todos'}
              type="button"
              onClick={() => setTipo(t.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                tipo === t.id
                  ? 'border-[#0f766e] bg-[#0f766e]/10 text-[#0f766e]'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {t.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setSoloFavoritos((v) => !v)}
            className={`ml-auto px-3 py-1.5 text-xs font-medium rounded-lg border flex items-center gap-1.5 transition-colors ${
              soloFavoritos
                ? 'border-amber-300 bg-amber-50 text-amber-700'
                : 'border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Star className="w-3.5 h-3.5" />
            Mis favoritos
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-lg">
          {error}
          <button onClick={() => setRecarga((n) => n + 1)} className="ml-3 underline">
            Reintentar
          </button>
        </div>
      )}

      {/* Feed */}
      {cargando ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      ) : recursos.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 border border-gray-200 rounded-2xl">
          <BookOpen className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">
            {soloFavoritos
              ? 'Todavía no marcaste favoritos.'
              : 'La biblioteca está vacía por ahora.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {recursos.map((recurso) => {
            const meta = META_TIPO[recurso.tipo] || META_TIPO.articulo;
            const Icono = meta.icon;
            const abierto = expandido === recurso.id;
            return (
              <div
                key={recurso.id}
                className={`bg-white border rounded-2xl overflow-hidden flex flex-col ${
                  recurso.destacado ? 'border-amber-300' : 'border-gray-200'
                }`}
              >
                {recurso.portada_url && (
                  <img
                    src={recurso.portada_url}
                    alt=""
                    className="w-full h-32 object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                )}
                <div className="p-4 flex-1 flex flex-col gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <Icono className="w-4.5 h-4.5 text-gray-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={recurso.tipo === 'tarea' ? 'warning' : 'default'} size="sm">
                          {meta.label}
                        </Badge>
                        {recurso.tema && (
                          <span className="text-[11px] text-gray-400">{recurso.tema}</span>
                        )}
                        {recurso.destacado && (
                          <span className="text-[11px] text-amber-600 font-medium">Destacado</span>
                        )}
                      </div>
                      <h3 className="text-sm font-semibold text-gray-900 mt-1 break-words">
                        {recurso.titulo}
                      </h3>
                    </div>
                    <button
                      onClick={() => alternarFavorito(recurso)}
                      title={recurso.favorito ? 'Quitar de favoritos' : 'Guardar en favoritos'}
                      className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"
                    >
                      {recurso.favorito ? (
                        <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                      ) : (
                        <StarOff className="w-4 h-4" />
                      )}
                    </button>
                  </div>

                  {recurso.descripcion && (
                    <p className={`text-sm text-gray-500 ${abierto ? '' : 'line-clamp-2'}`}>
                      {recurso.descripcion}
                    </p>
                  )}

                  <div className="flex items-center gap-3 text-[11px] text-gray-400 flex-wrap">
                    <span>{recurso.autor_nombre || 'Docente'}</span>
                    <span>·</span>
                    <span>{fmtFecha(recurso.created_at)}</span>
                    {recurso.tipo === 'tarea' && recurso.fecha_limite && (
                      <>
                        <span>·</span>
                        <span
                          className={`flex items-center gap-1 ${
                            recurso.vencida ? 'text-red-500' : ''
                          }`}
                        >
                          <CalendarClock className="w-3 h-3" />
                          {recurso.vencida ? 'Vencida' : 'Hasta'} {fmtFecha(recurso.fecha_limite)}
                        </span>
                      </>
                    )}
                    {recurso.completados_count > 0 && (
                      <>
                        <span>·</span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {recurso.completados_count}
                        </span>
                      </>
                    )}
                  </div>

                  {/* Detalle expandido */}
                  {abierto && (
                    <div className="space-y-3 border-t border-gray-100 pt-3">
                      {recurso.contenido && (
                        <div className="text-sm text-gray-700 whitespace-pre-wrap break-words max-h-64 overflow-y-auto">
                          {recurso.contenido}
                        </div>
                      )}

                      {recurso.url && (
                        <a
                          href={recurso.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => {
                            // ✅ Rastro: el autor no se cuenta a sí mismo
                            if (!recurso.es_autor) {
                              bibliotecaService
                                .registrarEvento(recurso.id, 'descarga')
                                .catch(() => null);
                            }
                          }}
                          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold"
                          style={{ backgroundColor: '#0f766e' }}
                        >
                          <ExternalLink className="w-4 h-4" />
                          {recurso.tipo === 'video' ? 'Ver video' : 'Abrir recurso'}
                        </a>
                      )}

                      {recurso.tipo === 'tarea' && (
                        <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 space-y-2">
                          <textarea
                            value={comentarios[recurso.id] || ''}
                            onChange={(e) =>
                              setComentarios((prev) => ({ ...prev, [recurso.id]: e.target.value }))
                            }
                            rows={2}
                            placeholder="Dejá tu comentario o respuesta (opcional)"
                            className="w-full px-3 py-2 text-sm border border-orange-200 rounded-lg outline-none bg-white"
                          />
                          <Button
                            variant={recurso.completado ? 'secondary' : 'primary'}
                            size="sm"
                            onClick={() => alternarCompletado(recurso)}
                          >
                            <Check className="w-4 h-4" />
                            {recurso.completado ? 'Marcada como hecha' : 'Marcar como hecha'}
                          </Button>
                        </div>
                      )}

                      {recurso.token && (
                        <button
                          onClick={() => {
                            navigator.clipboard?.writeText(linkPublico(recurso));
                            toast.success('Link público copiado');
                          }}
                          className="text-xs text-gray-500 hover:text-gray-700 underline"
                        >
                          Copiar link público
                        </button>
                      )}

                      {/* Gestión del autor */}
                      {recurso.es_autor && (
                        <div className="flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setModal({ recurso })}
                          >
                            <Edit className="w-3.5 h-3.5" />
                            Editar
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => verCompletados(recurso)}
                          >
                            <Users className="w-3.5 h-3.5" />
                            Ver alumnos ({recurso.completados_count})
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => despublicar(recurso)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Quitar
                          </Button>
                          {completados[recurso.id] && (
                            <div className="w-full text-xs text-gray-600 space-y-1 mt-1">
                              {completados[recurso.id].length === 0 ? (
                                <p className="text-gray-400">Nadie la completó todavía.</p>
                              ) : (
                                completados[recurso.id].map((c) => (
                                  <p key={c.usuario_id}>
                                    <span className="font-medium">
                                      {c.usuario_nombre || 'Alumno'}
                                    </span>
                                    {c.comentario ? ` — ${c.comentario}` : ''}
                                  </p>
                                ))
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  <button
                    onClick={() => setExpandido(abierto ? null : recurso.id)}
                    className="mt-auto text-xs font-medium text-[#0f766e] hover:underline flex items-center gap-1"
                  >
                    {abierto ? (
                      <>
                        <ChevronUp className="w-3.5 h-3.5" /> Ver menos
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-3.5 h-3.5" /> Ver más
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modal && (
        <ModalRecurso
          key={modal.recurso?.id || 'nuevo'}
          recurso={modal.recurso}
          onCerrar={() => setModal(null)}
          onGuardar={guardar}
          guardando={guardando}
        />
      )}

      {analiticas && (
        <ModalAnaliticas modo={analiticas} onCerrar={() => setAnaliticas(null)} />
      )}
    </div>
  );
};

export default BibliotecaPage;
