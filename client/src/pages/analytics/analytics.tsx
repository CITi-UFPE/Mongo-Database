// src/components/DataVizDashboard.tsx

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import VisualToggle from "@/components/dashboard/VisualToggle";
import UserProfileDropdown from "@/components/ui/userProfileDropdown";
import { UserProfile } from "@/components/ui/userProfileDropdown";
import { DashboardOverview } from "@/components/ui/dashboard";
import AnimatedLogo from "@/components/AnimatedLogo";
import { Chatbot } from "@/components/Chatbot/Chatbot";
import { BarChart, Building2, Loader2, User, Briefcase, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

const LOGO_GRADIENT_ID = "analytics-logo-gradient";
const ROWS_PER_PAGE = 20;

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
  const [currentPage, setCurrentPage] = useState(0);
  const sheetRequestRef = useRef(0);
  const popupTimeoutRef = useRef<number | null>(null);
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const user = UserProfile;
  const [togglePopup, setTogglePopup] = useState<TogglePopupState>({
    visible: false,
    mode: "planilha",
    key: 0,
  });
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>(null);

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
    setCurrentPage(0);

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

  // Verifica se uma coluna é numérica
  const isNumericColumn = useCallback((column: string): boolean => {
    if (!sheetData.length) return false;
    const sampleValues = sheetData.slice(0, 10);
    const numericCount = sampleValues.filter(row => {
      const value = row[column];
      if (value === null || value === undefined || value === '') return false;
      return !isNaN(Number(value));
    }).length;
    return numericCount > sampleValues.length / 2;
  }, [sheetData]);

  // Verifica se uma coluna é de data
  const isDateColumn = useCallback((column: string): boolean => {
    if (!sheetData.length) return false;
    const sampleValues = sheetData.slice(0, 10);
    const dateCount = sampleValues.filter(row => {
      const value = row[column];
      if (value === null || value === undefined || value === '') return false;
      
      // Tenta fazer parse como data
      const dateValue = new Date(String(value));
      
      // Verifica se é uma data válida e não é um número puro
      return !isNaN(dateValue.getTime()) && isNaN(Number(value));
    }).length;
    return dateCount > sampleValues.length / 2;
  }, [sheetData]);

  // Verifica se coluna é ordenável (numérica ou data)
  const isSortableColumn = useCallback((column: string): boolean => {
    return isNumericColumn(column) || isDateColumn(column);
  }, [isNumericColumn, isDateColumn]);

  // Função para ordenar coluna
  const handleSort = (column: string) => {
    if (!isSortableColumn(column)) return;
    
    if (sortColumn === column) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortColumn(null);
        setSortDirection(null);
      }
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const filteredRows = useMemo(() => {
    let rows = sheetData;
    
    // Aplica filtro
    if (selectedFilterColumn && selectedFilterValue) {
      rows = rows.filter((row) => String(row[selectedFilterColumn]) === selectedFilterValue);
    }
    
    // Aplica ordenação
    if (sortColumn && sortDirection) {
      rows = [...rows].sort((a, b) => {
        const aValue = a[sortColumn];
        const bValue = b[sortColumn];
        
        // Trata valores nulos/undefined
        if (aValue === null || aValue === undefined) return 1;
        if (bValue === null || bValue === undefined) return -1;
        
        // Verifica se é coluna de data
        if (isDateColumn(sortColumn)) {
          const aDate = new Date(String(aValue)).getTime();
          const bDate = new Date(String(bValue)).getTime();
          
          if (isNaN(aDate) || isNaN(bDate)) return 0;
          
          return sortDirection === 'asc' ? aDate - bDate : bDate - aDate;
        }
        
        // Verifica se é coluna numérica
        if (isNumericColumn(sortColumn)) {
          const aNum = Number(aValue);
          const bNum = Number(bValue);
          
          if (isNaN(aNum) || isNaN(bNum)) return 0;
          
          return sortDirection === 'asc' ? aNum - bNum : bNum - aNum;
        }
        
        return 0;
      });
    }
    
    return rows;
  }, [sheetData, selectedFilterColumn, selectedFilterValue, sortColumn, sortDirection, isDateColumn, isNumericColumn]);

  // Paginação
  const totalPages = Math.ceil(filteredRows.length / ROWS_PER_PAGE);
  const paginatedRows = useMemo(() => {
    const startIndex = currentPage * ROWS_PER_PAGE;
    const endIndex = startIndex + ROWS_PER_PAGE;
    return filteredRows.slice(startIndex, endIndex);
  }, [filteredRows, currentPage]);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };


  const handleNextPage = () => {
    if (currentPage < totalPages - 1) {
      handlePageChange(currentPage + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 0) {
      handlePageChange(currentPage - 1);
    }
  };

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(0);
  }, [selectedFilterColumn, selectedFilterValue]);

  // Reset sort when sheet changes
  useEffect(() => {
    setSortColumn(null);
    setSortDirection(null);
  }, [selectedSheet]);

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
        <div>
        <Card className="transition-all bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-2xl text-teal-400">Bem-vindo ao Data Lake</CardTitle>
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
      </div>

      {viewMode === "planilha" && (
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
                  <h3 className="text-slate-300">Selecionar Planilha</h3>
                </label>
                <Select
                  value={selectedSheet}
                  onValueChange={handleSheetChange}
                  disabled={planilhaDisabled}
                >
                  <SelectTrigger className="w-full bg-slate-700 border-slate-600 text-slate-100 disabled:cursor-not-allowed">
                    <SelectValue placeholder={planilhaPlaceholder} />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-600 text-slate-100 max-h-[300px] overflow-y-auto custom-scrollbar">
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
                      <SelectContent className="bg-slate-800 border-slate-600 text-slate-100 max-h-[300px] overflow-y-auto custom-scrollbar">
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
                      <SelectContent className="bg-slate-800 border-slate-600 text-slate-100 max-h-[300px] overflow-y-auto custom-scrollbar">
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
      )}

{viewMode === "planilha" ? (
  <Card ref={tableContainerRef} className="bg-slate-800 border-slate-700 min-h-[400px] flex flex-col p-6">
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
    ) : selectedSheet && tableHeaders.length && paginatedRows.length ? (
      <div className="flex flex-col flex-1 gap-4">
        {/* Paginação no topo */}
        <div className="flex flex-col gap-3 pb-4 border-b sm:flex-row sm:items-center sm:justify-between border-slate-700">
          <p className="text-sm text-slate-400">
            Exibindo <span className="font-semibold text-slate-200">{currentPage * ROWS_PER_PAGE + 1}</span> - <span className="font-semibold text-slate-200">{Math.min((currentPage + 1) * ROWS_PER_PAGE, filteredRows.length)}</span> de <span className="font-semibold text-slate-200">{filteredRows.length}</span> registros
          </p>
          
          <div className="flex items-center gap-2">
            <Button
              onClick={handlePrevPage}
              disabled={currentPage === 0}
              variant="outline"
              size="sm"
              className="bg-slate-700 border-slate-600 text-slate-100 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Anterior</span>
            </Button>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i;
                } else if (currentPage < 3) {
                  pageNum = i;
                } else if (currentPage > totalPages - 4) {
                  pageNum = totalPages - 5 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                
                return (
                  <Button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    variant={currentPage === pageNum ? "default" : "outline"}
                    size="sm"
                    className={
                      currentPage === pageNum
                        ? "bg-teal-600 hover:bg-teal-500 text-white min-w-8"
                        : "bg-slate-700 border-slate-600 text-slate-100 hover:bg-slate-600 min-w-8"
                    }
                  >
                    {pageNum + 1}
                  </Button>
                );
              })}
            </div>
            
            <Button
              onClick={handleNextPage}
              disabled={currentPage >= totalPages - 1}
              variant="outline"
              size="sm"
              className="bg-slate-700 border-slate-600 text-slate-100 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="hidden sm:inline">Próximo</span>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Tabela */}
        <div className="flex-1">
          <div className="overflow-x-auto border rounded-lg custom-scrollbar border-slate-700/70">
            <table className="w-full text-sm text-left border-collapse">
              <thead className="sticky top-0 z-10 bg-slate-700/90 backdrop-blur-sm text-slate-200">
                <tr>
                  {tableHeaders.map((header) => {
                    const isSortable = isSortableColumn(header);
                    const isSorted = sortColumn === header;
                    
                    return (
                      <th 
                        key={header} 
                        className={`px-4 py-3 text-xs font-semibold tracking-wide uppercase border-b border-slate-600 whitespace-nowrap ${
                          isSortable ? 'cursor-pointer hover:bg-slate-600/50 transition-colors' : ''
                        }`}
                        onClick={() => isSortable && handleSort(header)}
                        title={isSortable ? 'Clique para ordenar' : undefined}
                      >
                        <div className="flex items-center gap-2">
                          <span>{header}</span>
                          {isSortable && (
                            <span className="text-slate-400">
                              {!isSorted && <ArrowUpDown size={14} />}
                              {isSorted && sortDirection === 'asc' && <ArrowUp size={14} className="text-teal-400" />}
                              {isSorted && sortDirection === 'desc' && <ArrowDown size={14} className="text-teal-400" />}
                            </span>
                          )}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                <AnimatePresence mode="wait">
                  {paginatedRows.map((row, index) => {
                    const rowKey = typeof row.id === "string" ? row.id : `${currentPage}-${index}`;
                    return (
                      <motion.tr
                        key={rowKey}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2, delay: index * 0.02 }}
                        className="transition-colors border-b border-slate-700/60 last:border-b-0 hover:bg-slate-700/30"
                      >
                        {tableHeaders.map((header) => (
                          <td key={`${rowKey}-${header}`} className="px-4 py-3 text-slate-300 whitespace-nowrap">
                            {formatCellValue((row as SheetRow)[header])}
                          </td>
                        ))}
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    ) : selectedSheet && filteredRows.length === 0 ? (
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

      {/* Chatbot com contexto dos dados da planilha */}
      <Chatbot 
        spreadsheetData={filteredRows}
        isOpen={isChatOpen}
        onToggle={() => setIsChatOpen(!isChatOpen)}
      />
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
