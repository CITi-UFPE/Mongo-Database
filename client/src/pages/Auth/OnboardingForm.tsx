import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../../services/api";
import { CARGOS, DEPARTAMENTOS } from "../../types/auth";
import { useAuth } from "../../context/AuthContext";

export default function OnboardingForm() {
  const navigate = useNavigate();
  const { user, refreshUser, logout } = useAuth();
  const [cargo, setCargo] = useState<string>("");
  const [departamento, setDepartamento] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isCitiUser = useMemo(() => {
    const email = (user?.email ?? "").toLowerCase();
    return email.endsWith("@citi") || email.includes("@citi.");
  }, [user?.email]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!cargo) {
      setError("Selecione um cargo.");
      return;
    }

    if (!departamento) {
      setError("Selecione um departamento.");
      return;
    }

    try {
      setLoading(true);
      await apiClient.post("/auth/register-profile", {
        cargo,
        departamento,
      });
      await refreshUser();
      navigate("/analytics", { replace: true });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Não foi possível enviar o cadastro.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    navigate("/", { replace: true });
    return null;
  }

  if (!isCitiUser) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 p-6 flex items-center justify-center">
        <div className="w-full max-w-lg rounded-2xl border border-rose-500/40 bg-slate-900/80 p-6">
          <h1 className="text-xl font-semibold text-rose-300">Acesso restrito</h1>
          <p className="text-slate-300 mt-3">Apenas usuários com e-mail @citi podem acessar o formulário de cadastro.</p>
          <button
            onClick={logout}
            className="mt-5 rounded-lg border border-slate-600 px-4 py-2 text-sm hover:bg-slate-800"
          >
            Sair
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-slate-100 p-6 flex items-center justify-center">
      <form onSubmit={submit} className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900/80 p-6 space-y-4">
        <div>
          <h1 className="text-2xl font-bold">Primeiro acesso</h1>
          <p className="text-slate-300 mt-2">Acessar Dashboard</p>
          <p className="text-slate-400 text-sm mt-1">Usuário: {user.email}</p>
        </div>

        <div>
          <label className="text-sm text-slate-300 block mb-2">Cargo</label>
          <select
            value={cargo}
            onChange={(event) => setCargo(event.target.value)}
            className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2"
            disabled={loading}
          >
            <option value="">Selecione um cargo</option>
            {CARGOS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm text-slate-300 block mb-2">Departamento</label>
          <select
            value={departamento}
            onChange={(event) => setDepartamento(event.target.value)}
            className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2"
            disabled={loading}
          >
            <option value="">Selecione um departamento</option>
            {DEPARTAMENTOS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        {error ? <p className="text-sm text-rose-300">{error}</p> : null}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-cyan-600 px-4 py-2 font-medium text-white hover:bg-cyan-500 disabled:opacity-60"
        >
          {loading ? "Enviando..." : "Enviar para aprovação"}
        </button>
      </form>
    </div>
  );
}
