import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export const CustomSelect = ({ 
  options = [], 
  value, 
  onChange, 
  placeholder = 'Selecciona una opción',
  className = '',
  style = {},
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const dropdownRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const startY = useRef(0);
  const scrollTop = useRef(0);
  const hasDragged = useRef(false);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset drag states when dropdown state changes
  useEffect(() => {
    if (!isOpen) {
      setIsDragging(false);
      hasDragged.current = false;
    }
  }, [isOpen]);

  const selectedOption = options.find(opt => opt.value === value);

  const handleSelect = (val) => {
    if (disabled) return;
    if (hasDragged.current) {
      // Don't select if the user was dragging/scrolling
      return;
    }
    onChange?.(val);
    setIsOpen(false);
  };

  const handleMouseDown = (e) => {
    if (e.button !== 0) return; // Only drag with left click
    setIsDragging(true);
    startY.current = e.pageY;
    scrollTop.current = dropdownRef.current ? dropdownRef.current.scrollTop : 0;
    hasDragged.current = false;
  };

  const handleMouseMove = (e) => {
    if (!isDragging || !dropdownRef.current) return;
    e.preventDefault();
    const y = e.pageY;
    const walk = (y - startY.current) * 1.5; // multiplier for scrolling speed
    if (Math.abs(y - startY.current) > 5) {
      hasDragged.current = true;
    }
    dropdownRef.current.scrollTop = scrollTop.current - walk;
  };

  const handleMouseUpOrLeave = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e) => {
    setIsDragging(true);
    startY.current = e.touches[0].pageY;
    scrollTop.current = dropdownRef.current ? dropdownRef.current.scrollTop : 0;
    hasDragged.current = false;
  };

  const handleTouchMove = (e) => {
    if (!dropdownRef.current) return;
    const y = e.touches[0].pageY;
    if (Math.abs(y - startY.current) > 5) {
      hasDragged.current = true;
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  return (
    <div 
      ref={containerRef} 
      className={`custom-select-container ${className}`} 
      style={{ position: 'relative', width: '100%', ...style }}
    >
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className="form-input custom-select-trigger"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.6 : 1,
          paddingRight: '12px',
          textAlign: 'left'
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown 
          size={16} 
          style={{ 
            color: 'var(--color-text-secondary)',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0)',
            transition: 'transform 0.2s ease',
            flexShrink: 0
          }} 
        />
      </button>

      {/* Options dropdown menu list */}
      {isOpen && (
        <div 
          ref={dropdownRef}
          className="custom-select-dropdown"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUpOrLeave}
          onMouseLeave={handleMouseUpOrLeave}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            width: '100%',
            maxHeight: '220px',
            overflowY: 'auto',
            zIndex: 100,
            padding: '6px',
            backgroundColor: '#080b11', // Fondo 100% sólido y opaco para evitar transparencias
            border: '1px solid rgba(255, 255, 255, 0.12)', // Borde definido
            borderRadius: '12px', // Bordes redondeados
            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.8), var(--shadow-glow)',
            animation: 'fadeIn 0.15s ease-out',
            cursor: isDragging ? 'grabbing' : 'grab',
            userSelect: 'none'
          }}
        >
          {options.length > 0 ? (
            options.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <div
                  key={opt.value}
                  onClick={() => handleSelect(opt.value)}
                  className={`custom-select-option ${isSelected ? 'selected' : ''}`}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: isSelected ? 600 : 400,
                    color: isSelected ? 'var(--color-accent)' : 'var(--color-text-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    transition: 'var(--transition-smooth)',
                    background: isSelected ? 'var(--color-accent-glow)' : 'transparent',
                    marginBottom: '2px'
                  }}
                >
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {opt.label}
                  </span>
                  {isSelected && <Check size={14} style={{ color: 'var(--color-accent)', flexShrink: 0 }} />}
                </div>
              );
            })
          ) : (
            <div style={{ padding: '8px 12px', color: 'var(--color-text-muted)', fontSize: '13px', textAlign: 'center' }}>
              No hay opciones
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CustomSelect;
