import { useEffect, useState } from 'react';

export default function Preloader() {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Lock body scroll
    const originalOverflow = document.body.style.overflow;
    const originalPosition = document.body.style.position;
    
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    document.body.style.height = '100%';
    
    // Hide preloader after animation
    const timer = setTimeout(() => {
      setIsVisible(false);
      // Restore body scroll
      document.body.style.overflow = originalOverflow;
      document.body.style.position = originalPosition;
      document.body.style.width = '';
      document.body.style.height = '';
    }, 1500);

    return () => {
      clearTimeout(timer);
      document.body.style.overflow = originalOverflow;
      document.body.style.position = originalPosition;
      document.body.style.width = '';
      document.body.style.height = '';
    };
  }, []);

  if (!isVisible) return null;

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
