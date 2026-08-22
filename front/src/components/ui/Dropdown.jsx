// src/components/ui/Dropdown.jsx
// DROPDOWN PERSONALIZADO - ESTILO COMBOBOX MODERNO

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, X, Check, Loader2 } from 'lucide-react';

const Dropdown = ({
  options = [],
  value = '',
  onChange,
  placeholder = 'Seleccionar...',
  label = '',
  error = '',
  disabled = false,
  searchable = false,
  clearable = false,
  showChevron = true,
  className = '',
  size = 'md',
  fullWidth = true,
  loading = false,
  noOptionsMessage = 'No hay opciones disponibles',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Encontrar la opción seleccionada
  const selectedOption = options.find(opt => opt.value === value);

  // Filtrar opciones por búsqueda (solo si searchable está activado)
  const filteredOptions = searchable && searchTerm
    ? options.filter(opt =>
        opt.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        opt.value.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : options;

  // Cerrar al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
        setSearchTerm('');
        setHighlightedIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Resetear highlighted index cuando cambian las opciones filtradas
  useEffect(() => {
    setHighlightedIndex(-1);
  }, [filteredOptions]);

  // Scroll al elemento destacado
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const items = listRef.current.children;
      if (items[highlightedIndex]) {
        items[highlightedIndex].scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex]);

  // Manejar teclas
  const handleKeyDown = (e) => {
    if (!isOpen && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      e.preventDefault();
      setIsOpen(true);
      return;
    }

    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < filteredOptions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
          handleSelect(filteredOptions[highlightedIndex]);
        } else if (filteredOptions.length === 1) {
          handleSelect(filteredOptions[0]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setSearchTerm('');
        setHighlightedIndex(-1);
        if (inputRef.current) inputRef.current.blur();
        break;
      case 'Tab':
        setIsOpen(false);
        setSearchTerm('');
        setHighlightedIndex(-1);
        break;
    }
  };

  const handleSelect = (option) => {
    onChange(option.value);
    setIsOpen(false);
    setSearchTerm('');
    setHighlightedIndex(-1);
    if (inputRef.current) inputRef.current.blur();
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange('');
    setSearchTerm('');
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    if (!isOpen) {
      setIsOpen(true);
    }
    if (value === '' && clearable) {
      onChange('');
    }
  };

  const handleInputFocus = () => {
    if (!disabled) {
      setIsOpen(true);
      if (searchable && inputRef.current) {
        inputRef.current.select();
      }
    }
  };

  const handleInputBlur = () => {
    setTimeout(() => {
      if (!dropdownRef.current?.contains(document.activeElement)) {
        setIsOpen(false);
        setSearchTerm('');
        setHighlightedIndex(-1);
      }
    }, 150);
  };

  // Tamaños
  const sizeClasses = {
    sm: 'py-1.5 px-2.5 text-xs',
    md: 'py-2 px-3 text-sm',
    lg: 'py-2.5 px-4 text-base',
  };

  // Obtener el valor a mostrar en el input
  const getDisplayValue = () => {
    if (searchable && isOpen) {
      return searchTerm;
    }
    if (selectedOption) {
      return selectedOption.label;
    }
    return '';
  };

  const isReadOnly = !searchable;
  const getPlaceholder = () => {
    if (selectedOption && !isOpen) return '';
    if (isOpen && searchable) return '';
    return placeholder;
  };

  // Calcular padding izquierdo según el tipo
  const getPaddingLeft = () => {
    if (searchable) return 'pl-9';
    return 'pl-4';
  };

  return (
    <div className={`relative ${fullWidth ? 'w-full' : ''} ${className}`} ref={dropdownRef}>
      {/* Label */}
      {label && (
        <label className="block text-xs font-medium text-gray-700 mb-1.5">
          {label}
        </label>
      )}

      {/* Contenedor del input */}
      <div className="relative">
        {/* Icono izquierdo - SOLO cuando es searchable */}
        {searchable && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <Search className="w-4 h-4 text-gray-400" />
          </div>
        )}

        {/* Input */}
        <input
          ref={inputRef}
          type="text"
          value={getDisplayValue()}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          readOnly={isReadOnly}
          placeholder={getPlaceholder()}
          className={`
            w-full
            bg-white border rounded-xl
            transition-all duration-200
            ${sizeClasses[size]}
            ${getPaddingLeft()}
            pr-9
            ${isOpen ? 'border-[#0f766e] ring-2 ring-[#0f766e]/20' : 'border-gray-200 hover:border-gray-300'}
            ${disabled ? 'opacity-50 cursor-not-allowed bg-gray-50' : 'cursor-pointer'}
            ${error ? 'border-red-300 ring-2 ring-red-100' : ''}
            outline-none
            placeholder:text-gray-400
            ${selectedOption && !isOpen ? 'text-gray-900' : 'text-gray-900'}
            ${isReadOnly ? 'cursor-pointer select-none' : 'cursor-text'}
          `}
          style={{
            caretColor: searchable ? '#0f766e' : 'transparent',
          }}
        />

        {/* Iconos derechos */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {loading && (
            <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
          )}
          {clearable && (selectedOption || (searchable && searchTerm)) && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-0.5 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          {!disabled && showChevron && (
            <ChevronDown className={`
              w-4 h-4 text-gray-400 transition-transform duration-200
              ${isOpen ? 'rotate-180' : ''}
              pointer-events-none
              flex-shrink-0
            `} />
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <p className="mt-1 text-xs text-red-500">{error}</p>
      )}

      {/* Dropdown flotante */}
      {isOpen && !disabled && (
        <div 
          className="
            absolute z-50 w-full mt-1.5
            bg-white border border-gray-200 rounded-xl
            shadow-lg overflow-hidden
            animate-in fade-in slide-in-from-top-2 duration-200
          "
        >
          <div 
            ref={listRef}
            className="max-h-56 overflow-y-auto py-1"
          >
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-3 text-sm text-gray-400 text-center">
                {searchTerm ? `No se encontraron resultados para "${searchTerm}"` : noOptionsMessage}
              </div>
            ) : (
              filteredOptions.map((option, index) => {
                const isSelected = option.value === value;
                const isHighlighted = index === highlightedIndex;
                
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleSelect(option)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={`
                      w-full flex items-center justify-between px-4 py-2
                      text-sm transition-colors duration-150
                      ${isSelected 
                        ? 'bg-[#e6f4f2] text-[#0f766e]' 
                        : isHighlighted
                          ? 'bg-gray-100 text-gray-900'
                          : 'text-gray-700 hover:bg-gray-50'
                      }
                    `}
                  >
                    <span className="truncate">{option.label}</span>
                    {isSelected && (
                      <Check className="w-4 h-4 text-[#0f766e] flex-shrink-0 ml-2" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dropdown;