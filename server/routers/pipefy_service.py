from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any

from services.integration import sync_pipefy

router = APIRouter(prefix="/api/integrations", tags=["Integrations"])


class PipefySyncBody(BaseModel):
    first: int = 50


@router.post("/pipefy/sync")
def pipefy_sync(body: PipefySyncBody) -> Dict[str, Any]:
    try:
        print("🚀 Iniciando Sync...")

        result = sync_pipefy(first=body.first)

        # como o sync retorna cards_cleaned, usamos isso pros logs do DoD
        cards = result.get("cards_cleaned", 0)
        print(f"✅ Extraídos: {cards} cards")
        print(f"💾 Salvos: {cards} cards")

        return {
            "success": True,
            "message": "Sync concluído com sucesso.",
            **result
        }

    except Exception as e:
        print(f"❌ ERRO no Sync: {repr(e)}")
        raise HTTPException(status_code=500, detail="Erro crítico durante o sync.")