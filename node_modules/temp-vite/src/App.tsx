// src/App.tsx
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { useAuth } from './context/AuthContext';
import DataVizDashboard from './pages/analytics/analytics';
import GoogleAuth from './GoogleAuth';

const Home = () => {
  const { isAuthenticated } = useAuth();

  // Redireciona usuários autenticados para /analytics
  if (isAuthenticated) {
    return <Navigate to="/analytics" replace />;
  }

  // Redireciona usuários não autenticados para /login
  return <Navigate to="/login" replace />;
};

const App = () => {
  return (
    <Routes>
      {/* Root - redireciona para analytics (autenticado) ou login (não autenticado) */}
      <Route path="/" element={<Home />} />

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