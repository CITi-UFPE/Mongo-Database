// src/components/DataVizDashboard.tsx

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Loader2, User, Briefcase, Building2, CheckCircle2 } from "lucide-react";
import VisualToggle from "@/components/dashboard/VisualToggle";
import UserProfileDropdown from "@/components/ui/userProfileDropdown";
import { UserProfile } from "@/components/ui/userProfileDropdown";
import GradientText from "@/components/GradientText";


export default function DataVizDashboard() {
  const user =  UserProfile;

  // state to show popup coming from VisualToggle
  const [showPopup, setShowPopup] = useState(false);
  const [sheets, setSheets] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string | undefined>();
  const [sheetData, setSheetData] = useState<Record<string, unknown>[]>([]);
  const [loadingSheets, setLoadingSheets] = useState(false);
  const [loadingSheetData, setLoadingSheetData] = useState(false);
  const [sheetError, setSheetError] = useState<string | null>(null);
  const [dataError, setDataError] = useState<string | null>(null);
  const [selectedFilterColumn, setSelectedFilterColumn] = useState<string>("");
  const [selectedFilterValue, setSelectedFilterValue] = useState<string>("");
  const sheetRequestRef = useRef(0);

  // callback passed to VisualToggle so parent can display its own popup
  function handleToggleVisualization(_view?: string) {
    setShowPopup(true);
    setTimeout(() => setShowPopup(false), 3000); // fecha em 3 segundos
  }

  useEffect(() => {
    let canceled = false;
    const loadSheets = async () => {
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

    loadSheets();
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

    const loadSheetData = async () => {
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

    loadSheetData();
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

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-900 text-slate-100 overflow-y-overlay">
      {/* Header */}
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
          <VisualToggle onPopup={handleToggleVisualization} />
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

        {/* Filtros */}
        <motion.div
          whileHover={{ scale: 1.01, boxShadow: "0px 4px 25px rgba(20,184,166,0.25)" }}
          transition={{ type: "spring", stiffness: 50 }}
        >
          <Card className="transition-all bg-slate-800 border-slate-700">
            <CardContent className="z-50 pt-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <AnimatedSelect
                    label="Selecionar Planilha"
                    value={selectedSheet}
                    onValueChange={handleSheetChange}
                    placeholder={loadingSheets ? "Carregando..." : "Selecione uma planilha"}
                    disabled={loadingSheets || !!sheetError || sheets.length === 0}
                  >
                    {sheets.map((sheetName) => (
                      <SelectItem
                        key={sheetName}
                        value={sheetName}
                        className="text-slate-300 transition-all rounded-md
                          data-[state=checked]:bg-linear-to-r data-[state=checked]:from-green-500/40 data-[state=checked]:via-cyan-500/40 data-[state=checked]:to-purple-500/40
                          data-[state=checked]:border data-[state=checked]:border-cyan-400/40
                          hover:bg-linear-to-r hover:from-green-500/20 hover:via-cyan-500/20 hover:to-purple-500/20
                          hover:border hover:border-cyan-400/30"
                      >
                        {sheetName}
                      </SelectItem>
                    ))}
                  </AnimatedSelect>
                  {sheetError ? (
                    <p className="mt-2 text-xs text-rose-400">{sheetError}</p>
                  ) : null}
                </div>
                <div className="space-y-4">
                  <AnimatedSelect
                    label="Filtrar por coluna"
                    value={selectedFilterColumn || undefined}
                    onValueChange={(value) => {
                      setSelectedFilterColumn(value);
                      setSelectedFilterValue("");
                    }}
                    placeholder={columnOptions.length ? "Selecione uma coluna" : "Selecione uma planilha"}
                    disabled={!columnOptions.length}
                  >
                    {columnOptions.map((column) => (
                      <SelectItem key={column} value={column} className="text-slate-300">
                        {column}
                      </SelectItem>
                    ))}
                  </AnimatedSelect>
                  <AnimatedSelect
                    label="Filtrar por valor"
                    value={selectedFilterValue || undefined}
                    onValueChange={setSelectedFilterValue}
                    placeholder={selectedFilterColumn ? "Selecione um valor" : "Escolha uma coluna"}
                    disabled={!filterValueOptions.length}
                  >
                    {filterValueOptions.map((value) => (
                      <SelectItem key={value} value={value} className="text-slate-300">
                        {value}
                      </SelectItem>
                    ))}
                  </AnimatedSelect>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Placeholder */}
        <motion.div
          whileHover={{ scale: 1.01, boxShadow: "0px 4px 30px rgba(59,130,246,0.15)" }}
          transition={{ type: "spring", stiffness: 50 }}
        >
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
            ) : filteredRows.length && tableHeaders.length ? (
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
                                {formatCellValue((row as Record<string, unknown>)[header])}
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
        </motion.div>
      <AnimatePresence>
        {showPopup && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="fixed flex items-center gap-3 px-4 py-3 border shadow-lg bottom-6 right-6 z-9999 rounded-xl bg-slate-800 border-slate-700 text-slate-100"
          >
            <CheckCircle2 className="w-5 h-5 text-green-400" />
            <span className="text-sm">
              Visualização alterada com sucesso!
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      </main>
    </div>
  );
}

/* Subcomponente com animação nos Selects */
function AnimatedSelect({
  label,
  children,
  value,
  onValueChange,
  placeholder = "Selecione...",
  disabled = false,
}: {
  label: string;
  children: React.ReactNode;
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <motion.div whileHover={{ scale: 1.005 }} transition={{ type: "spring", stiffness: 20 }}>
      <label className="block mb-2 text-sm font-medium text-slate-300">{label}</label>
      <Select value={value ?? undefined} onValueChange={disabled ? undefined : onValueChange}>
        <SelectTrigger
          disabled={disabled}
          className="w-full transition-all bg-slate-700 border-slate-600 text-slate-100 hover:bg-slate-600 disabled:cursor-not-allowed"
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent
          position="popper"
          side="bottom"
          align="start"
          sideOffset={4}
          className="overflow-visible rounded-md bg-slate-800 border-slate-600"
          >
          {children}
        </SelectContent>
      </Select>
    </motion.div>
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
