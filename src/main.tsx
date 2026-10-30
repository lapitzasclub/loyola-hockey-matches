import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './app/App';
import { aplicarTemaInicial } from './app/tema';
import './i18n';
import './app/ionic';
import './styles/tokens.css';
import './styles/tema.css';

aplicarTemaInicial();

const root = document.getElementById('root');
if (!root) throw new Error('Falta el nodo #root');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
