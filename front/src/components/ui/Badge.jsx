// src/components/ui/Badge.jsx
// BADGE CON VARIANTES

import React from 'react';

const Badge = ({
  children,
  variant = 'default', // default, primary, success, warning, danger, info
  size = 'sm', // sm, md
  className = '',
  ...props
}) => {
  const variants = {
    default: 'bg-gray-100 text-gray-600',
    primary: 'bg-[#e6f4f2] text-[#0f766e]',
    success: 'bg-emerald-50 text-emerald-600',
    warning: 'bg-amber-50 text-amber-600',
    danger: 'bg-red-50 text-red-600',
    info: 'bg-blue-50 text-blue-600',
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-[10px]',
    md: 'px-2.5 py-1 text-xs',
  };

  return (
    <span
      className={`
        inline-flex items-center font-medium rounded-full
        ${variants[variant] || variants.default}
        ${sizes[size] || sizes.sm}
        ${className}
      `}
      {...props}
    >
      {children}
    </span>
  );
};

export default Badge;