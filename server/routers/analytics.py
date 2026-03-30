import os
import json
import re
from typing import Optional
from fastapi import APIRouter, Query, Header, HTTPException
from services.db import db_client
from services import analytics_service
from services.pipefy_sync import sync_pipefy_to_mongo
from services.auth import decode_jwt

# Importamos a sincronização do motor correto
from services.integration import sync_pipefy 

# Tenta importar ML, se falhar, usa mock
try:
    from services.prediction import performPrediction
except ImportError:
    performPrediction = None

router = APIRouter(tags=["analytics"])


def _normalize_email(value: str | None) -> str:
    return (value or "").strip().lower()


def _canonical_email(email: str | None) -> str:
    normalized = _normalize_email(email)
    if "@" not in normalized:
        return normalized

    local, domain = normalized.split("@", 1)
    local = local.split("+", 1)[0].replace(".", "")
    return f"{local}@{domain}"


def _email_variants(email: str | None) -> list[str]:
    normalized = _normalize_email(email)
    if not normalized:
        return []

    variants = [normalized]
    if "@" in normalized:
        local, domain = normalized.split("@", 1)
        no_dots_local = local.replace(".", "")
        if no_dots_local and no_dots_local != local:
            variants.append(f"{no_dots_local}@{domain}")

    unique = []
    seen = set()
    for item in variants:
        if item not in seen:
            seen.add(item)
            unique.append(item)
    return unique


def _find_member_by_email(members_col, email: str | None):
    variants = _email_variants(email)
    if not variants:
        return None

    direct = members_col.find_one({"email": {"$in": variants}})
    if direct:
        return direct

    for candidate in variants:
        escaped = re.escape(candidate)
        regex_match = members_col.find_one({"email": {"$regex": f"^\\s*{escaped}\\s*$", "$options": "i"}})
        if regex_match:
            return regex_match

    canonical_target = _canonical_email(email)
    if canonical_target:
        for candidate_member in members_col.find({}, {"email": 1}):
            if _canonical_email(candidate_member.get("email")) == canonical_target:
                return members_col.find_one({"email": candidate_member.get("email")})

    return None


def _resolve_members_collection():
    db = db_client.get_db()
    if db is None:
        return None

    for collection_name in ("membros", "mebros", "membro"):
        if collection_name in set(db.list_collection_names()):
            return db[collection_name]
    return None


def _assert_user_can_view_analytics(authorization: str | None) -> None:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token não fornecido")

    token = authorization.split("Bearer ", 1)[1].strip()
    if not token:
        raise HTTPException(status_code=401, detail="Token não fornecido")

    payload = decode_jwt(token)
    user_email = _normalize_email(payload.get("email")) if isinstance(payload, dict) else ""
    if not user_email:
        raise HTTPException(status_code=401, detail="Token inválido")

    members_col = _resolve_members_collection()
    if members_col is None:
        raise HTTPException(status_code=500, detail="Base de dados indisponível")

    member = _find_member_by_email(members_col, user_email)
    if not member:
        raise HTTPException(status_code=403, detail="Acesso não autorizado para Analytics")

    status = str(member.get("status") or "").strip().lower()
    acesso_aprovado = bool(member.get("acesso_aprovado", status == "aprovado"))
    if status == "pendente" or not acesso_aprovado:
        raise HTTPException(status_code=403, detail="Aguardando aprovação")


def _safe_text(value, default: str = "") -> str:
    if isinstance(value, str): return value
    if value is None: return default
    return str(value)

def _safe_int(value, default: int = 0) -> int:
    try: return int(value)
    except (TypeError, ValueError): return default

def _safe_float(value, default: float = 0.0) -> float:
    try: return float(value)
    except (TypeError, ValueError): return default

def _default_overview_payload():
    return {
        "total_leads": 0, "qualificados": 0, "nao_qualificados": 0,
        "valor_pipeline": 0.0, "total_perdidos": 0, "valor_perdido": 0.0,
        "previsao_faturamento": {"cenario_20": 0.0, "cenario_25": 0.0, "cenario_35": 0.0},
        "ticket_medio": 0.0, "taxa_conversao": 0.0,
        "progresso_meta": {"faturado": 0.0, "meta": 0.0, "porcentagem": 0.0, "falta_faturar": 0.0},
        "funil": [], "origem_leads": [], "distribuicao_servicos": [], "motivos_perda": [],
        "tempo_estagio": []
    }

def _build_overview_payload(data_inicio: Optional[str] = None, data_fim: Optional[str] = None):
    default_payload = _default_overview_payload()

    # 1. Leads e Qualificação
    info_leads = analytics_service.get_leads_qualificados(data_inicio=data_inicio, data_fim=data_fim)
    if not isinstance(info_leads, dict): info_leads = {}
    qualificados = _safe_int(info_leads.get("qualificados", 0), 0)
    total_leads = _safe_int(info_leads.get("total", 0), 0)
    nao_qualificados = max(total_leads - qualificados, 0)

    # 2. Taxas
    taxa_conversao = analytics_service.get_taxa_conversao(data_inicio=data_inicio, data_fim=data_fim)
    
    # 3. Faturamento e Previsão
    faturamento_info = analytics_service.get_faturamento_e_ticket(data_inicio=data_inicio, data_fim=data_fim)
    ticket_medio = _safe_float(faturamento_info.get("ticket_medio", 0.0))
    previsao_detalhada = analytics_service.get_previsao_detalhada(data_inicio=data_inicio, data_fim=data_fim)

    # 4. Construção do Funil (Precisamos dele antes da Meta para somar os valores)
    funil_raw = analytics_service.get_distribuicao_fases(data_inicio=data_inicio, data_fim=data_fim)
    funil = [
        {
            "fase": _safe_text(item.get("fase"), "Sem fase") or "Sem fase",
            "count": _safe_int(item.get("quantidade", 0), 0),
            "total_valor": _safe_float(item.get("total_valor", 0.0), 0.0),
        }
        for item in funil_raw if isinstance(item, dict)
    ]

    # 🔥 5. META CALCULADA LOCALMENTE (Lendo do .env)
    meta = _safe_float(os.getenv("META_FATURAMENTO", 407000), 407000.0)
    faturado = round(sum(item["total_valor"] for item in funil), 2)
    porcentagem = round((faturado / meta) * 100) if meta > 0 else 0
    falta_faturar = max(meta - faturado, 0)

    progresso_meta = {
        "faturado": faturado,
        "meta": meta,
        "porcentagem": porcentagem,
        "falta_faturar": round(falta_faturar, 2)
    }
    
    # 6. Outros Gráficos
    origem_leads = analytics_service.get_origem_dados(data_inicio=data_inicio, data_fim=data_fim)
    distribuicao_servicos = analytics_service.get_distribuicao_servicos(data_inicio=data_inicio, data_fim=data_fim)
    motivos_perda = analytics_service.get_motivos_perda(data_inicio=data_inicio, data_fim=data_fim)
    tempo_estagio = analytics_service.get_tempo_por_estagio()

    def _is_lost_phase(phase_value):
        phase = _safe_text(phase_value).lower()
        return ("perd" in phase or "desqual" in phase or "lost" in phase or "cancel" in phase)

    total_lost = sum(item["count"] for item in funil if _is_lost_phase(item.get("fase")))
    total_lost_value = round(sum(item["total_valor"] for item in funil if _is_lost_phase(item.get("fase"))), 2)

    payload = {
        "total_leads": total_leads,
        "qualificados": qualificados,
        "nao_qualificados": nao_qualificados,
        "valor_pipeline": faturado,
        "total_perdidos": total_lost,
        "valor_perdido": total_lost_value,
        "previsao_faturamento": previsao_detalhada,
        "ticket_medio": ticket_medio,
        "taxa_conversao": taxa_conversao,
        "progresso_meta": progresso_meta, # 🟢 Meta local embutida!
        "funil": funil,
        "origem_leads": origem_leads,
        "distribuicao_servicos": distribuicao_servicos,
        "motivos_perda": motivos_perda,
        "tempo_estagio": tempo_estagio
    }

    default_payload.update(payload)
    return default_payload

@router.get("/overview")
async def get_overview(
    refresh_pipefy: bool = Query(False),
    data_inicio: Optional[str] = Query(None),
    data_fim: Optional[str] = Query(None),
    Authorization: str | None = Header(None),
):
    try:
        _assert_user_can_view_analytics(Authorization)

        if refresh_pipefy:
            sync_pipefy()
        payload = _build_overview_payload(data_inicio=data_inicio, data_fim=data_fim)
        return payload
    except Exception as e:
        print(f"⚠️ Erro no overview analytics: {str(e)}")
        return _default_overview_payload()

@router.post("/sync-pipefy")
async def trigger_sync():
    try:
        return sync_pipefy()
    except Exception as e:
        return {"ok": False, "synced": 0, "reason": f"error: {str(e)}"}

def get_mock_kpis():
    return {
        "kpis": {"total_leads": 0, "open_leads": 0, "won_leads": 0, "lost_leads": 0, "conversion_rate": 0, "loss_rate": 0, "pipeline_value": 0, "won_value": 0},
        "funnel_distribution": [], "lead_sources": [], "loss_reasons": [], "seller_performance": [], "temporal_evolution": []
    }

@router.get("/kpis")
async def get_kpis(Authorization: str | None = Header(None)):
    """Tenta buscar KPIs reais. Se o banco estiver vazio, retorna Mocks."""
    try:
        _assert_user_can_view_analytics(Authorization)

        db = db_client.get_db()
        leads = db["leads"]
        if leads.count_documents({}) == 0:
            return get_mock_kpis()
        return get_mock_kpis()
    except Exception as e:
        return get_mock_kpis()

@router.get("/prediction")
async def get_prediction(year: Optional[int] = Query(None)):
    if performPrediction:
        try: return await performPrediction(year)
        except: return {"message": "Erro na predição"}
    return {"message": "Serviço de ML não disponível"}

@router.get("/clustering")
async def get_clustering(k: Optional[int] = Query(4)):
    return {"clusters": [], "message": "Clustering requer dados reais no banco."}

@router.get("/crm")
async def get_crm_data():
    try:
        db = db_client.get_db()
        leads = list(db["leads"].find({}).limit(50))
        return {"leads": [], "companies": [], "summary": {"totalLeads": 0, "totalCompanies": 0}}
    except:
        return {"leads": [], "companies": [], "summary": {}}

@router.get("/")
async def analytics_health():
    return {"status": "ok"}