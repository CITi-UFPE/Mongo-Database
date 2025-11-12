# Mongo-Database

Aplicação web full-stack baseada na stack MERN (MongoDB, Express, React, Node.js) — boilerplate com autenticação local e via OAuth (Google/Facebook), gerenciamento de usuários, mensagens e funcionalidades administrativas.

## Sumário

- Descrição
- Requisitos
- Variáveis de ambiente
- Execução (desenvolvimento)
- Execução com Docker
- Geração de certificados HTTPS (desenvolvimento)
- Resolução de problemas comuns
- Estrutura do projeto
- Licença

## Descrição

Projeto exemplo para gerenciar dados em cenários de Data Lake e Data Warehouse. Fornece uma API REST no backend e um SPA em React no frontend, com controle de acesso por papéis (usuário/admin).

## Requisitos

- Node.js (recomenda-se v16 ou v18)
- npm
- MongoDB (local ou remoto)
- Git
- (Opcional) OpenSSL para gerar certificados HTTPS em desenvolvimento

## Variáveis de ambiente

Há um arquivo de exemplo `.env.example` na raiz do projeto. Para execução com Docker renomeie para `.env` na raiz. Para execução local do servidor, copie o `.env.example` para `server/.env` e ajuste os valores:

- MONGO_URI_DEV: string de conexão com o MongoDB
- JWT_SECRET: segredo para tokens JWT
- GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET: credenciais OAuth do Google (opcional)
- FACEBOOK_APP_ID / FACEBOOK_APP_SECRET: credenciais OAuth do Facebook (opcional)
- FRONTEND_URL / API_URL: URLs usadas por OAuth e retorno

Verifique `server` e `client` para variáveis adicionais mencionadas nos respectivos `package.json` ou código.

## Execução em desenvolvimento (local)

1. Clone o repositório e entre na pasta:

```bash
git clone <repo-url>
cd Mongo-Database
```

2. Backend

```bash
cd server
cp ../.env.example .env   # ou copie apenas as variáveis necessárias para server/.env
npm install
npm run server
```

O servidor roda em https://localhost:5000 (se certificados estiverem configurados) ou http://localhost:5000.

3. Frontend

```bash
cd ../client
npm install
npm run build
npm preview
```

O frontend roda em http://localhost:3000 (ou https://localhost:3000 se configurado).

Observação: Sem o backend conectado, funcionalidades de autenticação e dados dinâmicos não funcionarão.

## Execução com Docker

1. Crie/renomeie o arquivo de ambiente na raiz:

```bash
cp .env.example .env
```

2. Construa e suba os containers:

```bash
docker compose build
docker compose up -d
```

3. Verifique os logs:

```bash
docker compose logs -f
```

Parâmetros como portas e volumes estão definidos em `docker-compose.yml`.

## Geração de certificados HTTPS (desenvolvimento)

O Facebook exige redirecionamento HTTPS para OAuth. Para gerar certificados autoassinados (apenas para dev):

```bash
cd server/security
openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout cert.key -out cert.pem -config req.cnf -sha256
```

Coloque `cert.key` e `cert.pem` em `server/security` e certifique-se de que o `server` está configurado para usá-los.

## Resolução de problemas comuns

- Erro OpenSSL no Node 17+: use `NODE_OPTIONS=--openssl-legacy-provider npm start` ao iniciar o frontend.
- Compatibilidade React/React-Redux: use React 18.x com react-redux 7.2.x. Exemplo:

```bash
npm install react@18.2.0 react-dom@18.2.0 react-redux@7.2.9
```

- `react-scripts` não encontrado: reinstale `react-scripts@^5.0.1`.

## Estrutura do projeto (resumo)

- `/server` — backend Node.js (Express, Mongoose, Passport)
- `/client` — frontend React (Redux)
- `/server/security` — certificados HTTPS para desenvolvimento
- `.env` — variáveis de configuração

## Licença

Projeto licenciado como MIT.
