import { cn } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell, Tooltip, ReferenceLine, Label } from "recharts";
import { Target } from "lucide-react";

interface FunnelStage {
  name: string;
  count: number;
  value: number;
  color: string;
}

interface FunnelChartProps {
  stages: FunnelStage[];
  className?: string;
}

export function FunnelChart({ stages, className }: FunnelChartProps) {
  return (
    <div className={cn("bg-gradient-to-br from-slate-800/40 to-slate-900/30 backdrop-blur-md border border-blue-500/30 rounded-2xl p-5 hover:border-blue-400/50 transition-all duration-300 shadow-lg", className)}>
      <div className="flex items-center gap-3 mb-5">
        <div className="bg-gradient-to-br from-emerald-600/40 to-teal-600/30 text-emerald-300 rounded-lg p-2 border border-emerald-500/30 backdrop-blur-md">
          <Target className="w-5 h-5" />
        </div>
        <h3 className="font-semibold text-blue-100">Distribuição do Funil</h3>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={stages} margin={{ top: 20, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 47%, 27%)" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fill: "hsl(215, 20%, 85%)", fontSize: 12, fontWeight: 500 }}
            axisLine={{ stroke: "hsl(222, 47%, 27%)" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "hsl(215, 20%, 75%)", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip 
            contentStyle={{
              backgroundColor: "hsl(222, 47%, 12%)",
              border: "1px solid hsl(199, 89%, 48%)",
              borderRadius: "8px"
            }}
            cursor={{ fill: "rgba(199, 89%, 48%, 0.1)" }}
            formatter={(value) => [value, "Leads"]}
            labelStyle={{ color: "hsl(199, 89%, 68%)" }}
          />
          <ReferenceLine 
            y={Math.max(...stages.map(s => s.count)) * 0.5} 
            stroke="hsl(199, 89%, 48%)" 
            strokeDasharray="5 5" 
            opacity={0.3}
            label={{ value: "50%", position: "insideTopRight", fill: "hsl(199, 89%, 68%)", fontSize: 11 }}
          />
          <Bar dataKey="count" radius={[10, 10, 0, 0]} barSize={55}>
            {stages.map((stage, index) => (
              <Cell key={`cell-${index}`} fill={stage.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}