import { useState, type ReactNode } from "react";
import { BarChart3, DollarSign, Receipt, Target, TrendingUp } from "lucide-react";
import UserHeader from "../UserHeader";
import { MetricCard } from "./metric-card";
import { DateFilter } from "./date-filter";
import type { DateRangeSelection, DateRangeValue } from "./date-filter";
import type { AnalyticsPayload } from "../../services/analytics";
import { FinanceCard } from "../financial/summaryCards";
import { GoalProgressBar } from "../financial/goalProgress";

interface FinancialDashboardProps {
  data: AnalyticsPayload;
  onDateFilterChange?: (range: DateRangeValue, dates?: DateRangeSelection) => void;
  headerAction?: ReactNode;
  headerStatusMessage?: string | null;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
};

export default function FinancialDashboard({
  data,
  onDateFilterChange,
  headerAction,
  headerStatusMessage,
}: FinancialDashboardProps) {
  const [analysisPage] = useState(1);

  const faturamentoRealizado = data.progresso_meta.faturado;
  const metaMensal = data.progresso_meta.meta;
  const previsaoRealista = data.previsao_faturamento.previsao_realista;
  const pipelineTotal = data.previsao_faturamento.pipeline_total;
  const faltaParaMeta = data.progresso_meta.falta_faturar ?? Math.max(metaMensal - faturamentoRealizado, 0);

  const percentualMeta = metaMensal > 0 ? (faturamentoRealizado / metaMensal) * 100 : 0;

  return (
    <div className="bg-gradient-to-br from-[#0B1120] via-[#0D1929] to-[#0F172A] text-slate-100 min-h-screen">
      <div className="border-b border-slate-700/30 bg-slate-900/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-cyan-300 to-blue-400">
                Dashboard Financeiro
              </h1>
              <p className="text-sm text-slate-300">
                Visao de receita, metas e previsoes do periodo.
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
        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <FinanceCard
            title="Faturamento Realizado"
            value={faturamentoRealizado}
            icon={<DollarSign className="h-5 w-5 text-emerald-300" />}
            subtitleLabel="Meta mensal"
            subtitleValue={metaMensal}
            subtitleType="currency"
            valueColor="green"
          />
          <FinanceCard
            title="Meta Mensal"
            value={metaMensal}
            icon={<Target className="h-5 w-5 text-sky-300" />}
            subtitleLabel="Falta para meta"
            subtitleValue={faltaParaMeta}
            subtitleType="currency"
            valueColor="blue"
          />
          <FinanceCard
            title="Pipeline Potencial"
            value={pipelineTotal}
            icon={<BarChart3 className="h-5 w-5 text-violet-300" />}
            subtitleLabel="Previsao realista"
            subtitleValue={previsaoRealista}
            subtitleType="currency"
            valueColor="purple"
          />
          <FinanceCard
            title="Receita Projetada"
            value={previsaoRealista}
            icon={<Receipt className="h-5 w-5 text-orange-300" />}
            subtitleLabel="Percentual da meta"
            subtitleValue={`${percentualMeta.toFixed(1)}%`}
            subtitleType="text"
            valueColor="orange"
          />
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-[1.35fr_0.65fr] gap-4">
          <GoalProgressBar
            title="Meta de Receita"
            subtitle="Realizado vs meta mensal, com projeção realista do periodo"
            current={faturamentoRealizado}
            bjGoal={metaMensal}
            internalGoal={previsaoRealista}
          />

          <div className="space-y-4">
            <MetricCard
              title="Taxa de Conversao"
              value={`${data.taxa_conversao.toFixed(1)}%`}
              subtitle="Dados da API"
              icon={<TrendingUp className="w-5 h-5" />}
              variant="highlight"
              className="border-emerald-400/35 bg-gradient-to-br from-emerald-600/15 to-cyan-600/10"
            />
            <MetricCard
              title="Ticket Medio"
              value={formatCurrency(data.ticket_medio)}
              subtitle={`${data.qualificados} leads qualificados`}
              icon={<Receipt className="w-5 h-5" />}
              variant="primary"
              className="border-cyan-400/35 bg-gradient-to-br from-cyan-600/15 to-blue-600/10"
            />
            <div className="rounded-2xl border border-slate-700 bg-slate-900/65 p-5">
              <h3 className="text-sm font-semibold text-slate-100">Resumo rapido</h3>
              <div className="mt-4 space-y-3 text-sm text-slate-300">
                <p>
                  Receita realizada: <span className="font-semibold text-emerald-300">{formatCurrency(faturamentoRealizado)}</span>
                </p>
                <p>
                  Falta para meta: <span className="font-semibold text-amber-300">{formatCurrency(faltaParaMeta)}</span>
                </p>
                <p>
                  Projecao realista: <span className="font-semibold text-cyan-300">{formatCurrency(previsaoRealista)}</span>
                </p>
                <p>
                  Pipeline potencial: <span className="font-semibold text-violet-300">{formatCurrency(pipelineTotal)}</span>
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}