import os
import json
from typing import Optional
from fastapi import APIRouter, Query
from services.db import db_client
from services import analytics_service
from services.pipefy_sync import sync_pipefy_to_mongo

# Tenta importar ML, se falhar, usa mock
try:
    from services.prediction import performPrediction
except ImportError:
    performPrediction = None

router = APIRouter(tags=["analytics"])

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
        "previsao_faturamento": 0.0, "ticket_medio": 0.0, "taxa_conversao": 0.0,
        "progresso_meta": {"faturado": 0.0, "meta": _safe_float(os.getenv("META_FATURAMENTO", 407000), 407000.0), "porcentagem": 0},
        "funil": [], "origem_leads": [], "distribuicao_servicos": [], "motivos_perda": []
    }

def _build_overview_payload(data_inicio: Optional[str] = None, data_fim: Optional[str] = None):
    default_payload = _default_overview_payload()

    info_leads = analytics_service.get_leads_qualificados(data_inicio=data_inicio, data_fim=data_fim)
    if not isinstance(info_leads, dict): info_leads = {}

    qualificados = _safe_int(info_leads.get("qualificados", 0), 0)
    total_leads = _safe_int(info_leads.get("total", 0), 0)

    previsao_faturamento = _safe_float(analytics_service.get_previsao_faturamento(data_inicio=data_inicio, data_fim=data_fim))
    taxa_conversao = round((qualificados / total_leads) * 100, 2) if total_leads > 0 else 0.0
    ticket_medio = round(previsao_faturamento / qualificados, 2) if qualificados > 0 else 0.0

    funil_raw = analytics_service.get_distribuicao_fases(data_inicio=data_inicio, data_fim=data_fim)
    funil = [
        {
            "fase": _safe_text(item.get("fase"), "Sem fase") or "Sem fase",
            "count": _safe_int(item.get("quantidade", 0), 0),
            "total_valor": _safe_float(item.get("total_valor", 0.0), 0.0),
        }
        for item in funil_raw if isinstance(item, dict)
    ]

    # 🔥 AGORA SIM! Estamos chamando os serviços que acabamos de consertar!
    origem_leads = analytics_service.get_origem_dados(data_inicio=data_inicio, data_fim=data_fim)
    distribuicao_servicos = analytics_service.get_distribuicao_servicos(data_inicio=data_inicio, data_fim=data_fim)
    motivos_perda = analytics_service.get_motivos_perda(data_inicio=data_inicio, data_fim=data_fim)

    meta = _safe_float(os.getenv("META_FATURAMENTO", 407000), 407000.0)
    faturado = round(sum(item["total_valor"] for item in funil), 2)
    porcentagem = round((faturado / meta) * 100) if meta > 0 else 0

    def _is_lost_phase(phase_value):
        phase = _safe_text(phase_value).lower()
        return ("perd" in phase or "desqual" in phase or "lost" in phase or "cancel" in phase)

    total_lost = sum(item["count"] for item in funil if _is_lost_phase(item.get("fase")))
    total_lost_value = round(sum(item["total_valor"] for item in funil if _is_lost_phase(item.get("fase"))), 2)
    nao_qualificados = max(total_leads - qualificados, 0)

    payload = {
        "total_leads": total_leads,
        "qualificados": qualificados,
        "nao_qualificados": nao_qualificados,
        "valor_pipeline": faturado,
        "total_perdidos": total_lost,
        "valor_perdido": total_lost_value,
        "previsao_faturamento": round(previsao_faturamento, 2),
        "ticket_medio": ticket_medio,
        "taxa_conversao": taxa_conversao,
        "progresso_meta": {
            "faturado": faturado,
            "meta": meta,
            "porcentagem": porcentagem,
        },
        "funil": funil,
        "origem_leads": origem_leads,                  # 🟢 Conectado ao serviço real!
        "distribuicao_servicos": distribuicao_servicos, # 🟢 Conectado ao serviço real!
        "motivos_perda": motivos_perda                  # 🟢 Novo dado enviado pro front!
    }

    default_payload.update(payload)
    return default_payload

@router.get("/overview")
async def get_overview(
    refresh_pipefy: bool = Query(False),
    data_inicio: Optional[str] = Query(None),
    data_fim: Optional[str] = Query(None),
):
    try:
        if refresh_pipefy:
            sync_pipefy_to_mongo()
        payload = _build_overview_payload(data_inicio=data_inicio, data_fim=data_fim)
        return payload
    except Exception as e:
        print(f"⚠️ Erro no overview analytics. Retornando payload padrão: {str(e)}")
        return _default_overview_payload()

@router.post("/sync-pipefy")
async def sync_pipefy():
    try:
        return sync_pipefy_to_mongo()
    except Exception as e:
        return {"ok": False, "synced": 0, "reason": f"error: {str(e)}"}

# Mocks para quando o banco estiver realmente vazio
def get_mock_kpis():
    return {
        "kpis": {"total_leads": 0, "open_leads": 0, "won_leads": 0, "lost_leads": 0, "conversion_rate": 0, "loss_rate": 0, "pipeline_value": 0, "won_value": 0},
        "funnel_distribution": [], "lead_sources": [], "loss_reasons": [], "seller_performance": [], "temporal_evolution": []
    }

@router.get("/kpis")
async def get_kpis():
    # ⚠️ AVISO: A rota /kpis estava forçando o Mock. Se o Front-end usar a rota /overview, vai dar certo! 
    # Se o front usar a rota /kpis, teremos que recriar ela depois para puxar os dados reais.
    try:
        db = db_client.get_db()
        leads = db["leads"]
        if leads.count_documents({}) == 0:
            return get_mock_kpis()
        
        # O ideal aqui será futuramente montar um payload real parecido com o do Overview.
        # Por enquanto mantemos o mock para não quebrar a tela de kpis caso ela exista.
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