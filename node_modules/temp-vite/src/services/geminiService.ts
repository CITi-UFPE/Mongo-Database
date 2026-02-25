import { apiClient } from './api';
import { config } from '../config/env';

export interface ChatMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

export interface SpreadsheetData {
  [key: string]: any;
}

class GeminiService {
  private history: ChatMessage[] = [];
  private initialized: boolean = false;

  constructor() {
    // No API key needed on client anymore
  }

  /**
   * Inicializa o chat com contexto dos dados da planilha
   */
  async initChat(spreadsheetData: SpreadsheetData[]): Promise<void> {
    const context = this.formatDataForContext(spreadsheetData);

    const systemPrompt = `Você é um assistente especializado em análise de dados da empresa junior da UFPE o CITi (Centro integrado de tecnologia 
    da informação), possuindo 30 anos de experiencia no mercado de tecnologia, software houses e projetos de dados.

CONTEXTO DOS DADOS DISPONÍVEIS:
${context}

INSTRUÇÕES:
- Responda perguntas sobre vendas, produtos, clientes e métricas apresentadas
- Forneça análises claras, objetivas e baseadas nos dados fornecidos
- Se não tiver informação suficiente nos dados, deixe claro
- Use formatação em markdown para melhor legibilidade
- Seja conciso mas completo nas respostas
- Sugira insights relevantes quando apropriado

Está pronto para ajudar com análises desses dados!`;

    // Initialize history with system prompt and greeting
    this.history = [
      {
        role: 'user',
        parts: [{ text: systemPrompt }],
      },
      {
        role: 'model',
        parts: [{ text: 'Olá! Estou pronto para ajudar com análises sobre os dados disponíveis. Posso responder perguntas sobre vendas, produtos, clientes, períodos e métricas. Como posso ajudar?' }],
      },
    ];

    this.initialized = true;
    console.log('✓ Chat Gemini inicializado com sucesso (via Backend)');
  }

  /**
   * Formata os dados da planilha para contexto do chat
   */
  private formatDataForContext(data: SpreadsheetData[]): string {
    if (!data || data.length === 0) {
      return 'Nenhum dado disponível no momento. Aguardando seleção de planilha.';
    }

    // Extrai informações estatísticas dos dados
    const columns = Object.keys(data[0] || {});
    const totalRecords = data.length;

    // Amostra dos primeiros registros
    const sampleSize = Math.min(20, data.length);
    const sample = data.slice(0, sampleSize);

    // Cria resumo estatístico
    const summary = {
      totalRegistros: totalRecords,
      colunas: columns,
      amostra: sample,
    };

    // Análise de colunas numéricas
    const numericColumns = columns.filter(col => {
      const value = data[0][col];
      return typeof value === 'number' || !isNaN(Number(value));
    });

    const stats: any = {};
    numericColumns.forEach(col => {
      const values = data.map(row => Number(row[col])).filter(v => !isNaN(v));
      if (values.length > 0) {
        stats[col] = {
          min: Math.min(...values),
          max: Math.max(...values),
          media: values.reduce((a, b) => a + b, 0) / values.length,
          total: values.reduce((a, b) => a + b, 0),
        };
      }
    });

    return `
RESUMO DOS DADOS:
- Total de registros: ${totalRecords}
- Colunas disponíveis: ${columns.join(', ')}
- Colunas numéricas: ${numericColumns.join(', ') || 'Nenhuma'}

ESTATÍSTICAS:
${JSON.stringify(stats, null, 2)}

AMOSTRA DOS DADOS (primeiros ${sampleSize} registros):
${JSON.stringify(sample, null, 2)}
`;
  }

  /**
   * Envia uma mensagem para o chat
   */
  async sendMessage(message: string): Promise<string> {
    if (!this.initialized) {
      throw new Error('Chat não inicializado. Chame initChat() primeiro.');
    }

    try {
      // Send history + new message to backend
      const response = await apiClient.post('/api/gemini/chat', {
        history: this.history,
        message: message
      });

      const responseText = response.data.text;

      // Update local history
      this.history.push({
        role: 'user',
        parts: [{ text: message }]
      });

      this.history.push({
        role: 'model',
        parts: [{ text: responseText }]
      });

      return responseText;

    } catch (error: any) {
      console.error('Erro Gemini API (Backend):', error);

      const errorMessage = error.response?.data?.error || error.message || 'Erro desconhecido';
      throw new Error(`⚠️ Erro ao processar mensagem: ${errorMessage}`);
    }
  }

  /**
   * Reinicia o chat (limpa histórico)
   */
  resetChat(): void {
    this.history = [];
    this.initialized = false;
    console.log('Chat reiniciado');
  }

  /**
   * Verifica se o serviço está configurado corretamente
   */
  isConfigured(): boolean {
    return true; // Always configured as logic is on backend
  }

  /**
   * Verifica se o chat está inicializado
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}

// Exporta instância única (singleton)
export const geminiService = new GeminiService();
