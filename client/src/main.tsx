// client/src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';

const App = () => {
  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      backgroundColor: '#0ea5e9', // azul (tailwind: sky-500)
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      color: 'white',
      fontSize: '2rem',
      fontFamily: 'sans-serif'
    }}>
      ✅ Vite + React funcionando!
    </div>
  );
};

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}