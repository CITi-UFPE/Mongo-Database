import os
import logging
import requests
import json
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional

# importação temporário do pipefy
from services.pipefy_temp import pipefy_temp_service

# Configuração de Logs
logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/gemini", tags=["ai"])

# Modelos de Dados 
class Part(BaseModel):
    text: str

class ChatMessage(BaseModel):
    role: str
    parts: List[Part]

class ChatRequest(BaseModel):
    history: Optional[List[ChatMessage]] = None
    message: str

# Rota do Chat 
@router.post("/chat")
async def chat(req: ChatRequest):
    api_key = os.getenv("GEMINI_API_KEY") 
    
    if not api_key:
        raise HTTPException(status_code=500, detail="Chave de API ausente.")

    #  BUSCA DADOS DO PIPEFY 
    try:
        # Pega o JSON resumido do serviço temporário/ pré-extract 
        context_str = await pipefy_temp_service.get_context_for_ai()
        logger.info("Dados do Pipefy carregados com sucesso.")
    except Exception as e:
        logger.error(f"Erro ao buscar Pipefy: {e}")
        context_str = "ERRO: Não foi possível conectar ao Pipefy. Avise o usuário."

    #CONFIGURA O GROQ
    GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
    MODEL_ID = "llama-3.3-70b-versatile"

    groq_messages = []

    # 3. CRIA O PROMPT DE SISTEMA (AQUI A GENTE INJETA OS DADOS)
    system_instruction = f"""
    ATENÇÃO: VOCÊ AGORA ESTÁ CONECTADO AO PIPEFY DA EMPRESA JÚNIOR (CITi).
    NÃO PEÇA PLANILHAS. USE OS DADOS ABAIXO PARA RESPONDER.

    === DADOS EM TEMPO REAL DO CRM (PIPEFY) ===
    {context_str}
    ===========================================
     
    
    REGRAS:
    1. Se o usuário perguntar "Quantos leads?", LEIA o JSON acima e responda o número exato.
    2. Se os dados estiverem vazios, diga: "O Pipefy retornou zero leads."
    3. Responda em Português, de forma direta e profissional.
    
    4. NÃO mencione nomes técnicos de campos (como "objeto json", "campo total_leads"). Fale como um humano.
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
        "temperature": 0.5,
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