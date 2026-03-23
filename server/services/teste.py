import os
import sys
import json
from typing import Dict, Any
from dotenv import load_dotenv


# Ajusta path do projeto
current_dir = os.path.dirname(os.path.abspath(__file__))
server_dir = os.path.dirname(current_dir)

sys.path.append(current_dir)

# Carrega .env de server/.env
env_path = os.path.join(server_dir, ".env")
load_dotenv(env_path)

print("ENV carregado de:", env_path)
print("PIPEFY_TOKEN encontrado:", bool(os.getenv("PIPEFY_TOKEN")))
print("PIPEFY_PIPE_ID:", os.getenv("PIPEFY_PIPE_ID"))

from pipefy_service import fetch_all_pages_raw, build_raw_output


def fetch_pipefy_raw_output_debug(first: int = 50) -> Dict[str, Any]:
    pages_raw = fetch_all_pages_raw(first=first)

    if pages_raw:
        try:
            primeiro_card = pages_raw[0]["data"]["cards"]["edges"][0]["node"]

            print("\n===== DEBUG PIPEFY CARD =====")
            print(json.dumps(primeiro_card, indent=2, ensure_ascii=False))
            print("===== FIM DEBUG =====\n")

            print("\n===== CAMPOS DISPONÍVEIS =====")
            print(list(primeiro_card.keys()))
            print("===== FIM CAMPOS =====\n")

        except Exception as e:
            print("Erro ao acessar primeiro card:", e)

    return build_raw_output(pages_raw)


if __name__ == "__main__":
    fetch_pipefy_raw_output_debug()