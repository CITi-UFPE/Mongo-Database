import { useMemo, useState } from "react";
import { CheckCircle2, AlertTriangle, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type PaymentStatus = "paid" | "pending" | "overdue";

export interface ProjectPaymentItem {
  id: string;
  projectName: string;
  amount: number;
  dueDate: string;
  status: PaymentStatus;
  billingContact?: string;
  billingEmail?: string;
}

interface ProjectStatusCardProps {
  project: ProjectPaymentItem;
  onCopyBilling?: (project: ProjectPaymentItem) => string;
  className?: string;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
};

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("pt-BR").format(date);
};

export default function ProjectStatusCard({
  project,
  onCopyBilling,
  className,
}: ProjectStatusCardProps) {
  const [copied, setCopied] = useState(false);

  const isPaid = project.status === "paid";
  const isOverdue = project.status === "overdue";
  const isPending = project.status === "pending" || isOverdue;

  const statusCopy = useMemo(() => {
    if (isPaid) return "Pago";
    if (isOverdue) return "Atrasado";
    return "Pendente";
  }, [isPaid, isOverdue]);

  const statusStyles = isPaid
    ? {
        border: "border-emerald-400/30",
        bg: "bg-emerald-500/10",
        text: "text-emerald-300",
        icon: <CheckCircle2 className="h-4 w-4 text-emerald-300" />,
      }
    : {
        border: "border-red-400/30",
        bg: "bg-red-500/10",
        text: "text-red-300",
        icon: <AlertTriangle className="h-4 w-4 text-red-300" />,
      };

  const handleCopy = async () => {
    if (!onCopyBilling || !isPending) return;

    const text = onCopyBilling(project);
    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    }
  };

  return (
    <div
      className={cn(
        "rounded-2xl border bg-slate-900/70 p-5 shadow-[0_12px_32px_rgba(15,23,42,0.45)] transition-all duration-300 hover:-translate-y-0.5",
        statusStyles.border,
        className,
        isPaid ? "bg-emerald-500/5" : "bg-red-500/5"
      )}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            {statusStyles.icon}
            <span className={cn("text-xs font-semibold uppercase tracking-[0.18em]", statusStyles.text)}>
              {statusCopy}
            </span>
          </div>

          <div>
            <h4 className="text-base font-semibold text-slate-100">{project.projectName}</h4>
            <p className="mt-1 text-sm text-slate-400">Vencimento: {formatDate(project.dueDate)}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-300">
            <span className="rounded-full border border-slate-700/80 bg-slate-800/70 px-3 py-1 font-semibold text-slate-100">
              {formatCurrency(project.amount)}
            </span>
            {project.billingContact ? (
              <span className="rounded-full border border-slate-700/80 bg-slate-800/70 px-3 py-1">
                {project.billingContact}
              </span>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:items-end">
          {isPending ? (
            <button
              type="button"
              onClick={handleCopy}
              className={cn(
                "inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-all duration-200",
                copied
                  ? "bg-emerald-500/20 text-emerald-200 border border-emerald-400/40"
                  : "bg-sky-500/15 text-sky-200 border border-sky-400/30 hover:bg-sky-500/25 hover:border-sky-300/50"
              )}
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copiado" : "Copiar dados de cobrança"}
            </button>
          ) : (
            <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-sm font-semibold text-emerald-200">
              Pagamento confirmado
            </div>
          )}

          {project.billingEmail ? (
            <p className="text-xs text-slate-400">{project.billingEmail}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
