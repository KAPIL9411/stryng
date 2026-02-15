/**
 * Reusable Loading Spinner Component
 */

export default function LoadingSpinner({
  size = 'md',
  text = 'Loading...',
  fullPage = false,
  color = 'var(--color-primary)',
}) {
  const sizes = {
    sm: '24px',
    md: '40px',
    lg: '60px',
    xl: '80px',
  };

  const spinner = (
    <div
      style={{ textAlign: 'center', padding: fullPage ? '4rem 0' : '2rem 0' }}
    >
      <div
        className="spinner"
        style={{
          margin: '0 auto',
          width: sizes[size],
          height: sizes[size],
          borderColor: `${color}20`,
          borderTopColor: color,
        }}
      />
      {text && (
        <p
          style={{
            marginTop: '1rem',
            color: 'var(--color-text-secondary)',
            fontSize: size === 'sm' ? '0.875rem' : '1rem',
          }}
        >
          {text}
        </p>
      )}
    </div>
  );

  if (fullPage) {
    return (
      <div
        style={{
          minHeight: '60vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {spinner}
      </div>
    );
  }

  return spinner;
}
