import { Navigate } from 'react-router-dom';

interface PrivateRouteProps {
  isAuthenticated: boolean;
  children: React.ReactNode;
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ isAuthenticated, children }) => {
  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }
  return <>{children}</>;
};

export default PrivateRoute;