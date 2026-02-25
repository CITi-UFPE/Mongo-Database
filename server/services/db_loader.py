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

env_path = os.path.join(project_root, '.env')
if os.path.exists(env_path):
    load_dotenv(env_path)
else:
    print("Erro: .env não encontrado")

# Ajuste para rodar local: .env pode ter host do container (mdp-mongo).
# db.py prioriza MONGO_URI_PROD; garantimos que ambas apontem para localhost.
raw_uri = os.getenv("MONGO_URI_DEV")
if raw_uri and "mdp-mongo" in raw_uri:
    os.environ["MONGO_URI_DEV"] = raw_uri.replace("mdp-mongo", "localhost")
    prod = os.getenv("MONGO_URI_PROD", "")
    if prod and "mdp-mongo" in prod:
        os.environ["MONGO_URI_PROD"] = prod.replace("mdp-mongo", "localhost")
    if os.getenv("MONGODB_URL"):
        del os.environ["MONGODB_URL"]

try:
    from services.db import db_client
except ImportError:
    print("Erro: Não foi possível importar o db_client em db_loader.")

def save_to_mongodb(data_list: List[Dict], collection_name: str = 'leads') -> None:
    """
    Persiste uma lista de leads na coleção do MongoDB (upsert por Pipefy_ID).

    Espera itens com chaves no formato do clean.py (ex.: "Nome do Cliente", "Valor").
    Grava em snake_case na coleção. Rodar várias vezes com os mesmos dados é
    idempotente: atualiza o documento existente em vez de duplicar.
    """
    try:
        col = db_client.get_collection(collection_name)
        if col is None:
            raise Exception(f"Coleção '{collection_name}' não encontrada.")
    except Exception as e:
        print(f"❌ Erro de conexão no Loader: {e}")
        return

    inserts, updates = 0, 0

    for item in data_list:
        p_id = item.get("Pipefy_ID")
        if not p_id:
            continue

        payload = {
            "Pipefy_ID": p_id,
            "nome_cliente": item.get("Nome do Cliente"),
            "valor": item.get("Valor"),
            "fase": item.get("Fase Atual"),
            "responsavel": item.get("Responsável"),
            "servicos_interesse": item.get("Serviços"),
            "budget_estimado": item.get("Budget Estimado"),
            "autoridade": item.get("Autoridade"),
            "motivo_perda": item.get("Motivo da Perda"),
            "origem_lead": item.get("Origem do Lead"),
            "prazo": item.get("Prazo"),
            "data_qualificacao": item.get("Data de Qualificação"),
            "data_diagnostico": item.get("Data de Diagnóstico"),
            "data_proposta": item.get("Data de Proposta"),
        }

        result = col.update_one(
            {"Pipefy_ID": p_id},
            {"$set": payload},
            upsert=True,
        )
        if result.upserted_id:
            inserts += 1
        elif result.modified_count > 0:
            updates += 1

    print(f"Carga finalizada: 🆕 {inserts} criados | 🔄 {updates} atualizados")