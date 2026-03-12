import json
import os
import re
import sys
from typing import List, Dict, Any, Union
from datetime import datetime


# -----------------------------------------------------------------------------
# Configuração de caminhos
# -----------------------------------------------------------------------------
from dotenv import load_dotenv
from pymongo import MongoClient
from services.db import db_client

current_dir = os.path.dirname(os.path.abspath(__file__))
server_dir = os.path.dirname(os.path.dirname(current_dir))
sys.path.append(server_dir)

INPUT_FILE = os.path.join(current_dir, 'raw_data.json')
OUTPUT_FILE = os.path.join(current_dir,'clean_data.json')
COLUNAS_FINAIS = ["Pipefy_ID", 
                  "Nome do Cliente", 
                  "Valor", 
                  "Fase Atual", 
                  "Responsável",
                  "Budget Estimado",
                  "Autoridade",
                  "Motivo da Perda",
                  "Origem do Lead",
                  "Prazo",
                  "Data de Qualificação",
                  "Data de Diagnóstico",
                  "Data de Proposta",
                  ]


# -----------------------------------------------------------------------------
# Utilitários de string (Pipefy)
# -----------------------------------------------------------------------------

def _limpar_string_pipefy(valor: Any) -> Union[str, Any]:
    """
    Remove artefatos de lista stringificada do Pipefy.

    O Pipefy às vezes retorna campos como string de lista, ex: '["Texto"]'.
    Esta função extrai o valor útil e remove aspas/barras.
    """
    if isinstance(valor, str) and valor.startswith('["'):
        return valor.replace('["', '').replace('"]', '').replace('"', '').replace('\\', '')
    return valor


def _safe_lower(value: Any) -> str:
    if isinstance(value, str):
        return value.lower()
    if value is None:
        return ""
    return str(value).lower()


# -----------------------------------------------------------------------------
# Carregamento de dados
# -----------------------------------------------------------------------------

def load_data(filepath: str) -> List[Dict]:
    """
    Carrega o JSON gerado pelo extract e transforma em uma lista simples de cards.

    Se o JSON tiver estrutura com "pages_raw", extrai os nodes de cada página
    e retorna uma lista plana. Caso contrário, assume que já é uma lista de cards.
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


# -----------------------------------------------------------------------------
# Extração de campos dos nodes (cards)
# -----------------------------------------------------------------------------

def get_campo_texto(fields: List[Dict], nome_busca: str) -> str:
    """
    Busca um campo pelo nome (case-insensitive) e retorna o valor limpo.

    Retorna None se o campo não existir.
    """
    nome_busca_lower = _safe_lower(nome_busca)
    for field in fields:
        if not isinstance(field, dict):
            continue
        if nome_busca_lower == _safe_lower(field.get('name')):
            return _limpar_string_pipefy(field.get('value'))
    return None

def get_campo_texto(fields: List[Dict], nome_busca: str) -> str:
    """
    Função Genérica: Busca um campo pelo nome exato e retorna o texto limpo.
    Se não encontrar, retorna None (para o Banco não gravar lixo).
    """
    nome_busca_lower = _safe_lower(nome_busca)
    for field in fields:
        if not isinstance(field, dict):
            continue
        nome_real = field.get('name', '')
        
        if nome_busca_lower == _safe_lower(nome_real):
            valor = field.get('value')
            return _limpar_string_pipefy(valor)
            
    return None

def get_responsavel(node: Dict) -> str:
    """
    Obtém o responsável pelo card: primeiro tenta o campo "responsável",
    depois a lista de assignees. Retorna "Não informado" se ausente.
    """
    fields = node.get('fields', [])

    for field in fields:
        if not isinstance(field, dict):
            continue
        if "responsável" in _safe_lower(field.get('name')):
            return _limpar_string_pipefy(field.get('value'))

    assignees = node.get('assignees', [])
    if assignees:
        return ", ".join([p.get('name', '') for p in assignees])

    return "Não informado"


def get_valor_proposta(fields: List[Dict]) -> Any:
    """
    Busca o valor da proposta considerando variações comuns de nome do campo.
    Retorna o valor bruto (string/num) para ser normalizado por smart_currency_clean.
    """
    candidatos = [
        "Valor da proposta",
        "Valor",
        "Valor estimado",
        "Valor total",
        "[BANT] Budget Estimado",
    ]

    for nome in candidatos:
        valor = get_campo_texto(fields, nome)
        if valor not in (None, ""):
            return valor

    return None

def clean_date_br(date_str: Any) -> Union[str, None]:
    """
    Converte datas do formato BR (DD/MM/YYYY) para ISO (YYYY-MM-DD).
    Ex: "25/11/2025" -> "2025-11-25"
    """
    if not date_str or not isinstance(date_str, str):
        return None
    
    date_str = date_str.strip()
    try:
        dt_obj = datetime.strptime(date_str, "%d/%m/%Y")
        return dt_obj.strftime("%Y-%m-%d")
    except ValueError:
        return None

def clean_date_iso(date_str: Any) -> Union[str, None]:
    """
    Pega apenas a parte da data de uma string ISO 8601.
    Ex: "2025-12-23T17:21:09Z" -> "2025-12-23"
    """
    if not date_str or not isinstance(date_str, str):
        return None
    
    return date_str[:10]

# 3. REGRAS DE NEGÓCIO 

def smart_currency_clean(val: Any) -> float:
    """
    Converte string de moeda (BR ou US) em float.

    - Ignora textos como "sem estimativa", "null", etc. (retorna 0.0).
    - Detecta formato: vírgula como decimal (BR) ou separador de milhar (US).
    - Valores negativos são corrigidos para 0.0 (regra de negócio).
    """
    if not val:
        return 0.0

    val_str = str(val)

    if any(x in _safe_lower(val_str) for x in ['sem', 'estimativa', 'null', 'none']):
        return 0.0

    clean = re.sub(r'[^\d.,-]', '', val_str)
    if not clean:
        return 0.0

    # Detecção de formato: BR (1.234,56) vs US (1,234.56)
    if '.' in clean and ',' in clean:
        if clean.find(',') < clean.find('.'):
            clean = clean.replace(',', '')
        else:
            clean = clean.replace('.', '').replace(',', '.')
    elif ',' in clean:
        parts = clean.split(',')
        if len(parts) > 1 and len(parts[-1]) == 3:
            clean = clean.replace(',', '')
        else:
            clean = clean.replace(',', '.')
    elif '.' in clean:
        parts = clean.split('.')
        if len(parts) > 1 and len(parts[-1]) == 3:
            clean = clean.replace('.', '')

    try:
        final_val = float(clean)
        if final_val < 0:
            return 0.0
        return final_val
    except ValueError:
        return 0.0


# -----------------------------------------------------------------------------
# Pipeline principal: raw cards -> lista de dicionários limpos
# -----------------------------------------------------------------------------

def process_data(raw_data: List[Dict]) -> List[Dict]:
    """
    Processa a lista de cards brutos e retorna uma lista de dicionários normalizados.

    Cada item de saída contém: identificadores Pipefy, dados do cliente,
    fase, responsável, valor, serviços, campos BANT e datas padronizadas.
    """
    processed_list = []

    for item in raw_data:
        node = item.get('node', item)
        fields = node.get('fields', [])

        pipe_id = node.get('id')
        nome = node.get('title')
        fase = node.get('current_phase', {}).get('name')
        resp = get_responsavel(node)

        raw_val = (
            get_campo_texto(fields, "Valor da proposta")
            or get_campo_texto(fields, "Valor")
            or get_campo_texto(fields, "Valor estimado")
            or get_campo_texto(fields, "Valor total")
            or get_campo_texto(fields, "[BANT] Budget Estimado")
        )
        val_float = smart_currency_clean(raw_val)

        budget = get_campo_texto(fields, "[BANT] Budget Estimado")
        autoridade = get_campo_texto(fields, "[BANT] Autoridade")
        motivo = get_campo_texto(fields, "Motivo da perda")
        origem = get_campo_texto(fields, "Fonte do lead")
        servicos = (
            get_campo_texto(fields, "Serviço de interesse")
            or get_campo_texto(fields, "Servico de interesse")
            or get_campo_texto(fields, "Serviços")
            or get_campo_texto(fields, "Serviços de interesse")
            or get_campo_texto(fields, "Servicos")
            or get_campo_texto(fields, "Servicos de interesse")
        )
        prazo = get_campo_texto(fields, "[BANT] Prazo")

        dt_criacao_raw = node.get('created_at')
        data_qualificacao = clean_date_iso(dt_criacao_raw)

        dt_diag_raw = get_campo_texto(fields, "Data do diagnóstico")
        data_diagnostico = clean_date_br(dt_diag_raw)

        dt_prop_raw = get_campo_texto(fields, "Data de apresentação de proposta")
        data_proposta = clean_date_br(dt_prop_raw)

        processed_list.append({
            "Pipefy_ID": pipe_id,
            "Nome do Cliente": nome,
            "Valor": val_float,
            "Fase Atual": fase,
            "Responsável": resp,
            "Budget Estimado": budget,
            "Autoridade": autoridade,
            "Motivo da Perda": motivo,
            "Origem do Lead": origem,
            "Serviços": servicos,
            "Prazo": prazo,
            "Data de Qualificação": data_qualificacao,
            "Data de Diagnóstico": data_diagnostico,
            "Data de Proposta": data_proposta,
        })

    return processed_list


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
            "responsavel": item["Responsável"],
            "budget_estimado": item.get("Budget Estimado"),
            "autoridade": item.get("Autoridade"),
            "motivo_perda": item.get("Motivo da Perda"),
            "origem_lead": item.get("Origem do Lead"),
            "prazo": item.get("Prazo"),
            "data_qualificacao": item.get("Data de Qualificação"),
            "data_diagnostico": item.get("Data de Diagnóstico"),
            "data_proposta": item.get("Data de Proposta")
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
    """Carrega dados do arquivo, processa, exibe auditoria e persiste no MongoDB."""
    raw_data = load_data(INPUT_FILE)

    if not raw_data:
        print("Nenhum dado para processar.")
        return

    clean_data = process_data(raw_data)

    print("\nAuditoria de Dados:")
    print(json.dumps(clean_data[:2], indent=2, ensure_ascii=False))

    try:
        sys.path.append(os.path.join(server_dir, 'services'))
        from services.db_loader import save_to_mongodb

        save_to_mongodb(clean_data)
    except ImportError as e:
        print(f"❌ Erro de importação: {e}. Verifique o caminho dos arquivos.")
    except Exception as e:
        print(f"❌ Erro crítico ao salvar: {e}")


if __name__ == "__main__":
    main()
