import { cn } from "@/lib/utils";
import { BarChart3 } from "lucide-react";
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

interface LeadSource {
  name: string;
  value: number;
  color: string;
  [key: string]: string | number;
}

interface LeadSourcesChartProps {
  data: LeadSource[];
  title?: string;
  className?: string;
}

const DEFAULT_LEAD_SOURCE_COLORS = [
  "#22d3ee",
  "#3b82f6",
  "#22c55e",
  "#facc15",
  "#8b5cf6",
  "#2dd4bf",
  "#f97316",
  "#ec4899",
  "#d946ef",
  "#a3e635",
];

export function LeadSourcesChart({ data, title = "Origens de Leads", className }: LeadSourcesChartProps) {
  const chartData = data.filter((item) => item.value > 0).map((item, index) => ({
    ...item,
    color: item.color || DEFAULT_LEAD_SOURCE_COLORS[index % DEFAULT_LEAD_SOURCE_COLORS.length],
  }));
  const hasData = chartData.length > 0;

  const renderLegend = () => (
    <div className="grid grid-cols-2 gap-x-4 gap-y-2 pt-2 sm:grid-cols-3 xl:grid-cols-5">
      {chartData.map((item) => (
        <div key={item.name} className="flex items-center gap-2 text-sm">
          <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
          <span className="truncate text-slate-200">{item.name}</span>
        </div>
      ))}
    </div>
  );

  return (
    <div className={cn("rounded-2xl bg-[#111827] border border-slate-700/80 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.35)] transition-all duration-300 hover:border-cyan-400/40", className)}>
      <div className="flex items-center gap-2 mb-5">
        <BarChart3 className="h-5 w-5 text-cyan-300" />
        <h3 className="text-xl font-semibold text-slate-100">{title}</h3>
      </div>
      {hasData ? (
        <div className="flex flex-col gap-4">
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#111827",
                    border: "1px solid rgba(34, 211, 238, 0.35)",
                    borderRadius: "12px",
                    color: "#f8fafc",
                  }}
                  labelStyle={{ color: "#67e8f9", fontWeight: 600 }}
                  itemStyle={{ color: "#e2e8f0" }}
                  formatter={(value: number, name: string) => [value, name]}
                />
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={72}
                  outerRadius={112}
                  paddingAngle={2}
                  cornerRadius={4}
                  startAngle={90}
                  endAngle={450}
                  stroke="#111827"
                  strokeWidth={2}
                >
                  {chartData.map((item) => (
                    <Cell key={item.name} fill={item.color} />
                  ))}
                </Pie>
                <Legend content={renderLegend} verticalAlign="bottom" align="center" />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="text-xs text-slate-400 text-center sm:text-left">
            Distribuição de entradas por origem, mantendo a ordem do painel e as cores do resumo.
          </div>
        </div>
      ) : (
        <div className="h-[280px] flex items-center justify-center text-sm text-slate-400 border border-dashed border-slate-600 rounded-xl bg-slate-900/30">
          Sem dados suficientes para exibir este gráfico.
        </div>
      )}
    </div>
  );
}