import json
import os
import requests
from dotenv import load_dotenv
from typing import Any, Dict, List, Optional

current_dir = os.path.dirname(os.path.abspath(__file__))
server_dir = os.path.dirname(os.path.dirname(current_dir))
env_path = os.path.join(server_dir, ".env")
load_dotenv(env_path)

PIPEFY_URL = "https://api.pipefy.com/graphql"
PIPEFY_TOKEN = os.getenv("PIPEFY_TOKEN")
PIPEFY_PIPE_ID = os.getenv("PIPEFY_PIPE_ID")

QUERY = """
query ($pipeId: ID!, $first: Int!, $after: String) {
  pipe(id: $pipeId) {
    id
    name
  }

  cards(pipe_id: $pipeId, first: $first, after: $after) {
    pageInfo { hasNextPage endCursor }
    edges {
      cursor
      node {
        id
        title
        created_at
        updated_at
        due_date
        url
        current_phase { id name }
        assignees { id name email }
        labels { id name color }
        fields { name value }
      }
    }
  }
}
"""


def _require_env() -> None:
    """Validação de env SEM derrubar o processo no import."""
    if not PIPEFY_TOKEN or not PIPEFY_PIPE_ID:
        raise RuntimeError(
            f"Variáveis PIPEFY_TOKEN / PIPEFY_PIPE_ID não encontradas. "
            f"Verifique o .env em: {env_path}"
        )


def post_graphql(variables: Dict[str, Any]) -> Dict[str, Any]:
    _require_env()

    headers = {
        "Authorization": f"Bearer {PIPEFY_TOKEN}",
        "Content-Type": "application/json",
    }

    resp = requests.post(
        PIPEFY_URL,
        headers=headers,
        json={"query": QUERY, "variables": variables},
        timeout=60,
    )
    resp.raise_for_status()

    data = resp.json()
    if data.get("errors"):
        raise RuntimeError(json.dumps(data["errors"], ensure_ascii=False))
    return data


def fetch_all_pages_raw(first: int = 50) -> List[Dict[str, Any]]:
    """
    Busca todas as páginas (paginação) e retorna a lista pages_raw
    (igual ao que você fazia no while).
    """
    _require_env()

    after: Optional[str] = None
    pages_raw: List[Dict[str, Any]] = []

    while True:
        variables = {"pipeId": PIPEFY_PIPE_ID, "first": first, "after": after}
        raw = post_graphql(variables)
        pages_raw.append(raw)

        page_info = raw["data"]["cards"]["pageInfo"]
        if not page_info["hasNextPage"]:
            break

        after = page_info["endCursor"]

    return pages_raw


def build_raw_output(pages_raw: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Monta o mesmo dicionário 'output' que você salva em raw_data.json.
    """
    _require_env()

    total_cards = sum(len(p["data"]["cards"].get("edges", [])) for p in pages_raw)

    return {
        "source": "pipefy",
        "pipe": pages_raw[0]["data"]["pipe"] if pages_raw else {"id": PIPEFY_PIPE_ID, "name": None},
        "pages": len(pages_raw),
        "total_cards": total_cards,
        "pages_raw": pages_raw,  # bruto
    }


def fetch_pipefy_raw_output(first: int = 50) -> Dict[str, Any]:
    """
    Função principal para o router:
    retorna exatamente o JSON bruto no formato que você já usa.
    """
    pages_raw = fetch_all_pages_raw(first=first)
    return build_raw_output(pages_raw)
