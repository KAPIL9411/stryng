import { Link } from 'react-router-dom';
import { Search, Home, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div
      className="page container"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '70vh',
        textAlign: 'center',
        gap: 'var(--space-8)',
      }}
    >
      {/* Visual */}
      <div style={{ position: 'relative' }}>
        <h1
          style={{
            fontSize: '12rem',
            fontWeight: '900',
            lineHeight: '1',
            color: 'var(--color-gray-100)',
            fontFamily: 'var(--font-display)',
            userSelect: 'none',
          }}
        >
          404
        </h1>
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'white',
            padding: 'var(--space-4)',
            borderRadius: 'var(--radius-full)',
            boxShadow: 'var(--shadow-lg)',
          }}
        >
          <Search
            size={32}
            strokeWidth={1.5}
            color="var(--color-text-secondary)"
          />
        </div>
      </div>

      {/* Message */}
      <div style={{ maxWidth: '400px' }}>
        <h2
          style={{
            fontSize: 'var(--text-2xl)',
            fontWeight: 'var(--font-bold)',
            marginBottom: 'var(--space-3)',
          }}
        >
          Page not found
        </h2>
        <p style={{ color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
          Sorry, we couldn&apos;t find the page you&apos;re looking for. It
          might have been moved or deleted.
        </p>
      </div>

      {/* Actions */}
      <div
        style={{
          display: 'flex',
          gap: 'var(--space-4)',
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}
      >
        <Link to="/" className="btn btn--primary">
          <Home size={18} />
          Back to Home
        </Link>
        <Link to="/products" className="btn btn--secondary">
          <Search size={18} />
          Browse Products
        </Link>
      </div>
    </div>
  );
}
