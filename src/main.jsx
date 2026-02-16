import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { reportWebVitals } from './utils/reportWebVitals.js';

// Styles
import './styles/variables.css';
import './styles/global.css';
import './styles/layout.css';
import './styles/header-footer.css';
import './styles/components.css';
import './styles/pages.css';
import './styles/utilities.css';
import './styles/checkout.css';
import './styles/addresses.css';
import './styles/search.css';
import './styles/empty-states.css';

// Initialize features with error handling
try {
  // Setup global auth error handler
  const { setupAuthErrorHandler } = await import('./utils/authErrorHandler.js');
  setupAuthErrorHandler();
} catch (error) {
  console.warn('⚠️ Auth error handler initialization failed:', error);
}

try {
  // Initialize cache manager for admin console
  await import('./utils/cacheManager.js');
} catch (error) {
  console.warn('⚠️ Cache manager initialization failed:', error);
}

try {
  // Preload banners immediately for instant home page loading
  const { initBannerPreload } = await import('./lib/preloadBanners.js');
  initBannerPreload();
} catch (error) {
  console.warn('⚠️ Banner preload initialization failed:', error);
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);

// Initialize Web Vitals tracking
try {
  reportWebVitals();
} catch (error) {
  console.warn('⚠️ Web Vitals initialization failed:', error);
}
