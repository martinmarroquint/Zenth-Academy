// src/components/ui/Input.jsx
// INPUT CON ICONOS

import React, { forwardRef } from 'react';
import { Eye, EyeOff, Search, X, AlertCircle } from 'lucide-react';

const Input = forwardRef(({
  label = '',
  error = '',
  icon = null,
  iconPosition = 'left',
  className = '',
  size = 'md',
  fullWidth = true,
  clearable = false,
  onClear = null,
  type = 'text',
  ...props
}, ref) => {
  const [showPassword, setShowPassword] = React.useState(false);
  const isPassword = type === 'password';

  const sizes = {
    sm: 'py-1.5 px-3 text-sm',
    md: 'py-2 px-4 text-sm',
    lg: 'py-2.5 px-4 text-base',
  };

  const hasIcon = icon || isPassword || clearable;
  const iconPadding = hasIcon ? (iconPosition === 'left' ? 'pl-10' : 'pr-10') : '';

  return (
    <div className={`${fullWidth ? 'w-full' : ''} ${className}`}>
      {label && (
        <label className="block text-xs font-medium text-gray-700 mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        {/* Icono izquierdo */}
        {icon && iconPosition === 'left' && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            {icon}
          </span>
        )}

        <input
          ref={ref}
          type={isPassword ? (showPassword ? 'text' : 'password') : type}
          className={`
            w-full
            bg-white border rounded-xl
            transition-all duration-200
            ${sizes[size] || sizes.md}
            ${iconPadding}
            ${error ? 'border-red-300 ring-2 ring-red-100' : 'border-gray-200 focus:border-[#0f766e] focus:ring-2 focus:ring-[#0f766e]/20'}
            hover:border-gray-300
            outline-none
            placeholder:text-gray-400
            ${props.disabled ? 'opacity-50 cursor-not-allowed bg-gray-50' : ''}
          `}
          {...props}
        />

        {/* Icono derecho (limpiar / toggle password) */}
        {hasIcon && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {clearable && props.value && (
              <button
                type="button"
                onClick={onClear || (() => {})}
                className="p-0.5 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            {isPassword && (
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="p-0.5 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            )}
            {icon && iconPosition === 'right' && (
              <span className="text-gray-400">{icon}</span>
            )}
          </div>
        )}
      </div>
      {error && (
        <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          {error}
        </p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;