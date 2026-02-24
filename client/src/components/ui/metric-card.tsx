import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { TrendingUp } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: "default" | "primary" | "highlight";
  tooltip?: string;
  className?: string;
}

export function MetricCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  variant = "default",
  tooltip,
  className,
}: MetricCardProps) {
  return (
    <div
      className={cn(
        "relative rounded-2xl p-5 transition-all duration-300 bg-slate-800/25 backdrop-blur-md border border-blue-500/25 hover:border-blue-400/50",
        className
      )}
      title={tooltip}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={cn(
          "rounded-lg p-2.5 backdrop-blur-md border",
          variant === "highlight" && "bg-emerald-600/25 text-emerald-300 border-emerald-500/30",
          variant === "primary" && "bg-orange-600/25 text-orange-300 border-orange-500/30",
          variant === "default" && "bg-blue-600/25 text-blue-300 border-blue-500/30",
        )}>
          {icon}
        </div>
        {trend && (
          <TrendingUp className={cn(
            "w-5 h-5",
            trend.isPositive ? "text-success" : "text-danger"
          )} />
        )}
      </div>

      <p className="text-xs font-medium text-slate-400 mb-1">
        {title}
      </p>
      <p className={cn(
        "text-2xl font-bold tracking-tight bg-clip-text text-transparent",
        variant === "highlight" && "bg-gradient-to-r from-emerald-300 to-cyan-300",
        variant === "primary" && "bg-gradient-to-r from-orange-300 to-amber-300",
        variant === "default" && "bg-gradient-to-r from-blue-300 to-cyan-300"
      )}>
        {value}
      </p>
      {subtitle && (
        <p className="text-xs text-slate-400 mt-1">
          {subtitle}
        </p>
      )}
    </div>
  );
}
