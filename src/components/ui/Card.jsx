import React from 'react';
import './Card.css';

/**
 * Card component for content grouping
 * @param {Object} props
 * @param {string} props.title - Card title
 * @param {React.ReactNode} props.children - Card content
 * @param {React.ReactNode} props.footer - Card footer content
 * @param {string} props.className - Additional CSS classes
 * @param {boolean} props.hoverable - Add hover effect
 * @param {boolean} props.bordered - Add border
 * @param {Function} props.onClick - Click handler (makes card clickable)
 */
const Card = ({
  title,
  children,
  footer,
  className = '',
  hoverable = false,
  bordered = true,
  onClick,
  ...rest
}) => {
  const cardClasses = [
    'ui-card',
    hoverable && 'ui-card--hoverable',
    bordered && 'ui-card--bordered',
    onClick && 'ui-card--clickable',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const CardWrapper = onClick ? 'button' : 'div';

  return (
    <CardWrapper
      className={cardClasses}
      onClick={onClick}
      type={onClick ? 'button' : undefined}
      {...rest}
    >
      {title && (
        <div className="ui-card__header">
          <h3 className="ui-card__title">{title}</h3>
        </div>
      )}
      <div className="ui-card__body">{children}</div>
      {footer && <div className="ui-card__footer">{footer}</div>}
    </CardWrapper>
  );
};

export default Card;
