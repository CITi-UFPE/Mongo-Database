import { cn } from "@/lib/utils";
import { Calculator, TrendingUp, AlertTriangle, DollarSign } from "lucide-react";

interface RealisticForecastProps {
  pipelineValue: number;
  conversionRate: number;
  className?: string;
}

export function RealisticForecast({ pipelineValue, conversionRate, className }: RealisticForecastProps) {
  const realisticForecast = pipelineValue * (conversionRate / 100);
  const optimisticForecast = pipelineValue * ((conversionRate + 10) / 100);
  const pessimisticForecast = pipelineValue * ((conversionRate - 10) / 100);

  return (
    <div className={cn("bg-gradient-to-br from-slate-800/40 to-slate-900/30 backdrop-blur-md border border-cyan-500/30 rounded-2xl p-5 hover:border-cyan-400/50 transition-all duration-300 shadow-lg", className)}>
      <div className="flex items-center gap-3 mb-5">
        <div className="bg-gradient-to-br from-cyan-600/40 to-blue-600/30 text-cyan-300 rounded-lg p-2 border border-cyan-500/30 backdrop-blur-md">
          <Calculator className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-semibold text-cyan-100">Previsão Realista</h3>
          <p className="text-xs text-slate-400">
            Baseado na taxa de conversão de {conversionRate}%
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="bg-gradient-to-br from-cyan-600/30 to-blue-600/20 border border-cyan-400/40 rounded-xl p-4 backdrop-blur-md shadow-md">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-cyan-300" />
              <span className="text-sm text-slate-300">Previsão Real</span>
            </div>
            <span className="text-xs bg-cyan-600/30 text-cyan-200 px-2 py-1 rounded-full border border-cyan-500/20">
              Mais Provável
            </span>
          </div>
          <p className="text-3xl font-bold bg-gradient-to-r from-cyan-300 to-blue-300 bg-clip-text text-transparent">
            R$ {realisticForecast.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            {conversionRate}% de R$ {pipelineValue.toLocaleString('pt-BR')}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gradient-to-br from-emerald-600/30 to-emerald-500/20 border border-emerald-400/40 rounded-xl p-3 backdrop-blur-md">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-emerald-300" />
              <span className="text-xs text-emerald-200">Otimista</span>
            </div>
            <p className="text-lg font-semibold text-emerald-300">
              R$ {optimisticForecast.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
            </p>
            <p className="text-xs text-slate-400">{conversionRate + 10}% conversão</p>
          </div>

          <div className="bg-gradient-to-br from-orange-600/30 to-orange-500/20 border border-orange-400/40 rounded-xl p-3 backdrop-blur-md">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4 text-orange-300" />
              <span className="text-xs text-orange-200">Pessimista</span>
            </div>
            <p className="text-lg font-semibold text-orange-300">
              R$ {pessimisticForecast.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
            </p>
            <p className="text-xs text-slate-400">{conversionRate - 10}% conversão</p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-cyan-600/20 to-blue-600/15 border border-cyan-500/30 rounded-xl p-3 flex items-start gap-2 backdrop-blur-sm">
          <AlertTriangle className="w-4 h-4 text-cyan-300 mt-0.5" />
          <p className="text-xs text-cyan-200/80">
            <strong>💡 Importante:</strong> O valor total no pipeline (R$ {pipelineValue.toLocaleString('pt-BR')}) representa o
            <span className="text-cyan-300 font-semibold"> potencial máximo</span>, não o dinheiro garantido.
          </p>
        </div>
      </div>
    </div>
  );
}
