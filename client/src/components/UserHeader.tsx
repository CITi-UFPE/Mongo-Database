import { useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { User, Briefcase, Building2 } from "lucide-react";

interface UserHeaderProps {
  variant?: "compact" | "full";
  className?: string;
}

/**
 * UserHeader - Componente que exibe dinamicamente dados do utilizador autenticado
 * Consome o estado global de AuthContext
 * 
 * Uso:
 * <UserHeader variant="full" />
 * <UserHeader variant="compact" />
 */
export default function UserHeader({ variant = "full", className = "" }: UserHeaderProps) {
  const { user, isLoading, refreshUser } = useAuth();
  const userFunction =
    typeof user?.position === "string" && user.position.trim()
      ? user.position
      : user?.role;

  useEffect(() => {
    if (!user?.email || isLoading) {
      return;
    }

    const hasFunction = typeof userFunction === "string" && userFunction.trim().length > 0;
    const hasDepartment = typeof user?.department === "string" && user.department.trim().length > 0;

    if (!hasFunction || !hasDepartment) {
      refreshUser();
    }
  }, [user?.email, user?.department, userFunction, isLoading, refreshUser]);

  if (isLoading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-4 bg-slate-700 rounded w-24"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Variante Compacta - Apenas nome
  if (variant === "compact") {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <User className="w-4 h-4 text-blue-300" />
        <span className="text-sm font-medium text-slate-100">
          {user.name || "Utilizador"}
        </span>
      </div>
    );
  }

  // Variante Completa - Nome, Cargo, Departamento
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 ${className}`}>
      {/* Utilizador */}
      <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-blue-500/15 to-cyan-500/15 rounded-xl border border-blue-400/30 backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:border-blue-300/60 hover:shadow-[0_10px_20px_rgba(37,99,235,0.18)]">
        <User className="w-4 h-4 text-blue-300" />
        <div>
          <p className="text-xs text-slate-400">Usuário</p>
          <p className="text-sm font-medium text-blue-100">
            {user.name || "Utilizador"}
          </p>
        </div>
      </div>

      {/* Função/Cargo */}
      <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-cyan-500/15 to-teal-500/15 rounded-xl border border-cyan-400/30 backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:border-cyan-300/60 hover:shadow-[0_10px_20px_rgba(6,182,212,0.18)]">
        <Briefcase className="w-4 h-4 text-cyan-300" />
        <div>
          <p className="text-xs text-slate-400">Função</p>
          <p className="text-sm font-medium text-cyan-100">
            {userFunction || "Utilizador"}
          </p>
        </div>
      </div>

      {/* Departamento */}
      <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-emerald-500/15 to-teal-500/15 rounded-xl border border-emerald-400/30 backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:border-emerald-300/60 hover:shadow-[0_10px_20px_rgba(16,185,129,0.18)]">
        <Building2 className="w-4 h-4 text-emerald-300" />
        <div>
          <p className="text-xs text-slate-400">Departamento</p>
          <p className="text-sm font-medium text-emerald-100">
            {user.department || "Sem departamento"}
          </p>
        </div>
      </div>
    </div>
  );
}
