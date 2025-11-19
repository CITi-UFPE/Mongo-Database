# Mongo-Database

Aplicação web full-stack para análise de dados com autenticação Google OAuth, dashboard de analytics e gerenciamento de dados MongoDB.

## 📋 Sumário

- [Descrição](#descrição)
- [Stack Tecnológica](#stack-tecnológica)
- [Requisitos](#requisitos)
- [Variáveis de Ambiente](#variáveis-de-ambiente)
- [Execução Local](#execução-local)
- [Execução com Docker](#execução-com-docker)
- [Acesso às Interfaces](#acesso-às-interfaces)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [Resolução de Problemas](#resolução-de-problemas)

## 📖 Descrição

Aplicação web moderna para visualização e análise de dados com dashboard interativo. O projeto oferece:

- 🔐 Autenticação via Google OAuth
- 📊 Dashboard de analytics com visualizações de dados
- 🗄️ Gerenciamento de dados MongoDB
- 🤖 Integração com Google Gemini AI
- 🎨 Interface moderna com Tailwind CSS e animações

## 🛠️ Stack Tecnológica

### Frontend
- **React 19** com **TypeScript**
- **Vite** como build tool
- **Tailwind CSS** para estilização
- **React Router** para navegação
- **Recharts** para visualizações de dados
- **Framer Motion** e **GSAP** para animações
- **Radix UI** para componentes acessíveis

### Backend
- **Node.js** com **Express**
- **MongoDB** com **Mongoose**
- **Passport.js** para autenticação (Google OAuth)
- **JWT** para tokens de autenticação
- **Google Generative AI** (Gemini)

### DevOps
- **Docker** e **Docker Compose**
- **Nginx** para servir o frontend
- **Mongo Express** para administração do banco

## ✅ Requisitos

- **Node.js** v16 ou superior
- **npm** ou **yarn**
- **MongoDB** (local ou remoto)
- **Docker** e **Docker Compose** (para execução containerizada)
- **Git**

## 🔑 Variáveis de Ambiente

### Backend (`server/.env`)

```env
# MongoDB
MONGO_URI_DEV=mongodb://admin:senhasegura123@localhost:27017/admin
MONGO_INITDB_ROOT_USERNAME=admin
MONGO_INITDB_ROOT_PASSWORD=senhasegura123
MONGO_INITDB_DATABASE=admin

# JWT
JWT_SECRET=seu_jwt_secret_aqui

# Google OAuth
GOOGLE_CLIENT_ID=seu_google_client_id
GOOGLE_CLIENT_SECRET=seu_google_client_secret

# URLs
FRONTEND_URL=http://localhost:3080
API_URL=http://localhost:5000

# Gemini AI
GEMINI_API_KEY=sua_api_key_gemini
```

### Frontend (`client/.env`)

```env
VITE_GOOGLE_CLIENT_ID=seu_google_client_id
VITE_GEMINI_API_KEY=sua_api_key_gemini
REACT_APP_BASE_URL=http://localhost:5000
```

## 🚀 Execução Local

### 1. Clone o repositório

```bash
git clone <repo-url>
cd Mongo-Database
```

### 2. Configurar MongoDB Local

Certifique-se de ter o MongoDB rodando localmente na porta 27017, ou use a versão Docker.

### 3. Backend

```bash
cd server
npm install
npm run server
```

O servidor estará disponível em `http://localhost:5000`

### 4. Frontend

```bash
cd client
npm install
npm run dev
```

O frontend estará disponível em `http://localhost:5173` (porta padrão do Vite)

## 🐳 Execução com Docker

### 1. Configure as variáveis de ambiente

Certifique-se de que os arquivos `.env` existem em `server/.env` e `client/.env` com as configurações corretas.

### 2. Suba os containers

```bash
docker compose up -d
```

### 3. Verifique os logs

```bash
docker compose logs -f
```

### 4. Pare os containers

```bash
docker compose down
```

## 🌐 Acesso às Interfaces

Após iniciar a aplicação (Docker):

| Serviço | URL | Descrição |
|---------|-----|-----------|
| **Frontend** | http://localhost:3080 | Interface principal da aplicação |
| **Backend API** | http://localhost:5000 | API REST |
| **Mongo Express** | http://localhost:8081 | Interface de administração do MongoDB |
| **MongoDB** | localhost:27017 | Banco de dados (acesso direto) |

### Credenciais Mongo Express
- **Usuário**: `admin`
- **Senha**: `admin`

## 📁 Estrutura do Projeto

```
Mongo-Database/
├── client/                 # Frontend React + TypeScript + Vite
│   ├── src/
│   │   ├── components/    # Componentes React
│   │   ├── pages/         # Páginas da aplicação
│   │   │   └── Analytics/ # Dashboard de analytics
│   │   ├── App.tsx        # Componente principal
│   │   └── main.tsx       # Entry point
│   ├── docker/            # Configurações Docker
│   ├── package.json
│   └── vite.config.js
│
├── server/                # Backend Node.js + Express
│   ├── src/
│   │   ├── models/       # Modelos Mongoose
│   │   ├── routes/       # Rotas da API
│   │   ├── services/     # Lógica de negócio
│   │   ├── middleware/   # Middlewares Express
│   │   └── index.js      # Entry point
│   ├── docker/           # Configurações Docker
│   ├── security/         # Certificados HTTPS (dev)
│   └── package.json
│
├── docker-compose.yml    # Orquestração dos containers
└── README.md
```

## 🔧 Resolução de Problemas

### Erro de conexão com MongoDB

Verifique se o MongoDB está rodando e se as credenciais no `.env` estão corretas:

```bash
# Verificar containers Docker
docker ps

# Ver logs do MongoDB
docker compose logs mdp-mongo
```

### Erro de autenticação Google

1. Verifique se o `GOOGLE_CLIENT_ID` está configurado corretamente em ambos `.env` (client e server)
2. Certifique-se de que a URL de redirect está configurada no Google Cloud Console
3. A URL deve ser: `http://localhost:5000/auth/google/callback`

### Frontend não conecta ao Backend

Verifique se o `REACT_APP_BASE_URL` no `client/.env` aponta para a URL correta do backend:

```env
REACT_APP_BASE_URL=http://localhost:5000
```

### Porta já em uso

Se alguma porta estiver em uso, você pode alterar no `docker-compose.yml`:

```yaml
ports:
  - '3080:80'  # Altere 3080 para outra porta
```

### Erro ao buildar com Vite

Limpe o cache e reinstale as dependências:

```bash
cd client
rm -rf node_modules dist
npm install
npm run build
```

## 📝 Scripts Disponíveis

### Backend

```bash
npm run server      # Inicia o servidor em modo desenvolvimento
npm run build       # Compila o código com Babel
npm start-prod      # Inicia em modo produção
npm run reseed      # Recarrega dados no banco
```

### Frontend

```bash
npm run dev         # Inicia servidor de desenvolvimento Vite
npm run build       # Compila para produção
npm run preview     # Preview da build de produção
npm run lint        # Executa o linter
```

## 📄 Licença

Projeto licenciado sob MIT License.
