import '@oacp/ui/reset.css';
import '@oacp/ui/theme.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './App.js';
import { enqueueShowcaseEdgePulse } from './graph/showcase-edge-pulse-bus.js';
import './styles/app.css';

if (import.meta.env.DEV) {
  window.__OACP_ENQUEUE_SHOWCASE_EDGE_PULSE__ = enqueueShowcaseEdgePulse;
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element #root not found');
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
