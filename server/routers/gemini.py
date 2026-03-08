import os
import logging
import requests
import json
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional

# --- VOLTAMOS PARA O MOCK TEMPORÁRIO ---
from services.pipefy_temp import pipefy_temp_service

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

    # --- 1. BUSCA DADOS DO MOCK (PIPEFY TEMP) --- 
    # --- 1. BUSCA DADOS --- 
    # --- 1. BUSCA DADOS DO MOCK --- 
    try:
        context_data = await pipefy_temp_service.get_context_for_ai()
        # ADICIONAMOS ISSO PARA DEBUGAR NOS LOGS:
        logger.info(f"DADOS RECEBIDOS DO PIPEFY: {context_data}") 
        
        context_str = json.dumps(context_data) if not isinstance(context_data, str) else context_data
    except Exception as e:
        logger.error(f"ERRO CRÍTICO NO PIPEFY: {e}")
        context_str = "{}"

    # --- 2. CONFIGURA O GROQ ---
    GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
    MODEL_ID = "llama-3.3-70b-versatile"
    groq_messages = []

    # --- 3. PROMPT DE SISTEMA (O CÉREBRO ESTRATÉGICO MANTIDO) ---
    # 3. PROMPT DE SISTEMA (ESTRATÉGICO E À PROVA DE FALHAS)
    system_instruction = f"""
    Você é o Estrategista Comercial Sênior da Empresa Júnior (CITi). Sua missão é transformar dados do CRM em decisões de negócio.
    
    ATENÇÃO: Os dados em tempo real do sistema foram extraídos com sucesso e estão injetados dentro das tags <DADOS_DO_PIPEFY> no final desta mensagem. VOCÊ DEVE LER E USAR APENAS ESTES DADOS.

    === 1. ESTRUTURA DA RESPOSTA (OBRIGATÓRIA) ===
    - DIAGNÓSTICO INICIAL: Comece sempre com um insight sobre a saúde do funil baseado nos dados. Ex: "Atenção: temos um volume alto em Proposta, mas o gargalo na Negociação está retendo X% do faturamento."
    - DADOS ATIVOS: Apresente os números apenas das fases úteis (Qualificação, Diagnóstico, Proposta e Negociação).
    - PRÓXIMO PASSO (CTA): Termine com uma sugestão prática focada no que fazer agora.

    === 2. REGRAS DE CONTAGEM E MÉTRICAS (CRÍTICO) ===
    - "TOTAL DE LEADS" = SOMA APENAS das fases ATIVAS (Qualificação + Diagnóstico Técnico + Apresentação de proposta + Negociação).
    - NUNCA inclua "Perdidos", "Desqualificados" ou "Finalizado/Ganho" no total principal. 
    - MENCIONE os excluídos APENAS se o usuário perguntar explicitamente por motivos de perda ou ganhos.

    === 3. ANÁLISE DE VALORES E FORECAST ===
    - VALOR EM NEGOCIAÇÃO: Destaque primeiro o montante real na fase "Negociação". Use as outras fases apenas para "pipeline futuro".
    - PREVISÃO REALISTA: Para cálculos de meta, considere 25% de conversão para "Apresentação de Proposta". Leads em fases iniciais com valor < 10k devem ser estimados em 5k para projeção.

    === 4. COMPORTAMENTO E ALERTAS ===
    - RISCO DE SLA: Identifique leads parados há mais de 10 dias nas fases iniciais e aponte como "Risco de Perda".
    - TOM CONSULTIVO: Fale como um consultor humano. Use bullet points e linguagem executiva.
    - PROIBIDO: NUNCA use termos de TI como "JSON", "Mock", "String", "Endpoint" ou "Tags XML".
    - NUNCA diga que "não tem acesso ao sistema" ou que "não possui os dados". Os dados reais já estão fornecidos abaixo.

    <DADOS_DO_PIPEFY>
    {context_str}
    </DADOS_DO_PIPEFY>
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

    # 6. Envia para o Groq
    payload = {
        "model": MODEL_ID,
        "messages": groq_messages,
        "temperature": 0.7, 
        "max_tokens": 1500  # Aumentei para 1500 para garantir que caibam todos os insights!
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