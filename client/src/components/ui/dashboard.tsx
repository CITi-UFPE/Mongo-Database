import { useState } from "react";
import {
  Users,
  TrendingUp,
  DollarSign,
  Receipt,
  Building2,
  User,
  Briefcase,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { MetricCard } from "./metric-card";
import { ProgressGoal } from "./progress-goal";
import { LeadQualityCard } from "./lead-quality-card";
import { RealisticForecast } from "./realistic-forecast";
import { StageTimeMetrics } from "./stage-time-metrics";
import { LostLeadsBreakdown } from "./lost-leads-breakdown";
import { DateFilter } from "./date-filter";
import { FunnelChart } from "./funnel-chart";
import { LeadSourcesChart } from "./lead-sources-chart";
import { InsightsCard } from "./insights-card";
import { Button } from "@/components/ui/button";

const mockData = {
  totalLeads: 1250,
  qualifiedLeads: 487,
  unqualifiedLeads: 398,
  conversionRate: 25.6,
  pipelineValue: 450000,
  ticketMedio: 563,
  closedValue: 385000,
  monthlyGoal: 500000,
  lostLeads: 180,
  lostValue: 245000,
};

const stageTimeData = [
  { name: "Qualificação", avgDays: 4, leads: 156, maxDays: 7 },
  { name: "Diagnóstico", avgDays: 12, leads: 89, maxDays: 14 },
  { name: "Proposta", avgDays: 8, leads: 67, maxDays: 10 },
  { name: "Negociação", avgDays: 18, leads: 45, maxDays: 21 },
];

const lostReasons = [
  { reason: "Preço alto", count: 50, percentage: 32, icon: "price" as const },
  { reason: "Concorrência", count: 30, percentage: 25, icon: "competitor" as const },
  { reason: "Sem budget", count: 20, percentage: 21, icon: "price" as const },
];

const funnelStages = [
  { name: "Novo", count: 480, value: 180000, color: "hsl(199, 89%, 48%)" },
  { name: "Qualificação", count: 300, value: 128000, color: "hsl(174, 72%, 56%)" },
  { name: "Proposta", count: 150, value: 95000, color: "hsl(160, 72%, 50%)" },
  { name: "Negociação", count: 80, value: 47000, color: "hsl(45, 93%, 58%)" },
];

const leadSources = [
  { name: "Google Ads", value: 43, color: "hsl(174, 72%, 56%)" },
  { name: "Instagram", value: 19, color: "hsl(142, 71%, 45%)" },
  { name: "LinkedIn", value: 10, color: "hsl(45, 93%, 58%)" },
  { name: "Indicação", value: 29, color: "hsl(199, 89%, 48%)" },
];

const insights = [
  { type: "info" as const, message: "Taxa de conversão atual: 25.6%" },
  { type: "success" as const, message: "Ticket médio: R$ 562,50" },
  { type: "warning" as const, message: "450 leads ativos no pipeline com potencial de R$ 450K" },
];

const TOTAL_PAGES = 2;

const Dashboard = () => {
  const [analysisPage, setAnalysisPage] = useState(1);

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
            <DateFilter />
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-blue-500/15 to-cyan-500/15 rounded-xl border border-blue-400/30 backdrop-blur-md">
              <User className="w-4 h-4 text-blue-300" />
              <div>
                <p className="text-xs text-slate-400">Usuário</p>
                <p className="text-sm font-medium text-blue-100">Mariaeduarda</p>
              </div>
            </div>
            <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-cyan-500/15 to-teal-500/15 rounded-xl border border-cyan-400/30 backdrop-blur-md">
              <Briefcase className="w-4 h-4 text-cyan-300" />
              <div>
                <p className="text-xs text-slate-400">Função</p>
                <p className="text-sm font-medium text-cyan-100">Gerente</p>
              </div>
            </div>
            <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-emerald-500/15 to-teal-500/15 rounded-xl border border-emerald-400/30 backdrop-blur-md">
              <Building2 className="w-4 h-4 text-emerald-300" />
              <div>
                <p className="text-xs text-slate-400">Departamento</p>
                <p className="text-sm font-medium text-emerald-100">Vendas</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8 space-y-6">
        <div className="flex justify-end gap-3">
          <Button className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white hover:from-blue-500 hover:to-cyan-500 shadow-lg transition-all duration-300">
            ✦ Análise de Clusters (IA)
          </Button>
          <Button className="bg-gradient-to-r from-cyan-600 to-teal-600 text-white hover:from-cyan-500 hover:to-teal-500 shadow-lg transition-all duration-300">
            📈 Previsão de Vendas (IA)
          </Button>
        </div>

        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Total de Leads"
            value={mockData.totalLeads.toLocaleString("pt-BR")}
            subtitle="450 ativos"
            icon={<Users className="w-5 h-5" />}
            variant="highlight"
            className="border-blue-400/50 bg-gradient-to-br from-blue-600/20 to-cyan-600/10"
          />
          <MetricCard
            title="Taxa de Conversão"
            value={`${mockData.conversionRate}%`}
            subtitle="320 ganhos"
            icon={<TrendingUp className="w-5 h-5" />}
            variant="primary"
            trend={{ value: 3.2, isPositive: true }}
            className="hover:border-cyan-400/40 hover:shadow-lg hover:shadow-cyan-500/20"
          />
          <MetricCard
            title="Valor Pipeline"
            value={`R$ ${(mockData.pipelineValue / 1000).toFixed(0)}K`}
            subtitle="R$ 180K ganho"
            icon={<DollarSign className="w-5 h-5" />}
            variant="highlight"
            trend={{ value: 12, isPositive: true }}
            className="hover:border-emerald-400/40 hover:shadow-lg hover:shadow-emerald-500/20"
          />
          <MetricCard
            title="Ticket Médio"
            value={`R$ ${mockData.ticketMedio}`}
            subtitle="180 perdidos"
            icon={<Receipt className="w-5 h-5" />}
            variant="primary"
            className="hover:border-orange-400/40 hover:shadow-lg hover:shadow-orange-500/20"
          />
        </section>

        <InsightsCard insights={insights} />

        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold bg-gradient-to-r from-blue-300 to-cyan-300 bg-clip-text text-transparent">Análises Detalhadas</h2>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 border-blue-500/30 hover:bg-blue-500/10 hover:border-blue-400/50 text-blue-300 transition-all duration-300"
              onClick={() => setAnalysisPage((p) => Math.max(1, p - 1))}
              disabled={analysisPage === 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm font-medium text-slate-300 px-2">
              {analysisPage} / {TOTAL_PAGES}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 border-cyan-500/30 hover:bg-cyan-500/10 hover:border-cyan-400/50 text-cyan-300 transition-all duration-300"
              onClick={() => setAnalysisPage((p) => Math.min(TOTAL_PAGES, p + 1))}
              disabled={analysisPage === TOTAL_PAGES}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {analysisPage === 1 && (
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-cyan-600/15 to-teal-600/10 border border-cyan-500/30 rounded-2xl p-5 backdrop-blur-sm">
              <h3 className="text-sm font-semibold text-cyan-200 mb-4">📈 Previsão de Vendas (IA)</h3>
              <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <ProgressGoal
                  current={mockData.closedValue}
                  goal={mockData.monthlyGoal}
                  label="Faturamento"
                />
                <LeadQualityCard
                  data={{
                    total: mockData.totalLeads,
                    qualificados: mockData.qualifiedLeads,
                    naoQualificados: mockData.unqualifiedLeads,
                    outros: Math.max(
                      mockData.totalLeads - mockData.qualifiedLeads - mockData.unqualifiedLeads,
                      0
                    ),
                  }}
                />
              </section>
              <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
                <RealisticForecast
                  pipelineValue={mockData.pipelineValue}
                  conversionRate={mockData.conversionRate}
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
                <LeadSourcesChart data={leadSources} />
              </section>
            </div>
            <LostLeadsBreakdown
              total={mockData.lostLeads}
              reasons={lostReasons}
              totalValue={mockData.lostValue}
            />
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
