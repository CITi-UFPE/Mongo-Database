import { cn } from "@/lib/utils";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from "recharts";

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

  return (
    <div
      className={cn(
        "rounded-2xl bg-gradient-to-br from-slate-800/40 to-slate-900/30 backdrop-blur-md border border-cyan-500/30 p-6 hover:border-cyan-400/50 transition-all duration-300 shadow-lg",
        className,
      )}
    >
      <h3 className="text-xl font-semibold text-cyan-100 mb-2">{title}</h3>
      {hasData ? (
        <ResponsiveContainer width="100%" height={Math.max(320, chartData.length * 34)}>
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 8, right: 16, left: 24, bottom: 8 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 47%, 27%)" horizontal={false} />
            <XAxis
              type="number"
              tick={{ fill: "hsl(215, 20%, 75%)", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={180}
              tick={{ fill: "hsl(215, 20%, 85%)", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(222, 47%, 12%)",
                border: "1px solid hsl(199, 89%, 48%)",
                borderRadius: "8px",
              }}
              formatter={(value: number) => [`${value} leads`, "Quantidade"]}
              labelStyle={{ color: "hsl(199, 89%, 68%)" }}
            />
            <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={18}>
              {chartData.map((entry, index) => (
                <Cell key={`${entry.name}-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-[260px] flex items-center justify-center text-sm text-slate-400 border border-dashed border-slate-600 rounded-xl bg-slate-900/30">
          Sem dados suficientes para exibir este gráfico.
        </div>
      )}
    </div>
  );
}
