// front/src/components/cursos/RichTextDisplay.jsx

import React from 'react';
import { Lock, FileText } from 'lucide-react';
import { sanitizeHtml } from '../../utils/sanitize';

// ============================================================
// TEXTO ENRIQUECIDO
// ============================================================
const RichTextDisplay = ({ content, isBlocked = false }) => {
  if (isBlocked) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[200px] bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 p-8">
        <Lock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-400 font-medium">Contenido bloqueado</p>
        <p className="text-sm text-gray-300">Solicita acceso para ver este contenido</p>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="text-center py-8 text-gray-400">
        <FileText className="w-12 h-12 mx-auto mb-2 text-gray-300" />
        <p>No hay contenido disponible</p>
      </div>
    );
  }

  return (
    <div className="prose prose-slate max-w-none">
      <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(content) }} />
    </div>
  );
};

export default React.memo(RichTextDisplay);
