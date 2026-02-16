import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { reportWebVitals } from './utils/reportWebVitals.js';
import { initBannerPreload } from './lib/preloadBanners.js';
import { setupAuthErrorHandler } from './utils/authErrorHandler.js';
import './utils/cacheManager.js'; // Initialize cache manager for admin console

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

// Setup global auth error handler
setupAuthErrorHandler();

// Preload banners immediately for instant home page loading
initBannerPreload();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);

// Initialize Web Vitals tracking
reportWebVitals();
