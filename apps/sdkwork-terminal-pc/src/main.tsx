import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { AuthGate } from './AuthGate';
import { getIamRuntime } from './bootstrap/iamRuntime';
import './index.css';

const iamRuntime = getIamRuntime();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthGate tokenManager={iamRuntime.tokenManager}>
      <App />
    </AuthGate>
  </React.StrictMode>,
);
