/**
 * Cache Indicator Component
 * Shows a subtle indicator when data is loaded from cache
 * Only visible in development mode
 */

import { useState, useEffect } from 'react';

export default function CacheIndicator({ source, show = false }) {
  const [visible, setVisible] = useState(false);
  const isDev = import.meta.env.DEV;

  useEffect(() => {
    if (show && isDev) {
      setVisible(true);
      const timer = setTimeout(() => setVisible(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [show, isDev]);

  if (!visible || !isDev) return null;

  const getColor = () => {
    switch (source) {
      case 'memory':
        return '#10b981'; // green
      case 'localStorage':
        return '#3b82f6'; // blue
      case 'indexedDB':
        return '#8b5cf6'; // purple
      case 'database':
        return '#f59e0b'; // orange
      default:
        return '#6b7280'; // gray
    }
  };

  const getIcon = () => {
    switch (source) {
      case 'memory':
        return '⚡';
      case 'localStorage':
        return '💾';
      case 'indexedDB':
        return '🗄️';
      case 'database':
        return '🌐';
      default:
        return '📦';
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        background: getColor(),
        color: 'white',
        padding: '8px 16px',
        borderRadius: '8px',
        fontSize: '12px',
        fontWeight: '600',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        animation: 'slideIn 0.3s ease-out',
      }}
    >
      <span>{getIcon()}</span>
      <span>Loaded from {source}</span>
    </div>
  );
}
