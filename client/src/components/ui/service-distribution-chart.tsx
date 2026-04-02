import { cn } from "@/lib/utils";
import { BarChart3 } from "lucide-react";

interface ServiceDistributionItem {
  name: string;
  value: number;
}

interface ServiceDistributionChartProps {
  data: ServiceDistributionItem[];
  title?: string;
  className?: string;
}

const BAR_COLORS = [
  "hsl(199, 89%, 48%)",
  "hsl(174, 72%, 56%)",
  "hsl(160, 72%, 50%)",
  "hsl(45, 93%, 58%)",
  "hsl(262, 83%, 58%)",
  "hsl(20, 88%, 60%)",
  "hsl(340, 82%, 60%)",
  "hsl(210, 90%, 62%)",
];

export function ServiceDistributionChart({
  data,
  title = "Distribuição por Tipo de Serviço",
  className,
}: ServiceDistributionChartProps) {
  const normalized = data
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value);

  const topLimit = 10;
  const topItems = normalized.slice(0, topLimit);
  const othersTotal = normalized.slice(topLimit).reduce((acc, item) => acc + item.value, 0);

  const chartData = othersTotal > 0 ? [...topItems, { name: "Outros", value: othersTotal }] : topItems;
  const hasData = chartData.length > 0;
  const maxValue = Math.max(1, ...chartData.map((item) => item.value));

  return (
    <div
      className={cn(
        "rounded-2xl bg-gradient-to-br from-slate-800/40 to-slate-900/30 backdrop-blur-md border border-cyan-500/30 p-6 hover:border-cyan-400/50 transition-all duration-300 shadow-lg",
        className,
      )}
    >
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="h-5 w-5 text-cyan-300" />
        <h3 className="text-xl font-semibold text-cyan-100">{title}</h3>
      </div>
      {hasData ? (
        <div className="space-y-3">
          {chartData.map((item, index) => {
            const width = Math.max(8, Math.round((item.value / maxValue) * 100));
            return (
              <div key={item.name} className="space-y-1.5">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-slate-100 truncate">{item.name}</span>
                  <span className="text-cyan-200 font-semibold">{item.value}</span>
                </div>
                <div className="h-3 rounded-full bg-slate-900/70 overflow-hidden border border-slate-700">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${width}%`, backgroundColor: BAR_COLORS[index % BAR_COLORS.length] }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="h-[260px] flex items-center justify-center text-sm text-slate-400 border border-dashed border-slate-600 rounded-xl bg-slate-900/30">
          Sem dados suficientes para exibir este gráfico.
        </div>
      )}
    </div>
  );
}
