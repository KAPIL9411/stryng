import React, { useState, useRef, useEffect } from 'react';
import './Dropdown.css';

/**
 * Dropdown component for select menus
 * @param {Object} props
 * @param {Array} props.options - Array of options {value, label}
 * @param {string|number} props.value - Selected value
 * @param {Function} props.onChange - Change handler
 * @param {string} props.placeholder - Placeholder text
 * @param {string} props.label - Dropdown label
 * @param {boolean} props.disabled - Disable dropdown
 * @param {string} props.error - Error message
 * @param {string} props.className - Additional CSS classes
 */
const Dropdown = ({
  options = [],
  value,
  onChange,
  placeholder = 'Select an option',
  label,
  disabled = false,
  error,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const handleToggle = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
    }
  };

  const handleSelect = (option) => {
    onChange(option.value);
    setIsOpen(false);
  };

  const dropdownClasses = [
    'ui-dropdown',
    disabled && 'ui-dropdown--disabled',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const triggerClasses = [
    'ui-dropdown__trigger',
    isOpen && 'ui-dropdown__trigger--open',
    error && 'ui-dropdown__trigger--error',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={dropdownClasses} ref={dropdownRef}>
      {label && <label className="ui-dropdown__label">{label}</label>}
      
      <button
        type="button"
        className={triggerClasses}
        onClick={handleToggle}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="ui-dropdown__value">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <svg
          className={`ui-dropdown__icon ${isOpen ? 'ui-dropdown__icon--open' : ''}`}
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="6 8 10 12 14 8" />
        </svg>
      </button>

      {isOpen && (
        <ul className="ui-dropdown__menu" role="listbox">
          {options.map((option) => (
            <li
              key={option.value}
              className={`ui-dropdown__item ${
                option.value === value ? 'ui-dropdown__item--selected' : ''
              }`}
              onClick={() => handleSelect(option)}
              role="option"
              aria-selected={option.value === value}
            >
              {option.label}
            </li>
          ))}
        </ul>
      )}

      {error && <p className="ui-dropdown__error">{error}</p>}
    </div>
  );
};

export default Dropdown;
