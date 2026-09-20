// front/src/components/cursos/DetalleCurso.jsx
// VERSIÓN COMPLETA ACTUALIZADA - NAVEGACIÓN CORREGIDA

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Play, Users, BookOpen,
  Award, CheckCircle, Loader2,
  FileText, Video, ChevronDown,
  Lock, DollarSign,
  CreditCard, Send, AlertCircle, Check,
  Settings, GraduationCap, MessageSquare,
  BarChart3, Eye, Download, ThumbsUp,
  Pause, FolderOpen, User, X, Layers,
  ChevronLeft, ChevronRight, Sparkles,
  Globe, Target, Star, EyeOff, Info, Edit3
} from 'lucide-react';
import cursosService from '../../services/cursosService';
import certificadosService from '../../services/certificadosService';
import examenesService from '../../services/examenesService';
import { authService } from '../../services/authService';
import { useModo } from '../../hooks/useModo';
import { Badge, Button } from '../ui';
import ForoCurso from './ForoCurso';
import CalificacionesEstudiante from './CalificacionesEstudiante';
import EstudiantesCurso from './EstudiantesCurso';
import VerCertificado from '../certificados/VerCertificado';
import PanelSolicitudes from '../docente/PanelSolicitudes';
import ExamenActivo from '../examenes/ExamenActivo';
import CourseImage from './CourseImage';
import { useFeedback } from '../../hooks/useFeedback';

import VideoPlayer from './VideoPlayer';
import RichTextDisplay from './RichTextDisplay';
import RecursosDisplay from './RecursosDisplay';
import ComentariosLeccion from './ComentariosLeccion';
import LeccionItem from './LeccionItem';
import {
  getBloquesDeLeccion, getTipoLeccion, getTipoLabel
} from './leccionUtils';

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================
const DetalleCurso = ({ 
  cursoId: cursoIdProp = null,
  usuarioId = null, 
  onVolver, 
  onGenerarCertificado, 
  onEditarCurso 
}) => {
  const { cursoId: cursoIdParams } = useParams();
  const cursoId = cursoIdProp || cursoIdParams;
  const navigate = useNavigate();
  const { toast } = useFeedback();

  const [tabActiva, setTabActiva] = useState('contenido');
  const [curso, setCurso] = useState(null);
  const [progreso, setProgreso] = useState(0);
  const [leccionesCompletadas, setLeccionesCompletadas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [moduloAbierto, setModuloAbierto] = useState([]);
  const [tieneAcceso, setTieneAcceso] = useState(false);
  const [tieneSolicitudPendiente, setTieneSolicitudPendiente] = useState(false);
  const [solicitando, setSolicitando] = useState(false);
  const [mensajeSolicitud, setMensajeSolicitud] = useState('');
  const [mostrarFormularioSolicitud, setMostrarFormularioSolicitud] = useState(false);

  const [leccionActual, setLeccionActual] = useState(null);
  const [moduloActual, setModuloActual] = useState(null);
  const [mostrandoLeccion, setMostrandoLeccion] = useState(false);
  const [videoCompletado, setVideoCompletado] = useState(false);
  const [marcando, setMarcando] = useState(false);
  // ✅ RENDIMIENTO: tiempo en lección en un ref (no dispara re-render cada segundo).
  // Solo se lee al intentar completar la lección.
  const tiempoEnLeccionRef = useRef(0);

  // ✅ ESTADOS PARA EXAMEN
  const [examenActivo, setExamenActivo] = useState(null);
  const [cargandoExamen, setCargandoExamen] = useState(false);
  const [errorExamen, setErrorExamen] = useState('');

  const [certificado, setCertificado] = useState(null);
  const [cursoCompletado, setCursoCompletado] = useState(false);
  const [certificadosCurso, setCertificadosCurso] = useState([]);
  const [cargandoCertificados, setCargandoCertificados] = useState(false);
  const [verCertificadoId, setVerCertificadoId] = useState(null);
  
  // Estado de bloqueo de leccion individual (consultado al backend)
  const [leccionBloqueadaInfo, setLeccionBloqueadaInfo] = useState(null);

  const usuario = authService.getCurrentUser();
  const { esModoEstudiante } = useModo();
  // ✅ En modo estudiante, un docente/admin se comporta como alumno (sin controles de gestión).
  const esDocente = (usuario?.rol === 'docente' || usuario?.rol === 'admin') && !esModoEstudiante;
  const esEstudiante = usuario?.rol === 'estudiante' || esModoEstudiante;

  // ✅ HANDLER CORREGIDO PARA VOLVER A CURSOS
  const handleVolverCursos = () => {
    // Si hay una función onVolver prop, usarla
    if (onVolver) {
      onVolver();
      return;
    }

    // Navegar a la ruta correcta según el MODO activo
    if (esModoEstudiante) {
      navigate('/estudiante/cursos');
      return;
    }
    const rol = usuario?.rol || 'estudiante';
    if (rol === 'admin') {
      navigate('/admin/cursos');
    } else if (rol === 'docente') {
      navigate('/docente/cursos');
    } else {
      navigate('/estudiante/cursos');
    }
  };

  const tabs = useMemo(() => [
    { id: 'contenido', label: 'Contenido', icon: BookOpen, visible: true },
    { id: 'foro', label: 'Foro', icon: MessageSquare, visible: true },
    ...(esEstudiante ? [{ id: 'calificaciones', label: 'Calificaciones', icon: BarChart3, visible: true }] : []),
    ...(esDocente ? [{ id: 'estudiantes', label: 'Estudiantes', icon: Users, visible: true }] : []),
    ...(esDocente ? [{ id: 'solicitudes', label: 'Solicitudes', icon: Send, visible: true }] : []),
    ...(esDocente ? [{ id: 'certificados', label: 'Certificados', icon: Award, visible: true }] : []),
    ...(esDocente && onEditarCurso ? [{ id: 'configuracion', label: 'Configuración', icon: Settings, visible: true }] : []),
  ].filter(t => t.visible), [esEstudiante, esDocente, onEditarCurso]);

  // Cargar curso
  useEffect(() => {
    const cargarCurso = async () => {
      if (!cursoId) {
        setError('ID del curso no proporcionado');
        setCargando(false);
        return;
      }
      
      setCargando(true);
      setError('');
      try {
        const data = await cursosService.obtener(cursoId);
        setCurso(data);
        setModuloAbierto(data?.modulos?.[0]?.id ? [data.modulos[0].id] : []);
        setTieneAcceso(data?.tiene_acceso || false);
        setTieneSolicitudPendiente(data?.tiene_solicitud_pendiente || false);

        if (usuarioId && !esDocente) {
          if (data.tiene_acceso || data.precio_tipo !== 'pago') {
            try {
              const prog = await cursosService.obtenerProgreso(cursoId, usuarioId);
              setProgreso(prog?.progreso || 0);
              setLeccionesCompletadas(prog?.lecciones_completadas || []);
              setCursoCompletado(prog?.completado || false);
            } catch (e) {
              console.warn('No se pudo obtener progreso:', e);
            }
            try {
              const certs = await certificadosService.listar({ curso_id: cursoId, estudiante_id: usuarioId });
              const activos = (Array.isArray(certs) ? certs : []).filter(c => c.estado !== 'cancelado');
              setCertificado(activos[0] || null);
            } catch (e) {
              console.warn('No se pudo obtener certificado:', e);
            }
          } else {
            setProgreso(0);
            setLeccionesCompletadas([]);
          }
        }
      } catch (e) {
        console.error('Error cargando curso:', e);
        setError(e.message || 'No se pudo cargar el curso');
      } finally {
        setCargando(false);
      }
    };
    cargarCurso();
  }, [cursoId, usuarioId, esDocente]);

  // El progreso y completado vienen del backend (inscripcion.progreso / inscripcion.completado)
  // NO se recalcula localmente para evitar desincronizacion.
  // Los valores se actualizan cuando se carga el curso o se completa una leccion.

  // Timer para trackear tiempo en la leccion
  useEffect(() => {
    if (!mostrandoLeccion || !leccionActual?.id) return;
    
    // Reiniciar el contador al entrar a una nueva lección
    tiempoEnLeccionRef.current = 0;
    
    const interval = setInterval(() => {
      tiempoEnLeccionRef.current += 1000;
    }, 1000);
    
    return () => clearInterval(interval);
  }, [mostrandoLeccion, leccionActual?.id]);

  // Helpers para bloqueo secuencial de modulos
  const getLeccionesDeModulo = useCallback((modulo) => {
    if (!modulo?.lecciones) return [];
    return modulo.lecciones.filter(l => l && l.id);
  }, []);

  const isModuloCompleto = useCallback((modulo) => {
    const lecciones = getLeccionesDeModulo(modulo);
    if (lecciones.length === 0) return false;
    return lecciones.every(l => leccionesCompletadas.includes(l.id));
  }, [getLeccionesDeModulo, leccionesCompletadas]);

  const isModuloBloqueado = useCallback((modulo) => {
    // Si es docente o admin, nunca bloquear
    if (esDocente) return false;
    
    // Si el curso es de pago y no tiene acceso, bloquear todo
    if (curso?.precio_tipo === 'pago' && !tieneAcceso) return true;
    
    // Si tipo_bloqueo es 'ninguno', no bloquear
    if (curso?.tipo_bloqueo === 'ninguno' || !curso?.tipo_bloqueo) return false;
    
    // Si tipo_bloqueo es 'secuencial' o 'mixto', verificar modulo anterior
    if (curso?.tipo_bloqueo === 'secuencial' || curso?.tipo_bloqueo === 'mixto') {
      const modulos = curso?.modulos || [];
      const idxActual = modulos.findIndex(m => m.id === modulo.id);
      
      // El primer modulo nunca esta bloqueado
      if (idxActual <= 0) return false;
      
      // Verificar que todos los modulos anteriores esten completos
      for (let i = 0; i < idxActual; i++) {
        if (!isModuloCompleto(modulos[i])) return true;
      }
    }
    
    return false;
  }, [esDocente, curso, tieneAcceso, isModuloCompleto]);

  // Handlers
  const handleAbrirLeccion = useCallback(async (modulo, leccion) => {
    // Verificar bloqueo de pago
    if (curso?.precio_tipo === 'pago' && !tieneAcceso && !esDocente) {
      toast.warning('Este curso requiere acceso. Solicita acceso al docente.');
      return;
    }
    
    // Verificar bloqueo a nivel de leccion via backend (secuencial, fecha, desempeno)
    if (esEstudiante && curso?.tipo_bloqueo && curso.tipo_bloqueo !== 'ninguno') {
      try {
        const estadoBloqueo = await cursosService.verificarBloqueoLeccion(curso.id, leccion.id);
        if (estadoBloqueo?.bloqueada) {
          setLeccionBloqueadaInfo(estadoBloqueo);
          toast.warning(estadoBloqueo.razon || 'Esta leccion esta bloqueada. Completa las lecciones anteriores primero.');
          return;
        }
        setLeccionBloqueadaInfo(null);
      } catch (e) {
        // Si el endpoint falla, permitir acceso pero registrar el error
        console.warn('Error verificando bloqueo:', e);
        setLeccionBloqueadaInfo(null);
      }
    } else {
      setLeccionBloqueadaInfo(null);
    }
    
    setModuloActual(modulo);
    setLeccionActual(leccion);
    setMostrandoLeccion(true);
    setVideoCompletado(false);
    tiempoEnLeccionRef.current = 0;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [curso, tieneAcceso, esDocente, esEstudiante, toast]);

  const handleCerrarLeccion = () => {
    setMostrandoLeccion(false);
    setLeccionActual(null);
    setModuloActual(null);
  };

  const handleVideoComplete = useCallback(() => {
    setVideoCompletado(true);
  }, []);

  const handleMarcarCompletada = async () => {
    if (!usuarioId || !curso?.id || !leccionActual?.id) return;
    if (leccionesCompletadas.includes(leccionActual.id)) return;

    // Verificar que el contenido fue consumido realmente
    const tieneVideo = leccionActual?.bloques?.some(b => b.tipo === 'video');
    const tieneTexto = leccionActual?.bloques?.some(b => b.tipo === 'texto');
    
    // Si tiene video, exigir que este marcado como completado
    if (tieneVideo && !videoCompletado) {
      toast.warning('Debes ver el video completo antes de marcar la leccion como completada.');
      return;
    }
    
    // Si tiene solo texto (sin video), minimum time check
    if (tieneTexto && !tieneVideo) {
      // Para texto, dar 3 segundos minimo de lectura
      const tiempoMinimo = 3000;
      if (tiempoEnLeccionRef.current < tiempoMinimo) {
        const segundos = Math.ceil((tiempoMinimo - tiempoEnLeccionRef.current) / 1000);
        toast.warning(`Debes al menos ${segundos} segundo(s) mas leyendo el contenido antes de marcar como completada.`);
        return;
      }
    }

    setMarcando(true);
    try {
      await cursosService.completarLeccion(curso.id, leccionActual.id, usuarioId);
      const prog = await cursosService.obtenerProgreso(cursoId, usuarioId);
      setProgreso(prog?.progreso || 0);
      setLeccionesCompletadas(prog?.lecciones_completadas || []);
      setCursoCompletado(prog?.completado || false);
      setVideoCompletado(true);
      
      // Si el curso se completo, cargar el certificado
      if (prog?.completado) {
        setTimeout(async () => {
          try {
            const certs = await certificadosService.listar({ curso_id: cursoId, estudiante_id: usuarioId });
            const activos = (Array.isArray(certs) ? certs : []).filter(c => c.estado !== 'cancelado');
            setCertificado(activos[0] || null);
          } catch (e) {
            console.warn('Certificado aun no disponible:', e);
          }
        }, 1000);
      }
    } catch (error) {
      const mensaje = error?.response?.data?.detail || error?.message || 'Error al completar la leccion';
      toast.error(mensaje);
      console.error('Error completando leccion:', error);
    } finally {
      setMarcando(false);
    }
  };

  const handleSolicitarAcceso = async () => {
    if (!mensajeSolicitud.trim()) {
      toast.warning('Por favor, escribe un mensaje para el docente');
      return;
    }
    setSolicitando(true);
    try {
      await cursosService.solicitarAcceso(cursoId, {
        mensaje_estudiante: mensajeSolicitud
      });
      setTieneSolicitudPendiente(true);
      setMostrarFormularioSolicitud(false);
      setMensajeSolicitud('');
      toast.success('Solicitud enviada.');
    } catch (e) {
      toast.error(e.message || 'No se pudo enviar la solicitud');
    } finally {
      setSolicitando(false);
    }
  };

  const handleCertificado = (idCurso) => {
    if (onGenerarCertificado) {
      onGenerarCertificado(idCurso);
      return;
    }
    if (esDocente) {
      setTabActiva('certificados');
      cargarCertificadosCurso();
      return;
    }
    navigate('/estudiante/certificados');
  };

  const cargarCertificadosCurso = async () => {
    setCargandoCertificados(true);
    try {
      const certs = await certificadosService.listar({ curso_id: cursoId });
      setCertificadosCurso(Array.isArray(certs) ? certs : []);
    } catch {
      setCertificadosCurso([]);
    } finally {
      setCargandoCertificados(false);
    }
  };

  // Renderizar contenido de la lección
  const renderContenidoLeccion = () => {
    if (!leccionActual) return null;
    
    const bloques = getBloquesDeLeccion(leccionActual);
    const tipoLeccion = getTipoLeccion(leccionActual);
    const estaBloqueado = curso?.precio_tipo === 'pago' && !tieneAcceso && !esDocente;

    // ✅ CORREGIDO: Lecciones tipo examen o quiz no tienen bloques — manejar directamente
    if (bloques.length === 0) {
      // Si hay examen activo cargado, mostrar ExamenActivo
      if (tipoLeccion === 'examen' && examenActivo) {
        return (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden" style={{ minHeight: '600px' }}>
            <ExamenActivo
              examen={examenActivo}
              alumno={{
                id: usuario?.id || usuarioId,
                nombres: usuario?.nombres,
                apellidos: usuario?.apellidos,
                nombre: usuario?.nombre_completo,
                grado: usuario?.grado,
                dni: usuario?.dni,
              }}
              onFinalizar={(resultado) => {
                setExamenActivo(null);
                // ✅ CORREGIDO: Enviar nota del examen al progreso del curso
                if (curso?.id && leccionActual?.id && usuarioId) {
                  const calificacion = resultado?.calificacion || 0;
                  const aprobado = calificacion >= (examenActivo?.puntaje_aprobacion || 60);
                  cursosService.completarLeccion(
                    curso.id, leccionActual.id, usuarioId, 0,
                    calificacion, aprobado
                  ).catch(() => {});
                }
              }}
              onAbandonar={() => {
                setExamenActivo(null);
              }}
            />
          </div>
        );
      }

      // Si hay examen cargando
      if (tipoLeccion === 'examen' && cargandoExamen) {
        return (
          <div className="flex flex-col items-center justify-center min-h-[300px] bg-white rounded-xl border border-gray-200">
            <Loader2 className="w-8 h-8 animate-spin text-[#0f766e] mx-auto mb-3" />
            <p className="text-gray-500 text-sm">Cargando examen...</p>
          </div>
        );
      }

      // Si hubo error cargando examen
      if (tipoLeccion === 'examen' && errorExamen) {
        return (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
            <AlertCircle className="w-12 h-12 text-red-300 mx-auto mb-2" />
            <p className="text-red-500 font-medium">{errorExamen}</p>
            <button onClick={() => setErrorExamen('')}
              className="mt-3 px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
              Volver
            </button>
          </div>
        );
      }

      // Lecciones tipo examen sin cargar — mostrar botón para iniciar
      if (tipoLeccion === 'examen') {
        const contenidoLeccion = leccionActual.contenido || {};
        return (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <Award className="w-16 h-16 text-amber-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Examen</h3>
            <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
              Responde todas las preguntas dentro del tiempo límite. Tu calificación se calculará automáticamente.
            </p>
            {contenidoLeccion.examen_id ? (
              <button
                onClick={async () => {
                  if (!contenidoLeccion.examen_id) return;
                  setCargandoExamen(true);
                  setErrorExamen('');
                  try {
                    const datos = await examenesService.obtenerExamen(contenidoLeccion.examen_id);
                    setExamenActivo(datos);
                  } catch {
                    setErrorExamen('No se pudo cargar el examen. Intenta de nuevo.');
                  } finally {
                    setCargandoExamen(false);
                  }
                }}
                disabled={estaBloqueado}
                className="px-8 py-3 bg-[#0f766e] text-white rounded-lg hover:bg-[#0d5e57] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {estaBloqueado ? 'Examen bloqueado' : 'Comenzar examen'}
              </button>
            ) : (
              <p className="text-sm text-gray-400">Sin examen asignado</p>
            )}
          </div>
        );
      }

      // Para cualquier otro tipo sin bloques
      return (
        <div className="text-center py-12 text-gray-400 bg-white rounded-xl border border-gray-200">
          <FileText className="w-12 h-12 mx-auto mb-2 text-gray-300" />
          <p>Esta lección no tiene contenido</p>
        </div>
      );
    }

    // Lección con bloques: renderizar TODOS los bloques con su componente real
    return renderTodosLosBloques();
  };

  // Renderizar un bloque individual con su componente real
  const renderBloque = (bloque, _index, estaBloqueado) => {
    const contenido = bloque.contenido || {};

    switch (bloque.tipo) {
      case 'video':
        return <VideoPlayer
          videoId={contenido.video_url}
          isBlocked={estaBloqueado}
          onComplete={handleVideoComplete}
        />;

      case 'texto':
        return (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <RichTextDisplay content={contenido.texto || ''} isBlocked={estaBloqueado} />
          </div>
        );

      case 'recurso':
        return (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <RecursosDisplay recursos={contenido.archivos || []} isBlocked={estaBloqueado} />
          </div>
        );

      case 'examen': {
        if (estaBloqueado) {
          return (
            <div className="flex flex-col items-center justify-center min-h-[200px] bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 p-8">
              <Lock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-400 font-medium">Examen bloqueado</p>
              <p className="text-sm text-gray-300">Solicita acceso para realizar este examen</p>
            </div>
          );
        }

        // ✅ Examen de ESTE bloque activo — renderizar el reproductor real
        const examenEsDeEsteBloque = examenActivo &&
          (!contenido.examen_id || String(examenActivo.id) === String(contenido.examen_id));

        if (examenEsDeEsteBloque) {
          return (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden" style={{ minHeight: '600px' }}>
              <ExamenActivo
                examen={examenActivo}
                alumno={{
                  id: usuario?.id || usuarioId,
                  nombres: usuario?.nombres,
                  apellidos: usuario?.apellidos,
                  nombre: usuario?.nombre_completo,
                  grado: usuario?.grado,
                  dni: usuario?.dni,
                }}
                onFinalizar={(resultado) => {
                  setExamenActivo(null);
                  // ✅ CORREGIDO: Enviar nota del examen al progreso del curso
                  if (curso?.id && leccionActual?.id && usuarioId) {
                    const calificacion = resultado?.calificacion || 0;
                    const aprobado = calificacion >= (examenActivo?.puntaje_aprobacion || 60);
                    cursosService.completarLeccion(
                      curso.id, leccionActual.id, usuarioId, 0,
                      calificacion, aprobado
                    ).catch(() => {});
                  }
                }}
                onAbandonar={() => setExamenActivo(null)}
              />
            </div>
          );
        }

        if (cargandoExamen) {
          return (
            <div className="flex flex-col items-center justify-center min-h-[300px] bg-white rounded-xl border border-gray-200">
              <Loader2 className="w-8 h-8 animate-spin text-[#0f766e] mx-auto mb-3" />
              <p className="text-gray-500 text-sm">Cargando examen...</p>
            </div>
          );
        }

        if (errorExamen) {
          return (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
              <AlertCircle className="w-12 h-12 text-red-300 mx-auto mb-2" />
              <p className="text-red-500 font-medium">{errorExamen}</p>
              <button onClick={() => setErrorExamen('')}
                className="mt-3 px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
                Volver
              </button>
            </div>
          );
        }

        return (
          <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
            <Award className="w-12 h-12 text-amber-500 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-gray-900">Examen</h3>
            <p className="text-sm text-gray-500 mb-4">
              {contenido.examen_id ? 'Examen asignado' : 'Sin examen asignado'}
            </p>
            {contenido.examen_id ? (
              <button
                onClick={async () => {
                  setCargandoExamen(true);
                  setErrorExamen('');
                  try {
                    const datos = await examenesService.obtenerExamen(contenido.examen_id);
                    setExamenActivo(datos);
                  } catch {
                    setErrorExamen('No se pudo cargar el examen. Intenta de nuevo.');
                  } finally {
                    setCargandoExamen(false);
                  }
                }}
                className="px-6 py-2 bg-[#0f766e] text-white rounded-lg hover:bg-[#0d5e57] transition-colors text-sm"
              >
                Comenzar examen
              </button>
            ) : (
              <p className="text-sm text-gray-400">Sin examen asignado</p>
            )}
          </div>
        );
      }

      case 'quiz':
        return (
          <div className="text-center py-12 text-gray-400 bg-white rounded-xl border border-gray-200">
            <BookOpen className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p>Los cuestionarios fueron integrados en el sistema de exámenes</p>
          </div>
        );

      default:
        return (
          <div className="text-center py-12 text-gray-400 bg-white rounded-xl border border-gray-200">
            <FileText className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p>Contenido no disponible</p>
          </div>
        );
    }
  };

  // Renderizar todos los bloques de la lección en orden, con su componente real
  const renderTodosLosBloques = () => {
    if (!leccionActual) return null;
    const bloques = getBloquesDeLeccion(leccionActual);
    const estaBloqueado = curso?.precio_tipo === 'pago' && !tieneAcceso && !esDocente;

    if (bloques.length === 0) {
      return (
        <div className="text-center py-12 text-gray-400 bg-white rounded-xl border border-gray-200">
          <FileText className="w-12 h-12 mx-auto mb-2 text-gray-300" />
          <p>Esta lección no tiene contenido</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {bloques.map((bloque, index) => (
          <div key={bloque.id || index}>
            {bloques.length > 1 && (
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-full bg-[#e6f4f2] flex items-center justify-center text-xs font-semibold text-[#0f766e] flex-shrink-0">
                  {index + 1}
                </div>
                <span className="text-sm font-medium text-gray-700">
                  {bloque.titulo || `Bloque ${index + 1}`}
                </span>
                <Badge variant="secondary" size="sm">{getTipoLabel(bloque.tipo)}</Badge>
              </div>
            )}
            {renderBloque(bloque, index, estaBloqueado)}
          </div>
        ))}
      </div>
    );
  };

  // ============================================================
  // RENDER
  // ============================================================

  if (cargando) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="relative">
          <div className="w-12 h-12 border-4 border-[#e6f4f2] border-t-[#0f766e] rounded-full animate-spin"></div>
        </div>
        <span className="text-sm text-gray-400 mt-4">Cargando curso...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <button onClick={() => navigate('/cursos')} className="text-gray-500 hover:text-gray-700 mb-4">
          ← Volver
        </button>
        <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-red-600 font-medium">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (!curso) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <button onClick={() => navigate('/cursos')} className="text-gray-500 hover:text-gray-700 mb-4">
          ← Volver
        </button>
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-8 text-center">
          <FolderOpen className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
          <p className="text-gray-700 font-medium">Curso no encontrado</p>
          <button onClick={() => navigate('/cursos')} className="mt-4 px-4 py-2 bg-gray-900 text-white rounded-lg">
            Volver a cursos
          </button>
        </div>
      </div>
    );
  }

  const estaBloqueado = curso?.precio_tipo === 'pago' && !tieneAcceso && !esDocente;

  // ============================================================
  // RENDER: LECCIÓN EMBEBIDA (CON SOPORTE PARA BLOQUEADO)
  // ============================================================
  if (mostrandoLeccion && leccionActual) {
    const estaCompletada = leccionesCompletadas.includes(leccionActual.id) || videoCompletado;
    const leccionesDelModulo = getLeccionesDeModulo(moduloActual || {});
    const indexActual = leccionesDelModulo.findIndex(l => l.id === leccionActual.id);
    const bloques = getBloquesDeLeccion(leccionActual);
    const esBloqueadaPorPago = curso?.precio_tipo === 'pago' && !tieneAcceso && !esDocente;
    const esBloqueadaSecuencial = leccionBloqueadaInfo?.bloqueada || false;
    const esBloqueada = esBloqueadaPorPago || esBloqueadaSecuencial;
    const razonBloqueo = leccionBloqueadaInfo?.razon || '';

    return (
      <div className="bg-[#f8f9fa] min-h-screen">
        {/* Header */}
        <div className="sticky top-0 z-20 bg-white border-b border-gray-200/50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <button onClick={handleCerrarLeccion} className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-600 flex-shrink-0">
                <ArrowLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-medium text-gray-700 truncate min-w-0">
                {leccionActual?.titulo || 'Lección'}
              </span>
              <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
                {esBloqueada && (
                  <Badge variant="secondary" size="sm" className="gap-1">
                    <Lock className="w-3 h-3" /> {esBloqueadaPorPago ? 'Vista previa' : 'Bloqueada'}
                  </Badge>
                )}
                {estaCompletada && !esBloqueada && (
                  <Badge variant="success" size="sm" className="gap-1">
                    <Check className="w-3 h-3" /> Completada
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-xs text-gray-400 hidden sm:block">
                {progreso}% completado
              </span>
              {!esBloqueada && (
                <button
                  onClick={handleMarcarCompletada}
                  disabled={marcando || estaCompletada}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
                    estaCompletada ? 'bg-emerald-50 text-emerald-600' : 'bg-[#0f766e] text-white hover:bg-[#0d5e57]'
                  } disabled:opacity-50`}
                >
                  {marcando ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : estaCompletada ? (
                    <><Check className="w-3.5 h-3.5" /> Completada</>
                  ) : (
                    <><Check className="w-3.5 h-3.5" /> Completar</>
                  )}
                </button>
              )}
              {esBloqueada && (
                <button
                  onClick={() => setMostrarFormularioSolicitud(true)}
                  className="px-3 py-1.5 text-xs font-medium text-white rounded-lg transition-colors flex items-center gap-1.5"
                  style={{ backgroundColor: '#0f766e' }}
                >
                  <Send className="w-3.5 h-3.5" /> Solicitar acceso
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Contenido */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{leccionActual?.titulo || 'Lección sin título'}</h1>
            <div className="flex items-center gap-3 mt-2 text-xs text-gray-400 flex-wrap">
              <span className="flex items-center gap-1"><BookOpen className="w-3.5 h-3.5" />{moduloActual?.titulo || 'Módulo'}</span>
              <span className="flex items-center gap-1"><Layers className="w-3.5 h-3.5" />{bloques.length} bloques</span>
              {esBloqueada && (
                <span className="flex items-center gap-1 text-amber-600">
                  <Lock className="w-3.5 h-3.5" />
                  {esBloqueadaPorPago ? 'Vista previa' : razonBloqueo || 'Bloqueada'}
                </span>
              )}
            </div>
          </div>

          {/* Contenido completo de la lección (todos los bloques, en orden) */}
          {renderContenidoLeccion()}

          {/* Comentarios (el componente ya incluye su propio encabezado) */}
          <ComentariosLeccion
            cursoId={curso?.id || cursoId}
            leccionId={leccionActual?.id}
            isBlocked={esBloqueada}
            usuario={usuario}
          />

          {/* Navegación entre lecciones */}
          {leccionesDelModulo.length > 1 && !esBloqueada && (
            <div className="flex items-center justify-between pt-6 border-t border-gray-200">
              <button
                onClick={() => {
                  if (indexActual > 0) {
                    setLeccionActual(leccionesDelModulo[indexActual - 1]);
                    setVideoCompletado(false);
                  }
                }}
                disabled={indexActual === 0}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  indexActual > 0 ? 'text-gray-600 hover:bg-gray-100' : 'text-gray-300 cursor-not-allowed'
                }`}
              >
                <ChevronLeft className="w-4 h-4" /> Anterior
              </button>
              <span className="text-xs text-gray-400">
                {indexActual + 1} / {leccionesDelModulo.length}
              </span>
              <button
                onClick={() => {
                  if (indexActual < leccionesDelModulo.length - 1) {
                    setLeccionActual(leccionesDelModulo[indexActual + 1]);
                    setVideoCompletado(false);
                  }
                }}
                disabled={indexActual === leccionesDelModulo.length - 1}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  indexActual < leccionesDelModulo.length - 1 ? 'text-gray-600 hover:bg-gray-100' : 'text-gray-300 cursor-not-allowed'
                }`}
              >
                Siguiente <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
          
          {/* Mensaje para lección bloqueada */}
          {esBloqueada && (
            <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 text-center">
              <p className="text-sm text-blue-600">
                Esta es una vista previa de la lección. Solicita acceso al docente para desbloquear todo el contenido.
              </p>
              <button
                onClick={() => setMostrarFormularioSolicitud(true)}
                className="mt-3 px-6 py-2 text-sm font-medium text-white rounded-lg transition-colors"
                style={{ backgroundColor: '#0f766e' }}
              >
                Solicitar acceso
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ============================================================
  // RENDER: VISTA PRINCIPAL DEL CURSO
  // ============================================================
  
  // Si el docente seleccionó "Ver" un certificado específico
  if (verCertificadoId) {
    return <VerCertificado certificadoId={verCertificadoId} onVolver={() => setVerCertificadoId(null)} />;
  }
  
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header - CON BOTÓN CORREGIDO */}
      <div className="flex items-center justify-between">
        <button 
          onClick={handleVolverCursos} 
          className="flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" /> Volver a cursos
        </button>
        {esDocente && (
          <button onClick={() => handleCertificado(curso.id)} className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors flex items-center gap-2 text-sm">
            <Award className="w-4 h-4" /> Certificado
          </button>
        )}
      </div>

      {/* Info del curso */}
      <div className="bg-white rounded-2xl border border-gray-200/60 overflow-hidden shadow-sm">
        {/* Imagen de portada */}
        {curso.imagen_url && (
          <div className="relative h-48 sm:h-56 bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
            <CourseImage
              src={curso.imagen_url}
              alt={curso.titulo}
              className="w-full h-full"
              imgClassName="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
          </div>
        )}
        
        <div className="p-6 space-y-4">
          <div className="flex items-start gap-4">
            {!curso.imagen_url && (
              <div className="w-14 h-14 rounded-2xl bg-[#0f766e]/10 flex items-center justify-center flex-shrink-0">
                <GraduationCap className="w-7 h-7 text-[#0f766e]" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-gray-900">{curso.titulo}</h1>
              <p className="text-sm text-gray-500 mt-1">{curso.descripcion}</p>
            </div>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100">
            <Badge variant="secondary" size="sm" className="gap-1">
              <BookOpen className="w-3 h-3" />
              {curso.modulos?.reduce((acc, m) => acc + getLeccionesDeModulo(m).length, 0) || 0} lecciones
            </Badge>
            <Badge variant="secondary" size="sm" className="gap-1">
              <Users className="w-3 h-3" />
              {curso.estudiantes_count || 0} estudiantes
            </Badge>
            <Badge variant={curso.estado === 'PUBLICADO' ? 'success' : 'default'} size="sm">
              {curso.estado || 'BORRADOR'}
            </Badge>
            {curso.nivel && <Badge variant="secondary" size="sm">{curso.nivel}</Badge>}
            {curso.categoria && <Badge variant="secondary" size="sm">{curso.categoria}</Badge>}
            {(curso.docente_nombre || curso.instructor) && (
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <User className="w-3 h-3" /> {curso.docente_nombre || curso.instructor}
              </span>
            )}
          </div>

          {/* Estado de acceso */}
          {esEstudiante && (
            <div className="pt-2 border-t border-gray-100">
              {estaBloqueado ? (
                <div className="flex items-center gap-3 text-sm bg-gray-50/50 px-4 py-2.5 rounded-xl border border-gray-100/50">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <Lock className="w-4 h-4 text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-600">
                      {tieneSolicitudPendiente 
                        ? 'Solicitud de acceso pendiente de aprobación' 
                        : 'Este curso requiere acceso para ver el contenido completo'}
                    </p>
                  </div>
                  {!tieneSolicitudPendiente && (
                    <button
                      onClick={() => setMostrarFormularioSolicitud(true)}
                      className="px-4 py-1.5 text-xs font-medium text-white rounded-lg transition-colors flex-shrink-0"
                      style={{ backgroundColor: '#0f766e' }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = '#0d5e57'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = '#0f766e'}
                    >
                      Solicitar
                    </button>
                  )}
                  {tieneSolicitudPendiente && (
                    <span className="text-xs text-amber-600 bg-amber-50 px-3 py-1 rounded-full flex-shrink-0">
                      Pendiente
                    </span>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50/50 px-4 py-2.5 rounded-xl border border-emerald-100/50 text-sm">
                  <Check className="w-4 h-4 text-emerald-500" />
                  <span>Tienes acceso completo al contenido del curso</span>
                </div>
              )}
            </div>
          )}

          {/* Progreso */}
          {(esEstudiante && (tieneAcceso || curso.precio_tipo !== 'pago')) && (
            <div className="pt-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Progreso del curso</span>
                <span className="font-medium text-gray-700">{progreso}%</span>
              </div>
              <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden mt-1">
                <div className="h-full bg-[#0f766e] rounded-full transition-all duration-500" style={{ width: `${progreso}%` }} />
              </div>
            </div>
          )}

          {/* Solicitud de acceso - Formulario */}
          {esEstudiante && estaBloqueado && mostrarFormularioSolicitud && !tieneSolicitudPendiente && (
            <div className="pt-2 border-t border-gray-100">
              <div className="bg-gray-50 rounded-xl p-4 space-y-3 border border-gray-100">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-gray-400" />
                  <p className="text-sm font-medium text-gray-700">Solicitar acceso al curso</p>
                </div>
                <p className="text-xs text-gray-400">Escribe un mensaje para el docente explicando por qué deseas acceder a este curso.</p>
                <textarea
                  value={mensajeSolicitud}
                  onChange={(e) => setMensajeSolicitud(e.target.value)}
                  placeholder="Hola, me gustaría acceder a este curso porque..."
                  rows={3}
                  className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#0f766e] focus:ring-2 focus:ring-[#0f766e]/20 transition-all resize-none bg-white"
                />
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSolicitarAcceso}
                    disabled={solicitando}
                    className="px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                    style={{ backgroundColor: '#0f766e' }}
                  >
                    {solicitando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Enviar solicitud
                  </button>
                  <button
                    onClick={() => setMostrarFormularioSolicitud(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Certificado */}
          {esEstudiante && curso?.certificado_habilitado !== false && (certificado || cursoCompletado) && (
            <div className={`rounded-xl border p-4 flex items-center justify-between ${certificado ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
              <div className="flex items-center gap-3">
                <Award className={`w-5 h-5 ${certificado ? 'text-emerald-600' : 'text-amber-600'}`} />
                <div>
                  <p className="text-sm font-medium text-gray-900">{certificado ? 'Curso completado' : 'Completa el curso para obtener tu certificado'}</p>
                  {certificado && <p className="text-xs text-gray-500">{certificado.codigo} - {new Date(certificado.fecha_emision || Date.now()).toLocaleDateString()}</p>}
                </div>
              </div>
              {certificado && (
                <button onClick={() => handleCertificado(curso.id)} className="px-4 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm">
                  Ver certificado
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-4 sm:gap-6 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = tabActiva === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setTabActiva(tab.id);
                  if (tab.id === 'certificados') cargarCertificadosCurso();
                }}
                className={`flex items-center gap-2 pb-3 text-sm font-medium transition-colors whitespace-nowrap ${
                  isActive ? 'text-[#0f766e] border-b-2 border-[#0f766e]' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <Icon className="w-4 h-4" /> {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Contenido de tabs */}
      <div>
        {tabActiva === 'contenido' && (
          <div className="space-y-4">
            {(curso.modulos || []).map((modulo) => {
              const leccionesModulo = getLeccionesDeModulo(modulo);
              const completadasModulo = leccionesModulo.filter(l => leccionesCompletadas.includes(l.id)).length;
              const totalModulo = leccionesModulo.length;
              const moduloBloqueado = isModuloBloqueado(modulo);

              return (
                <div key={modulo.id} className="bg-white rounded-xl border border-gray-200/60 overflow-hidden shadow-sm">
                  <button
                    onClick={() => setModuloAbierto(prev => 
                      prev.includes(modulo.id) 
                        ? prev.filter(id => id !== modulo.id) 
                        : [...prev, modulo.id]
                    )}
                    className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-gray-900">{modulo.titulo}</span>
                      {totalModulo > 0 && (
                        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                          {moduloBloqueado ? totalModulo : `${completadasModulo}/${totalModulo}`} lecciones
                        </span>
                      )}
                      {moduloBloqueado && (
                        <span className="text-xs text-gray-300 flex items-center gap-1">
                          <Lock className="w-3 h-3" />
                          Bloqueado
                        </span>
                      )}
                    </div>
                    <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${moduloAbierto.includes(modulo.id) ? 'rotate-180' : ''}`} />
                  </button>

                  {moduloAbierto.includes(modulo.id) && (
                    <div className="px-5 pb-4 space-y-1.5 border-t border-gray-100 pt-3">
                      {leccionesModulo.map((leccion, index) => {
                        const isCompletada = leccionesCompletadas.includes(leccion.id);
                        const esBloqueada = moduloBloqueado;

                        return (
                          <LeccionItem
                            key={leccion.id}
                            leccion={leccion}
                            index={index}
                            isCompletada={isCompletada}
                            isBloqueada={esBloqueada}
                            onClick={() => handleAbrirLeccion(modulo, leccion)}
                            modulo={modulo}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {(!curso.modulos || curso.modulos.length === 0) && (
              <div className="text-center py-16 bg-white rounded-xl border-2 border-dashed border-gray-200">
                <FolderOpen className="w-14 h-14 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 font-medium">Este curso aún no tiene contenido</p>
                {esDocente && (
                  <button onClick={() => onEditarCurso?.(curso)} className="mt-4 px-4 py-2 bg-[#0f766e] text-white rounded-lg hover:bg-[#0d5e57] transition-colors text-sm">
                    Agregar contenido
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {tabActiva === 'foro' && <ForoCurso cursoId={cursoId} />}
        {esEstudiante && tabActiva === 'calificaciones' && <CalificacionesEstudiante cursoId={cursoId} />}
        {esDocente && tabActiva === 'estudiantes' && <EstudiantesCurso cursoId={cursoId} />}
        {esDocente && tabActiva === 'solicitudes' && <PanelSolicitudes cursoId={cursoId} />}
        {esDocente && tabActiva === 'certificados' && (
          <div className="bg-white rounded-xl border border-gray-200/60 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-900">Certificados</h3>
                <p className="text-xs text-gray-400">{certificadosCurso.length} emitidos</p>
              </div>
              <button onClick={() => handleCertificado(curso.id)} className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors text-sm font-medium flex items-center gap-2">
                <Award className="w-4 h-4" /> Generar
              </button>
            </div>
            {cargandoCertificados ? (
              <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
            ) : certificadosCurso.length === 0 ? (
              <div className="text-center py-8"><Award className="w-8 h-8 text-gray-300 mx-auto mb-2" /><p className="text-sm text-gray-400">No hay certificados</p></div>
            ) : (
              <div className="divide-y divide-gray-100">
                {certificadosCurso.map((cert) => (
                  <div key={cert.id} className="px-6 py-3 flex items-center justify-between">
                    <div><p className="text-sm font-medium text-gray-800">{cert.estudiante_nombre || cert.estudiante_id}</p><p className="text-xs text-gray-400">{cert.codigo}</p></div>
                    <button onClick={() => setVerCertificadoId(cert.id)} className="px-3 py-1 text-xs text-[#0f766e] border border-[#0f766e]/20 rounded-lg hover:bg-[#e6f4f2] transition-colors">Ver</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {esDocente && tabActiva === 'configuracion' && onEditarCurso && (
          <div className="bg-white rounded-xl border border-gray-200/60 p-6">
            <h3 className="text-sm font-medium text-gray-900 mb-4">Configuración del curso</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-sm text-gray-600">Estado</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${curso.estado === 'PUBLICADO' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                  {curso.estado || 'BORRADOR'}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-sm text-gray-600">Nivel</span>
                <span className="text-sm text-gray-900">{curso.nivel || 'No definido'}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-sm text-gray-600">Categoría</span>
                <span className="text-sm text-gray-900">{curso.categoria || 'Sin categoría'}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-sm text-gray-600">Precio</span>
                <span className="text-sm text-gray-900">
                  {curso.precio_tipo === 'pago' ? `${curso.moneda} ${curso.precio_monto}` : 'Gratis'}
                </span>
              </div>
              <button onClick={() => onEditarCurso(curso)} className="mt-2 px-4 py-2 bg-[#0f766e] text-white rounded-lg hover:bg-[#0d5e57] transition-colors text-sm flex items-center gap-2">
                <Edit3 className="w-4 h-4" /> Editar curso completo
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes zoomIn95 {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-in {
          animation: fadeIn 0.2s ease-out forwards;
        }
        .zoom-in-95 {
          animation: zoomIn95 0.2s ease-out forwards;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default DetalleCurso;