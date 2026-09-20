// src/context/FeedbackContext.jsx
// =====================================================
// SISTEMA DE FEEDBACK PROFESIONAL
// Reemplaza los diálogos nativos del navegador (alert/confirm/prompt),
// que se ven básicos y rompen la estética de la aplicación.
//
// Provee:
//   - toast.success / error / warning / info  → notificaciones flotantes
//   - confirmar({...})                        → modal de confirmación (Promise)
//     con soporte de campo de texto (reemplaza prompt)
// =====================================================

import React, { createContext, useCallback, useMemo, useRef, useState } from 'react';
import {
  CheckCircle2, AlertCircle, AlertTriangle, Info, X, Loader2,
} from 'lucide-react';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';

const FeedbackContext = createContext(null);

// -----------------------------------------------------
// Configuración visual por tipo
// -----------------------------------------------------
const TOAST_ESTILOS = {
  success: {
    icon: CheckCircle2,
    contenedor: 'bg-white border-emerald-200',
    icono: 'text-emerald-600 bg-emerald-50',
    barra: 'bg-emerald-500',
  },
  error: {
    icon: AlertCircle,
    contenedor: 'bg-white border-red-200',
    icono: 'text-red-600 bg-red-50',
    barra: 'bg-red-500',
  },
  warning: {
    icon: AlertTriangle,
    contenedor: 'bg-white border-amber-200',
    icono: 'text-amber-600 bg-amber-50',
    barra: 'bg-amber-500',
  },
  info: {
    icon: Info,
    contenedor: 'bg-white border-[#0f766e]/30',
    icono: 'text-[#0f766e] bg-[#e6f4f2]',
    barra: 'bg-[#0f766e]',
  },
};

const CONFIRM_ESTILOS = {
  danger: { icon: AlertTriangle, icono: 'text-red-600 bg-red-50', boton: 'danger' },
  warning: { icon: AlertTriangle, icono: 'text-amber-600 bg-amber-50', boton: 'primary' },
  info: { icon: Info, icono: 'text-[#0f766e] bg-[#e6f4f2]', boton: 'primary' },
  success: { icon: CheckCircle2, icono: 'text-emerald-600 bg-emerald-50', boton: 'success' },
};

// -----------------------------------------------------
// Toast individual
// -----------------------------------------------------
const ToastItem = ({ toast, onCerrar }) => {
  const estilo = TOAST_ESTILOS[toast.tipo] || TOAST_ESTILOS.info;
  const Icon = estilo.icon;

  return (
    <div
      role="status"
      className={`relative flex items-start gap-3 w-full max-w-sm p-3.5 rounded-xl border shadow-lg backdrop-blur-sm animate-slide-in overflow-hidden ${estilo.contenedor}`}
    >
      {/* Barra lateral de color */}
      <span className={`absolute left-0 top-0 bottom-0 w-1 ${estilo.barra}`} />

      <span className={`flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0 ${estilo.icono}`}>
        <Icon className="w-4 h-4" />
      </span>

      <div className="flex-1 min-w-0 pt-0.5">
        {toast.titulo && (
          <p className="text-sm font-semibold text-gray-900 leading-tight">{toast.titulo}</p>
        )}
        <p className={`text-sm text-gray-600 break-words ${toast.titulo ? 'mt-0.5' : ''}`}>
          {toast.mensaje}
        </p>
      </div>

      <button
        onClick={() => onCerrar(toast.id)}
        aria-label="Cerrar notificación"
        className="p-1 -m-1 rounded-lg text-gray-300 hover:text-gray-500 hover:bg-gray-100 transition-colors flex-shrink-0"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

// -----------------------------------------------------
// Provider
// -----------------------------------------------------
export const FeedbackProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const [dialogo, setDialogo] = useState(null);
  const [valorInput, setValorInput] = useState('');
  const [enviando, setEnviando] = useState(false);
  const contadorRef = useRef(0);
  const resolverRef = useRef(null);

  // ---------- TOASTS ----------
  const cerrarToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const lanzarToast = useCallback((tipo, mensaje, titulo = null, duracion = 4000) => {
    if (!mensaje) return null;
    contadorRef.current += 1;
    const id = contadorRef.current;
    setToasts((prev) => [...prev, { id, tipo, mensaje: String(mensaje), titulo }]);
    if (duracion > 0) {
      setTimeout(() => cerrarToast(id), duracion);
    }
    return id;
  }, [cerrarToast]);

  const toast = useMemo(() => ({
    success: (msg, titulo) => lanzarToast('success', msg, titulo),
    error: (msg, titulo) => lanzarToast('error', msg, titulo, 6000),
    warning: (msg, titulo) => lanzarToast('warning', msg, titulo, 5000),
    info: (msg, titulo) => lanzarToast('info', msg, titulo),
    cerrar: cerrarToast,
  }), [lanzarToast, cerrarToast]);

  // ---------- CONFIRM ----------
  const confirmar = useCallback((opciones = {}) => {
    const {
      titulo = 'Confirmar acción',
      mensaje = '',
      confirmText = 'Confirmar',
      cancelText = 'Cancelar',
      variant = 'info',
      input = null, // { placeholder, defaultValue, label }
    } = opciones;

    setValorInput(input?.defaultValue ?? '');
    setDialogo({ titulo, mensaje, confirmText, cancelText, variant, input });

    return new Promise((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const cerrarDialogo = useCallback((resultado) => {
    setDialogo(null);
    setEnviando(false);
    if (resolverRef.current) {
      resolverRef.current(resultado);
      resolverRef.current = null;
    }
  }, []);

  const handleConfirmar = useCallback(() => {
    if (dialogo?.input) {
      cerrarDialogo(valorInput);
    } else {
      cerrarDialogo(true);
    }
  }, [dialogo, valorInput, cerrarDialogo]);

  const value = useMemo(() => ({ toast, confirmar }), [toast, confirmar]);

  const estiloDialogo = dialogo
    ? (CONFIRM_ESTILOS[dialogo.variant] || CONFIRM_ESTILOS.info)
    : CONFIRM_ESTILOS.info;
  const IconoDialogo = estiloDialogo.icon;

  return (
    <FeedbackContext.Provider value={value}>
      {children}

      {/* ---- Contenedor de toasts (arriba a la derecha) ---- */}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2.5 pointer-events-none w-[calc(100vw-2rem)] sm:w-auto">
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto">
            <ToastItem toast={t} onCerrar={cerrarToast} />
          </div>
        ))}
      </div>

      {/* ---- Modal de confirmación ---- */}
      <Modal
        isOpen={!!dialogo}
        onClose={() => cerrarDialogo(dialogo?.input ? null : false)}
        title=""
        size="sm"
        showCloseButton={false}
      >
        {dialogo && (
          <div>
            <div className="flex items-start gap-4">
              <span className={`flex items-center justify-center w-11 h-11 rounded-xl flex-shrink-0 ${estiloDialogo.icono}`}>
                <IconoDialogo className="w-5 h-5" />
              </span>
              <div className="flex-1 min-w-0 pt-0.5">
                <h3 className="text-base font-semibold text-gray-900">{dialogo.titulo}</h3>
                {dialogo.mensaje && (
                  <p className="text-sm text-gray-500 mt-1.5 whitespace-pre-line">{dialogo.mensaje}</p>
                )}
              </div>
            </div>

            {dialogo.input && (
              <div className="mt-4">
                {dialogo.input.label && (
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">
                    {dialogo.input.label}
                  </label>
                )}
                <textarea
                  autoFocus
                  rows={3}
                  value={valorInput}
                  onChange={(e) => setValorInput(e.target.value)}
                  placeholder={dialogo.input.placeholder || ''}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:border-[#0f766e] focus:ring-2 focus:ring-[#0f766e]/15 outline-none resize-none transition-colors"
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-2 mt-6">
              <Button
                variant="ghost"
                onClick={() => cerrarDialogo(dialogo.input ? null : false)}
                disabled={enviando}
              >
                {dialogo.cancelText}
              </Button>
              <Button
                variant={estiloDialogo.boton}
                onClick={handleConfirmar}
                disabled={enviando || (dialogo.input?.required && !valorInput.trim())}
              >
                {enviando && <Loader2 className="w-4 h-4 animate-spin" />}
                {dialogo.confirmText}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </FeedbackContext.Provider>
  );
};

export default FeedbackContext;
