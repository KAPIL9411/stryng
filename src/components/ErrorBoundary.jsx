import React from 'react';
import { OctagonAlert, RotateCcw } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="page container"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '60vh',
            textAlign: 'center',
            gap: 'var(--space-6)',
          }}
        >
          <div
            style={{
              color: 'var(--color-error)',
              background: 'var(--color-bg-secondary)',
              padding: 'var(--space-6)',
              borderRadius: 'var(--radius-full)',
            }}
          >
            <OctagonAlert size={48} />
          </div>
          <div>
            <h1
              style={{
                fontSize: 'var(--text-2xl)',
                marginBottom: 'var(--space-2)',
              }}
            >
              Something went wrong
            </h1>
            <p
              style={{
                color: 'var(--color-text-secondary)',
                maxWidth: '400px',
              }}
            >
              We apologize for the inconvenience. The application encountered an
              unexpected error.
            </p>
          </div>
          <button
            className="btn btn--primary"
            onClick={() => window.location.reload()}
          >
            <RotateCcw size={18} />
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
