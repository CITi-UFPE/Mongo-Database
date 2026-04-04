import re
from typing import List, Dict, Any, Union

COLUNAS_FINAIS = ["Pipefy_ID", "Nome do Cliente", "Valor", "Fase Atual", "Responsável"]

def _limpar_string_pipefy(valor: Any) -> Union[str, Any]:
    if isinstance(valor, str) and valor.startswith('["'):
        return valor.replace('["', "").replace('"]', "").replace('"', "").replace("\\", "")
    return valor

def load_data_from_payload(payload: Any) -> List[Dict]:
    if payload is None:
        return []

    if isinstance(payload, dict) and "pages_raw" in payload:
        cards: List[Dict] = []
        for page in payload.get("pages_raw", []):
            edges = page.get("data", {}).get("cards", {}).get("edges", [])
            for edge in edges:
                node = edge.get("node")
                if isinstance(node, dict):
                    cards.append(node)
        return cards

    if isinstance(payload, list):
        cards: List[Dict] = []
        for item in payload:
            if isinstance(item, dict) and "node" in item and isinstance(item["node"], dict):
                cards.append(item["node"])
            elif isinstance(item, dict):
                cards.append(item)
        return cards

    if isinstance(payload, dict):
        if "node" in payload and isinstance(payload["node"], dict):
            return [payload["node"]]
        return [payload]

    return []

def _get_field_value_by_keywords(fields: List[Dict], keywords: List[str]) -> Any:
    for field in fields:
        field_name = str(field.get("name", "")).strip().lower()
        if any(keyword in field_name for keyword in keywords):
            return _limpar_string_pipefy(field.get("value"))
    return None

# 👇 FUNÇÃO ATUALIZADA COM AS 3 PRIORIDADES
def get_valor_correto(fields: List[Dict], fase_atual: str) -> Any:
    fase_lower = str(fase_atual).lower() if fase_atual else ""

    # Se a fase indicar que foi ganho/finalizado
    if any(palavra in fase_lower for palavra in ["ganho", "finaliz", "won", "fechado"]):
        
        # Prioridade 1: Valor do contrato
        valor_contrato = _get_field_value_by_keywords(fields, ["valor de contrato", "valor do contrato", "valor fechado"])
        if valor_contrato is not None and str(valor_contrato).strip() != "":
            return valor_contrato
            
        # Prioridade 2: Valor final de negociação
        valor_negociacao = _get_field_value_by_keywords(fields, ["valor final de negociação", "valor final", "negociação"])
        if valor_negociacao is not None and str(valor_negociacao).strip() != "":
            return valor_negociacao

    # Prioridade 3 / Fallback: Usa a proposta (seja porque não é ganho, ou porque os campos acima estavam vazios)
    return _get_field_value_by_keywords(fields, ["valor da proposta", "valor proposta"])

def get_responsavel(node: Dict) -> str:
    for field in node.get("fields", []):
        if "responsável" in field.get("name", "").lower():
            return str(_limpar_string_pipefy(field.get("value")))

    assignees = node.get("assignees", [])
    if assignees:
        return ", ".join([p.get("name", "") for p in assignees if isinstance(p, dict)])

    return "Não informado"

def smart_currency_clean(val: Any) -> float:
    if not val:
        return 0.0

    val_str = str(val)
    if any(t in val_str.lower() for t in ["sem", "estimativa", "null", "none"]):
        return 0.0

    clean = re.sub(r"[^\d.,]", "", val_str)
    if not clean:
        return 0.0

    if "." in clean and "," in clean:
        clean = clean.replace(",", "") if clean.find(",") < clean.find(".") else clean.replace(".", "").replace(",", ".")
    elif "," in clean:
        parts = clean.split(",")
        clean = clean.replace(",", "") if len(parts[-1]) == 3 else clean.replace(",", ".")
    elif "." in clean:
        parts = clean.split(".")
        if len(parts[-1]) == 3:
            clean = clean.replace(".", "")

    try:
        final_val = float(clean)
        if final_val < 0:
            return 0.0
        return final_val
    except ValueError:
        return 0.0

def _pipefy_datetime_to_iso_date(value: Any) -> Union[str, None]:
    if not value:
        return None

    text = str(value).strip()
    if not text:
        return None

    if re.match(r"^\d{4}-\d{2}-\d{2}", text):
        return text[:10]

    return None

def process_data(raw_data: List[Dict]) -> List[Dict]:
    processed: List[Dict] = []

    for item in raw_data:
        node = item.get("node", item) if isinstance(item, dict) else {}
        fields = node.get("fields", [])
        
        fase_atual = node.get("current_phase", {}).get("name")

        processed.append({
            "Pipefy_ID": node.get("id"),
            "Nome do Cliente": node.get("title"),
            "Valor": smart_currency_clean(get_valor_correto(fields, fase_atual)),
            "Fase Atual": fase_atual,
            "Responsável": get_responsavel(node),
            
            "Origem do Lead": _get_field_value_by_keywords(fields, ["origem do lead", "fonte do lead", "origem", "fonte", "origem","canal", "indicação" ]),
            "Serviços": _get_field_value_by_keywords(fields, ["serviço de interesse", "serviço", "interesse", "produto", "servi" ]),
            "Motivo da Perda": _get_field_value_by_keywords(fields, ["motivo da perda", "motivo", "perda", "lost", "razão", "Motivo da Perda"]),
            "Autoridade": _get_field_value_by_keywords(fields, ["autoridade"]),
            "Data de Qualificação": _pipefy_datetime_to_iso_date(node.get("created_at")),
            "Data de Criação": node.get("created_at"),
            "Data de Atualização": node.get("updated_at"),
        })

    return processed

def clean_pipefy_payload(payload: Any) -> List[Dict]:
    return process_data(load_data_from_payload(payload))