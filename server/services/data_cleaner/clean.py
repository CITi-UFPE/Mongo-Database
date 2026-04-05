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

# 👇 FUNÇÃO ATUALIZADA COM AS 3 PRIORIDADES CORRIGIDAS (SEM BLOQUEIO DE FASE)
def get_valor_correto(fields: List[Dict], fase_atual: str, cliente_nome: str) -> Any:
    val_contrato = None
    val_negociacao = None
    val_proposta = None
    val_inicial = None

    # 1. BUSCA AGRESSIVA: Varremos os campos tirando acentos e espaços para evitar bugs do Pipefy
    for f in fields:
        name_raw = str(f.get("name", "")).strip().lower()
        # Limpamos os acentos para a busca não falhar
        name_clean = name_raw.replace("ã", "a").replace("ç", "c").replace("õ", "o").replace("á", "a")
        val = f.get("value")
        
        # Mapeando os valores encontrados nas imagens
        if "contrato" in name_clean:
            val_contrato = val
        elif "negociacao" in name_clean or "valor final" in name_clean:
            val_negociacao = val
        elif "proposta" in name_clean:
            val_proposta = val
        elif "estimado" in name_clean or name_clean == "valor":
            val_inicial = val

    # O Log agora vai te mostrar exatamente o que ele conseguiu extrair de cada campo!
    print(f"\n[DEBUG] Cliente: {cliente_nome}")
    print(f"[DEBUG] Valores extraídos do Pipefy -> Contrato: '{val_contrato}' | Negociação: '{val_negociacao}' | Proposta: '{val_proposta}'")

    # 2. LÓGICA DE PRIORIDADES: Da esquerda para a direita
    if val_contrato is not None and smart_currency_clean(val_contrato) > 0:
        print(f"[DEBUG] -> Escolheu Prioridade 1: Contrato")
        return val_contrato
        
    if val_negociacao is not None and smart_currency_clean(val_negociacao) > 0:
        print(f"[DEBUG] -> Escolheu Prioridade 2: Negociação")
        return val_negociacao
        
    if val_proposta is not None and smart_currency_clean(val_proposta) > 0:
        print(f"[DEBUG] -> Escolheu Prioridade 3: Proposta")
        return val_proposta

    # 3. LÓGICA DO ZERADO: Se preencheu com zero, retorna 0.0 para não somar no pipeline
    if val_contrato is not None or val_negociacao is not None or val_proposta is not None:
        print(f"[DEBUG] -> Campos existem, mas estão zerados. Retornando 0.0")
        return 0.0

    # 4. FALLBACK: Pega o inicial se o card for muito novo e não tiver os outros
    print(f"[DEBUG] -> Usando valor inicial de fallback: {val_inicial}")
    return val_inicial if val_inicial is not None else 0.0

    # Prioridade 4 (Fallback): Se os campos acima nem existirem no card, pega o Valor Inicial
    v_inicial = _get_field_value_by_keywords(fields, ["valor estimado", "valor"])
    print(f"[DEBUG] Não achou Contrato, Negociação ou Proposta. Usando Valor Inicial: {v_inicial}")
    return v_inicial
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
        nome_cliente = node.get("title", "Desconhecido")

        processed.append({
            "Pipefy_ID": node.get("id"),
            "Valor": smart_currency_clean(get_valor_correto(fields, fase_atual, nome_cliente)),"Nome do Cliente": nome_cliente,
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