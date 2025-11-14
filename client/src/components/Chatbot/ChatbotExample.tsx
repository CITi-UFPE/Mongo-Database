import React, { useState } from 'react';
import { Chatbot } from '../../components/Chatbot/Chatbot';

/**
 * Exemplo de como usar o componente Chatbot em suas páginas
 * 
 * Integre o chatbot em qualquer página que tenha dados de planilha
 * para fornecer análises com IA aos usuários.
 */
export const ChatbotExample: React.FC = () => {
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Exemplo de dados de planilha - substitua pelos seus dados reais
  const spreadsheetData = [
    { 
      id: 1, 
      produto: 'Notebook Dell', 
      vendas: 150, 
      receita: 225000, 
      mes: 'Janeiro',
      categoria: 'Eletrônicos'
    },
    { 
      id: 2, 
      produto: 'Mouse Logitech', 
      vendas: 450, 
      receita: 22500, 
      mes: 'Janeiro',
      categoria: 'Periféricos'
    },
    { 
      id: 3, 
      produto: 'Teclado Mecânico', 
      vendas: 280, 
      receita: 42000, 
      mes: 'Fevereiro',
      categoria: 'Periféricos'
    },
    // ... mais dados
  ];

  return (
    <div className="page-container">
      <h1>Página com Chatbot de Análise</h1>
      
      <div className="data-table">
        {/* Sua tabela de dados aqui */}
      </div>

      {/* Componente Chatbot */}
      <Chatbot 
        spreadsheetData={spreadsheetData}
        isOpen={isChatOpen}
        onToggle={() => setIsChatOpen(!isChatOpen)}
      />
    </div>
  );
};

/**
 * INSTRUÇÕES DE USO:
 * 
 * 1. Importe o componente Chatbot:
 *    import { Chatbot } from '../../components/Chatbot/Chatbot';
 * 
 * 2. Passe os dados da planilha via props:
 *    <Chatbot spreadsheetData={seusDados} />
 * 
 * 3. Os dados devem ser um array de objetos:
 *    const dados = [
 *      { coluna1: valor1, coluna2: valor2, ... },
 *      { coluna1: valor1, coluna2: valor2, ... },
 *    ]
 * 
 * 4. O chatbot irá automaticamente:
 *    - Analisar a estrutura dos dados
 *    - Calcular estatísticas
 *    - Responder perguntas sobre os dados
 *    - Fornecer insights
 * 
 * EXEMPLOS DE PERGUNTAS QUE O CHATBOT PODE RESPONDER:
 * - "Qual foi o produto mais vendido?"
 * - "Qual a receita total de Janeiro?"
 * - "Quantos produtos da categoria Periféricos foram vendidos?"
 * - "Qual a média de vendas por produto?"
 * - "Compare as vendas de Janeiro com Fevereiro"
 * - "Quais produtos tiveram melhor desempenho?"
 */
