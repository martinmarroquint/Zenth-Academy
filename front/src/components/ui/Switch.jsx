// src/components/ui/Switch.jsx
// TOGGLE SWITCH PERSONALIZADO

import React from 'react';

const Switch = ({
  checked = false,
  onChange,
  label = '',
  disabled = false,
  size = 'md', // sm, md, lg
  className = '',
}) => {
  const sizeClasses = {
    sm: 'w-8 h-5',
    md: 'w-11 h-6',
    lg: 'w-14 h-8',
  };

  const circleSize = {
    sm: 'w-3.5 h-3.5',
    md: 'w-5 h-5',
    lg: 'w-7 h-7',
  };

  const translateClasses = {
    sm: checked ? 'translate-x-3.5' : 'translate-x-0.5',
    md: checked ? 'translate-x-5' : 'translate-x-0.5',
    lg: checked ? 'translate-x-6' : 'translate-x-0.5',
  };

  return (
    <label className={`flex items-center gap-3 cursor-pointer ${disabled ? 'opacity-50' : ''} ${className}`}>
      <div className="relative">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          className="sr-only"
        />
        <div
          className={`
            ${sizeClasses[size]}
            rounded-full transition-colors duration-300
            ${checked ? 'bg-[#0f766e]' : 'bg-gray-300'}
          `}
        />
        <div
          className={`
            absolute top-0.5 left-0
            ${circleSize[size]}
            bg-white rounded-full shadow-md
            transition-transform duration-300
            ${translateClasses[size]}
          `}
        />
      </div>
      {label && <span className="text-sm text-gray-700">{label}</span>}
    </label>
  );
};

export default Switch;