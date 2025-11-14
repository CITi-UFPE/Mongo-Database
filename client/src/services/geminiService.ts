import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config/env';

export interface ChatMessage {
  role: 'user' | 'model';
  parts: string;
  timestamp: Date;
}

export interface SpreadsheetData {
  [key: string]: any;
}

class GeminiService {
  private genAI: GoogleGenerativeAI | null = null;
  private model: any = null;
  private chat: any = null;
  private initialized: boolean = false;

  constructor() {
    if (config.geminiApiKey) {
      this.genAI = new GoogleGenerativeAI(config.geminiApiKey);
      
      // Usa o modelo Gemini 2.0 Flash (estável e disponível)
      this.model = this.genAI.getGenerativeModel({ 
        model: 'gemini-2.0-flash',
        generationConfig: {
          temperature: 0.7,
          topP: 0.95,
          topK: 40,
          maxOutputTokens: 2048,
        }
      });
      
      console.log('✅ Gemini 2.0 Flash inicializado');
    } else {
      console.error('❌ Gemini API Key não configurada');
    }
  }

  /**
   * Inicializa o chat com contexto dos dados da planilha
   */
  async initChat(spreadsheetData: SpreadsheetData[]): Promise<void> {
    if (!this.model) {
      throw new Error('Gemini API não está configurada. Verifique a VITE_GEMINI_API_KEY');
    }

    const context = this.formatDataForContext(spreadsheetData);
    
    const systemPrompt = `Você é um assistente especializado em análise de dados de planilhas de vendas e relatórios comerciais.

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

    this.chat = this.model.startChat({
      history: [
        {
          role: 'user',
          parts: [{ text: systemPrompt }],
        },
        {
          role: 'model',
          parts: [{ text: 'Olá! Estou pronto para ajudar com análises sobre os dados disponíveis. Posso responder perguntas sobre vendas, produtos, clientes, períodos e métricas. Como posso ajudar?' }],
        },
      ],
    });

    this.initialized = true;
    console.log('✓ Chat Gemini inicializado com sucesso');
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
    const sampleSize = Math.min(5, data.length);
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
    if (!this.initialized || !this.chat) {
      throw new Error('Chat não inicializado. Chame initChat() primeiro.');
    }

    try {
      const result = await this.chat.sendMessage(message);
      const response = await result.response;
      return response.text();
    } catch (error: any) {
      console.error('Erro completo ao enviar mensagem:', error);
      console.error('Mensagem de erro:', error?.message);
      console.error('Status:', error?.status);
      console.error('Response:', error?.response);
      
      // Tratamento de erros específicos
      if (error?.message?.includes('API key') || error?.message?.includes('API_KEY_INVALID')) {
        throw new Error('API key inválida. Verifique se a VITE_GEMINI_API_KEY está correta.');
      } else if (error?.message?.includes('quota') || error?.status === 429) {
        throw new Error('Limite de uso da API Gemini excedido. Tente novamente mais tarde.');
      } else if (error?.message?.includes('SAFETY')) {
        throw new Error('Conteúdo bloqueado por filtros de segurança. Tente reformular sua pergunta.');
      } else if (error?.status === 400) {
        throw new Error('Requisição inválida. O prompt pode ser muito longo ou conter caracteres inválidos.');
      } else if (error?.status === 500) {
        throw new Error('Erro no servidor do Gemini. Tente novamente em alguns instantes.');
      } else if (!navigator.onLine) {
        throw new Error('Sem conexão com a internet. Verifique sua conexão.');
      }
      
      throw new Error(`Erro ao processar: ${error?.message || 'Erro desconhecido'}`);
    }
  }

  /**
   * Reinicia o chat (limpa histórico)
   */
  resetChat(): void {
    this.chat = null;
    this.initialized = false;
    console.log('Chat reiniciado');
  }

  /**
   * Verifica se o serviço está configurado corretamente
   */
  isConfigured(): boolean {
    return this.genAI !== null;
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
