import { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface FinanceCardProps {
    title: string;
    value: number;
    icon: ReactNode;
    badgeValue?: number;
    badgeType?: "positive" | "negative" | "neutral"; // Mockado
    subtitleLabel?: string;
    subtitleValue?: number | string;
    subtitleType?: "currency" | "text";
    valueColor?: "green" | "blue" | "orange" | "purple";
}

// Format to brazilian real
const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    }).format(value);
};

// For the BJ goal
const formatSubtitleValue = (value: number | string, type: "currency" | "text") => {
    if (type === "currency" && typeof value === "number") {
        return formatCurrency(value);
    }

    return String(value);
}

export function FinanceCard ({
    title,
    value,
    icon,
    badgeValue,
    badgeType = "positive",
    subtitleLabel,
    subtitleValue,
    subtitleType = "text",
    valueColor = "green",
}: FinanceCardProps) {
    const isNegative = title.toLocaleLowerCase().includes("saldo") && value < 0;

    const hoverStyles = {
        green: "hover:border-emerald-400/50 hover:shadow-[0_10px_28px_rgba(16,185,129,0.25)]",
        blue: "hover:border-sky-400/50 hover:shadow-[0_10px_28px_rgba(56,189,248,0.25)]",
        orange: "hover:border-orange-400/50 hover:shadow-[0_10px_28px_rgba(251,146,60,0.25)]",
        purple: "hover:border-violet-400/50 hover:shadow-[0_10px_28px_rgba(167,139,250,0.25)]",
    };

    const subtitleText = subtitleLabel && subtitleValue !== undefined ? `${subtitleLabel} : ${formatSubtitleValue(subtitleValue, subtitleType)}` : subtitleLabel || "";

    return (
        <div className={cn(
            "font-sans relative rounded-[20px] border bg-[#071C2F] px-6 py-6 transition-all duration-300 hover:-translate-y-1 hover:scale-[1.015]",
            isNegative ? "border-red-500/40 bg-red-950/20 hover:border-red-400/60 hover:shadow-[0_10px_28px_rgba(248,113,113,0.22)]" : "border-[#1E3A5F]", 
            !isNegative && hoverStyles[valueColor]
        )}>
            <div className="mb-6 flex items-start justify-between">
                <div className="flex items-center gap-2">
                    {icon}
                    {isNegative && (
                        <AlertTriangle className="h-4 w-4 text-red-400" />
                    )}
                </div>

                {badgeValue !== undefined && (
                    <span className={cn(
                        "rounded-full px-3 py-1 text-[11px] font-semibold",
                        badgeType === "positive" && "bg-emerald-500/10 text-emerald-400",
                        badgeType === "negative" && "bg-red-500/10 text-red-400",
                        badgeType === "neutral" && "bg-slate-500/10 text-slate-300"
                    )}>
                        {badgeValue > 0 ? "+" : ""}
                        {badgeValue}%
                    </span>
                )}
            </div>

            <div>
                <p className="mb-2 text-xs font-normal text-slate-400/70">{title}</p>
                <h3 className={cn(
                    "mb-2.5 text-[1.75rem] font-semibold tracking-[-0.5px] leading-none",
                    isNegative && "text-red-400",
                    !isNegative && valueColor === "green" && "text-emerald-400",
                    !isNegative && valueColor === "blue" && "text-sky-400",
                    !isNegative && valueColor === "orange" && "text-orange-400",
                    !isNegative && valueColor === "purple" && "text-violet-400"
                )}>{formatCurrency(value)}</h3>

                {subtitleText && (
                    <p className="text-xs text-slate-400/60">{subtitleText}</p>
                )}
            </div>
        </div>
    );
}