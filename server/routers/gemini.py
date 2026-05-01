"""Gemini chat router (FastAPI) mirroring old Node /api/gemini/chat."""

import os
from typing import List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

try:
    import google.generativeai as genai
except Exception:
    genai = None

router = APIRouter(prefix="/api/gemini", tags=["gemini"])


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


def _get_model():
    if genai is None:
        raise HTTPException(
            status_code=500, detail="google-generativeai not installed")
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=500, detail="GEMINI_API_KEY not configured on server")
    genai.configure(api_key=api_key)
    # Use a fast, cost-effective model similar to the Node setup
    return genai.GenerativeModel(
        model_name="gemini-2.0-flash",
        generation_config={
            "temperature": 0.7,
            "top_p": 0.95,
            "top_k": 40,
            "max_output_tokens": 2048,
        },
    )


def _build_system_prompt(context: Optional[AnalyticsContext]) -> str:
    base = (
        "Você é um assistente de dados da empresa CITi (Centro de Informática "
        "e Tecno"
        "logia). "
        "Responda sempre em português brasileiro. Seja objetivo e "
        "profissional. "
        "Quando não souber algo, diga que não tem essa informação "
        "disponível.\n\n "
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
            base += "- Previsão realista: "
            f" R$ {context.previsao_realista:,.2f}\n"

    return base


@router.post("/chat")
async def chat(req: ChatRequest):
    try:
        if not req.message:
            raise HTTPException(status_code=400, detail="Message is required")

        if genai is None:
            raise HTTPException(status_code=500, detail="google-generativeai not installed")

        system_prompt = _build_system_prompt(req.context)

        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise HTTPException(status_code=500, detail="GEMINI_API_KEY não configurada")

        genai.configure(api_key=api_key)

        model = genai.GenerativeModel(
            model_name="gemini-1.5-flash",
            system_instruction=system_prompt,
            generation_config={
                "temperature": 0.7,
                "top_p": 0.95,
                "top_k": 40,
                "max_output_tokens": 2048,
            },
        )

        history_contents = []
        for msg in (req.history or []):
            history_contents.append({
                "role": msg.role,
                "parts": [{"text": p.text} for p in msg.parts],
            })

        chat_session = model.start_chat(history=history_contents)
        result = await chat_session.send_message_async(req.message)

        return {"text": result.text}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="Erro ao "
                            f"processar: {str(e)}")
