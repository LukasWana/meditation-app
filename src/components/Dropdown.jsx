import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

const Dropdown = ({
  options,
  value,
  onChange,
  placeholder = "Select...",
  renderOption = (option) => option.label,
  renderValue = (option) => option.label,
  className = ""
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Zavři dropdown při kliknutí mimo
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const selectedOption = options.find(option => option.value === value);

  return (
    <div
      ref={dropdownRef}
      className={`relative inline-block z-10000 ${className}`}
    >
      {/* Tlačítko */}
      <button
        onClick={() => {
          console.log('Dropdown clicked, current state:', isOpen);
          setIsOpen(!isOpen);
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 16px',
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          border: '1px solid #e5e7eb',
          borderRadius: '9999px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          cursor: 'pointer',
          minWidth: '120px'
        }}
      >
        <span className="text-14 font-medium text-gray-700">
          {selectedOption ? renderValue(selectedOption) : placeholder}
        </span>
        <ChevronDown
          size={16}
          style={{
            color: '#6b7280',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s'
          }}
        />
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: '0',
            right: '0',
            marginTop: '8px',
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
            zIndex: 10001,
            overflow: 'hidden',
            minWidth: '120px'
          }}
        >
          {options.map((option) => (
            <button
              key={option.value}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              style={{
                width: '100%',
                padding: '12px 16px',
                fontSize: '14px',
                fontWeight: '500',
                backgroundColor: value === option.value ? '#f3f4f6' : 'transparent',
                color: value === option.value ? '#111827' : '#374151',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
              onMouseEnter={(e) => {
                if (value !== option.value) {
                  e.target.style.backgroundColor = '#f9fafb';
                }
              }}
              onMouseLeave={(e) => {
                if (value !== option.value) {
                  e.target.style.backgroundColor = 'transparent';
                }
              }}
            >
              {option.icon && <span>{option.icon}</span>}
              <span>{renderOption(option)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default Dropdown;









