import { Navigate } from 'react-router-dom';
import { ReactNode } from 'react';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  children: ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { isAuthenticated, token } = useAuth();
  
  console.log('� [ProtectedRoute] Verificando autenticação...');
  console.log('🟡 [ProtectedRoute] isAuthenticated:', isAuthenticated);
  console.log('🟡 [ProtectedRoute] token:', token?.substring(0, 20));
  
  if (!isAuthenticated || !token) {
    console.warn('🔴 [ProtectedRoute] Sem autenticação! Redirecionando para /login');
    return <Navigate to="/login" replace />;
  }

  console.log('🟢 [ProtectedRoute] Acesso permitido!');
  return <>{children}</>;
};
