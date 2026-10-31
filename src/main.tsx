// Primero: configura Zod antes de que se cree ningún esquema.
import './api/zod';

import { Capacitor } from '@capacitor/core';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './app/App';
import { aplicarTemaInicial } from './app/tema';
import './i18n';
import { registrarServiceWorker } from './pwa/registro';
import './app/ionic';
import './styles/tokens.css';
import './styles/tema.css';
import './styles/componentes.css';

aplicarTemaInicial();

const root = document.getElementById('root');
if (!root) throw new Error('Falta el nodo #root');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// En Android la app ya va empaquetada: el service worker es solo para la PWA.
if (import.meta.env.PROD && !Capacitor.isNativePlatform()) {
  void registrarServiceWorker();
}
