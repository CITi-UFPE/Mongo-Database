import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BarChart3, ChevronLeft, ChevronRight, HandCoins, LogOut, Table2 } from "lucide-react";
import axios from "axios";
import Dashboard from "@/components/ui/dashboard";
import FinancialDashboard from "@/components/ui/financial-dashboard";
import { PipefySyncButton } from "@/components/ui/pipefy-sync-button";
import { fetchAnalyticsPayload, getAnalyticsErrorMessage, type AnalyticsPayload } from "@/services/analytics";
import type { DateRangeSelection, DateRangeValue } from "@/components/ui/date-filter";
import { apiClient } from "@/services/api";
import { useAuth } from "./context/AuthContext";
import {
  canAccessAnalytics,
  canAccessCommercialAnalytics,
  canAccessFinancialAnalytics,
  isPendingAccess,
} from "./types/auth";

type ViewMode = "dashboard" | "planilha";
type DashboardMode = "comercial" | "financeiro";
type SheetRow = Record<string, unknown>;

interface AppProps {
  defaultViewMode?: ViewMode;
}

function getCurrentYearRange(): DateRangeSelection {
  const now = new Date();
  return {
    from: new Date(now.getFullYear(), 0, 1),
    to: new Date(now.getFullYear(), 11, 31),
  };
}

function getPipefySyncErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const detail =
      typeof error.response?.data?.detail === "string" && error.response.data.detail.trim()
        ? error.response.data.detail.trim()
        : null;

    if (status === 503) {
      return "Pipefy está temporariamente indisponível. Tente novamente em instantes.";
    }

    if (detail) {
      return detail;
    }
  }

  return "Falha ao sincronizar com o Pipefy. Tente novamente.";
}

export default function App({ defaultViewMode = "planilha" }: AppProps) {
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const hasAnalyticsAccess = canAccessAnalytics(user);
  const canSeeCommercialDashboard = canAccessCommercialAnalytics(user);
  const canSeeFinancialDashboard = canAccessFinancialAnalytics(user);
  const accessLocked = isPendingAccess(user);
  const isAdmin = Boolean(user?.is_admin && user?.acesso_aprovado && user?.status === "Aprovado");
  const [viewMode, setViewMode] = useState<ViewMode>(hasAnalyticsAccess ? defaultViewMode : "planilha");
  const [dashboardMode, setDashboardMode] = useState<DashboardMode>("comercial");
  const [data, setData] = useState<AnalyticsPayload | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [sheets, setSheets] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>("");
  const [sheetRows, setSheetRows] = useState<SheetRow[]>([]);
  const [loadingSheets, setLoadingSheets] = useState(false);
  const [loadingRows, setLoadingRows] = useState(false);
  const [sheetError, setSheetError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRangeSelection>(getCurrentYearRange);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  useEffect(() => {
    if (!hasAnalyticsAccess && viewMode === "dashboard") {
      setViewMode("planilha");
    }
  }, [hasAnalyticsAccess, viewMode]);

  useEffect(() => {
    if (!canSeeCommercialDashboard && canSeeFinancialDashboard) {
      setDashboardMode("financeiro");
      return;
    }

    if (!canSeeFinancialDashboard && dashboardMode === "financeiro") {
      setDashboardMode("comercial");
    }
  }, [canSeeCommercialDashboard, canSeeFinancialDashboard, dashboardMode]);

  const loadAnalytics = useCallback(async (range?: DateRangeSelection) => {
    const activeRange = range ?? dateRange;
    setLoadingAnalytics(true);
    setAnalyticsError(null);
    try {
      const payload = await fetchAnalyticsPayload({
        data_inicio: activeRange.from,
        data_fim: activeRange.to,
      });
      setData(payload);
    } catch (error) {
      setData(null);
      setAnalyticsError(getAnalyticsErrorMessage(error));
    } finally {
      setLoadingAnalytics(false);
    }
  }, [dateRange]);

  const handleDateFilterChange = useCallback((_range: DateRangeValue, dates?: DateRangeSelection) => {
    if (!dates) {
      return;
    }
    setDateRange(dates);
    loadAnalytics(dates);
  }, [loadAnalytics]);

  useEffect(() => {
    if (accessLocked) {
      setLoadingAnalytics(false);
      setData(null);
      return;
    }

    if (!hasAnalyticsAccess || viewMode !== "dashboard") {
      setLoadingAnalytics(false);
      return;
    }

    loadAnalytics(getCurrentYearRange());
  }, [hasAnalyticsAccess, viewMode, accessLocked, loadAnalytics]);

  const handleSyncPipefy = useCallback(async () => {
    if (isSyncing) {
      return;
    }

    setSyncMessage(null);
    setIsSyncing(true);
    try {
      await apiClient.post("https://mongo-database-backend.onrender.com/api/integrations/pipefy/sync", {});
      setSyncMessage("Sincronização concluída e dados atualizados.");
    } catch (error) {
      const message = getPipefySyncErrorMessage(error);
      setSyncMessage(message);
      window.alert(message);
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, loadAnalytics]);

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
      <div className="mx-auto max-w-[1600px]">
        <div className="flex min-h-[calc(100vh-3rem)] gap-4">
          <aside
            className={`rounded-2xl border border-slate-700 bg-slate-900/70 p-4 backdrop-blur-md transition-all duration-300 ${
              isSidebarCollapsed ? "w-[84px]" : "w-full max-w-[280px]"
            }`}
          >
            <div className="flex h-full flex-col justify-between">
              <div>
                <div className="mb-3 flex items-center justify-between">
                  {!isSidebarCollapsed ? (
                    <h2 className="px-2 text-sm font-semibold uppercase tracking-wider text-slate-300">Navegação</h2>
                  ) : (
                    <span className="px-2 text-xs uppercase tracking-wider text-slate-500">Menu</span>
                  )}
                  <button
                    onClick={() => setIsSidebarCollapsed((prev) => !prev)}
                    className="rounded-lg border border-slate-700 bg-slate-800/60 p-1.5 text-slate-300 transition hover:bg-slate-700 hover:text-white"
                    title={isSidebarCollapsed ? "Expandir menu" : "Colapsar menu"}
                    aria-label={isSidebarCollapsed ? "Expandir menu" : "Colapsar menu"}
                  >
                    {isSidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                  </button>
                </div>
                <div className="mt-3 space-y-2">
                  {hasAnalyticsAccess && canSeeCommercialDashboard ? (
                    <button
                      onClick={() => {
                        setViewMode("dashboard");
                        setDashboardMode("comercial");
                      }}
                      className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition ${
                        viewMode === "dashboard" && dashboardMode === "comercial"
                          ? "bg-cyan-600 text-white"
                          : "text-slate-300 hover:bg-slate-800"
                      }`}
                      title="Comercial"
                    >
                      <BarChart3 className="h-4 w-4" />
                      {!isSidebarCollapsed ? "Comercial" : null}
                    </button>
                  ) : null}

                  {hasAnalyticsAccess && canSeeFinancialDashboard ? (
                    <button
                      onClick={() => {
                        setViewMode("dashboard");
                        setDashboardMode("financeiro");
                      }}
                      className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition ${
                        viewMode === "dashboard" && dashboardMode === "financeiro"
                          ? "bg-cyan-600 text-white"
                          : "text-slate-300 hover:bg-slate-800"
                      }`}
                      title="Financeiro"
                    >
                      <HandCoins className="h-4 w-4" />
                      {!isSidebarCollapsed ? "Financeiro" : null}
                    </button>
                  ) : null}

                  <button
                    onClick={() => setViewMode("planilha")}
                    className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition ${
                      viewMode === "planilha" ? "bg-cyan-600 text-white" : "text-slate-300 hover:bg-slate-800"
                    }`}
                    title="Planilha"
                  >
                    <Table2 className="h-4 w-4" />
                    {!isSidebarCollapsed ? "Planilha" : null}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                {isAdmin ? (
                  <button
                    onClick={() => navigate("/admin")}
                    className="flex w-full items-center gap-2 rounded-xl border border-cyan-700/70 bg-cyan-900/40 px-3 py-2 text-left text-sm text-cyan-100 transition hover:bg-cyan-800/60"
                    title="Painel Admin"
                  >
                    {!isSidebarCollapsed ? "Admin" : null}
                  </button>
                ) : null}
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2 text-left text-sm text-slate-200 transition hover:bg-slate-800"
                  title="Sair"
                >
                  <LogOut className="h-4 w-4" />
                  {!isSidebarCollapsed ? "Sair" : null}
                </button>
              </div>
            </div>
          </aside>

          <main className="flex-1 space-y-4">
            {accessLocked ? (
              <div className="rounded-2xl border border-amber-400/30 bg-slate-900/80 p-6">
            <h2 className="text-xl font-semibold text-amber-200">Aguardando Aprovação</h2>
            <p className="text-slate-300 mt-2">
              Sua conta aguarda aprovação do administrador para liberar o Dashboard Analytics. Enquanto isso, a visualização de planilhas continua disponível.
            </p>
            <div className="mt-4 flex gap-3">
              {isAdmin ? (
                <button
                  onClick={() => navigate("/admin")}
                  className="rounded-lg bg-cyan-600 px-4 py-2 text-sm text-white hover:bg-cyan-500"
                >
                  Abrir Painel Admin
                </button>
              ) : null}
              <button
                onClick={handleLogout}
                className="rounded-lg border border-slate-600 px-4 py-2 text-sm hover:bg-slate-800"
              >
                Sair
              </button>
            </div>
              </div>
            ) : null}

            {viewMode === "dashboard" && hasAnalyticsAccess && !accessLocked ? (
              <>
                {analyticsError ? <p className="text-rose-300 text-sm">{analyticsError}</p> : null}
                {loadingAnalytics ? <p className="text-slate-300 text-sm">Carregando Analytics...</p> : null}
                {data ? (
                  dashboardMode === "comercial" ? (
                    <Dashboard
                      data={data}
                      onDateFilterChange={handleDateFilterChange}
                      headerAction={<PipefySyncButton isSyncing={isSyncing} onClick={handleSyncPipefy} />}
                      headerStatusMessage={syncMessage}
                    />
                  ) : (
                    <FinancialDashboard
                      data={data}
                      onDateFilterChange={handleDateFilterChange}
                      headerAction={null}
                      headerStatusMessage={syncMessage}
                    />
                  )
                ) : null}
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
          </main>
        </div>
      </div>
    </div>
  );
}
