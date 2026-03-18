from typing import Optional, Any
from fastapi import APIRouter, HTTPException, Query
from services import analytics_service

router = APIRouter(prefix="/analytics", tags=["analytics"])


def _success_response(
    metrica: str,
    data: Any,
    data_inicio: Optional[str] = None,
    data_fim: Optional[str] = None,
    servico: Optional[str] = None,
):
    return {
        "ok": True,
        "metrica": metrica,
        "filtros": {
            "data_inicio": data_inicio,
            "data_fim": data_fim,
            "servico": servico,
        },
        "data": data,
    }


@router.get("/")
async def analytics_health():
    return {"status": "ok"}


@router.get("/leads-qualificados")
async def get_leads_qualificados(
    data_inicio: Optional[str] = Query(None, description="Data inicial no formato YYYY-MM-DD"),
    data_fim: Optional[str] = Query(None, description="Data final no formato YYYY-MM-DD"),
    servico: Optional[str] = Query(None, description="Serviço para filtrar os leads"),
):
    try:
        resultado = analytics_service.get_leads_qualificados(
            data_inicio=data_inicio,
            data_fim=data_fim,
            servico=servico,
        )

        return _success_response(
            metrica="leads_qualificados",
            data=resultado,
            data_inicio=data_inicio,
            data_fim=data_fim,
            servico=servico,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro em leads qualificados: {str(e)}")


@router.get("/previsao-faturamento")
async def get_previsao_faturamento(
    data_inicio: Optional[str] = Query(None, description="Data inicial no formato YYYY-MM-DD"),
    data_fim: Optional[str] = Query(None, description="Data final no formato YYYY-MM-DD"),
    servico: Optional[str] = Query(None, description="Serviço para filtrar os leads"),
):
    try:
        resultado = analytics_service.get_previsao_faturamento(
            data_inicio=data_inicio,
            data_fim=data_fim,
            servico=servico,
        )

        return _success_response(
            metrica="previsao_faturamento",
            data=resultado,
            data_inicio=data_inicio,
            data_fim=data_fim,
            servico=servico,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro em previsão de faturamento: {str(e)}")


@router.get("/distribuicao-fases")
async def get_distribuicao_fases(
    data_inicio: Optional[str] = Query(None, description="Data inicial no formato YYYY-MM-DD"),
    data_fim: Optional[str] = Query(None, description="Data final no formato YYYY-MM-DD"),
    servico: Optional[str] = Query(None, description="Serviço para filtrar os leads"),
):
    try:
        resultado = analytics_service.get_distribuicao_fases(
            data_inicio=data_inicio,
            data_fim=data_fim,
            servico=servico,
        )

        return _success_response(
            metrica="distribuicao_fases",
            data=resultado,
            data_inicio=data_inicio,
            data_fim=data_fim,
            servico=servico,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro em distribuição por fases: {str(e)}")


@router.get("/ticket-medio")
async def get_ticket_medio(
    data_inicio: Optional[str] = Query(None, description="Data inicial no formato YYYY-MM-DD"),
    data_fim: Optional[str] = Query(None, description="Data final no formato YYYY-MM-DD"),
    servico: Optional[str] = Query(None, description="Serviço para filtrar os leads"),
):
    try:
        resultado = analytics_service.get_ticket_medio(
            data_inicio=data_inicio,
            data_fim=data_fim,
            servico=servico,
        )

        return _success_response(
            metrica="ticket_medio",
            data={"ticket_medio": resultado},
            data_inicio=data_inicio,
            data_fim=data_fim,
            servico=servico,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro em ticket médio: {str(e)}")


@router.get("/taxa-conversao")
async def get_taxa_conversao(
    data_inicio: Optional[str] = Query(None, description="Data inicial no formato YYYY-MM-DD"),
    data_fim: Optional[str] = Query(None, description="Data final no formato YYYY-MM-DD"),
    servico: Optional[str] = Query(None, description="Serviço para filtrar os leads"),
):
    try:
        resultado = analytics_service.get_taxa_conversao(
            data_inicio=data_inicio,
            data_fim=data_fim,
            servico=servico,
        )

        return _success_response(
            metrica="taxa_conversao",
            data={"taxa_conversao": resultado},
            data_inicio=data_inicio,
            data_fim=data_fim,
            servico=servico,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro em taxa de conversão: {str(e)}")


@router.get("/overview")
async def get_overview(
    data_inicio: Optional[str] = Query(None, description="Data inicial no formato YYYY-MM-DD"),
    data_fim: Optional[str] = Query(None, description="Data final no formato YYYY-MM-DD"),
    servico: Optional[str] = Query(None, description="Serviço para filtrar os leads"),
):
    try:
        leads_qualificados = analytics_service.get_leads_qualificados(
            data_inicio=data_inicio,
            data_fim=data_fim,
            servico=servico,
        )

        previsao_faturamento = analytics_service.get_previsao_faturamento(
            data_inicio=data_inicio,
            data_fim=data_fim,
            servico=servico,
        )

        distribuicao_fases = analytics_service.get_distribuicao_fases(
            data_inicio=data_inicio,
            data_fim=data_fim,
            servico=servico,
        )

        ticket_medio = analytics_service.get_ticket_medio(
            data_inicio=data_inicio,
            data_fim=data_fim,
            servico=servico,
        )

        taxa_conversao = analytics_service.get_taxa_conversao(
            data_inicio=data_inicio,
            data_fim=data_fim,
            servico=servico,
        )

        overview_data = {
            "leads_qualificados": leads_qualificados,
            "previsao_faturamento": previsao_faturamento,
            "distribuicao_fases": distribuicao_fases,
            "ticket_medio": ticket_medio,
            "taxa_conversao": taxa_conversao,
        }

        return _success_response(
            metrica="overview",
            data=overview_data,
            data_inicio=data_inicio,
            data_fim=data_fim,
            servico=servico,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro em overview: {str(e)}")