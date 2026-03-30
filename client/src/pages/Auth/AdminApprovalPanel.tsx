import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../../services/api";
import { useAuth } from "../../context/AuthContext";

type PermissaoNivel = "Comercial" | "Financeiro" | "Ambos";

interface PendingUser {
  id: string;
  email: string;
  name: string;
  role: string;
  department: string;
  status: string;
  acesso_aprovado: boolean;
  permissao_nivel?: PermissaoNivel;
}

function exibir_painel_admin(
  pendingUsers: PendingUser[],
  selectedLevel: Record<string, PermissaoNivel>,
  onSelectLevel: (userId: string, level: PermissaoNivel) => void,
  onApprove: (user: PendingUser) => Promise<void>,
  approvingId: string | null
) {
  if (!pendingUsers.length) {
    return <p className="text-slate-300">Nenhum usuário pendente no momento.</p>;
  }

  return (
    <div className="space-y-3">
      {pendingUsers.map((item) => (
        <div key={item.id} className="rounded-xl border border-slate-700 bg-slate-900/70 p-4">
          <p className="text-slate-100 font-medium">{item.name || item.email}</p>
          <p className="text-sm text-slate-300">{item.email}</p>
          <p className="text-xs text-slate-400 mt-1">
            Cargo: {item.role || "-"} | Departamento: {item.department || "-"}
          </p>

          <div className="mt-3 flex gap-2">
            <select
              className="rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-sm"
              value={selectedLevel[item.id] ?? "Comercial"}
              onChange={(event) => onSelectLevel(item.id, event.target.value as PermissaoNivel)}
              disabled={approvingId === item.id}
            >
              <option value="Comercial">Comercial</option>
              <option value="Financeiro">Financeiro</option>
              <option value="Ambos">Ambos</option>
            </select>
            <button
              onClick={() => onApprove(item)}
              disabled={approvingId === item.id}
              className="rounded-md bg-emerald-600 px-3 py-2 text-sm text-white hover:bg-emerald-500 disabled:opacity-60"
            >
              {approvingId === item.id ? "Aprovando..." : "Aprovar usuário"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AdminApprovalPanel() {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [selectedLevel, setSelectedLevel] = useState<Record<string, PermissaoNivel>>({});

  const isAdmin = useMemo(() => {
    if (!user) {
      return false;
    }

    return Boolean(user.is_admin && user.acesso_aprovado && user.status === "Aprovado");
  }, [user]);

  const loadPendingUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get("/auth/admin/pending-users");
      const items = Array.isArray(response.data?.items) ? response.data.items : [];
      setPendingUsers(items);
      setSelectedLevel((prev) => {
        const next = { ...prev };
        items.forEach((item: PendingUser) => {
          if (!next[item.id]) {
            next[item.id] = "Comercial";
          }
        });
        return next;
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro ao carregar pendências.";
      setError(message);
      setPendingUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAdmin) {
      navigate("/home", { replace: true });
      return;
    }

    loadPendingUsers();
  }, [isAdmin]);

  const handleApprove = async (pendingUser: PendingUser) => {
    try {
      setApprovingId(pendingUser.id);
      await apiClient.post("/auth/admin/approve-user", {
        id: pendingUser.id,
        permissao_nivel: selectedLevel[pendingUser.id] ?? "Comercial",
      });
      await refreshUser();
      await loadPendingUsers();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Falha ao aprovar usuário.";
      setError(message);
    } finally {
      setApprovingId(null);
    }
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6">
      <div className="mx-auto max-w-4xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Painel de Aprovação</h1>
            <p className="text-slate-300 text-sm">Aprove usuários pendentes e defina o nível de permissão.</p>
          </div>
          <button
            onClick={() => navigate("/home")}
            className="rounded-lg border border-slate-600 px-4 py-2 text-sm hover:bg-slate-800"
          >
            Voltar
          </button>
        </div>

        {loading ? <p className="text-slate-300">Carregando pendências...</p> : null}
        {error ? <p className="text-rose-300 text-sm">{error}</p> : null}

        {!loading
          ? exibir_painel_admin(
              pendingUsers,
              selectedLevel,
              (userId, level) => setSelectedLevel((prev) => ({ ...prev, [userId]: level })),
              handleApprove,
              approvingId
            )
          : null}
      </div>
    </div>
  );
}
