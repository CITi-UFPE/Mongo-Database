// client/src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

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
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <Root />
    </React.StrictMode>
  );
}