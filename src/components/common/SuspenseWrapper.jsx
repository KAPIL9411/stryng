import { Suspense } from 'react';

/**
 * Reusable Suspense wrapper with consistent loading state
 * Uses the same preloader as the main app for consistency
 */
function PagePreloader() {
  return (
    <div className="preloader">
      <div className="preloader__content">
        <div className="preloader__logo-container">
          <img
            src="/images/animation.webp"
            alt="Loading"
            className="preloader__logo"
            draggable="false"
          />
          <div className="preloader__pulse-ring"></div>
        </div>
      </div>
    </div>
  );
}

export default function SuspenseWrapper({
  children,
  fallback = <PagePreloader />,
}) {
  return <Suspense fallback={fallback}>{children}</Suspense>;
}
