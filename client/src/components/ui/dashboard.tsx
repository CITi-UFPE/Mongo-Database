import { useState, type ReactNode } from "react";
import {
  Users,
  TrendingUp,
  DollarSign,
  Receipt,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import UserHeader from "../UserHeader";
import { MetricCard } from "./metric-card";
import { ProgressGoal } from "./progress-goal";
import { LeadQualityCard } from "./lead-quality-card";
import { RealisticForecast } from "./realistic-forecast";
import { StageTimeMetrics } from "./stage-time-metrics";
import { LostLeadsBreakdown } from "./lost-leads-breakdown";
import { DateFilter } from "./date-filter";
import type { DateRangeSelection, DateRangeValue } from "./date-filter";
import { FunnelChart } from "./funnel-chart";
import { LeadSourcesChart } from "./lead-sources-chart";
import { InsightsCard } from "./insights-card";
import type { AnalyticsPayload, AnalyticsFunnelItem } from "../../services/analytics";

interface DashboardProps {
  data: AnalyticsPayload;
  onDateFilterChange?: (range: DateRangeValue, dates?: DateRangeSelection) => void;
  headerAction?: ReactNode;
  headerStatusMessage?: string | null;
}

const FUNNEL_COLORS = [
  "hsl(199, 89%, 48%)",
  "hsl(174, 72%, 56%)",
  "hsl(160, 72%, 50%)",
  "hsl(45, 93%, 58%)",
  "hsl(262, 83%, 58%)",
];

const TOTAL_PAGES = 2;

const Dashboard = ({ data, onDateFilterChange, headerAction, headerStatusMessage }: DashboardProps) => {
  const [analysisPage, setAnalysisPage] = useState(1);

  const totalLeads = data.total_leads;
  const valorPipeline = data.valor_pipeline;
  const faturamentoTotal = data.previsao_faturamento.pipeline_total;
  const funnelStages = data.funil.map((item: AnalyticsFunnelItem, index: number) => ({
    name: item.fase,
    count: item.count,
    value: item.total_valor,
    color: FUNNEL_COLORS[index % FUNNEL_COLORS.length],
  }));

  const naoQualificados = data.nao_qualificados;
  const leadQualityData = {
    total: totalLeads,
    qualificados: data.qualificados,
    naoQualificados,
    outros: 0,
  };

  const stageTimeData = data.funil.slice(0, 4).map((item, index) => {
    const ratio = totalLeads > 0 ? item.count / totalLeads : 0;
    const avgDays = Math.max(2, Math.round(ratio * 30) + index + 1);
    const maxDays = Math.max(avgDays + 3, Math.round(avgDays * 1.6));
    return {
      name: item.fase,
      avgDays,
      leads: item.count,
      maxDays,
    };
  });

  const leadSourcesData = data.origem_leads
    .filter((item) => item.quantidade > 0)
    .map((item, index) => ({
      name: item.origem,
      value: item.quantidade,
      color: FUNNEL_COLORS[index % FUNNEL_COLORS.length],
    }));

  const serviceDistributionData = data.distribuicao_servicos
    .filter((item) => item.quantidade > 0)
    .map((item, index) => ({
      name: item.servico,
      value: item.quantidade,
      color: FUNNEL_COLORS[index % FUNNEL_COLORS.length],
    }));

  const lossPhases = data.funil.filter((item) => /(perd|desqual|lost|cancel)/i.test(item.fase));
  const totalLost = data.total_perdidos;
  const totalLostValue = data.valor_perdido;
  const icons: Array<"price" | "time" | "competitor" | "other"> = ["price", "time", "competitor", "other"];
  const lossReasons = (lossPhases.length ? lossPhases : [{ fase: "Sem perdas mapeadas", count: 0, total_valor: 0 }]).map((item, index) => ({
    reason: item.fase,
    count: item.count,
    percentage: totalLost > 0 ? Math.round((item.count / totalLost) * 100) : 0,
    icon: icons[index % icons.length],
  }));

  const insights = [
    { type: "info" as const, message: `Taxa de conversão atual: ${data.taxa_conversao.toFixed(1)}%` },
    {
      type: "success" as const,
      message: `Ticket médio: ${new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(data.ticket_medio)}`,
    },
    {
      type: "warning" as const,
      message: `${totalLeads.toLocaleString("pt-BR")} leads no funil com potencial de ${new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(valorPipeline)}`,
    },
  ];

  return (
    <div className="bg-gradient-to-br from-[#0B1120] via-[#0D1929] to-[#0F172A] text-slate-100 min-h-screen">
      <div className="sticky top-0 z-40 border-b border-slate-700/30 bg-slate-900/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-300 via-cyan-300 to-blue-400">Dashboard CRM</h1>
              <p className="text-sm text-slate-300">
                Visão gerencial de vendas e leads.
              </p>
            </div>
            <div className="flex flex-col items-stretch gap-2 sm:items-end">
              <div className="flex flex-wrap items-center justify-end gap-2">
                <DateFilter onChange={onDateFilterChange} />
                {headerAction ? headerAction : null}
              </div>
              {headerStatusMessage ? <p className="text-xs text-slate-300 sm:text-right">{headerStatusMessage}</p> : null}
            </div>
          </div>

          <div className="mt-4">
            <UserHeader variant="full" />
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8 space-y-6">
        <div className="flex justify-end gap-3">
           <button className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white hover:from-blue-500 hover:to-cyan-500 shadow-lg transition-all duration-300 px-4 py-2 rounded-md">
             Análise de Clusters (IA)
           </button>
           <button className="bg-gradient-to-r from-cyan-600 to-teal-600 text-white hover:from-cyan-500 hover:to-teal-500 shadow-lg transition-all duration-300 px-4 py-2 rounded-md">
             Previsão de Vendas (IA)
           </button>
        </div>

        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Leads no Funil"
            value={totalLeads.toLocaleString("pt-BR")}
            subtitle="Dados da API"
            icon={<Users className="w-5 h-5" />}
            variant="highlight"
            className="border-blue-400/50 bg-gradient-to-br from-blue-600/20 to-cyan-600/10"
          />
          <MetricCard
            title="Taxa de Conversão"
            value={`${data.taxa_conversao.toFixed(1)}%`}
            subtitle="Dados da API"
            icon={<TrendingUp className="w-5 h-5" />}
            variant="primary"
            className="hover:border-cyan-400/40 hover:shadow-lg hover:shadow-cyan-500/20"
          />
          <MetricCard
            title="Faturamento Total"
            value={new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(faturamentoTotal)}
            subtitle="Dados da API"
            icon={<DollarSign className="w-5 h-5" />}
            variant="highlight"
            className="hover:border-emerald-400/40 hover:shadow-lg hover:shadow-emerald-500/20"
          />
          <MetricCard
            title="Ticket Médio"
            value={new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(data.ticket_medio)}
            subtitle={`${data.qualificados} qualificados`}
            icon={<Receipt className="w-5 h-5" />}
            variant="primary"
            className="hover:border-orange-400/40 hover:shadow-lg hover:shadow-orange-500/20"
          />
        </section>

        <InsightsCard insights={insights} />

        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold bg-gradient-to-r from-blue-300 to-cyan-300 bg-clip-text text-transparent">Análises Detalhadas</h2>
          <div className="flex items-center gap-2">
            <button
              className="h-8 w-8 border-blue-500/30 hover:bg-blue-500/10 hover:border-blue-400/50 text-blue-300 transition-all duration-300"
              onClick={() => setAnalysisPage((p) => Math.max(1, p - 1))}
              disabled={analysisPage === 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-medium text-slate-300 px-2">
              {analysisPage} / {TOTAL_PAGES}
            </span>
            <button
              className="h-8 w-8 border-cyan-500/30 hover:bg-cyan-500/10 hover:border-cyan-400/50 text-cyan-300 transition-all duration-300"
              onClick={() => setAnalysisPage((p) => Math.min(TOTAL_PAGES, p + 1))}
              disabled={analysisPage === TOTAL_PAGES}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {analysisPage === 1 && (
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-cyan-600/15 to-teal-600/10 border border-cyan-500/30 rounded-2xl p-5 backdrop-blur-sm">
              <h3 className="text-sm font-semibold text-cyan-200 mb-4">📈 Analytics de Vendas</h3>
              <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <ProgressGoal
                  current={faturamentoTotal}
                  goal={data.progresso_meta.meta}
                  label="Faturamento Total"
                />
                <LeadQualityCard data={leadQualityData} />
              </section>
              <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
                <RealisticForecast
                  pipelineValue={valorPipeline}
                  conversionRate={data.taxa_conversao}
                />
                <StageTimeMetrics stages={stageTimeData} />
              </section>
            </div>
          </div>
        )}

        {analysisPage === 2 && (
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-blue-600/15 to-cyan-600/10 border border-blue-500/30 rounded-2xl p-5 backdrop-blur-sm">
              <h3 className="text-sm font-semibold text-blue-200 mb-4">✦ Análise de Clusters (IA)</h3>
              <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <FunnelChart stages={funnelStages} />
                <LeadSourcesChart data={leadSourcesData} title="Origem dos Leads" />
              </section>
              <section className="grid grid-cols-1 gap-4 mt-4">
                <LeadSourcesChart data={serviceDistributionData} title="Distribuição por Tipo de Serviço" />
              </section>
            </div>
            <LostLeadsBreakdown
              total={totalLost}
              reasons={lossReasons}
              totalValue={totalLostValue}
            />
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
