import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

const normalizeValue = (value) => String(value ?? '');

const ThemedSelect = ({
  id,
  name,
  value,
  options = [],
  placeholder = 'Select option',
  disabled = false,
  onChange,
  onValueChange,
  className = '',
  menuClassName = ''
}) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const generatedId = useId();

  const listboxId = `${id || generatedId}-listbox`;
  const normalizedValue = normalizeValue(value);
  const isMenuOpen = open && !disabled;

  const selectedOption = useMemo(
    () => options.find((option) => normalizeValue(option.value) === normalizedValue) || null,
    [options, normalizedValue]
  );

  const displayLabel = selectedOption?.label || placeholder;

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (!rootRef.current || rootRef.current.contains(event.target)) {
        return;
      }

      setOpen(false);
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, []);

  const emitChange = (nextValue) => {
    if (onValueChange) {
      onValueChange(nextValue);
    }

    if (onChange) {
      onChange({
        target: {
          id,
          name,
          value: nextValue
        }
      });
    }
  };

  const handleOptionSelect = (option) => {
    if (option.disabled) {
      return;
    }

    const nextValue = normalizeValue(option.value);
    emitChange(nextValue);
    setOpen(false);
  };

  const handleTriggerKeyDown = (event) => {
    if (disabled) {
      return;
    }

    if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (options.length > 0) {
        setOpen(true);
      }
    }

    if (event.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div ref={rootRef} className={`themed-select ${className}`.trim()}>
      <button
        type="button"
        id={id}
        disabled={disabled}
        className={`form-field themed-select-trigger ${isMenuOpen ? 'themed-select-trigger-open' : ''}`}
        aria-haspopup="listbox"
        aria-expanded={isMenuOpen}
        aria-controls={listboxId}
        onClick={() => {
          if (disabled || options.length === 0) {
            return;
          }

          setOpen((current) => !current);
        }}
        onKeyDown={handleTriggerKeyDown}
      >
        <span className={`themed-select-label ${selectedOption ? '' : 'themed-select-label-muted'}`}>{displayLabel}</span>
        <ChevronDown className={`themed-select-chevron ${isMenuOpen ? 'themed-select-chevron-open' : ''}`} />
      </button>

      {isMenuOpen && (
        <div className={`themed-select-menu ${menuClassName}`.trim()} id={listboxId} role="listbox" aria-labelledby={id}>
          {options.length === 0 ? (
            <p className="themed-select-empty">No options available</p>
          ) : (
            options.map((option) => {
              const optionValue = normalizeValue(option.value);
              const isSelected = optionValue === normalizedValue;

              return (
                <button
                  key={`${optionValue}-${option.label}`}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  disabled={option.disabled}
                  className={`themed-select-option ${isSelected ? 'themed-select-option-selected' : ''}`}
                  onClick={() => handleOptionSelect(option)}
                >
                  <span className="themed-select-option-text">{option.label}</span>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export default ThemedSelect;
