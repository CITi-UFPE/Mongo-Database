import { useMemo } from "react";
import { Inbox, Clock3, BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import ProjectStatusCard, { type ProjectPaymentItem } from "./ProjectStatusCard";

interface PaymentListProps {
  items: ProjectPaymentItem[];
  className?: string;
  title?: string;
  subtitle?: string;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
};

export default function PaymentList({
  items,
  className,
  title = "Pendências Financeiras",
  subtitle = "Controle de projetos pagos, pendentes e em atraso",
}: PaymentListProps) {
  const summary = useMemo(() => {
    const total = items.reduce((acc, item) => acc + item.amount, 0);
    const pending = items.filter((item) => item.status !== "paid");
    const paid = items.filter((item) => item.status === "paid");
    const overdue = items.filter((item) => item.status === "overdue");

    return {
      total,
      pendingCount: pending.length,
      paidCount: paid.length,
      overdueCount: overdue.length,
      pendingTotal: pending.reduce((acc, item) => acc + item.amount, 0),
    };
  }, [items]);

  const buildBillingText = (item: ProjectPaymentItem) => {
    return [
      "Olá, tudo bem?",
      `Segue cobrança referente ao projeto ${item.projectName}.`,
      `Valor: ${formatCurrency(item.amount)}`,
      `Vencimento: ${new Intl.DateTimeFormat("pt-BR").format(new Date(item.dueDate))}`,
      item.billingContact ? `Contato: ${item.billingContact}` : null,
      item.billingEmail ? `E-mail: ${item.billingEmail}` : null,
    ]
      .filter(Boolean)
      .join("\n");
  };

  if (!items.length) {
    return (
      <div className={cn("rounded-2xl border border-slate-700/50 bg-slate-900/40 p-6", className)}>
        <div className="flex items-center gap-2 text-slate-200">
          <Inbox className="h-5 w-5 text-slate-400" />
          <h3 className="text-lg font-semibold">{title}</h3>
        </div>
        <p className="mt-2 text-sm text-slate-400">Nenhuma pendência encontrada no período.</p>
      </div>
    );
  }

  return (
    <div className={cn("rounded-2xl border border-slate-700/50 bg-slate-900/40 backdrop-blur-sm p-6", className)}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-slate-100">
            <Inbox className="h-5 w-5 text-sky-300" />
            <h3 className="text-lg font-semibold">{title}</h3>
          </div>
          <p className="mt-1 text-sm text-slate-400">{subtitle}</p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.14em] text-slate-400">Total</p>
            <p className="mt-1 text-sm font-semibold text-slate-100">{formatCurrency(summary.total)}</p>
          </div>
          <div className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.14em] text-red-200">Pendentes</p>
            <p className="mt-1 text-sm font-semibold text-red-100">{summary.pendingCount}</p>
          </div>
          <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.14em] text-emerald-200">Pagos</p>
            <p className="mt-1 text-sm font-semibold text-emerald-100">{summary.paidCount}</p>
          </div>
          <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.14em] text-amber-200">Atrasados</p>
            <p className="mt-1 text-sm font-semibold text-amber-100">{summary.overdueCount}</p>
          </div>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        <div className="flex items-center justify-between rounded-xl border border-slate-700/40 bg-slate-800/30 px-4 py-3 text-sm text-slate-300">
          <div className="flex items-center gap-2">
            <Clock3 className="h-4 w-4 text-slate-400" />
            <span>Total pendente para cobrança</span>
          </div>
          <span className="font-semibold text-red-300">{formatCurrency(summary.pendingTotal)}</span>
        </div>

        <div className="grid gap-4">
          {items.map((item) => (
            <ProjectStatusCard
              key={item.id}
              project={item}
              onCopyBilling={() => buildBillingText(item)}
            />
          ))}
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400">
          <BadgeCheck className="h-4 w-4 text-emerald-400" />
          <span>Verde indica pagamento realizado. Vermelho indica pendência ou atraso.</span>
        </div>
      </div>
    </div>
  );
}
