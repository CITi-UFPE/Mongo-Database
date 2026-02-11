from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers.data_cleaner.extract import router as integrations_router
from services.data_cleaner.integration import sync_pipefy
from services.db import db_client
from contextlib import asynccontextmanager
import os
from dotenv import load_dotenv

# Import routers
from routers import auth, spreadsheet, analytics, gemini

# Load env vars
load_dotenv()

# Lifespan context
@asynccontextmanager
async def lifespan(app: FastAPI):
    print("🚀 Starting server...")

    try:
        print("🔄 Running Pipefy sync...")
        result = sync_pipefy(first=50)
        print("✅ Sync done:", result)
    except Exception as e:
        print("⚠️ Sync failed but server will continue:", e)

    yield

    print("🛑 Shutting down...")

# Create app FIRST
app = FastAPI(title="CITi Data Lake", lifespan=lifespan)



# CORS Config
client_url_dev = os.getenv('CLIENT_URL_DEV', 'http://localhost:3080')
client_url_prod = os.getenv('CLIENT_URL_PROD', 'http://localhost:3080')

allowed_origins = [
    "http://localhost:5173",
    "http://localhost:4173",
    "http://localhost:3000",
    "http://localhost:3080",
    client_url_dev,
    client_url_prod,
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- INCLUSÃO DE ROTAS (AQUI ESTÁ A CORREÇÃO) ---

# 1. Auth (Geralmente o prefixo já está dentro do arquivo auth.py)
app.include_router(auth.router)

# 2. Spreadsheet (O prefixo /api/spreadsheet já está dentro do arquivo spreadsheet.py)
app.include_router(spreadsheet.router)

# 3. Analytics (CORREÇÃO DO ERRO 404)
# Incluímos em DOIS endereços para garantir que o frontend encontre
# ATENÇÃO: Para isso funcionar, você deve ter removido o prefixo de dentro do arquivo analytics.py
app.include_router(analytics.router, prefix="/api/analytics") # Caminho padrão
app.include_router(analytics.router, prefix="/analytics")     # Caminho de compatibilidade

# 4. Gemini IA
app.include_router(gemini.router)

#5. Integrações (Data Cleaner)
app.include_router(integrations_router)


@app.get("/")
async def root():
    return {"message": "Server is running"}

if __name__ == "__main__":
    import uvicorn
    import ssl
    
    port = int(os.getenv('PORT', 5000))
    host = os.getenv('HOST', '0.0.0.0')
    
    # Try to load HTTPS certificate
    try:
        ssl_context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
        ssl_context.load_cert_chain('certs/cert.pem', 'certs/key.pem')
        uvicorn.run(app, host=host, port=port, ssl_context=ssl_context)
    except:
        print("⚠️  Certificate not found. Running HTTP.")
        uvicorn.run(app, host=host, port=port)