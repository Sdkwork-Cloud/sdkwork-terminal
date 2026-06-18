import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { renderTerminalApp } from './bootstrap/renderApp';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {renderTerminalApp(App)}
  </React.StrictMode>,
);
