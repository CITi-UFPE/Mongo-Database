import { apiClient } from './api';

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

  constructor() {}

  /**
   * Inicializa o chat com contexto dos dados da planilha
   */
  async initChat(spreadsheetData: SpreadsheetData[]): Promise<void> {
    const context = this.formatDataForContext(spreadsheetData);

    const systemPrompt = `Você é um assistente especializado em análise de dados do CITi (Centro Integrado de Tecnologia da Informação), empresa júnior da UFPE.
Você possui 30 anos de experiência no mercado de tecnologia e software houses.

CONTEXTO DOS DADOS ATUAIS DA PLANILHA:
${context}

INSTRUÇÕES:
- Analise vendas, produtos, clientes e métricas.
- Seja objetivo e baseie-se estritamente nos dados fornecidos acima.
- Se a pergunta for sobre algo fora dos dados fornecidos, avise que não possui essa informação.
- Use Markdown (tabelas, negrito, listas) para as respostas.
- Sugira insights de negócio baseados nas estatísticas.`;

    // Reinicia o histórico com o prompt de sistema "disfarçado" de primeira mensagem
    // para que o backend Gemini receba o contexto corretamente.
    this.history = [
      {
        role: 'user',
        parts: [{ text: systemPrompt }],
      },
      {
        role: 'model',
        parts: [{ text: 'Olá! Sou o analista de dados do CITi. Identifiquei os dados da sua planilha e estou pronto para gerar insights. O que você deseja saber?' }],
      },
    ];

    this.initialized = true;
    console.log('✓ Memória do Chat Gemini preparada com novos dados.');
  }

  /**
   * Formata os dados da planilha para o contexto da IA
   */
  private formatDataForContext(data: SpreadsheetData[]): string {
    if (!data || data.length === 0) {
      return 'Nenhum dado disponível no momento.';
    }

    const columns = Object.keys(data[0] || {});
    const totalRecords = data.length;
    
    // Pegamos apenas os primeiros 15 registros para não estourar o limite de tokens da API gratuita
    const sampleSize = Math.min(15, data.length);
    const sample = data.slice(0, sampleSize);

    // Identifica colunas numéricas para cálculos rápidos
    const numericColumns = columns.filter(col => {
      const val = data[0][col];
      return typeof val === 'number' || (!isNaN(Number(val)) && val !== "");
    });

    const stats: any = {};
    numericColumns.forEach(col => {
      const values = data.map(row => Number(row[col])).filter(v => !isNaN(v));
      if (values.length > 0) {
        stats[col] = {
          min: Math.min(...values),
          max: Math.max(...values),
          media: (values.reduce((a, b) => a + b, 0) / values.length).toFixed(2),
          total_soma: values.reduce((a, b) => a + b, 0).toFixed(2)
        };
      }
    });

    return `
ESTRUTURA:
- Total de Linhas: ${totalRecords}
- Colunas: ${columns.join(' | ')}

ESTATÍSTICAS DAS COLUNAS NUMÉRICAS:
${JSON.stringify(stats, null, 2)}

AMOSTRA DOS DADOS (Primeiras ${sampleSize} linhas):
${JSON.stringify(sample, null, 2)}
`;
  }

  /**
   * Envia mensagem para o Backend (FastAPI)
   */
  async sendMessage(message: string): Promise<string> {
    if (!this.initialized) {
      throw new Error('O chat precisa ser inicializado com dados antes de enviar mensagens.');
    }

    try {
      // Chamada ao backend Python
      const response = await apiClient.post('/api/gemini/chat', {
        message: message,
        history: this.history // Enviamos o histórico atual
      });

      const responseText = response.data.text;

      // ATUALIZAÇÃO DO HISTÓRICO LOCAL
      // Só adicionamos ao histórico se a requisição teve sucesso
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
      console.error('Erro na comunicação com o Backend Gemini:', error);
      
      // Tenta pegar a mensagem de erro detalhada vinda do Python
      const backendError = error.response?.data?.detail || error.message;
      throw new Error(backendError || 'Erro ao processar resposta da IA.');
    }
  }

  resetChat(): void {
    this.history = [];
    this.initialized = false;
  }

  isConfigured(): boolean {
    return true; 
  }

  isInitialized(): boolean {
    return this.initialized;
  }
}

export const geminiService = new GeminiService();