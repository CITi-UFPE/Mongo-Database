import { cn } from "@/lib/utils";
import { Target, TrendingUp } from "lucide-react";

interface ProgressGoalProps {
  current: number;
  goal: number;
  label: string;
  className?: string;
}

export function ProgressGoal({ 
  current, 
  goal, 
  label, 
  className
}: ProgressGoalProps) {
  const percentage = Math.min((current / goal) * 100, 100);
  const remaining = Math.max(goal - current, 0);
  const isOnTrack = percentage >= 75;

  // Formatador para moeda brasileira
  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('pt-BR', { 
      style: 'currency', 
      currency: 'BRL',
      maximumFractionDigits: 0 
    }).format(value);

  return (
    <div className={cn(
      "bg-[#0f172a] border border-slate-800 rounded-xl p-6 shadow-lg relative overflow-hidden group",
      "hover:border-indigo-500/40 transition-all duration-300",
      className
    )}>
      {/* Animated glow background */}
      <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/0 via-indigo-500/5 to-purple-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      <div className="space-y-6 relative z-10">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-[#1e1b4b] p-2.5 rounded-xl border border-indigo-500/20">
              <Target className="w-6 h-6 text-[#a855f7]" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white leading-none">{label}</h2>
              <p className="text-sm text-slate-400 mt-1">Meta mensal</p>
            </div>
          </div>
          
          {/* Badge de Porcentagem */}
          <div className="bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span className="text-emerald-400 font-bold text-sm">{percentage.toFixed(0)}%</span>
          </div>
        </div>

        {/* Valores Realizado vs Meta */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-slate-400 text-sm">Realizado</span>
            <span className="text-white font-bold text-lg">{formatCurrency(current)}</span>
          </div>

          {/* Barra de Progresso */}
          <div className="relative h-2.5 w-full bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-400 rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${percentage}%` }}
            />
          </div>

          <div className="flex justify-between items-center">
            <span className="text-slate-400 text-sm">Meta</span>
            <span className="text-white font-bold text-lg">{formatCurrency(goal)}</span>
          </div>
        </div>

        {/* Feedback Positivo Estilizado conforme a foto */}
        <div className="bg-emerald-500/5 border border-emerald-500/20 p-3 rounded-lg flex items-center gap-2">
          <span className="text-lg">🎯</span>
          <p className="text-emerald-400 text-sm font-medium">
            Excelente! Faltam apenas <span className="font-bold">{formatCurrency(remaining)}</span> para bater a meta!
          </p>
        </div>
      </div>
    </div>
  );
}