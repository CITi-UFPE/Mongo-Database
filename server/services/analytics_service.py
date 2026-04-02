import os
import sys
import unicodedata
from datetime import datetime
from typing import List, Dict, Optional
from dotenv import load_dotenv

#  Configuração de Caminhos e Variáveis de Ambiente
current_file_path = os.path.abspath(__file__)
services_dir = os.path.dirname(current_file_path)
server_dir = os.path.dirname(services_dir)
project_root = os.path.dirname(server_dir)

sys.path.append(server_dir)

env_path = os.path.join(project_root, '.env')
if os.path.exists(env_path):
    load_dotenv(env_path)

def _should_replace_mongo_host() -> bool:
    running_in_docker = os.path.exists('/.dockerenv')
    return os.name == 'nt' and not running_in_docker

#  Patch de Conexão (Redirecionamento Docker pro Localhost)
base_uri = (
    os.getenv("MONGO_URI_DEV") or 
    os.getenv("MONGODB_URL") or 
    os.getenv("MONGO_URI_PROD")
)

if base_uri and "mdp-mongo" in base_uri and _should_replace_mongo_host():
    print(f"🔧 Ajuste Local: Trocando 'mdp-mongo' por 'localhost'...")
    final_uri = base_uri.replace("mdp-mongo", "localhost")
    os.environ["MONGO_URI_DEV"] = final_uri
    os.environ["MONGO_URI_PROD"] = final_uri
    os.environ["MONGODB_URL"] = final_uri

# 3. Importação do Banco de Dados
try:
    from services.db import db_client
except ImportError:
    print("❌ Erro: Não foi possível importar o db_client.")
    sys.exit(1)

print("✅ Analytics Service iniciado.")


def _resolve_phase_name(phase_ref: object, phase_map: Dict[str, str], default: str = "") -> str:
    phase_raw = str(phase_ref or "").strip()
    if not phase_raw:
        return default

    # Primeiro tenta pelo mapeamento de ID da coleção fase_funils.
    mapped = phase_map.get(phase_raw)
    if mapped:
        return str(mapped).strip()

    # Compatibilidade: quando id_fase_atual já vem como nome da fase.
    return phase_raw


def _lead_phase_name(lead: Dict, phase_map: Dict[str, str], default: str = "") -> str:
    # Compatibilidade: algumas cargas gravam em id_fase_atual, outras em fase.
    phase_ref = lead.get("id_fase_atual")
    if phase_ref in (None, ""):
        phase_ref = lead.get("fase")
    return _resolve_phase_name(phase_ref, phase_map, default)


def _normalize_phase_text(value: object) -> str:
    text = str(value or "").strip().lower()
    if not text:
        return ""
    # Remove acentos para comparacao robusta entre nomes de fase.
    return "".join(ch for ch in unicodedata.normalize("NFD", text) if unicodedata.category(ch) != "Mn")


def _normalize_text_key(value: object) -> str:
    text = str(value or "").strip().lower()
    if not text:
        return ""
    text = " ".join(text.split())
    return "".join(ch for ch in unicodedata.normalize("NFD", text) if unicodedata.category(ch) != "Mn")


def _phase_contains_any(phase_name: object, tokens: List[str]) -> bool:
    normalized = _normalize_phase_text(phase_name)
    return any(token in normalized for token in tokens)


def _is_closed_won_phase(phase_name: object) -> bool:
    normalized = _normalize_phase_text(phase_name)
    if not normalized:
        return False

    # Se a fase indicar perda, nunca deve entrar no faturamento.
    if _is_closed_lost_phase(normalized):
        return False

    return _phase_contains_any(
        normalized,
        ["ganh", "conclu", "won", "faturad", "closed won", "venc", "finaliz"],
    )


def _is_closed_lost_phase(phase_name: object) -> bool:
    return _phase_contains_any(
        phase_name,
        ["perdid", "descart", "desqual", "lost", "cancel", "closed lost", "perda", "nao ganho"],
    )


def _is_forecastable_phase(phase_name: object) -> bool:
    return _phase_contains_any(
        phase_name,
        ["proposta", "negoci", "apresent", "orcament", "follow"],
    )


def get_leads_qualificados(limite_valor: float = 10000.0, data_inicio: Optional[str] = None, data_fim: Optional[str] = None) -> int:
    """
    Conta o número de leads com alto potencial de fechamento
    
    Regra de Negóci:
    1. O 'valor' da proposta já está definido e é maior que o limite estipulado (Ex: > 10000.0).
    2. OU o 'budget_estimado' informado é diferente de "< R$10.000,00".
    """
    try:
        col_leads = db_client.get_collection('leads')
        col_fases = db_client.get_collection('fase_funils')
        if col_leads is None or col_fases is None: return {"qualificados": 0, "total": 0}
        
        fases_docs = list(col_fases.find({}, {"_id": 1, "nome_fase": 1}))
        fase_map = {str(f["_id"]): f.get("nome_fase", "").lower() for f in fases_docs}

        date_match = _build_date_match(data_inicio, data_fim)
        leads = list(col_leads.find(date_match if date_match else {}, {"id_fase_atual": 1, "fase": 1, "valor_estimado": 1}))
        
        qualificados, total_ativos = 0, 0

        for lead in leads:
            nome_fase = _lead_phase_name(lead, fase_map, "sem fase").lower()

            if _is_closed_won_phase(nome_fase) or _is_closed_lost_phase(nome_fase):
                continue

            total_ativos += 1
            try:
                if float(lead.get("valor_estimado") or 0.0) > 0:
                    qualificados += 1
            except: pass

        return {"qualificados": qualificados, "total": total_ativos}
    except Exception as e:
        return {"qualificados": 0, "total": 0}

def get_previsao_faturamento(fator_conversao: float = 0.25, data_inicio: Optional[str] = None, data_fim: Optional[str] = None) -> float:
    try:
        col_leads = db_client.get_collection('leads')
        col_fases = db_client.get_collection('fase_funils') # CORRIGIDO
        if col_leads is None or col_fases is None: return 0.0
        
        fases_docs = list(col_fases.find({}, {"_id": 1, "nome_fase": 1}))
        fase_map = {str(f["_id"]): f.get("nome_fase", "") for f in fases_docs}

        date_match = _build_date_match(data_inicio, data_fim)
        leads = list(col_leads.find(date_match if date_match else {}, {"id_fase_atual": 1, "fase": 1, "valor_estimado": 1}))

        total_bruto = 0.0
        for lead in leads:
            nome_fase = _lead_phase_name(lead, fase_map, "")
            if _is_forecastable_phase(nome_fase):
                try: total_bruto += float(lead.get("valor_estimado") or 0.0)
                except: pass

        return total_bruto * fator_conversao
    except Exception: return 0.0


def get_total_leads_periodo(data_inicio: Optional[str] = None, data_fim: Optional[str] = None) -> int:
    """Conta todos os leads do período, independentemente de fase."""
    try:
        col_leads = db_client.get_collection('leads')
        if col_leads is None:
            return 0

        date_match = _build_date_match(data_inicio, data_fim)
        return int(col_leads.count_documents(date_match if date_match else {}))
    except Exception:
        return 0

def get_distribuicao_fases(data_inicio: Optional[str] = None, data_fim: Optional[str] = None) -> List[Dict]:
    try:
        col_leads = db_client.get_collection('leads')
        col_fases = db_client.get_collection('fase_funils') # CORRIGIDO
        if col_leads is None or col_fases is None: return []
        
        fases_docs = list(col_fases.find({}, {"_id": 1, "nome_fase": 1}))
        fase_map = {str(f["_id"]): f.get("nome_fase", "Sem fase") for f in fases_docs}

        date_match = _build_date_match(data_inicio, data_fim)
        leads = list(col_leads.find(date_match if date_match else {}, {"id_fase_atual": 1, "fase": 1, "valor_estimado": 1}))

        distribuicao = {}
        for lead in leads:
            # Tenta pegar pelo mapa, se não existir, usa o que está escrito no banco direto
            nome_fase = _lead_phase_name(lead, fase_map, "sem fase").lower()
            
            if _is_closed_won_phase(nome_fase) or _is_closed_lost_phase(nome_fase):
                continue
            
            try: valor = float(lead.get("valor_estimado") or 0.0)
            except: valor = 0.0

            if nome_fase not in distribuicao:
                distribuicao[nome_fase] = {"quantidade": 0, "total_valor": 0.0}
            
            distribuicao[nome_fase]["quantidade"] += 1
            distribuicao[nome_fase]["total_valor"] += valor

        resultado = [{"fase": nome, "quantidade": dados["quantidade"], "total_valor": dados["total_valor"]} for nome, dados in distribuicao.items()]
        resultado.sort(key=lambda x: x["quantidade"], reverse=True)
        return resultado
    except Exception: return []

def get_origem_dados(data_inicio: Optional[str] = None, data_fim: Optional[str] = None) -> List[Dict]:
    try:
        col = db_client.get_collection('leads')
        if col is None: return []
        date_match = _build_date_match(data_inicio, data_fim)
        leads = list(col.find(date_match if date_match else {}, {"origem": 1}))
        
        distribuicao = {}
        for lead in leads:
            origem = str(lead.get("origem") or "Não informada").strip()
            if not origem: origem = "Não informada"
            distribuicao[origem] = distribuicao.get(origem, 0) + 1
            
        resultado = [{"origem": nome, "quantidade": qtd} for nome, qtd in distribuicao.items()]
        resultado.sort(key=lambda x: x["quantidade"], reverse=True)
        return resultado
    except Exception: return []

def get_distribuicao_servicos(data_inicio: Optional[str] = None, data_fim: Optional[str] = None) -> List[Dict]:
    try:
        col = db_client.get_collection('leads')
        if col is None: return []
        date_match = _build_date_match(data_inicio, data_fim)
        leads = list(col.find(date_match if date_match else {}, {"servico": 1}))

        distribuicao: Dict[str, int] = {}
        rotulo_por_chave: Dict[str, str] = {}

        for lead in leads:
            servico_bruto = lead.get("servico")

            if isinstance(servico_bruto, list):
                candidatos = [str(item).strip() for item in servico_bruto if str(item).strip()]
            else:
                texto = str(servico_bruto or "").strip()
                if not texto:
                    candidatos = ["Não informado"]
                else:
                    # Pipefy pode retornar vários serviços em uma string separada por vírgula.
                    candidatos = [parte.strip() for parte in texto.replace(";", ",").split(",") if parte.strip()]
                    if not candidatos:
                        candidatos = ["Não informado"]

            # Evita dupla contagem quando o mesmo serviço aparece repetido no mesmo lead.
            chaves_do_lead = set()
            for servico in candidatos:
                chave = _normalize_text_key(servico)
                if not chave:
                    chave = "nao informado"
                    servico = "Não informado"
                chaves_do_lead.add((chave, servico))

            for chave, rotulo in chaves_do_lead:
                distribuicao[chave] = distribuicao.get(chave, 0) + 1
                if chave not in rotulo_por_chave:
                    rotulo_por_chave[chave] = rotulo

        resultado = [
            {"servico": rotulo_por_chave.get(chave, "Não informado"), "quantidade": qtd}
            for chave, qtd in distribuicao.items()
        ]
        resultado.sort(key=lambda x: x["quantidade"], reverse=True)

        # Pizza com muitas fatias fica ilegível: mantemos Top 8 e agrupamos o resto.
        limite_fatias = 8
        if len(resultado) > limite_fatias:
            principais = resultado[:limite_fatias]
            outros_total = sum(item["quantidade"] for item in resultado[limite_fatias:])
            if outros_total > 0:
                principais.append({"servico": "Outros", "quantidade": outros_total})
            return principais

        return resultado
    except Exception: return []

def get_motivos_perda(data_inicio: Optional[str] = None, data_fim: Optional[str] = None) -> List[Dict]:
    try:
        col_leads = db_client.get_collection('leads')
        col_fases = db_client.get_collection('fase_funils') # CORRIGIDO
        col_motivos = db_client.get_collection('motivos_perda') # NOVO: Mapeia os motivos!
        
        if col_leads is None or col_fases is None: return []
        
        fases_docs = list(col_fases.find({}, {"_id": 1, "nome_fase": 1}))
        fase_map = {str(f["_id"]): f.get("nome_fase", "").lower() for f in fases_docs}

        motivo_map = {}
        if col_motivos is not None:
            motivos_docs = list(col_motivos.find({}))
            motivo_map = {str(m["_id"]): m.get("nome", m.get("motivo", "Desconhecido")) for m in motivos_docs}

        date_match = _build_date_match(data_inicio, data_fim)
        leads = list(col_leads.find(date_match if date_match else {}, {"id_fase_atual": 1, "fase": 1, "motivo_perda": 1}))
        
        distribuicao = {}
        for lead in leads:
            nome_fase = _lead_phase_name(lead, fase_map, "").lower()
            
            if _is_closed_lost_phase(nome_fase):
                motivo_id_ou_texto = str(lead.get("motivo_perda") or "Não informado").strip()
                motivo_final = motivo_map.get(motivo_id_ou_texto, motivo_id_ou_texto)
                
                if not motivo_final: motivo_final = "Não informado"
                distribuicao[motivo_final] = distribuicao.get(motivo_final, 0) + 1
            
        resultado = [{"motivo": nome, "quantidade": qtd} for nome, qtd in distribuicao.items()]
        resultado.sort(key=lambda x: x["quantidade"], reverse=True)
        return resultado
    except Exception: return []


def get_resumo_perdas(data_inicio: Optional[str] = None, data_fim: Optional[str] = None) -> Dict[str, float]:
    """Retorna quantidade e valor total de leads em fases perdidas."""
    try:
        col_leads = db_client.get_collection('leads')
        col_fases = db_client.get_collection('fase_funils')
        if col_leads is None or col_fases is None:
            return {"total_perdidos": 0, "valor_perdido": 0.0}

        fases_docs = list(col_fases.find({}, {"_id": 1, "nome_fase": 1}))
        fase_map = {str(f["_id"]): f.get("nome_fase", "").lower() for f in fases_docs}

        date_match = _build_date_match(data_inicio, data_fim)
        leads = list(col_leads.find(date_match if date_match else {}, {"id_fase_atual": 1, "fase": 1, "valor_estimado": 1}))

        total_perdidos = 0
        valor_perdido = 0.0

        for lead in leads:
            nome_fase = _lead_phase_name(lead, fase_map, "").lower()
            if not _is_closed_lost_phase(nome_fase):
                continue

            total_perdidos += 1
            try:
                valor_perdido += float(lead.get("valor_estimado") or 0.0)
            except Exception:
                pass

        return {"total_perdidos": total_perdidos, "valor_perdido": round(valor_perdido, 2)}
    except Exception:
        return {"total_perdidos": 0, "valor_perdido": 0.0}


def _normalize_iso_date(value: Optional[str]) -> Optional[str]:
    if not value:
        return None

    text = str(value).strip()
    if not text:
        return None

    try:
        return datetime.strptime(text[:10], "%Y-%m-%d").strftime("%Y-%m-%d")
    except ValueError:
        return None


def add_faturamento_manual(
    valor: float,
    descricao: str = "",
    data_referencia: Optional[str] = None,
    criado_por: Optional[str] = None,
) -> Dict:
    col = db_client.get_collection("faturamento_manual")
    if col is None:
        raise RuntimeError("Coleção 'faturamento_manual' não encontrada.")

    data_ref = _normalize_iso_date(data_referencia) or datetime.utcnow().strftime("%Y-%m-%d")

    payload = {
        "valor": float(valor),
        "descricao": str(descricao or "").strip(),
        "data_referencia": data_ref,
        "criado_por": str(criado_por or "").strip() or None,
        "createdAt": datetime.utcnow(),
    }

    inserted = col.insert_one(payload)
    return {
        "id": str(inserted.inserted_id),
        "valor": payload["valor"],
        "descricao": payload["descricao"],
        "data_referencia": payload["data_referencia"],
        "criado_por": payload["criado_por"],
    }


def get_total_faturamento_manual(data_inicio: Optional[str] = None, data_fim: Optional[str] = None) -> float:
    try:
        col = db_client.get_collection("faturamento_manual")
        if col is None:
            return 0.0

        filtro = {}
        if data_inicio or data_fim:
            periodo = {}
            inicio = _normalize_iso_date(data_inicio)
            fim = _normalize_iso_date(data_fim)
            if inicio:
                periodo["$gte"] = inicio
            if fim:
                periodo["$lte"] = fim
            if periodo:
                filtro["data_referencia"] = periodo

        total = 0.0
        for item in col.find(filtro, {"valor": 1}):
            try:
                total += float(item.get("valor") or 0.0)
            except Exception:
                pass

        return round(total, 2)
    except Exception:
        return 0.0


def list_faturamento_manual(data_inicio: Optional[str] = None, data_fim: Optional[str] = None, limit: int = 100) -> List[Dict]:
    col = db_client.get_collection("faturamento_manual")
    if col is None:
        return []

    filtro = {}
    if data_inicio or data_fim:
        periodo = {}
        inicio = _normalize_iso_date(data_inicio)
        fim = _normalize_iso_date(data_fim)
        if inicio:
            periodo["$gte"] = inicio
        if fim:
            periodo["$lte"] = fim
        if periodo:
            filtro["data_referencia"] = periodo

    docs = list(
        col.find(filtro, {"valor": 1, "descricao": 1, "data_referencia": 1, "criado_por": 1, "createdAt": 1})
        .sort("createdAt", -1)
        .limit(max(1, int(limit)))
    )

    resultado = []
    for doc in docs:
        resultado.append(
            {
                "id": str(doc.get("_id")),
                "valor": float(doc.get("valor") or 0.0),
                "descricao": str(doc.get("descricao") or ""),
                "data_referencia": str(doc.get("data_referencia") or ""),
                "criado_por": str(doc.get("criado_por") or ""),
            }
        )
    return resultado

def get_faturamento_e_ticket(data_inicio: Optional[str] = None, data_fim: Optional[str] = None) -> Dict:
    try:
        col_leads = db_client.get_collection('leads')
        col_fases = db_client.get_collection('fase_funils') # CORRIGIDO
        if col_leads is None or col_fases is None: return {"faturamento": 0.0, "ticket_medio": 0.0}
        
        fases_docs = list(col_fases.find({}, {"_id": 1, "nome_fase": 1}))
        fase_map = {str(f["_id"]): f.get("nome_fase", "").lower() for f in fases_docs}

        date_match = _build_date_match(data_inicio, data_fim)
        leads = list(col_leads.find(date_match if date_match else {}, {"id_fase_atual": 1, "fase": 1, "valor_estimado": 1}))
        
        faturamento_total = 0.0
        vendas_ganhas = 0

        for lead in leads:
            nome_fase = _lead_phase_name(lead, fase_map, "").lower()
            
            if _is_closed_won_phase(nome_fase):
                try: valor = float(lead.get("valor_estimado") or 0.0)
                except: valor = 0.0
                
                faturamento_total += valor
                vendas_ganhas += 1
                
        ticket_medio = (faturamento_total / vendas_ganhas) if vendas_ganhas > 0 else 0.0
        
        return {
            "faturamento": faturamento_total,
            "ticket_medio": ticket_medio
        }
    except Exception: return {"faturamento": 0.0, "ticket_medio": 0.0}

def _build_date_match(data_inicio: str = None, data_fim: str = None):
    if not data_inicio and not data_fim:
        return {}

    cond_datetime = {}
    cond_iso_text = {}

    if data_inicio:
        try:
            dt_inicio = datetime.strptime(data_inicio[:10], "%Y-%m-%d")
            cond_datetime["$gte"] = dt_inicio
            cond_iso_text["$gte"] = dt_inicio.strftime("%Y-%m-%d")
        except ValueError:
            pass

    if data_fim:
        try:
            dt_fim = datetime.strptime(data_fim[:10], "%Y-%m-%d")
            cond_datetime["$lte"] = dt_fim.replace(hour=23, minute=59, second=59)
            cond_iso_text["$lte"] = dt_fim.strftime("%Y-%m-%d")
        except ValueError:
            pass

    clauses = []
    if cond_datetime:
        clauses.append({"createdAt": cond_datetime})
    if cond_iso_text:
        # Base legada: muitos documentos foram gravados apenas com data_qualificacao (YYYY-MM-DD).
        clauses.append({"data_qualificacao": cond_iso_text})

    if not clauses:
        return {}
    if len(clauses) == 1:
        return clauses[0]
    return {"$or": clauses}

# ==========================================
# NOVAS FUNÇÕES ADICIONADAS PARA O MVP (PDF)
# ==========================================

def get_taxa_conversao(data_inicio: Optional[str] = None, data_fim: Optional[str] = None) -> float:
    """Calcula a % de conversão (Ganhos / (Ganhos + Perdidos)) pedida na auditoria."""
    try:
        col_leads = db_client.get_collection('leads')
        col_fases = db_client.get_collection('fase_funils')
        if col_leads is None or col_fases is None: return 0.0
        
        fases_docs = list(col_fases.find({}, {"_id": 1, "nome_fase": 1}))
        fase_map = {str(f["_id"]): f.get("nome_fase", "").lower() for f in fases_docs}

        date_match = _build_date_match(data_inicio, data_fim)
        leads = list(col_leads.find(date_match if date_match else {}, {"id_fase_atual": 1, "fase": 1}))
        
        ganhos = 0
        perdidos = 0

        for lead in leads:
            nome_fase = _lead_phase_name(lead, fase_map, "").lower()
            
            if _is_closed_won_phase(nome_fase):
                ganhos += 1
            elif _is_closed_lost_phase(nome_fase):
                perdidos += 1
                
        total_finalizados = ganhos + perdidos
        if total_finalizados == 0: return 0.0
        
        return round((ganhos / total_finalizados) * 100, 2)
    except Exception: return 0.0

def get_meta_mensal(meta_alvo: float = 500000.0, data_inicio: Optional[str] = None, data_fim: Optional[str] = None) -> Dict:
    """Devolve a Meta vs Faturamento Atual (Barra de progresso do PDF)."""
    try:
        dados_faturamento = get_faturamento_e_ticket(data_inicio, data_fim)
        faturamento_atual = dados_faturamento.get("faturamento", 0.0)
        
        falta_para_meta = meta_alvo - faturamento_atual
        if falta_para_meta < 0: falta_para_meta = 0.0
        
        progresso_percentual = (faturamento_atual / meta_alvo) * 100 if meta_alvo > 0 else 0.0
        
        return {
            "meta_alvo": meta_alvo,
            "faturamento_atual": faturamento_atual,
            "falta_para_meta": falta_para_meta,
            "progresso_percentual": round(progresso_percentual, 2)
        }
    except Exception: return {"meta_alvo": meta_alvo, "faturamento_atual": 0.0, "falta_para_meta": meta_alvo, "progresso_percentual": 0.0}

def get_previsao_detalhada(fator_conversao: float = 0.25, data_inicio: Optional[str] = None, data_fim: Optional[str] = None) -> Dict:
    """Devolve o valor total do pipeline E a previsão realista separada (Exigência 5 do PDF)."""
    try:
        col_leads = db_client.get_collection('leads')
        col_fases = db_client.get_collection('fase_funils')
        if col_leads is None or col_fases is None: return {"pipeline_total": 0.0, "previsao_realista": 0.0}
        
        fases_docs = list(col_fases.find({}, {"_id": 1, "nome_fase": 1}))
        fase_map = {str(f["_id"]): f.get("nome_fase", "") for f in fases_docs}

        date_match = _build_date_match(data_inicio, data_fim)
        leads = list(col_leads.find(date_match if date_match else {}, {"id_fase_atual": 1, "fase": 1, "valor_estimado": 1}))

        total_bruto = 0.0
        for lead in leads:
            nome_fase = _lead_phase_name(lead, fase_map, "")
            if _is_forecastable_phase(nome_fase):
                try: total_bruto += float(lead.get("valor_estimado") or 0.0)
                except: pass

        return {
            "pipeline_total": total_bruto,
            "previsao_realista": total_bruto * fator_conversao
        }
    except Exception: return {"pipeline_total": 0.0, "previsao_realista": 0.0}

def get_tempo_por_estagio() -> List[Dict]:
    """
    Mock temporário para a métrica de 'Tempo por Estágio' do PDF.
    Como o Pipefy guarda o histórico de forma complexa, esta função entrega 
    a estrutura pronta para o Front-end não quebrar até que a extração de histórico seja feita.
    """
    return [
        {"fase": "Qualificação", "dias_medios": 15},
        {"fase": "Diagnóstico", "dias_medios": 8},
        {"fase": "Apresentação", "dias_medios": 12},
        {"fase": "Negociação", "dias_medios": 20}
    ]

# ==========================================

if __name__ == "__main__":
    print("\n📊 --- TESTE DE ANALYTICS ---\n")

    data_in = "2026-01-01"
    data_out = "2026-12-31"

    # 1. Qualificados e Total (Passando as datas)
    info_leads = get_leads_qualificados(data_inicio=data_in, data_fim=data_out)
    print(f"Total de Leads na Base: {info_leads['total']}")
    print(f"Leads Qualificados: {info_leads['qualificados']}")
    
    # 2. Previsão
    previsao = get_previsao_faturamento()
    print(f"Previsão de Faturamento (Antiga): R$ {previsao:,.2f}")
    
    # NOVOS TESTES (MVP)
    print("\n--- TESTES NOVOS DO PDF ---")
    print(f"Taxa de Conversão: {get_taxa_conversao(data_inicio=data_in)}%")
    meta = get_meta_mensal(data_inicio=data_in)
    print(f"Meta: R$ {meta['meta_alvo']:,.2f} | Atingido: R$ {meta['faturamento_atual']:,.2f} | Falta: R$ {meta['falta_para_meta']:,.2f}")
    prev_detalhada = get_previsao_detalhada(data_inicio=data_in)
    print(f"Pipeline Total: R$ {prev_detalhada['pipeline_total']:,.2f} | Previsão (25%): R$ {prev_detalhada['previsao_realista']:,.2f}")
    
    # 3. Funil 
    print("\nFunil de Vendas:")
    funil = get_distribuicao_fases()
    
    for item in funil:
        fase_nome = item.get('fase')
        q = item.get('quantidade', 0)
        v = item.get('total_valor', 0)
        
        print(f"   - {fase_nome:<25} | Qtd: {q:<3} | R$ {v:,.2f}")
    
    print("\n-------------------------------------")