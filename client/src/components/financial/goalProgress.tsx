"use client";

import { cn } from "@/lib/utils";

interface GoalProgressBarProps {
    title?: string;
    subtitle?: string;
    current: number;
    bjGoal: number;
    internalGoal: number;
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(value);
};

export function GoalProgressBar({
    title = "Meta Mensal BJ",
    subtitle,
    current,
    bjGoal,
    internalGoal,
}: GoalProgressBarProps) {
    const progress = (current / bjGoal) * 100;
    const clampedProgress = Math.min(progress, 100);

    const exceededAmount = Math.max(current - bjGoal, 0);
    const remainingToGoal = Math.max(bjGoal - current, 0);
    const internalGap = Math.max(internalGoal - current, 0);
    const hitGoal = current >= bjGoal;

    const defaultSubtitle = `Realizado vs Meta (~${formatCurrency(bjGoal)}/mês)`;

    return (
        <div className="w-full rounded-[28px] border border-[#1E3A5F] bg-[#071C2F] px-6 py-6 shadow-lg">
            <div className="mb-6">
                <h2 className="text-[18px] font-semibold text-slate-100">{title}</h2>
                <p className="mt-1 text-[13px] text-slate-400">{subtitle ?? defaultSubtitle}</p>
            </div>

            <div className="mb-6 flex items-end gap-8">
                <div>
                    <p className="mb-1 text-[12px] uppercase tracking-wider text-slate-400/80">Realizado</p>
                    <p className="text-[30px] font-semibold text-emerald-400 leading-none">{formatCurrency(current)}</p>
                </div>

                <div>
                    <p className="mb-1 text-[12px] uppercase tracking-wider text-slate-400/80">Meta</p>
                    <p className="text-[30px] font-semibold text-emerald-400 leading-none">{formatCurrency(bjGoal)}</p>
                </div>
            </div>

            <div className="mb-2 flex items-center justify-between">
                <span className="text-[13px] text-slate-400">Progresso</span>
                <span className="text-[14px] font-semibold text-emerald-400">{progress.toFixed(1)}%</span>
            </div>

            <div className="mb-6 h-4 w-full overflow-hidden rounded-full bg-slate-800">
                <div className={cn(
                    "h-full rounded-full transition-all duration-700",
                    current >= 0.7 * bjGoal ? "bg-emerald-500/50" : current >= 0.5 * bjGoal ? "bg-orange-400/50" : "bg-red-500/50"
                )} style={{ width: `${clampedProgress}%` }} />
            </div>

            <div className={cn(
                "mb-6 flex items-center gap-2 rounded-xl border px-4 py-3 text-sm",
                hitGoal ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-amber-500/30 bg-amber-500/10 text-amber-300"
            )}>
                <span>{hitGoal ? "🎯" : "⚠️"}</span>
                <span>{hitGoal ? `Meta atingida! Superou em ${formatCurrency(exceededAmount)}` : `Faltam ${formatCurrency(remainingToGoal)} para atingir a meta`}</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl border border-sky-500/40 bg-sky-500/10 px-4 py-4">
                    <p className="mb-1 text-[12px] text-slate-400">Meta Interna</p>
                    <p className="text-[20px] font-semibold text-sky-400">{formatCurrency(internalGoal)}</p>
                </div>

                <div className="rounded-xl border border-violet-500/40 bg-violet-500/10 px-4 py-4">
                    <p className="mb-1 text-[12px] text-slate-400">Gap Interna</p>
                    <p className="text-[20px] font-semibold text-violet-400">{formatCurrency(internalGap)}</p>
                </div>
            </div>
        </div>
    );
}