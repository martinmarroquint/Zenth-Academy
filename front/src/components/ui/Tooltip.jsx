// src/components/ui/Tooltip.jsx
// TOOLTIP SIMPLE

import React, { useState, useRef, useEffect } from 'react';

const Tooltip = ({
  children,
  content,
  position = 'top', // top, bottom, left, right
  delay = 200,
  className = '',
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const triggerRef = useRef(null);
  const tooltipRef = useRef(null);
  const timeoutRef = useRef(null);

  const positions = {
    top: { top: '-8px', left: '50%', transform: 'translate(-50%, -100%)' },
    bottom: { top: 'calc(100% + 8px)', left: '50%', transform: 'translateX(-50%)' },
    left: { top: '50%', right: 'calc(100% + 8px)', transform: 'translateY(-50%)' },
    right: { top: '50%', left: 'calc(100% + 8px)', transform: 'translateY(-50%)' },
  };

  const arrows = {
    top: 'bottom-[-4px] left-1/2 -translate-x-1/2 border-t-gray-900',
    bottom: 'top-[-4px] left-1/2 -translate-x-1/2 border-b-gray-900',
    left: 'right-[-4px] top-1/2 -translate-y-1/2 border-l-gray-900',
    right: 'left-[-4px] top-1/2 -translate-y-1/2 border-r-gray-900',
  };

  const show = () => {
    timeoutRef.current = setTimeout(() => setIsVisible(true), delay);
  };

  const hide = () => {
    clearTimeout(timeoutRef.current);
    setIsVisible(false);
  };

  useEffect(() => {
    return () => clearTimeout(timeoutRef.current);
  }, []);

  return (
    <div
      ref={triggerRef}
      className="relative inline-block"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {isVisible && content && (
        <div
          ref={tooltipRef}
          className={`
            absolute z-50 px-2 py-1
            bg-gray-900 text-white text-xs rounded
            whitespace-nowrap pointer-events-none
            animate-in fade-in zoom-in-95 duration-150
            ${className}
          `}
          style={positions[position] || positions.top}
        >
          {content}
          <div
            className={`
              absolute w-0 h-0
              border-4 border-transparent
              ${arrows[position] || arrows.top}
            `}
          />
        </div>
      )}
    </div>
  );
};

export default Tooltip;