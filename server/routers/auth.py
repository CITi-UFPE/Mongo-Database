"""Authentication routes."""
import re
import os
from fastapi import APIRouter, HTTPException, Body, Query, Header
from bson import ObjectId
from services.auth import (
    verify_google_token,
    generate_jwt,
    get_google_callback_url,
    get_google_redirect_uri,
    decode_jwt,
)
from services.db import MongoDB

router = APIRouter(prefix="/auth", tags=["auth"])

PERMISSOES = {
    "Diretoria": ["comercial", "financeiro"],
    "Comercial": ["comercial"],
    "Financeiro": ["financeiro"],
    "Dados": ["comercial", "financeiro"],
}

PERMISSOES_NIVEL_VALIDAS = {"Comercial", "Financeiro", "Ambos"}


def _is_citi_email(email: str | None) -> bool:
    normalized = _normalize_email(email)
    if not normalized or "@" not in normalized:
        return False
    return normalized.endswith("@citi") or "@citi." in normalized


def _normalize_status(value: str | None) -> str:
    normalized = (value or "").strip().lower()
    if normalized == "aprovado":
        return "Aprovado"
    if normalized == "pendente":
        return "Pendente"
    return "Pendente"


def _is_approved_status(value: str | None) -> bool:
    return _normalize_status(value) == "Aprovado"


def _parse_admin_emails() -> set[str]:
    raw = (os.getenv("RBAC_ADMIN_EMAILS") or os.getenv("ADMIN_EMAILS") or "").strip()
    if not raw:
        return set()
    separators_normalized = raw.replace(";", ",")
    return {
        _normalize_email(item)
        for item in separators_normalized.split(",")
        if _normalize_email(item)
    }


def _is_admin_actor(user_payload: dict) -> bool:
    email = _normalize_email(user_payload.get("email"))
    role = (user_payload.get("role") or user_payload.get("position") or "").strip().lower()
    department = (user_payload.get("department") or "").strip().lower()

    if email and email in _parse_admin_emails():
        return True

    if role == "dados" or department == "dados":
        return True

    if "dados" in role:
        return True

    return False


def _resolve_member_access(member_doc: dict) -> tuple[str, bool]:
    raw_status = member_doc.get("status")
    has_status = isinstance(raw_status, str) and raw_status.strip()

    if has_status:
        status = _normalize_status(raw_status)
    else:
        # Compatibilidade com base legada: membro existente sem status
        # deve continuar com acesso aprovado por padrão.
        if isinstance(member_doc.get("acesso_aprovado"), bool):
            status = "Aprovado" if member_doc.get("acesso_aprovado") else "Pendente"
        else:
            status = "Aprovado"

    acesso_aprovado = bool(member_doc.get("acesso_aprovado", status == "Aprovado"))
    if status == "Pendente":
        acesso_aprovado = False

    return status, acesso_aprovado


def _is_member_admin(member_doc: dict) -> bool:
    status, acesso_aprovado = _resolve_member_access(member_doc)
    if status != "Aprovado" or not acesso_aprovado:
        return False

    email = _normalize_email(member_doc.get("email"))
    role = _first_non_empty(member_doc, ("role", "cargo", "position", "funcao", "função"), "").strip().lower()
    department = _first_non_empty(member_doc, ("department", "departamento", "area", "área"), "").strip().lower()

    if email and email in _parse_admin_emails():
        return True

    # Regra: qualquer pessoa aprovada da área de Dados pode acessar o painel admin.
    return "dados" in role or "dados" in department


def _require_admin_member(authorization: str | None) -> dict:
    auth_user = _decode_authenticated_user(authorization)
    user_email = _normalize_email(auth_user.get("email"))

    db_instance = MongoDB.get_instance()
    membros_col = _resolve_members_collection(db_instance)
    if membros_col is None:
        raise HTTPException(status_code=500, detail="Base de dados não disponível")

    member_doc = _find_member_by_email(membros_col, user_email)
    if not member_doc:
        raise HTTPException(status_code=403, detail="Acesso restrito ao administrador")

    if not _is_member_admin(member_doc):
        raise HTTPException(status_code=403, detail="Acesso restrito ao administrador")

    return member_doc


def _extract_bearer_token(authorization: str | None) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token não fornecido")
    token = authorization.split("Bearer ", 1)[1].strip()
    if not token:
        raise HTTPException(status_code=401, detail="Token não fornecido")
    return token


def _decode_authenticated_user(authorization: str | None) -> dict:
    token = _extract_bearer_token(authorization)
    payload = decode_jwt(token)
    if not isinstance(payload, dict):
        raise HTTPException(status_code=401, detail="Token inválido")
    return payload


def _serialize_member_for_admin(member_doc: dict) -> dict:
    status, acesso_aprovado = _resolve_member_access(member_doc)
    return {
        "id": str(member_doc.get("_id")) if member_doc.get("_id") is not None else None,
        "email": _normalize_email(member_doc.get("email")),
        "name": _first_non_empty(member_doc, ("nome", "name"), ""),
        "role": _first_non_empty(member_doc, ("role", "cargo", "funcao", "função"), ""),
        "department": _first_non_empty(member_doc, ("department", "departamento", "area", "área"), ""),
        "status": status,
        "acesso_aprovado": acesso_aprovado,
        "permissao_nivel": (member_doc.get("permissao_nivel") or "").strip() or None,
    }


def _resolve_members_collection(db_instance):
    """Resolve members collection supporting common singular/plural naming variants."""
    db = db_instance.get_db()
    if db is None:
        return None

    existing_collections = set(db.list_collection_names())
    for collection_name in ("membros", "mebros", "membro"):
        if collection_name in existing_collections:
            return db_instance.get_collection(collection_name)
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

    canonical_target = _canonical_email(email)
    variants_set = set(variants)
    print(f"      🔎 Variantes de email consideradas: {variants}")

    # Tentativa 1: match direto para qualquer variante conhecida
    member = membros_col.find_one({'email': {'$in': variants}})
    if member:
        print(f"      ✅ Match (direto): {member.get('email')}")
        return member

    # Tentativa 2: match case-insensitive com regex escapado
    for candidate in variants:
        escaped = re.escape(candidate)
        member = membros_col.find_one({'email': {'$regex': f'^\\s*{escaped}\\s*$', '$options': 'i'}})
        if member:
            print(f"      ✅ Match (case-insensitive): {member.get('email')}")
            return member

    # Tentativa 3: match canônico (ignora pontos e +alias no local-part).
    if canonical_target:
        normalized_domain = canonical_target.split("@", 1)[1] if "@" in canonical_target else ""
        escaped_domain = re.escape(normalized_domain)
        scope_query = {"email": {"$regex": f"@{escaped_domain}\\s*$", "$options": "i"}} if normalized_domain else {}
        for candidate_member in membros_col.find(scope_query, {"email": 1}):
            if _canonical_email(candidate_member.get("email")) == canonical_target:
                full_doc = membros_col.find_one({"email": candidate_member.get("email")})
                if full_doc:
                    print(f"      ✅ Match (canônico): {full_doc.get('email')}")
                    return full_doc

    # Tentativa 4: varredura normalizada completa (trim/lower/canônico), sem relaxar domínio.
    # Mantém segurança de correspondência por email e evita falso positivo por nome/local-part apenas.
    for candidate_member in membros_col.find({}, {"email": 1}):
        stored_email_raw = candidate_member.get("email")
        stored_email = _normalize_email(stored_email_raw)
        if not stored_email:
            continue

        if stored_email in variants_set:
            full_doc = membros_col.find_one({"email": stored_email_raw})
            if full_doc:
                print(f"      ✅ Match (normalizado): {full_doc.get('email')}")
                return full_doc

    # Tentativa 5: busca "fuzzy" por local-part em QUALQUER email
    # Útil se o domínio é diferente (ex: gmail vs citi.org)
    if canonical_local:
        print(f"      🔄 Tentando match fuzzy por local-part: '{canonical_local}'")
        candidates_fuzzy = []
        for candidate_member in membros_col.find({}, {"email": 1, "nome": 1}):
            candidate_canonical = _canonical_email(candidate_member.get("email"))
            candidate_local = candidate_canonical.split("@", 1)[0] if "@" in candidate_canonical else ""
            if candidate_local == canonical_local:
                candidates_fuzzy.append(candidate_member.get("email"))
        
        if len(candidates_fuzzy) == 1:
            full_doc = membros_col.find_one({"email": candidates_fuzzy[0]})
            if full_doc:
                print(f"      ⚠️  Match (fuzzy por local-part): {full_doc.get('email')} (domínios diferentes!)")
                return full_doc
        elif len(candidates_fuzzy) > 1:
            print(f"      ⚠️  Múltiplos matches fuzzy encontrados: {candidates_fuzzy}. Sem ação.")

    # Tentativa 6: busca por primeiro nome + possível sobrenome (search em "nome" por pattern)
    # Ex: Se email é "maria.eduardo", procura por "Maria Eduardo*" no nome
    if canonical_local and "." in canonical_local:
        parts = canonical_local.split(".")
        if len(parts) >= 2:
            first_name = parts[0].capitalize()
            print(f"      🔄 Tentando match por nome (primeiro nome: '{first_name}')...")
            member = membros_col.find_one({'nome': {'$regex': f'^{first_name}', '$options': 'i'}})
            if member:
                print(f"      ✅ Match (por nome): {member.get('nome')} ({member.get('email')})")
                return member

    print(f"      ❌ Nenhum match encontrado para: '{email}'")
    return None


def _first_non_empty(member_doc: dict, keys: tuple[str, ...], default: str = "") -> str:
    for key in keys:
        value = member_doc.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()
    return default


def _extract_member_auth_fields(member_doc: dict, fallback_name: str = "") -> tuple[str, str, str]:
    """
    Extrai campos do documento do membro do banco.
    
    Estrutura esperada:
    {
      "_id": "...",
      "nome": "Maria Eduarda Soares",
      "email": "mariaeduarda.soares@citi.org.br",
      "username": "mariasoaresm",
      "role": "Especialista em Dados",
      "department": "Dados"
    }
    """
    # Procura por nome em múltiplas variantes
    name = _first_non_empty(member_doc, ("nome", "name", "fullname"), fallback_name)
    
    # Procura por role em múltiplas variantes (mas prefere "role" direto)
    role = _first_non_empty(member_doc, ("role", "cargo", "funcao", "função"), "")
    
    # Procura por department em múltiplas variantes
    department = _first_non_empty(member_doc, ("department", "departamento", "area", "área"), "")
    
    return name, role, department


def _build_user_response(member_doc: dict | None, base_user_info: dict) -> dict:
    base_email = _normalize_email(base_user_info.get("email"))
    base_name = (base_user_info.get("name") or "").strip()

    if not member_doc:
        response = {
            "email": base_email,
            "name": base_name or base_email,
            "picture": base_user_info.get("picture"),
            "role": "Pessoa Desenvolvedora",
            "position": "Pessoa Desenvolvedora",
            "department": "Desenvolvimento",
            "status": "Nao Cadastrado",
            "acesso_aprovado": False,
            "onboarding_required": True,
            "permissao_nivel": None,
            "is_admin": False,
        }
        return response

    resolved_name, resolved_role, resolved_department = _extract_member_auth_fields(
        member_doc,
        base_name or base_email,
    )
    status, acesso_aprovado = _resolve_member_access(member_doc)
    onboarding_required = status == "Nao Cadastrado"

    response = {
        "email": _normalize_email(member_doc.get("email") or base_email),
        "name": resolved_name,
        "picture": base_user_info.get("picture"),
        "role": resolved_role or "Pessoa Desenvolvedora",
        "position": resolved_role or "Pessoa Desenvolvedora",
        "department": resolved_department or "Desenvolvimento",
        "status": status,
        "acesso_aprovado": acesso_aprovado,
        "onboarding_required": onboarding_required,
        "permissao_nivel": (member_doc.get("permissao_nivel") or "").strip() or None,
        "is_admin": _is_member_admin(member_doc),
    }
    return response

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

        google_email = _normalize_email(user_info.get('email'))
        print(f"\n🔍 DEBUG GOOGLE AUTH:")
        print(f"   Email do Google: '{google_email}'")
        print(f"   Nome: {user_info.get('name')}")
        print(f"   Picture: {user_info.get('picture')}")

        if not _is_citi_email(google_email):
            raise HTTPException(status_code=403, detail="Apenas usuários com e-mail @citi podem acessar.")

        # 2.1 Enriquece com dados da coleção membros quando existir
        db_instance = MongoDB.get_instance()
        membros_col = _resolve_members_collection(db_instance)
        
        membro = None
        if membros_col is not None:
            print(f"   🔎 Procurando em collection: {membros_col.name}")
            
            # DEBUG: Lista TODOS os emails do banco para ver o que existe
            try:
                all_members = list(membros_col.find({}, {"email": 1, "nome": 1, "role": 1, "department": 1, "_id": 0}).limit(20))
                print(f"   📋 Primeiros 20 membros no banco:")
                for member in all_members:
                    email_val = member.get('email')
                    nome_val = member.get('nome')
                    role_val = member.get('role')
                    dept_val = member.get('department')
                    print(f"      - {nome_val} | {email_val} | Role: {role_val} | Dept: {dept_val}")
            except Exception as e:
                print(f"   ⚠️  Erro ao listar emails: {e}")
            
            membro = _find_member_by_email(membros_col, google_email)
            
            if membro:
                print(f"   ✅ Encontrado!")
            else:
                print(f"   ❌ NÃO encontrado no banco! Cadastro inicial será solicitado.")

        user_payload = _build_user_response(membro, user_info)
        user_info.update(user_payload)

        # 3. Gera nosso JWT
        jwt_token = generate_jwt(user_info)
        
        print(f"✅ Login sucesso para: {user_info.get('email')}")

        # 4. RETORNA COM TODOS OS NOMES POSSÍVEIS
        # O frontend está procurando por 'token', então ele TEM que estar aqui.
        response_payload = {
            "token": jwt_token,          # <--- O FRONTEND QUER ESSE
            "access_token": jwt_token,   # <--- Padrão OAuth
            "jwt": jwt_token,            # <--- Padrão alternativo
            "id_token": jwt_token,       # <--- Padrão alternativo
            "callback_url": get_google_callback_url(),
            "redirect_uri": get_google_redirect_uri(),
            "user": user_payload,
            "onboarding_required": bool(user_payload.get("onboarding_required")),
        }

        return response_payload
        
    except HTTPException:
        raise
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
        payload = _decode_authenticated_user(Authorization)
        user_email = _normalize_email(payload.get('email'))
        
        if not user_email:
            raise HTTPException(status_code=401, detail="Email não encontrado no token")
        
        # Consulta a BD para encontrar o membro
        db_instance = MongoDB.get_instance()
        membros_col = _resolve_members_collection(db_instance)
        
        if membros_col is None:
            raise HTTPException(status_code=500, detail="Base de dados não disponível")
        
        membro = _find_member_by_email(membros_col, user_email)

        if not _is_citi_email(user_email):
            raise HTTPException(status_code=403, detail="Apenas usuários com e-mail @citi podem acessar.")

        return _build_user_response(membro, payload)
    
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


@router.post("/register-profile")
async def register_profile(payload: dict = Body(...), Authorization: str | None = Header(None)):
    """Cria/atualiza cadastro inicial com status Pendente e acesso_aprovado=False."""
    try:
        auth_user = _decode_authenticated_user(Authorization)
        user_email = _normalize_email(auth_user.get("email"))
        user_name = (auth_user.get("name") or "").strip()

        if not _is_citi_email(user_email):
            raise HTTPException(status_code=403, detail="Apenas usuários com e-mail @citi podem acessar.")

        cargo = (payload.get("cargo") or payload.get("role") or "").strip()
        departamento = (payload.get("departamento") or payload.get("department") or "").strip()

        if not cargo:
            raise HTTPException(status_code=422, detail="Cargo é obrigatório")
        if not departamento:
            raise HTTPException(status_code=422, detail="Departamento é obrigatório")

        db_instance = MongoDB.get_instance()
        membros_col = _resolve_members_collection(db_instance)
        if membros_col is None:
            raise HTTPException(status_code=500, detail="Base de dados não disponível")

        existing = _find_member_by_email(membros_col, user_email)

        if existing:
            existing_status, existing_approved = _resolve_member_access(existing)
            if existing_status == "Aprovado" and existing_approved:
                return {
                    "ok": True,
                    "message": "Usuário já aprovado",
                    "user": _build_user_response(existing, auth_user),
                }

        doc_payload = {
            "email": user_email,
            "nome": user_name or user_email,
            "role": cargo,
            "position": cargo,
            "department": departamento,
            "departamento": departamento,
            "status": "Pendente",
            "acesso_aprovado": False,
            "permissao_nivel": None,
        }

        if existing:
            membros_col.update_one(
                {"_id": existing.get("_id")},
                {"$set": doc_payload},
            )
            saved = membros_col.find_one({"_id": existing.get("_id")})
        else:
            inserted = membros_col.insert_one(doc_payload)
            saved = membros_col.find_one({"_id": inserted.inserted_id})

        response_user = _build_user_response(saved, auth_user)
        response_user["status"] = "Pendente"
        response_user["acesso_aprovado"] = False
        response_user["onboarding_required"] = False

        return {
            "ok": True,
            "message": "Cadastro enviado para aprovação",
            "user": response_user,
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Erro ao registrar perfil: {str(e)}")
        raise HTTPException(status_code=500, detail="Erro interno ao registrar perfil")


@router.get("/admin/pending-users")
async def get_pending_users(Authorization: str | None = Header(None)):
    """Lista usuários pendentes para aprovação."""
    try:
        _require_admin_member(Authorization)

        db_instance = MongoDB.get_instance()
        membros_col = _resolve_members_collection(db_instance)
        if membros_col is None:
            raise HTTPException(status_code=500, detail="Base de dados não disponível")

        query = {
            "$or": [
                {"status": {"$regex": "^pendente$", "$options": "i"}},
                {"acesso_aprovado": False},
            ]
        }

        pending_users = [
            _serialize_member_for_admin(doc)
            for doc in membros_col.find(query).sort("email", 1)
        ]

        return {
            "ok": True,
            "items": pending_users,
            "total": len(pending_users),
            "permissoes": PERMISSOES,
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Erro ao listar pendentes: {str(e)}")
        raise HTTPException(status_code=500, detail="Erro ao listar usuários pendentes")


@router.post("/admin/approve-user")
async def approve_user(payload: dict = Body(...), Authorization: str | None = Header(None)):
    """Aprova usuário pendente e define nível de permissão."""
    try:
        _require_admin_member(Authorization)

        user_id = (payload.get("id") or payload.get("user_id") or "").strip()
        user_email = _normalize_email(payload.get("email"))
        permissao_nivel = (payload.get("permissao_nivel") or "").strip().title()

        if permissao_nivel not in PERMISSOES_NIVEL_VALIDAS:
            raise HTTPException(
                status_code=422,
                detail="Nível de permissão inválido. Use Comercial, Financeiro ou Ambos.",
            )

        db_instance = MongoDB.get_instance()
        membros_col = _resolve_members_collection(db_instance)
        if membros_col is None:
            raise HTTPException(status_code=500, detail="Base de dados não disponível")

        target_query = None
        if user_id:
            try:
                target_query = {"_id": ObjectId(user_id)}
            except Exception:
                raise HTTPException(status_code=422, detail="ID de usuário inválido")
        elif user_email:
            existing = _find_member_by_email(membros_col, user_email)
            if existing:
                target_query = {"_id": existing.get("_id")}

        if not target_query:
            raise HTTPException(status_code=422, detail="Informe id ou email do usuário")

        update_payload = {
            "status": "Aprovado",
            "acesso_aprovado": True,
            "permissao_nivel": permissao_nivel,
        }

        result = membros_col.update_one(target_query, {"$set": update_payload})
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Usuário não encontrado")

        saved = membros_col.find_one(target_query)
        response_user = _serialize_member_for_admin(saved or {})

        return {
            "ok": True,
            "message": "Usuário aprovado com sucesso",
            "user": response_user,
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Erro ao aprovar usuário: {str(e)}")
        raise HTTPException(status_code=500, detail="Erro ao aprovar usuário")