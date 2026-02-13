import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';

// Styles
import './styles/variables.css';
import './styles/global.css';
import './styles/layout.css';
import './styles/header-footer.css';
import './styles/components.css';
import './styles/pages.css';
import './styles/utilities.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
