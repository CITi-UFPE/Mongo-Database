import { useState, type ReactNode } from "react";
import { BarChart3, ChevronLeft, ChevronRight, DollarSign, Receipt, Target } from "lucide-react";
import UserHeader from "../UserHeader";
import { DateFilter } from "./date-filter";
import type { DateRangeSelection, DateRangeValue } from "./date-filter";
import type { AnalyticsPayload } from "../../services/analytics";
import { FinanceCard } from "../financial/summaryCards";
import { GoalProgressBar } from "../financial/goalProgress";
import { InsightsCard } from "./insights-card";
import ExpensesPieChart from "./ExpensesPieChart";
import type { ExpenseCategory } from "./ExpensesPieChart";
import CategoryBreakdown from "./CategoryBreakdown";
import PaymentList from "./PaymentList";
import type { ProjectPaymentItem } from "./ProjectStatusCard";

interface FinancialDashboardProps {
  data: AnalyticsPayload;
  onDateFilterChange?: (range: DateRangeValue, dates?: DateRangeSelection) => void;
  headerAction?: ReactNode;
  headerStatusMessage?: string | null;
}

const TOTAL_PAGES = 2;

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
  const [analysisPage, setAnalysisPage] = useState(1);
  const [isPaymentsOpen, setIsPaymentsOpen] = useState(false);

  const faturamentoRealizado = data.progresso_meta.faturado;
  const metaMensal = data.progresso_meta.meta;
  const previsaoRealista = data.previsao_faturamento.previsao_realista;
  const pipelineTotal = data.previsao_faturamento.pipeline_total;
  const faltaParaMeta = data.progresso_meta.falta_faturar ?? Math.max(metaMensal - faturamentoRealizado, 0);

  const percentualMeta = metaMensal > 0 ? (faturamentoRealizado / metaMensal) * 100 : 0;

  // Mock expense data - will be replaced with real data from backend
  const expenseCategories: ExpenseCategory[] = [
    {
      id: "projetos",
      name: "Projetos",
      value: 45000,
      subcategories: [
        { id: "proj-dev", name: "Desenvolvimento Web", value: 25000 },
        { id: "proj-mobile", name: "App Mobile", value: 15000 },
        { id: "proj-design", name: "Design UI/UX", value: 5000 },
      ],
    },
    {
      id: "infraestrutura",
      name: "Infraestrutura (Digital Ocean)",
      value: 8500,
      subcategories: [
        { id: "infra-servidor", name: "Servidores", value: 5500 },
        { id: "infra-storage", name: "Storage/Backup", value: 2000 },
        { id: "infra-balancer", name: "Load Balancer", value: 1000 },
      ],
    },
    {
      id: "marketing",
      name: "Marketing (Red Bull + Digital)",
      value: 18000,
      subcategories: [
        { id: "mkt-red-bull", name: "Patrocínio Red Bull", value: 10000 },
        { id: "mkt-ads", name: "Publicidade Digital", value: 5000 },
        { id: "mkt-content", name: "Produção de Conteúdo", value: 3000 },
      ],
    },
    {
      id: "eventos",
      name: "Eventos",
      value: 12500,
      subcategories: [
        { id: "evt-conferencia", name: "Conferência Tech 2024", value: 7500 },
        { id: "evt-workshops", name: "Workshops & Treinamentos", value: 3500 },
        { id: "evt-networking", name: "Eventos de Networking", value: 1500 },
      ],
    },
  ];

  const paymentItems: ProjectPaymentItem[] = [
    {
      id: "projeto-alpha",
      projectName: "Projeto Alpha",
      amount: 18500,
      dueDate: "2026-04-08",
      status: "overdue",
      billingContact: "Financeiro / Lucas",
      billingEmail: "financeiro@projetoalpha.com",
    },
    {
      id: "projeto-beta",
      projectName: "Projeto Beta",
      amount: 12400,
      dueDate: "2026-04-15",
      status: "pending",
      billingContact: "Maria Souza",
      billingEmail: "maria@projetobeta.com",
    },
    {
      id: "projeto-gamma",
      projectName: "Projeto Gamma",
      amount: 9600,
      dueDate: "2026-04-20",
      status: "pending",
      billingContact: "Conta a pagar",
      billingEmail: "contas@projetogamma.com",
    },
    {
      id: "projeto-delta",
      projectName: "Projeto Delta",
      amount: 15100,
      dueDate: "2026-04-03",
      status: "paid",
      billingContact: "Ricardo Lima",
      billingEmail: "ricardo@projetodelta.com",
    },
  ];

  const insights = [
    {
      type: "success" as const,
      message: `Receita realizada de ${formatCurrency(faturamentoRealizado)} já cobre ${percentualMeta.toFixed(1)}% da meta mensal.`,
    },
    {
      type: "warning" as const,
      message: `${paymentItems.filter((item) => item.status !== "paid").length} projetos ainda precisam de cobrança para fechar o ciclo.`,
    },
    {
      type: "info" as const,
      message: `Gasto concentrado em Projetos e Marketing: vale acompanhar a evolução do caixa com mais frequência.`,
    },
  ];

  const pendingCount = paymentItems.filter((item) => item.status !== "paid").length;
  const overdueCount = paymentItems.filter((item) => item.status === "overdue").length;
  const paidCount = paymentItems.filter((item) => item.status === "paid").length;

  return (
    <div className="bg-gradient-to-br from-[#0B1120] via-[#0D1929] to-[#0F172A] text-slate-100 min-h-screen">
      <div className="border-b border-slate-700/30 bg-slate-900/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-300 via-cyan-300 to-blue-400">
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

        <InsightsCard insights={insights} />

        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold bg-gradient-to-r from-emerald-300 to-cyan-300 bg-clip-text text-transparent">
            Análises Detalhadas
          </h2>
          <div className="flex items-center gap-2">
            <button
              className="h-8 w-8 border-blue-500/30 hover:bg-blue-500/10 hover:border-blue-400/50 text-blue-300 transition-all duration-300"
              onClick={() => setAnalysisPage((page) => Math.max(1, page - 1))}
              disabled={analysisPage === 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-medium text-slate-300 px-2">
              {analysisPage} / {TOTAL_PAGES}
            </span>
            <button
              className="h-8 w-8 border-cyan-500/30 hover:bg-cyan-500/10 hover:border-cyan-400/50 text-cyan-300 transition-all duration-300"
              onClick={() => setAnalysisPage((page) => Math.min(TOTAL_PAGES, page + 1))}
              disabled={analysisPage === TOTAL_PAGES}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {analysisPage === 1 ? (
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-blue-600/15 to-cyan-600/10 border border-blue-500/30 rounded-2xl p-5 backdrop-blur-sm shadow-lg shadow-cyan-500/10">
              <h3 className="text-sm font-semibold text-blue-200 mb-4">📈 Visão Financeira</h3>
              <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
                <GoalProgressBar
                  title="Meta de Receita"
                  subtitle="Realizado vs meta mensal, com projeção realista do periodo"
                  current={faturamentoRealizado}
                  bjGoal={metaMensal}
                  internalGoal={previsaoRealista}
                />

                <div className="rounded-2xl border border-slate-700/50 bg-slate-900/55 p-5 shadow-[0_12px_32px_rgba(15,23,42,0.28)]">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-sm font-semibold text-blue-100">Pendências financeiras</h3>
                      <p className="mt-1 text-sm text-slate-400">
                        Acompanhe quem precisa pagar sem ocupar espaço da tela.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsPaymentsOpen(true)}
                      className="rounded-xl border border-sky-400/30 bg-sky-500/10 px-4 py-2 text-sm font-semibold text-sky-200 transition-all duration-200 hover:bg-sky-500/20 hover:border-sky-300/50"
                    >
                      Ver pendências
                    </button>
                  </div>

                  <div className="mt-5 grid grid-cols-3 gap-3">
                    <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-3">
                      <p className="text-[11px] uppercase tracking-[0.14em] text-red-200">Em aberto</p>
                      <p className="mt-1 text-xl font-bold text-red-100">{pendingCount}</p>
                    </div>
                    <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-3">
                      <p className="text-[11px] uppercase tracking-[0.14em] text-amber-200">Atrasados</p>
                      <p className="mt-1 text-xl font-bold text-amber-100">{overdueCount}</p>
                    </div>
                    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-3">
                      <p className="text-[11px] uppercase tracking-[0.14em] text-emerald-200">Pagos</p>
                      <p className="mt-1 text-xl font-bold text-emerald-100">{paidCount}</p>
                    </div>
                  </div>

                  <div className="mt-4 rounded-xl border border-slate-700/50 bg-slate-800/35 px-4 py-3 text-sm text-slate-300">
                    <div className="flex items-center justify-between gap-3">
                      <span>Total pendente para cobrança</span>
                      <span className="font-semibold text-red-300">
                        {formatCurrency(paymentItems.filter((item) => item.status !== "paid").reduce((acc, item) => acc + item.amount, 0))}
                      </span>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-blue-600/15 to-cyan-600/10 border border-blue-500/30 rounded-2xl p-5 backdrop-blur-sm shadow-lg shadow-cyan-500/10">
              <h3 className="text-sm font-semibold text-blue-200 mb-4">✦ Categorização de Gastos</h3>
              <section className="grid grid-cols-1 xl:grid-cols-[1.15fr_0.85fr] gap-6 items-start">
                <ExpensesPieChart categories={expenseCategories} />
                <CategoryBreakdown categories={expenseCategories} className="h-full" />
              </section>
            </div>
          </div>
        )}

        {isPaymentsOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 py-6 backdrop-blur-sm">
            <div className="w-full max-w-6xl rounded-3xl border border-slate-700/60 bg-slate-950 shadow-[0_20px_80px_rgba(2,6,23,0.65)]">
              <div className="flex items-center justify-between border-b border-slate-800/80 px-6 py-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-100">Pendências financeiras</h3>
                  <p className="text-sm text-slate-400">Use os botões de copiar para acelerar a cobrança.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPaymentsOpen(false)}
                  className="rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm font-semibold text-slate-200 transition-all duration-200 hover:border-slate-500 hover:bg-slate-800"
                >
                  Fechar
                </button>
              </div>
              <div className="max-h-[80vh] overflow-y-auto p-6">
                <PaymentList
                  items={paymentItems}
                  subtitle="Mostra quem já pagou, o que está pendente e onde a cobrança deve ser disparada primeiro"
                  className="border-0 bg-transparent p-0"
                />
              </div>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}