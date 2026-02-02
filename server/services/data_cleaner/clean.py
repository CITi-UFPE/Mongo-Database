import json
import os
import re
import pandas as pd
from typing import List, Dict, Any, Union

# CONFIGURAÇÕES E CONSTANTES

INPUT_FILE = 'raw_data.json'
COLUNAS_FINAIS = ["Nome do Cliente", "Valor", "Fase Atual", "Responsável"]

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
            print(">>> Detectado formato paginado (GraphQL Dump). Extraindo cards...")
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
        nome = node.get('title')
        fase = node.get('current_phase', {}).get('name')
        resp = get_responsavel(node)
        
        # Extração e Tratamento Financeiro
        raw_val = get_valor_proposta(fields)
        val_float = smart_currency_clean(raw_val)

        processed_list.append({
            "Nome do Cliente": nome,
            "Valor": val_float,
            "Fase Atual": fase,
            "Responsável": resp
        })

    return pd.DataFrame(processed_list)

def main():
    # 1. Leitura
    raw_data = load_data(INPUT_FILE)
    
    if not raw_data: 
        print("Nenhum dado encontrado para processar.")
        return

    # 2. Processamento
    df = process_data(raw_data)
    
    # 3. Output (JSON Limpo)
    result = df[COLUNAS_FINAIS].to_dict(orient='records')
    print(json.dumps(result, indent=4, ensure_ascii=False))

if __name__ == "__main__":
    main()