import { cn } from "@/lib/utils";
import { Lightbulb, TrendingUp, AlertTriangle, CheckCircle } from "lucide-react";

interface Insight {
  type: "success" | "warning" | "info";
  message: string;
}

interface InsightsCardProps {
  insights: Insight[];
  className?: string;
}

export function InsightsCard({ insights, className }: InsightsCardProps) {
  const getIcon = (type: string) => {
    switch (type) {
      case "success": return <CheckCircle className="w-4 h-4" />;
      case "warning": return <AlertTriangle className="w-4 h-4" />;
      default: return <TrendingUp className="w-4 h-4" />;
    }
  };

  return (
    <div className={cn("bg-gradient-to-br from-slate-800/40 to-slate-900/30 backdrop-blur-md border border-cyan-500/30 rounded-2xl p-5 hover:border-cyan-400/50 transition-all duration-300 shadow-lg", className)}>
      <div className="flex items-center gap-3 mb-4">
        <div className="bg-gradient-to-br from-cyan-600/40 to-blue-600/30 text-cyan-300 rounded-lg p-2 border border-cyan-500/30 backdrop-blur-md">
          <Lightbulb className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-semibold text-cyan-100">Insights do CRM</h3>
          <p className="text-xs text-slate-400">Análise automática</p>
        </div>
      </div>

      <div className="space-y-3">
        {insights.map((insight, index) => (
          <div
            key={index}
            className={cn(
              "flex items-start gap-3 p-3 rounded-lg text-sm border backdrop-blur-sm",
              insight.type === "success" && "bg-emerald-600/20 text-emerald-200 border-emerald-500/30",
              insight.type === "warning" && "bg-orange-600/20 text-orange-200 border-orange-500/30",
              insight.type === "info" && "bg-blue-600/20 text-blue-200 border-blue-500/30"
            )}
          >
            {getIcon(insight.type)}
            <span>{insight.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}