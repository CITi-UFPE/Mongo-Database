// src/components/crm/DashboardOverview.tsx

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  TrendingUp, 
  DollarSign, 
  Target, 
  Users, 
  Activity,
  Calendar,
  Award
} from 'lucide-react';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

type Lead = {
  _id: string;
  status: 'Aberto' | 'Ganho' | 'Perdido';
  valor_estimado: number;
  id_fase_atual: { nome_fase: string; ordem: number };
  id_origem_lead: { canal: string };
  createdAt: string;
};

type Vendedor = {
  _id: string;
  id_membro: { nome: string };
};

type Meta = {
  id_vendedor: string;
  valor_objetivo: number;
  periodo: string;
};

type Interacao = {
  id_vendedor: string;
  id_lead: string;
  data_realizacao: string;
};

type DashboardProps = {
  leads: Lead[];
  vendedores: Vendedor[];
  metas: Meta[];
  interacoes: Interacao[];
};

const COLORS = ['#0ea5e9', '#14b8a6', '#84cc16', '#f59e0b', '#ef4444', '#8b5cf6'];

export function DashboardOverview({ leads, vendedores, metas, interacoes }: DashboardProps) {
  const analytics = useMemo(() => {
    // KPIs Principais
    const totalLeads = leads.length;
    const leadsAbertos = leads.filter(l => l.status === 'Aberto').length;
    const leadsGanhos = leads.filter(l => l.status === 'Ganho').length;
    const leadsPerdidos = leads.filter(l => l.status === 'Perdido').length;
    
    const taxaConversao = totalLeads > 0 ? ((leadsGanhos / (leadsGanhos + leadsPerdidos)) * 100) : 0;
    
    const valorTotalGanho = leads
      .filter(l => l.status === 'Ganho')
      .reduce((sum, l) => sum + (l.valor_estimado || 0), 0);

    // Atividades da semana
    const umaSemanaAtras = new Date();
    umaSemanaAtras.setDate(umaSemanaAtras.getDate() - 7);
    const atividadesSemana = interacoes.filter(
      i => new Date(i.data_realizacao) >= umaSemanaAtras
    ).length;

    // Funil de conversão (por fase)
    const faseCount: Record<string, { count: number; ordem: number }> = {};
    leads.forEach(lead => {
      const fase = lead.id_fase_atual?.nome_fase || 'Sem Fase';
      const ordem = lead.id_fase_atual?.ordem || 999;
      if (!faseCount[fase]) {
        faseCount[fase] = { count: 0, ordem };
      }
      faseCount[fase].count++;
    });

    const funnelData = Object.entries(faseCount)
      .map(([fase, data]) => ({ fase, leads: data.count, ordem: data.ordem }))
      .sort((a, b) => a.ordem - b.ordem);

    // Performance por vendedor
    const vendedorPerformance = vendedores.map(vendedor => {
      const vendedorId = vendedor._id.toString();
      
      // Busca interações do vendedor
      const leadsDoVendedor = new Set(
        interacoes
          .filter(i => i.id_vendedor?.toString() === vendedorId)
          .map(i => i.id_lead?.toString())
      );

      // Calcula valor ganho
      const valorGanho = leads
        .filter(l => leadsDoVendedor.has(l._id.toString()) && l.status === 'Ganho')
        .reduce((sum, l) => sum + (l.valor_estimado || 0), 0);

      // Busca meta do vendedor
      const metaVendedor = metas.find(m => m.id_vendedor?.toString() === vendedorId);

      return {
        nome: vendedor.id_membro?.nome || 'Desconhecido',
        valorGanho,
        meta: metaVendedor?.valor_objetivo || 0,
        percentual: metaVendedor ? (valorGanho / metaVendedor.valor_objetivo) * 100 : 0
      };
    }).sort((a, b) => b.valorGanho - a.valorGanho);

    // Origem dos leads
    const origemCount: Record<string, number> = {};
    leads.forEach(lead => {
      const origem = lead.id_origem_lead?.canal || 'Desconhecido';
      origemCount[origem] = (origemCount[origem] || 0) + 1;
    });

    const origemData = Object.entries(origemCount)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    return {
      kpis: {
        totalLeads,
        leadsAbertos,
        taxaConversao,
        valorTotalGanho,
        atividadesSemana
      },
      funnelData,
      vendedorPerformance,
      origemData
    };
  }, [leads, vendedores, metas, interacoes]);

  return (
    <div className="space-y-6">
      {/* KPIs Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <KPICard
          icon={<Users className="w-5 h-5" />}
          label="Leads Totais"
          value={analytics.kpis.totalLeads}
          color="blue"
        />
        <KPICard
          icon={<Target className="w-5 h-5" />}
          label="Leads Ativos"
          value={analytics.kpis.leadsAbertos}
          color="teal"
        />
        <KPICard
          icon={<TrendingUp className="w-5 h-5" />}
          label="Taxa de Conversão"
          value={`${analytics.kpis.taxaConversao.toFixed(1)}%`}
          color="green"
        />
        <KPICard
          icon={<DollarSign className="w-5 h-5" />}
          label="Valor Total Ganho"
          value={`R$ ${(analytics.kpis.valorTotalGanho / 1000).toFixed(0)}K`}
          color="purple"
        />
        <KPICard
          icon={<Activity className="w-5 h-5" />}
          label="Atividades (7 dias)"
          value={analytics.kpis.atividadesSemana}
          color="orange"
        />
      </div>

      {/* Funil de Conversão + Origem dos Leads */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Funil de Conversão */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl text-slate-200">
              <Target className="w-5 h-5 text-teal-400" />
              Funil de Conversão
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.funnelData} layout="vertical">
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
                  {analytics.funnelData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Origem dos Leads */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl text-slate-200">
              <Calendar className="w-5 h-5 text-teal-400" />
              Origem dos Leads
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analytics.origemData}
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
                  {analytics.origemData.map((_, index) => (
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
      </div>

      {/* Performance por Vendedor */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl text-slate-200">
            <Award className="w-5 h-5 text-teal-400" />
            Performance por Vendedor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={analytics.vendedorPerformance.slice(0, 6)}>
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
                formatter={(value: any) => `R$ ${value.toLocaleString()}`}
              />
              <Legend wrapperStyle={{ color: '#94a3b8' }} />
              <Bar dataKey="meta" fill="#64748b" name="Meta" radius={[8, 8, 0, 0]} />
              <Bar dataKey="valorGanho" fill="#10b981" name="Atingido" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

function KPICard({ 
  icon, 
  label, 
  value, 
  color 
}: { 
  icon: React.ReactNode; 
  label: string; 
  value: string | number; 
  color: 'blue' | 'teal' | 'green' | 'purple' | 'orange';
}) {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600',
    teal: 'from-teal-500 to-teal-600',
    green: 'from-green-500 to-green-600',
    purple: 'from-purple-500 to-purple-600',
    orange: 'from-orange-500 to-orange-600',
  };

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-xs text-slate-400">{label}</p>
            <p className="mt-2 text-2xl font-bold text-slate-100">{value}</p>
          </div>
          <div className={`p-2 rounded-lg bg-gradient-to-br ${colorClasses[color]}`}>
            <div className="text-white">
              {icon}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
