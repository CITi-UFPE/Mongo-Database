import json
import os
import re
import sys
from typing import List, Dict, Any, Union
from datetime import datetime


# -----------------------------------------------------------------------------
# Configuração de caminhos
# -----------------------------------------------------------------------------

current_dir = os.path.dirname(os.path.abspath(__file__))
server_dir = os.path.dirname(os.path.dirname(current_dir))
sys.path.append(server_dir)

INPUT_FILE = os.path.join(current_dir, 'raw_data.json')


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
    for field in fields:
        if nome_busca.lower() == field.get('name', '').lower():
            return _limpar_string_pipefy(field.get('value'))
    return None


def get_responsavel(node: Dict) -> str:
    """
    Obtém o responsável pelo card: primeiro tenta o campo "responsável",
    depois a lista de assignees. Retorna "Não informado" se ausente.
    """
    fields = node.get('fields', [])

    for field in fields:
        if "responsável" in field.get('name', '').lower():
            return _limpar_string_pipefy(field.get('value'))

    assignees = node.get('assignees', [])
    if assignees:
        return ", ".join([p.get('name', '') for p in assignees])

    return "Não informado"


def get_valor_proposta(fields: List[Dict]) -> Any:
    """Retorna o valor do campo 'Valor da proposta', já limpo para uso em moeda."""
    for field in fields:
        if "valor da proposta" in field.get('name', '').lower():
            return _limpar_string_pipefy(field.get('value'))
    return None


# -----------------------------------------------------------------------------
# Normalização de datas
# -----------------------------------------------------------------------------

def clean_date_br(date_str: Any) -> Union[str, None]:
    """
    Converte data no formato brasileiro (dd/mm/yyyy) para ISO (yyyy-mm-dd).

    Retorna None se o valor for inválido ou vazio.
    """
    if not date_str or not isinstance(date_str, str):
        return None
    try:
        return datetime.strptime(date_str.strip(), "%d/%m/%Y").strftime("%Y-%m-%d")
    except ValueError:
        return None


def clean_date_iso(date_str: Any) -> Union[str, None]:
    """
    Aceita data já em ISO e retorna apenas a parte da data (yyyy-mm-dd).

    Útil para campos como created_at que vêm com timestamp.
    """
    if not date_str or not isinstance(date_str, str):
        return None
    return date_str[:10]


# -----------------------------------------------------------------------------
# Normalização de valores monetários
# -----------------------------------------------------------------------------

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

    if any(x in val_str.lower() for x in ['sem', 'estimativa', 'null', 'none']):
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

        processed_list.append({
            "Pipefy_ID": node.get('id'),
            "Nome do Cliente": node.get('title'),
            "Fase Atual": node.get('current_phase', {}).get('name'),
            "Responsável": get_responsavel(node),
            "Valor": smart_currency_clean(get_valor_proposta(fields)),
            "Serviços": get_campo_texto(fields, "Serviço de interesse"),

            # Campos BANT (qualificação de lead)
            "Budget Estimado": get_campo_texto(fields, "[BANT] Budget Estimado"),
            "Autoridade": get_campo_texto(fields, "[BANT] Autoridade"),
            "Motivo da Perda": get_campo_texto(fields, "Motivo da perda"),
            "Origem do Lead": get_campo_texto(fields, "Fonte do lead"),
            "Prazo": get_campo_texto(fields, "[BANT] Prazo"),

            # Datas (todas em yyyy-mm-dd)
            "Data de Qualificação": clean_date_iso(node.get('created_at')),
            "Data de Diagnóstico": clean_date_br(get_campo_texto(fields, "Data do diagnóstico")),
            "Data de Proposta": clean_date_br(get_campo_texto(fields, "Data de apresentação de proposta"))
        })

    return processed_list


# -----------------------------------------------------------------------------
# Ponto de entrada
# -----------------------------------------------------------------------------

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
