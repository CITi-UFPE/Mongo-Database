"""Chat router using Groq (drop-in replacement for Gemini)."""

import os
from typing import List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services import analytics_service

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

    return base


def _fetch_analytics_context() -> Optional[AnalyticsContext]:
    try:
        total_leads = analytics_service.get_total_leads_periodo()
        taxa_conversao = analytics_service.get_taxa_conversao()
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
        )
    except Exception:
        return None


@router.post("/chat")
async def chat(req: ChatRequest):
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
        raise HTTPException(status_code=500, detail=f"Erro ao processar: {str(e)}")
