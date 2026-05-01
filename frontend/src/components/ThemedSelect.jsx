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
  const [activeIndex, setActiveIndex] = useState(-1);
  const rootRef = useRef(null);
  const optionRefs = useRef([]);
  const generatedId = useId();

  const triggerId = id || `${generatedId}-trigger`;
  const listboxId = `${triggerId}-listbox`;
  const normalizedValue = normalizeValue(value);
  const isMenuOpen = open && !disabled;

  const selectedOption = useMemo(
    () => options.find((option) => normalizeValue(option.value) === normalizedValue) || null,
    [options, normalizedValue]
  );

  const displayLabel = selectedOption?.label || placeholder;

  const firstEnabledOptionIndex = useMemo(
    () => options.findIndex((option) => !option.disabled),
    [options]
  );

  const selectedOptionIndex = useMemo(
    () => options.findIndex((option) => normalizeValue(option.value) === normalizedValue),
    [options, normalizedValue]
  );

  const getInitialActiveIndex = () => {
    if (selectedOptionIndex >= 0 && !options[selectedOptionIndex]?.disabled) {
      return selectedOptionIndex;
    }

    return firstEnabledOptionIndex;
  };

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

  useEffect(() => {
    if (!isMenuOpen || activeIndex < 0) {
      return;
    }

    const node = optionRefs.current[activeIndex];
    if (node) {
      node.focus();
    }
  }, [isMenuOpen, activeIndex]);

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
        setActiveIndex(getInitialActiveIndex());
        setOpen(true);
      }
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (options.length > 0) {
        setActiveIndex(getInitialActiveIndex());
        setOpen(true);
      }
    }

    if (event.key === 'Escape') {
      setOpen(false);
      setActiveIndex(-1);
    }
  };

  const moveActiveIndex = (direction) => {
    if (options.length === 0) {
      return;
    }

    let nextIndex = activeIndex;
    const total = options.length;

    for (let step = 0; step < total; step += 1) {
      nextIndex = (nextIndex + direction + total) % total;

      if (!options[nextIndex]?.disabled) {
        setActiveIndex(nextIndex);
        return;
      }
    }
  };

  const handleOptionKeyDown = (event, option, index) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      moveActiveIndex(1);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      moveActiveIndex(-1);
      return;
    }

    if (event.key === 'Home') {
      event.preventDefault();
      setActiveIndex(firstEnabledOptionIndex);
      return;
    }

    if (event.key === 'End') {
      event.preventDefault();

      for (let i = options.length - 1; i >= 0; i -= 1) {
        if (!options[i]?.disabled) {
          setActiveIndex(i);
          break;
        }
      }

      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
      setActiveIndex(-1);
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleOptionSelect(option);
      return;
    }

    setActiveIndex(index);
  };

  return (
    <div ref={rootRef} className={`themed-select ${className}`.trim()}>
      <button
        type="button"
        id={triggerId}
        disabled={disabled}
        className={`form-field themed-select-trigger ${isMenuOpen ? 'themed-select-trigger-open' : ''}`}
        aria-haspopup="listbox"
        aria-expanded={isMenuOpen}
        aria-controls={listboxId}
        onClick={() => {
          if (disabled || options.length === 0) {
            return;
          }

          setOpen((current) => {
            if (current) {
              setActiveIndex(-1);
              return false;
            }

            setActiveIndex(getInitialActiveIndex());
            return true;
          });
        }}
        onKeyDown={handleTriggerKeyDown}
      >
        <span className={`themed-select-label ${selectedOption ? '' : 'themed-select-label-muted'}`}>{displayLabel}</span>
        <ChevronDown className={`themed-select-chevron ${isMenuOpen ? 'themed-select-chevron-open' : ''}`} />
      </button>

      {isMenuOpen && (
        <div className={`themed-select-menu ${menuClassName}`.trim()} id={listboxId} role="listbox" aria-labelledby={triggerId}>
          {options.length === 0 ? (
            <p className="themed-select-empty">No options available</p>
          ) : (
            options.map((option, optionIndex) => {
              const optionValue = normalizeValue(option.value);
              const isSelected = optionValue === normalizedValue;

              return (
                <button
                  key={`${optionValue}-${option.label}`}
                  type="button"
                  ref={(node) => {
                    optionRefs.current[optionIndex] = node;
                  }}
                  role="option"
                  aria-selected={isSelected}
                  disabled={option.disabled}
                  className={`themed-select-option ${isSelected ? 'themed-select-option-selected' : ''}`}
                  tabIndex={activeIndex === optionIndex ? 0 : -1}
                  onClick={() => handleOptionSelect(option)}
                  onKeyDown={(event) => handleOptionKeyDown(event, option, optionIndex)}
                  onMouseEnter={() => setActiveIndex(optionIndex)}
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
