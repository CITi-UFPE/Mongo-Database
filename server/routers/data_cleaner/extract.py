from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from services.data_cleaner.integration import sync_pipefy

router = APIRouter(prefix="/api/integrations", tags=["Integrations"])


class PipefySyncBody(BaseModel):
    first: int = 50


@router.post("/pipefy/sync")
def pipefy_sync(body: PipefySyncBody):
    try:
        return sync_pipefy(first=body.first)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))