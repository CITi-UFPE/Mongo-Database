import React, { useState, useEffect, useRef } from 'react';
import { geminiService, ChatMessage } from '../../services/geminiService';
import { Send, X, MessageSquare, Loader2, RotateCcw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/atom-one-dark.css';
import './Chatbot.css';

interface ChatbotProps {
  spreadsheetData: any[];
  isOpen?: boolean;
  onToggle?: () => void;
}

// Interface local para mensagens na UI, estendendo a do serviço
interface DisplayMessage extends ChatMessage {
  timestamp: Date;
}

export const Chatbot: React.FC<ChatbotProps> = ({
  spreadsheetData,
  isOpen = false,
  onToggle
}) => {
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
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
              parts: [{ text: welcomeMessage }],
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

    const userMessage: DisplayMessage = {
      role: 'user',
      parts: [{ text: input.trim() }],
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    setError(null);

    try {
      const response = await geminiService.sendMessage(input.trim());
      const modelMessage: DisplayMessage = {
        role: 'model',
        parts: [{ text: response }],
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, modelMessage]);
    } catch (err: any) {
      console.error('Erro ao enviar mensagem:', err);
      const errorMessage: DisplayMessage = {
        role: 'model',
        parts: [{ text: `❌ ${err.message || 'Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente.'}` }],
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
          parts: [{ text: 'Chat reiniciado! Como posso ajudar com a análise dos dados?' }],
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
      <div className="chatbot-sidebar" onClick={onToggle}>
        <div className="chatbot-sidebar-content">
          <MessageSquare size={20} className="chatbot-sidebar-icon" />
          <span className="chatbot-sidebar-text">Assistente</span>
        </div>
      </div>
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
                <ReactMarkdown
                  rehypePlugins={[rehypeHighlight]}
                  components={{
                    code: ({ node, className, children, ...props }: any) => {
                      const isInline = !className;
                      return isInline ?
                        <code className="inline-code" {...props}>{children}</code> :
                        <code className={className} {...props}>{children}</code>;
                    },
                    pre: ({ node, ...props }: any) => <pre className="code-block" {...props} />,
                    p: ({ node, ...props }: any) => <p className="markdown-p" {...props} />,
                    ul: ({ node, ...props }: any) => <ul className="markdown-list" {...props} />,
                    ol: ({ node, ...props }: any) => <ol className="markdown-list" {...props} />,
                    li: ({ node, ...props }: any) => <li className="markdown-li" {...props} />,
                    strong: ({ node, ...props }: any) => <strong className="markdown-strong" {...props} />,
                    em: ({ node, ...props }: any) => <em className="markdown-em" {...props} />,
                    a: ({ node, ...props }: any) => <a className="markdown-link" target="_blank" rel="noopener noreferrer" {...props} />,
                  }}
                >
                  {msg.parts[0].text}
                </ReactMarkdown>
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
