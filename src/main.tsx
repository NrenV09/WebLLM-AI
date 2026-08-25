import {StrictMode, Suspense} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerServiceWorker } from './utils/offlineManager';

// Register offline caching service worker
registerServiceWorker().catch(() => {});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Suspense fallback={<div style={{color:'white'}}>Loading...</div>}>
      <App />
    </Suspense>
  </StrictMode>,
);
