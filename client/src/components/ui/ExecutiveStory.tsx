import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Brain, Zap } from 'lucide-react';

interface ExecutiveStoryProps {
  kpis: {
    totalLeads: number;
    leadsAbertos: number;
    leadsGanhos: number;
    leadsPerdidos: number;
    taxaConversao: number;
    taxaPerda: number;
    valorPipeline: number;
    valorGanho: number;
    ticketMedio: number;
  };
  funnelData: Array<{
    name: string;
    leads: number;
    valor: number;
  }>;
}

interface StoryElement {
  title: string;
  narrative: string;
  metric: string;
  value: string | number;
  trend?: 'positive' | 'negative' | 'neutral';
  icon: React.ReactNode;
  color: string;
  recommendation: string;
}

export const ExecutiveStory: React.FC<ExecutiveStoryProps> = ({ kpis, funnelData }) => {
  const story = React.useMemo((): StoryElement[] => {
    const elements: StoryElement[] = [];

    // Narrativa 1: Saúde do Pipeline
    const pipelineHealth = (kpis.leadsAbertos / kpis.totalLeads) * 100;
    elements.push({
      title: 'Saúde do Pipeline',
      narrative: `Você tem ${kpis.leadsAbertos} leads ativos representando ${pipelineHealth.toFixed(0)}% do seu pipeline total. Com ${kpis.leadsGanhos} vitórias e apenas ${kpis.leadsPerdidos} perdas, seu funil está ${pipelineHealth > 40 ? 'bem abastecido' : 'requerendo atenção'}`,
      metric: 'Leads Ativos',
      value: kpis.leadsAbertos,
      trend: pipelineHealth > 40 ? 'positive' : 'negative',
      icon: <TrendingUp className="w-6 h-6" />,
      color: 'from-blue-500 to-cyan-500',
      recommendation: pipelineHealth > 40
        ? 'Mantenha o esforço de prospecção'
        : 'Intensifique a geração de novos leads imediatamente'
    });

    // Narrativa 2: Taxa de Conversão
    const conversionTrend = kpis.taxaConversao > 25 ? 'positive' : 'negative';
    elements.push({
      title: 'Eficiência de Vendas',
      narrative: `Sua taxa de conversão está em ${kpis.taxaConversao.toFixed(1)}%. Cada 100 leads geram ${Math.round(kpis.taxaConversao)} vendas. Isso significa que ${Math.round(100 - kpis.taxaConversao)} leads requerem melhoria no processo ou qualificação`,
      metric: 'Taxa de Conversão',
      value: `${kpis.taxaConversao.toFixed(1)}%`,
      trend: conversionTrend,
      icon: <Brain className="w-6 h-6" />,
      color: 'from-purple-500 to-pink-500',
      recommendation: kpis.taxaConversao > 25
        ? 'Analise o que está funcionando e replique'
        : 'Revise o processo de qualificação de leads'
    });

    // Narrativa 3: Impacto Financeiro
    const avgValue = kpis.ticketMedio;
    const lostRevenue = (kpis.leadsPerdidos * kpis.ticketMedio);
    elements.push({
      title: 'Impacto no Faturamento',
      narrative: `Você faturou R$ ${(kpis.valorGanho / 1000).toFixed(0)}K até agora. Porém, os ${kpis.leadsPerdidos} leads perdidos representam uma oportunidade de R$ ${(lostRevenue / 1000).toFixed(0)}K não realizada`,
      metric: 'Receita Realizada vs Potencial',
      value: `${(kpis.valorGanho / (kpis.valorGanho + lostRevenue) * 100).toFixed(0)}%`,
      trend: 'neutral',
      icon: <Zap className="w-6 h-6" />,
      color: 'from-green-500 to-emerald-500',
      recommendation: `Recuperar apenas ${Math.round(kpis.leadsPerdidos * 0.2)} leads perdidos adicionaria R$ ${(lostRevenue * 0.2 / 1000).toFixed(0)}K`
    });

    // Narrativa 4: Dinâmica de Perdas
    elements.push({
      title: 'Dinâmica de Perdas',
      narrative: `${kpis.taxaPerda.toFixed(1)}% dos seus leads são perdidos. Com ${kpis.leadsPerdidos} perdas, identificar as razões principais e implementar ações corretivas é crítico para crescer`,
      metric: 'Taxa de Perda',
      value: `${kpis.taxaPerda.toFixed(1)}%`,
      trend: kpis.taxaPerda < 30 ? 'positive' : 'negative',
      icon: <TrendingUp className="w-6 h-6" />,
      color: 'from-red-500 to-orange-500',
      recommendation: kpis.taxaPerda < 30
        ? 'Continue monitorando'
        : 'Implemente programa de retenção urgentemente'
    });

    return elements;
  }, [kpis]);

  const getTrendColor = (trend?: string) => {
    switch (trend) {
      case 'positive':
        return 'text-green-400';
      case 'negative':
        return 'text-red-400';
      default:
        return 'text-blue-400';
    }
  };

  const getTrendBg = (trend?: string) => {
    switch (trend) {
      case 'positive':
        return 'from-green-950/20 to-green-950/10 border-green-500/30';
      case 'negative':
        return 'from-red-950/20 to-red-950/10 border-red-500/30';
      default:
        return 'from-blue-950/20 to-blue-950/10 border-blue-500/30';
    }
  };

  return (
    <div className="space-y-6">
      {/* Executive Summary */}
      <Card className="bg-gradient-to-r from-slate-800 via-slate-800 to-slate-900 border border-slate-700 shadow-2xl">
        <CardHeader>
          <CardTitle className="text-2xl">Narrativa Executiva</CardTitle>
          <p className="text-sm text-slate-400 mt-2">Leitura estratégica do seu CRM para decisões baseadas em dados</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Main Story */}
            <div className="p-6 rounded-lg bg-gradient-to-r from-indigo-950/30 to-purple-950/30 border border-indigo-500/30">
              <p className="text-lg text-slate-100 leading-relaxed">
                <span className="font-bold text-indigo-400">Seu pipeline tem </span>
                <span className="font-bold text-blue-400">{kpis.totalLeads} leads</span> em movimento.
                Com uma taxa de conversão de <span className="font-bold text-green-400">{kpis.taxaConversao.toFixed(1)}%</span> e
                <span className="font-bold text-slate-200"> R$ {(kpis.valorGanho / 1000).toFixed(0)}K</span> já faturado,
                você está em uma <span className="font-bold text-slate-100">posição sólida</span>.
              </p>
              <p className="text-sm text-slate-400 mt-4">
                O foco agora deve ser em <span className="text-amber-400 font-semibold">recuperar leads perdidos</span> e
                <span className="text-emerald-400 font-semibold"> acelerar o ciclo de vendas</span>.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Story Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {story.map((element, idx) => (
          <Card
            key={idx}
            className={`bg-gradient-to-br ${getTrendBg(element.trend)} border shadow-lg hover:shadow-2xl transition-all duration-300`}
          >
            <CardContent className="p-6">
              <div className="flex items-start gap-4 mb-6">
                <div className={`p-3 rounded-lg bg-gradient-to-br ${element.color} text-white`}>
                  {element.icon}
                </div>
                <div>
                  <h3 className="font-bold text-slate-100 text-lg">{element.title}</h3>
                  <p className={`text-sm ${getTrendColor(element.trend)} font-semibold mt-1`}>
                    {element.trend === 'positive' ? '✓ Positivo' : element.trend === 'negative' ? '⚠ Crítico' : '→ Neutro'}
                  </p>
                </div>
              </div>

              {/* Narrative Text */}
              <p className="text-sm leading-relaxed text-slate-300 mb-6 p-4 rounded-lg bg-slate-800/30 border border-slate-700/30">
                {element.narrative}
              </p>

              {/* Metric Display */}
              <div className="mb-6 p-4 rounded-lg bg-gradient-to-r from-slate-900 to-slate-800 border border-slate-600/50">
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">{element.metric}</p>
                <p className={`text-3xl font-bold ${getTrendColor(element.trend)}`}>
                  {element.value}
                </p>
              </div>

              {/* Recommendation */}
              <div className="p-4 rounded-lg bg-amber-950/30 border border-amber-500/30">
                <p className="text-xs text-amber-200 uppercase tracking-widest font-bold mb-2">Recomendação</p>
                <p className="text-sm text-amber-100">{element.recommendation}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Strategic Insights */}
      <Card className="bg-gradient-to-br from-slate-800 via-slate-800 to-slate-900 border border-slate-700 shadow-2xl">
        <CardHeader>
          <CardTitle className="text-lg">Insights Estratégicos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Insight 1 */}
            <div className="p-4 rounded-lg bg-gradient-to-br from-blue-950/30 to-cyan-950/30 border border-blue-500/20">
              <p className="text-xs text-blue-300 uppercase tracking-wider mb-2">Oportunidade #1</p>
              <p className="text-sm font-semibold text-slate-100 mb-2">Aceleração de Ciclo</p>
              <p className="text-xs text-slate-400">
                Reduzir o tempo médio de {Math.round(kpis.leadsAbertos / (kpis.leadsGanhos + kpis.leadsPerdidos) * 30)} dias por 25% poderia gerar +{Math.round(kpis.leadsGanhos * 0.25)} vendas
              </p>
            </div>

            {/* Insight 2 */}
            <div className="p-4 rounded-lg bg-gradient-to-br from-green-950/30 to-emerald-950/30 border border-green-500/20">
              <p className="text-xs text-green-300 uppercase tracking-wider mb-2">Oportunidade #2</p>
              <p className="text-sm font-semibold text-slate-100 mb-2">Qualificação de Leads</p>
              <p className="text-xs text-slate-400">
                {Math.round((kpis.leadsPerdidos / kpis.totalLeads) * 100)}% de leads não qualificados. Filtro melhor = {Math.round(kpis.leadsGanhos * 0.2)} vendas adicionais
              </p>
            </div>

            {/* Insight 3 */}
            <div className="p-4 rounded-lg bg-gradient-to-br from-purple-950/30 to-pink-950/30 border border-purple-500/20">
              <p className="text-xs text-purple-300 uppercase tracking-wider mb-2">Oportunidade #3</p>
              <p className="text-sm font-semibold text-slate-100 mb-2">Valor do Ticket</p>
              <p className="text-xs text-slate-400">
                Aumentar ticket médio em 20% = R$ {(kpis.ticketMedio * kpis.leadsGanhos * 0.2 / 1000).toFixed(0)}K adicionais com mesmo volume
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
