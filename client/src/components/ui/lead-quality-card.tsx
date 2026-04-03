import { cn } from "@/lib/utils";

interface LeadQualityData {
  total: number;
  qualificados: number;
  naoQualificados: number;
  outros: number;
  regraQualificacao?: string; // Adicionado
  regraNaoQualificacao?: string; // Adicionado
}

interface LeadQualityCardProps {
  data: LeadQualityData;
  className?: string;
}

export function LeadQualityCard({ data, className }: LeadQualityCardProps) {
  return (
    <div className={cn("h-[260px] rounded-2xl bg-gradient-to-br from-slate-800/40 to-slate-900/30 backdrop-blur-md border border-blue-500/30 p-6 hover:border-blue-400/50 transition-all duration-300 shadow-lg", className)}>
      <h3 className="text-xl font-semibold bg-gradient-to-r from-blue-300 via-cyan-300 to-blue-400 bg-clip-text text-transparent">Qualidade dos Leads</h3>
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="bg-gradient-to-br from-blue-600/30 to-cyan-600/20 p-4 rounded-xl border border-blue-400/40 backdrop-blur-md shadow-md">
          <p className="text-xs text-blue-200">Total</p>
          <p className="text-3xl font-bold bg-gradient-to-r from-blue-300 to-cyan-300 bg-clip-text text-transparent">{data.total}</p>
        </div>
        <div className="bg-gradient-to-br from-emerald-600/30 to-emerald-500/20 border border-emerald-400/40 p-4 rounded-xl backdrop-blur-md">
          <p className="text-xs text-emerald-200">Qualificados</p>
          <p className="text-3xl font-bold text-emerald-300">{data.qualificados}</p>
        </div>
        <div className="bg-gradient-to-br from-orange-600/30 to-orange-500/20 border border-orange-400/40 p-4 rounded-xl backdrop-blur-md">
          <p className="text-xs text-orange-200">Não qualificados</p>
          <p className="text-3xl font-bold text-orange-300">{data.naoQualificados}</p>
        </div>
      </div>
      <div className="w-full h-3 bg-slate-700/40 rounded-full flex overflow-hidden border border-slate-600/30">
        <div className="h-3 bg-gradient-to-r from-emerald-500 to-emerald-400" style={{ width: `${(data.qualificados / data.total) * 100}%` }} />
        <div className="h-3 bg-gradient-to-r from-orange-500 to-orange-400" style={{ width: `${(data.naoQualificados / data.total) * 100}%` }} />
        <div className="h-3 bg-gradient-to-r from-blue-500 to-cyan-400" style={{ width: `${(data.outros / data.total) * 100}%` }} />
      </div>

      <div className="mt-3 pt-3 border-t border-slate-600/30 text-xs text-slate-400 space-y-1">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400" />
          {/* 👇 Texto agora é dinâmico ou mostra o novo padrão */}
          <span><strong>Qualificado:</strong> {data.regraQualificacao || "Leads em fases ativas do funil"}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-orange-400" />
          {/* 👇 Texto agora é dinâmico */}
          <span><strong>Não qualificado:</strong> {data.regraNaoQualificacao || "Leads sem movimentação ou perdidos"}</span>
        </div>
      </div>
    </div>
  );
}