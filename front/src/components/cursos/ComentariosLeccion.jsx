// front/src/components/cursos/ComentariosLeccion.jsx
// =====================================================
// COMENTARIOS DE LA LECCIÓN (API real)
//
// Consume el backend de comentarios por lección:
//   GET/POST /cursos/{cursoId}/lecciones/{leccionId}/comentarios
//   DELETE   .../comentarios/{id}
//   POST     .../comentarios/{id}/like
// El backend valida el acceso al curso y la autoría de cada comentario.
// =====================================================

import React, { useCallback, useEffect, useState } from 'react';
import { Heart, Loader2, Lock, MessageSquare, Send, Trash2 } from 'lucide-react';
import cursosService from '../../services/cursosService';
import { useFeedback } from '../../hooks/useFeedback';

const ROL_LABEL = {
  docente: 'Docente',
  admin: 'Admin',
  estudiante: 'Estudiante',
};

const formatearFecha = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('es-PE', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const inicialDe = (nombre, email) => {
  const base = (nombre || email || 'U').trim();
  return base.charAt(0).toUpperCase();
};

const ComentariosLeccion = ({
  cursoId = null,
  leccionId = null,
  isBlocked = false,
  usuario = null,
}) => {
  const { toast, confirmar } = useFeedback();

  const [comentarios, setComentarios] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [likeEnCurso, setLikeEnCurso] = useState(null);
  const [borrando, setBorrando] = useState(null);

  const tieneContexto = Boolean(cursoId && leccionId);
  const puedeParticipar = tieneContexto && !isBlocked;

  const cargar = useCallback(async () => {
    if (!puedeParticipar) return;
    setCargando(true);
    setError('');
    try {
      const data = await cursosService.listarComentariosLeccion(cursoId, leccionId);
      setComentarios(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message || 'No se pudieron cargar los comentarios');
      setComentarios([]);
    } finally {
      setCargando(false);
    }
  }, [cursoId, leccionId, puedeParticipar]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  // Sin curso/lección no hay nada que mostrar (evita peticiones inválidas).
  if (!tieneContexto) return null;

  if (isBlocked) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[200px] bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 p-8">
        <Lock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-400 font-medium">Comentarios bloqueados</p>
        <p className="text-sm text-gray-300">Solicita acceso para participar en los comentarios</p>
      </div>
    );
  }

  const handleEnviar = async (e) => {
    e.preventDefault();
    const contenido = texto.trim();
    if (!contenido) {
      toast.warning('Escribe un comentario antes de enviar');
      return;
    }
    setEnviando(true);
    try {
      const nuevo = await cursosService.crearComentarioLeccion(cursoId, leccionId, contenido);
      setComentarios((prev) => [...prev, nuevo]);
      setTexto('');
    } catch (err) {
      toast.error(err.message || 'No se pudo publicar el comentario');
    } finally {
      setEnviando(false);
    }
  };

  const handleLike = async (comentario) => {
    setLikeEnCurso(comentario.id);
    try {
      const res = await cursosService.darLikeComentarioLeccion(cursoId, leccionId, comentario.id);
      setComentarios((prev) =>
        prev.map((c) =>
          c.id === comentario.id
            ? { ...c, liked_by_me: res.liked, likes_count: res.likes_count }
            : c
        )
      );
    } catch (err) {
      toast.error(err.message || 'No se pudo registrar el me gusta');
    } finally {
      setLikeEnCurso(null);
    }
  };

  const handleEliminar = async (comentario) => {
    const ok = await confirmar({
      titulo: 'Eliminar comentario',
      mensaje: '¿Seguro que quieres eliminar este comentario? Esta acción no se puede deshacer.',
      confirmText: 'Eliminar',
      variant: 'danger',
    });
    if (!ok) return;

    setBorrando(comentario.id);
    try {
      await cursosService.eliminarComentarioLeccion(cursoId, leccionId, comentario.id);
      setComentarios((prev) => prev.filter((c) => c.id !== comentario.id));
      toast.success('Comentario eliminado');
    } catch (err) {
      toast.error(err.message || 'No se pudo eliminar el comentario');
    } finally {
      setBorrando(null);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      {/* Encabezado */}
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare className="w-5 h-5 text-[#0f766e]" />
        <h3 className="text-sm font-semibold text-gray-800">
          Comentarios{comentarios.length > 0 ? ` (${comentarios.length})` : ''}
        </h3>
      </div>

      {/* Formulario */}
      <form onSubmit={handleEnviar} className="flex items-start gap-3 mb-6">
        <div className="w-9 h-9 rounded-full bg-[#e6f4f2] flex items-center justify-center flex-shrink-0 text-sm font-semibold text-[#0f766e]">
          {inicialDe(usuario?.nombres || usuario?.nombre_completo, usuario?.email)}
        </div>
        <div className="flex-1 min-w-0">
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Escribe un comentario sobre esta lección..."
            rows={2}
            maxLength={2000}
            disabled={enviando}
            className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0f766e]/30 focus:border-[#0f766e] disabled:opacity-60"
          />
          <div className="flex items-center justify-between mt-2">
            <span className="text-[10px] text-gray-300">{texto.length}/2000</span>
            <button
              type="submit"
              disabled={enviando || !texto.trim()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#0f766e] rounded-lg hover:bg-[#0d5e57] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {enviando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Publicar
            </button>
          </div>
        </div>
      </form>

      {/* Lista */}
      {cargando ? (
        <div className="flex items-center justify-center py-8 text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      ) : error ? (
        <div className="text-center py-8">
          <p className="text-sm text-red-500">{error}</p>
          <button
            type="button"
            onClick={cargar}
            className="mt-3 text-xs font-medium text-[#0f766e] hover:underline"
          >
            Reintentar
          </button>
        </div>
      ) : comentarios.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-12 h-12 rounded-2xl bg-[#e6f4f2] flex items-center justify-center mb-3">
            <MessageSquare className="w-6 h-6 text-[#0f766e]" />
          </div>
          <p className="text-sm font-medium text-gray-700">Aún no hay comentarios en esta lección</p>
          <p className="text-xs text-gray-400 mt-1 max-w-sm">
            Sé el primero en participar. Tus dudas y aportes ayudan a todo el grupo.
          </p>
        </div>
      ) : (
        <ul className="space-y-4">
          {comentarios.map((c) => (
            <li key={c.id} className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-[#e6f4f2] flex items-center justify-center flex-shrink-0 text-sm font-semibold text-[#0f766e]">
                {inicialDe(c.usuario_nombre)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-gray-800 truncate">
                    {c.usuario_nombre || 'Usuario'}
                  </span>
                  {c.usuario_rol && (
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 capitalize">
                      {ROL_LABEL[c.usuario_rol] || c.usuario_rol}
                    </span>
                  )}
                  {c.es_mio && (
                    <span className="text-[10px] font-medium text-[#0f766e]">Tú</span>
                  )}
                  <span className="text-[10px] text-gray-300">{formatearFecha(c.created_at)}</span>
                </div>
                <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap break-words">{c.contenido}</p>

                <div className="flex items-center gap-4 mt-1.5">
                  <button
                    type="button"
                    onClick={() => handleLike(c)}
                    disabled={likeEnCurso === c.id}
                    className={`inline-flex items-center gap-1 text-xs transition-colors disabled:opacity-50 ${
                      c.liked_by_me ? 'text-rose-500' : 'text-gray-400 hover:text-rose-500'
                    }`}
                  >
                    {likeEnCurso === c.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Heart className={`w-3.5 h-3.5 ${c.liked_by_me ? 'fill-current' : ''}`} />
                    )}
                    {c.likes_count > 0 ? c.likes_count : ''}
                  </button>

                  {c.puede_eliminar && (
                    <button
                      type="button"
                      onClick={() => handleEliminar(c)}
                      disabled={borrando === c.id}
                      className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
                    >
                      {borrando === c.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                      Eliminar
                    </button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default React.memo(ComentariosLeccion);
