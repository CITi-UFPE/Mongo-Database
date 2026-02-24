import { cn } from "@/lib/utils";
import { Clock, AlertCircle } from "lucide-react";

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
    <div className={cn("bg-[#0f172a] border border-slate-800 rounded-xl p-6", className)}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="bg-amber-500/10 text-amber-500 rounded-lg p-2.5">
          <Clock className="w-6 h-6" />
        </div>
        <div>
          <h3 className="font-bold text-lg text-white">Tempo por Estágio</h3>
          <p className="text-sm text-slate-400">
            Tempo médio que leads ficam parados
          </p>
        </div>
      </div>

      {/* List of Stages */}
      <div className="space-y-8">
        {stages.map((stage) => {
          const status = getStatusColor(stage.avgDays, stage.maxDays);
          const percentage = (stage.avgDays / stage.maxDays) * 100;
          
          return (
            <div key={stage.name} className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white">{stage.name}</span>
                  <span className="text-xs text-slate-500">
                    ({stage.leads} leads)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "text-sm font-bold",
                    status === "success" && "text-emerald-400",
                    status === "warning" && "text-amber-400",
                    status === "danger" && "text-rose-500"
                  )}>
                    {stage.avgDays} dias
                  </span>
                  {status === "danger" && (
                    <AlertCircle className="w-4 h-4 text-rose-500" />
                  )}
                </div>
              </div>
              
              {/* Progress Bar Area */}
              <div className="relative">
                <div className="h-2.5 w-full bg-slate-800/50 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-700 ease-in-out",
                      status === "success" && "bg-emerald-400",
                      status === "warning" && "bg-amber-400",
                      status === "danger" && "bg-rose-500"
                    )}
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                  />
                </div>
                {/* Mid-point marker */}
                <div 
                  className="absolute top-0 h-full w-[1px] bg-slate-600"
                  style={{ left: '50%' }}
                />
              </div>
              
              <div className="flex justify-between text-[10px] uppercase tracking-wider font-medium text-slate-500">
                <span>0 dias</span>
                <span>Máx: {stage.maxDays} dias</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Alert */}
      <div className="mt-8 p-4 bg-rose-500/5 border border-rose-500/20 rounded-lg">
        <p className="text-xs text-rose-400/90 flex items-start gap-3 leading-relaxed">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>
            <strong className="text-rose-400">Atenção:</strong> Leads parados muito tempo tendem a esfriar. Priorize os estágios em vermelho!
          </span>
        </p>
      </div>
    </div>
  );
}