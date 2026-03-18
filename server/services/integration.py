from typing import Any, Dict

from services.pipefy_service import fetch_pipefy_raw_output 
from services.data_cleaner.clean import clean_pipefy_payload
from services.db_load import save_to_mongodb   


def sync_pipefy(first: int = 50) -> Dict[str, Any]:
    raw_output = fetch_pipefy_raw_output(first=first)

    cleaned = clean_pipefy_payload(raw_output)

    print("EXEMPLO LIMPO:")
    print(cleaned[0])   # ← adiciona isso

    metrics = save_to_mongodb(cleaned)

    return {
        "cards_cleaned": len(cleaned),
        "mongo": metrics,
    }
