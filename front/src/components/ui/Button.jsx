// src/components/ui/Button.jsx
// BOTÓN CON VARIANTES

import React from 'react';
import { Loader2 } from 'lucide-react';

const Button = ({
  children,
  variant = 'primary', // primary, secondary, outline, ghost, danger, success
  size = 'md', // sm, md, lg
  loading = false,
  disabled = false,
  fullWidth = false,
  icon = null,
  iconPosition = 'left',
  className = '',
  onClick,
  type = 'button',
  ...props
}) => {
  const variants = {
    primary: {
      bg: 'bg-[#0f766e] hover:bg-[#0d5e57]',
      text: 'text-white',
      border: 'border-transparent',
    },
    secondary: {
      bg: 'bg-gray-900 hover:bg-gray-800',
      text: 'text-white',
      border: 'border-transparent',
    },
    outline: {
      bg: 'bg-transparent hover:bg-gray-50',
      text: 'text-gray-700',
      border: 'border-gray-300 hover:border-gray-400',
    },
    ghost: {
      bg: 'bg-transparent hover:bg-gray-100',
      text: 'text-gray-600 hover:text-gray-900',
      border: 'border-transparent',
    },
    danger: {
      bg: 'bg-red-500 hover:bg-red-600',
      text: 'text-white',
      border: 'border-transparent',
    },
    success: {
      bg: 'bg-emerald-500 hover:bg-emerald-600',
      text: 'text-white',
      border: 'border-transparent',
    },
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  const variantStyles = variants[variant] || variants.primary;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        inline-flex items-center justify-center gap-2
        font-medium rounded-xl
        transition-all duration-200
        ${variantStyles.bg}
        ${variantStyles.text}
        ${variantStyles.border}
        border
        ${sizes[size]}
        ${fullWidth ? 'w-full' : ''}
        ${disabled || loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${!disabled && !loading ? 'hover:shadow-md active:scale-95' : ''}
        ${className}
      `}
      {...props}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : icon && iconPosition === 'left' ? (
        icon
      ) : null}
      {children}
      {!loading && icon && iconPosition === 'right' ? icon : null}
    </button>
  );
};

export default Button;