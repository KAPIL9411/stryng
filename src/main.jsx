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
import './styles/coupon-carousel.css';
import './styles/pages.css';
import './styles/utilities.css';
import './styles/checkout-coupon.css';
import './styles/addresses.css';
import './styles/search.css';
import './styles/myntra-theme.css';
import './styles/empty-states.css';

// Initialize features with error handling
try {
  // Setup global auth error handler
  const { setupAuthErrorHandler } = await import('./utils/authErrorHandler.js');
  setupAuthErrorHandler();
} catch (error) {
  console.warn('⚠️ Auth error handler initialization failed:', error);
}

// Address preloading is now handled by the store's initializeAuth
// No need for separate preload setup

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
