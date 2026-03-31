import { cn } from "@/lib/utils";
import { AlertCircle } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

interface LostReason {
  motivo?: string;
  quantidade?: number;
  reason?: string;
  count?: number;
  percentage?: number;
  icon?: "price" | "time" | "competitor" | "other";
}

interface LostLeadsBreakdownProps {
  total: number;
  reasons: LostReason[];
  totalValue: number;
  className?: string;
}

export function LostLeadsBreakdown({
  total,
  reasons,
  totalValue,
  className,
}: LostLeadsBreakdownProps) {
  const colors = [
    "hsl(0, 72%, 51%)",
    "hsl(29, 73%, 43%)",
    "hsl(16, 98%, 40%)",
    "hsl(0, 100%, 48%)",
  ];

  const normalizedReasons = reasons.map((item) => ({
    reason: item.reason ?? item.motivo ?? "Não informado",
    count: item.count ?? item.quantidade ?? 0,
    percentage: item.percentage ?? 0,
    icon: item.icon ?? "other",
  }));

  const chartData = normalizedReasons
    .filter((item) => item.count > 0)
    .map((item, index) => ({
      name: item.reason,
      value: item.count,
      color: colors[index % colors.length],
    }));

  const hasData = chartData.length > 0;

  return (
    <div
      className={cn(
        "bg-gradient-to-br from-slate-800/40 to-slate-900/30 backdrop-blur-md border border-red-500/30 rounded-2xl p-5 hover:border-red-400/50 transition-all duration-300 shadow-lg",
        className
      )}
    >
      <div className="flex items-center gap-3 mb-5">
        <div className="bg-gradient-to-br from-red-600/40 to-orange-600/30 text-red-300 rounded-lg p-2 border border-red-500/30 backdrop-blur-md">
          <AlertCircle className="w-5 h-5" />
        </div>
        <h3 className="font-semibold text-red-100">Motivos de Perda</h3>
      </div>

      <div className="h-[280px]">
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                outerRadius={90}
                dataKey="value"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}`}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(222, 47%, 12%)",
                  border: "1px solid hsl(0, 72%, 51%)",
                  borderRadius: "8px",
                }}
                formatter={(value: any) => [`${value} leads`, "Quantidade"]}
                labelStyle={{ color: "hsl(0, 72%, 68%)" }}
              />
              <Legend
                wrapperStyle={{ paddingTop: "10px" }}
                formatter={(value: any) => `${value}`}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-red-400">
            Sem perdas mapeadas
          </div>
        )}
      </div>

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