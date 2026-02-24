import { cn } from "@/lib/utils";
import { Clock, AlertCircle, CheckCircle } from "lucide-react";

interface Stage {
  name: string;
  avgDays: number;
  leads: number;
  maxDays: number;
}

interface StageTimeMetricsProps {
  stages: Stage[];
  className?: string;
}

export function StageTimeMetrics({ stages, className }: StageTimeMetricsProps) {
  const getStatusColor = (avgDays: number, maxDays: number) => {
    const ratio = avgDays / maxDays;
    if (ratio <= 0.5) return "success";
    if (ratio <= 0.8) return "warning";
    return "danger";
  };

  return (
    <div className={cn("bg-gradient-to-br from-slate-800/40 to-slate-900/30 backdrop-blur-md border border-blue-500/30 rounded-2xl p-5 hover:border-blue-400/50 transition-all duration-300 shadow-lg", className)}>
      <div className="flex items-center gap-3 mb-5">
        <div className="bg-gradient-to-br from-orange-600/40 to-amber-600/30 text-orange-300 rounded-lg p-2 border border-orange-500/30 backdrop-blur-md">
          <Clock className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-semibold text-orange-100">Tempo por Estágio</h3>
          <p className="text-xs text-slate-400">
            Tempo médio que leads ficam parados
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {stages.map((stage) => {
          const status = getStatusColor(stage.avgDays, stage.maxDays);
          const percentage = (stage.avgDays / stage.maxDays) * 100;

          return (
            <div key={stage.name} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-blue-200">{stage.name}</span>
                  <span className="text-xs text-slate-400">
                    ({stage.leads} leads)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "text-sm font-semibold",
                    status === "success" && "text-emerald-300",
                    status === "warning" && "text-orange-300",
                    status === "danger" && "text-red-300"
                  )}>
                    {stage.avgDays} dias
                  </span>
                  {status === "danger" && (
                    <AlertCircle className="w-4 h-4 text-red-300" />
                  )}
                  {status === "success" && (
                    <CheckCircle className="w-4 h-4 text-emerald-300" />
                  )}
                </div>
              </div>

              <div className="relative h-2 bg-slate-700/40 rounded-full overflow-hidden border border-slate-600/30">
                <div
                  className={cn(
                    "absolute left-0 top-0 h-full rounded-full transition-all duration-500",
                    status === "success" && "bg-gradient-to-r from-emerald-500 to-emerald-400",
                    status === "warning" && "bg-gradient-to-r from-orange-500 to-orange-400",
                    status === "danger" && "bg-gradient-to-r from-red-500 to-red-400"
                  )}
                  style={{ width: `${Math.min(percentage, 100)}%` }}
                />
                <div
                  className="absolute top-0 h-full w-0.5 bg-slate-300/30"
                  style={{ left: '50%' }}
                  title={`Ideal: ${Math.floor(stage.maxDays / 2)} dias`}
                />
              </div>

              <div className="flex justify-between text-xs text-slate-400">
                <span>0 dias</span>
                <span>Máx: {stage.maxDays} dias</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-5 p-4 bg-gradient-to-r from-red-600/30 to-orange-600/20 border-2 border-red-500/50 rounded-xl backdrop-blur-sm shadow-lg">
        <p className="text-sm text-red-100 flex items-center gap-3 font-semibold">
          <AlertCircle className="w-5 h-5 text-red-300 flex-shrink-0" />
          <span>
            ⚠️ <strong>Atenção urgente:</strong> Leads parados muito tempo tendem a esfriar.
            Priorize os estágios em vermelho!
          </span>
        </p>
      </div>
    </div>
  );
}
