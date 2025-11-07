// src/components/ui/dashboard.tsx

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart3, PieChart as PieChartIcon, TrendingUp, Database, LineChart } from 'lucide-react';
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
  ResponsiveContainer
} from 'recharts';

type DashboardProps = {
  data: Record<string, unknown>[];
  selectedSheet?: string;
  loading?: boolean;
};

type ChartType = 'bar' | 'pie';

const COLORS = ['#0ea5e9', '#06b6d4', '#14b8a6', '#10b981', '#84cc16', '#eab308', '#f59e0b', '#f97316', '#ef4444', '#ec4899'];

export function DashboardOverview({ data, selectedSheet, loading }: DashboardProps) {
  const [chartTypes, setChartTypes] = useState<Record<string, ChartType>>({});

  const toggleChartType = (column: string) => {
    setChartTypes(prev => ({
      ...prev,
      [column]: prev[column] === 'bar' ? 'pie' : 'bar'
    }));
  };

  // Análise automática dos dados
  const analytics = useMemo(() => {
    if (!data || data.length === 0) {
      return null;
    }

    const totalRecords = data.length;
    
    // Filtra colunas: remove ID, _v, e colunas internas
    const allColumns = Object.keys(data[0] || {});
    const filteredColumns = allColumns.filter(col => {
      const lower = col.toLowerCase();
      return !lower.includes('id') && 
             !lower.includes('_v') && 
             !lower.startsWith('_') &&
             col !== '__v';
    });

    // Identifica colunas numéricas, categóricas e temporais
    const numericColumns: string[] = [];
    const categoricalColumns: string[] = [];
    const temporalColumns: string[] = [];
    
    filteredColumns.forEach(col => {
      const sampleValues = data.slice(0, 100).map(row => row[col]);
      
      // Detecta colunas temporais
      const isDate = sampleValues.some(v => {
        if (!v) return false;
        const str = String(v);
        // Detecta formatos de data comuns
        return /^\d{4}-\d{2}-\d{2}/.test(str) || 
               /^\d{2}\/\d{2}\/\d{4}/.test(str) ||
               !isNaN(Date.parse(str));
      });

      if (isDate) {
        temporalColumns.push(col);
      } else {
        // Detecta numéricas
        const numericCount = sampleValues.filter(v => 
          typeof v === 'number' || (!isNaN(Number(v)) && v !== null && v !== '')
        ).length;
        
        if (numericCount > sampleValues.length * 0.8) {
          numericColumns.push(col);
        } else {
          categoricalColumns.push(col);
        }
      }
    });

    // Calcula frequências para colunas categóricas (top 10)
    const categoryFrequencies: Record<string, Array<{ name: string; value: number }>> = {};
    categoricalColumns.forEach(col => {
      const freq: Record<string, number> = {};
      data.forEach(row => {
        const value = String(row[col] || 'N/A');
        freq[value] = (freq[value] || 0) + 1;
      });
      
      // Top 10 valores
      const sorted = Object.entries(freq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([name, value]) => ({ name, value }));
      
      categoryFrequencies[col] = sorted;
    });

    // Estatísticas numéricas
    const numericStats: Record<string, { min: number; max: number; avg: number; sum: number }> = {};
    numericColumns.forEach(col => {
      const values = data
        .map(row => Number(row[col]))
        .filter(v => !isNaN(v));
      
      if (values.length > 0) {
        numericStats[col] = {
          min: Math.min(...values),
          max: Math.max(...values),
          avg: values.reduce((a, b) => a + b, 0) / values.length,
          sum: values.reduce((a, b) => a + b, 0)
        };
      }
    });

    // Dados temporais - agrupa por data
    const temporalData: Record<string, Array<{ date: string; count: number; [key: string]: unknown }>> = {};
    temporalColumns.forEach(col => {
      const grouped: Record<string, number> = {};
      
      data.forEach(row => {
        const value = row[col];
        if (!value) return;
        
        try {
          const date = new Date(String(value));
          if (!isNaN(date.getTime())) {
            const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
            grouped[dateStr] = (grouped[dateStr] || 0) + 1;
          }
        } catch {
          // Ignora valores inválidos
        }
      });

      // Ordena por data
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

      {/* Gráficos Temporais */}
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
              const data = analytics.temporalData[column] || [];
              if (data.length === 0) return null;

              return (
                <div key={column} className="p-4 border rounded-lg bg-slate-700/20 border-slate-600">
                  <h4 className="mb-4 font-semibold text-slate-200">{column}</h4>
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsLineChart data={data}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                      <XAxis 
                        dataKey="date" 
                        stroke="#94a3b8"
                        tick={{ fill: '#94a3b8' }}
                      />
                      <YAxis 
                        stroke="#94a3b8"
                        tick={{ fill: '#94a3b8' }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#1e293b', 
                          border: '1px solid #475569',
                          borderRadius: '0.5rem'
                        }}
                        labelStyle={{ color: '#e2e8f0' }}
                      />
                      <Legend wrapperStyle={{ color: '#94a3b8' }} />
                      <Line 
                        type="monotone" 
                        dataKey="count" 
                        stroke="#14b8a6" 
                        strokeWidth={2}
                        dot={{ fill: '#14b8a6', r: 4 }}
                        activeDot={{ r: 6 }}
                        name="Registros"
                      />
                    </RechartsLineChart>
                  </ResponsiveContainer>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Distribuição de Categorias com toggle Bar/Pie */}
      {Object.keys(analytics.categoryFrequencies).length > 0 && (
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-xl text-slate-200">Distribuição por Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {Object.entries(analytics.categoryFrequencies).map(([column, frequencies]) => {
                const chartType = chartTypes[column] || 'bar';
                
                return (
                  <div key={column} className="p-4 border rounded-lg bg-slate-700/20 border-slate-600">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-semibold text-slate-200">{column}</h4>
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
                              borderRadius: '0.5rem'
                            }}
                            labelStyle={{ color: '#e2e8f0' }}
                          />
                          <Bar dataKey="value" fill="#14b8a6" radius={[8, 8, 0, 0]}>
                            {frequencies.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      ) : (
                        <PieChart>
                          <Pie
                            data={frequencies}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }: any) => 
                              `${String(name)}: ${(Number(percent || 0) * 100).toFixed(0)}%`
                            }
                            outerRadius={100}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {frequencies.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: '#1e293b', 
                              border: '1px solid #475569',
                              borderRadius: '0.5rem',
                              color: '#14b8a6'
                            }}
                          />
                        </PieChart>
                      )}
                    </ResponsiveContainer>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Estatísticas numéricas */}
      {Object.keys(analytics.numericStats).length > 0 && (
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-xl text-slate-200">Estatísticas Numéricas</CardTitle>
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
    </div>
  );
}

// Componente auxiliar para cards de estatísticas
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
      <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${colorClasses[color]} flex items-center justify-center text-white mb-3`}>
        {icon}
      </div>
      <span className="text-sm text-slate-400">{label}</span>
      <span className="mt-1 text-2xl font-bold text-slate-100">{value}</span>
    </div>
  );
}
