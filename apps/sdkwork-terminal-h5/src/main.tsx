import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';

import { AuthGate } from './AuthGate';
import { getIamRuntime } from './bootstrap/iamRuntime';
import App from './App.tsx';
import { LoginPage } from './LoginPage';
import './index.css';

const iamRuntime = getIamRuntime();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/*"
          element={
            <AuthGate tokenManager={iamRuntime.tokenManager}>
              <App />
            </AuthGate>
          }
        />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
);
