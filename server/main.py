from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.routing import APIRoute
from starlette.exceptions import HTTPException as StarletteHTTPException
from contextlib import asynccontextmanager
import os
from pathlib import Path
from dotenv import load_dotenv

from services.db import db_client


def _load_environment():
    server_dir = Path(__file__).resolve().parent
    project_root = server_dir.parent
    root_env = project_root / ".env"
    server_env = server_dir / ".env"

    if root_env.exists():
        load_dotenv(root_env, override=False)
    if server_env.exists():
        load_dotenv(server_env, override=True)


def _resolve_required_env(canonical_name: str, aliases):
    for env_name in aliases:
        raw_value = os.getenv(env_name)
        if isinstance(raw_value, str) and raw_value.strip():
            value = raw_value.strip()
            os.environ[canonical_name] = value
            return value
    return None


def _validate_required_envs():
    required_map = {
        "MONGO_URI": ["MONGO_URI", "MONGODB_URL", "MONGO_URI_DEV", "MONGO_URI_PROD"],
        "JWT_SECRET": ["JWT_SECRET", "JWT_SECRET_DEV", "JWT_SECRET_PROD"],
        "CLIENT_URL": ["CLIENT_URL", "CLIENT_URL_DEV", "CLIENT_URL_PROD", "FRONTEND_URL", "REACT_APP_BASE_URL"],
    }

    missing_vars = []
    for canonical_name, aliases in required_map.items():
        if not _resolve_required_env(canonical_name, aliases):
            print(f"Falta a variável {canonical_name} no seu arquivo .env")
            missing_vars.append(canonical_name)

    if missing_vars:
        raise RuntimeError("Variáveis de ambiente obrigatórias ausentes.")


_load_environment()
_validate_required_envs()

# Import routers (após carregar/validar env)
from routers import auth, spreadsheet, analytics, gemini

# Lifespan context
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("🚀 Starting server...")
    db_client.start_reconnect_loop()
    yield
    # Shutdown
    db_client.stop_reconnect_loop()
    print("🛑 Shutting down...")

# Create app FIRST
app = FastAPI(title="CITi Data Lake", lifespan=lifespan, redirect_slashes=False)

# CORS Config
def _safe_origin_value(raw):
    if not isinstance(raw, str):
        return None
    value = raw.strip().strip("/")
    if not value:
        return None
    if not (value.startswith("http://") or value.startswith("https://")):
        return None
    return value


def _safe_origin(env_key: str):
    return _safe_origin_value(os.getenv(env_key))


def _parse_allowed_origins():
    raw = os.getenv("ALLOWED_ORIGINS", "")
    if not isinstance(raw, str) or not raw.strip():
        return []

    parsed = []
    normalized = raw.replace(";", ",")
    for item in normalized.split(","):
        origin = _safe_origin_value(item)
        if origin:
            parsed.append(origin)
    return parsed


def _build_local_origins():
    origins = set()
    for host in ["localhost", "127.0.0.1"]:
        for port in [3000, 5173]:
            origins.add(f"http://{host}:{port}")
            origins.add(f"https://{host}:{port}")
    return sorted(origins)


default_origins = [
    *_build_local_origins(),
    "http://localhost:3080",
    "https://localhost:3080",
]

env_origins = [
    _safe_origin("CLIENT_URL_PROD"),
    *_parse_allowed_origins(),
]

allowed_origins = list(dict.fromkeys(default_origins + [origin for origin in env_origins if origin]))

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    # Covers: localhost/127.0.0.1 on any port (dev) + any *.onrender.com subdomain (prod)
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$|^https://[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)*\.onrender\.com$",
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "Accept", "X-Requested-With"],
)

# --- INCLUSÃO DE ROTAS (AQUI ESTÁ A CORREÇÃO) ---

# 1. Auth (Geralmente o prefixo já está dentro do arquivo auth.py)
app.include_router(auth.router)
app.include_router(auth.router, prefix="/api")

# 2. Spreadsheet (O prefixo /api/spreadsheet já está dentro do arquivo spreadsheet.py)
app.include_router(spreadsheet.router)

# 3. Analytics (CORREÇÃO DO ERRO 404)
# Incluímos em DOIS endereços para garantir que o frontend encontre
# ATENÇÃO: Para isso funcionar, você deve ter removido o prefixo de dentro do arquivo analytics.py
app.include_router(analytics.router, prefix="/api/analytics") # Caminho padrão
app.include_router(analytics.router, prefix="/analytics")     # Caminho de compatibilidade

# 4. Gemini IA
app.include_router(gemini.router)


def _register_slash_variants() -> None:
    """Make routes available with and without trailing slash."""
    existing = {
        (route.path, tuple(sorted(route.methods or [])))
        for route in app.router.routes
        if isinstance(route, APIRoute)
    }

    for route in list(app.router.routes):
        if not isinstance(route, APIRoute):
            continue
        if route.path == "/":
            continue

        alias_path = route.path.rstrip("/") if route.path.endswith("/") else f"{route.path}/"
        alias_key = (alias_path, tuple(sorted(route.methods or [])))
        if alias_key in existing:
            continue

        app.add_api_route(
            alias_path,
            route.endpoint,
            methods=list(route.methods or []),
            name=route.name,
            include_in_schema=False,
            response_model=route.response_model,
            status_code=route.status_code,
            tags=route.tags,
            dependencies=route.dependencies,
            summary=route.summary,
            description=route.description,
            response_description=route.response_description,
            responses=route.responses,
            deprecated=route.deprecated,
            operation_id=None,
            response_model_include=route.response_model_include,
            response_model_exclude=route.response_model_exclude,
            response_model_by_alias=route.response_model_by_alias,
            response_model_exclude_unset=route.response_model_exclude_unset,
            response_model_exclude_defaults=route.response_model_exclude_defaults,
            response_model_exclude_none=route.response_model_exclude_none,
            response_class=route.response_class,
        )
        existing.add(alias_key)


_register_slash_variants()


def _resolve_spa_index() -> Path | None:
    server_dir = Path(__file__).resolve().parent
    project_root = server_dir.parent

    candidates = [
        server_dir / "static" / "index.html",
        project_root / "static" / "index.html",
        project_root / "client" / "dist" / "index.html",
        project_root / "client" / "build" / "index.html",
        project_root / "build" / "index.html",
    ]

    for candidate in candidates:
        if candidate.exists():
            return candidate
    return None


@app.exception_handler(StarletteHTTPException)
async def spa_404_fallback(request: Request, exc: StarletteHTTPException):
    if exc.status_code != 404:
        return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})

    # Keep API endpoints returning JSON 404; only SPA routes get index.html fallback.
    if request.url.path.startswith("/api"):
        return JSONResponse(status_code=404, content={"detail": "Not Found"})

    index_file = _resolve_spa_index()
    if index_file:
        return FileResponse(index_file)

    return JSONResponse(status_code=404, content={"detail": "Not Found"})


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