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
