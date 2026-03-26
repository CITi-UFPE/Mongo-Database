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


def _resolve_members_collection(db_instance):
    """Resolve members collection supporting common singular/plural naming variants."""
    for collection_name in ("mebros", "membros", "membro"):
        collection = db_instance.get_collection(collection_name)
        if collection is not None:
            return collection
    return None


def _normalize_email(value: str | None) -> str:
    return (value or "").strip().lower()


def _canonical_email(email: str | None) -> str:
    normalized = _normalize_email(email)
    if "@" not in normalized:
        return normalized

    local, domain = normalized.split("@", 1)
    # Handle common alias patterns: dots and plus tags in local part.
    local = local.split("+", 1)[0].replace(".", "")
    return f"{local}@{domain}"


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
        print(f"      ✅ Match (direto): {member.get('email')}")
        return member

    # Tentativa 2: match case-insensitive
    for candidate in variants:
        member = membros_col.find_one({'email': {'$regex': f'^{candidate}$', '$options': 'i'}})
        if member:
            print(f"      ✅ Match (case-insensitive): {member.get('email')}")
            return member

    # Tentativa 3: match canônico (ignora pontos e +alias no local-part).
    canonical_target = _canonical_email(email)
    if canonical_target:
        normalized_domain = canonical_target.split("@", 1)[1] if "@" in canonical_target else ""
        scope_query = {"email": {"$regex": f"@{normalized_domain}$", "$options": "i"}} if normalized_domain else {}
        for candidate_member in membros_col.find(scope_query, {"email": 1}):
            if _canonical_email(candidate_member.get("email")) == canonical_target:
                full_doc = membros_col.find_one({"email": candidate_member.get("email")})
                if full_doc:
                    print(f"      ✅ Match (canônico): {full_doc.get('email')}")
                    return full_doc

    # Tentativa 4: fallback por local-part canônico, ignorando domínio.
    # Ex.: ana.raquel@citi.org e ana.raquel@citi.org.br.
    canonical_local = ""
    if canonical_target and "@" in canonical_target:
        canonical_local = canonical_target.split("@", 1)[0]

    if canonical_local:
        candidates = []
        for candidate_member in membros_col.find({}, {"email": 1}):
            candidate_canonical = _canonical_email(candidate_member.get("email"))
            if "@" in candidate_canonical and candidate_canonical.split("@", 1)[0] == canonical_local:
                candidates.append(candidate_member.get("email"))

        # Só usa fallback se houver candidato único para evitar match incorreto.
        if len(candidates) == 1:
            full_doc = membros_col.find_one({"email": candidates[0]})
            if full_doc:
                print(f"      ✅ Match (local-part): {full_doc.get('email')}")
                return full_doc

    # Tentativa 5: NOVA - busca "fuzzy" por local-part em QUALQUER email
    # Útil se o domínio é diferente (ex: gmail vs citi.org)
    if canonical_local:
        print(f"      🔄 Tentando match fuzzy por local-part: '{canonical_local}'")
        for candidate_member in membros_col.find({}, {"email": 1, "name": 1}):
            candidate_canonical = _canonical_email(candidate_member.get("email"))
            candidate_local = candidate_canonical.split("@", 1)[0] if "@" in candidate_canonical else ""
            if candidate_local == canonical_local:
                full_doc = membros_col.find_one({"email": candidate_member.get("email")})
                if full_doc:
                    print(f"      ⚠️  Match (fuzzy por local-part): {full_doc.get('email')} (domínios diferentes!)")
                    return full_doc

    print(f"      ❌ Nenhum match encontrado para: '{email}'")
    return None


def _first_non_empty(member_doc: dict, keys: tuple[str, ...], default: str = "") -> str:
    for key in keys:
        value = member_doc.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()
    return default


def _extract_member_auth_fields(member_doc: dict, fallback_name: str = "") -> tuple[str, str, str]:
    name = _first_non_empty(member_doc, ("nome", "name"), fallback_name)
    role = _first_non_empty(member_doc, ("role", "cargo", "funcao", "função"), "user")
    department = _first_non_empty(member_doc, ("department", "departamento", "area", "área"), "")
    return name, role, department

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

        google_email = user_info.get('email')
        print(f"\n🔍 DEBUG GOOGLE AUTH:")
        print(f"   Email do Google: '{google_email}'")
        print(f"   Nome: {user_info.get('name')}")
        print(f"   Picture: {user_info.get('picture')}")

        # 2.1 Enriquece com dados da coleção membros quando existir
        db_instance = MongoDB.get_instance()
        membros_col = _resolve_members_collection(db_instance)
        
        if membros_col is not None:
            print(f"   🔎 Procurando em collection: {membros_col.name}")
            
            # DEBUG: Lista TODOS os emails do banco para ver o que existe
            try:
                all_members = list(membros_col.find({}, {"email": 1, "_id": 0}).limit(20))
                print(f"   📋 Primeiros 20 emails no banco:")
                for member in all_members:
                    email_val = member.get('email')
                    print(f"      - '{email_val}' (tipo: {type(email_val).__name__})")
            except Exception as e:
                print(f"   ⚠️  Erro ao listar emails: {e}")
            
            membro = _find_member_by_email(membros_col, google_email)
            
            if membro:
                print(f"   ✅ Encontrado!")
                resolved_name, resolved_role, resolved_department = _extract_member_auth_fields(
                    membro,
                    user_info.get('name', ''),
                )
                user_info['name'] = resolved_name
                user_info['role'] = resolved_role
                user_info['position'] = resolved_role
                user_info['department'] = resolved_department
                print(f"   ✅ Usuário enriquecido: Role={resolved_role}, Dept={resolved_department}")
            else:
                print(f"   ❌ NÃO encontrado no banco! Usando defaults...")

        # 2.2 Se ainda não tem role/department, atribui defaults (novo usuário Google)
        if not user_info.get('role'):
            user_info['role'] = "Pessoa Desenvolvedora"  # Default role para novos usuários
            print(f"⚠️  Atribuindo role DEFAULT ao novo usuário: {user_info.get('email')}")
        
        if not user_info.get('position'):
            user_info['position'] = user_info.get('role', "Pessoa Desenvolvedora")
        
        if not user_info.get('department'):
            user_info['department'] = "Desenvolvimento"  # Default department para novos usuários
            print(f"⚠️  Atribuindo department DEFAULT ao novo usuário: {user_info.get('email')}")

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
        membros_col = _resolve_members_collection(db_instance)
        
        if membros_col is None:
            raise HTTPException(status_code=500, detail="Base de dados não disponível")
        
        membro = _find_member_by_email(membros_col, user_email)
        
        if membro:
            resolved_name, resolved_role, resolved_department = _extract_member_auth_fields(
                membro,
                payload.get('name', ''),
            )
            # Se encontrado na BD, retorna dados enriquecidos
            return {
                'email': user_email,
                'name': resolved_name,
                'picture': payload.get('picture'),
                'role': resolved_role,
                'position': resolved_role,
                'department': resolved_department,
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


@router.get("/membros")
async def get_current_member(Authorization: str | None = Header(None)):
    """Alias de compatibilidade para /auth/me."""
    return await get_current_user(Authorization)


@router.get("/mebros")
async def get_current_mebros(Authorization: str | None = Header(None)):
    """Alias de compatibilidade para colecao nomeada como 'mebros'."""
    return await get_current_user(Authorization)