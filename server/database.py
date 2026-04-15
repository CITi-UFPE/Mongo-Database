"""
CITi UFPE — Subárea: Financeiro
Arquivo: server/database.py  (ou server/db/financeiro.py)

Gerencia a conexão com o banco citi_financeiro via PyMongo.
Segue o padrão de conexão já usado no projeto com MONGO_URI_DEV.

Uso nos scripts e rotas:
    from database import get_db_financeiro
    db = get_db_financeiro()
    db["transacoes"].find(...)
"""

import os
from pymongo import MongoClient
from pymongo.database import Database
from dotenv import load_dotenv

load_dotenv()

_client: MongoClient | None = None


def get_client() -> MongoClient:
    """Retorna o cliente PyMongo (singleton)."""
    global _client
    if _client is None:
        uri = os.getenv("MONGO_URI_FINANCEIRO")
        if not uri:
            raise ValueError(
                "MONGO_URI_FINANCEIRO não encontrada. "
                "Adicione ao arquivo server/.env"
            )
        _client = MongoClient(uri)
    return _client


def get_db_financeiro() -> Database:
    """Retorna o banco citi_financeiro."""
    return get_client()["citi_financeiro"]


def close_connection() -> None:
    """Fecha a conexão (chamar no shutdown da aplicação)."""
    global _client
    if _client:
        _client.close()
        _client = None