// front/src/components/cursos/DetalleCurso.jsx
// VERSION PROFESIONAL - DISEÑO LIMPIO Y ORDENADO

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Play, Clock, Users, BookOpen,
  Award, CheckCircle, Loader2,
  FileText, Video, ChevronDown,
  Link as LinkIcon, Lock, DollarSign,
  CreditCard, Send, AlertCircle, Check,
  Settings, GraduationCap, MessageSquare,
  BarChart3
} from 'lucide-react';
import cursosService from '../../services/cursosService';
import certificadosService from '../../services/certificadosService';
import { authService } from '../../services/authService';
import ReproductorLeccion from './ReproductorLeccion';
import EstudiantesCurso from './EstudiantesCurso';
import ForoCurso from './ForoCurso';
import CalificacionesEstudiante from './CalificacionesEstudiante';
import PanelSolicitudes from '../docente/PanelSolicitudes';

const DetalleCurso = ({ cursoId, usuarioId = null, onVolver, onGenerarCertificado, onEditarCurso }) => {
  const navigate = useNavigate();
  const [tabActiva, setTabActiva] = useState('contenido');
  const [curso, setCurso] = useState(null);
  const [progreso, setProgreso] = useState(0);
  const [leccionesCompletadas, setLeccionesCompletadas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [moduloAbierto, setModuloAbierto] = useState(null);
  const [tieneAcceso, setTieneAcceso] = useState(false);
  const [tieneSolicitudPendiente, setTieneSolicitudPendiente] = useState(false);
  const [solicitando, setSolicitando] = useState(false);
  const [mensajeSolicitud, setMensajeSolicitud] = useState('');
  const [metodoPago, setMetodoPago] = useState('');
  const [referenciaPago, setReferenciaPago] = useState('');
  const [mostrarFormularioSolicitud, setMostrarFormularioSolicitud] = useState(false);
  
  const [reproductorAbierto, setReproductorAbierto] = useState(false);
  const [leccionActual, setLeccionActual] = useState(null);
  const [moduloActual, setModuloActual] = useState(null);
  const [leccionesDelModulo, setLeccionesDelModulo] = useState([]);
  const [certificado, setCertificado] = useState(null);
  const [cursoCompletado, setCursoCompletado] = useState(false);
  const [certificadosCurso, setCertificadosCurso] = useState([]);
  const [cargandoCertificados, setCargandoCertificados] = useState(false);

  const usuario = authService.getCurrentUser();
  const esDocente = usuario?.rol === 'docente' || usuario?.rol === 'admin';
  const esEstudiante = usuario?.rol === 'estudiante';

  // Tabs disponibles según rol
  const tabs = [
    { id: 'contenido', label: 'Contenido', icon: BookOpen, visible: true },
    { id: 'foro', label: 'Foro', icon: MessageSquare, visible: true },
    ...(esEstudiante ? [{ id: 'calificaciones', label: 'Calificaciones', icon: BarChart3, visible: true }] : []),
    ...(esDocente ? [{ id: 'estudiantes', label: 'Estudiantes', icon: Users, visible: true }] : []),
    ...(esDocente ? [{ id: 'solicitudes', label: 'Solicitudes', icon: Send, visible: true }] : []),
    ...(esDocente ? [{ id: 'certificados', label: 'Certificados', icon: Award, visible: true }] : []),
    ...(esDocente && onEditarCurso ? [{ id: 'configuracion', label: 'Configuracion', icon: Settings, visible: true }] : []),
  ].filter(t => t.visible);

  useEffect(() => {
    const cargarCurso = async () => {
      if (!cursoId) return;
      setCargando(true);
      setError('');
      try {
        const data = await cursosService.obtener(cursoId);
        setCurso(data);
        setModuloAbierto(data?.modulos?.[0]?.id ?? null);
        setTieneAcceso(data?.tiene_acceso || false);
        setTieneSolicitudPendiente(data?.tiene_solicitud_pendiente || false);
        
        if (usuarioId && !esDocente) {
          if (data.tiene_acceso || data.precio_tipo !== 'pago') {
            try {
              const prog = await cursosService.obtenerProgreso(cursoId, usuarioId);
              setProgreso(prog?.progreso || 0);
              setLeccionesCompletadas(prog?.lecciones_completadas || []);
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

  useEffect(() => {
    if (!curso?.modulos) return;
    const total = curso.modulos.reduce((acc, m) => acc + (m.lecciones?.length || 0), 0);
    const completadas = leccionesCompletadas.length;
    const pct = total > 0 ? Math.round((completadas / total) * 100) : 0;
    setProgreso(pct);
    setCursoCompletado(total > 0 && completadas >= total);
  }, [curso, leccionesCompletadas]);

  const handleAbrirLeccion = (modulo, leccion) => {
    setModuloActual(modulo);
    setLeccionActual(leccion);
    setLeccionesDelModulo(modulo.lecciones || []);
    setReproductorAbierto(true);
  };

  const handleNavegarLeccion = (direccion) => {
    if (!leccionActual || !leccionesDelModulo.length) return;
    const index = leccionesDelModulo.findIndex(l => l.id === leccionActual.id);
    if (direccion === 'anterior' && index > 0) {
      setLeccionActual(leccionesDelModulo[index - 1]);
    } else if (direccion === 'siguiente' && index < leccionesDelModulo.length - 1) {
      setLeccionActual(leccionesDelModulo[index + 1]);
    }
  };

  const handleLeccionCompletada = async () => {
    if (!usuarioId || !cursoId || !leccionActual) return;
    try {
      const prog = await cursosService.obtenerProgreso(cursoId, usuarioId);
      setProgreso(prog?.progreso || 0);
      setLeccionesCompletadas(prog?.lecciones_completadas || []);
    } catch (e) {
      console.error('Error actualizando progreso:', e);
    }
  };

  const handleSolicitarAcceso = async () => {
    if (!mensajeSolicitud.trim()) {
      alert('Por favor, escribe un mensaje para el docente');
      return;
    }
    setSolicitando(true);
    try {
      await cursosService.solicitarAcceso(cursoId, {
        mensaje_estudiante: mensajeSolicitud,
        metodo_pago: metodoPago || undefined,
        referencia_pago: referenciaPago || undefined
      });
      setTieneSolicitudPendiente(true);
      setMostrarFormularioSolicitud(false);
      setMensajeSolicitud('');
      setMetodoPago('');
      setReferenciaPago('');
      alert('Solicitud enviada. El docente verificara el pago y activara tu acceso.');
    } catch (e) {
      console.error('Error solicitando acceso:', e);
      alert(e.message || 'No se pudo enviar la solicitud');
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
    } catch (e) {
      console.error('Error cargando certificados del curso:', e);
      setCertificadosCurso([]);
    } finally {
      setCargandoCertificados(false);
    }
  };

  const getTipoIcon = (tipo) => {
    switch(tipo) {
      case 'video': return <Video className="w-4 h-4" />;
      case 'texto': return <FileText className="w-4 h-4" />;
      case 'quiz': return <BookOpen className="w-4 h-4" />;
      case 'examen': return <Award className="w-4 h-4" />;
      case 'recurso': return <LinkIcon className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const getTipoLabel = (tipo) => {
    const labels = {
      video: 'Video',
      texto: 'Texto',
      quiz: 'Cuestionario',
      examen: 'Examen',
      recurso: 'Recurso'
    };
    return labels[tipo] || tipo;
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
      <div className="text-center py-20">
        <p className="text-red-500 text-sm mb-4">{error}</p>
        <button onClick={onVolver} className="mt-4 px-4 py-2 bg-gray-900 text-white rounded-lg">
          Volver
        </button>
      </div>
    );
  }

  if (!curso) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">Curso no encontrado</p>
        <button onClick={onVolver} className="mt-4 px-4 py-2 bg-gray-900 text-white rounded-lg">
          Volver
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      
      {/* Header - Navegacion */}
      <div className="flex items-center justify-between">
        <button
          onClick={onVolver}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a cursos
        </button>
        {esDocente && (
          <button
            onClick={() => handleCertificado(curso.id)}
            className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors flex items-center gap-2 text-sm"
          >
            <Award className="w-4 h-4" />
            Certificado
          </button>
        )}
      </div>

      {/* Informacion del curso */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h1 className="text-2xl font-bold text-gray-900">{curso.titulo}</h1>
          <p className="text-sm text-gray-500 mt-1">{curso.descripcion}</p>
          
          <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {curso.duracion || 'Sin duracion'}
            </span>
            <span className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              {curso.estudiantes_count || 0} estudiantes
            </span>
            <span className="flex items-center gap-1">
              <BookOpen className="w-4 h-4" />
              {(curso.modulos || []).reduce((acc, m) => acc + (m.lecciones || []).length, 0)} lecciones
            </span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
              curso.estado === 'PUBLICADO' 
                ? 'bg-emerald-100 text-emerald-700' 
                : 'bg-gray-100 text-gray-600'
            }`}>
              {curso.estado || 'BORRADOR'}
            </span>
            {curso.nivel && (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                {curso.nivel}
              </span>
            )}
          </div>
        </div>

        {/* Informacion de pago */}
        {curso.precio_tipo === 'pago' && (
          <div className="px-6 py-3 bg-gray-50 border-b border-gray-100 flex flex-wrap items-center gap-4 text-sm">
            <span className="flex items-center gap-1.5 font-medium text-gray-700">
              <DollarSign className="w-4 h-4" />
              {curso.moneda} {curso.precio_monto}
            </span>
            {curso.metodo_pago && (
              <span className="flex items-center gap-1.5 text-gray-500">
                <CreditCard className="w-4 h-4" />
                {curso.metodo_pago === 'ambos' ? 'Yape / Plin' : curso.metodo_pago?.toUpperCase()}
              </span>
            )}
            {curso.numero_pago && (
              <span className="flex items-center gap-1.5 text-gray-500">
                <Send className="w-4 h-4" />
                {curso.numero_pago}
              </span>
            )}
            {curso.instrucciones_pago && (
              <span className="text-gray-400 text-xs">{curso.instrucciones_pago}</span>
            )}
          </div>
        )}

        {/* Solicitud de acceso */}
        {esEstudiante && curso.precio_tipo === 'pago' && !tieneAcceso && (
          <div className="px-6 py-3 bg-amber-50 border-b border-amber-200">
            {tieneSolicitudPendiente ? (
              <div className="flex items-center gap-2 text-amber-700">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm">Solicitud pendiente de aprobacion</span>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                {!mostrarFormularioSolicitud ? (
                  <button
                    onClick={() => setMostrarFormularioSolicitud(true)}
                    className="px-4 py-1.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm flex items-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    Solicitar acceso
                  </button>
                ) : (
                  <div className="flex items-center gap-2 flex-wrap">
                    <input
                      type="text"
                      value={mensajeSolicitud}
                      onChange={(e) => setMensajeSolicitud(e.target.value)}
                      placeholder="Mensaje para el docente..."
                      className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg outline-none focus:border-gray-400 w-48"
                    />
                    <button
                      onClick={handleSolicitarAcceso}
                      disabled={solicitando}
                      className="px-4 py-1.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm flex items-center gap-2 disabled:opacity-50"
                    >
                      {solicitando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      Enviar
                    </button>
                    <button
                      onClick={() => setMostrarFormularioSolicitud(false)}
                      className="text-sm text-gray-500 hover:text-gray-700"
                    >
                      Cancelar
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Progreso */}
      {(!esEstudiante || (esEstudiante && (tieneAcceso || curso.precio_tipo !== 'pago'))) && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-gray-700">Progreso</span>
            <span className="text-sm text-gray-500">{progreso}%</span>
          </div>
          <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-gray-900 rounded-full transition-all duration-500" style={{ width: `${progreso}%` }} />
          </div>
        </div>
      )}

      {/* Certificado */}
      {esEstudiante && curso?.certificado_habilitado !== false && (certificado || cursoCompletado) && (
        <div className={`rounded-lg border p-4 flex items-center justify-between ${
          certificado ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'
        }`}>
          <div className="flex items-center gap-3">
            <Award className={`w-5 h-5 ${certificado ? 'text-emerald-600' : 'text-amber-600'}`} />
            <div>
              <p className="text-sm font-medium text-gray-900">
                {certificado ? 'Curso completado' : 'Completa el curso para obtener tu certificado'}
              </p>
              {certificado && (
                <p className="text-xs text-gray-500">
                  {certificado.codigo} - {new Date(certificado.fecha_emision || Date.now()).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
          {certificado && (
            <button
              onClick={() => handleCertificado(curso.id)}
              className="px-4 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm"
            >
              Ver certificado
            </button>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-6 overflow-x-auto">
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
                  isActive
                    ? 'text-gray-900 border-b-2 border-gray-900'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Contenido de tabs */}
      <div>
        {/* Contenido */}
        {tabActiva === 'contenido' && (
          <div className="space-y-2">
            {(curso.modulos || []).map((modulo) => {
              const leccionesModulo = modulo.lecciones || [];
              const completadasModulo = leccionesModulo.filter(l => 
                leccionesCompletadas.includes(l.id)
              ).length;
              const totalModulo = leccionesModulo.length;
              const moduloBloqueado = curso.precio_tipo === 'pago' && !tieneAcceso && !esDocente;

              return (
                <div key={modulo.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <button
                    onClick={() => setModuloAbierto(moduloBloqueado ? null : (moduloAbierto === modulo.id ? null : modulo.id))}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {moduloBloqueado ? (
                        <Lock className="w-4 h-4 text-gray-400" />
                      ) : (
                        <span className="font-medium text-gray-900">{modulo.titulo}</span>
                      )}
                      <span className="text-xs text-gray-400">
                        {moduloBloqueado ? 'Bloqueado' : `${completadasModulo}/${totalModulo} lecciones`}
                        {!moduloBloqueado && totalModulo > 0 && (
                          <span className="ml-1">({Math.round((completadasModulo / totalModulo) * 100)}%)</span>
                        )}
                      </span>
                    </div>
                    <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${moduloAbierto === modulo.id && !moduloBloqueado ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {moduloAbierto === modulo.id && !moduloBloqueado && (
                    <div className="px-4 pb-3 space-y-1">
                      {leccionesModulo.map((leccion) => {
                        const isCompletada = leccionesCompletadas.includes(leccion.id);
                        const esExamen = leccion.tipo === 'examen';
                        return (
                          <button
                            key={leccion.id}
                            onClick={() => handleAbrirLeccion(modulo, leccion)}
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left ${
                              isCompletada ? 'bg-emerald-50 hover:bg-emerald-100' : 'hover:bg-gray-50'
                            }`}
                          >
                            {isCompletada ? (
                              <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                            ) : (
                              getTipoIcon(leccion.tipo)
                            )}
                            <span className={`text-sm flex-1 ${isCompletada ? 'text-gray-500' : 'text-gray-700'}`}>
                              {leccion.titulo}
                            </span>
                            <span className="text-xs text-gray-400 flex-shrink-0 flex items-center gap-1">
                              {getTipoLabel(leccion.tipo)}
                              {esExamen && <Award className="w-3 h-3 text-amber-500" />}
                            </span>
                            {isCompletada && <span className="text-xs text-emerald-500 flex-shrink-0">✓</span>}
                            {!isCompletada && <Play className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {moduloBloqueado && (
                    <div className="px-4 pb-3">
                      <div className="bg-gray-50 rounded-lg p-4 text-center text-sm text-gray-500">
                        <Lock className="w-6 h-6 text-gray-300 mx-auto mb-1" />
                        <p>Contenido bloqueado - requiere pago</p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Foro */}
        {tabActiva === 'foro' && <ForoCurso cursoId={cursoId} />}

        {/* Calificaciones */}
        {esEstudiante && tabActiva === 'calificaciones' && (
          <CalificacionesEstudiante cursoId={cursoId} />
        )}

        {/* Estudiantes */}
        {esDocente && tabActiva === 'estudiantes' && (
          <EstudiantesCurso cursoId={cursoId} />
        )}

        {/* Solicitudes */}
        {esDocente && tabActiva === 'solicitudes' && (
          <PanelSolicitudes cursoId={cursoId} />
        )}

        {/* Certificados */}
        {esDocente && tabActiva === 'certificados' && (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-900">Certificados del curso</h3>
                <p className="text-xs text-gray-500">{certificadosCurso.length} emitidos</p>
              </div>
              <button
                onClick={() => handleCertificado(curso.id)}
                className="px-3 py-1.5 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors text-xs font-medium"
              >
                Generar
              </button>
            </div>
            {cargandoCertificados ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : certificadosCurso.length === 0 ? (
              <div className="text-center py-8">
                <Award className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-400">No hay certificados emitidos</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {certificadosCurso.map((cert) => (
                  <div key={cert.id} className="px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{cert.estudiante_nombre || cert.estudiante_id}</p>
                      <p className="text-xs text-gray-400">{cert.codigo}</p>
                    </div>
                    <button
                      onClick={() => handleCertificado(curso.id)}
                      className="px-3 py-1 text-xs text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
                    >
                      Ver
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Configuracion */}
        {esDocente && tabActiva === 'configuracion' && onEditarCurso && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-sm font-medium text-gray-900 mb-4">Configuracion del curso</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-sm text-gray-600">Estado</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  curso.estado === 'PUBLICADO' 
                    ? 'bg-emerald-100 text-emerald-700' 
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {curso.estado || 'BORRADOR'}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-sm text-gray-600">Nivel</span>
                <span className="text-sm text-gray-900">{curso.nivel || 'No definido'}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-gray-600">Categoria</span>
                <span className="text-sm text-gray-900">{curso.categoria || 'No definida'}</span>
              </div>
              <button
                onClick={() => onEditarCurso(curso)}
                className="mt-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm"
              >
                Editar curso
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Reproductor Modal */}
      <ReproductorLeccion
        isOpen={reproductorAbierto}
        onClose={() => {
          setReproductorAbierto(false);
          setLeccionActual(null);
          setModuloActual(null);
        }}
        curso={curso}
        leccion={leccionActual}
        moduloId={moduloActual?.id}
        leccionesDelModulo={leccionesDelModulo}
        onLeccionCompletada={handleLeccionCompletada}
        onNavegarLeccion={handleNavegarLeccion}
        usuarioId={usuarioId}
        progresoActual={progreso}
        isCompletada={leccionActual ? leccionesCompletadas.includes(leccionActual.id) : false}
        tieneAcceso={tieneAcceso}
        esDocente={esDocente}
      />
    </div>
  );
};

export default DetalleCurso;