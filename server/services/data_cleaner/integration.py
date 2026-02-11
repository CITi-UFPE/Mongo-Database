from typing import Any, Dict

from services.data_cleaner.extract import fetch_pipefy_raw_output 
from services.data_cleaner.clean import clean_pipefy_payload, save_to_mongodb  


def sync_pipefy(first: int = 50) -> Dict[str, Any]:
    raw_output = fetch_pipefy_raw_output(first=first)

    cleaned = clean_pipefy_payload(raw_output)

    metrics = save_to_mongodb(cleaned)

    return {
        "cards_cleaned": len(cleaned),
        "mongo": metrics,
    }
