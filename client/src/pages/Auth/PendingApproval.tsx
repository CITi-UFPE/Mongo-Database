import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function PendingApproval() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 flex items-center justify-center">
      <div className="w-full max-w-xl rounded-2xl border border-amber-400/30 bg-slate-900/80 p-6 space-y-4">
        <h1 className="text-2xl font-bold text-amber-200">Aguardando Aprovação</h1>
        <p className="text-slate-300">
          Seu cadastro está em análise pela equipe de Dados. Enquanto o status for Pendente, os dados dos dashboards permanecem bloqueados.
        </p>
        <p className="text-sm text-slate-400">Conta: {user?.email ?? "-"}</p>
        <div className="flex gap-3">
          <button
            onClick={() => navigate("/home", { replace: true })}
            className="rounded-lg border border-slate-600 px-4 py-2 text-sm hover:bg-slate-800"
          >
            Ir para tela segura
          </button>
          <button
            onClick={logout}
            className="rounded-lg border border-slate-600 px-4 py-2 text-sm hover:bg-slate-800"
          >
            Sair
          </button>
        </div>
      </div>
    </div>
  );
}
