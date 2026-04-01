import { apiClient } from "@/services/api";
import axios from "axios";

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
  origem_leads: Array<{ origem: string; quantidade: number; }>;
  distribuicao_servicos: Array<{ servico: string; quantidade: number; }>;
  tempo_estagio?: Array<{ fase: string; dias_medios: number; }>; 
}

function isAnalyticsPayload(value: unknown): value is AnalyticsPayload {
  if (!value || typeof value !== "object") return false;
  const data = value as Partial<AnalyticsPayload>;
  
  return (
    typeof data.total_leads === "number" &&
    typeof data.valor_pipeline === "number" &&
    typeof data.previsao_faturamento === "object" && 
    typeof data.progresso_meta === "object" &&
    Array.isArray(data.funil)
  );
}

export interface AnalyticsQueryParams {
  data_inicio?: string | Date;
  data_fim?: string | Date;
  refresh_pipefy?: boolean;
}

export function getAnalyticsErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const detail =
      typeof error.response?.data?.detail === "string"
        ? error.response.data.detail.trim().toLowerCase()
        : "";

    if (status === 403 && detail.includes("aguardando aprovação")) {
      return "Sua conta aguarda aprovação do administrador para acessar o dashboard.";
    }

    if (status === 401) {
      return "Sua sessão expirou. Faça login novamente.";
    }
  }

  return "Não foi possível carregar Analytics da API.";
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

  // 1. Pegamos o token que foi salvo lá no Login
  const token = localStorage.getItem("authToken");

  const response = await apiClient.get("/api/analytics/overview/", {
    params: {
      refresh_pipefy: params?.refresh_pipefy ?? false,
      data_inicio: dataInicio,
      data_fim: dataFim,
    },
    // 2. Enviamos o token no cabeçalho da requisição
    headers: {
      Authorization: token ? `Bearer ${token}` : "",
    }
  });

  const data = response.data;
  if (!isAnalyticsPayload(data)) {
    throw new Error("Resposta de analytics em formato inválido");
  }

  return data;
}