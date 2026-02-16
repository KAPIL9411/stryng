import React from 'react';
import { OctagonAlert, RotateCcw } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log detailed error information
    console.error('❌ ErrorBoundary caught an error:');
    console.error('Error:', error);
    console.error('Error Message:', error?.message);
    console.error('Error Stack:', error?.stack);
    console.error('Component Stack:', errorInfo?.componentStack);
    
    // Store error info in state for display in dev mode
    this.setState({ errorInfo });
    
    // Log to external service in production (optional)
    if (import.meta.env.PROD) {
      // You can send to error tracking service here
      // e.g., Sentry, LogRocket, etc.
    }
  }

  handleReset = () => {
    // Clear error state
    this.setState({ hasError: false, error: null, errorInfo: null });
    // Reload the page
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const isDev = import.meta.env.DEV;
      
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
            padding: 'var(--space-4)',
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
                marginBottom: 'var(--space-4)',
              }}
            >
              We apologize for the inconvenience. The application encountered an
              unexpected error.
            </p>
            
            {/* Show error details in development mode */}
            {isDev && this.state.error && (
              <details
                style={{
                  marginTop: 'var(--space-4)',
                  padding: 'var(--space-4)',
                  background: '#fee2e2',
                  borderRadius: 'var(--radius-md)',
                  textAlign: 'left',
                  maxWidth: '600px',
                  margin: '0 auto',
                }}
              >
                <summary style={{ cursor: 'pointer', fontWeight: 'bold', marginBottom: 'var(--space-2)' }}>
                  Error Details (Dev Mode)
                </summary>
                <div style={{ fontSize: '0.875rem', fontFamily: 'monospace' }}>
                  <p style={{ marginBottom: 'var(--space-2)' }}>
                    <strong>Message:</strong> {this.state.error.message}
                  </p>
                  <p style={{ marginBottom: 'var(--space-2)' }}>
                    <strong>Stack:</strong>
                  </p>
                  <pre style={{ 
                    overflow: 'auto', 
                    padding: 'var(--space-2)', 
                    background: 'white',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.75rem',
                  }}>
                    {this.state.error.stack}
                  </pre>
                </div>
              </details>
            )}
          </div>
          <button
            className="btn btn--primary"
            onClick={this.handleReset}
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
