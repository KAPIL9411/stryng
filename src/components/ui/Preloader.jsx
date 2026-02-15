import { useEffect, useState } from 'react';

export default function Preloader() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading time (e.g., 2 seconds)
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  if (!loading) return null;

  return (
    <div className="preloader">
      <div className="preloader__content">
        <div className="preloader__logo-container">
          <img
            src="/images/animation.webp"
            alt="Stryng Monogram"
            className="preloader__logo"
          />
          <div className="preloader__pulse-ring"></div>
        </div>
        <h2 className="preloader__text">STRYNG</h2>
      </div>
    </div>
  );
}
