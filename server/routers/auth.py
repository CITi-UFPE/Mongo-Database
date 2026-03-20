"""Authentication routes."""
from fastapi import APIRouter, HTTPException, Body, Query, Header
from services.auth import (
    verify_google_token,
    generate_jwt,
    get_google_callback_url,
    get_google_redirect_uri,
    decode_jwt,
)
from services.db import MongoDB

router = APIRouter(prefix="/auth", tags=["auth"])


def _normalize_email(value: str | None) -> str:
    return (value or "").strip().lower()


def _email_variants(email: str) -> list[str]:
    variants = []
    normalized = _normalize_email(email)
    if not normalized:
        return variants

    variants.append(normalized)

    if "@" in normalized:
        local, domain = normalized.split("@", 1)
        no_dots_local = local.replace(".", "")
        if no_dots_local and no_dots_local != local:
            variants.append(f"{no_dots_local}@{domain}")

    # remove duplicates preserving order
    seen = set()
    unique = []
    for item in variants:
        if item not in seen:
            seen.add(item)
            unique.append(item)
    return unique


def _find_member_by_email(membros_col, email: str | None):
    variants = _email_variants(email or "")
    if not variants:
        return None

    # Tentativa 1: match direto para qualquer variante conhecida
    member = membros_col.find_one({'email': {'$in': variants}})
    if member:
        return member

    # Tentativa 2: match case-insensitive
    for candidate in variants:
        member = membros_col.find_one({'email': {'$regex': f'^{candidate}$', '$options': 'i'}})
        if member:
            return member

    return None

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

        # 2.1 Enriquece com dados da coleção membros quando existir
        db_instance = MongoDB.get_instance()
        membros_col = db_instance.get_collection('membros')
        if membros_col is not None:
            membro = _find_member_by_email(membros_col, user_info.get('email'))
            if membro:
                resolved_role = membro.get('role', 'user')
                user_info['name'] = membro.get('nome', user_info.get('name', ''))
                user_info['role'] = resolved_role
                user_info['position'] = resolved_role
                user_info['department'] = membro.get('department', '')

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


@router.get("/me")
async def get_current_user(Authorization: str | None = Header(None)):
    """
    Retorna os dados completos do utilizador autenticado.
    Lê o JWT do header Authorization e consulta a BD para retornar
    nome, role, department, email, picture.
    """
    try:
        if not Authorization or not Authorization.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Token não fornecido")
        
        # Extrai o token do header
        token = Authorization.split("Bearer ")[1]
        
        # Descodifica o JWT
        payload = decode_jwt(token)
        user_email = _normalize_email(payload.get('email'))
        
        if not user_email:
            raise HTTPException(status_code=401, detail="Email não encontrado no token")
        
        # Consulta a BD para encontrar o membro
        db_instance = MongoDB.get_instance()
        membros_col = db_instance.get_collection('membros')
        
        if membros_col is None:
            raise HTTPException(status_code=500, detail="Base de dados não disponível")
        
        membro = _find_member_by_email(membros_col, user_email)
        
        if membro:
            resolved_role = membro.get('role', 'user')
            # Se encontrado na BD, retorna dados enriquecidos
            return {
                'email': user_email,
                'name': membro.get('nome', payload.get('name', '')),
                'picture': payload.get('picture'),
                'role': resolved_role,
                'position': resolved_role,
                'department': membro.get('department', ''),
            }
        else:
            # Se não encontrado, retorna dados do Google
            return {
                'email': user_email,
                'name': payload.get('name', ''),
                'picture': payload.get('picture'),
                'role': 'user',
                'position': 'user',
                'department': '',
            }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Erro ao buscar utilizador: {str(e)}")
        raise HTTPException(status_code=401, detail=f"Erro ao verificar token: {str(e)}")