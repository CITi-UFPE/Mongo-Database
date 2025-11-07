// src/components/ui/dashboard.tsx

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart3, PieChart as PieChartIcon, TrendingUp, Database, LineChart, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Brush
} from 'recharts';

type DashboardProps = {
  data: Record<string, unknown>[];
  selectedSheet?: string;
  loading?: boolean;
};

type ChartType = 'bar' | 'pie';

// Cores base para gradiente progressivo
const COLOR_GRADIENTS = [
  ['#0ea5e9', '#06b6d4'], // cyan
  ['#14b8a6', '#10b981'], // teal-green
  ['#84cc16', '#eab308'], // lime-yellow
  ['#f59e0b', '#f97316'], // orange
  ['#ef4444', '#ec4899'], // red-pink
  ['#8b5cf6', '#6366f1'], // purple-indigo
  ['#06b6d4', '#14b8a6'], // sky-teal
  ['#10b981', '#84cc16'], // green-lime
  ['#eab308', '#f59e0b'], // yellow-orange
  ['#ec4899', '#8b5cf6'], // pink-purple
];

const POINTS_PER_PAGE = 50;
const MAX_CATEGORIES = 10;
const SAMPLE_SIZE = 500;

// Função para gerar cores progressivas baseadas na posição GLOBAL
function getColorForIndex(globalIndex: number, totalItems: number): string {
  // Usa o índice global para progressão contínua
  const ratio = globalIndex / Math.max(totalItems - 1, 1);
  
  // Seleciona o gradiente baseado na progressão
  const gradientPosition = ratio * COLOR_GRADIENTS.length;
  const gradientIndex = Math.floor(gradientPosition) % COLOR_GRADIENTS.length;
  const nextGradientIndex = (gradientIndex + 1) % COLOR_GRADIENTS.length;
  
  const [startColor, endColor] = COLOR_GRADIENTS[gradientIndex];
  const [nextStart] = COLOR_GRADIENTS[nextGradientIndex];
  
  // Interpola dentro do gradiente atual
  const localRatio = gradientPosition % 1;
  
  // Se estamos perto do fim do gradiente, mistura com o próximo
  if (localRatio > 0.8) {
    const blendRatio = (localRatio - 0.8) / 0.2;
    const blendedEnd = interpolateColor(endColor, nextStart, blendRatio);
    return interpolateColor(startColor, blendedEnd, localRatio);
  }
  
  return interpolateColor(startColor, endColor, localRatio);
}

// Interpola entre duas cores hex
function interpolateColor(color1: string, color2: string, ratio: number): string {
  const hex = (color: string) => parseInt(color.slice(1), 16);
  const r1 = (hex(color1) >> 16) & 0xff;
  const g1 = (hex(color1) >> 8) & 0xff;
  const b1 = hex(color1) & 0xff;
  
  const r2 = (hex(color2) >> 16) & 0xff;
  const g2 = (hex(color2) >> 8) & 0xff;
  const b2 = hex(color2) & 0xff;
  
  const r = Math.round(r1 + (r2 - r1) * ratio);
  const g = Math.round(g1 + (g2 - g1) * ratio);
  const b = Math.round(b1 + (b2 - b1) * ratio);
  
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

function paginateData<T>(data: T[], page: number, perPage: number): T[] {
  const start = page * perPage;
  const end = start + perPage;
  return data.slice(start, end);
}

export function DashboardOverview({ data, selectedSheet, loading }: DashboardProps) {
  const [chartTypes, setChartTypes] = useState<Record<string, ChartType>>({});
  const [chartPages, setChartPages] = useState<Record<string, number>>({});
  const [zoomLevels, setZoomLevels] = useState<Record<string, number>>({}); // Novo: controla o zoom

  const toggleChartType = (column: string) => {
    setChartTypes(prev => ({
      ...prev,
      [column]: prev[column] === 'bar' ? 'pie' : 'bar'
    }));
  };

  const handleChartPageChange = (column: string, newPage: number) => {
    setChartPages(prev => ({
      ...prev,
      [column]: newPage
    }));
  };

  const handleZoomChange = (column: string, delta: number) => {
    setZoomLevels(prev => {
      const currentZoom = prev[column] || 1;
      const newZoom = Math.max(0.5, Math.min(4, currentZoom + delta));
      return {
        ...prev,
        [column]: newZoom
      };
    });
  };

  const analytics = useMemo(() => {
    if (!data || data.length === 0) {
      return null;
    }

    const totalRecords = data.length;
    const sampleData = totalRecords > SAMPLE_SIZE ? data.slice(0, SAMPLE_SIZE) : data;

    // Filtra colunas
    const allColumns = Object.keys(data[0] || {});
    const filteredColumns = allColumns.filter(col => {
      const lower = col.toLowerCase();
      return !lower.includes('id') && 
             !lower.includes('_v') && 
             !lower.startsWith('_') &&
             col !== '__v';
    });

    const numericColumns: string[] = [];
    const categoricalColumns: string[] = [];
    const temporalColumns: string[] = [];
    
    filteredColumns.forEach(col => {
      const sampleValues = sampleData.map(row => row[col]);
      
      // Detecta temporais primeiro - COM VERIFICAÇÃO MAIS RIGOROSA
      const dateCount = sampleValues.filter(v => {
        if (!v) return false;
        const str = String(v);
        
        // Ignora se for só números (evita confundir com anos/valores numéricos)
        if (/^\d+$/.test(str) && str.length <= 4) return false;
        
        // Verifica formatos de data explícitos
        const hasDateFormat = /^\d{4}-\d{2}-\d{2}/.test(str) || 
                             /^\d{2}\/\d{2}\/\d{4}/.test(str);
        
        if (!hasDateFormat) {
          // Se não tem formato de data, verifica se é parseable E não é número puro
          const parsed = Date.parse(str);
          if (isNaN(parsed)) return false;
          
          // Rejeita se for um número puro que Date.parse aceitou
          if (!isNaN(Number(str))) return false;
          
          return true;
        }
        
        return hasDateFormat;
      }).length;

      if (dateCount > sampleValues.length * 0.5) {
        temporalColumns.push(col);
      } else {
        // CORREÇÃO: Detecta numéricas com verificação mais rigorosa
        const numericValues = sampleValues.filter(v => {
          if (v === null || v === undefined || v === '') return false;
          const num = Number(v);
          return !isNaN(num) && isFinite(num);
        });
        
        const numericCount = numericValues.length;
        const hasWideRange = numericValues.length > 0 && 
          (Math.max(...numericValues.map(v => Number(v))) - Math.min(...numericValues.map(v => Number(v)))) > 10;
        
        // Considera numérico se >80% são números E tem variação significativa
        if (numericCount > sampleValues.length * 0.8 && hasWideRange) {
          numericColumns.push(col);
        } else {
          // Verifica se tem muitas categorias únicas (indica categórico)
          const uniqueValues = new Set(sampleValues.filter(v => v !== null && v !== undefined));
          const uniqueRatio = uniqueValues.size / sampleValues.length;
          
          // Se tem poucas categorias únicas OU valores não numéricos, é categórico
          if (uniqueRatio < 0.8 || numericCount < sampleValues.length * 0.8) {
            categoricalColumns.push(col);
          }
        }
      }
    });

    // Frequências categóricas
    const categoryFrequencies: Record<string, Array<{ name: string; value: number }>> = {};
    categoricalColumns.forEach(col => {
      const freq: Record<string, number> = {};
      data.forEach(row => {
        const value = String(row[col] || 'N/A');
        freq[value] = (freq[value] || 0) + 1;
      });
      
      const sorted = Object.entries(freq)
        .sort((a, b) => b[1] - a[1])
        .map(([name, value]) => ({ name, value }));
      
      categoryFrequencies[col] = sorted;
    });

    // Estatísticas numéricas
    const numericStats: Record<string, { min: number; max: number; avg: number; sum: number }> = {};
    numericColumns.forEach(col => {
      const values = data
        .map(row => Number(row[col]))
        .filter(v => !isNaN(v) && isFinite(v));
      
      if (values.length > 0) {
        numericStats[col] = {
          min: Math.min(...values),
          max: Math.max(...values),
          avg: values.reduce((a, b) => a + b, 0) / values.length,
          sum: values.reduce((a, b) => a + b, 0)
        };
      }
    });

    // Dados temporais
    const temporalData: Record<string, Array<{ date: string; count: number }>> = {};
    temporalColumns.forEach(col => {
      const grouped: Record<string, number> = {};
      
      data.forEach(row => {
        const value = row[col];
        if (!value) return;
        
        try {
          const date = new Date(String(value));
          if (!isNaN(date.getTime())) {
            const dateStr = date.toISOString().split('T')[0];
            grouped[dateStr] = (grouped[dateStr] || 0) + 1;
          }
        } catch {
          // Ignora valores inválidos
        }
      });

      const sorted = Object.entries(grouped)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([date, count]) => ({ date, count }));
      
      temporalData[col] = sorted;
    });

    return {
      totalRecords,
      filteredColumns,
      numericColumns,
      categoricalColumns,
      temporalColumns,
      categoryFrequencies,
      numericStats,
      temporalData
    };
  }, [data]);

  if (loading) {
    return (
      <Card className="bg-slate-800 border-slate-700 min-h-[400px] flex items-center justify-center">
        <div className="flex items-center gap-2 text-slate-400">
          <Database className="w-5 h-5 animate-pulse" />
          <span>Carregando análises...</span>
        </div>
      </Card>
    );
  }

  if (!analytics || !selectedSheet) {
    return (
      <Card className="bg-slate-800 border-slate-700 min-h-[400px] flex flex-col items-center justify-center gap-4">
        <Database className="w-16 h-16 text-slate-600" />
        <div className="text-center">
          <h3 className="text-lg font-semibold text-slate-200">Nenhuma planilha selecionada</h3>
          <p className="mt-2 text-sm text-slate-400">
            Selecione uma planilha para visualizar as análises e estatísticas.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com estatísticas gerais */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-2xl text-teal-400">
            Dashboard Analytics - {selectedSheet}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              icon={<Database className="w-6 h-6" />}
              label="Total de Registros"
              value={analytics.totalRecords.toLocaleString()}
              color="blue"
            />
            <StatCard
              icon={<BarChart3 className="w-6 h-6" />}
              label="Colunas Analisadas"
              value={analytics.filteredColumns.length}
              color="teal"
            />
            <StatCard
              icon={<TrendingUp className="w-6 h-6" />}
              label="Colunas Numéricas"
              value={analytics.numericColumns.length}
              color="green"
            />
            <StatCard
              icon={<PieChartIcon className="w-6 h-6" />}
              label="Colunas Categóricas"
              value={analytics.categoricalColumns.length}
              color="purple"
            />
          </div>
        </CardContent>
      </Card>

      {/* Gráficos Temporais COM PAGINAÇÃO, ZOOM E BASELINE */}
      {analytics.temporalColumns.length > 0 && (
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <div className="flex items-center gap-2">
              <LineChart className="w-5 h-5 text-teal-400" />
              <CardTitle className="text-xl text-slate-200">Análise Temporal</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {analytics.temporalColumns.map((column) => {
              const allData = analytics.temporalData[column] || [];
              if (allData.length === 0) return null;

              const currentPage = chartPages[column] || 0;
              const zoomLevel = zoomLevels[column] || 1;
              const pointsToShow = Math.floor(POINTS_PER_PAGE / zoomLevel);
              const totalPages = Math.ceil(allData.length / pointsToShow);
              const paginatedData = paginateData(allData, currentPage, pointsToShow);

              // Calcula baseline (média de todo o período)
              const baseline = allData.reduce((sum, item) => sum + item.count, 0) / allData.length;

              return (
                <div key={column} className="p-4 border rounded-lg bg-slate-700/20 border-slate-600">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold text-slate-200">{column}</h4>
                    
                    <div className="flex items-center gap-2">
                      {/* Controles de Zoom */}
                      <div className="flex items-center gap-1 px-2 py-1 border rounded bg-slate-700/40 border-slate-600">
                        <Button
                          onClick={() => handleZoomChange(column, -0.5)}
                          disabled={zoomLevel <= 0.5}
                          size="sm"
                          variant="ghost"
                          className="p-0 w-7 h-7 text-slate-400 hover:text-slate-100 disabled:opacity-30"
                          title="Zoom out (ver mais dados)"
                        >
                          <ZoomOut className="w-3.5 h-3.5" />
                        </Button>
                        <span className="text-xs font-medium text-slate-400 min-w-[40px] text-center">
                          {zoomLevel.toFixed(1)}x
                        </span>
                        <Button
                          onClick={() => handleZoomChange(column, 0.5)}
                          disabled={zoomLevel >= 4}
                          size="sm"
                          variant="ghost"
                          className="p-0 w-7 h-7 text-slate-400 hover:text-slate-100 disabled:opacity-30"
                          title="Zoom in (ver detalhes)"
                        >
                          <ZoomIn className="w-3.5 h-3.5" />
                        </Button>
                      </div>

                      {/* Paginação */}
                      {totalPages > 1 && (
                        <div className="flex items-center gap-2">
                          <Button
                            onClick={() => handleChartPageChange(column, Math.max(0, currentPage - 1))}
                            disabled={currentPage === 0}
                            size="sm"
                            variant="outline"
                            className="bg-slate-700 border-slate-600 text-slate-100 hover:bg-slate-600 disabled:opacity-50"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </Button>
                          <span className="text-sm text-slate-400">
                            {currentPage + 1} / {totalPages}
                          </span>
                          <Button
                            onClick={() => handleChartPageChange(column, Math.min(totalPages - 1, currentPage + 1))}
                            disabled={currentPage >= totalPages - 1}
                            size="sm"
                            variant="outline"
                            className="bg-slate-700 border-slate-600 text-slate-100 hover:bg-slate-600 disabled:opacity-50"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsLineChart data={paginatedData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                      <XAxis 
                        dataKey="date" 
                        stroke="#94a3b8"
                        tick={{ fill: '#94a3b8', fontSize: 12 }}
                      />
                      <YAxis 
                        stroke="#94a3b8"
                        tick={{ fill: '#94a3b8' }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#1e293b', 
                          border: '1px solid #475569',
                          borderRadius: '0.5rem',
                          color: '#e2e8f0'
                        }}
                        labelStyle={{ color: '#e2e8f0' }}
                      />
                      <Legend wrapperStyle={{ color: '#94a3b8' }} />
                      
                      {/* Linha de baseline (média geral) */}
                      <ReferenceLine 
                        y={baseline} 
                        stroke="#f59e0b" 
                        strokeDasharray="5 5" 
                        strokeWidth={2}
                        label={{ 
                          value: `Média: ${baseline.toFixed(1)}`, 
                          position: 'right',
                          fill: '#f59e0b',
                          fontSize: 12
                        }}
                      />
                      
                      <Line 
                        type="monotone" 
                        dataKey="count" 
                        stroke="#14b8a6" 
                        strokeWidth={2}
                        dot={false}
                        isAnimationActive={false}
                        name="Registros"
                      />
                      
                      {/* Brush para zoom/scroll horizontal */}
                      <Brush 
                        dataKey="date" 
                        height={30} 
                        stroke="#14b8a6"
                        fill="#1e293b"
                        travellerWidth={10}
                      />
                    </RechartsLineChart>
                  </ResponsiveContainer>

                  <div className="flex items-center justify-between mt-2 text-xs text-slate-500">
                    <span>
                      {totalPages > 1 && `Mostrando ${currentPage * pointsToShow + 1} - ${Math.min((currentPage + 1) * pointsToShow, allData.length)} de ${allData.length} pontos`}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="inline-block w-3 h-0.5 bg-amber-500"></span>
                      Baseline indica a média de todo o período
                    </span>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Estatísticas numéricas - MOVIDO PARA CIMA */}
      {Object.keys(analytics.numericStats).length > 0 && (
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-400" />
              <CardTitle className="text-xl text-slate-200">Estatísticas Numéricas</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-sm">
                <thead className="bg-slate-700/60 text-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left">Coluna</th>
                    <th className="px-4 py-3 text-right">Mínimo</th>
                    <th className="px-4 py-3 text-right">Máximo</th>
                    <th className="px-4 py-3 text-right">Média</th>
                    <th className="px-4 py-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(analytics.numericStats).map(([col, stats]) => (
                    <tr key={col} className="border-b border-slate-700/60 hover:bg-slate-700/30">
                      <td className="px-4 py-3 font-medium text-slate-300">{col}</td>
                      <td className="px-4 py-3 text-right text-slate-400">
                        {stats.min.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-400">
                        {stats.max.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-400">
                        {stats.avg.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 font-semibold text-right text-teal-400">
                        {stats.sum.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Distribuição de Categorias COM GRADIENTE PROGRESSIVO */}
      {Object.keys(analytics.categoryFrequencies).length > 0 && (
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-xl text-slate-200">Distribuição por Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {Object.entries(analytics.categoryFrequencies).map(([column, allFrequencies]) => {
                const chartType = chartTypes[column] || 'bar';
                const currentPage = chartPages[`cat-${column}`] || 0;
                const totalPages = Math.ceil(allFrequencies.length / MAX_CATEGORIES);
                const frequencies = paginateData(allFrequencies, currentPage, MAX_CATEGORIES);
                
                return (
                  <div key={column} className="p-4 border rounded-lg bg-slate-700/20 border-slate-600">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-semibold text-slate-200">{column}</h4>
                      <div className="flex items-center gap-2">
                        {totalPages > 1 && (
                          <>
                            <Button
                              onClick={() => handleChartPageChange(`cat-${column}`, Math.max(0, currentPage - 1))}
                              disabled={currentPage === 0}
                              size="sm"
                              variant="ghost"
                              className="w-8 h-8 p-0 text-slate-400 hover:text-slate-100"
                            >
                              <ChevronLeft className="w-4 h-4" />
                            </Button>
                            <span className="text-xs text-slate-500">
                              {currentPage + 1}/{totalPages}
                            </span>
                            <Button
                              onClick={() => handleChartPageChange(`cat-${column}`, Math.min(totalPages - 1, currentPage + 1))}
                              disabled={currentPage >= totalPages - 1}
                              size="sm"
                              variant="ghost"
                              className="w-8 h-8 p-0 text-slate-400 hover:text-slate-100"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                        
                        <Button
                          onClick={() => toggleChartType(column)}
                          size="sm"
                          variant="outline"
                          className="gap-2 bg-slate-700 border-slate-600 text-slate-100 hover:bg-slate-600"
                        >
                          {chartType === 'bar' ? (
                            <>
                              <PieChartIcon className="w-4 h-4" />
                              Pizza
                            </>
                          ) : (
                            <>
                              <BarChart3 className="w-4 h-4" />
                              Barras
                            </>
                          )}
                        </Button>
                      </div>
                    </div>

                    <ResponsiveContainer width="100%" height={300}>
                      {chartType === 'bar' ? (
                        <BarChart data={frequencies}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                          <XAxis 
                            dataKey="name" 
                            stroke="#94a3b8"
                            tick={{ fill: '#94a3b8', fontSize: 12 }}
                            angle={-45}
                            textAnchor="end"
                            height={80}
                          />
                          <YAxis 
                            stroke="#94a3b8"
                            tick={{ fill: '#94a3b8' }}
                          />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: '#1e293b', 
                              border: '1px solid #475569',
                              borderRadius: '0.5rem',
                              color: '#e2e8f0'
                            }}
                            labelStyle={{ color: '#e2e8f0' }}
                          />
                          <Bar 
                            dataKey="value" 
                            fill="#14b8a6" 
                            radius={[8, 8, 0, 0]}
                            isAnimationActive={false}
                          >
                            {frequencies.map((_, index) => {
                              const globalIndex = currentPage * MAX_CATEGORIES + index;
                              return (
                                <Cell 
                                  key={`cell-${index}`} 
                                  fill={getColorForIndex(globalIndex, allFrequencies.length)} 
                                />
                              );
                            })}
                          </Bar>
                        </BarChart>
                      ) : (
                        <PieChart>
                          <Pie
                            data={frequencies}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }: any) => {
                              const percentValue = (Number(percent || 0) * 100).toFixed(0);
                              return `${String(name)}: ${percentValue}%`;
                            }}
                            outerRadius={100}
                            fill="#8884d8"
                            dataKey="value"
                            isAnimationActive={false}
                          >
                            {frequencies.map((_, index) => {
                              const globalIndex = currentPage * MAX_CATEGORIES + index;
                              return (
                                <Cell 
                                  key={`cell-${index}`} 
                                  fill={getColorForIndex(globalIndex, allFrequencies.length)} 
                                />
                              );
                            })}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: '#1e293b', 
                              border: '1px solid #475569',
                              borderRadius: '0.5rem',
                              color: '#e2e8f0'
                            }}
                            itemStyle={{ color: '#e2e8f0' }}
                          />
                        </PieChart>
                      )}
                    </ResponsiveContainer>

                    {totalPages > 1 && (
                      <p className="mt-2 text-xs text-center text-slate-500">
                        Mostrando top {currentPage * MAX_CATEGORIES + 1}-{Math.min((currentPage + 1) * MAX_CATEGORIES, allFrequencies.length)} de {allFrequencies.length} categorias
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatCard({ 
  icon, 
  label, 
  value, 
  color 
}: { 
  icon: React.ReactNode; 
  label: string; 
  value: string | number; 
  color: 'blue' | 'teal' | 'green' | 'purple';
}) {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600',
    teal: 'from-teal-500 to-teal-600',
    green: 'from-green-500 to-green-600',
    purple: 'from-purple-500 to-purple-600',
  };

  return (
    <div className="flex flex-col p-4 border rounded-lg bg-slate-700/40 border-slate-600">
      <div className={`w-12 h-12 rounded-lg bg-linear-to-br ${colorClasses[color]} flex items-center justify-center text-white mb-3`}>
        {icon}
      </div>
      <span className="text-sm text-slate-400">{label}</span>
      <span className="mt-1 text-2xl font-bold text-slate-100">{value}</span>
    </div>
  );
}
