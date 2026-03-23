import re
import json
from typing import List, Dict, Any, Union


COLUNAS_FINAIS = [
    "Pipefy_ID",
    "Nome do Cliente",
    "Valor",
    "Valor_Final_Negociacao",
    "Fase Atual",
    "Responsável",
    "Servicos_Interesse",
    "Motivo_Perda",
    "Created_At",
    "Updated_At",
    "Historico_Fases",
]


def _limpar_string_pipefy(valor: Any) -> Union[str, Any]:
    if isinstance(valor, str) and valor.startswith('["'):
        return valor.replace('["', "").replace('"]', "").replace('"', "").replace("\\", "")
    return valor


def _parse_lista_pipefy(valor: Any) -> List[str]:
    if not valor:
        return []

    if isinstance(valor, list):
        return [str(item).strip() for item in valor if str(item).strip()]

    if isinstance(valor, str):
        valor = valor.strip()

        try:
            parsed = json.loads(valor)
            if isinstance(parsed, list):
                return [str(item).strip() for item in parsed if str(item).strip()]
        except Exception:
            pass

        valor_limpo = _limpar_string_pipefy(valor)

        if isinstance(valor_limpo, str):
            if "," in valor_limpo:
                return [item.strip() for item in valor_limpo.split(",") if item.strip()]
            if valor_limpo.strip():
                return [valor_limpo.strip()]

    return []


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


def get_valor_proposta(fields: List[Dict]) -> Any:
    for field in fields:
        if "valor da proposta" in field.get("name", "").lower():
            return _limpar_string_pipefy(field.get("value"))
    return None


def get_valor_final_negociacao(fields: List[Dict]) -> Any:
    for field in fields:
        if "valor final de negociação" in field.get("name", "").lower():
            return _limpar_string_pipefy(field.get("value"))
    return None


def get_servicos_interesse(fields: List[Dict]) -> List[str]:
    for field in fields:
        nome = field.get("name", "").lower()
        if "serviço de interesse" in nome or "servico de interesse" in nome:
            return _parse_lista_pipefy(field.get("value"))
    return []


def get_responsavel(node: Dict) -> str:
    for field in node.get("fields", []):
        nome = field.get("name", "").lower()
        if "responsável" in nome or "responsavel" in nome:
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


def get_motivo_perda(fields: List[Dict]) -> str:
    for field in fields:
        nome = field.get("name", "").lower()
        if "motivo da perda" in nome or "motivo de perda" in nome:
            valor = _limpar_string_pipefy(field.get("value"))
            return str(valor).strip() if valor else ""
    return ""


def get_historico_fases(node: Dict) -> List[Dict]:
    historico = node.get("phases_history", [])
    resultado = []

    if not isinstance(historico, list):
        return resultado

    for item in historico:
        if not isinstance(item, dict):
            continue

        fase_info = item.get("phase", {}) or {}

        resultado.append({
            "id_fase": fase_info.get("id"),
            "fase": fase_info.get("name"),
            "data_entrada": item.get("firstTimeIn"),
            "data_saida": item.get("lastTimeOut"),
        })

    return resultado


def process_data(raw_data: List[Dict]) -> List[Dict]:
    processed: List[Dict] = []

    for item in raw_data:
        node = item.get("node", item) if isinstance(item, dict) else {}
        fields = node.get("fields", [])

        processed.append({
            "Pipefy_ID": node.get("id"),
            "Nome do Cliente": node.get("title"),
            "Valor": smart_currency_clean(get_valor_proposta(fields)),
            "Valor_Final_Negociacao": smart_currency_clean(get_valor_final_negociacao(fields)),
            "Fase Atual": node.get("current_phase", {}).get("name"),
            "Responsável": get_responsavel(node),
            "Servicos_Interesse": get_servicos_interesse(fields),
            "Motivo_Perda": get_motivo_perda(fields),
            "Created_At": node.get("created_at"),
            "Updated_At": node.get("updated_at"),
            "Historico_Fases": get_historico_fases(node),
        })

    return processed


def clean_pipefy_payload(payload: Any) -> List[Dict]:
    return process_data(load_data_from_payload(payload))