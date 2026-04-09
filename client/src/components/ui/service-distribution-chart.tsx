import { cn } from "@/lib/utils";
import { BarChart3, Lightbulb, Code2, Palette, Database } from "lucide-react";
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Cell 
} from "recharts";

interface ServiceDistributionItem {
  name: string;
  value: number;
}

interface ServiceDistributionChartProps {
  data: ServiceDistributionItem[];
  title?: string;
  className?: string;
}

const SERVICE_COLORS = [
  "#2dd4bf",
  "#3b82f6",
  "#22c55e",
  "#facc15",
  "#8b5cf6",
  "#2dd4bf",
  "#f97316",
  "#ec4899",
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

  const rawChartData = othersTotal > 0 ? [...topItems, { name: "Outros", value: othersTotal }] : topItems;
  const hasData = rawChartData.length > 0;

  const chartData = rawChartData.map((item, index) => ({
    ...item,
    color: item.name === "Outros" ? "#475569" : SERVICE_COLORS[index % SERVICE_COLORS.length],
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-800/95 border border-slate-700 p-3 rounded-xl shadow-xl backdrop-blur-md min-w-[120px]">
          <p className="font-semibold text-slate-100 mb-1">{data.name}</p>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: data.color }}></span>
            <p className="text-sm text-slate-200">
              <span className="font-bold">{data.value}</span> <span className="text-slate-400">leads</span>
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  // --- LÓGICA DE AGRUPAMENTO (CLUSTERS) PARA O INSIGHT MANTIDA INTACTA ---
  const getGroupedInsight = () => {
    if (normalized.length === 0) return null;

    let stats = {
      dev: { total: 0, label: "Desenvolvimento (Dev)", icon: <Code2 className="w-4 h-4 text-blue-400" /> },
      design: { total: 0, label: "Design & UX", icon: <Palette className="w-4 h-4 text-pink-400" /> },
      dados: { total: 0, label: "Data Intelligence", icon: <Database className="w-4 h-4 text-cyan-400" /> }
    };

    normalized.forEach(item => {
      const name = item.name.toLowerCase();
      if (name.includes("desenvolvimento") || name.includes("dev") || name.includes("site") || name.includes("institucional") || name.includes("mobile")) {
        stats.dev.total += item.value;
      } else if (name.includes("ux") || name.includes("ui") || name.includes("design") || name.includes("discovery")) {
        stats.design.total += item.value;
      } else if (name.includes("dados") || name.includes("ciência") || name.includes("análise") || name.includes("engenharia") || name.includes("data")) {
        stats.dados.total += item.value;
      }
    });

    const winnerKey = (Object.keys(stats) as Array<keyof typeof stats>).reduce((a, b) => 
      stats[a].total > stats[b].total ? a : b
    );
    
    const winner = stats[winnerKey];

    const messages = {
      dev: "Sua operação possui um perfil focado em construção e escala tecnológica. A alta demanda por desenvolvimento indica que seus leads buscam transformar ideias em produtos robustos e prontos para o mercado.",
      design: "O foco em UX/UI e Discovery revela que sua empresa é percebida como uma parceira estratégica de produto. Seus clientes priorizam a validação e a experiência do usuário antes da codificação.",
      dados: "A área de Dados é o seu maior motor de atração. Isso demonstra um posicionamento premium, onde os leads buscam inteligência competitiva, automação e decisões baseadas em evidências."
    };

    return (
      <div className="mt-8 p-5 rounded-2xl bg-slate-900/50 border border-white/5 backdrop-blur-sm">
        <div className="flex items-center gap-2 mb-3">
          <Lightbulb className="h-5 w-5 text-yellow-400 animate-pulse" />
          <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Insight de Performance</span>
        </div>
        
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-white/5 border border-white/10">
            {winner.icon}
          </div>
          <div>
            <p className="text-sm text-slate-200 leading-relaxed">
              A área de <strong className="text-white">{winner.label}</strong> é o seu principal pilar comercial atualmente, somando <span className="text-cyan-400 font-bold">{winner.total} leads</span> registrados.
            </p>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              {messages[winnerKey]}
            </p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      className={cn(
        "rounded-2xl bg-gradient-to-br from-slate-800/40 to-slate-900/30 backdrop-blur-md border border-cyan-500/30 p-6 hover:border-cyan-400/50 transition-all duration-300 shadow-lg",
        className,
      )}
    >
      <div className="flex items-center gap-2 mb-6">
        <BarChart3 className="h-5 w-5 text-cyan-300" />
        <h3 className="text-xl font-semibold text-cyan-100">{title}</h3>
      </div>
      
      {hasData ? (
        <>
          <div className="h-[360px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  stroke="#94a3b8" 
                  tickLine={false} 
                  axisLine={false} 
                  tick={{ fontSize: 11 }} 
                  interval={0}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis 
                  stroke="#94a3b8" 
                  tickLine={false} 
                  axisLine={false} 
                  tick={{ fontSize: 12 }} 
                />
                <Tooltip 
                  content={<CustomTooltip />} 
                  cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }} 
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={50}>
                  {chartData.map((item) => (
                    <Cell key={item.name} fill={item.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          
          {/* Insight Baseado na Soma dos Clusters */}
          {getGroupedInsight()}
        </>
      ) : (
        <div className="h-[360px] flex flex-col items-center justify-center gap-2 text-sm text-slate-400 border border-dashed border-slate-700/70 rounded-xl bg-slate-800/20">
           <BarChart3 className="w-8 h-8 text-slate-500 mb-1" />
           <p>Nenhum dado disponível no período</p>
        </div>
      )}
    </div>
  );
}