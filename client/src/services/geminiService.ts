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
    if (!this.initialized || !this.chat) {
      throw new Error('Chat não inicializado. Chame initChat() primeiro.');
    }

    try {
      const result = await this.chat.sendMessage(message);
      const response = await result.response;
      return response.text();
    } catch (error: any) {
      // Log detalhado para debug
      console.group('🔍 Erro Gemini API - Debug Completo');
      console.error('Erro completo:', error);
      console.error('Mensagem:', error?.message);
      console.error('Status HTTP:', error?.status);
      console.error('Código de erro:', error?.errorDetails?.[0]?.reason);
      console.error('Response:', error?.response);
      console.groupEnd();
      
      // Verifica conexão primeiro
      if (!navigator.onLine) {
        throw new Error('Sem conexão com a internet. Verifique sua conexão.');
      }

      // Extrai código de erro e mensagem
      const errorMessage = error?.message?.toLowerCase() || '';
      const statusCode = error?.status;
      const errorReason = error?.errorDetails?.[0]?.reason?.toLowerCase() || '';

      // Tratamento específico por tipo de erro
      
      // 1. Erros de API Key
      if (errorMessage.includes('api key') || 
          errorMessage.includes('api_key_invalid') ||
          errorMessage.includes('invalid_api_key') ||
          statusCode === 401) {
        throw new Error('🔑 API key inválida ou não autorizada. Verifique a VITE_GEMINI_API_KEY.');
      }
      
      // 2. Erros de Rate Limit/Quota (429)
      if (statusCode === 429) {
        // Verifica se é limite de rate ou quota
        if (errorMessage.includes('quota') || errorReason.includes('quota')) {
          throw new Error('📊 Cota de uso da API excedida. Aguarde o reset ou aumente seu plano.');
        } else {
          throw new Error('⏱️ Muitas requisições em pouco tempo. Aguarde alguns segundos e tente novamente.');
        }
      }
      
      // 3. Erros de filtro de segurança
      if (errorMessage.includes('safety') || 
          errorMessage.includes('blocked') ||
          errorReason.includes('safety')) {
        throw new Error('🛡️ Conteúdo bloqueado por filtros de segurança. Tente reformular sua pergunta.');
      }
      
      // 4. Erros de requisição inválida (400)
      if (statusCode === 400) {
        if (errorMessage.includes('model not found') || errorMessage.includes('invalid model')) {
          throw new Error('🤖 Modelo Gemini não encontrado ou inválido. Verifique o nome do modelo.');
        }
        if (errorMessage.includes('token') || errorMessage.includes('length')) {
          throw new Error('📝 Prompt muito longo. Tente uma pergunta mais concisa.');
        }
        throw new Error('❌ Requisição inválida. Verifique o formato da mensagem.');
      }
      
      // 5. Erros do servidor (500+)
      if (statusCode >= 500) {
        throw new Error('🔧 Erro no servidor do Gemini. O serviço pode estar temporariamente indisponível. Tente em alguns instantes.');
      }
      
      // 6. Erros de timeout/rede
      if (errorMessage.includes('timeout') || 
          errorMessage.includes('network') ||
          errorMessage.includes('fetch')) {
        throw new Error('🌐 Erro de conexão com a API. Verifique sua internet e tente novamente.');
      }

      // Erro genérico com informações úteis
      const displayError = error?.message || 'Erro desconhecido';
      throw new Error(`⚠️ Erro ao processar mensagem: ${displayError}${statusCode ? ` (HTTP ${statusCode})` : ''}`);
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
