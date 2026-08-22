// src/components/ui/DatePicker.jsx
// SELECTOR DE FECHA PROFESIONAL - CON BÚSQUEDA

import React, { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight, X, ChevronDown } from 'lucide-react';
import Dropdown from './Dropdown';

const DatePicker = ({
  value = '',
  onChange,
  label = '',
  placeholder = 'Seleccionar fecha...',
  error = '',
  disabled = false,
  className = '',
  minDate = null,
  maxDate = null,
  size = 'md',
  fullWidth = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [viewMonth, setViewMonth] = useState(new Date().getMonth());
  const [viewYear, setViewYear] = useState(new Date().getFullYear());
  const pickerRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (value) {
      const date = new Date(value);
      if (!isNaN(date)) {
        setSelectedDate(date);
        setViewMonth(date.getMonth());
        setViewYear(date.getFullYear());
      }
    }
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const goToPreviousMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const getDaysInMonth = () => {
    const year = viewYear;
    const month = viewMonth;
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];
    const today = new Date();
    
    const firstDayOfWeek = firstDay.getDay();
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const date = new Date(year, month - 1, prevMonthLastDay - i);
      days.push({ date, isOtherMonth: true, isToday: false, isSelected: false, isDisabled: false });
    }

    for (let i = 1; i <= lastDay.getDate(); i++) {
      const currentDate = new Date(year, month, i);
      const isToday = currentDate.toDateString() === today.toDateString();
      const isSelected = selectedDate && currentDate.toDateString() === selectedDate.toDateString();
      const isDisabled = (minDate && currentDate < new Date(minDate)) || 
                         (maxDate && currentDate > new Date(maxDate));
      days.push({ date: currentDate, isOtherMonth: false, isToday, isSelected, isDisabled });
    }

    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      const date = new Date(year, month + 1, i);
      days.push({ date, isOtherMonth: true, isToday: false, isSelected: false, isDisabled: false });
    }

    return days;
  };

  const days = getDaysInMonth();

  const handleDateSelect = (day) => {
    if (day.isOtherMonth || day.isDisabled) return;
    
    const newDate = day.date;
    setSelectedDate(newDate);
    
    const year = newDate.getFullYear();
    const month = String(newDate.getMonth() + 1).padStart(2, '0');
    const dayNum = String(newDate.getDate()).padStart(2, '0');
    const formatted = `${year}-${month}-${dayNum}`;
    
    onChange(formatted);
    setIsOpen(false);
  };

  const formatDisplayDate = (date) => {
    if (!date) return '';
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const handleClear = (e) => {
    e.stopPropagation();
    setSelectedDate(null);
    onChange('');
    if (inputRef.current) inputRef.current.focus();
  };

  const handleMonthChange = (val) => {
    setViewMonth(parseInt(val));
  };

  const handleYearChange = (val) => {
    setViewYear(parseInt(val));
  };

  const monthOptions = [
    { value: '0', label: 'Enero' },
    { value: '1', label: 'Febrero' },
    { value: '2', label: 'Marzo' },
    { value: '3', label: 'Abril' },
    { value: '4', label: 'Mayo' },
    { value: '5', label: 'Junio' },
    { value: '6', label: 'Julio' },
    { value: '7', label: 'Agosto' },
    { value: '8', label: 'Septiembre' },
    { value: '9', label: 'Octubre' },
    { value: '10', label: 'Noviembre' },
    { value: '11', label: 'Diciembre' },
  ];

  const getYearOptions = () => {
    const years = [];
    for (let i = 1950; i <= 2050; i++) {
      years.push({ value: String(i), label: String(i) });
    }
    return years;
  };

  const sizeClasses = {
    sm: 'py-1.5 px-3 text-sm',
    md: 'py-2 px-4 text-sm',
    lg: 'py-2.5 px-4 text-base',
  };

  const hasSelectedDate = selectedDate !== null;

  return (
    <div className={`relative ${fullWidth ? 'w-full' : ''} ${className}`} ref={pickerRef}>
      {label && (
        <label className="block text-xs font-medium text-gray-700 mb-1.5">
          {label}
        </label>
      )}

      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`
          w-full flex items-center justify-between
          bg-white border rounded-xl
          transition-all duration-200
          ${sizeClasses[size]}
          ${isOpen ? 'border-[#0f766e] ring-2 ring-[#0f766e]/20' : 'border-gray-200 hover:border-gray-300'}
          ${disabled ? 'opacity-50 cursor-not-allowed bg-gray-50' : 'cursor-pointer'}
          ${error ? 'border-red-300 ring-2 ring-red-100' : ''}
          text-left
        `}
        ref={inputRef}
        role="button"
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (!disabled) setIsOpen(!isOpen);
          }
        }}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <span className={`truncate ${hasSelectedDate ? 'text-gray-900' : 'text-gray-400'}`}>
            {hasSelectedDate ? formatDisplayDate(selectedDate) : placeholder}
          </span>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0 ml-2">
          {hasSelectedDate && (
            <button
              type="button"
              onClick={handleClear}
              className="p-0.5 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}

      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-1.5 bg-white border border-gray-200 rounded-xl shadow-lg p-4 animate-in fade-in slide-in-from-top-2 duration-200 min-w-[320px]">
          <div className="flex items-center gap-2 mb-3">
            <button
              type="button"
              onClick={goToPreviousMonth}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-600 flex-shrink-0"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Mes - SIN X y SIN flecha extra */}
            <div className="flex-1 min-w-0">
              <Dropdown
                options={monthOptions}
                value={String(viewMonth)}
                onChange={handleMonthChange}
                placeholder="Mes"
                size="sm"
                fullWidth
                searchable={true}
                clearable={false}
                showChevron={false}
              />
            </div>

            {/* Año - SIN X y SIN flecha extra */}
            <div className="w-28 flex-shrink-0">
              <Dropdown
                options={getYearOptions()}
                value={String(viewYear)}
                onChange={handleYearChange}
                placeholder="Año"
                size="sm"
                fullWidth
                searchable={true}
                clearable={false}
                showChevron={false}
              />
            </div>

            <button
              type="button"
              onClick={goToNextMonth}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-600 flex-shrink-0"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-0.5 mb-1">
            {['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa'].map((day) => (
              <div key={day} className="text-center text-[11px] font-medium text-gray-400 py-1">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-0.5">
            {days.map((day, index) => {
              const isSelected = day.isSelected;
              const isToday = day.isToday && !day.isOtherMonth;
              const isDisabled = day.isDisabled || day.isOtherMonth;
              
              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleDateSelect(day)}
                  disabled={isDisabled}
                  className={`
                    relative text-center rounded-lg transition-all duration-150
                    py-1.5 text-sm
                    ${isDisabled ? 'text-gray-300 cursor-not-allowed' : 'hover:bg-gray-100 cursor-pointer'}
                    ${isToday && !isSelected && !isDisabled ? 'text-[#0f766e] font-semibold' : ''}
                    ${isSelected ? 'bg-[#0f766e] text-white hover:bg-[#0d5e57] shadow-sm' : ''}
                    ${!isDisabled && !isSelected && !isToday ? 'text-gray-700' : ''}
                    ${day.isOtherMonth && !isSelected ? 'text-gray-300' : ''}
                  `}
                >
                  {day.date.getDate()}
                  {isToday && !isSelected && !isDisabled && (
                    <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#0f766e]" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-3 pt-2 border-t border-gray-100 flex justify-between items-center">
            <button
              type="button"
              onClick={() => {
                const today = new Date();
                setViewMonth(today.getMonth());
                setViewYear(today.getFullYear());
              }}
              className="text-xs text-[#0f766e] hover:underline transition-colors font-medium"
            >
              Hoy
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-3 py-1 text-xs text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DatePicker;