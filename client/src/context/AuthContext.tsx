import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { apiClient } from "../services/api";

interface User {
  email?: string;
  name?: string;
  picture?: string;
  role?: string;
  position?: string;
  department?: string;
  [key: string]: unknown;
}

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  login: (token: string, user: User) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  const normalizeUser = (userData: User | null): User | null => {
    if (!userData) return null;

    const normalizedRole =
      typeof userData.role === "string" && userData.role.trim()
        ? userData.role
        : (typeof userData.position === "string" ? userData.position : undefined);

    const normalizedPosition =
      typeof userData.position === "string" && userData.position.trim()
        ? userData.position
        : normalizedRole;

    return {
      ...userData,
      role: normalizedRole,
      position: normalizedPosition,
    };
  };

  const fetchCompleteUser = async (token: string, baseUser: User | null = null): Promise<User | null> => {
    try {
      const response = await apiClient.get("/auth/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const mergedUser = normalizeUser({ ...(baseUser ?? {}), ...(response.data ?? {}) });
      return mergedUser;
    } catch (_error) {
      return normalizeUser(baseUser);
    }
  };

  // Inicializa o utilizador a partir do localStorage
  useEffect(() => {
    const initializeUser = async () => {
      try {
        const savedToken = localStorage.getItem("authToken");
        const savedUser = localStorage.getItem("authUser");

        if (savedToken && savedUser) {
          const parsedUser = normalizeUser(JSON.parse(savedUser));
          setIsAuthenticated(true);
          setUser(parsedUser);

          // Tenta carregar dados completos do servidor
          const completeUser = await fetchCompleteUser(savedToken, parsedUser);
          if (completeUser) {
            setUser(completeUser);
            localStorage.setItem("authUser", JSON.stringify(completeUser));
          }
        }
      } catch (e) {
        console.error("❌ [AuthContext] Erro ao inicializar:", e);
      } finally {
        setIsLoading(false);
      }
    };

    initializeUser();
  }, []);

  const login = async (token: string, userData: User) => {
    const initialUser = normalizeUser(userData);
    localStorage.setItem("authToken", token);
    localStorage.setItem("authUser", JSON.stringify(initialUser));
    setIsAuthenticated(true);
    setUser(initialUser);

    // Busca role/position e department imediatamente após o login.
    const completeUser = await fetchCompleteUser(token, initialUser);
    if (completeUser) {
      setUser(completeUser);
      localStorage.setItem("authUser", JSON.stringify(completeUser));
    }
  };

  const logout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("authUser");
    setIsAuthenticated(false);
    setUser(null);
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
        const updatedUser = normalizeUser({ ...(user ?? {}), ...response.data });
        setUser(updatedUser);
        localStorage.setItem("authUser", JSON.stringify(updatedUser));
        console.log("✅ [AuthContext] Dados do utilizador atualizados");
      }
    } catch (e) {
      console.error("❌ [AuthContext] Erro ao atualizar dados:", e);
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
