// src/hooks/useFeedback.js
// Hook para usar el sistema de feedback (toasts + confirmaciones).
//
// Uso:
//   const { toast, confirmar } = useFeedback();
//
//   toast.success('Curso guardado');
//   toast.error('No se pudo guardar');
//
//   const ok = await confirmar({
//     titulo: 'Eliminar curso',
//     mensaje: '¿Seguro? Esta acción no se puede deshacer.',
//     confirmText: 'Eliminar',
//     variant: 'danger',
//   });
//   if (!ok) return;
//
//   // Reemplaza window.prompt:
//   const motivo = await confirmar({
//     titulo: 'Rechazar solicitud',
//     mensaje: 'Indica el motivo:',
//     input: { placeholder: 'Motivo...', label: 'Motivo' },
//   });
//   if (motivo === null) return; // el usuario canceló

import { useContext } from 'react';
import FeedbackContext from '../context/FeedbackContext';

export const useFeedback = () => {
  const ctx = useContext(FeedbackContext);
  if (!ctx) {
    throw new Error('useFeedback debe usarse dentro de un FeedbackProvider');
  }
  return ctx;
};

export default useFeedback;
