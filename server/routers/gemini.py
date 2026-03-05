import os
import logging
import requests
import json
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional

from services import analytics_service
from services.prediction import performPrediction

# Configuração de Logs
logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/gemini", tags=["ai"])

class Part(BaseModel):
    text: str

class ChatMessage(BaseModel):
    role: str
    parts: List[Part]

class ChatRequest(BaseModel):
    history: Optional[List[ChatMessage]] = None
    message: str

@router.post("/chat")
async def chat(req: ChatRequest):
    api_key = os.getenv("GEMINI_API_KEY") 
    
    if not api_key:
        raise HTTPException(status_code=500, detail="Chave de API ausente.")

    # --- 1. BUSCA DADOS PROCESSADOS (O MOTOR DE CONTEXTO) --- 
    try:
        # O backend (Felipe) deve garantir que esse texto agora inclua dados de 
        # tempo de fase, motivos de perda e meta vs realizado.
        analytics_context = await analytics_service.get_analytics_summary_text() 
        
        ml_data = await performPrediction()
        
        top_nichos_list = ml_data.get('icpAnalysis', {}).get('topNiches', [])
        top_nichos = ", ".join([n.get('name', 'Desconhecido') for n in top_nichos_list])
        expected_pipeline = ml_data.get('summary', {}).get('expectedPipelineValue', 0.0)
        
        logger.info("Dados do MongoDB e ML carregados com sucesso.")
    except Exception as e:
        logger.error(f"Erro ao buscar dados do Banco/ML: {e}")
        analytics_context = "AVISO: Não foi possível conectar ao banco de dados."
        top_nichos = "Indisponível no momento"
        expected_pipeline = 0.0

    # --- 2. CONFIGURA O GROQ ---
    GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
    MODEL_ID = "llama-3.3-70b-versatile"
    groq_messages = []

    # --- 3. PROMPT DE SISTEMA (O CÉREBRO ESTRATÉGICO DO CITi) ---
    system_instruction = f"""
    Você é o Assistente Executivo e Estrategista Comercial da Empresa Júnior (CITi).
    Sua função é analisar dados consolidados do CRM (Pipefy/MongoDB) e gerar diagnósticos objetivos e focados em ação.

    === CONTEXTO DE DADOS ATUAIS ===
    {analytics_context}
    - Melhores Nichos Atuais (ICP): {top_nichos}
    - Pipeline Ajustado (ML): R$ {expected_pipeline:.2f}

    === REGRAS DE COMPORTAMENTO E NEGÓCIO ===
    1. TOM HÍBRIDO (DIAGNÓSTICO + AÇÃO): Nunca apenas leia os números. Se o ticket médio caiu ou a conversão está baixa, aponte o problema e sugira uma ação prática. Seja executivo, direto e use bullet points.
    2. LEADS EM PERIGO (SLA CRÍTICO): Considere "risco de perda" qualquer lead que esteja há mais de 10 dias na fase "Qualificação", ou estagnado nas fases "Diagnóstico" e "Negociação". Alerte o usuário sobre isso se perguntado sobre gargalos.
    3. MATEMÁTICA DE META: Se perguntarem "Quantos leads precisam entrar para bater a meta?", calcule: (Valor que falta para a meta) dividido pelo (Ticket Médio atual), e depois aplique a (Taxa de Conversão). Responda com uma estimativa clara de esforço necessário.
    4. GARGALOS E PERDAS: Foque sempre nas fases de "Negociação" e "Diagnóstico" como as mais críticas para garantir receita. Se houver dados sobre motivos de perda, use-os para sugerir melhorias no processo.
    5. REGRA DO VALOR HÍBRIDO E FORECAST: A previsão de fechamento realista (25%) aplica-se apenas à "Apresentação de proposta". Lembre-se que valores em fases iniciais são apenas estimativas de budget (Ex: leads < 10k contam como 5k).
    6. HIGIENE DE DADOS: Assuma que alguns cards podem estar desatualizados pelos vendedores. Se notar dados muito antigos, sugira uma "limpeza de pipeline".
    
    === O QUE NÃO FAZER ===
    - NUNCA invente dados. Se não estiver no contexto, diga que não tem a informação.
    - NUNCA explique como você chegou ao cálculo matemático, apenas dê o resultado e o insight.
    - NUNCA use termos técnicos de programação (JSON, MongoDB, array, endpoint). Fale como um humano de negócios.
    """

    groq_messages.append({"role": "system", "content": system_instruction})

    # 4. Histórico da Conversa
    if req.history:
        for msg in req.history:
            role = "assistant" if msg.role in ["model", "assistant"] else "user"
            content = "\n".join([p.text for p in msg.parts])
            groq_messages.append({"role": role, "content": content})

    # 5. Mensagem Atual
    groq_messages.append({"role": "user", "content": req.message})

    # 6. Envia para o Groq (Temperatura 0.7 para Insights)
    payload = {
        "model": MODEL_ID,
        "messages": groq_messages,
        "temperature": 0.4,
        "max_tokens": 1024
    }

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }

    try:
        response = requests.post(GROQ_URL, json=payload, headers=headers)
        if response.status_code != 200:
            return {"text": f"Erro na IA (Groq): {response.text}"}

        data = response.json()
        ai_text = data["choices"][0]["message"]["content"]
        return {"text": ai_text}

    except Exception as e:
        return {"text": f"Erro de conexão: {str(e)}"}