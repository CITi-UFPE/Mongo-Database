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

        servicos = item.get("Servicos_Interesse", [])
        servico_principal = (
            servicos[0] if isinstance(servicos, list) and servicos else None
        )

        result = leads_col.update_one(
            {"Pipefy_ID": pip_id},
            {
                "$set": {
                    "Pipefy_ID": pip_id,
                    "nome_cliente": item.get("Nome do Cliente"),

                    # valores financeiros
                    "valor": item.get("Valor", 0.0),
                    "valor_estimado": item.get("Valor", 0.0),
                    "valor_final_negociacao": item.get(
                        "Valor_Final_Negociacao", 0.0
                    ),

                    # status do funil
                    "fase": item.get("Fase Atual"),
                    "id_fase_atual": item.get("ID_Fase_Atual"),

                    # responsável
                    "responsavel": item.get("Responsável"),

                    # serviços
                    "servicos_interesse": servicos,
                    "servico": servico_principal,

                    # origem
                    "origem": item.get("Origem"),

                    # motivo perda
                    "motivo_perda": item.get("Motivo_Perda", ""),

                    # datas importantes
                    "createdAt": item.get("Created_At"),
                    "updatedAt": item.get("Updated_At"),

                    # histórico completo de fases
                    "historico_fases": item.get(
                        "Historico_Fases", []
                    ),

                    # caso exista no futuro
                    "unidade": item.get("Unidade"),
                }
            },
            upsert=True,
        )

        if result.upserted_id:
            inserts += 1
        elif result.modified_count > 0:
            updates += 1

    return {
        "inserted": inserts,
        "updated": updates,
    }