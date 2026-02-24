import { cn } from "@/lib/utils";
import { Target, TrendingUp } from "lucide-react";

interface ProgressGoalProps {
  current: number;
  goal: number;
  label: string;
  className?: string;
}

export function ProgressGoal({ current, goal, label, className }: ProgressGoalProps) {
  const percentage = Math.min((current / goal) * 100, 100);
  const remaining = Math.max(goal - current, 0);
  const isOnTrack = percentage >= 75;

  return (
    <div className={cn("bg-gradient-to-br from-slate-800/40 to-slate-900/30 backdrop-blur-md border border-blue-500/30 rounded-2xl p-5 hover:border-blue-400/50 transition-all duration-300 shadow-lg", className)}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-blue-600/40 to-cyan-600/30 text-cyan-300 rounded-lg p-2 border border-blue-500/30">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-blue-100">{label}</h3>
            <p className="text-xs text-slate-400">Meta mensal</p>
          </div>
        </div>
        <div className={cn(
          "flex items-center gap-1 text-sm font-medium px-3 py-1 rounded-full backdrop-blur-sm",
          isOnTrack ? "bg-emerald-600/30 text-emerald-300 border border-emerald-500/30" : "bg-orange-600/30 text-orange-300 border border-orange-500/30"
        )}>
          <TrendingUp className="w-4 h-4" />
          <span>{percentage.toFixed(0)}%</span>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-slate-400">Realizado</span>
          <span className="font-semibold text-blue-300">
            R$ {current.toLocaleString('pt-BR')}
          </span>
        </div>

        <div className="relative h-3 bg-slate-700/50 rounded-full overflow-hidden border border-slate-600/30">
          <div
            className={cn(
              "absolute left-0 top-0 h-full rounded-full transition-all duration-500",
              isOnTrack ? "bg-gradient-to-r from-emerald-500 to-emerald-400" : "bg-gradient-to-r from-cyan-500 to-blue-400"
            )}
            style={{ width: `${percentage}%` }}
          />
          <div
            className="absolute top-0 h-full w-0.5 bg-slate-300/30"
            style={{ left: '100%', transform: 'translateX(-100%)' }}
          />
        </div>

        <div className="flex justify-between text-sm">
          <span className="text-slate-400">Meta</span>
          <span className="font-medium text-cyan-300">
            R$ {goal.toLocaleString('pt-BR')}
          </span>
        </div>

        <div className={cn(
          "mt-4 p-4 rounded-lg text-sm backdrop-blur-sm border-2 font-semibold shadow-lg",
          isOnTrack ? "bg-emerald-600/30 border-emerald-500/50 text-emerald-100 shadow-emerald-500/20" : "bg-orange-600/30 border-orange-500/50 text-orange-100 shadow-orange-500/20"
        )}>
          {isOnTrack ? (
            <p>
              🎯 <strong>Excelente!</strong> Faltam apenas <span className="text-emerald-300 font-bold">R$ {remaining.toLocaleString('pt-BR')}</span> para bater a meta!
            </p>
          ) : (
            <p>
              ⚠️ <strong>Atenção urgente!</strong> Ainda faltam <span className="text-orange-300 font-bold">R$ {remaining.toLocaleString('pt-BR')}</span> para bater a meta.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
