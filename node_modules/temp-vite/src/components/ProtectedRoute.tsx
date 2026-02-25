import { Navigate } from 'react-router-dom';
import { ReactNode } from 'react';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  children: ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { isAuthenticated, token, isLoading } = useAuth();
  
  console.log('🔵 [ProtectedRoute] Verificando autenticação...');
  console.log('🟡 [ProtectedRoute] isLoading:', isLoading);
  console.log('🟡 [ProtectedRoute] isAuthenticated:', isAuthenticated);
  console.log('🟡 [ProtectedRoute] token:', token?.substring(0, 20));
  
  // Aguarda carregar a sessão do localStorage
  if (isLoading) {
    console.log('🟡 [ProtectedRoute] Carregando sessão...');
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '1.5rem',
        color: '#64748b'
      }}>
        Carregando...
      </div>
    );
  }
  
  if (!isAuthenticated || !token) {
    console.warn('🔴 [ProtectedRoute] Sem autenticação! Redirecionando para /login');
    return <Navigate to="/login" replace />;
  }

  console.log('🟢 [ProtectedRoute] Acesso permitido!');
  return <>{children}</>;
};
