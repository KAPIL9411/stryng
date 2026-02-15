import { Suspense } from 'react';
import LoadingSpinner from './LoadingSpinner';

/**
 * Reusable Suspense wrapper with consistent loading state
 * Used for lazy-loaded components
 */
export default function SuspenseWrapper({
  children,
  fallback = <LoadingSpinner fullPage size="lg" text="Loading..." />,
}) {
  return <Suspense fallback={fallback}>{children}</Suspense>;
}
