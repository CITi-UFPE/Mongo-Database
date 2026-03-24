import os
import sys
from datetime import datetime
from typing import List, Dict, Optional
from dotenv import load_dotenv

# Configuração de Caminhos e Variáveis de Ambiente
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


# Patch de Conexão
base_uri = (
    os.getenv("MONGO_URI_DEV") or
    os.getenv("MONGODB_URL") or
    os.getenv("MONGO_URI_PROD")
)

if base_uri and "mdp-mongo" in base_uri and _should_replace_mongo_host():
    final_uri = base_uri.replace("mdp-mongo", "localhost")
    os.environ["MONGO_URI_DEV"] = final_uri
    os.environ["MONGO_URI_PROD"] = final_uri
    os.environ["MONGODB_URL"] = final_uri

# Importação do Banco de Dados
try:
    from services.db import db_client
except ImportError:
    print("❌ Erro: Não foi possível importar o db_client.")
    sys.exit(1)


def _build_date_match(data_inicio: str = None, data_fim: str = None):
    match_query = {}
    campo_data = "createdAt"

    if not data_inicio and not data_fim:
        return match_query

    match_query[campo_data] = {}

    if data_inicio:
        try:
            dt_inicio = datetime.strptime(data_inicio[:10], "%Y-%m-%d")
            match_query[campo_data]["$gte"] = dt_inicio
        except ValueError:
            pass

    if data_fim:
        try:
            dt_fim = datetime.strptime(data_fim[:10], "%Y-%m-%d")
            dt_fim = dt_fim.replace(hour=23, minute=59, second=59)
            match_query[campo_data]["$lte"] = dt_fim
        except ValueError:
            pass

    if not match_query[campo_data]:
        del match_query[campo_data]

    return match_query


def _get_nome_fase(lead: Dict) -> str:
    nome_fase = str(lead.get("fase") or "Sem fase").strip()
    if not nome_fase or nome_fase == "None":
        return "Sem fase"
    return nome_fase


def _get_valor_estimado(lead: Dict) -> float:
    try:
        return float(lead.get("valor_estimado") or lead.get("valor") or 0.0)
    except Exception:
        return 0.0


def _get_valor_fechado(lead: Dict) -> float:
    try:
        return float(
            lead.get("valor_final_negociacao")
            or lead.get("valor_estimado")
            or lead.get("valor")
            or 0.0
        )
    except Exception:
        return 0.0


def _is_fase_ganha(nome_fase: str) -> bool:
    nome = nome_fase.lower()
    return (
        "ganho" in nome
        or "concluído" in nome
        or "concluido" in nome
        or "fechado" in nome
    )


def _is_fase_perdida(nome_fase: str) -> bool:
    nome = nome_fase.lower()
    return "perdid" in nome or "descartad" in nome or "desqualificad" in nome


def _is_fase_inativa(nome_fase: str) -> bool:
    return _is_fase_ganha(nome_fase) or _is_fase_perdida(nome_fase)


def _is_fase_pipeline(nome_fase: str) -> bool:
    nome = nome_fase.lower()
    return (
        "montagem de proposta" in nome
        or "apresentação de proposta" in nome
        or "apresentacao de proposta" in nome
        or "negociação" in nome
        or "negociacao" in nome
    )


# ==========================================
# SERVIÇOS DE KPI
# ==========================================

def get_leads_qualificados(
    limite_valor: float = 0.0,
    data_inicio: Optional[str] = None,
    data_fim: Optional[str] = None
) -> Dict:
    try:
        col_leads = db_client.get_collection('leads')
        if col_leads is None:
            return {"qualificados": 0, "total": 0}

        date_match = _build_date_match(data_inicio, data_fim)
        leads = list(col_leads.find(
            date_match if date_match else {},
            {"fase": 1, "valor_estimado": 1, "valor": 1}
        ))

        qualificados = 0
        total_ativos = 0

        for lead in leads:
            nome_fase = _get_nome_fase(lead)

            if _is_fase_inativa(nome_fase):
                continue

            total_ativos += 1

            if _get_valor_estimado(lead) > limite_valor:
                qualificados += 1

        return {"qualificados": qualificados, "total": total_ativos}
    except Exception:
        return {"qualificados": 0, "total": 0}


def get_previsao_faturamento(
    fator_conversao: float = 0.25,
    data_inicio: Optional[str] = None,
    data_fim: Optional[str] = None
) -> float:
    try:
        col_leads = db_client.get_collection('leads')
        if col_leads is None:
            return 0.0

        date_match = _build_date_match(data_inicio, data_fim)
        leads = list(col_leads.find(
            date_match if date_match else {},
            {"fase": 1, "valor_estimado": 1, "valor": 1}
        ))

        total_bruto = 0.0

        for lead in leads:
            nome_fase = _get_nome_fase(lead)
            if _is_fase_pipeline(nome_fase):
                total_bruto += _get_valor_estimado(lead)

        return total_bruto * fator_conversao
    except Exception:
        return 0.0


def get_distribuicao_fases(
    data_inicio: Optional[str] = None,
    data_fim: Optional[str] = None
) -> List[Dict]:
    try:
        col_leads = db_client.get_collection('leads')
        if col_leads is None:
            return []

        date_match = _build_date_match(data_inicio, data_fim)
        leads = list(col_leads.find(
            date_match if date_match else {},
            {"fase": 1, "valor_estimado": 1, "valor": 1}
        ))

        distribuicao = {}

        for lead in leads:
            nome_fase = _get_nome_fase(lead)

            if _is_fase_inativa(nome_fase):
                continue

            valor = _get_valor_estimado(lead)

            if nome_fase not in distribuicao:
                distribuicao[nome_fase] = {"quantidade": 0, "total_valor": 0.0}

            distribuicao[nome_fase]["quantidade"] += 1
            distribuicao[nome_fase]["total_valor"] += valor

        resultado = [
            {
                "fase": nome,
                "quantidade": dados["quantidade"],
                "total_valor": dados["total_valor"]
            }
            for nome, dados in distribuicao.items()
        ]
        resultado.sort(key=lambda x: x["quantidade"], reverse=True)
        return resultado
    except Exception:
        return []


def get_origem_dados(
    data_inicio: Optional[str] = None,
    data_fim: Optional[str] = None
) -> List[Dict]:
    try:
        col_leads = db_client.get_collection('leads')
        col_origens = db_client.get_collection('origem_leads')
        if col_leads is None:
            return []

        origem_map = {}
        if col_origens is not None:
            origens_docs = list(col_origens.find({}, {"_id": 1, "canal": 1}))
            origem_map = {
                str(o["_id"]): o.get("canal", "Não informada")
                for o in origens_docs
            }

        date_match = _build_date_match(data_inicio, data_fim)
        leads = list(col_leads.find(
            date_match if date_match else {},
            {"id_origem_lead": 1, "origem": 1}
        ))

        distribuicao = {}
        for lead in leads:
            id_origem = str(lead.get("id_origem_lead", lead.get("origem", ""))).strip()
            nome_origem = origem_map.get(id_origem, id_origem)

            if not nome_origem or nome_origem == "None":
                nome_origem = "Não informada"

            distribuicao[nome_origem] = distribuicao.get(nome_origem, 0) + 1

        resultado = [{"origem": nome, "quantidade": qtd} for nome, qtd in distribuicao.items()]
        resultado.sort(key=lambda x: x["quantidade"], reverse=True)
        return resultado
    except Exception:
        return []


def get_distribuicao_servicos(
    data_inicio: Optional[str] = None,
    data_fim: Optional[str] = None
) -> List[Dict]:
    try:
        col = db_client.get_collection('leads')
        if col is None:
            return []

        date_match = _build_date_match(data_inicio, data_fim)
        leads = list(col.find(
            date_match if date_match else {},
            {"servico": 1, "servicos_interesse": 1}
        ))

        distribuicao = {}

        for lead in leads:
            servicos = lead.get("servicos_interesse", [])

            if isinstance(servicos, list) and servicos:
                for servico_item in servicos:
                    nome = str(servico_item or "Não informado").strip()
                    if not nome or nome == "None":
                        nome = "Não informado"
                    distribuicao[nome] = distribuicao.get(nome, 0) + 1
            else:
                servico = str(lead.get("servico") or "Não informado").strip()
                if not servico or servico == "None":
                    servico = "Não informado"
                distribuicao[servico] = distribuicao.get(servico, 0) + 1

        resultado = [{"servico": nome, "quantidade": qtd} for nome, qtd in distribuicao.items()]
        resultado.sort(key=lambda x: x["quantidade"], reverse=True)
        return resultado
    except Exception:
        return []


def get_motivos_perda(
    data_inicio: Optional[str] = None,
    data_fim: Optional[str] = None
) -> List[Dict]:
    try:
        col_leads = db_client.get_collection('leads')
        col_motivos = db_client.get_collection('motivos_perda')
        if col_leads is None:
            return []

        motivo_map = {}
        if col_motivos is not None:
            motivos_docs = list(col_motivos.find({}))
            motivo_map = {
                str(m["_id"]): m.get("descricao", "Desconhecido")
                for m in motivos_docs
            }

        date_match = _build_date_match(data_inicio, data_fim)
        leads = list(col_leads.find(
            date_match if date_match else {},
            {"fase": 1, "id_motivo_perda": 1, "motivo_perda": 1}
        ))

        distribuicao = {}
        for lead in leads:
            nome_fase = _get_nome_fase(lead)

            if _is_fase_perdida(nome_fase):
                motivo_id = str(lead.get("id_motivo_perda", lead.get("motivo_perda", ""))).strip()
                motivo_final = motivo_map.get(motivo_id, motivo_id)

                if not motivo_final or motivo_final == "None":
                    motivo_final = "Não informado"

                distribuicao[motivo_final] = distribuicao.get(motivo_final, 0) + 1

        resultado = [{"motivo": nome, "quantidade": qtd} for nome, qtd in distribuicao.items()]
        resultado.sort(key=lambda x: x["quantidade"], reverse=True)
        return resultado
    except Exception:
        return []


def get_faturamento_e_ticket(
    data_inicio: Optional[str] = None,
    data_fim: Optional[str] = None
) -> Dict:
    try:
        col_leads = db_client.get_collection('leads')
        if col_leads is None:
            return {"faturamento": 0.0, "ticket_medio": 0.0, "quantidade_ganhas": 0}

        date_match = _build_date_match(data_inicio, data_fim)
        leads = list(col_leads.find(
            date_match if date_match else {},
            {"fase": 1, "valor_final_negociacao": 1, "valor_estimado": 1, "valor": 1}
        ))

        faturamento_total = 0.0
        vendas_ganhas = 0

        for lead in leads:
            nome_fase = _get_nome_fase(lead)

            if _is_fase_ganha(nome_fase):
                faturamento_total += _get_valor_fechado(lead)
                vendas_ganhas += 1

        ticket_medio = (faturamento_total / vendas_ganhas) if vendas_ganhas > 0 else 0.0

        return {
            "faturamento": faturamento_total,
            "ticket_medio": ticket_medio,
            "quantidade_ganhas": vendas_ganhas
        }
    except Exception:
        return {"faturamento": 0.0, "ticket_medio": 0.0, "quantidade_ganhas": 0}


def get_taxa_conversao(
    data_inicio: Optional[str] = None,
    data_fim: Optional[str] = None
) -> float:
    try:
        col_leads = db_client.get_collection('leads')
        if col_leads is None:
            return 0.0

        date_match = _build_date_match(data_inicio, data_fim)
        leads = list(col_leads.find(
            date_match if date_match else {},
            {"fase": 1}
        ))

        ganhos = 0
        perdidos = 0

        for lead in leads:
            nome_fase = _get_nome_fase(lead)

            if _is_fase_ganha(nome_fase):
                ganhos += 1
            elif _is_fase_perdida(nome_fase):
                perdidos += 1

        total_finalizados = ganhos + perdidos
        if total_finalizados == 0:
            return 0.0

        return round((ganhos / total_finalizados) * 100, 2)
    except Exception:
        return 0.0


def get_meta_mensal(
    meta_alvo: float = 500000.0,
    data_inicio: Optional[str] = None,
    data_fim: Optional[str] = None
) -> Dict:
    try:
        dados_faturamento = get_faturamento_e_ticket(data_inicio, data_fim)
        faturamento_atual = dados_faturamento.get("faturamento", 0.0)

        falta_para_meta = meta_alvo - faturamento_atual
        if falta_para_meta < 0:
            falta_para_meta = 0.0

        progresso_percentual = (faturamento_atual / meta_alvo) * 100 if meta_alvo > 0 else 0.0

        return {
            "meta_alvo": meta_alvo,
            "faturamento_atual": faturamento_atual,
            "falta_para_meta": falta_para_meta,
            "progresso_percentual": round(progresso_percentual, 2)
        }
    except Exception:
        return {
            "meta_alvo": meta_alvo,
            "faturamento_atual": 0.0,
            "falta_para_meta": meta_alvo,
            "progresso_percentual": 0.0
        }


def get_previsao_detalhada(
    fator_conversao: float = 0.25,
    data_inicio: Optional[str] = None,
    data_fim: Optional[str] = None
) -> Dict:
    try:
        col_leads = db_client.get_collection('leads')
        if col_leads is None:
            return {"pipeline_total": 0.0, "previsao_realista": 0.0}

        date_match = _build_date_match(data_inicio, data_fim)
        leads = list(col_leads.find(
            date_match if date_match else {},
            {"fase": 1, "valor_estimado": 1, "valor": 1}
        ))

        total_bruto = 0.0

        for lead in leads:
            nome_fase = _get_nome_fase(lead)
            if _is_fase_pipeline(nome_fase):
                total_bruto += _get_valor_estimado(lead)

        return {
            "pipeline_total": total_bruto,
            "previsao_realista": total_bruto * fator_conversao
        }
    except Exception:
        return {"pipeline_total": 0.0, "previsao_realista": 0.0}


def get_tempo_por_estagio(
    data_inicio: Optional[str] = None,
    data_fim: Optional[str] = None
) -> List[Dict]:
    try:
        col_leads = db_client.get_collection('leads')
        if col_leads is None:
            return []

        date_match = _build_date_match(data_inicio, data_fim)
        leads = list(col_leads.find(
            date_match if date_match else {},
            {"historico_fases": 1}
        ))

        acumulado = {}

        for lead in leads:
            historico = lead.get("historico_fases", [])

            if not isinstance(historico, list):
                continue

            for item in historico:
                if not isinstance(item, dict):
                    continue

                nome_fase = str(item.get("fase") or "Sem fase").strip()
                data_entrada = item.get("data_entrada")
                data_saida = item.get("data_saida")

                if not nome_fase or nome_fase == "None" or not data_entrada or not data_saida:
                    continue

                try:
                    dt_entrada = datetime.fromisoformat(str(data_entrada).replace("Z", "+00:00"))
                    dt_saida = datetime.fromisoformat(str(data_saida).replace("Z", "+00:00"))
                    dias = (dt_saida - dt_entrada).total_seconds() / 86400
                except Exception:
                    continue

                if dias < 0:
                    continue

                if nome_fase not in acumulado:
                    acumulado[nome_fase] = {"dias_total": 0.0, "quantidade": 0}

                acumulado[nome_fase]["dias_total"] += dias
                acumulado[nome_fase]["quantidade"] += 1

        resultado = []
        for nome_fase, dados in acumulado.items():
            quantidade = dados["quantidade"]
            dias_medios = (dados["dias_total"] / quantidade) if quantidade > 0 else 0.0

            resultado.append({
                "fase": nome_fase,
                "dias_medios": round(dias_medios, 2),
                "quantidade": quantidade
            })

        resultado.sort(key=lambda x: x["dias_medios"], reverse=True)
        return resultado
    except Exception:
        return []


if __name__ == "__main__":
    print("\n✅ Analytics Service Iniciado com sucesso!")