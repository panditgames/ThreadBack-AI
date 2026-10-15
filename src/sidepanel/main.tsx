import React from 'react';
import ReactDOM from 'react-dom/client';
import { SidepanelApp } from './App';
import '../index.css';

const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <SidepanelApp />
    </React.StrictMode>
  );
}
