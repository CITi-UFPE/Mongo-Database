from typing import List, Dict
from services.db import db_client

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
            }},
            upsert=True,
        )

        if result.upserted_id:
            inserts += 1
        elif result.modified_count > 0:
            updates += 1

    return {"inserted": inserts, "updated": updates}