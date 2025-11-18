/// <reference types="vite/client" />

// client/src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router } from 'react-router-dom';
import { GoogleOAuthProvider } from "@react-oauth/google";

import App from './App';
import { AuthProvider } from './context/AuthContext';
import { config } from './config/env';
import './index.css';

const Root = () => (
  <Router>
    <AuthProvider>
      <App />
    </AuthProvider>
  </Router>
);

const rootElement = document.getElementById('root');
if (rootElement) {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      {clientId ? (
        <GoogleOAuthProvider clientId={clientId}>
          <Root />
        </GoogleOAuthProvider>
      ) : (
        <div style={{ color: 'red', textAlign: 'center', marginTop: '2rem' }}>
          Error: Google OAuth Client ID is missing. Please set VITE_GOOGLE_CLIENT_ID in your environment variables.
        </div>
      )}
    </React.StrictMode>
  );
}