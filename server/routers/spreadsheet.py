"""Spreadsheet routes connected to Real MongoDB with Serialization Fix."""
from fastapi import APIRouter, HTTPException
from services.db import db_client
from bson import ObjectId
from datetime import datetime

router = APIRouter(prefix="/api/spreadsheet", tags=["spreadsheet"])

ALLOWED_COLLECTIONS = [
    "leads",
    "empresas",
    "contatos",
    "membros",
    "interacaos",
    "fase_funils",
    "origem_leads",
]

def serialize_doc(doc):
    """
    Função mágica que percorre o dado e converte
    ObjectIds e Datas para texto, evitando erro 500.
    """
    if isinstance(doc, list):
        return [serialize_doc(item) for item in doc]
    if isinstance(doc, dict):
        return {k: serialize_doc(v) for k, v in doc.items()}
    if isinstance(doc, ObjectId):
        return str(doc)
    if isinstance(doc, datetime):
        return doc.isoformat()
    return doc

@router.get("/health")
async def health():
    return {"status": "ok"}


@router.get("/collections/")
async def get_available_tables():
    """Retorna a lista de tabelas disponíveis."""
    return ALLOWED_COLLECTIONS


@router.get("/")
async def get_spreadsheet_data(collection: str | None = None, limit: int = 200):
    """Retorna dados reais do banco; opcionalmente filtra por coleção."""
    try:
        if collection:
            if collection not in ALLOWED_COLLECTIONS:
                raise HTTPException(status_code=404, detail=f"Coleção '{collection}' não suportada.")

            target = db_client.get_collection(collection)
            if target is None:
                raise HTTPException(status_code=503, detail="Banco de dados indisponível")
            docs = list(target.find().limit(limit))
            return serialize_doc(docs)

        payload = {}
        for name in ALLOWED_COLLECTIONS:
            target = db_client.get_collection(name)
            if target is None:
                payload[name] = []
                continue
            payload[name] = serialize_doc(list(target.find().limit(limit)))

        return payload
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Erro ao carregar dados de planilha: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{collection_name}")
async def get_real_data(collection_name: str):
    """
    Busca dados REAIS e trata os tipos (ObjectId/Data) para não dar erro.
    """
    try:
        if collection_name not in ALLOWED_COLLECTIONS:
            raise HTTPException(status_code=404, detail=f"Coleção '{collection_name}' não suportada.")

        # 1. Pega a coleção
        collection = db_client.get_collection(collection_name)
        if collection is None:
            raise HTTPException(status_code=503, detail="Banco de dados indisponível")
        
        # 2. Busca os dados (limitado a 200)
        dados_brutos = list(collection.find().limit(200))
        
        # 3. Serializa TUDO (converte ids e datas para string)
        dados_limpos = serialize_doc(dados_brutos)
            
        return dados_limpos

    except Exception as e:
        print(f"❌ Erro na planilha {collection_name}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))