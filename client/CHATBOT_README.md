# Chatbot com Google Gemini AI

Integração completa de chatbot com IA usando Google Gemini API para análise de dados de planilhas.

## 🚀 Funcionalidades

- ✅ Chatbot inteligente com contexto dos dados da planilha
- ✅ Análise automática de métricas e estatísticas
- ✅ Respostas em linguagem natural sobre vendas, produtos e clientes
- ✅ Interface moderna e responsiva
- ✅ Configuração segura com Docker Secrets
- ✅ Suporte para ambiente de desenvolvimento e produção

## 📋 Pré-requisitos

1. **Google Gemini API Key**
   - Acesse: https://makersuite.google.com/app/apikey
   - Crie uma nova API key
   - Guarde a chave em local seguro

2. **Docker Swarm** (para produção)
   ```bash
   docker swarm init
   ```

## 🔧 Configuração

### 1. Configurar Docker Secret (Produção)

```bash
# Criar secret APENAS do Gemini API Key
echo "sua-api-key-aqui" | docker secret create gemini_api_key -

# Ou a partir de um arquivo
docker secret create gemini_api_key C:\caminho\para\gemini_api_key.txt

# Verificar secret criado
docker secret ls

# Nota: Google Client ID continua como ARG no build do Docker
```

### 2. Configurar Variáveis de Ambiente (Desenvolvimento)

Crie um arquivo `.env` na pasta `client/`:

```env
VITE_GOOGLE_CLIENT_ID=seu-google-client-id
VITE_GEMINI_API_KEY=sua-gemini-api-key
```

**IMPORTANTE:** Adicione `.env` ao `.gitignore`:

```gitignore
# Arquivos de ambiente
.env
.env.local
.env.production
*.env
```

### 3. Build e Deploy

**Desenvolvimento:**
```bash
cd client
npm install
npm run dev
```

**Produção com Docker:**
```bash
# Build da imagem
docker-compose build

# Deploy com Docker Swarm
docker stack deploy -c docker-compose.yml mdp-stack

# Verificar status
docker stack services mdp-stack
```

## 💻 Como Usar

### 1. Importar o Componente

```tsx
import { Chatbot } from './components/Chatbot/Chatbot';
```

### 2. Preparar os Dados

```tsx
const spreadsheetData = [
  { 
    produto: 'Notebook Dell', 
    vendas: 150, 
    receita: 225000, 
    mes: 'Janeiro' 
  },
  { 
    produto: 'Mouse Logitech', 
    vendas: 450, 
    receita: 22500, 
    mes: 'Janeiro' 
  },
  // ... mais dados
];
```

### 3. Adicionar à Página

```tsx
export const MinhaPage = () => {
  const [isChatOpen, setIsChatOpen] = useState(false);

  return (
    <div>
      <h1>Minha Página</h1>
      
      {/* Seus componentes */}
      
      <Chatbot 
        spreadsheetData={spreadsheetData}
        isOpen={isChatOpen}
        onToggle={() => setIsChatOpen(!isChatOpen)}
      />
    </div>
  );
};
```

## 🎯 Exemplos de Perguntas

O chatbot pode responder perguntas como:

- **Análises Gerais:**
  - "Qual foi o produto mais vendido?"
  - "Quantas vendas tivemos no total?"
  - "Qual a receita total?"

- **Comparações:**
  - "Compare as vendas de Janeiro com Fevereiro"
  - "Qual categoria teve melhor desempenho?"

- **Métricas:**
  - "Qual a média de vendas por produto?"
  - "Qual o ticket médio?"
  - "Quais produtos estão acima da média?"

- **Insights:**
  - "Quais produtos devo focar?"
  - "Há algum padrão nas vendas?"
  - "Que insights você pode me dar sobre os dados?"

## 🏗️ Arquitetura

```
client/
├── src/
│   ├── components/
│   │   └── Chatbot/
│   │       ├── Chatbot.tsx          # Componente principal
│   │       ├── Chatbot.css          # Estilos
│   │       └── ChatbotExample.tsx   # Exemplo de uso
│   ├── services/
│   │   └── geminiService.ts         # Integração com Gemini API
│   ├── config/
│   │   └── env.ts                   # Configuração de variáveis
│   └── main.tsx
├── docker/
│   ├── Dockerfile
│   ├── inject-env.sh                # Script de injeção de secrets
│   └── default.conf
└── index.html
```

## 🔒 Segurança

### Docker Secrets (Recomendado para Gemini API Key)

- ✅ Gemini API Key não fica na imagem Docker
- ✅ Secret injetado em runtime
- ✅ Não é commitado no Git
- ✅ Gerenciado pelo Docker Swarm
- ℹ️ Google Client ID permanece como variável de build normal (não é sensível)

### Fluxo de Secrets

1. Secret criado no Docker Swarm (apenas Gemini API Key)
2. Container inicia e executa `inject-env.sh`
3. Script lê `/run/secrets/gemini_api_key`
4. Cria `env-config.js` apenas com Gemini API Key
5. Frontend carrega configuração em runtime
6. Google Client ID continua usando variável de build (ARG no Dockerfile)

## 🐛 Troubleshooting

### Erro: "Gemini API Key não configurada"

**Solução:**
```bash
# Verificar se o secret existe
docker secret ls

# Recriar o secret se necessário
docker secret rm gemini_api_key
echo "sua-api-key" | docker secret create gemini_api_key -

# Reiniciar o stack
docker stack rm mdp-stack
docker stack deploy -c docker-compose.yml mdp-stack
```

### Erro: "API key not valid"

**Solução:**
1. Verifique se a API key está correta
2. Acesse https://makersuite.google.com/app/apikey
3. Gere uma nova chave se necessário
4. Atualize o secret

### Chat não inicializa

**Solução:**
1. Abra o Console do navegador (F12)
2. Verifique se há erros
3. Confirme que `window._env_` está definido
4. Teste acessando: `http://seu-dominio/env-config.js`

### Permissão negada no inject-env.sh

**Solução:**
```dockerfile
# Adicione no Dockerfile (já está configurado)
RUN chmod +x /docker-entrypoint.d/40-inject-env.sh
```

## 📊 Monitoramento

### Verificar Logs

```bash
# Logs do container
docker service logs mdp-stack_mdp-client

# Logs em tempo real
docker service logs -f mdp-stack_mdp-client

# Verificar secrets montados
docker exec -it <container-id> ls -la /run/secrets/
```

### Testar Configuração

```bash
# Acessar container
docker exec -it <container-id> sh

# Verificar arquivo de configuração
cat /usr/share/nginx/html/env-config.js

# Verificar secret
cat /run/secrets/gemini_api_key
```

## 🚀 Deploy em Produção

### 1. Preparar Secrets

```bash
# Gemini API Key
echo "production-api-key" | docker secret create gemini_api_key -

# Google Client ID (opcional)
echo "google-client-id" | docker secret create google_client_id -
```

### 2. Deploy

```bash
# Deploy do stack
docker stack deploy -c docker-compose.yml mdp-stack

# Verificar serviços
docker stack ps mdp-stack

# Verificar logs
docker service logs mdp-stack_mdp-client
```

### 3. Monitorar

```bash
# Status dos serviços
docker service ls

# Escalar serviço (se necessário)
docker service scale mdp-stack_mdp-client=3

# Atualizar imagem
docker service update --image nova-imagem:tag mdp-stack_mdp-client
```

## 📚 Documentação Adicional

- [Google Gemini API Docs](https://ai.google.dev/docs)
- [Docker Secrets](https://docs.docker.com/engine/swarm/secrets/)
- [React TypeScript](https://react-typescript-cheatsheet.netlify.app/)

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -m 'Adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT.
