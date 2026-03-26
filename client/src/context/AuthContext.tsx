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
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        // Token expirado/invalido: deixa o chamador decidir se deve resetar sessao.
        return null;
      }
      return baseUser;
    }
  };

  // Inicializa o utilizador a partir do localStorage
  useEffect(() => {
    const initializeUser = async () => {
      try {
        const savedToken = localStorage.getItem("authToken");
        const savedUser = localStorage.getItem("authUser");

        if (savedToken && savedUser) {
          const parsedUser = normalizeUsuarioAutenticado(JSON.parse(savedUser));
          if (!parsedUser) {
            resetSession();
            return;
          }

          setIsAuthenticated(true);
          setUser(parsedUser);

          // Tenta carregar dados completos do servidor
          const completeUser = await fetchCompleteUser(savedToken, parsedUser);
          if (completeUser) {
            setUser(completeUser);
            localStorage.setItem("authUser", JSON.stringify(completeUser));
          } else {
            resetSession();
          }
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
    if (!initialUser) {
      throw new Error("Dados de usuario invalidos para o contrato de autenticacao");
    }

    localStorage.setItem("authToken", token);
    localStorage.setItem("authUser", JSON.stringify(initialUser));
    setIsAuthenticated(true);
    setUser(initialUser);

    // Busca role/position e department imediatamente após o login.
    const completeUser = await fetchCompleteUser(token, initialUser);
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
