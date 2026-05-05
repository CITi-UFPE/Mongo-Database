# CITi — Plataforma de Dados

Aplicação web full-stack para análise de dados comerciais e financeiros do CITi (Centro de Informática e Tecnologia). Inclui dashboard de analytics, dashboard financeiro, integração com Pipefy e assistente de IA.

## Sumário

- [Descrição](#descrição)
- [Stack Tecnológica](#stack-tecnológica)
- [Requisitos](#requisitos)
- [Variáveis de Ambiente](#variáveis-de-ambiente)
- [Execução Local](#execução-local)
- [Execução com Docker](#execução-com-docker)
- [Acesso às Interfaces](#acesso-às-interfaces)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [Resolução de Problemas](#resolução-de-problemas)

## Descrição

Plataforma interna do CITi para visualização e análise de dados. O projeto oferece:

- Autenticação via Google OAuth com aprovação de acesso por administrador
- Dashboard comercial com funil de vendas, leads, conversão e previsão de faturamento
- Dashboard financeiro com entradas, saídas, metas e projetos
- Integração com Pipefy (CRM) para sincronização de leads
- Assistente de IA com contexto dos dados do dashboard (Groq / LLaMA 3.3)
- Interface moderna com Tailwind CSS, Recharts e animações Framer Motion

## Stack Tecnológica

### Frontend
- **React 19** com **TypeScript**
- **Vite** como build tool
- **Tailwind CSS** para estilização
- **React Router** para navegação
- **Recharts** para gráficos e visualizações
- **Framer Motion** para animações
- **Radix UI** para componentes acessíveis

### Backend
- **Python 3.13** com **FastAPI**
- **PyMongo** para conexão com MongoDB
- **Pydantic** para validação de dados
- **PyJWT** para autenticação JWT
- **Groq** (LLaMA 3.3 70B) para o assistente de IA
- **Uvicorn** como servidor ASGI

### Banco de Dados
- **MongoDB Atlas** em produção
- **MongoDB Docker** para desenvolvimento local
- Banco `database-comercial` — leads, funil, analytics
- Banco `citi_financeiro` — transações, projetos, histórico financeiro

### Integrações
- **Pipefy** (GraphQL) — sincronização de leads e CRM
- **Groq API** — assistente de IA com LLaMA 3.3 70B
- **Google OAuth 2.0** — autenticação de usuários

### DevOps
- **Docker** e **Docker Compose**
- **Nginx** para servir o frontend em produção
- Deploy no **Render** (backend e frontend)
- **MongoDB Atlas** para banco em produção

## Requisitos

**Para execução local (sem Docker):**
- Python 3.11+
- Node.js 18+
- MongoDB rodando localmente (ou acesso ao Atlas)

**Para execução com Docker:**
- Docker e Docker Compose instalados

## Variáveis de Ambiente

Cada ambiente precisa dos arquivos `.env`. **Nunca commite esses arquivos.**

### Backend (`server/.env`)

```env
# IA
GROQ_API_KEY=sua_groq_api_key

# Pipefy
PIPEFY_TOKEN=seu_pipefy_token
PIPEFY_PIPE_ID=seu_pipe_id

# Meta de faturamento mensal
META_FATURAMENTO=407000

# MongoDB
MONGO_URI_DEV=mongodb://admin:senha@localhost:27017/admin?authSource=admin
MONGO_URI_PROD=mongodb+srv://usuario:senha@cluster.mongodb.net/db?retryWrites=true&w=majority
MONGO_INITDB_ROOT_USERNAME=admin
MONGO_INITDB_ROOT_PASSWORD=sua_senha
MONGO_INITDB_DATABASE=admin

# Google OAuth
GOOGLE_CLIENT_ID=seu_google_client_id
GOOGLE_CLIENT_SECRET=seu_google_client_secret
GOOGLE_CALLBACK_URL=https://seu-backend.onrender.com/api/auth/google/callback

# JWT
JWT_SECRET_DEV=seu_jwt_secret
JWT_SECRET_PROD=seu_jwt_secret

# CORS
CLIENT_URL_DEV=http://localhost:5173
SERVER_URL_DEV=http://localhost:5000
CLIENT_URL_PROD=https://seu-frontend.onrender.com
SERVER_URL_PROD=https://seu-backend.onrender.com
ALLOWED_ORIGINS=https://seu-frontend.onrender.com

# Porta
PORT=5000
Frontend (client/.env)

REACT_APP_BASE_URL=https://seu-backend.onrender.com/api
VITE_API_URL=https://seu-backend.onrender.com/api
GOOGLE_CLIENT_ID=seu_google_client_id
Para obter a chave do Groq: acesse console.groq.com e crie uma API key gratuita.

Execução Local
1. Clone o repositório

git clone <repo-url>
cd Mongo-Database
2. Backend

cd server

# Criar e ativar ambiente virtual
python -m venv .venv
source .venv/bin/activate      # Linux/Mac
.venv\Scripts\activate         # Windows

# Instalar dependências
pip install -r requirements.txt

# Criar o server/.env com as variáveis necessárias (ver seção acima)

# Subir o servidor
uvicorn main:app --reload --port 5000
O backend estará disponível em http://localhost:5000

Documentação interativa (Swagger): http://localhost:5000/docs

3. Frontend

cd client

# Instalar dependências
npm install

# Criar o client/.env com as variáveis necessárias (ver seção acima)

# Subir o servidor de desenvolvimento
npm run dev
O frontend estará disponível em http://localhost:5173

Execução com Docker
1. Configure os arquivos .env
Certifique-se de que server/.env existe com as configurações corretas.

2. Suba os containers

docker compose up -d
3. Verifique os logs

docker compose logs -f
4. Pare os containers

docker compose down
Acesso às Interfaces
Serviço	URL	Descrição
Frontend	http://localhost:3080	Interface principal
Backend API	http://localhost:5000	API REST
Swagger	http://localhost:5000/docs	Documentação interativa da API
Mongo Express	http://localhost:8081	Administração do MongoDB
Estrutura do Projeto

Mongo-Database/
├── client/                         # Frontend React + TypeScript + Vite
│   ├── src/
│   │   ├── components/
│   │   │   ├── Chatbot/            # Assistente de IA
│   │   │   ├── dashboard/          # Componentes do dashboard comercial
│   │   │   ├── financial/          # Componentes do dashboard financeiro
│   │   │   └── ui/                 # Componentes reutilizáveis
│   │   ├── context/                # AuthContext
│   │   ├── pages/
│   │   │   ├── Auth/               # Login, Onboarding, Aprovação
│   │   │   └── analytics/          # Dashboard principal
│   │   ├── services/               # Chamadas à API (analytics, api)
│   │   └── types/                  # Tipos TypeScript
│   ├── package.json
│   └── vite.config.js
│
├── server/                         # Backend Python + FastAPI
│   ├── main.py                     # Entry point + CORS + routers
│   ├── routers/
│   │   ├── auth.py                 # Google OAuth + JWT + aprovação
│   │   ├── analytics.py            # KPIs, funil, previsão, faturamento
│   │   ├── spreadsheet.py          # Leitura de coleções MongoDB
│   │   ├── gemini.py               # Assistente de IA (Groq)
│   │   └── pipefy_service.py       # Integração Pipefy
│   ├── services/
│   │   ├── db.py                   # Conexão MongoDB (singleton)
│   │   ├── analytics_service.py    # Lógica de analytics e métricas
│   │   ├── pipefy_service.py       # Chamadas à API do Pipefy
│   │   └── pipefy_sync.py          # Sincronização Pipefy → MongoDB
│   └── requirements.txt
│
├── docker-compose.yml              # Orquestração dos containers
└── README.md
Resolução de Problemas
Erro ModuleNotFoundError ao subir o servidor
As dependências não foram instaladas. Execute dentro da pasta server/:


pip install -r requirements.txt
Erro de conexão com MongoDB
Verifique se o MongoDB está rodando e se o MONGO_URI_DEV no .env está correto:


# Ver logs do container MongoDB
docker compose logs mdp-mongo
Erro de autenticação Google
Verifique se GOOGLE_CLIENT_ID está igual no server/.env e client/.env
Confirme que a URL de callback está cadastrada no Google Cloud Console
URL de callback local: http://localhost:5000/api/auth/google/callback
Assistente de IA não responde
Verifique se GROQ_API_KEY está configurada no server/.env
Para obter uma chave gratuita: console.groq.com
Teste o endpoint diretamente em http://localhost:5000/docs → POST /api/gemini/chat
Frontend não conecta ao Backend
Confirme que VITE_API_URL no client/.env aponta para a URL correta:


VITE_API_URL=http://localhost:5000/api
Porta já em uso

# Ver qual processo está usando a porta 5000
lsof -i :5000        # Mac/Linux
netstat -ano | grep :5000   # Windows

