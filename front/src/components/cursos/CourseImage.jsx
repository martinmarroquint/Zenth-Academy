// front/src/components/cursos/CourseImage.jsx
// Imagen de curso con resolución de URLs (incluye Google Drive) y fallback elegante.
//
// ✅ Antes, cada <img> hacía `onError => display:none`, lo que OCULTABA la imagen
// para siempre ante cualquier fallo transitorio (ej: rate-limit de Google).
// Ahora mostramos un placeholder consistente y permitimos reintentar.
import React, { useState } from 'react';
import { GraduationCap, RefreshCw } from 'lucide-react';
import { resolveImageUrl } from '../../config/api.config';

const CourseImage = ({
  src,
  alt = 'Curso',
  className = '',
  imgClassName = 'w-full h-full object-cover',
  showRetry = false,
}) => {
  const resuelta = resolveImageUrl(src);
  const [error, setError] = useState(false);
  const [urlAnterior, setUrlAnterior] = useState(resuelta);

  // Si cambia la URL, reiniciar el estado de error (patrón recomendado por React:
  // ajustar estado durante el render, sin useEffect).
  if (resuelta !== urlAnterior) {
    setUrlAnterior(resuelta);
    setError(false);
  }

  const reintentar = () => {
    setError(false);
    // Forzar recarga agregando un parámetro cache-buster
    const img = new Image();
    img.src = `${resuelta}${resuelta.includes('?') ? '&' : '?'}_r=${Date.now()}`;
  };

  if (!resuelta || error) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-[#e6f4f2] to-[#d1e8e5] ${className}`}
      >
        <GraduationCap className="w-8 h-8 text-[#0f766e]/40 mb-1" />
        {showRetry && resuelta && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); reintentar(); }}
            className="mt-1 inline-flex items-center gap-1 text-[10px] font-medium text-[#0f766e] hover:underline"
          >
            <RefreshCw className="w-3 h-3" />
            Reintentar
          </button>
        )}
      </div>
    );
  }

  return (
    <img
      src={resuelta}
      alt={alt}
      loading="lazy"
      className={imgClassName}
      onError={() => setError(true)}
    />
  );
};

export default React.memo(CourseImage);
