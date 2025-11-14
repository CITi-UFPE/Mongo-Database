import React, { useState, useEffect, useRef } from 'react';
import { geminiService, ChatMessage } from '../../services/geminiService';
import { Send, X, MessageSquare, Loader2, RotateCcw } from 'lucide-react';
import './Chatbot.css';

interface ChatbotProps {
  spreadsheetData: any[];
  isOpen?: boolean;
  onToggle?: () => void;
}

export const Chatbot: React.FC<ChatbotProps> = ({ 
  spreadsheetData, 
  isOpen = false, 
  onToggle 
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Inicializa o chat quando os dados mudam ou quando o chat é aberto
  useEffect(() => {
    const initializeChat = async () => {
      if (!geminiService.isConfigured()) {
        setError('Gemini API não está configurada. Verifique as variáveis de ambiente.');
        return;
      }

      // Inicializa se o chat está aberto e não foi inicializado ainda
      if (isOpen && !geminiService.isInitialized()) {
        setInitializing(true);
        setError(null);
        try {
          // Se não há dados, inicializa com array vazio
          const dataToUse = spreadsheetData && spreadsheetData.length > 0 ? spreadsheetData : [];
          await geminiService.initChat(dataToUse);
          
          const welcomeMessage = dataToUse.length > 0
            ? 'Olá! Estou pronto para ajudar com análises sobre os dados disponíveis. Posso responder perguntas sobre vendas, produtos, clientes e métricas. Como posso ajudar?'
            : 'Olá! Selecione uma planilha primeiro para que eu possa ajudar com análises dos dados.';
          
          setMessages([
            {
              role: 'model',
              parts: welcomeMessage,
              timestamp: new Date(),
            },
          ]);
        } catch (err: any) {
          console.error('Erro ao inicializar chat:', err);
          setError(err.message || 'Erro ao inicializar o chat. Tente novamente.');
        } finally {
          setInitializing(false);
        }
      }
      
      // Atualiza contexto se os dados mudarem após inicialização
      if (geminiService.isInitialized() && spreadsheetData && spreadsheetData.length > 0) {
        try {
          await geminiService.initChat(spreadsheetData);
        } catch (err: any) {
          console.error('Erro ao atualizar contexto:', err);
        }
      }
    };

    initializeChat();
  }, [spreadsheetData, isOpen]);

  // Auto-scroll para a última mensagem
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Foca no input quando abrir
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSend = async () => {
    if (!input.trim() || loading || initializing) return;

    const userMessage: ChatMessage = {
      role: 'user',
      parts: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    setError(null);

    try {
      const response = await geminiService.sendMessage(input.trim());
      const modelMessage: ChatMessage = {
        role: 'model',
        parts: response,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, modelMessage]);
    } catch (err: any) {
      console.error('Erro ao enviar mensagem:', err);
      const errorMessage: ChatMessage = {
        role: 'model',
        parts: `❌ ${err.message || 'Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente.'}`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    geminiService.resetChat();
    setMessages([]);
    setError(null);
    setInitializing(true);
    
    try {
      await geminiService.initChat(spreadsheetData);
      setMessages([
        {
          role: 'model',
          parts: 'Chat reiniciado! Como posso ajudar com a análise dos dados?',
          timestamp: new Date(),
        },
      ]);
    } catch (err: any) {
      setError(err.message || 'Erro ao reiniciar o chat.');
    } finally {
      setInitializing(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) {
    return (
      <button 
        className="chatbot-toggle-btn"
        onClick={onToggle}
        aria-label="Abrir chat assistente"
      >
        <MessageSquare size={24} />
      </button>
    );
  }

  return (
    <div className="chatbot-container">
      <div className="chatbot-window">
        {/* Header */}
        <div className="chatbot-header">
          <div className="chatbot-header-content">
            <MessageSquare size={20} />
            <h3>Assistente de Dados</h3>
          </div>
          <div className="chatbot-header-actions">
            <button 
              className="chatbot-icon-btn" 
              onClick={handleReset}
              title="Reiniciar chat"
              disabled={initializing || loading}
            >
              <RotateCcw size={18} />
            </button>
            <button 
              className="chatbot-icon-btn" 
              onClick={onToggle}
              title="Fechar chat"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="chatbot-messages">
          {error && (
            <div className="chatbot-error">
              <strong>Erro:</strong> {error}
            </div>
          )}

          {initializing && (
            <div className="chatbot-initializing">
              <Loader2 className="spinner" size={20} />
              <span>Inicializando assistente...</span>
            </div>
          )}

          {messages.map((msg, idx) => (
            <div key={idx} className={`chatbot-message ${msg.role}`}>
              <div className="message-content">
                {msg.parts.split('\n').map((line, i) => (
                  <React.Fragment key={i}>
                    {line}
                    {i < msg.parts.split('\n').length - 1 && <br />}
                  </React.Fragment>
                ))}
              </div>
              <div className="message-timestamp">
                {msg.timestamp.toLocaleTimeString('pt-BR', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </div>
            </div>
          ))}

          {loading && (
            <div className="chatbot-message model loading">
              <Loader2 className="spinner" size={16} />
              <span>Digitando...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="chatbot-input-container">
          <input
            ref={inputRef}
            type="text"
            className="chatbot-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Pergunte sobre os dados da planilha..."
            disabled={loading || initializing || !geminiService.isConfigured()}
          />
          <button
            className="chatbot-send-btn"
            onClick={handleSend}
            disabled={loading || initializing || !input.trim()}
            aria-label="Enviar mensagem"
          >
            {loading ? <Loader2 className="spinner" size={20} /> : <Send size={20} />}
          </button>
        </div>
      </div>
    </div>
  );
};
