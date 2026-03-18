import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, X, Send, Bot, User, Loader2 } from "lucide-react";
import { apiClient } from "@/services/api";

export function Chatbot() {
  // 1. O PRÓPRIO COMPONENTE CONTROLA SE ESTÁ ABERTO (Tiramos das props)
  const [isOpen, setIsOpen] = useState(false);
  
  // 2. ESTADOS DO CHAT
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([
    { role: "assistant", content: "Olá! Sou o Consultor de IA do CITi. Como posso ajudar com a análise desses dados hoje?" }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Rola para o final do chat sempre que uma nova mensagem chega
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async () => {
  if (!input.trim()) return;

  const userMessage = { role: "user" as const, content: input };
  setMessages((prev) => [...prev, userMessage]);
  setInput("");
  setIsLoading(true);

  try {
    // 1. URL CORRIGIDA: /api/gemini/chat
    // 2. CORPO CORRIGIDO: Enviando apenas o que o Swagger pede ("message")
    const response = await apiClient.post("/api/gemini/chat", {
      message: userMessage.content,
    });

    // O Swagger mostra que a resposta de sucesso (200) é apenas uma "string" 
    // ou um objeto. Se o backend retorna apenas o texto, usamos response.data
    const botReply = typeof response.data === 'string' 
      ? response.data 
      : (response.data.reply || response.data.response || "Processado.");

    const botMessage = {
      role: "assistant" as const,
      content: botReply
    };
    
    setMessages((prev) => [...prev, botMessage]);
  } catch (error) {
    console.error("Erro na comunicação com Gemini:", error);
    setMessages((prev) => [
      ...prev,
      { role: "assistant", content: "Erro ao conectar com a IA. Verifique o console." }
    ]);
  } finally {
    setIsLoading(false);
  }
};

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSendMessage();
  };

  return (
    <>
      {/* Botão Flutuante */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed z-[9999] flex items-center justify-center w-14 h-14 font-bold text-white shadow-lg rounded-full bottom-6 right-6 bg-teal-600 hover:bg-teal-500 focus:outline-none"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        {isOpen ? <X size={28} /> : <MessageSquare size={28} />}
      </motion.button>

      {/* Janela do Chatbot */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed z-[9999] flex flex-col overflow-hidden border shadow-2xl bottom-24 right-6 w-80 sm:w-96 h-[500px] max-h-[80vh] bg-slate-900 border-slate-700 rounded-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b bg-slate-800 border-slate-700">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-teal-500">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-100">Consultor Estratégico IA</h3>
                  <p className="text-xs text-teal-400">Online</p>
                </div>
              </div>
            </div>

            {/* Área de Mensagens */}
            <div className="flex-1 p-4 overflow-y-auto custom-scrollbar bg-slate-900/50 space-y-4">
              {messages.map((msg, index) => (
                <div key={index} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  {msg.role === "assistant" && (
                    <div className="flex-shrink-0 mt-1">
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-700 text-teal-400">
                        <Bot className="w-3 h-3" />
                      </div>
                    </div>
                  )}
                  
                  <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                    msg.role === "user"
                      ? "bg-blue-600 text-white rounded-tr-none"
                      : "bg-slate-800 text-slate-200 border border-slate-700 rounded-tl-none"
                  }`}>
                    {msg.content}
                  </div>

                  {msg.role === "user" && (
                    <div className="flex-shrink-0 mt-1">
                      <div className="flex items-center justify-center w-6 h-6 bg-blue-500 rounded-full text-white">
                        <User className="w-3 h-3" />
                      </div>
                    </div>
                  )}
                </div>
              ))}
              
              {/* Indicador de Digitação */}
              {isLoading && (
                <div className="flex gap-3 justify-start">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-700 text-teal-400">
                    <Loader2 className="w-3 h-3 animate-spin" />
                  </div>
                  <div className="p-3 text-sm border bg-slate-800 text-slate-400 border-slate-700 rounded-2xl rounded-tl-none">
                    Analisando dados...
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Footer */}
            <div className="p-3 border-t bg-slate-800 border-slate-700">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="Peça um insight dos dados..."
                  className="flex-1 px-4 py-2 text-sm border rounded-full bg-slate-900 border-slate-600 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-teal-500"
                  disabled={isLoading}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!input.trim() || isLoading}
                  className="flex items-center justify-center w-10 h-10 transition-colors bg-teal-600 rounded-full text-white hover:bg-teal-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-4 h-4 ml-1" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}