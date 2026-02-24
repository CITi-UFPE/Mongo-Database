import { cn } from "@/lib/utils";
import { Target, TrendingUp, Award, Zap } from "lucide-react";

export function ProgressGoal({ 
  current, 
  goal, 
  label, 
  className
}) {
  const percentage = Math.min((current / goal) * 100, 100);
  const remaining = Math.max(goal - current, 0);
  const isOnTrack = percentage >= 75;

  return (
    <div className={cn(
      "relative overflow-hidden rounded-2xl p-6 md:p-8",
      "bg-gradient-to-br from-slate-800 via-slate-700 to-slate-800",
      "border border-slate-600/50 shadow-2xl",
      className
    )}>
      {/* Animated background accent */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl opacity-50"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl opacity-50"></div>

      <div className="relative z-10 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-cyan-500 to-blue-500 rounded-xl p-3 shadow-lg">
                <Target className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-white">{label}</h2>
                <p className="text-slate-300 text-sm">Meta mensal</p>
              </div>
            </div>
          </div>
          <div className={cn(
            "flex items-center gap-2 px-3 py-1 rounded-full font-bold text-lg",
            isOnTrack 
              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" 
              : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
          )}>
            <TrendingUp className="w-5 h-5" />
            <span>{percentage.toFixed(0)}%</span>
          </div>
        </div>

        {/* Main values */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-700/30 backdrop-blur-sm rounded-lg p-4 border border-slate-600/30">
            <p className="text-slate-400 text-xs font-medium mb-1 uppercase tracking-wider">Realizado</p>
            <p className="text-2xl font-bold text-white">
              R$ {(current / 1000).toFixed(0)}K
            </p>
          </div>
          <div className="bg-slate-700/30 backdrop-blur-sm rounded-lg p-4 border border-slate-600/30">
            <p className="text-slate-400 text-xs font-medium mb-1 uppercase tracking-wider">Meta</p>
            <p className="text-2xl font-bold text-white">
              R$ {(goal / 1000).toFixed(0)}K
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-3">
          <div className="relative h-3 bg-slate-700/50 rounded-full overflow-hidden border border-slate-600/30">
            <div
              className={cn(
                "absolute left-0 top-0 h-full rounded-full transition-all duration-700 shadow-lg",
                isOnTrack 
                  ? "bg-gradient-to-r from-emerald-400 to-teal-400 shadow-emerald-500/30" 
                  : "bg-gradient-to-r from-amber-400 to-orange-400 shadow-amber-500/30"
              )}
              style={{ width: `${percentage}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-slate-400">
            <span>0</span>
            <span>R$ {goal.toLocaleString('pt-BR')}</span>
          </div>
        </div>

        {/* Status Message */}
        <div className={cn(
          "p-4 rounded-lg border backdrop-blur-sm flex items-start gap-3",
          isOnTrack
            ? "bg-emerald-500/10 border-emerald-500/30"
            : "bg-amber-500/10 border-amber-500/30"
        )}>
          <div className="mt-0.5">
            {isOnTrack ? (
              <Award className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            ) : (
              <Zap className="w-5 h-5 text-amber-400 flex-shrink-0" />
            )}
          </div>
          <div className="flex-1">
            {isOnTrack ? (
              <div>
                <p className="font-bold text-emerald-300">🎯 Excelente!</p>
                <p className="text-emerald-200 text-sm">
                  Faltam apenas <span className="font-bold">R$ {remaining.toLocaleString('pt-BR')}</span> para bater a meta!
                </p>
              </div>
            ) : (
              <div>
                <p className="font-bold text-amber-300">⚠️ Atenção!</p>
                <p className="text-amber-200 text-sm">
                  Faltam <span className="font-bold">R$ {remaining.toLocaleString('pt-BR')}</span> para atingir sua meta.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
