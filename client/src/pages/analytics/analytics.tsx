// src/components/DataVizDashboard.tsx

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import VisualToggle from "@/components/dashboard/VisualToggle";
import UserProfileDropdown from "@/components/ui/userProfileDropdown";
import { UserProfile } from "@/components/ui/userProfileDropdown";
import { DashboardOverview } from "@/components/ui/dashboard";
import { BarChart, Building2, Loader2, User, Briefcase } from "lucide-react";
import  GradientText  from "@/components/GradientText";

type SheetRow = Record<string, unknown>;

export default function DataVizDashboard() {
  const [viewMode, setViewMode] = useState<"planilha" | "dashboard">("planilha");
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
  const user = UserProfile;

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
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-md bg-linear-to-r from-blue-500 to-teal-500">
            <BarChart className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-transparent bg-clip-text bg-linear-to-r from-blue-400 to-teal-400">
              <GradientText className="ml-0 mr-0 align-items-left justify-content-left">DataViz Analytics</GradientText>
            </h1>
            <p className="text-xs text-slate-400">Visualização Inteligente de Dados</p>
          </div>
          <VisualToggle viewMode={viewMode} onChange={(mode) => setViewMode(mode)} />
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