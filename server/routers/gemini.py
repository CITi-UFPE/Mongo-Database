"""Chat router using Groq (drop-in replacement for Gemini)."""

import os
from typing import List, Optional, Dict

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services import analytics_service

from fastapi import Request
from limiter import limiter

try:
    from groq import Groq
except ImportError:
    Groq = None

router = APIRouter(prefix="/api/gemini", tags=["gemini"])

GROQ_MODEL = "llama-3.3-70b-versatile"


class Part(BaseModel):
    text: str


class ChatMessage(BaseModel):
    role: str  # 'user' | 'model'
    parts: List[Part]


class AnalyticsContext(BaseModel):
    total_leads: Optional[int] = None
    faturamento: Optional[float] = None
    meta: Optional[float] = None
    porcentagem_meta: Optional[int] = None
    taxa_conversao: Optional[float] = None
    previsao_realista: Optional[float] = None
    motivos_perda: Optional[List[Dict]] = None
    fases_funil: Optional[List[Dict]] = None
    distribuicao_servicos: Optional[List[Dict]] = None
    origens_leads: Optional[List[Dict]] = None
    total_perdidos: Optional[int] = None
    valor_perdido: Optional[float] = None


class ChatRequest(BaseModel):
    history: Optional[List[ChatMessage]] = None
    message: str
    context: Optional[AnalyticsContext] = None


def _build_system_prompt(context: Optional[AnalyticsContext]) -> str:
    base = (
        "Você é um assistente de dados do CITi (Centro de Informática e Tecnologia). "
        "Responda sempre em português brasileiro. Seja objetivo e profissional. "
        "Quando não souber algo, diga que não tem essa informação disponível.\n\n"
    )

    if context:
        base += "Dados atuais do dashboard (use para responder perguntas sobre métricas):\n"
        if context.total_leads is not None:
            base += f"- Total de leads: {context.total_leads}\n"
        if context.faturamento is not None:
            base += f"- Faturamento realizado: R$ {context.faturamento:,.2f}\n"
        if context.meta is not None:
            base += f"- Meta mensal: R$ {context.meta:,.2f}\n"
        if context.porcentagem_meta is not None:
            base += f"- Progresso da meta: {context.porcentagem_meta}%\n"
        if context.taxa_conversao is not None:
            base += f"- Taxa de conversão: {context.taxa_conversao:.1f}%\n"
        if context.previsao_realista is not None:
            base += f"- Previsão realista: R$ {context.previsao_realista:,.2f}\n"
        if context.total_perdidos is not None:
            base += f"- Total de leads perdidos: {context.total_perdidos}\n"
        if context.valor_perdido is not None:
            base += f"- Valor perdido: R$ {context.valor_perdido:,.2f}\n"
        if context.motivos_perda:
            base += "\n- Top motivos de perda:\n"
            for motivo in context.motivos_perda[:3]:
                base += (
                    f"  * {motivo.get('motivo', 'Não informado')}: "
                    f"{motivo.get('quantidade', 0)} leads\n"
                )
        if context.fases_funil:
            base += "\n- Distribuição no funil:\n"
            for fase in context.fases_funil:
                base += (
                    f"  * {fase.get('fase', 'Não informado')}: "
                    f"{fase.get('quantidade', 0)} leads\n"
                )
        if context.distribuicao_servicos:
            base += "\n- Serviços mais vendidos:\n"
            for servico in context.distribuicao_servicos[:5]:
                base += (
                    f"  * {servico.get('servico', 'Não informado')}: "
                    f"{servico.get('quantidade', 0)} vendas\n"
                )
        if context.origens_leads:
            base += "\n- Origem dos leads:\n"
            for origem in context.origens_leads[:5]:
                base += (
                    f"  * {origem.get('origem', 'Não informado')}: "
                    f"{origem.get('quantidade', 0)} leads\n"
                )

    return base


def _fetch_analytics_context() -> Optional[AnalyticsContext]:
    try:
        total_leads = analytics_service.get_total_leads_periodo()
        taxa_conversao = analytics_service.get_taxa_conversao()
        motivos_perda = analytics_service.get_motivos_perda()
        fases_funil = analytics_service.get_distribuicao_fases()
        distribuicao_servicos = analytics_service.get_distribuicao_servicos()
        origens_leads = analytics_service.get_origem_dados()
        resumo_perdas = analytics_service.get_resumo_perdas()
        faturamento_info = analytics_service.get_faturamento_e_ticket()
        previsao = analytics_service.get_previsao_detalhada()
        meta = float(os.getenv("META_FATURAMENTO", 407000))
        faturado = faturamento_info.get("faturamento", 0.0)
        porcentagem = round((faturado / meta) * 100) if meta > 0 else 0

        return AnalyticsContext(
            total_leads=total_leads,
            faturamento=faturado,
            meta=meta,
            porcentagem_meta=porcentagem,
            taxa_conversao=taxa_conversao,
            previsao_realista=previsao.get("previsao_realista"),
            motivos_perda=motivos_perda,
            fases_funil=fases_funil,
            distribuicao_servicos=distribuicao_servicos,
            origens_leads=origens_leads,
            total_perdidos=resumo_perdas.get("total_perdidos"),
            valor_perdido=resumo_perdas.get("valor_perdido"),
        )
    except Exception:
        return None


@router.post("/chat")
@limiter.limit("10/minute")
async def chat(request: Request, req: ChatRequest):
    try:
        if not req.message:
            raise HTTPException(status_code=400, detail="Message is required")

        if Groq is None:
            raise HTTPException(status_code=500, detail="groq package not installed")

        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            raise HTTPException(status_code=500, detail="GROQ_API_KEY não configurada")

        context = req.context or _fetch_analytics_context()
        system_prompt = _build_system_prompt(context)

        # Groq usa "assistant" em vez de "model"
        messages = [{"role": "system", "content": system_prompt}]
        for msg in (req.history or []):
            role = "assistant" if msg.role == "model" else msg.role
            messages.append({"role": role, "content": msg.parts[0].text if msg.parts else ""})
        messages.append({"role": "user", "content": req.message})

        client = Groq(api_key=api_key)
        response = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=messages,
            temperature=0.7,
            max_tokens=2048,
        )

        return {"reply": response.choices[0].message.content}

    except HTTPException:
        raise
    except Exception as e:
        error_msg = str(e)
        if "api_key" in error_msg.lower() or "authentication" in error_msg.lower():
            raise HTTPException(status_code=500, detail="Chave da API do Groq inválida ou não configurada.")
        if "quota" in error_msg.lower() or "rate_limit" in error_msg.lower():
            raise HTTPException(status_code=503, detail="Cota da API do Groq esgotada. Tente mais tarde.")
        raise HTTPException(status_code=500, detail="Erro interno ao processar sua mensagem.")