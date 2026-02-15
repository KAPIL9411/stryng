import React from 'react';
import './Badge.css';

/**
 * Badge component for labels and status indicators
 * @param {Object} props
 * @param {'default' | 'primary' | 'success' | 'warning' | 'error' | 'info'} props.variant - Badge color variant
 * @param {'sm' | 'md' | 'lg'} props.size - Badge size
 * @param {React.ReactNode} props.children - Badge content
 * @param {string} props.className - Additional CSS classes
 * @param {boolean} props.dot - Show as dot indicator
 */
const Badge = ({
  variant = 'default',
  size = 'md',
  children,
  className = '',
  dot = false,
  ...rest
}) => {
  const badgeClasses = [
    'ui-badge',
    `ui-badge--${variant}`,
    `ui-badge--${size}`,
    dot && 'ui-badge--dot',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <span className={badgeClasses} {...rest}>
      {children}
    </span>
  );
};

export default Badge;
