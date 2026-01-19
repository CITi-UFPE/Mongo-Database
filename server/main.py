# server/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import os
from dotenv import load_dotenv

# Load env vars
load_dotenv()

# Lifespan context
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("🚀 Starting server...")
    yield
    # Shutdown
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

# Import routers AFTER app is created
from routers import auth, spreadsheet, analytics
from routers import gemini

# Include routers AFTER app is created
app.include_router(auth.router)
app.include_router(spreadsheet.router)
app.include_router(analytics.router)
app.include_router(gemini.router)

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