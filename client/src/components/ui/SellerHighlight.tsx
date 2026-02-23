import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Crown, Zap, TrendingUp } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';

interface SellerPerformanceData {
  id: string;
  nome: string;
  total_leads: number;
  leads_ganhos: number;
  leads_perdidos: number;
  valor_total: number;
  valor_ganho: number;
  taxa_conversao: number;
}

interface SellerHighlightProps {
  seller_performance: SellerPerformanceData[];
}

interface RankedSeller extends SellerPerformanceData {
  rank: number;
  color: string;
  momentum: number; // variação percentual
  badge: 'top' | 'rising' | 'stable' | 'declining';
}

export const SellerHighlight: React.FC<SellerHighlightProps> = ({ seller_performance }) => {
  const rankedSellers = React.useMemo(() => {
    const sorted = [...seller_performance].sort(
      (a, b) => b.valor_ganho - a.valor_ganho
    );

    const RANK_COLORS = [
      '#fbbf24', // Gold
      '#d1d5db', // Silver
      '#cd7f32', // Bronze
      '#6366f1', // Indigo
      '#8b5cf6', // Purple
      '#06b6d4', // Cyan
      '#3b82f6', // Blue
      '#10b981', // Green
      '#14b8a6', // Teal
      '#f59e0b'  // Amber
    ];

    return sorted.slice(0, 10).map((seller, idx): RankedSeller => {
      // Simular momentum com base no número de leads e taxa
      const momentum = (seller.taxa_conversao - 20) * (seller.total_leads / 50);
      
      let badge: 'top' | 'rising' | 'stable' | 'declining' = 'stable';
      if (idx === 0) badge = 'top';
      else if (momentum > 15) badge = 'rising';
      else if (momentum < -15) badge = 'declining';

      return {
        ...seller,
        rank: idx + 1,
        color: RANK_COLORS[idx % RANK_COLORS.length],
        momentum,
        badge
      };
    });
  }, [seller_performance]);

  const topSeller = rankedSellers[0];

  const getBadgeIcon = (badge: string) => {
    switch (badge) {
      case 'top':
        return <Crown className="w-4 h-4" />;
      case 'rising':
        return <Zap className="w-4 h-4" />;
      default:
        return <TrendingUp className="w-4 h-4" />;
    }
  };

  const getBadgeColor = (badge: string) => {
    switch (badge) {
      case 'top':
        return 'from-yellow-500/20 to-yellow-600/10 border-yellow-500/30 text-yellow-400';
      case 'rising':
        return 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/30 text-emerald-400';
      case 'declining':
        return 'from-red-500/20 to-red-600/10 border-red-500/30 text-red-400';
      default:
        return 'from-blue-500/20 to-blue-600/10 border-blue-500/30 text-blue-400';
    }
  };

  const getBadgeLabel = (badge: string) => {
    switch (badge) {
      case 'top':
        return 'Top Performer';
      case 'rising':
        return 'Em Ascensão';
      case 'declining':
        return 'Em Declínio';
      default:
        return 'Estável';
    }
  };

  // Dados para chart de ranking
  const chartData = rankedSellers.slice(0, 5).map(s => ({
    nome: s.nome.split(' ')[0],
    valor: s.valor_ganho / 1000,
    conversao: s.taxa_conversao,
    fullName: s.nome
  }));

  return (
    <div className="space-y-6">
      {/* Card Destaque do Top Performer */}
      <Card className="relative overflow-hidden bg-gradient-to-br from-yellow-950/40 via-slate-800 to-slate-900 border border-yellow-500/40 shadow-2xl shadow-yellow-500/20">
        <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-yellow-500/10 to-transparent rounded-full blur-3xl"></div>
        
        <CardContent className="p-8 relative z-10">
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <Crown className="w-6 h-6 text-yellow-500" />
                <span className="text-sm font-bold text-yellow-400 uppercase tracking-widest">Destacado</span>
              </div>
              <h2 className="text-4xl font-bold text-slate-100 mb-1">{topSeller.nome}</h2>
              <p className="text-sm text-slate-400">Melhor Performance do Período</p>
            </div>
            <div className={`px-4 py-2 rounded-lg bg-gradient-to-r ${getBadgeColor(topSeller.badge)} border flex items-center gap-2`}>
              {getBadgeIcon(topSeller.badge)}
              <span className="text-xs font-bold uppercase">{getBadgeLabel(topSeller.badge)}</span>
            </div>
          </div>

          {/* Métricas Principais */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 pb-6 border-b border-yellow-500/20">
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Valor Ganho</p>
              <p className="text-3xl font-bold text-yellow-400">R$ {(topSeller.valor_ganho / 1000).toFixed(0)}K</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Taxa Conversão</p>
              <p className="text-3xl font-bold text-blue-400">{topSeller.taxa_conversao.toFixed(1)}%</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Leads Ganhos</p>
              <p className="text-3xl font-bold text-green-400">{topSeller.leads_ganhos}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Total de Leads</p>
              <p className="text-3xl font-bold text-purple-400">{topSeller.total_leads}</p>
            </div>
          </div>

          {/* Análise Comparativa */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-slate-700/30 border border-slate-600/50">
              <p className="text-xs text-slate-400 mb-2">POSIÇÃO NO RANKING</p>
              <p className="text-4xl font-bold text-yellow-400">#1</p>
              <p className="text-xs text-slate-400 mt-2">De {seller_performance.length} vendedores</p>
            </div>
            <div className="p-4 rounded-lg bg-slate-700/30 border border-slate-600/50">
              <p className="text-xs text-slate-400 mb-2">ACIMA DA MÉDIA</p>
              <p className="text-4xl font-bold text-green-400">
                +{Math.round(topSeller.valor_ganho / (seller_performance.reduce((a, v) => a + v.valor_ganho, 0) / seller_performance.length) * 100) - 100}%
              </p>
              <p className="text-xs text-slate-400 mt-2">Em relação à média</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top 5 Ranking */}
      <Card className="bg-gradient-to-br from-slate-800 via-slate-800 to-slate-900 border border-purple-500/20 shadow-2xl">
        <CardHeader>
          <CardTitle className="text-lg">Top 5 Vendedores</CardTitle>
          <p className="text-xs text-slate-400 mt-2">Ranking por valor de vendas fechadas</p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
              <XAxis dataKey="nome" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" label={{ value: 'Faturamento (R$ mil)', angle: -90, position: 'insideLeft' }} />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    const seller = rankedSellers.find(s => s.nome === data.fullName);
                    return (
                      <div className="bg-slate-900 border border-slate-700 p-3 rounded-lg text-slate-200">
                        <p className="font-bold">{data.fullName}</p>
                        <p className="text-sm mt-1">Faturamento: <span className="text-emerald-400 font-bold">R$ {data.valor.toFixed(0)}K</span></p>
                        <p className="text-sm">Conversão: <span className="text-blue-400 font-bold">{data.conversao.toFixed(1)}%</span></p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="valor" radius={[8, 8, 0, 0]} fill="#8b5cf6" />
            </BarChart>
          </ResponsiveContainer>

          {/* List View */}
          <div className="mt-8 space-y-3">
            {rankedSellers.slice(0, 5).map((seller, idx) => (
              <div
                key={seller.id}
                className="flex items-center justify-between p-3 rounded-lg border transition-all duration-300 hover:border-slate-500"
                style={{ borderColor: `${seller.color}40`, backgroundColor: `${seller.color}05` }}
              >
                <div className="flex items-center gap-4 flex-1">
                  <div
                    className="flex items-center justify-center w-10 h-10 rounded-full font-bold text-white"
                    style={{ backgroundColor: seller.color }}
                  >
                    #{seller.rank}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-slate-100">{seller.nome}</p>
                    <p className="text-xs text-slate-400">
                      {seller.leads_ganhos} ganhos de {seller.total_leads} leads
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-slate-100">R$ {(seller.valor_ganho / 1000).toFixed(0)}K</p>
                  <p className="text-xs text-slate-400">{seller.taxa_conversao.toFixed(1)}% conv.</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
