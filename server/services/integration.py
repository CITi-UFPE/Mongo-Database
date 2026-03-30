from typing import Any, Dict

from services.pipefy_service import fetch_pipefy_raw_output 
from services.data_cleaner.clean import clean_pipefy_payload
from services.db_load import save_to_mongodb   


def sync_pipefy(first: int = 50) -> Dict[str, Any]:
    print("🔄 Iniciando sincronização com Pipefy...")
    
    # 1. Busca os dados brutos (O Pipefy_service já deve estar lendo o PIPE_ID do .env)
    raw_output = fetch_pipefy_raw_output(first=first)
    
    if not raw_output:
        print("⚠️ Nenhum dado retornado do Pipefy.")
        return {
            "status": "warning", 
            "message": "Nenhum dado retornado do Pipefy."
        }

    # 2. Limpa e padroniza os dados
    cleaned = clean_pipefy_payload(raw_output)
    
    if not cleaned:
        return {
            "status": "warning", 
            "message": "Os dados vieram do Pipefy, mas nenhum card válido foi limpo."
        }

    # 3. Salva no banco (O db_loader agora carimba o PIPE_ID e ajusta os nomes para a Ana)
    metrics = save_to_mongodb(cleaned)

    print(f"✅ Sincronização concluída! {len(cleaned)} cards processados.")

    return {
        "status": "success",
        "message": "Sincronização concluída com sucesso!",
        "cards_cleaned": len(cleaned),
        # Se o seu db_loader retornar None, a gente garante que o Front não quebre mandando uma string:
        "mongo_result": metrics if metrics else "Verifique o terminal para contagem de inserts/updates."
    }