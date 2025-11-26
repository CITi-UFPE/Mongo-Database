// src/components/ui/dashboard.tsx

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Target,
  Users,
  Activity,
  Award,
  AlertCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  Percent,
  Loader2
} from 'lucide-react';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart as RechartsLineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

type KPIData = {
  kpis: {
    total_leads: number;
    open_leads: number;
    won_leads: number;
    lost_leads: number;
    conversion_rate: number;
    loss_rate: number;
    pipeline_value: number;
    won_value: number;
  };
  funnel_distribution: Array<{
    fase: string;
    ordem: number;
    count: number;
    valor: number;
  }>;
  lead_sources: Array<{
    canal: string;
    count: number;
    valor: number;
  }>;
  loss_reasons: Array<{
    motivo: string;
    count: number;
  }>;
  seller_performance: Array<{
    id: string;
    nome: string;
    total_leads: number;
    leads_ganhos: number;
    leads_perdidos: number;
    valor_total: number;
    valor_ganho: number;
    taxa_conversao: number;
  }>;
  temporal_evolution: Array<{
    year: number;
    month: number;
    date: string;
    total_leads: number;
    leads_ganhos: number;
    leads_perdidos: number;
    valor_total: number;
  }>;
};

const COLORS = ['#0ea5e9', '#14b8a6', '#84cc16', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#10b981'];
const FASE_COLORS: Record<string, string> = {
  'Prospecção': '#3b82f6',
  'Qualificação': '#06b6d4',
  'Proposta': '#14b8a6',
  'Negociação': '#eab308',
  'Fechado': '#10b981',
  'Ganho': '#10b981',
  'Perdido': '#ef4444',
  'Aberto': '#3b82f6'
};

import { PredictionAnalysis } from './PredictionAnalysis';
import { ClusterAnalysis } from './ClusterAnalysis';


export function DashboardOverview() {
  const [chartPage, setChartPage] = useState(0);
  const [viewMode, setViewMode] = useState<'overview' | 'clustering' | 'prediction'>('overview');
  const [kpiData, setKpiData] = useState<KPIData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchKPIs = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/analytics/kpis');
        if (!response.ok) {
          throw new Error('Failed to fetch analytics data');
        }
        const data = await response.json();
        setKpiData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load analytics');
        console.error('Error fetching KPIs:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchKPIs();
  }, []);

  const dashboardData = useMemo(() => {
    if (!kpiData) return null;

    const { kpis, funnel_distribution, lead_sources, loss_reasons, seller_performance, temporal_evolution } = kpiData;

    // Prepare funnel data
    const funnelData = funnel_distribution.map(f => ({
      name: f.fase,
      leads: f.count,
      valor: f.valor,
      fill: FASE_COLORS[f.fase] || COLORS[0]
    }));

    // Prepare lead sources data
    const sortedSources = [...lead_sources].sort((a, b) => b.count - a.count);
    let sourcesData;

    if (sortedSources.length > 8) {
      const top8 = sortedSources.slice(0, 8);
      const others = sortedSources.slice(8);

      const othersCount = others.reduce((sum, s) => sum + s.count, 0);
      const othersValue = others.reduce((sum, s) => sum + s.valor, 0);

      sourcesData = [
        ...top8.map((s, idx) => ({
          name: s.canal,
          value: s.count,
          valor: s.valor,
          fill: COLORS[idx % COLORS.length]
        })),
        {
          name: 'Outros',
          value: othersCount,
          valor: othersValue,
          fill: '#64748b', // Slate-500 for others
          details: others.map(s => ({ name: s.canal, value: s.count }))
        }
      ];
    } else {
      sourcesData = sortedSources.map((s, idx) => ({
        name: s.canal,
        value: s.count,
        valor: s.valor,
        fill: COLORS[idx % COLORS.length]
      }));
    }

    // Prepare loss reasons data
    const lossData = loss_reasons.map(r => ({
      name: r.motivo,
      value: r.count
    }));

    // Prepare seller performance data
    const sellersData = seller_performance.slice(0, 10).map((s, idx) => ({
      name: s.nome,
      total: s.total_leads,
      ganhos: s.leads_ganhos,
      perdidos: s.leads_perdidos,
      valor: s.valor_ganho,
      taxa: s.taxa_conversao,
      fill: COLORS[idx % COLORS.length]
    }));

    // Prepare temporal data
    const temporalData = temporal_evolution.map(t => ({
      mes: `${t.month}/${t.year}`,
      total: t.total_leads,
      ganhos: t.leads_ganhos,
      perdidos: t.leads_perdidos,
      valor: t.valor_total
    }));

    return {
      kpis: {
        totalLeads: kpis.total_leads,
        leadsAbertos: kpis.open_leads,
        leadsGanhos: kpis.won_leads,
        leadsPerdidos: kpis.lost_leads,
        taxaConversao: kpis.conversion_rate,
        taxaPerda: kpis.loss_rate,
        valorPipeline: kpis.pipeline_value,
        valorGanho: kpis.won_value,
        ticketMedio: kpis.won_leads > 0 ? kpis.won_value / kpis.won_leads : 0
      },
      funnelData,
      sourcesData,
      lossData,
      sellersData,
      temporalData
    };
  }, [kpiData]);

  if (viewMode === 'clustering') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-100">Análise de Clusters (IA)</h2>
          <Button
            variant="outline"
            onClick={() => setViewMode('overview')}
            className="bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700"
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Voltar ao Dashboard
          </Button>
        </div>
        <ClusterAnalysis />
      </div>
    );
  }

  if (viewMode === 'prediction') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-100">Previsão de Vendas (IA)</h2>
          <Button
            variant="outline"
            onClick={() => setViewMode('overview')}
            className="bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700"
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Voltar ao Dashboard
          </Button>
        </div>
        <PredictionAnalysis />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-12 h-12 animate-spin text-teal-500" />
        <p className="mt-4 text-slate-400">Carregando analytics do CRM...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertCircle className="w-12 h-12 text-rose-500" />
        <p className="mt-4 text-slate-200">Erro ao carregar dados</p>
        <p className="mt-2 text-sm text-slate-400">{error}</p>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Activity className="w-12 h-12 text-slate-500" />
        <p className="mt-4 text-slate-400">Nenhum dado disponível</p>
      </div>
    );
  }

  const { kpis, funnelData, sourcesData, lossData, sellersData, temporalData } = dashboardData;

  const chartsPerPage = 2;
  const allCharts = [
    { id: 'funnel', title: 'Distribuição do Funil', icon: Target },
    { id: 'sources', title: 'Origens de Leads', icon: Users },
    { id: 'sellers', title: 'Performance dos Vendedores', icon: Award },
    { id: 'temporal', title: 'Evolução Temporal', icon: Activity },
  ];
  const totalChartPages = Math.ceil(allCharts.length / chartsPerPage);
  const visibleCharts = allCharts.slice(chartPage * chartsPerPage, (chartPage + 1) * chartsPerPage);

  return (
    <div className="space-y-6 text-slate-200">
      <div className="flex justify-end gap-2">
        <Button
          onClick={() => setViewMode('clustering')}
          className="bg-teal-600 hover:bg-teal-700 text-white"
        >
          <Activity className="w-4 h-4 mr-2" />
          Análise de Clusters (IA)
        </Button>
        <Button
          onClick={() => setViewMode('prediction')}
          className="bg-purple-600 hover:bg-purple-700 text-white"
        >
          <TrendingUp className="w-4 h-4 mr-2" />
          Previsão de Vendas (IA)
        </Button>
      </div>

      {/* KPI Cards */}


      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          icon={<Target className="w-6 h-6" />}
          label="Total de Leads"
          value={kpis.totalLeads}
          subtitle={`${kpis.leadsAbertos} ativos`}
          color="blue"
        />
        <KPICard
          icon={<TrendingUp className="w-6 h-6" />}
          label="Taxa de Conversão"
          value={`${kpis.taxaConversao.toFixed(1)}%`}
          subtitle={`${kpis.leadsGanhos} ganhos`}
          color="teal"
          trend="up"
        />
        <KPICard
          icon={<DollarSign className="w-6 h-6" />}
          label="Valor Pipeline"
          value={`R$ ${(kpis.valorPipeline / 1000).toFixed(0)}K`}
          subtitle={`R$ ${(kpis.valorGanho / 1000).toFixed(0)}K ganho`}
          color="green"
        />
        <KPICard
          icon={<Activity className="w-6 h-6" />}
          label="Ticket Médio"
          value={`R$ ${kpis.ticketMedio.toFixed(0)}`}
          subtitle={`${kpis.leadsPerdidos} perdidos`}
          color="purple"
        />
      </div>

      {/* Insights Card */}
      <Card className="bg-linear-to-r from-slate-800 to-slate-700 border-slate-600">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-teal-500/20">
              <TrendingUp className="w-6 h-6 text-teal-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-slate-100">Insights do CRM</h3>
              <div className="mt-3 space-y-2 text-sm text-slate-300">
                <p>• Taxa de conversão atual: <span className="font-semibold text-teal-400">{kpis.taxaConversao.toFixed(1)}%</span></p>
                <p>• Ticket médio: <span className="font-semibold text-teal-400">R$ {kpis.ticketMedio.toFixed(2)}</span></p>
                <p>• {kpis.leadsAbertos} leads ativos no pipeline com potencial de <span className="font-semibold text-teal-400">R$ {(kpis.valorPipeline / 1000).toFixed(0)}K</span></p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts Section with Pagination */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-200">Análises Detalhadas</h3>
          {totalChartPages > 1 && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setChartPage(p => Math.max(0, p - 1))}
                disabled={chartPage === 0}
                className="text-slate-300 bg-slate-700 border-slate-600 hover:bg-slate-600"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm text-slate-400">
                {chartPage + 1} / {totalChartPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setChartPage(p => Math.min(totalChartPages - 1, p + 1))}
                disabled={chartPage >= totalChartPages - 1}
                className="text-slate-300 bg-slate-700 border-slate-600 hover:bg-slate-600"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {visibleCharts.map(chart => (
            <Card key={chart.id} className="bg-slate-800 border-slate-700">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <chart.icon className="w-5 h-5 text-teal-400" />
                  <CardTitle className="text-xl text-slate-200">{chart.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {chart.id === 'funnel' && (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={funnelData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="name" stroke="#94a3b8" tick={{ fill: '#94a3b8' }} />
                      <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8' }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1e293b',
                          border: '1px solid #475569',
                          borderRadius: '0.5rem',
                          color: '#e2e8f0'
                        }}
                        itemStyle={{ color: '#e2e8f0' }}
                      />
                      <Bar dataKey="leads" fill="#14b8a6" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
                {chart.id === 'sources' && (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={sourcesData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(entry: any) =>
                          `${entry.name}: ${((entry.value / sourcesData.reduce((sum, s) => sum + s.value, 0)) * 100).toFixed(0)}%`
                        }
                        outerRadius={100}
                        dataKey="value"
                        isAnimationActive={false}
                      >
                        {sourcesData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill || COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomPieTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
                {chart.id === 'sellers' && (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={sellersData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis type="number" stroke="#94a3b8" tick={{ fill: '#94a3b8' }} />
                      <YAxis type="category" dataKey="name" stroke="#94a3b8" tick={{ fill: '#94a3b8' }} width={100} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1e293b',
                          border: '1px solid #475569',
                          borderRadius: '0.5rem',
                          color: '#e2e8f0'
                        }}
                        itemStyle={{ color: '#e2e8f0' }}
                      />
                      <Bar dataKey="ganhos" fill="#10b981" radius={[0, 8, 8, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
                {chart.id === 'temporal' && (
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsLineChart data={temporalData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="mes" stroke="#94a3b8" tick={{ fill: '#94a3b8' }} />
                      <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8' }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1e293b',
                          border: '1px solid #475569',
                          borderRadius: '0.5rem',
                          color: '#e2e8f0'
                        }}
                        itemStyle={{ color: '#e2e8f0' }}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="total"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        name="Total Leads"
                      />
                      <Line
                        type="monotone"
                        dataKey="ganhos"
                        stroke="#10b981"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        name="Leads Ganhos"
                      />
                      <Line
                        type="monotone"
                        dataKey="perdidos"
                        stroke="#ef4444"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        name="Leads Perdidos"
                      />
                    </RechartsLineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Loss Reasons */}
      {lossData.length > 0 && (
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-rose-400" />
              <CardTitle className="text-xl text-slate-200">Motivos de Perda</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {lossData.map((motivo, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-slate-700/30">
                  <span className="flex-1 text-sm truncate text-slate-300">{motivo.name}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-2 overflow-hidden rounded-full bg-slate-600">
                      <div
                        className="h-full bg-rose-500"
                        style={{ width: `${(motivo.value / kpis.leadsPerdidos) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-right text-slate-200 min-w-8">{motivo.value}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function KPICard({
  icon,
  label,
  value,
  subtitle,
  color,
  trend
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subtitle?: string;
  color: 'blue' | 'teal' | 'green' | 'purple';
  trend?: 'up' | 'down';
}) {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600',
    teal: 'from-teal-500 to-teal-600',
    green: 'from-green-500 to-green-600',
    purple: 'from-purple-500 to-purple-600',
  };

  const iconBgClasses = {
    blue: 'bg-blue-500/20',
    teal: 'bg-teal-500/20',
    green: 'bg-green-500/20',
    purple: 'bg-purple-500/20',
  };

  const iconColorClasses = {
    blue: 'text-blue-400',
    teal: 'text-teal-400',
    green: 'text-green-400',
    purple: 'text-purple-400',
  };

  return (
    <Card className="overflow-hidden bg-slate-800 border-slate-700">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className={`p-3 rounded-lg ${iconBgClasses[color]}`}>
            <div className={iconColorClasses[color]}>
              {icon}
            </div>
          </div>
          {trend && (
            <div className={`flex items-center gap-1 ${trend === 'up' ? 'text-green-400' : 'text-rose-400'}`}>
              {trend === 'up' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            </div>
          )}
        </div>
        <div>
          <p className="text-sm text-slate-400">{label}</p>
          <p className="mt-1 text-2xl font-bold text-slate-100">{value}</p>
          {subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function CustomPieTooltip({ active, payload }: any) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-800 border border-slate-700 p-3 rounded-lg shadow-lg text-slate-200 z-50">
        <p className="font-semibold mb-1">{data.name}</p>
        <p className="text-sm">Leads: {data.value}</p>
        {data.valor !== undefined && (
          <p className="text-sm">Valor: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.valor)}</p>
        )}

        {data.name === 'Outros' && data.details && (
          <div className="mt-2 pt-2 border-t border-slate-700">
            <p className="text-xs font-semibold text-slate-400 mb-1">Composição:</p>
            <div className="max-h-32 overflow-y-auto custom-scrollbar pr-2">
              {data.details.map((item: any, idx: number) => (
                <div key={idx} className="flex justify-between text-xs text-slate-300 gap-4">
                  <span>{item.name}</span>
                  <span>{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }
  return null;
}
