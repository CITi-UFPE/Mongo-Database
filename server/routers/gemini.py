"""Gemini chat router (FastAPI) mirroring old Node /api/gemini/chat."""

import os
from typing import List, Dict, Any, Optional

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

class ChatRequest(BaseModel):
    history: Optional[List[ChatMessage]] = None
    message: str


def _get_model():
    if genai is None:
        raise HTTPException(status_code=500, detail="google-generativeai not installed")
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY not configured on server")
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


@router.post("/chat")
async def chat(req: ChatRequest):
    try:
        if not req.message:
            raise HTTPException(status_code=400, detail="Message is required")

        model = _get_model()

        # Start chat with provided history if available
        history_contents = []
        for msg in (req.history or []):
            history_contents.append({
                "role": msg.role,
                "parts": [{"text": p.text} for p in msg.parts],
            })

        chat_session = model.start_chat(history=history_contents)
        result = await chat_session.send_message_async(req.message)
        text = result.text
        return {"text": text}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process request: {str(e)}")
