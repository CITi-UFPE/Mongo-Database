from typing import Any, Dict

from services.pipefy_service import fetch_pipefy_raw_output
from services.data_cleaner.clean import clean_pipefy_payload
from services.db_load import save_to_mongodb


def sync_pipefy(first: int = 50) -> Dict[str, Any]:
    print("🔄 Iniciando sincronização com Pipefy...")

    try:
        print("1️⃣ Buscando dados brutos no Pipefy...")
        raw_output = fetch_pipefy_raw_output(first=first)
        print("✅ Dados brutos recebidos.")

        if not raw_output:
            print("⚠️ Nenhum dado retornado do Pipefy.")
            return {
                "status": "warning",
                "message": "Nenhum dado retornado do Pipefy."
            }

        print("2️⃣ Limpando dados...")
        cleaned = clean_pipefy_payload(raw_output)
        print(f"✅ Limpeza concluída. Cards limpos: {len(cleaned) if cleaned else 0}")

        if not cleaned:
            return {
                "status": "warning",
                "message": "Os dados vieram do Pipefy, mas nenhum card válido foi limpo."
            }

        print("3️⃣ Salvando no MongoDB...")
        metrics = save_to_mongodb(cleaned)
        print(f"✅ Dados salvos no MongoDB. Resultado: {metrics}")

        print(f"✅ Sincronização concluída! {len(cleaned)} cards processados.")

        return {
            "status": "success",
            "message": "Sincronização concluída com sucesso!",
            "cards_cleaned": len(cleaned),
            "mongo_result": metrics if metrics else "Verifique o terminal para contagem de inserts/updates."
        }

    except Exception as e:
        print(f"❌ Erro dentro de sync_pipefy: {repr(e)}")
        raise