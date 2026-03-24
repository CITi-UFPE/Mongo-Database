import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
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
    token: string,
    baseUser: UsuarioAutenticado | null = null
  ): Promise<UsuarioAutenticado | null> => {
    try {
      const response = await apiClient.get("/auth/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const mergedPayload = { ...(baseUser ?? {}), ...(response.data ?? {}) };
      return normalizeUsuarioAutenticado(mergedPayload);
    } catch (_error) {
      return baseUser;
    }
  };

  // Inicializa o utilizador a partir do localStorage
  useEffect(() => {
    const initializeUser = async () => {
      try {
        const savedToken = localStorage.getItem("authToken");
        const savedUser = localStorage.getItem("authUser");

        if (savedToken) {
          const parsedUser = savedUser ? normalizeUsuarioAutenticado(JSON.parse(savedUser)) : null;

          // Tenta carregar dados completos do servidor, mesmo sem usuário local válido.
          const completeUser = await fetchCompleteUser(savedToken, parsedUser);
          if (!completeUser) {
            resetSession();
            return;
          }

          setIsAuthenticated(true);
          setUser(completeUser);
          localStorage.setItem("authUser", JSON.stringify(completeUser));
        }
      } catch (e) {
        console.error("❌ [AuthContext] Erro ao inicializar:", e);
        resetSession();
      } finally {
        setIsLoading(false);
      }
    };

    initializeUser();
  }, []);

  const login = async (token: string, userData: unknown): Promise<UsuarioAutenticado> => {
    const initialUser = normalizeUsuarioAutenticado(userData);
    localStorage.setItem("authToken", token);

    // Em deploy, /auth/google pode vir sem role/department; tenta recuperar em /auth/me.
    const completeUser = await fetchCompleteUser(token, initialUser);
    if (completeUser) {
      setIsAuthenticated(true);
      setUser(completeUser);
      localStorage.setItem("authUser", JSON.stringify(completeUser));
      return completeUser;
    }

    throw new Error("Nao foi possivel validar o usuario com os dados do backend");
  };

  const logout = () => {
    resetSession();
  };

  const refreshUser = async () => {
    try {
      const token = localStorage.getItem("authToken");
      if (!token) throw new Error("No token found");

      const response = await apiClient.get("/auth/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

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
      console.error("❌ [AuthContext] Erro ao atualizar dados:", e);
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
