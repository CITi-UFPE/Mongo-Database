import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import Dashboard from "@/components/ui/dashboard";
import { fetchAnalyticsPayload, type AnalyticsPayload } from "@/services/analytics";
import { apiClient } from "@/services/api";
import { useAuth } from "./context/AuthContext";
import { canAccessAnalytics } from "./types/auth";

type ViewMode = "dashboard" | "planilha";
type SheetRow = Record<string, unknown>;

interface AppProps {
  defaultViewMode?: ViewMode;
}

export default function App({ defaultViewMode = "planilha" }: AppProps) {
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const hasAnalyticsAccess = canAccessAnalytics(user);
  const [viewMode, setViewMode] = useState<ViewMode>(hasAnalyticsAccess ? defaultViewMode : "planilha");
  const [data, setData] = useState<AnalyticsPayload | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  const [sheets, setSheets] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>("");
  const [sheetRows, setSheetRows] = useState<SheetRow[]>([]);
  const [loadingSheets, setLoadingSheets] = useState(false);
  const [loadingRows, setLoadingRows] = useState(false);
  const [sheetError, setSheetError] = useState<string | null>(null);

  useEffect(() => {
    if (!hasAnalyticsAccess && viewMode === "dashboard") {
      setViewMode("planilha");
    }
  }, [hasAnalyticsAccess, viewMode]);

  useEffect(() => {
    if (!hasAnalyticsAccess || viewMode !== "dashboard") {
      setLoadingAnalytics(false);
      return;
    }

    let cancelled = false;

    const load = async () => {
      setLoadingAnalytics(true);
      setAnalyticsError(null);
      try {
        const payload = await fetchAnalyticsPayload();
        if (!cancelled) {
          setData(payload);
        }
      } catch (_error) {
        if (!cancelled) {
          setData(null);
          setAnalyticsError("Não foi possível carregar Analytics da API.");
        }
      } finally {
        if (!cancelled) {
          setLoadingAnalytics(false);
        }
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [hasAnalyticsAccess, viewMode]);

  useEffect(() => {
    let cancelled = false;

    const loadSheets = async () => {
      setLoadingSheets(true);
      setSheetError(null);
      try {
        const response = await apiClient.get("/api/spreadsheet/collections/");
        const payload = response.data;
        if (!Array.isArray(payload)) {
          throw new Error("Formato inválido de planilhas");
        }
        if (!cancelled) {
          setSheets(payload);
        }
      } catch (_error) {
        if (!cancelled) {
          setSheets([]);
          setSheetError("Não foi possível carregar as planilhas.");
        }
      } finally {
        if (!cancelled) {
          setLoadingSheets(false);
        }
      }
    };

    loadSheets();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedSheet) {
      setSheetRows([]);
      return;
    }

    let cancelled = false;

    const loadRows = async () => {
      setLoadingRows(true);
      setSheetError(null);
      try {
        const response = await apiClient.get(`/api/spreadsheet/${encodeURIComponent(selectedSheet)}/`);
        const payload = response.data;
        if (!Array.isArray(payload)) {
          throw new Error("Formato inválido de linhas");
        }
        if (!cancelled) {
          setSheetRows(payload);
        }
      } catch (_error) {
        if (!cancelled) {
          setSheetRows([]);
          setSheetError("Não foi possível carregar os dados da planilha.");
        }
      } finally {
        if (!cancelled) {
          setLoadingRows(false);
        }
      }
    };

    loadRows();
    return () => {
      cancelled = true;
    };
  }, [selectedSheet]);

  const tableHeaders = useMemo(() => {
    if (!sheetRows.length) {
      return [] as string[];
    }
    const keys = new Set<string>();
    sheetRows.forEach((row) => {
      Object.keys(row).forEach((key) => keys.add(key));
    });
    return Array.from(keys);
  }, [sheetRows]);

  const renderCell = (value: unknown) => {
    if (value === null || value === undefined || value === "") {
      return "—";
    }
    if (typeof value === "object") {
      try {
        return JSON.stringify(value);
      } catch (_error) {
        return "[objeto]";
      }
    }
    return String(value);
  };

  const handleLogout = () => {
    logout();
    navigate("/", { replace: true });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0B1120] via-[#0D1929] to-[#0F172A] text-slate-100 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/70 p-2 w-fit">
            {hasAnalyticsAccess ? (
              <button
                onClick={() => setViewMode("dashboard")}
                className={`px-4 py-2 rounded-md text-sm transition ${
                  viewMode === "dashboard" ? "bg-cyan-600 text-white" : "text-slate-300 hover:bg-slate-800"
                }`}
              >
                Dashboard
              </button>
            ) : null}
            <button
              onClick={() => setViewMode("planilha")}
              className={`px-4 py-2 rounded-md text-sm transition ${
                viewMode === "planilha" ? "bg-cyan-600 text-white" : "text-slate-300 hover:bg-slate-800"
              }`}
            >
              Visualização de Planilha
            </button>
          </div>

          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/70 px-4 py-2 text-sm text-slate-200 transition hover:bg-slate-800"
            title="Sair"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </div>

        {viewMode === "dashboard" && hasAnalyticsAccess ? (
          <>
            {analyticsError ? <p className="text-rose-300 text-sm">{analyticsError}</p> : null}
            {loadingAnalytics ? <p className="text-slate-300 text-sm">Carregando Analytics...</p> : null}
            {data ? <Dashboard data={data} /> : null}
          </>
        ) : (
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-4">
              <label className="text-sm text-slate-300 mr-3">Planilha:</label>
              <select
                className="bg-slate-800 border border-slate-600 text-slate-100 rounded-md px-3 py-2"
                value={selectedSheet}
                onChange={(event) => setSelectedSheet(event.target.value)}
                disabled={loadingSheets || sheets.length === 0}
              >
                <option value="">Selecione</option>
                {sheets.map((sheet) => (
                  <option key={sheet} value={sheet}>
                    {sheet}
                  </option>
                ))}
              </select>
              {loadingSheets ? <p className="mt-2 text-xs text-slate-400">Carregando planilhas...</p> : null}
              {sheetError ? <p className="mt-2 text-xs text-rose-300">{sheetError}</p> : null}
            </div>

            <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-4 overflow-auto">
              {loadingRows ? (
                <p className="text-slate-300">Carregando dados...</p>
              ) : tableHeaders.length && sheetRows.length ? (
                <table className="w-full text-sm">
                  <thead className="text-slate-300 border-b border-slate-700">
                    <tr>
                      {tableHeaders.map((header) => (
                        <th key={header} className="px-2 py-2 text-left whitespace-nowrap">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sheetRows.map((row, index) => (
                      <tr key={`${index}-${String(row.id ?? "row")}`} className="border-b border-slate-800">
                        {tableHeaders.map((header) => (
                          <td key={`${index}-${header}`} className="px-2 py-2 whitespace-nowrap text-slate-200">
                            {renderCell(row[header])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-slate-400">Selecione uma planilha para visualizar os dados.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
