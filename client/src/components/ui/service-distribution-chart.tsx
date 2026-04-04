import { cn } from "@/lib/utils";
import { BarChart3, Lightbulb, Code2, Palette, Database } from "lucide-react";

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

  // --- LÓGICA DE AGRUPAMENTO (CLUSTERS) PARA O INSIGHT ---
  const getGroupedInsight = () => {
    if (normalized.length === 0) return null;

    // Inicializamos os contadores das áreas
    let stats = {
      dev: { total: 0, label: "Desenvolvimento (Dev)", icon: <Code2 className="w-4 h-4 text-blue-400" /> },
      design: { total: 0, label: "Design & UX", icon: <Palette className="w-4 h-4 text-pink-400" /> },
      dados: { total: 0, label: "Data Intelligence", icon: <Database className="w-4 h-4 text-cyan-400" /> }
    };

    normalized.forEach(item => {
      const name = item.name.toLowerCase();
      // Lógica de Soma por Cluster
      if (name.includes("desenvolvimento") || name.includes("dev") || name.includes("site") || name.includes("institucional") || name.includes("mobile")) {
        stats.dev.total += item.value;
      } else if (name.includes("ux") || name.includes("ui") || name.includes("design") || name.includes("discovery")) {
        stats.design.total += item.value;
      } else if (name.includes("dados") || name.includes("ciência") || name.includes("análise") || name.includes("engenharia") || name.includes("data")) {
        stats.dados.total += item.value;
      }
    });

    // Descobrimos qual área ganhou na soma total
    const winnerKey = (Object.keys(stats) as Array<keyof typeof stats>).reduce((a, b) => 
      stats[a].total > stats[b].total ? a : b
    );
    
    const winner = stats[winnerKey];

    // Textos personalizados por área campeã
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
          <div className="space-y-4">
            {chartData.map((item, index) => {
              const width = Math.max(8, Math.round((item.value / maxValue) * 100));
              const isOther = item.name === "Outros";
              
              return (
                <div key={item.name} className="space-y-2">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className={cn("text-slate-100 truncate", isOther && "text-slate-400")}>
                      {item.name}
                    </span>
                    <span className="text-cyan-200 font-semibold">{item.value}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-900/70 overflow-hidden border border-slate-700/50">
                    <div
                      className="h-full rounded-full transition-all duration-1000 ease-in-out"
                      style={{ 
                        width: `${width}%`, 
                        backgroundColor: isOther ? "hsl(215, 15%, 50%)" : BAR_COLORS[index % BAR_COLORS.length] 
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Insight Baseado na Soma dos Clusters */}
          {getGroupedInsight()}
        </>
      ) : (
        <div className="h-[260px] flex items-center justify-center text-sm text-slate-400 border border-dashed border-slate-600 rounded-xl bg-slate-900/30">
          Sem dados suficientes para exibir este gráfico.
        </div>
      )}
    </div>
  );
}