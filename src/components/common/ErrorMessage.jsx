import { AlertCircle, RefreshCw, XCircle } from 'lucide-react';
import PropTypes from 'prop-types';

/**
 * ErrorMessage Component
 * Reusable error display component with optional retry functionality
 */
export default function ErrorMessage({
  message,
  title = 'Error',
  type = 'error',
  onRetry,
  showIcon = true,
  className = '',
}) {
  const getIcon = () => {
    switch (type) {
      case 'warning':
        return <AlertCircle size={20} />;
      case 'error':
      default:
        return <XCircle size={20} />;
    }
  };

  const getTypeClass = () => {
    switch (type) {
      case 'warning':
        return 'error-message--warning';
      case 'error':
      default:
        return 'error-message--error';
    }
  };

  return (
    <div className={`error-message ${getTypeClass()} ${className}`}>
      {showIcon && <div className="error-message__icon">{getIcon()}</div>}
      <div className="error-message__content">
        {title && <h4 className="error-message__title">{title}</h4>}
        <p className="error-message__text">{message}</p>
        {onRetry && (
          <button onClick={onRetry} className="error-message__retry">
            <RefreshCw size={16} />
            Try Again
          </button>
        )}
      </div>
    </div>
  );
}

ErrorMessage.propTypes = {
  message: PropTypes.string.isRequired,
  title: PropTypes.string,
  type: PropTypes.oneOf(['error', 'warning']),
  onRetry: PropTypes.func,
  showIcon: PropTypes.bool,
  className: PropTypes.string,
};
