import { apiClient } from "@/services/api";

export interface AnalyticsFunnelItem {
  fase: string;
  count: number;
  total_valor: number;
}

export interface AnalyticsPayload {
  total_leads: number;
  qualificados: number;
  nao_qualificados: number;
  valor_pipeline: number;
  total_perdidos: number;
  valor_perdido: number;
  previsao_faturamento: number;
  ticket_medio: number;
  taxa_conversao: number;
  progresso_meta: {
    faturado: number;
    meta: number;
    porcentagem: number;
  };
  funil: AnalyticsFunnelItem[];
  origem_leads: Array<{
    nome: string;
    count: number;
  }>;
  distribuicao_servicos: Array<{
    nome: string;
    count: number;
  }>;
}

function isAnalyticsPayload(value: unknown): value is AnalyticsPayload {
  if (!value || typeof value !== "object") {
    return false;
  }

  const data = value as Partial<AnalyticsPayload>;
  return (
    typeof data.total_leads === "number" &&
    typeof data.qualificados === "number" &&
    typeof data.nao_qualificados === "number" &&
    typeof data.valor_pipeline === "number" &&
    typeof data.total_perdidos === "number" &&
    typeof data.valor_perdido === "number" &&
    typeof data.previsao_faturamento === "number" &&
    typeof data.ticket_medio === "number" &&
    typeof data.taxa_conversao === "number" &&
    typeof data.progresso_meta === "object" &&
    Array.isArray(data.funil) &&
    Array.isArray(data.origem_leads) &&
    Array.isArray(data.distribuicao_servicos)
  );
}

export interface AnalyticsQueryParams {
  data_inicio?: string;
  data_fim?: string;
  refresh_pipefy?: boolean;
}

export async function fetchAnalyticsPayload(params?: AnalyticsQueryParams): Promise<AnalyticsPayload> {
  const response = await apiClient.get("/api/analytics/overview/", {
    params: {
      refresh_pipefy: params?.refresh_pipefy ?? false,
      data_inicio: params?.data_inicio,
      data_fim: params?.data_fim,
    },
  });

  const data = response.data;
  if (!isAnalyticsPayload(data)) {
    throw new Error("Resposta de analytics em formato inválido");
  }

  return data;
}
