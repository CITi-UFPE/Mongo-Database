import { cn } from "@/lib/utils";
import { AlertCircle, Lightbulb } from "lucide-react"; // Adicionado Lightbulb

interface LostReason {
  reason: string;
  count: number;
  percentage: number;
  icon: "price" | "time" | "competitor" | "other";
}

interface LostLeadsBreakdownProps {
  total: number;
  reasons: LostReason[];
  totalValue: number;
  className?: string;
}

export function LostLeadsBreakdown({ total, reasons, totalValue, className }: LostLeadsBreakdownProps) {
  const colors = ["#22d3ee", "#3b82f6", "#2dd4bf", "#8b5cf6"];

  const chartData = reasons
    .filter((reason) => reason.count > 0)
    .map((reason, index) => ({
      name: reason.reason,
      value: reason.count,
      color: colors[index % colors.length],
    }))
    .sort((a, b) => b.value - a.value);

  const hasData = chartData.length > 0;
  const maxValue = Math.max(1, ...chartData.map((item) => item.value));

  // --- LÓGICA DO INSIGHT DINÂMICO ---
  let topReasonName = "";
  let topPercentage = 0;
  let recommendedAction = "";

  if (hasData && total > 0) {
    const topReason = chartData[0];
    topReasonName = topReason.name;
    topPercentage = Math.round((topReason.value / total) * 100);

    // Dicionário de ações corretivas
    const actionsMap: Record<string, string> = {
      "Lead sumiu (No-Response)": "Revise o SLA de resposta inicial e implemente réguas de follow-up multicanal (WhatsApp + Email).",
      "Sem fit técnico": "Alinhe o Perfil de Cliente Ideal (ICP) com o Marketing para qualificar melhor a entrada.",
      "Preço (Fora do orçamento)": "Ajuste o discurso para focar no Retorno sobre Investimento (ROI) ou revise o porte das empresas.",
      "Lead desistiu (Motivo interno)": "Reforce a etapa de 'Implicação' nas calls para criar senso de urgência.",
      "Falta de necessidade": "Mova esses contatos para um fluxo de nutrição de marketing para educá-los.",
      "Timing / Outros motivos": "Coloque esses leads em um pipeline de 'Reengajamento' para retomada futura.",
    };

    recommendedAction = actionsMap[topReasonName] || "Reúna o time para mapear a causa raiz e ajustar o roteiro de vendas.";
  }
  // ----------------------------------

  return (
    <div
      className={cn(
        "rounded-2xl bg-gradient-to-br from-slate-800/40 to-slate-900/30 backdrop-blur-md border border-cyan-500/30 p-5 hover:border-cyan-400/50 transition-all duration-300 shadow-lg flex flex-col h-full",
        className,
      )}
    >
      <div className="flex items-center gap-3 mb-5">
        <div className="bg-gradient-to-br from-cyan-600/40 to-blue-600/30 text-cyan-300 rounded-lg p-2 border border-cyan-500/30 backdrop-blur-md">
          <AlertCircle className="w-5 h-5" />
        </div>
        <h3 className="font-semibold text-cyan-100">Motivos de Perda</h3>
      </div>

      {hasData ? (
        <div className="space-y-2.5 flex-grow">
          {chartData.map((item) => {
            const width = Math.max(8, Math.round((item.value / maxValue) * 100));
            return (
              <div key={item.name} className="space-y-1">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-slate-100 truncate font-medium">{item.name}</span>
                  <span className="text-cyan-100 font-semibold">{item.value}</span>
                </div>
                <div className="h-2.5 rounded-full bg-slate-900/30 overflow-hidden border border-white/5">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${width}%`, backgroundColor: item.color }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="h-[280px] flex items-center justify-center text-sm text-slate-400 border border-dashed border-slate-600 rounded-xl bg-transparent flex-grow">
          Sem dados suficientes para exibir este gráfico.
        </div>
      )}

      {/* BLOCO DE INSIGHT DINÂMICO */}
      {hasData && (
        <div className="mt-5 p-3.5 bg-cyan-950/30 border border-cyan-500/20 rounded-xl">
          <div className="flex items-start gap-2.5">
            <Lightbulb className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-slate-200 leading-relaxed">
                <span className="font-semibold text-cyan-300">{topReasonName}</span> representa <span className="font-bold text-amber-400">{topPercentage}%</span> das suas perdas neste período.
              </p>
              <p className="text-xs text-slate-400 mt-1.5 font-medium border-t border-cyan-500/20 pt-1.5">
                <span className="text-cyan-400">Ação:</span> {recommendedAction}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="mt-4 p-4 bg-gradient-to-r from-slate-900/35 to-slate-800/20 border border-cyan-400/20 rounded-xl backdrop-blur-sm shadow-lg">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-cyan-100 font-semibold">⚠️ Total de Leads Perdidos</p>
            <p className="text-xs text-slate-300 mt-1">Impacto no pipeline atual</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-cyan-200">{total}</p>
            <p className="text-xs text-slate-200 font-semibold">R$ {totalValue.toLocaleString("pt-BR")}</p>
          </div>
        </div>
      </div>
    </div>
  );
}