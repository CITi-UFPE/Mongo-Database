import { useState, type ReactNode } from "react";
import { Wallet, TrendingUp, TrendingDown, Repeat } from "lucide-react";
import UserHeader from "../UserHeader";
import { DateFilter } from "./date-filter";
import type { DateRangeSelection, DateRangeValue } from "./date-filter";
import type { AnalyticsPayload } from "../../services/analytics";
import { FinanceCard } from "../financial/summaryCards";
import { GoalProgressBar } from "../financial/goalProgress";
import { FinanceBarChart } from "../financial/financeBarChart";
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
  const [isPaymentsOpen, setIsPaymentsOpen] = useState(false);
  const [isDetailedAnalysisOpen, setIsDetailedAnalysisOpen] = useState(false);

  const faturamentoRealizado = data.progresso_meta.faturado;
  const metaMensal = data.progresso_meta.meta;
  const previsaoRealista = data.previsao_faturamento.previsao_realista;

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

  const totalSaidas = expenseCategories.reduce((acc, item) => acc + item.value, 0);
  const topExpenseCategories = [...expenseCategories].sort((a, b) => b.value - a.value).slice(0, 3);
  const monthlyCashflowData = [
    { label: "Jan", entradas: 72000, saidas: 53000 },
    { label: "Fev", entradas: 68000, saidas: 49000 },
    { label: "Mar", entradas: 76000, saidas: 57000 },
    { label: "Abr", entradas: faturamentoRealizado, saidas: totalSaidas },
  ];
  const fortnightlyCashflowData = [
    { label: "1-15 Jan", entradas: 35000, saidas: 26000 },
    { label: "16-31 Jan", entradas: 37000, saidas: 27000 },
    { label: "1-15 Fev", entradas: 33000, saidas: 24000 },
    { label: "16-29 Fev", entradas: 35000, saidas: 25000 },
    { label: "1-15 Mar", entradas: 38000, saidas: 28000 },
    { label: "16-31 Mar", entradas: 38000, saidas: 29000 },
    { label: "1-15 Abr", entradas: Math.round(faturamentoRealizado * 0.52), saidas: Math.round(totalSaidas * 0.5) },
    { label: "16-30 Abr", entradas: Math.round(faturamentoRealizado * 0.48), saidas: Math.round(totalSaidas * 0.5) },
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
        <div className="w-full px-4 py-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 2xl:px-16">
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

      <main className="w-full px-4 py-8 space-y-8 sm:px-6 md:px-8 lg:px-10 xl:px-12 2xl:px-16">
        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8">
          <FinanceCard
            title="Faturamento Realizado"
            value={faturamentoRealizado}
            icon={<Wallet className="h-6 w-6" />}
            variation={12}
            subtitleLabel="Entrada realizada"
            subtitleValue={faturamentoRealizado}
            subtitleType="currency"
            valueColor="green"
          />
          <FinanceCard
            title="Total de Entradas"
            value={metaMensal}
            icon={<TrendingUp className="h-6 w-6" />}
            variation={8}
            subtitleLabel="Meta mensal"
            subtitleValue={metaMensal}
            subtitleType="currency"
            valueColor="blue"
          />
          <FinanceCard
            title="Total de Saídas"
            value={totalSaidas}
            icon={<TrendingDown className="h-6 w-6" />}
            variation={-5}
            subtitleLabel="Despesas do período"
            subtitleValue={totalSaidas}
            subtitleType="currency"
            valueColor="orange"
          />
          <FinanceCard
            title="Receita Projetada"
            value={previsaoRealista}
            icon={<Repeat className="h-6 w-6" />}
            variation={15}
            subtitleLabel="Previsão realista"
            subtitleValue={previsaoRealista}
            subtitleType="currency"
            valueColor="purple"
          />
        </section>

        <InsightsCard insights={insights} />

        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-100">
            Análises Detalhadas
          </h2>
          <button
            type="button"
            onClick={() => setIsDetailedAnalysisOpen(true)}
            className="rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-200 transition-all duration-200 hover:border-cyan-300/50 hover:bg-cyan-500/20"
          >
            Abrir análise por gasto
          </button>
        </div>

        <div className="space-y-8">
          <div className="rounded-2xl border border-slate-700/60 bg-slate-900/55 p-6 backdrop-blur-sm">
            <h3 className="mb-4 text-sm font-semibold text-slate-100">Visão Financeira</h3>
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
              <GoalProgressBar
                title="Meta de Receita"
                subtitle="Realizado vs meta mensal, com projeção realista do periodo"
                current={faturamentoRealizado}
                bjGoal={metaMensal}
                internalGoal={previsaoRealista}
              />

              <div className="flex flex-col rounded-2xl border border-slate-700/50 bg-slate-900/55 p-6 shadow-[0_12px_32px_rgba(15,23,42,0.28)]">
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

                <div className="mt-5 flex flex-1 flex-col gap-6">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-4">
                      <p className="text-[11px] uppercase tracking-[0.14em] text-red-200">Em aberto</p>
                      <p className="mt-1 text-xl font-bold text-red-100">{pendingCount}</p>
                    </div>
                    <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-4">
                      <p className="text-[11px] uppercase tracking-[0.14em] text-amber-200">Atrasados</p>
                      <p className="mt-1 text-xl font-bold text-amber-100">{overdueCount}</p>
                    </div>
                    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-4">
                      <p className="text-[11px] uppercase tracking-[0.14em] text-emerald-200">Pagos</p>
                      <p className="mt-1 text-xl font-bold text-emerald-100">{paidCount}</p>
                    </div>
                  </div>

                  <div className="mt-auto rounded-xl border border-slate-700/50 bg-slate-800/35 px-4 py-4 text-sm text-slate-300">
                    <div className="flex items-center justify-between gap-3">
                      <span>Total pendente para cobrança</span>
                      <span className="font-semibold text-red-300">
                        {formatCurrency(paymentItems.filter((item) => item.status !== "paid").reduce((acc, item) => acc + item.amount, 0))}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="mt-8 border-t border-slate-700/40 pt-8">
              <FinanceBarChart
                title="Entradas vs Saídas"
                subtitle="Comparativo mensal e quinzenal do fluxo financeiro"
                monthlyData={monthlyCashflowData}
                fortnightlyData={fortnightlyCashflowData}
                initialPeriod="mensal"
              />
            </section>

            <section className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8 border-t border-slate-700/40 pt-8 items-stretch">
              <ExpensesPieChart
                categories={expenseCategories}
                title="Saídas por categoria"
                subtitle="Resumo rápido para acompanhar distribuição dos gastos"
              />

              <div className="flex flex-col rounded-2xl border border-slate-700/50 bg-slate-900/65 p-6">
                <h4 className="text-sm font-semibold text-slate-100">Top gastos do período</h4>
                <p className="mt-1 text-xs text-slate-400">Categorias que mais impactam o caixa.</p>

                <div className="mt-6 flex-1 space-y-4 overflow-y-auto">
                  {topExpenseCategories.map((item) => {
                    const percentage = totalSaidas > 0 ? (item.value / totalSaidas) * 100 : 0;
                    return (
                      <div key={item.id} className="rounded-xl border border-slate-700/50 bg-slate-800/40 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-medium text-slate-100">{item.name}</p>
                          <p className="text-sm font-semibold text-cyan-300">{formatCurrency(item.value)}</p>
                        </div>
                        <p className="mt-1 text-xs text-slate-400">{percentage.toFixed(1)}% do total de saídas</p>
                      </div>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => setIsDetailedAnalysisOpen(true)}
                  className="mt-6 w-full rounded-xl border border-blue-400/30 bg-blue-500/10 px-4 py-2 text-sm font-semibold text-blue-200 transition-all duration-200 hover:border-blue-300/50 hover:bg-blue-500/20"
                >
                  Ver análise completa de gastos
                </button>
              </div>
            </section>
          </div>
        </div>

        {isDetailedAnalysisOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 sm:p-6">
            <div className="w-full rounded-3xl border border-slate-700/60 bg-slate-950 shadow-[0_20px_80px_rgba(2,6,23,0.65)]">
              <div className="flex items-center justify-between border-b border-slate-800/80 px-6 py-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-100">Análise detalhada por gasto</h3>
                  <p className="text-sm text-slate-400">Visualização em popup para liberar espaço na tela principal.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsDetailedAnalysisOpen(false)}
                  className="rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm font-semibold text-slate-200 transition-all duration-200 hover:border-slate-500 hover:bg-slate-800"
                >
                  Fechar
                </button>
              </div>
              <div className="max-h-[85vh] overflow-y-auto p-6">
                <CategoryBreakdown categories={expenseCategories} className="h-full" />
              </div>
            </div>
          </div>
        ) : null}

        {isPaymentsOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 sm:p-6">
            <div className="w-full rounded-3xl border border-slate-700/60 bg-slate-950 shadow-[0_20px_80px_rgba(2,6,23,0.65)]">
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