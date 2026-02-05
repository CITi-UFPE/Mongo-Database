import json
import os
import re
import sys
import pandas as pd
from typing import List, Dict, Any, Union
from dotenv import load_dotenv
from pymongo import MongoClient

# ACHAR O CAMINHO DO ENV
current_dir = os.path.dirname(os.path.abspath(__file__))
server_dir = os.path.dirname(os.path.dirname(current_dir))
sys.path.append(server_dir)
env_path = os.path.join(server_dir, '.env')
load_dotenv(env_path)

# IMPORTAR SINGLETON DO BANCO
try:
    from services.db import db_client
    print("Conexão com o Banco de Dados estabelecida")
except ImportError as e:
    print("Erro ao importar o módulo de banco de dados")
    print(str(e))


# CONFIGURAÇÕES E CONSTANTES

INPUT_FILE = os.path.join(current_dir, 'raw_data.json')
OUTPUT_FILE = os.path.join(current_dir,'clean_data.json')
COLUNAS_FINAIS = ["Pipefy_ID", "Nome do Cliente", "Valor", "Fase Atual", "Responsável"]

# 1. FUNÇÕES

def _limpar_string_pipefy(valor: Any) -> Union[str, Any]:
    """
    Remove artefatos de lista stringuificada do Pipefy.
    Ex: '["Texto"]' -> 'Texto'
    """
    if isinstance(valor, str) and valor.startswith('["'):
        return valor.replace('["', '').replace('"]', '').replace('"', '').replace('\\', '')
    return valor

def load_data(filepath: str) -> List[Dict]:
    """
    ADAPTADOR: Carrega o JSON complexo gerado pelo script do colega
    e transforma em uma lista simples de cards (nodes) para o processamento.
    """
    if not os.path.exists(filepath):
        print(f"Aviso: Arquivo {filepath} não encontrado.")
        return []

    print(f"--- Lendo arquivo: {filepath} ---")
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            raw_json = json.load(f)

        if isinstance(raw_json, dict) and "pages_raw" in raw_json:
            flattened_cards = []
            
            # Itera sobre cada página
            for page in raw_json["pages_raw"]:
                cards_data = page.get("data", {}).get("cards", {})
                edges = cards_data.get("edges", [])
                
                for edge in edges:
                    if "node" in edge:
                        flattened_cards.append(edge["node"])
            
            return flattened_cards

        return raw_json if isinstance(raw_json, list) else [raw_json]

    except json.JSONDecodeError:
        print(f"Erro: O arquivo {filepath} não é um JSON válido.")
        return []

# 2. LÓGICA DE EXTRAÇÃO

def get_valor_proposta(fields: List[Dict]) -> Any:
    """
    Busca ESTRITAMENTE o campo 'Valor da proposta' na lista de campos.
    """
    for field in fields:
        nome_campo = field.get('name', '').lower()
        
        if "valor da proposta" in nome_campo:
            valor = field.get('value')
            return _limpar_string_pipefy(valor)
            
    return None

def get_responsavel(node: Dict) -> str:
    """
    Define o responsável pelo card.
    Prioridade: 1. Campo 'Responsável' | 2. Assignees (Donos do card no Pipefy).
    """
    fields = node.get('fields', [])
    
    for field in fields:
        if "responsável" in field.get('name', '').lower():
            valor = field.get('value')
            return _limpar_string_pipefy(valor)
            
    # Fallback: Busca nos 'assignees' (metadados do card)
    assignees = node.get('assignees', [])
    if assignees:
        # Junta nomes por vírgula se houver mais de um
        return ", ".join([p.get('name', '') for p in assignees])
        
    return "Não informado"

# 3. REGRAS DE NEGÓCIO 

def smart_currency_clean(val: Any) -> float:
    """
    Limpeza Financeira Inteligente (BR/US).
    """
    if not val: return 0.0
    val_str = str(val)
    
    termos_nulos = ['sem', 'estimativa', 'null', 'none']
    if any(termo in val_str.lower() for termo in termos_nulos):
        return 0.0

    clean = re.sub(r'[^\d.,]', '', val_str)
    if not clean: return 0.0

    # Lógica de Detecção de Formato
    if '.' in clean and ',' in clean:
        if clean.find(',') < clean.find('.'):
            clean = clean.replace(',', '') # US
        else:
            clean = clean.replace('.', '').replace(',', '.') # BR
    elif ',' in clean:
        parts = clean.split(',')
        if len(parts) > 1 and len(parts[-1]) == 3:
            clean = clean.replace(',', '') # Milhar US
        else:
            clean = clean.replace(',', '.') # Decimal BR
    elif '.' in clean:
        parts = clean.split('.')
        if len(parts) > 1 and len(parts[-1]) == 3:
             clean = clean.replace('.', '') # Milhar BR

    try:
        return float(clean)
    except ValueError:
        return 0.0

# 4. ORQUESTRAÇÃO PRINCIPAL (PIPELINE)

def process_data(raw_data: List[Dict]) -> pd.DataFrame:
    """
    Processa a lista de cards (nodes) extraída.
    """
    processed_list = []

    for item in raw_data:
        node = item.get('node', item)
        fields = node.get('fields', [])

        # Extração dos campos
        pipe_id = node.get('id')
        nome = node.get('title')
        fase = node.get('current_phase', {}).get('name')
        resp = get_responsavel(node)
        
        # Extração e Tratamento Financeiro
        raw_val = get_valor_proposta(fields)
        val_float = smart_currency_clean(raw_val)

        processed_list.append({
            "Pipefy_ID": pipe_id,
            "Nome do Cliente": nome,
            "Valor": val_float,
            "Fase Atual": fase,
            "Responsável": resp
        })

    return pd.DataFrame(processed_list)


def save_to_mongodb(data_list: List[Dict]):
    """
    Salva a lista de dicionários no MongoDB
    """
    try:
        leads_col = db_client.get_collection('leads')

        if leads_col is None:
            raise Exception("Coleção 'leads' não encontrada no banco de dados.")
        
        count_before = leads_col.count_documents({})

    except Exception as e:
        print("Erro de conexão")
        print(str(e))
        return
    
    updates = 0
    inserts = 0

    for item in data_list:
        pip_id = item.get("Pipefy_ID")
        if not pip_id:
            continue

        payload = {
            "Pipefy_ID": pip_id,
            "nome_cliente": item["Nome do Cliente"],
            "valor": item["Valor"],
            "fase": item["Fase Atual"],
            "responsavel": item["Responsável"]
        }

        # UPSERT
        result = leads_col.update_one(
            {"Pipefy_ID": pip_id}, 
            {"$set": payload}, 
            upsert=True
        )

        if result.upserted_id:
            inserts += 1
        elif result.modified_count > 0:
            updates += 1

    count_after = leads_col.count_documents({})

    print(f"Sincronização concluída:")
    print(f" - Documentos criados: {inserts}")
    print(f" - Documentos atualizados: {updates}")

    if count_after == count_before and inserts == 0:
        print("   ✨ IDEMPOTÊNCIA COMPROVADA: Nenhuma duplicata criada.")


def conectar_banco_local():
    """
    Força uma conexão manual com o localhost e injeta no Singleton.
    """
    print("\n🔌 Configurando conexão Local...")
    try:
        
        uri = os.getenv("MONGO_URI_DEV") 
        
        client = MongoClient(uri, serverSelectionTimeoutMS=2000)
        client.admin.command('ping')
        
        db_client.client = client
        db_client.db = client['database-comercial']
        
        print("✅ Conexão Local injetada com sucesso!")
        return True
    except Exception as e:
        print(f"❌ Falha na conexão local: {e}")
        return False
    

def main():
    raw_data = load_data(INPUT_FILE)
    if not raw_data: return

    df = process_data(raw_data)
    result = df[COLUNAS_FINAIS].to_dict(orient='records')  
    
    if os.path.exists(OUTPUT_FILE):
        print(f"Aviso: O arquivo {OUTPUT_FILE} já existe e será sobrescrito.")
    else:
        print(f"Criando arquivo: {OUTPUT_FILE}")

    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(result, f, indent=4, ensure_ascii=False)


    # LÓGICA DE BANCO DE DADOS LOCAL
    # Descomente essas duas linhas abaixo para testar a conexão local e salvar no MongoDB
    # e comente a linha original de save_to_mongodb(result)
    # if conectar_banco_local():
    #     save_to_mongodb(result)

    # LÓGICA DE BANCO DE DADOS ORIGINAL
    # Linha abaixo para salvar no MongoDB conforme configuração original
    save_to_mongodb(result)

    print(json.dumps(result, indent=4, ensure_ascii=False))

    if not raw_data: 
        print("Nenhum dado encontrado para processar.")
        return

if __name__ == "__main__":
    main()