import { cn } from "@/lib/utils";
import { BarChart3, Lightbulb } from "lucide-react";

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

  // --- LÓGICA DO INSIGHT INTELIGENTE ---
  const getInsight = () => {
    // Busca o primeiro item que não seja "Outros"
    const topService = normalized.find(item => item.name.toLowerCase() !== 'outros');
    if (!topService) return null;

    const name = topService.name.toLowerCase();
    let category = "soluções personalizadas";
    let message = "apresenta uma demanda latente e alta taxa de interesse.";

    if (name.includes("desenvolvimento") || name.includes("dev") || name.includes("web") || name.includes("mobile") || name.includes("institucional")) {
      category = "Desenvolvimento (Dev)";
      message = "é o pilar central de captação, indicando forte maturidade digital dos leads que buscam sua empresa.";
    } else if (name.includes("ux") || name.includes("ui") || name.includes("design") || name.includes("discovery")) {
      category = "Design & Produto";
      message = "demonstra que seu mercado valoriza a experiência do usuário e a validação de ideias como diferenciais competitivos.";
    } else if (name.includes("dados") || name.includes("ciência") || name.includes("análise") || name.includes("engenharia")) {
      category = "Data Intelligence";
      message = "revela uma audiência qualificada que busca decisões baseadas em evidências e otimização de performance.";
    }

    return (
      <div className="mt-6 flex items-start gap-3 p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
        <Lightbulb className="h-5 w-5 text-cyan-400 shrink-0 mt-0.5" />
        <p className="text-sm text-slate-300 leading-relaxed">
          <strong className="text-cyan-300">{topService.name}</strong> ({category}) é o serviço mais requisitado. Esta tendência indica que sua marca é autoridade nesta área, atraindo leads com alto potencial de conversão.
          <span className="block mt-1 text-xs text-slate-400 italic">{message}</span>
        </p>
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
                  <div className="h-2.5 rounded-full bg-slate-900/70 overflow-hidden border border-slate-700/50">
                    <div
                      className="h-full rounded-full transition-all duration-700 ease-out"
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
          
          {/* Renderização do Insight */}
          {getInsight()}
        </>
      ) : (
        <div className="h-[260px] flex items-center justify-center text-sm text-slate-400 border border-dashed border-slate-600 rounded-xl bg-slate-900/30">
          Sem dados suficientes para exibir este gráfico.
        </div>
      )}
    </div>
  );
}