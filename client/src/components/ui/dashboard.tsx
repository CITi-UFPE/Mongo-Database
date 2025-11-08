// src/components/ui/dashboard.tsx

import { useMemo, useState } from 'react';
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
  Percent
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

type DashboardProps = {
  data: Record<string, unknown>[];
  selectedSheet?: string;
  loading?: boolean;
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

export function DashboardOverview({ data, selectedSheet, loading }: DashboardProps) {
  const [chartPage, setChartPage] = useState(0);

  const analytics = useMemo(() => {
    if (!data || data.length === 0) {
      return null;
    }

    const totalRecords = data.length;

    // Detecta se é planilha de CRM baseado nas colunas
    const columns = Object.keys(data[0] || {});
    const isCRM = columns.some(col => 
      ['status', 'lead', 'vendedor', 'fase', 'valor'].some(key => 
        col.toLowerCase().includes(key)
      )
    );

    // ===== ANÁLISES ESPECÍFICAS DE CRM =====
    if (isCRM) {
      // 1. KPIs de Leads
      const statusColumn = columns.find(c => c.toLowerCase() === 'status') || 'status';
      const valorColumn = columns.find(c => c.toLowerCase().includes('valor')) || 'valor_estimado';
      const faseColumn = columns.find(c => c.toLowerCase().includes('fase')) || 'id_fase_atual';
      const vendedorColumn = columns.find(c => c.toLowerCase().includes('vendedor') || c.toLowerCase().includes('seller')) || 'sellerName';
      const origemColumn = columns.find(c => c.toLowerCase().includes('origem') || c.toLowerCase().includes('source')) || 'origem';
      const motivoColumn = columns.find(c => c.toLowerCase().includes('motivo')) || 'id_motivo_perda';
      const dataColumn = columns.find(c => c.toLowerCase().includes('data') || c.toLowerCase().includes('date')) || 'createdAt';

      const leadsAbertos = data.filter(d => {
        const status = String(d[statusColumn] || '').toLowerCase();
        return status === 'aberto' || status === 'open' || status === 'ativo';
      }).length;

      const leadsGanhos = data.filter(d => {
        const status = String(d[statusColumn] || '').toLowerCase();
        return status === 'ganho' || status === 'won' || status === 'fechado';
      }).length;

      const leadsPerdidos = data.filter(d => {
        const status = String(d[statusColumn] || '').toLowerCase();
        return status === 'perdido' || status === 'lost';
      }).length;

      const taxaConversao = (leadsGanhos + leadsPerdidos) > 0 
        ? (leadsGanhos / (leadsGanhos + leadsPerdidos)) * 100 
        : 0;

      const taxaPerda = (leadsGanhos + leadsPerdidos) > 0 
        ? (leadsPerdidos / (leadsGanhos + leadsPerdidos)) * 100 
        : 0;

      // 2. Valor Total
      const valorTotalPipeline = data
        .filter(d => {
          const status = String(d[statusColumn] || '').toLowerCase();
          return status === 'aberto' || status === 'open' || status === 'ativo';
        })
        .reduce((sum, d) => sum + (Number(d[valorColumn]) || 0), 0);

      const valorGanho = data
        .filter(d => {
          const status = String(d[statusColumn] || '').toLowerCase();
          return status === 'ganho' || status === 'won' || status === 'fechado';
        })
        .reduce((sum, d) => sum + (Number(d[valorColumn]) || 0), 0);

      const ticketMedio = leadsGanhos > 0 ? valorGanho / leadsGanhos : 0;

      // 3. Funil de Conversão
      const faseCount: Record<string, number> = {};
      data.forEach(lead => {
        const fase = String(lead[faseColumn] || 'Sem Fase');
        faseCount[fase] = (faseCount[fase] || 0) + 1;
      });

      const funnelData = Object.entries(faseCount)
        .map(([fase, count]) => ({
          fase,
          leads: count,
          fill: FASE_COLORS[fase] || COLORS[0]
        }))
        .sort((a, b) => b.leads - a.leads);

      // 4. Performance por Vendedor
      const vendedorStats: Record<string, { total: number; ganhos: number; valor: number }> = {};
      data.forEach(lead => {
        const vendedor = String(lead[vendedorColumn] || 'Não atribuído');
        if (!vendedorStats[vendedor]) {
          vendedorStats[vendedor] = { total: 0, ganhos: 0, valor: 0 };
        }
        vendedorStats[vendedor].total++;
        
        const status = String(lead[statusColumn] || '').toLowerCase();
        if (status === 'ganho' || status === 'won' || status === 'fechado') {
          vendedorStats[vendedor].ganhos++;
          vendedorStats[vendedor].valor += Number(lead[valorColumn]) || 0;
        }
      });

      const vendedorPerformance = Object.entries(vendedorStats)
        .map(([nome, stats]) => ({
          nome,
          leads: stats.total,
          ganhos: stats.ganhos,
          valorGerado: stats.valor,
          taxa: stats.total > 0 ? (stats.ganhos / stats.total) * 100 : 0
        }))
        .sort((a, b) => b.valorGerado - a.valorGerado)
        .slice(0, 6);

      // 5. Evolução Temporal
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      type TemporalMonth = {
        mes: string;
        novos: number;
        ganhos: number;
        perdidos: number;
        valor: number;
      };

      const temporalData = data
        .filter(d => d[dataColumn] && new Date(String(d[dataColumn])) >= sixMonthsAgo)
        .reduce((acc: Record<string, TemporalMonth>, lead) => {
          const date = new Date(String(lead[dataColumn]));
          const month = date.toLocaleDateString('pt-BR', { year: 'numeric', month: 'short' });
          
          if (!acc[month]) {
            acc[month] = { mes: month, novos: 0, ganhos: 0, perdidos: 0, valor: 0 };
          }
          
          acc[month].novos++;
          
          const status = String(lead[statusColumn] || '').toLowerCase();
          if (status === 'ganho' || status === 'won' || status === 'fechado') {
            acc[month].ganhos++;
            acc[month].valor += Number(lead[valorColumn]) || 0;
          } else if (status === 'perdido' || status === 'lost') {
            acc[month].perdidos++;
          }
          
          return acc;
        }, {} as Record<string, TemporalMonth>);

      const evolucaoTemporal = Object.values(temporalData);

      // 6. Origem dos Leads
      const origemCount: Record<string, number> = {};
      data.forEach(lead => {
        const origem = String(lead[origemColumn] || 'Não informado');
        origemCount[origem] = (origemCount[origem] || 0) + 1;
      });

      const origemData = Object.entries(origemCount)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 6);

      // 7. Motivos de Perda
      const motivoPerdaCount: Record<string, number> = {};
      data
        .filter(d => {
          const status = String(d[statusColumn] || '').toLowerCase();
          return status === 'perdido' || status === 'lost';
        })
        .forEach(lead => {
          const motivo = String(lead[motivoColumn] || 'Não informado');
          motivoPerdaCount[motivo] = (motivoPerdaCount[motivo] || 0) + 1;
        });

      const motivoPerdaData = Object.entries(motivoPerdaCount)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);

      return {
        type: 'crm',
        totalRecords,
        kpis: {
          leadsAbertos,
          leadsGanhos,
          leadsPerdidos,
          taxaConversao,
          taxaPerda,
          valorTotalPipeline,
          valorGanho,
          ticketMedio,
          totalRecords
        },
        funnelData,
        vendedorPerformance,
        evolucaoTemporal,
        origemData,
        motivoPerdaData
      };
    }

    // ===== ANÁLISE GENÉRICA (fallback) =====
    return {
      type: 'generic',
      totalRecords,
      message: 'Esta planilha não contém dados de CRM. Selecione uma planilha com leads, vendedores ou funil de vendas.'
    };
  }, [data]);

  if (loading) {
    return (
      <Card className="bg-slate-800 border-slate-700 min-h-[400px] flex items-center justify-center">
        <div className="flex items-center gap-2 text-slate-400">
          <Activity className="w-5 h-5 animate-pulse" />
          <span>Carregando análises do CRM...</span>
        </div>
      </Card>
    );
  }

  if (!analytics || !selectedSheet) {
    return (
      <Card className="bg-slate-800 border-slate-700 min-h-[400px] flex flex-col items-center justify-center gap-4">
        <Target className="w-16 h-16 text-slate-600" />
        <div className="text-center">
          <h3 className="text-lg font-semibold text-slate-200">Nenhuma planilha selecionada</h3>
          <p className="mt-2 text-sm text-slate-400">
            Selecione uma planilha de CRM para visualizar as análises de vendas.
          </p>
        </div>
      </Card>
    );
  }

  if (analytics.type === 'generic') {
    return (
      <Card className="bg-slate-800 border-slate-700 min-h-[400px] flex flex-col items-center justify-center gap-4">
        <AlertCircle className="w-16 h-16 text-amber-500" />
        <div className="max-w-md text-center">
          <h3 className="text-lg font-semibold text-slate-200">Dashboard CRM</h3>
          <p className="mt-2 text-sm text-slate-400">
            {analytics.message}
          </p>
        </div>
      </Card>
    );
  }

  // Type guard to ensure we have CRM data
  if (!analytics.kpis || !analytics.funnelData || !analytics.vendedorPerformance || 
      !analytics.evolucaoTemporal || !analytics.origemData || !analytics.motivoPerdaData) {
    return null;
  }

  const { kpis, funnelData, vendedorPerformance, evolucaoTemporal, origemData, motivoPerdaData } = analytics;

  return (
    <div className="space-y-6">
      {/* KPIs Principais */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard
          icon={<Target className="w-5 h-5" />}
          label="Leads Ativos"
          value={kpis.leadsAbertos}
          subtitle={`${kpis.totalRecords} total`}
          color="blue"
        />
        <KPICard
          icon={<TrendingUp className="w-5 h-5" />}
          label="Taxa de Conversão"
          value={`${kpis.taxaConversao.toFixed(1)}%`}
          subtitle={`${kpis.leadsGanhos} ganhos`}
          color="green"
          trend={kpis.taxaConversao > 50 ? 'up' : kpis.taxaConversao > 20 ? undefined : 'down'}
        />
        <KPICard
          icon={<DollarSign className="w-5 h-5" />}
          label="Valor Pipeline"
          value={`R$ ${(kpis.valorTotalPipeline / 1000).toFixed(0)}K`}
          subtitle={`R$ ${kpis.ticketMedio.toFixed(0)} ticket médio`}
          color="teal"
        />
        <KPICard
          icon={<Award className="w-5 h-5" />}
          label="Receita Gerada"
          value={`R$ ${(kpis.valorGanho / 1000).toFixed(0)}K`}
          subtitle={`${kpis.leadsGanhos} fechamentos`}
          color="purple"
        />
      </div>

      {/* Funil de Vendas + Evolução Temporal */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl text-slate-200">
              <Target className="w-5 h-5 text-teal-400" />
              Funil de Vendas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={funnelData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                <XAxis type="number" stroke="#94a3b8" tick={{ fill: '#94a3b8' }} />
                <YAxis 
                  dataKey="fase" 
                  type="category" 
                  stroke="#94a3b8" 
                  tick={{ fill: '#94a3b8' }} 
                  width={120} 
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1e293b', 
                    border: '1px solid #475569',
                    borderRadius: '0.5rem',
                    color: '#e2e8f0'
                  }}
                />
                <Bar dataKey="leads" radius={[0, 8, 8, 0]}>
                  {funnelData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl text-slate-200">
              <TrendingUp className="w-5 h-5 text-teal-400" />
              Evolução de Leads (6 meses)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={evolucaoTemporal}>
                <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                <XAxis dataKey="mes" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8' }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1e293b', 
                    border: '1px solid #475569',
                    borderRadius: '0.5rem',
                    color: '#e2e8f0'
                  }}
                />
                <Legend wrapperStyle={{ color: '#94a3b8' }} />
                <Area type="monotone" dataKey="novos" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} name="Novos" />
                <Area type="monotone" dataKey="ganhos" stackId="2" stroke="#10b981" fill="#10b981" fillOpacity={0.8} name="Ganhos" />
                <Area type="monotone" dataKey="perdidos" stackId="3" stroke="#ef4444" fill="#ef4444" fillOpacity={0.6} name="Perdidos" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Performance dos Vendedores */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl text-slate-200">
            <Award className="w-5 h-5 text-teal-400" />
            Top Vendedores
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={vendedorPerformance}>
              <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
              <XAxis 
                dataKey="nome" 
                stroke="#94a3b8" 
                tick={{ fill: '#94a3b8', fontSize: 12 }} 
                angle={-45} 
                textAnchor="end" 
                height={100} 
              />
              <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8' }} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1e293b', 
                  border: '1px solid #475569',
                  borderRadius: '0.5rem',
                  color: '#e2e8f0'
                }}
                formatter={(value: any, name: string) => {
                  if (name === 'valorGerado') return [`R$ ${value.toLocaleString()}`, 'Receita'];
                  if (name === 'taxa') return [`${value.toFixed(1)}%`, 'Taxa Conversão'];
                  return [value, name];
                }}
              />
              <Legend wrapperStyle={{ color: '#94a3b8' }} />
              <Bar dataKey="ganhos" fill="#10b981" name="Leads Ganhos" radius={[8, 8, 0, 0]} />
              <Bar dataKey="leads" fill="#0ea5e9" name="Total Leads" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Origem dos Leads + Motivos de Perda */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl text-slate-200">
              <Users className="w-5 h-5 text-teal-400" />
              Origem dos Leads
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={origemData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }: any) => 
                    `${name}: ${(percent * 100).toFixed(0)}%`
                  }
                  outerRadius={100}
                  dataKey="value"
                  isAnimationActive={false}
                >
                  {origemData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
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
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-rose-400" />
              <CardTitle className="text-xl text-slate-200">Motivos de Perda</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {motivoPerdaData.length > 0 ? (
                motivoPerdaData.map((motivo, index) => (
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
                ))
              ) : (
                <div className="py-8 text-center text-slate-500">
                  <p className="text-sm">Nenhuma perda registrada 🎉</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Card de Insights */}
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
                <p>• {kpis.leadsAbertos} leads ativos no pipeline com potencial de <span className="font-semibold text-teal-400">R$ {(kpis.valorTotalPipeline / 1000).toFixed(0)}K</span></p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
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

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm text-slate-400">{label}</p>
            <div className="flex items-baseline gap-2 mt-2">
              <p className="text-3xl font-bold text-slate-100">{value}</p>
              {trend && (
                <span className={`flex items-center text-sm ${trend === 'up' ? 'text-green-400' : 'text-rose-400'}`}>
                  {trend === 'up' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                </span>
              )}
            </div>
            {subtitle && (
              <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
            )}
          </div>
          <div className={`p-3 rounded-lg bg-linear-to-br ${colorClasses[color]}`}>
            <div className="text-white">
              {icon}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
