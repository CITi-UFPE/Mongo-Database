/// <reference types="vite/client" />

// client/src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { GoogleOAuthProvider } from "@react-oauth/google";

// Import the Auth page and global styles (Tailwind)
import Auth from './pages/Auth/Auth';
import Analytics from './pages/Analytics/analytics';
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
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
        <Root />
      </GoogleOAuthProvider>
    </React.StrictMode>
  );
}