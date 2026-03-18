"""Authentication routes."""
from fastapi import APIRouter, HTTPException, Body, Query
from services.auth import (
    verify_google_token,
    generate_jwt,
    get_google_callback_url,
    get_google_redirect_uri,
)

router = APIRouter(prefix="/auth", tags=["auth"])

@router.get("/health")
async def health():
    return {"status": "ok"}

@router.post("/google")
async def google_login(payload: dict = Body(...)):
    """
    Login Google universal.
    Aceita 'credential' ou 'token'.
    Retorna o token com VÁRIOS nomes para garantir que o front encontre.
    """
    try:
        # 1. Tenta pegar o token vindo do frontend
        token_google = (
            payload.get("credential") or 
            payload.get("token") or 
            payload.get("idToken") or 
            payload.get("tokenId")
        )
        
        if not token_google:
            raise HTTPException(status_code=422, detail="Token Google não encontrado.")

        # 2. Valida com o Google
        user_info = verify_google_token(token_google)
        
        if not user_info:
            raise HTTPException(status_code=401, detail="Token inválido")

        # 3. Gera nosso JWT
        jwt_token = generate_jwt(user_info)
        
        print(f"✅ Login sucesso para: {user_info.get('email')}")

        # 4. RETORNA COM TODOS OS NOMES POSSÍVEIS
        # O frontend está procurando por 'token', então ele TEM que estar aqui.
        return {
            "token": jwt_token,          # <--- O FRONTEND QUER ESSE
            "access_token": jwt_token,   # <--- Padrão OAuth
            "jwt": jwt_token,            # <--- Padrão alternativo
            "id_token": jwt_token,       # <--- Padrão alternativo
            "callback_url": get_google_callback_url(),
            "redirect_uri": get_google_redirect_uri(),
            "user": user_info
        }
        
    except Exception as e:
        print(f"❌ Erro: {str(e)}")
        raise HTTPException(status_code=401, detail=str(e))


@router.get("/google/callback")
async def google_callback(code: str | None = Query(None), state: str | None = Query(None)):
    callback_url = get_google_callback_url()
    redirect_uri = get_google_redirect_uri()
    return {
        "ok": True,
        "callback_url": callback_url,
        "redirect_uri": redirect_uri,
        "code": code,
        "state": state,
        "message": "Callback do Google recebido",
    }