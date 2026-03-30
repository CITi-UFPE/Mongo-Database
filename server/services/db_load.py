from typing import List, Dict
from datetime import datetime
from services.db import db_client


def _parse_datetime(value):
    if not value:
        return None

    if isinstance(value, datetime):
        return value

    if not isinstance(value, str):
        return None

    text = value.strip()
    if not text:
        return None

    try:
        return datetime.fromisoformat(text.replace("Z", "+00:00"))
    except ValueError:
        return None

def save_to_mongodb(data_list: List[Dict]) -> Dict[str, int]:
    leads_col = db_client.get_collection("leads")
    if leads_col is None:
        raise RuntimeError("Coleção 'leads' não encontrada no banco de dados.")

    inserts = 0
    updates = 0

    for item in data_list:
        pip_id = item.get("Pipefy_ID")
        if not pip_id:
            continue

        result = leads_col.update_one(
            {"Pipefy_ID": pip_id},
            {"$set": {
                "Pipefy_ID": pip_id,
                "nome_cliente": item.get("Nome do Cliente"),
                "valor": item.get("Valor", 0.0),
                "fase": item.get("Fase Atual"),
                "responsavel": item.get("Responsável"),
                "createdAt": _parse_datetime(item.get("Data de Criação")),
                "updatedAt": _parse_datetime(item.get("Data de Atualização")),
            }},
            upsert=True,
        )

        if result.upserted_id:
            inserts += 1
        elif result.modified_count > 0:
            updates += 1

    return {"inserted": inserts, "updated": updates}