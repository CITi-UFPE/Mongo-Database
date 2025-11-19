// src/App.tsx
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import DataVizDashboard from './pages/Analytics/analytics';
import GoogleAuth from './GoogleAuth';

const Home = () => (
  <div style={{
    width: '100vw',
    height: '100vh',
    backgroundColor: '#0ea5e9',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    color: 'white',
    fontSize: '2rem',
    fontFamily: 'sans-serif'
  }}>
    Página Inicial (Home)
  </div>
);

const App = () => {
  return (
    <Routes>
      {/* Home protegida - redireciona para login se não autenticado */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        }
      />
      {/* Login - sem proteção */}
      <Route path="/login" element={<GoogleAuth />} />
      {/* Analytics protegido - redireciona para login se não autenticado */}
      <Route
        path="/analytics"
        element={
          <ProtectedRoute>
            <DataVizDashboard />
          </ProtectedRoute>
        }
      />
      {/* 404 */}
      <Route
        path="*"
        element={
          <div style={{ padding: '2rem', backgroundColor: '#ef4444', color: 'white' }}>
            ❌ Página não encontrada
          </div>
        }
      />
    </Routes>
  );
};

export default App;