import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/app.css';

console.log('Renderer: main.tsx loaded, creating React root...');
try {
  const root = ReactDOM.createRoot(document.getElementById('root')!);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  console.log('Renderer: React root rendered.');
} catch (e) {
  console.error('Renderer: Failed to render React root:', e);
}
