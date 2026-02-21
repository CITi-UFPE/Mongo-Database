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
  spreadsheetData, // Mantemos a prop para não quebrar, mas vamos ignorar se estiver vazia
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

  // Inicializa o chat quando é aberto
  useEffect(() => {
    const initializeChat = async () => {
      // Configuração básica
      if (!geminiService.isConfigured()) {
        setError('Gemini API não está configurada. Verifique as variáveis de ambiente.');
        return;
      }

      // Se abriu e não iniciou ainda
      if (isOpen && !geminiService.isInitialized()) {
        setInitializing(true);
        setError(null);
        try {
          // --- MUDANÇA PRINCIPAL AQUI ---
          // Passamos um array vazio ou os dados, tanto faz. O Backend é que manda agora.
          await geminiService.initChat([]); 

          // Mensagem fixa de sucesso conectada ao Pipefy
          const welcomeMessage = 'Olá! Estou conectado ao Pipefy do Comercial. 🚀\n\nPosso responder sobre:\n- Total de Leads\n- Valor em negociação\n- Funil de Vendas\n\nO que deseja saber?';

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
    };

    initializeChat();
    // Removi spreadsheetData das dependências para ele não reiniciar se a planilha mudar (já que usamos Pipefy)
  }, [isOpen]);

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
    if (!input.trim() || loading) return; // Removi !initializing para não travar à toa

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
        parts: [{ text: `❌ ${err.message || 'Desculpe, ocorreu um erro ao processar sua mensagem.'}` }],
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
      await geminiService.initChat([]);
      setMessages([
        {
          role: 'model',
          parts: [{ text: 'Chat reiniciado e reconectado ao Pipefy! O que deseja analisar?' }],
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
            <h3>IA Comercial (Pipefy)</h3>
          </div>
          <div className="chatbot-header-actions">
            <button
              className="chatbot-icon-btn"
              onClick={handleReset}
              title="Reiniciar chat"
              disabled={loading}
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
              <strong>Info:</strong> {error}
            </div>
          )}

          {initializing && (
            <div className="chatbot-initializing">
              <Loader2 className="spinner" size={20} />
              <span>Conectando ao Pipefy...</span>
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
                    // Mapeamentos padrão mantidos
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
              <span>Consultando Pipefy...</span>
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
            placeholder="Ex: Qual o valor total em negociação?"
            // AQUI ESTAVA O PROBLEMA: Removi a dependência de initializing restrita
            disabled={loading || !geminiService.isConfigured()} 
          />
          <button
            className="chatbot-send-btn"
            onClick={handleSend}
            disabled={loading || !input.trim()}
            aria-label="Enviar mensagem"
          >
            {loading ? <Loader2 className="spinner" size={20} /> : <Send size={20} />}
          </button>
        </div>
      </div>
    </div>
  );
};