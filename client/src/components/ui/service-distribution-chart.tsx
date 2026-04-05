import { cn } from "@/lib/utils";
import { BarChart3, Lightbulb, Code2, Palette, Database } from "lucide-react";
import { ResponsiveContainer, Treemap, Tooltip } from "recharts";

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

const ROOT_COLOR = "#111827";

type TreemapNode = ServiceDistributionItem & {
  color: string;
  children?: TreemapNode[];
  [key: string]: string | number | TreemapNode[] | undefined;
};

function splitServiceName(name: string) {
  const trimmed = name.trim();
  if (trimmed.length <= 14) {
    return [trimmed];
  }

  const words = trimmed.split(/\s+/);
  if (words.length === 1) {
    return [trimmed.slice(0, 14), trimmed.slice(14)];
  }

  const midpoint = Math.ceil(words.length / 2);
  const firstLine = words.slice(0, midpoint).join(" ");
  const secondLine = words.slice(midpoint).join(" ");

  return secondLine ? [firstLine, secondLine] : [trimmed];
}

function renderTreemapNode(props: any) {
  const { x, y, width, height, name, value, color, depth } = props;

  if (depth === 0 || width <= 0 || height <= 0) {
    return null;
  }

  const isSmall = width < 110 || height < 70;
  const fontSize = isSmall ? 12 : 14;
  const lines = splitServiceName(String(name));
  const showValue = width > 120 && height > 64;
  const labelY = y + height / 2 - (showValue ? 10 : 6);

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={10}
        ry={10}
        fill={color}
        stroke={ROOT_COLOR}
        strokeWidth={2}
      />
      <text
        x={x + width / 2}
        y={labelY}
        textAnchor="middle"
        fill="#ffffff"
        fontSize={fontSize}
        fontWeight={700}
        dominantBaseline="middle"
        stroke="none"
        strokeWidth={0}
        style={{ textShadow: "none" }}
      >
        <tspan x={x + width / 2} dy="0" stroke="none" strokeWidth={0}>
          {lines[0]}
        </tspan>
        {lines[1] ? (
          <tspan x={x + width / 2} dy="14" fontWeight={700} stroke="none" strokeWidth={0}>
            {lines[1]}
          </tspan>
        ) : null}
        {showValue ? (
          <tspan x={x + width / 2} dy="14" fontWeight={700} fontSize={Math.max(11, fontSize - 1)} stroke="none" strokeWidth={0}>
            {value}
          </tspan>
        ) : null}
      </text>
    </g>
  );
}

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
  const treemapData: TreemapNode[] = [
    {
      name: "Total",
      value: chartData.reduce((acc, item) => acc + item.value, 0),
      color: ROOT_COLOR,
      children: chartData.map((item, index) => ({
        ...item,
        color: item.name === "Outros" ? "#475569" : SERVICE_COLORS[index % SERVICE_COLORS.length],
      })),
    },
  ];

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
          <div className="h-[360px] w-full overflow-hidden rounded-2xl border border-slate-700/60 bg-transparent">
            <ResponsiveContainer width="100%" height="100%">
              <Treemap
                data={treemapData as any}
                dataKey="value"
                aspectRatio={4 / 3}
                stroke={ROOT_COLOR}
                content={renderTreemapNode}
              >
                <Tooltip
                  contentStyle={{
                    backgroundColor: ROOT_COLOR,
                    border: "1px solid rgba(34, 211, 238, 0.35)",
                    borderRadius: "12px",
                    color: "#f8fafc",
                  }}
                  labelStyle={{ color: "#67e8f9", fontWeight: 600 }}
                  itemStyle={{ color: "#e2e8f0" }}
                  formatter={(value: number, name: string) => [value, name]}
                />
              </Treemap>
            </ResponsiveContainer>
          </div>
          
          {/* Insight Baseado na Soma dos Clusters */}
          {getGroupedInsight()}
        </>
      ) : (
        <div className="h-[360px] flex items-center justify-center text-sm text-slate-400 border border-dashed border-slate-600 rounded-xl bg-slate-900/30">
          Sem dados suficientes para exibir este gráfico.
        </div>
      )}
    </div>
  );
}