import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import axios from "axios";
import { apiClient } from "../services/api";
import { normalizeUsuarioAutenticado, type UsuarioAutenticado } from "../types/auth";

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: UsuarioAutenticado | null;
  login: (token: string, user: unknown) => Promise<UsuarioAutenticado>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const getStoredToken = (): string | null => {
  const token = localStorage.getItem("authToken");
  if (!token) {
    return null;
  }

  const normalized = token.trim();
  return normalized.length > 0 ? normalized : null;
};

const logAxiosError = (scope: string, error: unknown) => {
  if (axios.isAxiosError(error)) {
    console.error(`❌ [AuthContext] ${scope}:`, {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
    });
    return;
  }

  console.error(`❌ [AuthContext] ${scope}:`, error);
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<UsuarioAutenticado | null>(null);

  const resetSession = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("authUser");
    setIsAuthenticated(false);
    setUser(null);
  };

  const fetchCompleteUser = async (
    baseUser: UsuarioAutenticado | null = null
  ): Promise<UsuarioAutenticado | null> => {
    const token = getStoredToken();
    if (!token) {
      return baseUser;
    }

    try {
      const response = await apiClient.get("/auth/me");

      const mergedPayload = { ...(baseUser ?? {}), ...(response.data ?? {}) };
      return normalizeUsuarioAutenticado(mergedPayload);
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        // Token expirado/invalido: deixa o chamador decidir se deve resetar sessao.
        return null;
      }

      logAxiosError("Erro ao buscar /auth/me", error);
      return baseUser;
    }
  };

  // Inicializa o utilizador a partir do localStorage
  useEffect(() => {
    const initializeUser = async () => {
      try {
        const savedToken = getStoredToken();
        const savedUser = localStorage.getItem("authUser");

        if (!savedToken) {
          resetSession();
          return;
        }

        const parsedUser = savedUser
          ? normalizeUsuarioAutenticado(JSON.parse(savedUser))
          : null;

        if (savedUser && !parsedUser) {
          resetSession();
          return;
        }

        setIsAuthenticated(true);
        if (parsedUser) {
          setUser(parsedUser);
        }

        // /auth/me só é chamado quando há token disponível.
        const completeUser = await fetchCompleteUser(parsedUser);
        if (completeUser) {
          setUser(completeUser);
          localStorage.setItem("authUser", JSON.stringify(completeUser));
        } else {
          resetSession();
        }
      } catch (e) {
        logAxiosError("Erro ao inicializar autenticacao", e);
        resetSession();
      } finally {
        setIsLoading(false);
      }
    };

    initializeUser();
  }, []);

  const login = async (token: string, userData: unknown): Promise<UsuarioAutenticado> => {
    const initialUser = normalizeUsuarioAutenticado(userData);
    
    // ✅ Log detalhado para depuração
    console.log("🔵 [AuthContext] Login - userData recebido:", userData);
    console.log("🔵 [AuthContext] Login - initialUser após normalização:", initialUser);
    
    if (!initialUser) {
      console.error("❌ [AuthContext] Usuário rejeitado! Campos obrigatórios faltando:", {
        email: (userData as any)?.email,
        role: (userData as any)?.role,
        position: (userData as any)?.position,
        department: (userData as any)?.department,
      });
      throw new Error("Dados de usuario invalidos para o contrato de autenticacao");
    }

    const normalizedToken = token.trim();
    if (!normalizedToken) {
      throw new Error("Token JWT ausente ou invalido");
    }

    localStorage.setItem("authToken", normalizedToken);
    localStorage.setItem("authUser", JSON.stringify(initialUser));
    setIsAuthenticated(true);
    setUser(initialUser);

    // Busca role/position e department imediatamente após o login.
    const completeUser = await fetchCompleteUser(initialUser);
    if (completeUser) {
      setUser(completeUser);
      localStorage.setItem("authUser", JSON.stringify(completeUser));
      return completeUser;
    }

    // Nao bloqueia login quando /auth/me falha: segue com dados iniciais validados.
    return initialUser;
  };

  const logout = () => {
    resetSession();
  };

  const refreshUser = async () => {
    try {
      const token = getStoredToken();
      if (!token) throw new Error("No token found");

      const response = await apiClient.get("/auth/me");

      if (response.data) {
        const updatedUser = normalizeUsuarioAutenticado({ ...(user ?? {}), ...response.data });
        if (!updatedUser) {
          throw new Error("Payload de /auth/me nao atende ao contrato do usuario autenticado");
        }

        setUser(updatedUser);
        localStorage.setItem("authUser", JSON.stringify(updatedUser));
        console.log("✅ [AuthContext] Dados do utilizador atualizados");
      }
    } catch (e) {
      logAxiosError("Erro ao atualizar dados", e);
      resetSession();
    }
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, user, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside <AuthProvider>");
  }
  return ctx;
}
