import { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface FinanceCardProps {
    title: string;
    value: number;
    icon: ReactNode;
    variation?: number; // Porcentagem de variação
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

const getIconColor = (valueColor: string) => {
    const colors = {
        green: "text-emerald-400",
        blue: "text-sky-400",
        orange: "text-orange-400",
        purple: "text-violet-400",
    };
    return colors[valueColor as keyof typeof colors] || colors.green;
};

const getBadgeStyles = (valueColor: string) => {
    const styles = {
        green: "bg-emerald-500/10 text-emerald-300",
        blue: "bg-sky-500/10 text-sky-300",
        orange: "bg-orange-500/10 text-orange-300",
        purple: "bg-violet-500/10 text-violet-300",
    };
    return styles[valueColor as keyof typeof styles] || styles.green;
};

const getValueGradient = (valueColor: string) => {
    const gradients = {
        green: "bg-gradient-to-r from-cyan-300 to-emerald-300",
        blue: "bg-gradient-to-r from-blue-300 to-sky-300",
        orange: "bg-gradient-to-r from-amber-300 to-orange-300",
        purple: "bg-gradient-to-r from-violet-300 to-purple-300",
    };
    return gradients[valueColor as keyof typeof gradients] || gradients.green;
};

const getBorderColor = (valueColor: string) => {
    const colors = {
        green: "border-emerald-500/20",
        blue: "border-sky-500/20",
        orange: "border-orange-500/20",
        purple: "border-violet-500/20",
    };
    return colors[valueColor as keyof typeof colors] || colors.green;
};

const getHoverStyles = (valueColor: string) => {
    const styles = {
        green: "hover:border-emerald-400/40 hover:shadow-[0_8px_24px_rgba(16,185,129,0.15)]",
        blue: "hover:border-sky-400/40 hover:shadow-[0_8px_24px_rgba(56,189,248,0.15)]",
        orange: "hover:border-orange-400/40 hover:shadow-[0_8px_24px_rgba(251,146,60,0.15)]",
        purple: "hover:border-violet-400/40 hover:shadow-[0_8px_24px_rgba(167,139,250,0.15)]",
    };
    return styles[valueColor as keyof typeof styles] || styles.green;
};

export function FinanceCard ({
    title,
    value,
    icon,
    variation,
    subtitleLabel,
    subtitleValue,
    subtitleType = "text",
    valueColor = "green",
}: FinanceCardProps) {
    const isNegative = title.toLocaleLowerCase().includes("saldo") && value < 0;

    const subtitleText = subtitleLabel && subtitleValue !== undefined ? `${subtitleLabel} : ${formatSubtitleValue(subtitleValue, subtitleType)}` : subtitleLabel || "";

    return (
        <div className={cn(
            "font-sans relative rounded-xl border bg-gradient-to-br from-slate-900/60 to-slate-900/40 px-6 py-6 transition-all duration-300 hover:-translate-y-0.5",
            isNegative ? "border-red-500/25 from-red-950/20 to-red-900/10" : cn(getBorderColor(valueColor)), 
            !isNegative && getHoverStyles(valueColor)
        )}>
            {/* Header: Icon + Variation Badge */}
            <div className="mb-5 flex items-start justify-between">
                <div className={cn("text-xl", isNegative ? "text-red-400" : getIconColor(valueColor))}>
                    {icon}
                    {isNegative && (
                        <AlertTriangle className="h-5 w-5 text-red-400" />
                    )}
                </div>

                {variation !== undefined && (
                    <span className={cn(
                        "inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold whitespace-nowrap",
                        getBadgeStyles(valueColor)
                    )}>
                        {variation > 0 ? "+" : ""}
                        {variation}%
                    </span>
                )}
            </div>

            {/* Body: Title + Value + Subtitle */}
            <div>
                {/* Metric Label - Small and Gray */}
                <p className="mb-2 text-xs font-medium text-slate-400">{title}</p>
                
                {/* Main Value - Bold and Colored with Gradient */}
                <h3 className={cn(
                    "mb-3 text-2xl font-bold tracking-tight leading-tight bg-clip-text text-transparent",
                    isNegative && "bg-gradient-to-r from-red-300 to-red-400",
                    !isNegative && getValueGradient(valueColor)
                )}>{formatCurrency(value)}</h3>

                {/* Subtitle - Small and Dark Gray */}
                {subtitleText && (
                    <p className="text-[11px] font-normal text-slate-500">{subtitleText}</p>
                )}
            </div>
        </div>
    );
}