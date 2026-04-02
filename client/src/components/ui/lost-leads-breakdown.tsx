import { cn } from "@/lib/utils";
import { AlertCircle } from "lucide-react";

interface LostReason {
  reason: string;
  count: number;
  percentage: number;
  icon: "price" | "time" | "competitor" | "other";
}

interface LostLeadsBreakdownProps {
  total: number;
  reasons: LostReason[];
  totalValue: number;
  className?: string;
}

export function LostLeadsBreakdown({ total, reasons, totalValue, className }: LostLeadsBreakdownProps) {
  // Cores para os diferentes motivos de perda
  const colors = ["hsl(0, 72%, 51%)", "hsl(29, 73%, 43%)", "hsl(16, 98%, 40%)", "hsl(0, 100%, 48%)"];
  
  // Preparar dados para o gráfico
  const chartData = reasons
    .filter((reason) => reason.count > 0)
    .map((reason, index) => ({
    name: reason.reason,
    value: reason.count,
    color: colors[index % colors.length]
    }))
    .sort((a, b) => b.value - a.value);

  const hasData = chartData.length > 0;
  const maxValue = Math.max(1, ...chartData.map((item) => item.value));

  return (
    <div className={cn("bg-gradient-to-br from-slate-800/40 to-slate-900/30 backdrop-blur-md border border-red-500/30 rounded-2xl p-5 hover:border-red-400/50 transition-all duration-300 shadow-lg", className)}>
      <div className="flex items-center gap-3 mb-5">
        <div className="bg-gradient-to-br from-red-600/40 to-orange-600/30 text-red-300 rounded-lg p-2 border border-red-500/30 backdrop-blur-md">
          <AlertCircle className="w-5 h-5" />
        </div>
        <h3 className="font-semibold text-red-100">Motivos de Perda</h3>
      </div>

      {hasData ? (
        <div className="space-y-3">
          {chartData.map((item) => {
            const width = Math.max(8, Math.round((item.value / maxValue) * 100));
            return (
              <div key={item.name} className="space-y-1.5">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-red-50 truncate">{item.name}</span>
                  <span className="text-red-200 font-semibold">{item.value}</span>
                </div>
                <div className="h-3 rounded-full bg-slate-900/70 overflow-hidden border border-slate-700">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${width}%`, backgroundColor: item.color }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="h-[280px] flex items-center justify-center text-sm text-slate-400 border border-dashed border-slate-600 rounded-xl bg-slate-900/30">
          Sem dados suficientes para exibir este gráfico.
        </div>
      )}

      <div className="mt-5 p-4 bg-gradient-to-r from-red-600/35 to-orange-600/25 border-2 border-red-500/50 rounded-xl backdrop-blur-sm shadow-lg">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-red-100 font-semibold">
              ⚠️ Total de Leads Perdidos
            </p>
            <p className="text-xs text-red-200/80 mt-1">
              Ação necessária para recuperar oportunidades
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-red-300">{total}</p>
            <p className="text-xs text-red-200 font-semibold">
              R$ {totalValue.toLocaleString("pt-BR")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
