import { apiClient } from "@/services/api";

export interface AnalyticsFunnelItem {
  fase: string;
  count: number;
  total_valor: number;
}

export interface LostReason {
  reason: string;
  count: number;
  percentage: number;
  icon: "price" | "time" | "competitor" | "other";
}

export interface AnalyticsPayload {
  total_leads: number;
  qualificados: number;
  nao_qualificados: number;
  valor_pipeline: number;
  total_perdidos: number;
  valor_perdido: number;
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
    falta_faturar?: number;
  };
  funil: AnalyticsFunnelItem[];
  origem_leads: Array<{
    origem: string;
    quantidade: number;
  }>;
  distribuicao_servicos: Array<{
    servico: string;
    quantidade: number;
  }>;
  motivos_perda: LostReason[];
  tempo_estagio?: Array<{
    fase: string;
    dias_medios: number;
    quantidade: number;
  }>;
}

function isAnalyticsPayload(value: unknown): value is AnalyticsPayload {
  if (!value || typeof value !== "object") return false;

  const data = value as Partial<AnalyticsPayload>;

  return (
    typeof data.total_leads === "number" &&
    typeof data.qualificados === "number" &&
    typeof data.nao_qualificados === "number" &&
    typeof data.valor_pipeline === "number" &&
    typeof data.total_perdidos === "number" &&
    typeof data.valor_perdido === "number" &&
    typeof data.previsao_faturamento === "object" &&
    data.previsao_faturamento !== null &&
    typeof data.ticket_medio === "number" &&
    typeof data.taxa_conversao === "number" &&
    typeof data.progresso_meta === "object" &&
    data.progresso_meta !== null &&
    Array.isArray(data.funil) &&
    Array.isArray(data.origem_leads) &&
    Array.isArray(data.distribuicao_servicos) &&
    Array.isArray(data.motivos_perda)
  );
}

export interface AnalyticsQueryParams {
  data_inicio?: string;
  data_fim?: string;
  refresh_pipefy?: boolean;
}

export async function fetchAnalyticsPayload(
  params?: AnalyticsQueryParams
): Promise<AnalyticsPayload> {
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