import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface AuthContextType {
  isAuthenticated: boolean;
  token: string | null;
  user: any;
  login: (token: string, user: any) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Verifica token no localStorage ao montar
    const savedToken = localStorage.getItem('authToken');
    const savedUser = localStorage.getItem('user');
    
    if (savedToken) {
      setToken(savedToken);
      setUser(savedUser ? JSON.parse(savedUser) : null);
      setIsAuthenticated(true);
      console.log('🟢 [AuthContext] Auth restaurado do localStorage');
    }
  }, []);

  const login = (newToken: string, newUser: any) => {
    console.log('🟢 [AuthContext.login] 1. Iniciando login...');
    console.log('🟢 [AuthContext.login] 2. Token recebido:', newToken?.substring(0, 30));
    console.log('🟢 [AuthContext.login] 3. User recebido:', newUser?.email);
    
    setToken(newToken);
    setUser(newUser);
    setIsAuthenticated(true);
    
    console.log('🟢 [AuthContext.login] 4. Salvando no localStorage...');
    localStorage.setItem('authToken', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
    
    console.log('🟢 [AuthContext.login] 5. Login completo!');
    console.log('🟢 [AuthContext.login] 6. isAuthenticated agora é:', true);
  };

  const logout = () => {
    console.log('🟢 [AuthContext.logout] Deslogando usuário');
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, token, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider');
  }
  return context;
};
