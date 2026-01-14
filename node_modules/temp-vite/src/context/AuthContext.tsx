import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface AuthContextType {
  isAuthenticated: boolean;
  token: string | null;
  user: any;
  login: (token: string, user: any) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Verifica token no localStorage ao montar
    console.log('🔵 [AuthContext] Inicializando...');
    const savedToken = localStorage.getItem('authToken');
    const savedUser = localStorage.getItem('user');
    
    console.log('🔵 [AuthContext] Token salvo:', savedToken?.substring(0, 30));
    console.log('🔵 [AuthContext] User salvo:', savedUser ? JSON.parse(savedUser).email : 'nenhum');
    
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
      setIsAuthenticated(true);
      console.log('🟢 [AuthContext] Sessão restaurada do localStorage');
    } else {
      console.log('🟡 [AuthContext] Nenhuma sessão salva encontrada');
    }
    
    setIsLoading(false);
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
    <AuthContext.Provider value={{ isAuthenticated, token, user, login, logout, isLoading }}>
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
