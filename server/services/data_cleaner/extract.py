import json
import requests
from dotenv import load_dotenv
import os

load_dotenv()

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

def post_graphql(variables: dict) -> dict:
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

def main():
    after = None
    first = 50

    pages_raw = []

    while True:
        variables = {"pipeId": PIPEFY_PIPE_ID, "first": first, "after": after}
        raw = post_graphql(variables)
        pages_raw.append(raw)

        page_info = raw["data"]["cards"]["pageInfo"]
        if not page_info["hasNextPage"]:
            break

        after = page_info["endCursor"]

    # calcula total só para print (sem criar cards_edges)
    total_cards = sum(len(p["data"]["cards"].get("edges", [])) for p in pages_raw)

    output = {
        "source": "pipefy",
        "pipe": pages_raw[0]["data"]["pipe"] if pages_raw else {"id": PIPEFY_PIPE_ID, "name": None},
        "pages": len(pages_raw),
        "total_cards": total_cards,
        "pages_raw": pages_raw,  # <-- só isso, bruto
    }

    with open("raw_data.json", "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print("✅ raw_data.json criado com sucesso")
    print(f"Pipe: {output['pipe']['name']} (ID: {output['pipe']['id']})")
    print(f"Cards: {output['total_cards']} | Páginas: {output['pages']}")

if __name__ == "__main__":
    main()