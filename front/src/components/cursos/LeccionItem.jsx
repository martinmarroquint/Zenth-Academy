// front/src/components/cursos/LeccionItem.jsx

import React from 'react';
import { Layers, Clock, Lock, Check, CheckCircle, Play } from 'lucide-react';
import { Badge } from '../ui';
import {
  getBloquesDeLeccion, getTipoLeccion, getTipoIcon, getTipoLabel
} from './leccionUtils';

// ============================================================
// COMPONENTE DE LECCIÓN (con soporte para bloqueado)
// ============================================================
const LeccionItem = ({ 
  leccion, 
  index, 
  isCompletada, 
  isBloqueada, 
  onClick,
  modulo: _modulo
}) => {
  const bloques = getBloquesDeLeccion(leccion);
  const tipoPrincipal = getTipoLeccion(leccion);
  const totalBloques = bloques.length;

  if (isBloqueada) {
    return (
      <div
        className="w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 text-left border border-gray-100/50 bg-gray-50/30 cursor-not-allowed group"
        onClick={onClick}
        title="Completa las lecciones anteriores para desbloquear"
      >
        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
          <Lock className="w-3.5 h-3.5 text-gray-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-gray-400 truncate">
              {leccion.titulo}
            </p>
            <div className="flex items-center gap-1">
              <Badge variant="secondary" size="sm" className="text-[10px] bg-gray-100/50">
                {getTipoLabel(tipoPrincipal)}
              </Badge>
              {totalBloques > 1 && (
                <Badge variant="secondary" size="sm" className="text-[10px] bg-gray-100/50">
                  <Layers className="w-3 h-3 inline mr-0.5" />
                  {totalBloques}
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5">
            <span className="flex items-center gap-0.5">
              {getTipoIcon(tipoPrincipal)}
              {getTipoLabel(tipoPrincipal)}
            </span>
            {leccion.duracion && (
              <>
                <span>•</span>
                <span className="flex items-center gap-0.5">
                  <Clock className="w-3 h-3" />
                  {leccion.duracion}
                </span>
              </>
            )}
            <span className="flex items-center gap-1 text-gray-400 ml-1">
              <Lock className="w-3 h-3" />
              <span className="text-[10px] font-medium">Bloqueada</span>
            </span>
          </div>
        </div>
        <div className="flex-shrink-0">
          <Lock className="w-4 h-4 text-gray-300" />
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 text-left ${
        isCompletada ? 'bg-gray-50/50 hover:bg-gray-100' : 'hover:bg-gray-50'
      } border border-transparent hover:border-gray-200 group`}
    >
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 ${
        isCompletada ? 'bg-[#0f766e] text-white' : 'bg-gray-100 text-gray-500'
      }`}>
        {isCompletada ? <Check className="w-4 h-4" /> : index + 1}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className={`text-sm font-medium truncate ${
            isCompletada ? 'text-gray-500' : 'text-gray-800'
          }`}>
            {leccion.titulo}
          </p>
          {isCompletada && (
            <Badge variant="success" size="sm" className="text-[10px]">Completada</Badge>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <span className="flex items-center gap-1">
            {getTipoIcon(tipoPrincipal)}
            {getTipoLabel(tipoPrincipal)}
          </span>
          {totalBloques > 1 && (
            <>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Layers className="w-3 h-3" />
                {totalBloques} bloques
              </span>
            </>
          )}
        </div>
      </div>
      <div className="flex-shrink-0">
        {isCompletada ? (
          <CheckCircle className="w-5 h-5 text-[#0f766e]" />
        ) : (
          <Play className="w-5 h-5 text-gray-300 group-hover:text-[#0f766e] transition-colors" />
        )}
      </div>
    </button>
  );
};

export default React.memo(LeccionItem);
