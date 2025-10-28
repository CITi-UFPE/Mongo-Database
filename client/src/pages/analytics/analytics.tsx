// src/components/DataVizDashboard.tsx

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import VisualToggle from "@/components/dashboard/VisualToggle";
import UserProfileDropdown from "@/components/ui/userProfileDropdown";
import { UserProfile } from "@/components/ui/userProfileDropdown";
import { DashboardOverview } from "@/components/ui/dashboard";
import { BarChart, Building2, Loader2, User, Briefcase } from "lucide-react";
import  GradientText  from "@/components/GradientText";

const LOGO_GRADIENT_ID = "analytics-logo-gradient";


type ViewMode = "planilha" | "dashboard";
type SheetRow = Record<string, unknown>;
type TogglePopupState = {
  visible: boolean;
  mode: ViewMode;
  key: number;
};

export default function DataVizDashboard() {
  const [viewMode, setViewMode] = useState<ViewMode>("planilha");
  const [sheets, setSheets] = useState<string[]>([]);
  const [loadingSheets, setLoadingSheets] = useState(false);
  const [sheetError, setSheetError] = useState<string | null>(null);
  const [selectedSheet, setSelectedSheet] = useState<string | undefined>();
  const [sheetData, setSheetData] = useState<SheetRow[]>([]);
  const [loadingSheetData, setLoadingSheetData] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);
  const [selectedFilterColumn, setSelectedFilterColumn] = useState<string>("");
  const [selectedFilterValue, setSelectedFilterValue] = useState<string>("");
  const sheetRequestRef = useRef(0);
  const popupTimeoutRef = useRef<number | null>(null);
  const user = UserProfile;
  const [togglePopup, setTogglePopup] = useState<TogglePopupState>({
    visible: false,
    mode: "planilha",
    key: 0,
  });

  useEffect(() => {
    let canceled = false;
    const fetchSheets = async () => {
      setLoadingSheets(true);
      setSheetError(null);
      try {
        const response = await fetch("/api/spreadsheet");
        if (!response.ok) {
          throw new Error("Resposta inválida do servidor");
        }
        const payload = await response.json();
        if (!Array.isArray(payload)) {
          throw new Error("Formato inesperado de resposta");
        }
        if (!canceled) {
          setSheets(payload);
        }
      } catch (_error) {
        if (!canceled) {
          setSheets([]);
          setSheetError("Não foi possível carregar as planilhas.");
        }
      } finally {
        if (!canceled) {
          setLoadingSheets(false);
        }
      }
    };

    fetchSheets();
    return () => {
      canceled = true;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (popupTimeoutRef.current) {
        window.clearTimeout(popupTimeoutRef.current);
        popupTimeoutRef.current = null;
      }
    };
  }, []);

  const showTogglePopup = useCallback((mode: ViewMode) => {
    setTogglePopup({ visible: true, mode, key: Date.now() });
    if (popupTimeoutRef.current) {
      window.clearTimeout(popupTimeoutRef.current);
    }
    popupTimeoutRef.current = window.setTimeout(() => {
      setTogglePopup((prev) => ({ ...prev, visible: false }));
      popupTimeoutRef.current = null;
    }, 2800);
  }, []);

  const handleViewModeChange = useCallback(
    (mode: ViewMode) => {
      setViewMode(mode);
      showTogglePopup(mode);
    },
    [showTogglePopup]
  );

  const handleSheetChange = (sheetName: string) => {
    setSelectedSheet(sheetName);
    setSelectedFilterColumn("");
    setSelectedFilterValue("");
    setSheetData([]);
    setDataError(null);

    const requestId = sheetRequestRef.current + 1;
    sheetRequestRef.current = requestId;
    setLoadingSheetData(true);

    const loadSheet = async () => {
      try {
        const response = await fetch(`/api/spreadsheet/${encodeURIComponent(sheetName)}`);
        if (!response.ok) {
          throw new Error("Resposta inválida do servidor");
        }
        const payload = await response.json();
        if (!Array.isArray(payload)) {
          throw new Error("Formato inesperado de resposta");
        }
        if (sheetRequestRef.current === requestId) {
          setSheetData(payload);
        }
      } catch (_error) {
        if (sheetRequestRef.current === requestId) {
          setSheetData([]);
          setDataError("Não foi possível carregar os dados da planilha.");
        }
      } finally {
        if (sheetRequestRef.current === requestId) {
          setLoadingSheetData(false);
        }
      }
    };

    loadSheet();
  };

  const columnOptions = useMemo(() => {
    if (!sheetData.length) return [] as string[];
    const keys = new Set<string>();
    sheetData.forEach((row) => {
      Object.keys(row).forEach((key) => {
        if (key !== "id") keys.add(key);
      });
    });
    return Array.from(keys).sort((a, b) => a.localeCompare(b));
  }, [sheetData]);

  const filterValueOptions = useMemo(() => {
    if (!selectedFilterColumn) return [] as string[];
    const values = new Set<string>();
    sheetData.forEach((row) => {
      const value = row[selectedFilterColumn];
      if (value === undefined || value === null) return;
      values.add(String(value));
    });
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [sheetData, selectedFilterColumn]);

  const filteredRows = useMemo(() => {
    if (!selectedFilterColumn || !selectedFilterValue) return sheetData;
    return sheetData.filter((row) => String(row[selectedFilterColumn]) === selectedFilterValue);
  }, [sheetData, selectedFilterColumn, selectedFilterValue]);

  const tableHeaders = useMemo(() => {
    if (!filteredRows.length) return [] as string[];
    const keys = new Set<string>();
    filteredRows.forEach((row) => {
      Object.keys(row).forEach((key) => {
        keys.add(key);
      });
    });
    const ordered = Array.from(keys);
    return ordered.sort((a, b) => {
      if (a === "id") return -1;
      if (b === "id") return 1;
      return a.localeCompare(b);
    });
  }, [filteredRows]);

  const planilhaDisabled = loadingSheets || sheetError !== null || sheets.length === 0;
  const planilhaPlaceholder = loadingSheets
    ? "Carregando planilhas..."
    : !sheets.length
      ? "Nenhuma planilha disponível"
      : "Escolha uma planilha";

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 border-b border-slate-700 backdrop-blur-md bg-slate-900/60">
        <div className="flex items-center gap-3">
          <AnimatedLogo />
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-transparent bg-clip-text bg-linear-to-r from-blue-400 to-teal-400">
              Data Lake Analytics
            </h1>
            <p className="text-xs text-slate-400">By CITi</p>
          </div>
          <VisualToggle viewMode={viewMode} onChange={handleViewModeChange} />
        </div>
        <UserProfileDropdown />
      </header>

      <div className="h-20" />

      <main className="container p-6 mx-auto mt-4 space-y-6">
        {/* Bem-vindo */}
        <motion.div
        whileHover={{ scale: 1.01, boxShadow: "0px 4px 20px rgba(56,189,248,0.2)" }}
        transition={{ type: "spring", stiffness: 50 }}
      >
        <Card className="transition-all bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-2xl text-teal-400">Bem-vindo ao DataViz</CardTitle>
            <p className="text-sm text-slate-300">
              Selecione uma planilha ou Visualização de Dashboard.
            </p>
          </CardHeader>

          <CardContent className="mt-4 text-slate-400">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="flex flex-col p-3 border rounded-lg bg-slate-700/40 border-slate-600">
              <User className="w-6 h-6 mb-2 text-gradient-to-r from-blue-500 to-teal-500" />
                <span className="text-sm text-slate-400">Usuário</span>
                <span className="font-medium text-slate-100">{user.name}</span>
              </div>

              <div className="flex flex-col p-3 border rounded-lg bg-slate-700/40 border-slate-600">
              <Briefcase className="w-6 h-6 mb-2 text-gradient-to-r from-blue-500 to-teal-500" />
                <span className="text-sm text-slate-400">Função</span>
                <span className="font-medium text-slate-100">{user.role}</span>
              </div>

              <div className="flex flex-col p-3 border rounded-lg bg-slate-700/40 border-slate-600">
              <Building2 className="w-6 h-6 mb-2 text-gradient-to-r from-blue-500 to-teal-500" />
                <span className="text-sm text-slate-400">Departamento</span>
                <span className="font-medium text-slate-100">{user.department}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="flex items-center gap-1 mb-2 text-sm font-medium">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-teal-400"
                  >
                    <rect x="3" y="3" width="7" height="7" />
                    <rect x="14" y="3" width="7" height="7" />
                    <rect x="3" y="14" width="7" height="7" />
                    <rect x="14" y="14" width="7" height="7" />
                  </svg>
                  Selecionar Planilha
                </label>
                <Select
                  value={selectedSheet}
                  onValueChange={handleSheetChange}
                  disabled={planilhaDisabled}
                >
                  <SelectTrigger className="w-full bg-slate-700 border-slate-600 text-slate-100 disabled:cursor-not-allowed">
                    <SelectValue placeholder={planilhaPlaceholder} />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-600 text-slate-100">
                    {sheets.map((sheetName) => (
                      <SelectItem key={sheetName} value={sheetName} className="hover:bg-slate-700">
                        {sheetName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {sheetError ? (
                  <p className="mt-2 text-xs text-rose-400">{sheetError}</p>
                ) : null}
              </div>

              {viewMode === "planilha" ? (
                <div className="space-y-4">
                  <div>
                    <label className="block mb-2 text-sm font-medium text-slate-300">Filtrar por coluna</label>
                    <Select
                      value={selectedFilterColumn || undefined}
                      onValueChange={(value) => {
                        setSelectedFilterColumn(value);
                        setSelectedFilterValue("");
                      }}
                      disabled={!columnOptions.length}
                    >
                      <SelectTrigger className="w-full bg-slate-700 border-slate-600 text-slate-100 disabled:cursor-not-allowed">
                        <SelectValue
                          placeholder={columnOptions.length ? "Selecione uma coluna" : "Selecione uma planilha"}
                        />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-600 text-slate-100">
                        {columnOptions.map((column) => (
                          <SelectItem key={column} value={column} className="hover:bg-slate-700">
                            {column}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block mb-2 text-sm font-medium text-slate-300">Filtrar por valor</label>
                    <Select
                      value={selectedFilterValue || undefined}
                      onValueChange={setSelectedFilterValue}
                      disabled={!filterValueOptions.length}
                    >
                      <SelectTrigger className="w-full bg-slate-700 border-slate-600 text-slate-100 disabled:cursor-not-allowed">
                        <SelectValue
                          placeholder={selectedFilterColumn ? "Selecione um valor" : "Escolha uma coluna"}
                        />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-600 text-slate-100">
                        {filterValueOptions.map((value) => (
                          <SelectItem key={value} value={value} className="hover:bg-slate-700">
                            {value}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>

        {viewMode === "planilha" ? (
          <Card className="bg-slate-800 border-slate-700 min-h-[400px] flex flex-col p-6">
            {loadingSheetData ? (
              <div className="flex flex-col items-center justify-center flex-1 gap-3 text-slate-400">
                <Loader2 className="w-10 h-10 animate-spin" />
                <span>Carregando dados da planilha...</span>
              </div>
            ) : dataError ? (
              <div className="flex flex-col items-center justify-center flex-1 gap-2 text-center">
                <BarChart className="w-10 h-10 text-rose-400" />
                <p className="text-sm text-rose-400">{dataError}</p>
              </div>
            ) : selectedSheet && tableHeaders.length && filteredRows.length ? (
              <div className="flex-1 overflow-hidden">
                <div className="h-full overflow-auto border rounded-lg border-slate-700/70">
                  <table className="w-full text-sm text-left border-collapse">
                    <thead className="bg-slate-700/60 text-slate-200">
                      <tr>
                        {tableHeaders.map((header) => (
                          <th key={header} className="px-4 py-3 text-xs font-semibold tracking-wide uppercase">
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRows.map((row, index) => {
                        const rowKey = typeof row.id === "string" ? row.id : index;
                        return (
                          <tr key={rowKey} className="border-b border-slate-700/60 last:border-b-0">
                            {tableHeaders.map((header) => (
                              <td key={`${rowKey}-${header}`} className="px-4 py-3 text-slate-300">
                                {formatCellValue((row as SheetRow)[header])}
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <p className="mt-3 text-xs text-slate-500">
                  Exibindo {filteredRows.length} de {sheetData.length} registros carregados.
                </p>
              </div>
            ) : selectedSheet ? (
              <div className="flex flex-col items-center justify-center flex-1 gap-3 text-center text-slate-400">
                <BarChart className="w-10 h-10 text-slate-500" />
                <p className="text-sm">Nenhum registro encontrado com os filtros atuais.</p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center flex-1 gap-4 text-center">
                <BarChart className="w-12 h-12 text-slate-500" />
                <div>
                  <h3 className="text-lg font-semibold text-slate-200">Selecione uma planilha para começar</h3>
                  <p className="max-w-md mt-2 text-sm text-slate-400">
                    Escolha uma planilha acima para visualizar os dados e aplicar filtros personalizados.
                  </p>
                </div>
              </div>
            )}
          </Card>
        ) : (
          <DashboardOverview />
        )}
      </main>
      <AnimatePresence>
        {togglePopup.visible ? (
          <motion.aside
            key={togglePopup.key}
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed pointer-events-none right-6 bottom-6 z-999"
          >
            <div className="flex items-center gap-3 p-4 text-left border shadow-lg pointer-events-auto rounded-xl bg-slate-900/95 border-slate-700/80 backdrop-blur-md">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-linear-to-r from-blue-500 to-teal-500 text-white shadow-[0_0_18px_rgba(34,211,238,0.45)]">
                <BarChart className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-100">Visualização atualizada</p>
                <p className="text-xs text-slate-300">
                  {togglePopup.mode === "planilha" ? "Modo Planilha ativo." : "Modo Dashboard ativo."}
                </p>
              </div>
            </div>
          </motion.aside>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === "object" ? JSON.stringify(item) : String(item)))
      .join(", ");
  }
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch (_error) {
      return "[obj]";
    }
  }
  return String(value);
}

function AnimatedLogo() {
  return (
    <motion.svg
      viewBox="0 0 292.447 228.721"
      className="w-20 h-auto"
      initial={{ scale: 0.95, opacity: 0.9 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 220, damping: 20 }}
      role="img"
      aria-label="CITi logo"
    >
      <defs>
        {/* Gradiente dinâmico animado */}
        <linearGradient id={LOGO_GRADIENT_ID} x1="0%" y1="0%" x2="100%" y2="100%">
          <motion.stop
            offset="0%"
            stopColor="#22c55e" // verde
            animate={{
              stopColor: ["#22c55e", "#06b6d4", "#3b82f6", "#8b5cf6", "#22c55e"],
            }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          />
          <motion.stop
            offset="100%"
            stopColor="#8b5cf6" // roxo
            animate={{
              stopColor: ["#8b5cf6", "#3b82f6", "#06b6d4", "#22c55e", "#8b5cf6"],
            }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear", delay: 1 }}
          />
        </linearGradient>
      </defs>

      <g data-name="Grupo 388" transform="translate(-140 -713.779)">
        <g data-name="Grupo 3" transform="translate(140.173 880.518)">
          <text
            transform="translate(0.274 25.982)"
            fontSize="26"
            fontFamily="Barlow-Medium, Barlow"
            fontWeight={500}
            fill={`url(#${LOGO_GRADIENT_ID})`}
          >
            <tspan x="0" y="0">
              Centro Integrado de
            </tspan>
            <tspan x="0" y="31">
              Tecnologia da Informação
            </tspan>
          </text>
        </g>
        <g data-name="Grupo 17" transform="translate(140 713.779)">
          <path
            data-name="Caminho 1"
            d="M-1146.892,153.163a3.3,3.3,0,0,1-2.78,1.737c-1.94.029-5.1-2.432-5.646-2.866s-5.3-5.414-8.946-6.92a14.025,14.025,0,0,0-12.3.637s-8.5,4.265-13.521,19.321-5.1,27.254.309,31.655,11.736,1,15.982-.772,11.349-6.022,13.743-6.253,3.937.386,3.088,4.555-7.026,20.334-8.57,22.65a39.837,39.837,0,0,1-12.334,6.254,39.071,39.071,0,0,1-19.4.637c-5.791-1.216-12.353-5.115-18.3-11.523s-9.5-19.562-7.952-35.157,10.731-32.967,21.232-43.545,19.919-14.129,29.184-14.515,20.942,4.69,27.717,13.723a4.683,4.683,0,0,1,.637,1.447S-1144.113,149.592-1146.892,153.163Z"
            transform="translate(1223.881 -76.158)"
            fill={`url(#${LOGO_GRADIENT_ID})`}
          />
          <path
            data-name="Caminho 2"
            d="M-975.973,124.962l-26,102.713h-16.155s-7.47.29-9.5-2.374-1.621-5.1-.405-10.886,18.356-73.992,18.356-73.992,2.374-9.5,4.633-11.928,5.1-3.532,10.249-3.532Z"
            transform="translate(1100.154 -79.192)"
            fill={`url(#${LOGO_GRADIENT_ID})`}
          />
          <path
            data-name="Caminho 3"
            d="M-931.75,10.561s8.281-.347,12.566,4.227a9.931,9.931,0,0,1,1.042,12.449c-1.679,2.548-6.138,9.612-19.919,9.612s-13.955-8.917-13.955-10.423a13.258,13.258,0,0,1,3.88-8.744C-944.142,13.515-939.393,10.561-931.75,10.561Z"
            transform="translate(1051.241 -10.555)"
            fill={`url(#${LOGO_GRADIENT_ID})`}
          />
          <path
            data-name="Caminho 4"
            d="M-875.131,45.672h-13.145l-5.559,22.41h13.144L-901.246,148.4H-880.4s8.917.338,12.044-11.474,17.371-68.781,17.371-68.781h11.813s3.417,0,4.69-.926,2.548-1.274,3.532-5.154S-828,50.594-828,50.594s.637-2.2-.695-3.417a6.451,6.451,0,0,0-4.4-1.506H-844.73l9.5-36.422s1.042-3.3-.406-5.675S-839.693.1-844.151.1s-9.728,1.911-12.913,3.185-6.717,3.648-8.339,5.848Z"
            transform="translate(1019 0.098)"
            fill={`url(#${LOGO_GRADIENT_ID})`}
          />
          <path
            data-name="Caminho 5"
            d="M-772.1,285.709V303.34s1.2.154,3.822-1.351,16.947-13.076,18.993-14.041,7.1-3.783,11.427.772,8.724,11.146,11.118,13.81,2.741,2.856,4.169,4.478a22.717,22.717,0,0,0,10.809,6.717c5.752,1.583,16.6,3.243,30.111-1.042s17.294-6.253,21.077-11.349,2.432-14.2,1.7-15.431a6.966,6.966,0,0,1-.888-2.316,10.882,10.882,0,0,0-4.13,1.158c-2.085,1.081-4.98,2.394-7.489,3.668s-11.658,3.745-12.469,3.9-5.6.424-7.026-.27a10.982,10.982,0,0,1-4.246-3.513,71.213,71.213,0,0,1-4.594-8.107c-.811-1.969-2.741-5.636-3.4-9.535s-2.548-7.836-3.667-8.686a43.887,43.887,0,0,0-11.234-5.018c-5.25-1.506-8.608-.579-9.767,0s-4.439,1.892-6.292,2.972-13.241,8.107-19.842,12.469-12.739,8.493-14.669,10S-771.174,284.474-772.1,285.709Z"
            transform="translate(936.99 -167.015)"
            fill={`url(#${LOGO_GRADIENT_ID})`}
          />
          <path
            data-name="Caminho 6"
            d="M-632.368,88.508s-11.118,3.822-16.966,8.338-6.254,4.806-6.833,9.207.926,9.612,6.37,11.118,12.218.811,15.866.174,11.987-3.764,15.461-6.6,5.27-7.064,5.79-7.817,1.129-3.069,2.317-5.472,2.606-4.661,2.577-7.325-.579-5.733-7.151-5.7S-628.211,86.927-632.368,88.508Z"
            transform="translate(863.443 -49.8)"
            fill={`url(#${LOGO_GRADIENT_ID})`}
          />
        </g>
      </g>
    </motion.svg>
  );
}