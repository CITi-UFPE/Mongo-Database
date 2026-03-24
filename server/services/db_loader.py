from typing import List, Dict
from dotenv import load_dotenv
import os
import sys

# -----------------------------------------------------------------------------
# Caminhos e import do db (precisa do server no path)
# -----------------------------------------------------------------------------
current_file_path = os.path.abspath(__file__)
services_dir = os.path.dirname(current_file_path)
server_dir = os.path.dirname(services_dir)
project_root = os.path.dirname(server_dir)
sys.path.append(server_dir)

env_path = os.path.join(project_root, ".env")
if os.path.exists(env_path):
    load_dotenv(env_path)
else:
    print("Erro: .env não encontrado")


def _should_replace_mongo_host() -> bool:
    running_in_docker = os.path.exists("/.dockerenv")
    return os.name == "nt" and not running_in_docker


# Ajuste para rodar local: .env pode ter host do container (mdp-mongo).
raw_uri = os.getenv("MONGO_URI_DEV")
if raw_uri and "mdp-mongo" in raw_uri and _should_replace_mongo_host():
    os.environ["MONGO_URI_DEV"] = raw_uri.replace("mdp-mongo", "localhost")

    prod = os.getenv("MONGO_URI_PROD", "")
    if prod and "mdp-mongo" in prod:
        os.environ["MONGO_URI_PROD"] = prod.replace("mdp-mongo", "localhost")

    if os.getenv("MONGODB_URL"):
        del os.environ["MONGODB_URL"]


try:
    from services.db import db_client
except ImportError:
    print("Erro: Não foi possível importar o db_client.")


def save_to_mongodb(
    data_list: List[Dict], collection_name: str = "leads"
) -> Dict[str, int]:
    """
    Persiste uma lista de leads na coleção MongoDB (upsert por Pipefy_ID).

    Espera dados no formato retornado por clean_pipefy_payload().
    """

    try:
        col = db_client.get_collection(collection_name)
        if col is None:
            raise Exception(f"Coleção '{collection_name}' não encontrada.")
    except Exception as e:
        print(f"❌ Erro de conexão no Loader: {e}")
        return {"inserted": 0, "updated": 0}

    inserts = 0
    updates = 0

    pipe_id_env = os.getenv("PIPE_ID")

    from datetime import datetime

    for item in data_list:
        pip_id = item.get("Pipefy_ID")

        if not pip_id:
            continue

        servicos = item.get("Servicos_Interesse", [])
        servico_principal = (
            servicos[0] if isinstance(servicos, list) and servicos else None
        )

        created_at = item.get("Created_At") or datetime.utcnow()

        payload = {
            # identificação
            "pipe_id": str(pipe_id_env) if pipe_id_env else "306865718",
            "Pipefy_ID": pip_id,
            "nome_cliente": item.get("Nome do Cliente"),

            # valores financeiros
            "valor": item.get("Valor", 0.0),
            "valor_estimado": item.get("Valor", 0.0),
            "valor_final_negociacao": item.get(
                "Valor_Final_Negociacao", 0.0
            ),

            # status funil
            "fase": item.get("Fase Atual"),
            "id_fase_atual": item.get("ID_Fase_Atual"),

            # responsável
            "responsavel": item.get("Responsável"),

            # serviços
            "servicos_interesse": servicos,
            "servico": servico_principal,

            # origem
            "origem": item.get("Origem"),

            # perda
            "motivo_perda": item.get("Motivo_Perda", ""),

            # datas
            "createdAt": created_at,
            "updatedAt": item.get("Updated_At"),

            # histórico pipeline
            "historico_fases": item.get("Historico_Fases", []),

            # extensível
            "unidade": item.get("Unidade"),
        }

        result = col.update_one(
            {"Pipefy_ID": pip_id},
            {
                "$set": payload,
                "$setOnInsert": {"createdAt": created_at},
            },
            upsert=True,
        )

        if result.upserted_id:
            inserts += 1
        elif result.modified_count > 0:
            updates += 1

    print(f"Carga finalizada: 🆕 {inserts} criados | 🔄 {updates} atualizados")

    return {"inserted": inserts, "updated": updates}