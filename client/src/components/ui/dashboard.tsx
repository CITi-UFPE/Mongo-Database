// src/components/ui/dashboard.tsx

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, PieChart, TrendingUp, Database } from 'lucide-react';

type DashboardProps = {
  data: Record<string, unknown>[];
  selectedSheet?: string;
  loading?: boolean;
};

export function DashboardOverview({ data, selectedSheet, loading }: DashboardProps) {
  // Análise automática dos dados
  const analytics = useMemo(() => {
    if (!data || data.length === 0) {
      return null;
    }

    // 1. Total de registros
    const totalRecords = data.length;

    // 2. Analisa todas as colunas
    const columns = Object.keys(data[0] || {});
    
    // 3. Identifica colunas numéricas e categóricas
    const numericColumns: string[] = [];
    const categoricalColumns: string[] = [];
    
    columns.forEach(col => {
      const sampleValues = data.slice(0, 100).map(row => row[col]);
      const numericCount = sampleValues.filter(v => 
        typeof v === 'number' || (!isNaN(Number(v)) && v !== null && v !== '')
      ).length;
      
      if (numericCount > sampleValues.length * 0.8) {
        numericColumns.push(col);
      } else {
        categoricalColumns.push(col);
      }
    });

    // 4. Calcula frequências para colunas categóricas
    const categoryFrequencies: Record<string, Record<string, number>> = {};
    categoricalColumns.forEach(col => {
      const freq: Record<string, number> = {};
      data.forEach(row => {
        const value = String(row[col] || 'N/A');
        freq[value] = (freq[value] || 0) + 1;
      });
      categoryFrequencies[col] = freq;
    });

    // 5. Encontra categoria mais frequente para cada coluna
    const mostFrequent: Record<string, { value: string; count: number; percentage: number }> = {};
    Object.entries(categoryFrequencies).forEach(([col, freq]) => {
      const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);
      if (sorted.length > 0) {
        const [value, count] = sorted[0];
        mostFrequent[col] = {
          value,
          count,
          percentage: (count / totalRecords) * 100
        };
      }
    });

    // 6. Estatísticas numéricas
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

    // 7. Distribui dados para visualização
    const topCategories = Object.entries(mostFrequent)
      .slice(0, 4)
      .map(([col, data]) => ({ column: col, ...data }));

    return {
      totalRecords,
      columns,
      numericColumns,
      categoricalColumns,
      categoryFrequencies,
      mostFrequent,
      numericStats,
      topCategories
    };
  }, [data]);

  if (loading) {
    return (
      <Card className="bg-slate-800 border-slate-700 min-h-[400px] flex items-center justify-center">
        <div className="text-slate-400">Carregando análises...</div>
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
              label="Colunas Totais"
              value={analytics.columns.length}
              color="teal"
            />
            <StatCard
              icon={<TrendingUp className="w-6 h-6" />}
              label="Colunas Numéricas"
              value={analytics.numericColumns.length}
              color="green"
            />
            <StatCard
              icon={<PieChart className="w-6 h-6" />}
              label="Colunas Categóricas"
              value={analytics.categoricalColumns.length}
              color="purple"
            />
          </div>
        </CardContent>
      </Card>

      {/* Valores mais frequentes */}
      {analytics.topCategories.length > 0 && (
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-xl text-slate-200">Valores Mais Frequentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {analytics.topCategories.map(({ column, value, count, percentage }) => (
                <div key={column} className="p-4 border rounded-lg bg-slate-700/40 border-slate-600">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-400">{column}</p>
                      <p className="mt-1 text-lg font-semibold truncate text-slate-100" title={value}>
                        {value}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex-1 h-2 overflow-hidden rounded-full bg-slate-600">
                          <div
                            className="h-full transition-all bg-teal-500"
                            style={{ width: `${Math.min(percentage, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-400">{percentage.toFixed(1)}%</span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        {count.toLocaleString()} ocorrências
                      </p>
                    </div>
                  </div>
                </div>
              ))}
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
            <div className="overflow-x-auto">
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
                      <td className="px-4 py-3 text-right text-slate-400">{stats.min.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right text-slate-400">{stats.max.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right text-slate-400">{stats.avg.toFixed(2)}</td>
                      <td className="px-4 py-3 font-semibold text-right text-teal-400">
                        {stats.sum.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Distribuição de categorias */}
      {Object.keys(analytics.categoryFrequencies).length > 0 && (
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-xl text-slate-200">Distribuição por Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {Object.entries(analytics.categoryFrequencies)
                .slice(0, 3)
                .map(([column, frequencies]) => {
                  const sorted = Object.entries(frequencies)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 5);
                  const total = Object.values(frequencies).reduce((a, b) => a + b, 0);

                  return (
                    <div key={column} className="p-4 border rounded-lg bg-slate-700/20 border-slate-600">
                      <h4 className="mb-3 font-semibold text-slate-200">{column}</h4>
                      <div className="space-y-2">
                        {sorted.map(([value, count]) => {
                          const percentage = (count / total) * 100;
                          return (
                            <div key={value} className="flex items-center gap-3">
                              <span className="flex-1 text-sm truncate text-slate-300" title={value}>
                                {value}
                              </span>
                              <div className="flex items-center flex-1 gap-2">
                                <div className="flex-1 h-2 overflow-hidden rounded-full bg-slate-600">
                                  <div
                                    className="h-full transition-all bg-gradient-to-r from-blue-500 to-teal-500"
                                    style={{ width: `${percentage}%` }}
                                  />
                                </div>
                                <span className="text-xs tabular-nums text-slate-400 min-w-[3rem] text-right">
                                  {count} ({percentage.toFixed(1)}%)
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
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
