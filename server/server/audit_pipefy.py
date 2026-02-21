# Arquivo: server/audit_pipefy.py
import asyncio
import json
from services.pipefy_temp import pipefy_temp_service

async def auditar():
    print("🕵️‍♀️  Gerente Auditando Pipefy...")
    print("--- Conectando na API ---")
    
    # Chama a mesma função que o Chat usa
    json_str = await pipefy_temp_service.get_context_for_ai()
    
    # Converte de texto para objeto Python para ficar bonito
    dados = json.loads(json_str)
    
    print("\n📊 RESUMO DA API:")
    print(f"Total de Leads retornados: {dados['resumo_executivo']['total_leads']}")
    print(f"Valor Total Pipeline: {dados['resumo_executivo']['valor_total_pipeline']}")
    
    print("\n📝 LISTA DE CLIENTES ENCONTRADOS (Top 5):")
    for lead in dados['top_5_maiores_oportunidades']:
        print(f"- {lead['cliente']} ({lead['valor']}) -> Fase: {lead['fase']}")

    print("\n✅ Auditoria concluída.")

if __name__ == "__main__":
    asyncio.run(auditar())