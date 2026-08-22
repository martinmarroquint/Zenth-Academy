// front/src/pages/modulos/MaterialesPage.jsx
// MI CARPETA - CRUD COMPLETO DE MATERIALES CON COMPONENTES UI

import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus, Link as LinkIcon, FileText, Type, Loader2,
  Copy, Check, Trash2, Eye, X, ExternalLink,
  Power, FolderOpen, Monitor, Send, History, ShieldCheck, Clock,
  Edit, QrCode
} from 'lucide-react';
import { Button, Input, Badge, Modal, Switch } from '../../components/ui';
import materialesService from '../../services/materialesService';
import compartirService from '../../services/compartirService';
import { authService } from '../../services/authService';
import HistorialComparticiones from '../../components/examenes/HistorialComparticiones';
import ModalEditarMaterial from '../../components/materiales/ModalEditarMaterial';

const MaterialesPage = () => {
  const [materiales, setMateriales] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [copiado, setCopiado] = useState(null);

  // Modal de edicion
  const [materialEditando, setMaterialEditando] = useState(null);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [guardando, setGuardando] = useState(false);

  // Estado de la sala de compartir
  const [sala, setSala] = useState(null);
  const [abriendoSala, setAbriendoSala] = useState(false);
  const [cargandoAccion, setCargandoAccion] = useState(false);
  const [mostrarHistorial, setMostrarHistorial] = useState(false);
  const [salaError, setSalaError] = useState('');

  const usuario = authService.getCurrentUser();
  const docenteId = usuario?.id || '';

  const cargarMateriales = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      const data = await materialesService.listar();
      setMateriales(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Error cargando materiales:', e);
      setError(e.message || 'No se pudieron cargar los materiales');
    } finally {
      setCargando(false);
    }
  }, []);

  const inicializar = useCallback(async () => {
    await cargarMateriales();
    try {
      const activa = await compartirService.salaActiva();
      if (activa) {
        setSala(activa);
      }
    } catch {
      // Sin sala activa: normal
    }
  }, [cargarMateriales]);

  useEffect(() => {
    inicializar();
  }, [inicializar]);

  const urlSala = (codigo) => `${window.location.origin}/compartir/${codigo}`;

  // COMPARTIR EN CLASE
  const abrirCompartir = async () => {
    setAbriendoSala(true);
    setSalaError('');
    try {
      const data = await compartirService.crearSala();
      setSala(data);
    } catch (e) {
      console.error('Error creando sala:', e);
      setSalaError(e.message || 'No se pudo iniciar el compartir');
    } finally {
      setAbriendoSala(false);
    }
  };

  const enviarMaterial = async (material) => {
    if (!sala) return;
    setCargandoAccion(true);
    try {
      const data = await compartirService.enviarMaterial(sala.codigo, material.id);
      setSala((prev) => ({ ...prev, ...data }));
    } catch (e) {
      alert(e.message || 'No se pudo enviar el material');
    } finally {
      setCargandoAccion(false);
    }
  };

  const quitarMaterial = async () => {
    if (!sala) return;
    setCargandoAccion(true);
    try {
      const data = await compartirService.quitarMaterial(sala.codigo);
      setSala((prev) => ({ ...prev, ...data }));
    } catch (e) {
      alert(e.message || 'No se pudo quitar el material');
    } finally {
      setCargandoAccion(false);
    }
  };

  const terminarSesion = async () => {
    if (!sala) return;
    if (!window.confirm('Terminar la sesion de compartir?')) return;
    setCargandoAccion(true);
    try {
      const data = await compartirService.cerrarSala(sala.codigo);
      setSala((prev) => ({ ...prev, ...data }));
    } catch (e) {
      alert(e.message || 'No se pudo terminar la sesion');
    } finally {
      setCargandoAccion(false);
    }
  };

  // CRUD DE MATERIALES
  const handleGuardarMaterial = async (data) => {
    setGuardando(true);
    try {
      if (materialEditando?.id) {
        await materialesService.actualizar(materialEditando.id, data);
      } else {
        await materialesService.crear(data);
      }
      setMostrarModal(false);
      setMaterialEditando(null);
      await cargarMateriales();
    } catch (e) {
      alert(e.message || 'No se pudo guardar el material');
    } finally {
      setGuardando(false);
    }
  };

  const handleEditar = (material) => {
    setMaterialEditando(material);
    setMostrarModal(true);
  };

  const handleEliminar = async (material) => {
    if (!window.confirm(`Eliminar el material "${material.titulo}"?`)) return;
    try {
      await materialesService.eliminar(material.id);
      await cargarMateriales();
    } catch (e) {
      alert(e.message || 'No se pudo eliminar el material');
    }
  };

  const handleToggleActivo = async (material) => {
    try {
      await materialesService.toggle(material.id);
      await cargarMateriales();
    } catch (e) {
      alert(e.message || 'No se pudo cambiar el estado del material');
    }
  };

  const handleCopiar = async (texto) => {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(texto);
      setTimeout(() => setCopiado(null), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = texto;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopiado(texto);
      setTimeout(() => setCopiado(null), 2000);
    }
  };

  const salaActiva = sala && (sala.estado === 'ESPERANDO' || sala.estado === 'ACTIVO');
  const salaCerrada = sala?.estado === 'CERRADO';

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FolderOpen className="w-6 h-6" style={{ color: '#0f766e' }} />
            Mi carpeta
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Guarda y comparte material en clase
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 flex-shrink-0">
          <Button
            variant={salaActiva ? 'success' : 'secondary'}
            onClick={abrirCompartir}
            disabled={abriendoSala || salaActiva}
          >
            {abriendoSala ? <Loader2 className="w-4 h-4 animate-spin" /> : <Monitor className="w-4 h-4" />}
            {salaActiva ? 'Sala activa' : 'Compartir en clase'}
          </Button>
          <Button variant="primary" onClick={() => { setMaterialEditando(null); setMostrarModal(true); }}>
            <Plus className="w-4 h-4" />
            Nuevo material
          </Button>
        </div>
      </div>

      {/* Estado de sala activa */}
      {salaActiva && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-sm font-medium text-emerald-800">
                Sala activa: <code className="font-mono bg-emerald-100 px-2 py-0.5 rounded">{sala.codigo}</code>
              </span>
              <Badge variant="success" size="sm">
                {sala.estado === 'ACTIVO' ? 'Vinculado' : 'Esperando vinculacion'}
              </Badge>
            </div>
            <Button
              variant="danger"
              size="sm"
              onClick={terminarSesion}
              disabled={cargandoAccion}
            >
              <Power className="w-3.5 h-3.5" />
              Terminar
            </Button>
          </div>

          {sala.material_activo && (
            <div className="bg-white rounded-lg border border-emerald-200 p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-500" />
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide">Mostrando en pantalla</p>
                  <p className="text-sm font-medium text-gray-800">{sala.material_activo.titulo}</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={quitarMaterial}
                disabled={cargandoAccion}
              >
                Quitar
              </Button>
            </div>
          )}
        </div>
      )}

      {salaCerrada && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center">
          <p className="text-sm text-gray-500">Sesion terminada. La pantalla del aula ya no muestra contenido.</p>
          <Button
            variant="secondary"
            size="sm"
            onClick={abrirCompartir}
            className="mt-2"
          >
            Iniciar nueva sesion
          </Button>
        </div>
      )}

      {salaError && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-lg">
          {salaError}
          <button onClick={() => setSalaError('')} className="ml-3 underline">Cerrar</button>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-lg">
          {error}
          <button onClick={cargarMateriales} className="ml-3 underline">Reintentar</button>
        </div>
      )}

      {cargando ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      ) : materiales.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <FolderOpen className="w-14 h-14 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">Tu carpeta esta vacia</h3>
          <p className="text-sm text-gray-500 mt-1 mb-4">Crea tu primer material para tu clase</p>
          <Button variant="primary" onClick={() => { setMaterialEditando(null); setMostrarModal(true); }}>
            <Plus className="w-4 h-4" />
            Crear material
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {materiales.map((material) => {
            const isActive = material.activo !== false;
            const tipoConfig = {
              enlace: { bg: 'bg-blue-50', color: 'text-blue-600', icon: <LinkIcon className="w-5 h-5" /> },
              texto: { bg: 'bg-purple-50', color: 'text-purple-600', icon: <Type className="w-5 h-5" /> },
              archivo: { bg: 'bg-emerald-50', color: 'text-emerald-600', icon: <FileText className="w-5 h-5" /> },
            };
            const config = tipoConfig[material.tipo] || tipoConfig.archivo;

            return (
              <div key={material.id} className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${config.bg} ${config.color}`}>
                      {config.icon}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-semibold text-gray-900 text-sm truncate">{material.titulo}</h4>
                      <p className="text-xs text-gray-400 flex items-center gap-2 flex-wrap">
                        <span className="capitalize">{material.tipo}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{material.visitas || 0}</span>
                        {!isActive && (
                          <Badge variant="danger" size="sm">Inactivo</Badge>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => handleToggleActivo(material)}
                      title={isActive ? 'Desactivar' : 'Activar'}
                      className={`p-1.5 rounded-lg hover:bg-gray-100 transition-colors ${
                        isActive ? 'text-emerald-500' : 'text-gray-400'
                      }`}
                    >
                      <Power className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleEditar(material)}
                      title="Editar"
                      className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleEliminar(material)}
                      title="Eliminar"
                      className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {material.descripcion && (
                  <p className="text-sm text-gray-500 line-clamp-2">{material.descripcion}</p>
                )}

                <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                  {salaActiva ? (
                    <button
                      onClick={() => enviarMaterial(material)}
                      disabled={cargandoAccion || sala.material_activo?.id === material.id}
                      className={`flex-1 px-3 py-2 text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 ${
                        sala.material_activo?.id === material.id
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'text-white hover:bg-[#0d5e57]'
                      }`}
                      style={sala.material_activo?.id !== material.id ? { backgroundColor: '#0f766e' } : {}}
                    >
                      <Send className="w-3.5 h-3.5" />
                      {sala.material_activo?.id === material.id ? 'Mostrando' : 'Mostrar en pantalla'}
                    </button>
                  ) : (
                    <button
                      onClick={abrirCompartir}
                      disabled={abriendoSala}
                      className="flex-1 px-3 py-2 text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      <Monitor className="w-3.5 h-3.5" /> Compartir en clase
                    </button>
                  )}
                  <button
                    onClick={() => setMostrarHistorial(!mostrarHistorial)}
                    className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                    title="Historial"
                  >
                    <History className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Historial */}
      {mostrarHistorial && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <HistorialComparticiones
            docenteId={docenteId}
            onVolver={() => setMostrarHistorial(false)}
          />
        </div>
      )}

      {/* Modal de edicion/creacion */}
      {mostrarModal && (
        <ModalEditarMaterial
          material={materialEditando}
          onGuardar={handleGuardarMaterial}
          onCancelar={() => {
            setMostrarModal(false);
            setMaterialEditando(null);
          }}
          cargando={guardando}
        />
      )}
    </div>
  );
};

export default MaterialesPage;