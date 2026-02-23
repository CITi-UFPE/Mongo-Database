import { cn } from "@/lib/utils";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

interface LeadSource {
  name: string;
  value: number;
  color: string;
  [key: string]: string | number;
}

interface LeadSourcesChartProps {
  data: LeadSource[];
  className?: string;
}

export function LeadSourcesChart({ data, className }: LeadSourcesChartProps) {
  return (
    <div className={cn("h-[320px] rounded-2xl bg-gradient-to-br from-slate-800/40 to-slate-900/30 backdrop-blur-md border border-cyan-500/30 p-6 hover:border-cyan-400/50 transition-all duration-300 shadow-lg", className)}>
      <h3 className="text-xl font-semibold text-cyan-100 mb-2">Origens de Leads</h3>
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie 
            data={data} 
            cx="50%" 
            cy="50%" 
            outerRadius={80} 
            dataKey="value"
            labelLine={false}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={{
              backgroundColor: "hsl(222, 47%, 12%)",
              border: "1px solid hsl(199, 89%, 48%)",
              borderRadius: "8px"
            }}
            formatter={(value: any) => [`${value} leads`, "Quantidade"]}
            labelStyle={{ color: "hsl(199, 89%, 68%)" }}
          />
          <Legend 
            wrapperStyle={{ paddingTop: '10px' }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );}