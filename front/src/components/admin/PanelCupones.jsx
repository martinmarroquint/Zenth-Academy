// front/src/components/admin/PanelCupones.jsx
// MÓDULO DE CUPONES Y PROMOCIONES (panel de administración)
// CRUD completo + historial de usos + vigencia real.

import React, { useState, useEffect } from 'react';
import {
  AlertCircle, BadgePercent, CalendarClock, Check, Loader2, Plus, RefreshCw,
  Tag, Ticket, Trash2, TrendingDown, Users, X,
} from 'lucide-react';
import { Button, Input, Badge, Dropdown } from '../ui';
import cuponesService from '../../services/cuponesService';
import adminService from '../../services/adminService';
import { useFeedback } from '../../hooks/useFeedback';

const fmtFecha = (iso) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString();
  } catch {
    return '—';
  }
};

const VIGENCIA = {
  vigente: { label: 'Vigente', variant: 'success' },
  programado: { label: 'Programado', variant: 'info' },
  expirado: { label: 'Expirado', variant: 'default' },
  agotado: { label: 'Agotado', variant: 'warning' },
  inactivo: { label: 'Inactivo', variant: 'danger' },
};

const descripcionValor = (cupon) =>
  cupon.tipo === 'porcentaje' ? `${cupon.valor}%` : `S/ ${cupon.valor}`;

const formInicial = {
  codigo: '',
  descripcion: '',
  tipo: 'porcentaje',
  valor: 10,
  curso_id: '',
  max_usos: '',
  usos_por_usuario: 1,
  fecha_inicio: '',
  fecha_fin: '',
  activo: true,
};

const ModalCupon = ({ cupon, cursos, onCerrar, onGuardar, guardando }) => {
  const [form, setForm] = useState(() => ({
    ...formInicial,
    ...(cupon
      ? {
          codigo: cupon.codigo,
          descripcion: cupon.descripcion || '',
          tipo: cupon.tipo,
          valor: cupon.valor,
          curso_id: cupon.curso_id || '',
          max_usos: cupon.max_usos ?? '',
          usos_por_usuario: cupon.usos_por_usuario ?? 1,
          fecha_inicio: cupon.fecha_inicio ? String(cupon.fecha_inicio).slice(0, 16) : '',
          fecha_fin: cupon.fecha_fin ? String(cupon.fecha_fin).slice(0, 16) : '',
          activo: cupon.activo,
        }
      : {}),
  }));
  const [error, setError] = useState('');

  const set = (campo, valor) => setForm((prev) => ({ ...prev, [campo]: valor }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.codigo.trim()) {
      setError('El código es obligatorio');
      return;
    }
    if (!(Number(form.valor) > 0)) {
      setError('El descuento debe ser mayor a 0');
      return;
    }
    if (form.tipo === 'porcentaje' && Number(form.valor) > 100) {
      setError('El porcentaje no puede superar 100');
      return;
    }

    const payload = {
      descripcion: form.descripcion.trim() || null,
      tipo: form.tipo,
      valor: Number(form.valor),
      curso_id: form.curso_id || null,
      max_usos: form.max_usos === '' ? null : Number(form.max_usos),
      usos_por_usuario: form.usos_por_usuario === '' ? 1 : Number(form.usos_por_usuario),
      fecha_inicio: form.fecha_inicio || null,
      fecha_fin: form.fecha_fin || null,
      activo: form.activo,
    };
    if (!cupon) payload.codigo = form.codigo.trim().toUpperCase();

    await onGuardar(payload);
  };

  const opcionesCursos = [
    { value: '', label: 'Todos los cursos' },
    ...cursos.map((c) => ({ value: c.id, label: c.titulo })),
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Ticket className="w-5 h-5" style={{ color: '#0f766e' }} />
            {cupon ? 'Editar cupón' : 'Nuevo cupón'}
          </h3>
          <button onClick={onCerrar} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Código *"
              value={form.codigo}
              onChange={(e) => set('codigo', e.target.value.toUpperCase())}
              placeholder="PROMO25"
              disabled={!!cupon}
            />
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Tipo</label>
              <Dropdown
                options={[
                  { value: 'porcentaje', label: 'Porcentaje (%)' },
                  { value: 'monto', label: 'Monto fijo (S/)' },
                ]}
                value={form.tipo}
                onChange={(val) => set('tipo', val)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label={form.tipo === 'porcentaje' ? 'Descuento (%) *' : 'Descuento (S/) *'}
              type="number"
              min="1"
              value={form.valor}
              onChange={(e) => set('valor', e.target.value)}
            />
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Aplica a</label>
              <Dropdown
                options={opcionesCursos}
                value={form.curso_id}
                onChange={(val) => set('curso_id', val)}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Descripción (opcional)
            </label>
            <textarea
              value={form.descripcion}
              onChange={(e) => set('descripcion', e.target.value)}
              rows={2}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:border-[#0f766e] focus:ring-2 focus:ring-[#0f766e]/10"
              placeholder="Ej: Promoción de lanzamiento"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Límite total de usos (vacío = ilimitado)"
              type="number"
              min="1"
              value={form.max_usos}
              onChange={(e) => set('max_usos', e.target.value)}
            />
            <Input
              label="Usos por alumno"
              type="number"
              min="1"
              value={form.usos_por_usuario}
              onChange={(e) => set('usos_por_usuario', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Válido desde (opcional)"
              type="datetime-local"
              value={form.fecha_inicio}
              onChange={(e) => set('fecha_inicio', e.target.value)}
            />
            <Input
              label="Válido hasta (opcional)"
              type="datetime-local"
              value={form.fecha_fin}
              onChange={(e) => set('fecha_fin', e.target.value)}
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={form.activo}
              onChange={(e) => set('activo', e.target.checked)}
              className="w-4 h-4 rounded border-gray-300"
            />
            Cupón activo
          </label>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-3 py-2 rounded-lg">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={onCerrar} disabled={guardando}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" disabled={guardando}>
              {guardando ? 'Guardando…' : cupon ? 'Guardar cambios' : 'Crear cupón'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

const PanelCupones = () => {
  const { toast, confirmar } = useFeedback();
  const [cupones, setCupones] = useState([]);
  const [cursos, setCursos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [recarga, setRecarga] = useState(0);
  const [modal, setModal] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [usos, setUsos] = useState({});

  useEffect(() => {
    let activo = true;
    (async () => {
      try {
        const [lista, listaCursos] = await Promise.allSettled([
          cuponesService.listar(),
          adminService.cursos(),
        ]);
        if (!activo) return;
        if (lista.status === 'fulfilled') {
          setCupones(Array.isArray(lista.value) ? lista.value : []);
          setError('');
        } else {
          setError('No se pudieron cargar los cupones');
        }
        if (listaCursos.status === 'fulfilled') {
          setCursos(Array.isArray(listaCursos.value) ? listaCursos.value : []);
        }
      } finally {
        if (activo) setCargando(false);
      }
    })();
    return () => {
      activo = false;
    };
  }, [recarga]);

  const guardar = async (payload) => {
    setGuardando(true);
    try {
      if (modal?.cupon) {
        await cuponesService.actualizar(modal.cupon.id, payload);
      } else {
        await cuponesService.crear(payload);
      }
      setModal(null);
      setRecarga((n) => n + 1);
      toast.success(modal?.cupon ? 'Cupón actualizado' : 'Cupón creado');
    } catch (e) {
      toast.error(e?.message || 'No se pudo guardar el cupón');
    } finally {
      setGuardando(false);
    }
  };

  const desactivar = async (cupon) => {
    const ok = await confirmar({
      titulo: 'Desactivar cupón',
      mensaje: `¿Desactivar el cupón ${cupon.codigo}?`,
      confirmText: 'Desactivar',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await cuponesService.desactivar(cupon.id);
      setRecarga((n) => n + 1);
      toast.success('Cupón desactivado');
    } catch (e) {
      toast.error(e?.message || 'No se pudo desactivar');
    }
  };

  const verUsos = async (cupon) => {
    if (usos[cupon.id]) {
      setUsos((prev) => {
        const copia = { ...prev };
        delete copia[cupon.id];
        return copia;
      });
      return;
    }
    try {
      const data = await cuponesService.usos(cupon.id);
      setUsos((prev) => ({ ...prev, [cupon.id]: Array.isArray(data) ? data : [] }));
    } catch (e) {
      toast.error(e?.message || 'No se pudo cargar el historial');
    }
  };

  const activos = cupones.filter((c) => c.vigencia === 'vigente').length;
  const usosTotales = cupones.reduce((sum, c) => sum + (c.usos || 0), 0);

  if (cargando) {
    return (
      <div className="text-center py-16">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-gray-400 mb-1.5">
            <Ticket className="w-4 h-4" />
            <span className="text-[11px] uppercase tracking-wider">Cupones</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{cupones.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-gray-400 mb-1.5">
            <BadgePercent className="w-4 h-4" />
            <span className="text-[11px] uppercase tracking-wider">Vigentes</span>
          </div>
          <p className="text-2xl font-bold text-emerald-600">{activos}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-gray-400 mb-1.5">
            <Users className="w-4 h-4" />
            <span className="text-[11px] uppercase tracking-wider">Usos totales</span>
          </div>
          <p className="text-2xl font-bold text-blue-600">{usosTotales}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-center">
          <Button variant="primary" onClick={() => setModal({ cupon: null })}>
            <Plus className="w-4 h-4" />
            Nuevo cupón
          </Button>
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

      {cupones.length === 0 ? (
        <div className="text-center py-16 bg-white border border-gray-200 rounded-xl">
          <Tag className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">
            Todavía no hay cupones. Creá el primero para ofrecer descuentos.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {cupones.map((cupon) => {
            const meta = VIGENCIA[cupon.vigencia] || VIGENCIA.inactivo;
            const historial = usos[cupon.id];
            return (
              <div key={cupon.id} className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <code className="font-mono font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded">
                        {cupon.codigo}
                      </code>
                      <Badge variant={meta.variant} size="sm">{meta.label}</Badge>
                      <span className="text-sm font-semibold text-[#0f766e]">
                        {descripcionValor(cupon)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {cupon.curso_titulo ? `Curso: ${cupon.curso_titulo}` : 'Todos los cursos'}
                      {cupon.descripcion ? ` · ${cupon.descripcion}` : ''}
                    </p>
                    <p className="text-[11px] text-gray-400 mt-1 flex items-center gap-3 flex-wrap">
                      <span>
                        Usos: <strong className="text-gray-600">{cupon.usos}</strong>
                        {cupon.max_usos != null ? ` / ${cupon.max_usos}` : ' (ilimitado)'}
                      </span>
                      <span className="flex items-center gap-1">
                        <CalendarClock className="w-3 h-3" />
                        {fmtFecha(cupon.fecha_inicio)} → {fmtFecha(cupon.fecha_fin)}
                      </span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => verUsos(cupon)}>
                      <TrendingDown className="w-3.5 h-3.5" />
                      {historial ? 'Ocultar usos' : `Usos (${cupon.usos})`}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setModal({ cupon })}
                    >
                      Editar
                    </Button>
                    {cupon.activo && (
                      <Button variant="danger" size="sm" onClick={() => desactivar(cupon)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>

                {historial && (
                  <div className="mt-3 pt-3 border-t border-gray-100 space-y-1.5">
                    {historial.length === 0 ? (
                      <p className="text-xs text-gray-400">Todavía nadie usó este cupón.</p>
                    ) : (
                      historial.map((u) => (
                        <div key={u.id} className="flex items-center justify-between gap-3 text-xs">
                          <span className="text-gray-700 min-w-0 truncate">
                            {u.usuario_nombre || 'Alumno'}
                            {u.curso_titulo ? ` · ${u.curso_titulo}` : ''}
                          </span>
                          <span className="text-gray-500 whitespace-nowrap">
                            S/ {u.monto_base} → <strong>S/ {u.monto_final}</strong> (−{u.monto_descuento})
                            {' · '}
                            {fmtFecha(u.created_at)}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {modal && (
        <ModalCupon
          key={modal.cupon?.id || 'nuevo'}
          cupon={modal.cupon}
          cursos={cursos}
          onCerrar={() => setModal(null)}
          onGuardar={guardar}
          guardando={guardando}
        />
      )}
    </div>
  );
};

export default PanelCupones;
