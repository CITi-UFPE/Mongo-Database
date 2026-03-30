import { apiClient } from "@/services/api";

export interface AnalyticsFunnelItem {
  fase: string;
  count: number;
  total_valor: number;
}

// Atualize as interfaces no analytics.ts

export interface AnalyticsPayload {
  total_leads: number;
  qualificados: number;
  nao_qualificados: number;
  valor_pipeline: number;
  total_perdidos: number;
  valor_perdido: number;
  // 🔥 Mudou de number para objeto:
  previsao_faturamento: {
    pipeline_total: number;
    previsao_realista: number;
  };
  ticket_medio: number;
  taxa_conversao: number;
  progresso_meta: {
    faturado: number;
    meta: number;
    porcentagem: number;
    falta_faturar?: number; // 🔥 Campo novo que adicionamos!
  };
  funil: AnalyticsFunnelItem[];
  // 🔥 Backend envia 'origem' e 'quantidade', não 'nome' e 'count'
  origem_leads: Array<{ origem: string; quantidade: number; }>;
  // 🔥 Backend envia 'servico' e 'quantidade'
  distribuicao_servicos: Array<{ servico: string; quantidade: number; }>;
  // 🔥 Gráfico novo que adicionamos
  tempo_estagio?: Array<{ fase: string; dias_medios: number; }>; 
}

// Atualize o validador:
function isAnalyticsPayload(value: unknown): value is AnalyticsPayload {
  if (!value || typeof value !== "object") return false;
  const data = value as Partial<AnalyticsPayload>;
  
  return (
    typeof data.total_leads === "number" &&
    typeof data.valor_pipeline === "number" &&
    typeof data.previsao_faturamento === "object" && // 🔥 Aqui estava o erro!
    typeof data.progresso_meta === "object" &&
    Array.isArray(data.funil)
    // (Pode remover algumas das validações muito estritas para evitar quebras atoa)
  );
}

export interface AnalyticsQueryParams {
  data_inicio?: string | Date;
  data_fim?: string | Date;
  refresh_pipefy?: boolean;
}

function normalizeDateParam(value?: string | Date): string | undefined {
  if (!value) {
    return undefined;
  }

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      return undefined;
    }
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  const brDateMatch = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (brDateMatch) {
    const [, day, month, year] = brDateMatch;
    return `${year}-${month}-${day}`;
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export async function fetchAnalyticsPayload(params?: AnalyticsQueryParams): Promise<AnalyticsPayload> {
  const dataInicio = normalizeDateParam(params?.data_inicio);
  const dataFim = normalizeDateParam(params?.data_fim);

  const response = await apiClient.get("/api/analytics/overview/", {
    params: {
      refresh_pipefy: params?.refresh_pipefy ?? false,
      data_inicio: dataInicio,
      data_fim: dataFim,
    },
  });

  const data = response.data;
  if (!isAnalyticsPayload(data)) {
    throw new Error("Resposta de analytics em formato inválido");
  }

  return data;
}
