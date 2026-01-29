"""Spreadsheet routes connected to Real MongoDB with Serialization Fix."""
from fastapi import APIRouter, HTTPException
from services.db import db_client
from bson import ObjectId
from datetime import datetime

router = APIRouter(prefix="/api/spreadsheet", tags=["spreadsheet"])

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

@router.get("/")
async def get_available_tables():
    """Retorna a lista de tabelas disponíveis."""
    return [
        "leads", 
        "empresas", 
        "contatos", 
        "membros", 
        "interacaos",
        "fase_funils",
        "origem_leads"
    ]

@router.get("/{collection_name}")
async def get_real_data(collection_name: str):
    """
    Busca dados REAIS e trata os tipos (ObjectId/Data) para não dar erro.
    """
    try:
        # 1. Pega a coleção
        collection = db_client.get_collection(collection_name)
        
        # 2. Busca os dados (limitado a 200)
        dados_brutos = list(collection.find().limit(200))
        
        # 3. Serializa TUDO (converte ids e datas para string)
        dados_limpos = serialize_doc(dados_brutos)
            
        return dados_limpos

    except Exception as e:
        print(f"❌ Erro na planilha {collection_name}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))