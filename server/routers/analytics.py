import os
from typing import Optional
from fastapi import APIRouter, Query
from services.db import db_client
from services import analytics_service
from services.integration import sync_pipefy

try:
    from services.prediction import performPrediction
except ImportError:
    performPrediction = None

router = APIRouter(tags=["analytics"])


def _safe_text(value, default: str = "") -> str:
    if isinstance(value, str):
        return value
    if value is None:
        return default
    return str(value)


def _safe_int(value, default: int = 0) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def _safe_float(value, default: float = 0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _default_overview_payload():
    return {
        "total_leads": 0,
        "qualificados": 0,
        "nao_qualificados": 0,
        "valor_pipeline": 0.0,
        "total_perdidos": 0,
        "valor_perdido": 0.0,
        "previsao_faturamento": {
            "pipeline_total": 0.0,
            "previsao_realista": 0.0
        },
        "ticket_medio": 0.0,
        "taxa_conversao": 0.0,
        "progresso_meta": {
            "faturado": 0.0,
            "meta": 500000.0,
            "porcentagem": 0.0,
            "falta_faturar": 500000.0
        },
        "funil": [],
        "origem_leads": [],
        "distribuicao_servicos": [],
        "motivos_perda": [],
        "tempo_estagio": []
    }


def _build_overview_payload(data_inicio: Optional[str] = None, data_fim: Optional[str] = None):
    default_payload = _default_overview_payload()

    # 1. Leads e Qualificação
    info_leads = analytics_service.get_leads_qualificados(
        data_inicio=data_inicio,
        data_fim=data_fim
    )
    if not isinstance(info_leads, dict):
        info_leads = {}

    qualificados = _safe_int(info_leads.get("qualificados", 0), 0)
    total_leads = _safe_int(info_leads.get("total", 0), 0)
    nao_qualificados = max(total_leads - qualificados, 0)

    # 2. Taxas
    taxa_conversao = analytics_service.get_taxa_conversao(
        data_inicio=data_inicio,
        data_fim=data_fim
    )

    # 3. Faturamento e Previsão
    faturamento_info = analytics_service.get_faturamento_e_ticket(
        data_inicio=data_inicio,
        data_fim=data_fim
    )
    ticket_medio = _safe_float(faturamento_info.get("ticket_medio", 0.0))
    faturado = _safe_float(faturamento_info.get("faturamento", 0.0))

    previsao_detalhada = analytics_service.get_previsao_detalhada(
        data_inicio=data_inicio,
        data_fim=data_fim
    )
    valor_pipeline = _safe_float(previsao_detalhada.get("pipeline_total", 0.0))

    # 4. Construção do Funil
    funil_raw = analytics_service.get_distribuicao_fases(
        data_inicio=data_inicio,
        data_fim=data_fim
    )
    funil = [
        {
            "fase": _safe_text(item.get("fase"), "Sem fase") or "Sem fase",
            "count": _safe_int(item.get("quantidade", 0), 0),
            "total_valor": _safe_float(item.get("total_valor", 0.0), 0.0),
        }
        for item in funil_raw if isinstance(item, dict)
    ]

    # 5. Meta fixa oficial
    meta = 500000.0
    porcentagem = round((faturado / meta) * 100, 2) if meta > 0 else 0.0
    falta_faturar = max(meta - faturado, 0.0)

    progresso_meta = {
        "faturado": faturado,
        "meta": meta,
        "porcentagem": porcentagem,
        "falta_faturar": round(falta_faturar, 2)
    }

    # 6. Outros Gráficos
    origem_leads = analytics_service.get_origem_dados(
        data_inicio=data_inicio,
        data_fim=data_fim
    )
    distribuicao_servicos = analytics_service.get_distribuicao_servicos(
        data_inicio=data_inicio,
        data_fim=data_fim
    )
    motivos_perda = analytics_service.get_motivos_perda(
        data_inicio=data_inicio,
        data_fim=data_fim
    )
    tempo_estagio = analytics_service.get_tempo_por_estagio(
        data_inicio=data_inicio,
        data_fim=data_fim
    )

    total_perdidos = sum(
        _safe_int(item.get("quantidade", 0), 0)
        for item in motivos_perda
        if isinstance(item, dict)
    )

    payload = {
        "total_leads": total_leads,
        "qualificados": qualificados,
        "nao_qualificados": nao_qualificados,
        "valor_pipeline": valor_pipeline,
        "total_perdidos": total_perdidos,
        "valor_perdido": 0.0,
        "previsao_faturamento": previsao_detalhada,
        "ticket_medio": ticket_medio,
        "taxa_conversao": taxa_conversao,
        "progresso_meta": progresso_meta,
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
):
    try:
        if refresh_pipefy:
            sync_pipefy()
        payload = _build_overview_payload(data_inicio=data_inicio, data_fim=data_fim)
        return payload
    except Exception as e:
        print(f"⚠️ Erro no overview analytics: {str(e)}")
        return _default_overview_payload()


@router.get("/leads-qualificados")
async def get_leads_qualificados_route(
    data_inicio: Optional[str] = Query(None),
    data_fim: Optional[str] = Query(None),
):
    try:
        return analytics_service.get_leads_qualificados(
            data_inicio=data_inicio,
            data_fim=data_fim,
        )
    except Exception as e:
        return {"qualificados": 0, "total": 0, "erro": str(e)}


@router.get("/previsao-faturamento")
async def get_previsao_faturamento_route(
    fator_conversao: float = Query(0.25),
    data_inicio: Optional[str] = Query(None),
    data_fim: Optional[str] = Query(None),
):
    try:
        return {
            "previsao_faturamento": analytics_service.get_previsao_faturamento(
                fator_conversao=fator_conversao,
                data_inicio=data_inicio,
                data_fim=data_fim,
            )
        }
    except Exception as e:
        return {"previsao_faturamento": 0.0, "erro": str(e)}


@router.get("/distribuicao-fases")
async def get_distribuicao_fases_route(
    data_inicio: Optional[str] = Query(None),
    data_fim: Optional[str] = Query(None),
):
    try:
        return analytics_service.get_distribuicao_fases(
            data_inicio=data_inicio,
            data_fim=data_fim,
        )
    except Exception as e:
        return {"dados": [], "erro": str(e)}


@router.get("/origem-dados")
async def get_origem_dados_route(
    data_inicio: Optional[str] = Query(None),
    data_fim: Optional[str] = Query(None),
):
    try:
        return analytics_service.get_origem_dados(
            data_inicio=data_inicio,
            data_fim=data_fim,
        )
    except Exception as e:
        return {"dados": [], "erro": str(e)}


@router.get("/distribuicao-servicos")
async def get_distribuicao_servicos_route(
    data_inicio: Optional[str] = Query(None),
    data_fim: Optional[str] = Query(None),
):
    try:
        return analytics_service.get_distribuicao_servicos(
            data_inicio=data_inicio,
            data_fim=data_fim,
        )
    except Exception as e:
        return {"dados": [], "erro": str(e)}


@router.get("/motivos-perda")
async def get_motivos_perda_route(
    data_inicio: Optional[str] = Query(None),
    data_fim: Optional[str] = Query(None),
):
    try:
        return analytics_service.get_motivos_perda(
            data_inicio=data_inicio,
            data_fim=data_fim,
        )
    except Exception as e:
        return {"dados": [], "erro": str(e)}


@router.get("/faturamento-ticket")
async def get_faturamento_e_ticket_route(
    data_inicio: Optional[str] = Query(None),
    data_fim: Optional[str] = Query(None),
):
    try:
        return analytics_service.get_faturamento_e_ticket(
            data_inicio=data_inicio,
            data_fim=data_fim,
        )
    except Exception as e:
        return {"faturamento": 0.0, "ticket_medio": 0.0, "quantidade_ganhas": 0, "erro": str(e)}


@router.get("/taxa-conversao")
async def get_taxa_conversao_route(
    data_inicio: Optional[str] = Query(None),
    data_fim: Optional[str] = Query(None),
):
    try:
        return {
            "taxa_conversao": analytics_service.get_taxa_conversao(
                data_inicio=data_inicio,
                data_fim=data_fim,
            )
        }
    except Exception as e:
        return {"taxa_conversao": 0.0, "erro": str(e)}


@router.get("/meta-mensal")
async def get_meta_mensal_route(
    meta_alvo: float = Query(500000.0),
    data_inicio: Optional[str] = Query(None),
    data_fim: Optional[str] = Query(None),
):
    try:
        return analytics_service.get_meta_mensal(
            meta_alvo=meta_alvo,
            data_inicio=data_inicio,
            data_fim=data_fim,
        )
    except Exception as e:
        return {
            "meta_alvo": meta_alvo,
            "faturamento_atual": 0.0,
            "falta_para_meta": meta_alvo,
            "progresso_percentual": 0.0,
            "erro": str(e),
        }


@router.get("/previsao-detalhada")
async def get_previsao_detalhada_route(
    fator_conversao: float = Query(0.25),
    data_inicio: Optional[str] = Query(None),
    data_fim: Optional[str] = Query(None),
):
    try:
        return analytics_service.get_previsao_detalhada(
            fator_conversao=fator_conversao,
            data_inicio=data_inicio,
            data_fim=data_fim,
        )
    except Exception as e:
        return {"pipeline_total": 0.0, "previsao_realista": 0.0, "erro": str(e)}


@router.get("/tempo-por-estagio")
async def get_tempo_por_estagio_route(
    data_inicio: Optional[str] = Query(None),
    data_fim: Optional[str] = Query(None),
):
    try:
        return analytics_service.get_tempo_por_estagio(
            data_inicio=data_inicio,
            data_fim=data_fim,
        )
    except Exception as e:
        return {"dados": [], "erro": str(e)}


@router.post("/sync-pipefy")
async def trigger_sync(first: int = Query(50)):
    try:
        return sync_pipefy(first=first)
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


def get_mock_kpis():
    return {
        "kpis": {
            "total_leads": 0,
            "open_leads": 0,
            "won_leads": 0,
            "lost_leads": 0,
            "conversion_rate": 0,
            "loss_rate": 0,
            "pipeline_value": 0,
            "won_value": 0
        },
        "funnel_distribution": [],
        "lead_sources": [],
        "loss_reasons": [],
        "seller_performance": [],
        "temporal_evolution": []
    }


@router.get("/kpis")
async def get_kpis():
    try:
        db = db_client.get_db()
        leads = db["leads"]
        if leads.count_documents({}) == 0:
            return get_mock_kpis()
        return get_mock_kpis()
    except Exception:
        return get_mock_kpis()


@router.get("/prediction")
async def get_prediction(year: Optional[int] = Query(None)):
    if performPrediction:
        try:
            return await performPrediction(year)
        except Exception:
            return {"message": "Erro na predição"}
    return {"message": "Serviço de ML não disponível"}


@router.get("/clustering")
async def get_clustering(k: Optional[int] = Query(4)):
    return {"clusters": [], "message": "Clustering requer dados reais no banco."}


@router.get("/crm")
async def get_crm_data():
    try:
        db = db_client.get_db()
        list(db["leads"].find({}).limit(50))
        return {"leads": [], "companies": [], "summary": {"totalLeads": 0, "totalCompanies": 0}}
    except Exception:
        return {"leads": [], "companies": [], "summary": {}}


@router.get("/")
async def analytics_health():
    return {"status": "ok"}