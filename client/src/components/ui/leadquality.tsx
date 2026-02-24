// src/components/ui/leadquality.tsx
import { cn } from "@/lib/utils";
import { Target, CheckCircle2, XCircle, Clock, TrendingUp } from "lucide-react";

// Definição de tipos para o TypeScript
interface LeadStatusCardProps {
  total?: number;
  qualified?: number;
  unqualified?: number;
  pending?: number;
  label?: string;
  className?: string; // O '?' torna opcional, resolvendo o erro do build
}

export function LeadStatusCard({ 
  total = 0, 
  qualified = 0, 
  unqualified = 0, 
  pending = 0,
  label = "Leads",
  className = "" 
}: LeadStatusCardProps) {
  // Cálculos de porcentagem
  const qualifiedPercentage = total > 0 ? ((qualified / total) * 100).toFixed(0) : "0";
  const unqualifiedPercentage = total > 0 ? ((unqualified / total) * 100) : 0;
  const pendingPercentage = total > 0 ? ((pending / total) * 100) : 0;

  return (
    <div className={cn(
      "relative overflow-hidden rounded-2xl p-6 md:p-8",
      "bg-gradient-to-br from-slate-800 via-slate-700 to-slate-800",
      "border border-slate-600/50 shadow-2xl",
      className
    )}>
      {/* Efeitos de fundo (Glow) */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl opacity-50"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl opacity-50"></div>

      <div className="relative z-10 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl p-3 shadow-lg">
              <Target className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-white">{label}</h2>
              <p className="text-slate-300 text-sm">Distribuição de qualidade</p>
            </div>
          </div>
          
          <div className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-2 px-3 py-1 rounded-full font-bold text-lg">
            <TrendingUp className="w-5 h-5" />
            <span>{qualifiedPercentage}% Bons</span>
          </div>
        </div>

        {/* Grid de Valores */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-slate-700/30 backdrop-blur-sm rounded-lg p-4 border border-slate-600/30 text-center">
            <p className="text-slate-400 text-xs font-medium mb-1 uppercase tracking-wider">Total</p>
            <p className="text-2xl font-bold text-white">{total}</p>
          </div>
          <div className="bg-emerald-500/10 backdrop-blur-sm rounded-lg p-4 border border-emerald-500/20 text-center">
            <p className="text-emerald-400 text-xs font-medium mb-1 uppercase tracking-wider">Bons</p>
            <p className="text-2xl font-bold text-emerald-400">{qualified}</p>
          </div>
          <div className="bg-rose-500/10 backdrop-blur-sm rounded-lg p-4 border border-rose-500/20 text-center">
            <p className="text-rose-400 text-xs font-medium mb-1 uppercase tracking-wider">Ruins</p>
            <p className="text-2xl font-bold text-rose-400">{unqualified}</p>
          </div>
        </div>

        {/* Barra de Progresso */}
        <div className="space-y-3">
          <div className="relative h-4 bg-slate-900/50 rounded-full overflow-hidden border border-slate-600/30 flex">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-700"
              style={{ width: `${qualifiedPercentage}%` }}
            />
            <div
              className="h-full bg-gradient-to-r from-rose-500 to-orange-400 transition-all duration-700"
              style={{ width: `${unqualifiedPercentage}%` }}
            />
            <div
              className="h-full bg-slate-500 transition-all duration-700"
              style={{ width: `${pendingPercentage}%` }}
            />
          </div>

          <div className="flex justify-between text-xs font-medium px-1">
            <div className="flex items-center gap-1.5 text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Qualificados ({qualified})</span>
            </div>
            <div className="flex items-center gap-1.5 text-rose-400">
              <XCircle className="w-3.5 h-3.5" />
              <span>Ruins ({unqualified})</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-400">
              <Clock className="w-3.5 h-3.5" />
              <span>Pendentes ({pending})</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}