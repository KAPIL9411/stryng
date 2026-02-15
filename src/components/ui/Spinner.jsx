import React from 'react';
import './Spinner.css';

/**
 * Spinner component for loading states
 * @param {Object} props
 * @param {'sm' | 'md' | 'lg' | 'xl'} props.size - Spinner size
 * @param {'primary' | 'secondary' | 'accent' | 'white'} props.color - Spinner color
 * @param {string} props.className - Additional CSS classes
 * @param {boolean} props.fullScreen - Show as full screen overlay
 * @param {string} props.label - Accessible label for screen readers
 */
const Spinner = ({
  size = 'md',
  color = 'primary',
  className = '',
  fullScreen = false,
  label = 'Loading...',
  ...rest
}) => {
  const spinnerClasses = [
    'ui-spinner',
    `ui-spinner--${size}`,
    `ui-spinner--${color}`,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const spinner = (
    <div className={spinnerClasses} role="status" aria-label={label} {...rest}>
      <svg className="ui-spinner__svg" viewBox="0 0 50 50">
        <circle
          className="ui-spinner__circle"
          cx="25"
          cy="25"
          r="20"
          fill="none"
          strokeWidth="4"
        />
      </svg>
      <span className="ui-spinner__label">{label}</span>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="ui-spinner-overlay">
        {spinner}
      </div>
    );
  }

  return spinner;
};

export default Spinner;
