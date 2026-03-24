from fastapi import APIRouter, HTTPException, Query
from typing import Dict, Any
from services.integration import sync_pipefy

router = APIRouter(prefix="/api/integrations", tags=["Integrations"])


@router.post("/pipefy/sync")
async def pipefy_sync(first: int = Query(50)) -> Dict[str, Any]:
    try:
        print("🚀 Iniciando Sync com Pipefy...")

        result = sync_pipefy(first=first)

        if not isinstance(result, dict):
            raise ValueError("sync_pipefy retornou um formato inválido")

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
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )