/// <reference types="vite/client" />

// client/src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { GoogleOAuthProvider } from "@react-oauth/google";

// Import the Auth page and global styles (Tailwind)
import Auth from './pages/Auth/Auth';
import Analytics from './pages/analytics/analytics';
import './index.css';

const Root = () => (
  <Router>
    <Routes>
      <Route path="/" element={<Auth />} />
      <Route path="/analytics" element={<Analytics />} />
      {/* Add more routes here, e.g. <Route path="/profile" element={<Profile />} /> */}
    </Routes>
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