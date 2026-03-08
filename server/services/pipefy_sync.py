import os
from typing import Dict, List

import requests

from services.data_cleaner.clean import process_data
from services.db_loader import save_to_mongodb


PIPEFY_URL = "https://api.pipefy.com/graphql"

QUERY = """
query ($pipeId: ID!, $first: Int!, $after: String) {
  cards(pipe_id: $pipeId, first: $first, after: $after) {
    pageInfo { hasNextPage endCursor }
    edges {
      node {
        id
        title
        created_at
        current_phase { name }
        assignees { name email }
        fields { name value }
      }
    }
  }
}
"""


def _post_graphql(token: str, variables: Dict) -> Dict:
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }
    response = requests.post(
        PIPEFY_URL,
        headers=headers,
        json={"query": QUERY, "variables": variables},
        timeout=60,
    )
    response.raise_for_status()
    payload = response.json()

    if payload.get("errors"):
        raise RuntimeError(str(payload["errors"]))

    return payload


def fetch_pipefy_cards(token: str, pipe_id: str, page_size: int = 50) -> List[Dict]:
    cards: List[Dict] = []
    after = None

    while True:
        payload = _post_graphql(token, {"pipeId": pipe_id, "first": page_size, "after": after})
        block = payload.get("data", {}).get("cards", {})
        edges = block.get("edges", [])

        for edge in edges:
            node = edge.get("node")
            if node:
                cards.append(node)

        page_info = block.get("pageInfo", {})
        if not page_info.get("hasNextPage"):
            break
        after = page_info.get("endCursor")

    return cards


def sync_pipefy_to_mongo() -> Dict:
    token = os.getenv("PIPEFY_TOKEN")
    pipe_id = os.getenv("PIPEFY_PIPE_ID")

    if not token or not pipe_id:
        return {
            "ok": False,
            "synced": 0,
            "reason": "pipefy_env_missing",
        }

    cards = fetch_pipefy_cards(token=token, pipe_id=pipe_id)
    clean_data = process_data(cards)
    save_to_mongodb(clean_data)

    return {
        "ok": True,
        "synced": len(clean_data),
        "reason": "success",
    }
