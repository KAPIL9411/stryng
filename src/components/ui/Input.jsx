import React, { forwardRef } from 'react';
import './Input.css';

/**
 * Input component with validation and error handling
 * @param {Object} props
 * @param {string} props.type - Input type (text, email, password, number, etc.)
 * @param {string} props.label - Input label
 * @param {string} props.placeholder - Input placeholder
 * @param {string} props.error - Error message to display
 * @param {string} props.helperText - Helper text to display below input
 * @param {boolean} props.required - Mark input as required
 * @param {boolean} props.disabled - Disable input
 * @param {string} props.value - Input value
 * @param {Function} props.onChange - Change handler
 * @param {string} props.className - Additional CSS classes
 * @param {React.ReactNode} props.leftIcon - Icon to display on the left
 * @param {React.ReactNode} props.rightIcon - Icon to display on the right
 */
const Input = forwardRef(
  (
    {
      type = 'text',
      label,
      placeholder,
      error,
      helperText,
      required = false,
      disabled = false,
      value,
      onChange,
      className = '',
      leftIcon,
      rightIcon,
      ...rest
    },
    ref
  ) => {
    const inputId = rest.id || `input-${Math.random().toString(36).substr(2, 9)}`;
    const hasError = Boolean(error);

    const inputClasses = [
      'ui-input__field',
      leftIcon && 'ui-input__field--with-left-icon',
      rightIcon && 'ui-input__field--with-right-icon',
      hasError && 'ui-input__field--error',
      disabled && 'ui-input__field--disabled',
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div className={`ui-input ${className}`}>
        {label && (
          <label htmlFor={inputId} className="ui-input__label">
            {label}
            {required && <span className="ui-input__required">*</span>}
          </label>
        )}
        <div className="ui-input__wrapper">
          {leftIcon && <span className="ui-input__icon ui-input__icon--left">{leftIcon}</span>}
          <input
            ref={ref}
            id={inputId}
            type={type}
            className={inputClasses}
            placeholder={placeholder}
            value={value}
            onChange={onChange}
            disabled={disabled}
            required={required}
            aria-invalid={hasError}
            aria-describedby={
              hasError ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined
            }
            {...rest}
          />
          {rightIcon && <span className="ui-input__icon ui-input__icon--right">{rightIcon}</span>}
        </div>
        {error && (
          <p id={`${inputId}-error`} className="ui-input__error">
            {error}
          </p>
        )}
        {helperText && !error && (
          <p id={`${inputId}-helper`} className="ui-input__helper">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
