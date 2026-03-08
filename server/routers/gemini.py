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
    try:
        # Pega o JSON resumido do serviço temporário
        context_str = await pipefy_temp_service.get_context_for_ai()
        logger.info("Dados do Pipefy (Mock) carregados com sucesso.")
    except Exception as e:
        logger.error(f"Erro ao buscar Pipefy: {e}")
        context_str = "ERRO: Não foi possível conectar aos dados do Pipefy no momento."

    # --- 2. CONFIGURA O GROQ ---
    GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
    MODEL_ID = "llama-3.3-70b-versatile"
    groq_messages = []

    # --- 3. PROMPT DE SISTEMA (O CÉREBRO ESTRATÉGICO MANTIDO) ---
    system_instruction = f"""
    Você é o Assistente Executivo e Estrategista Comercial da Empresa Júnior (CITi).
    Sua função é analisar dados consolidados do CRM (Pipefy) e gerar diagnósticos objetivos e focados em ação.

    === CONTEXTO DE DADOS ATUAIS (JSON MOCK) ===
    {context_str}
    ===========================================

    === REGRAS DE COMPORTAMENTO E NEGÓCIO ===
    1. TOM HÍBRIDO (DIAGNÓSTICO + AÇÃO): Nunca apenas leia os números brutos. Se notar algo estranho, aponte o problema e sugira uma ação prática. Seja executivo, direto e use bullet points.
    2. LEADS EM PERIGO (SLA CRÍTICO): Considere "risco de perda" qualquer lead que passou mais de 10 dias na fase "Qualificação", ou que esteja travado no "Diagnóstico" e "Negociação" sem atualização. Alerte o usuário imediatamente.
    3. MATEMÁTICA DE META: Se perguntarem o que falta para a meta ou "quantos leads faltam", calcule a diferença usando os valores que estão em "Negociação" e "Apresentação de proposta" no JSON acima.
    4. GARGALOS E PERDAS: Foque sempre nas fases de "Negociação" e "Diagnóstico" como as mais críticas para garantir receita.
    5. REGRA DO VALOR HÍBRIDO E FORECAST: A previsão de fechamento realista (25%) aplica-se apenas à "Apresentação de proposta". Lembre-se que valores em fases iniciais são apenas estimativas de budget (Ex: leads < 10k contam como 5k).
    6. HIGIENE DE DADOS: Assuma que alguns cards podem estar desatualizados pelos vendedores. Se notar dados muito antigos, sugira uma "limpeza de pipeline".
    7. explique como você chegou ao cálculo matemático, APENAS SE FOR SOLICITADo, caso não seja, diga somente o resultado e o insight.
    8. CONTAGEM DE LEADS (MUITO IMPORTANTE): Quando perguntarem "Qual o total de leads?" ou "Quantos leads temos?", NUNCA contabilize os leads nas fases "Perdidos", "Desqualificados" ou "Finalizado/Ganho". O "Total" deve ser apenas a soma dos leads ATIVOS no funil.
    9. DADOS EXCLUÍDOS: Só informe a quantidade e os motivos dos leads "Perdidos", "Desqualificados" ou "Ganhos" se o usuário perguntar EXPLICITAMENTE por eles (ex: "Quantos leads perdemos?" ou "Qual o total de ganhos?").
    10. ISOLAMENTO DE NEGOCIAÇÃO E VALORES (CRÍTICO): Se o usuário perguntar "Qual valor total está em negociação?", você DEVE:
       - PRIMEIRO: Calcular e mostrar APENAS o valor exato dos leads que estão ESPECIFICAMENTE na fase "Negociação". Não misture com o total do pipeline.
       - SEGUNDO: Só depois de dar esse valor, liste e classifique os valores retidos nas outras fases ativas (como Qualificação, Diagnóstico Técnico e Apresentação de proposta) para dar contexto de como o resto do dinheiro está distribuído.
    
    === O QUE NÃO FAZER ===
    - NUNCA invente dados. Se não estiver no JSON acima, diga que não tem a informação.
   
    - NUNCA use termos técnicos de programação (JSON, MongoDB, array, endpoint, mock). Fale como um consultor humano de negócios.
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

    # 6. Envia para o Groq (Temperatura 0.7 mantida para gerar os Insights!)
    payload = {
        "model": MODEL_ID,
        "messages": groq_messages,
        "temperature": 0.7, 
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