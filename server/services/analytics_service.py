import os
import sys
from datetime import datetime
from typing import List, Dict, Optional
from dotenv import load_dotenv

current_file_path = os.path.abspath(__file__)
services_dir = os.path.dirname(current_file_path)
server_dir = os.path.dirname(services_dir)
project_root = os.path.dirname(server_dir)

sys.path.append(server_dir)

env_path = os.path.join(project_root, '.env')
if os.path.exists(env_path):
    load_dotenv(env_path)

base_uri = (
    os.getenv("MONGO_URI_DEV") or
    os.getenv("MONGODB_URL") or
    os.getenv("MONGO_URI_PROD")
)

if base_uri and "mdp-mongo" in base_uri:
    print("🔧 Ajuste Local: Trocando 'mdp-mongo' por 'localhost'...")
    final_uri = base_uri.replace("mdp-mongo", "localhost")
    os.environ["MONGO_URI_DEV"] = final_uri
    os.environ["MONGO_URI_PROD"] = final_uri
    os.environ["MONGODB_URL"] = final_uri

try:
    from services.db import db_client
except ImportError as e:
    print(f"❌ Erro ao importar db_client: {e}")
    sys.exit(1)

print("✅ Analytics Service iniciado.")

FASES_ENCERRADAS = [
    "Perdido",
    "Desqualificados",
    "Finalizado/ganho",
]


def _build_date_match(data_inicio: Optional[str] = None, data_fim: Optional[str] = None) -> Dict:
    if not data_inicio and not data_fim:
        return {}

    condicoes = []

    range_query = {}
    if data_inicio:
        range_query["$gte"] = data_inicio
    if data_fim:
        range_query["$lte"] = data_fim
    condicoes.append({"data_qualificacao": range_query})

    range_query_dt = {}
    if data_inicio:
        range_query_dt["$gte"] = datetime.fromisoformat(f"{data_inicio}T00:00:00")
    if data_fim:
        range_query_dt["$lte"] = datetime.fromisoformat(f"{data_fim}T23:59:59")
    condicoes.append({"createdAt": range_query_dt})

    return {"$or": condicoes}


def _aplicar_filtro_servico(match: dict, servico: str | None = None) -> dict:
    if servico:
        match["$or"] = [
            {"servicos_interesse": servico},
            {"servicos_interesse": {"$in": [servico]}}
        ]
    return match

def get_leads_qualificados(
    limite_valor: float = 10000.0,
    data_inicio: Optional[str] = None,
    data_fim: Optional[str] = None,
    servico: Optional[str] = None
) -> Dict:
    try:
        col = db_client.get_collection("leads")
        if col is None:
            return {"qualificados": 0, "total": 0}

        date_match = _build_date_match(data_inicio, data_fim)

        filtro_total = {
            "fase": {"$nin": FASES_ENCERRADAS}
        }
        filtro_total = _aplicar_filtro_servico(filtro_total, servico)

        if date_match:
            filtro_total = {"$and": [filtro_total, date_match]}

        total_leads = col.count_documents(filtro_total)

        query = {
            "$and": [
                {"fase": {"$nin": FASES_ENCERRADAS}},
                {"valor": {"$gt": limite_valor}}
            ]
        }

        if servico:
            query["$and"].append({"servicos_interesse": servico})

        if date_match:
            query["$and"].append(date_match)

        qualificados = col.count_documents(query)

        return {"qualificados": qualificados, "total": total_leads}

    except Exception as e:
        print(f"❌ Erro ao contar leads qualificados: {e}")
        return {"qualificados": 0, "total": 0}


def get_previsao_faturamento(
    data_inicio: Optional[str] = None,
    data_fim: Optional[str] = None,
    servico: Optional[str] = None
) -> Dict[str, float]:
    try:
        col = db_client.get_collection("leads")
        if col is None:
            return {
                "base_pipeline_previsao": 0.0,
                "pessimista_20": 0.0,
                "realista_25": 0.0,
                "otimista_35": 0.0
            }

        date_match = _build_date_match(data_inicio, data_fim)

        match = {
            "fase": {"$in": ["Apresentação de proposta", "Negociação"]}
        }
        match = _aplicar_filtro_servico(match, servico)

        if date_match:
            match = {"$and": [match, date_match]}

        pipeline = [
            {"$match": match},
            {
                "$group": {
                    "_id": None,
                    "total": {"$sum": {"$ifNull": ["$valor", 0]}}
                }
            }
        ]

        result = list(col.aggregate(pipeline))
        total = float(result[0]["total"]) if result else 0.0

        return {
            "base_pipeline_previsao": total,
            "pessimista_20": total * 0.20,
            "realista_25": total * 0.25,
            "otimista_35": total * 0.35
        }

    except Exception as e:
        print(f"❌ Erro ao calcular previsão de faturamento: {e}")
        return {
            "base_pipeline_previsao": 0.0,
            "pessimista_20": 0.0,
            "realista_25": 0.0,
            "otimista_35": 0.0
        }


def get_distribuicao_fases(
    data_inicio: Optional[str] = None,
    data_fim: Optional[str] = None,
    servico: Optional[str] = None
) -> List[Dict]:
    try:
        col = db_client.get_collection("leads")
        if col is None:
            return []

        date_match = _build_date_match(data_inicio, data_fim)

        match = {}
        match = _aplicar_filtro_servico(match, servico)

        if date_match:
            match = {"$and": [match, date_match]} if match else date_match

        pipeline = [
            {"$match": match if match else {}},
            {
                "$addFields": {
                    "valor_calculado": {
                        "$switch": {
                            "branches": [
                                {
                                    "case": {"$in": ["$fase", ["Fechado", "Finalizado/ganho"]]},
                                    "then": {"$ifNull": ["$valor_final_negociacao", 0]}
                                },
                                {
                                    "case": {"$gt": ["$valor", 0]},
                                    "then": "$valor"
                                }
                            ],
                            "default": 0
                        }
                    }
                }
            },
            {
                "$group": {
                    "_id": "$fase",
                    "quantidade": {"$sum": 1},
                    "total_valor": {"$sum": "$valor_calculado"}
                }
            },
            {
                "$project": {
                    "_id": 0,
                    "fase": "$_id",
                    "quantidade": 1,
                    "total_valor": 1
                }
            },
            {"$sort": {"quantidade": -1}}
        ]

        return list(col.aggregate(pipeline))

    except Exception as e:
        print(f"❌ Erro ao obter distribuição por fases: {e}")
        return []


def get_ticket_medio(
    data_inicio: Optional[str] = None,
    data_fim: Optional[str] = None,
    servico: Optional[str] = None
) -> float:
    try:
        col = db_client.get_collection("leads")
        if col is None:
            return 0.0

        date_match = _build_date_match(data_inicio, data_fim)

        match = {"fase": "Finalizado/ganho"}
        match = _aplicar_filtro_servico(match, servico)

        if date_match:
            match = {"$and": [match, date_match]}

        pipeline = [
            {"$match": match},
            {"$group": {"_id": None, "ticket": {"$avg": {"$ifNull": ["$valor_final_negociacao", 0]}}}}
        ]

        result = list(col.aggregate(pipeline))
        return round(float(result[0]["ticket"]), 2) if result else 0.0

    except Exception as e:
        print(f"❌ Erro ao calcular ticket médio: {e}")
        return 0.0


def get_taxa_conversao(
    data_inicio: Optional[str] = None,
    data_fim: Optional[str] = None,
    servico: Optional[str] = None
) -> float:
    try:
        col = db_client.get_collection("leads")
        if col is None:
            return 0.0

        date_match = _build_date_match(data_inicio, data_fim)

        filtro_ganhos = {"fase": "Finalizado/ganho"}
        filtro_perdidos = {"fase": "Perdido"}
        filtro_desqualificados = {"fase": "Desqualificados"}

        filtro_ganhos = _aplicar_filtro_servico(filtro_ganhos, servico)
        filtro_perdidos = _aplicar_filtro_servico(filtro_perdidos, servico)
        filtro_desqualificados = _aplicar_filtro_servico(filtro_desqualificados, servico)

        if date_match:
            filtro_ganhos = {"$and": [filtro_ganhos, date_match]}
            filtro_perdidos = {"$and": [filtro_perdidos, date_match]}
            filtro_desqualificados = {"$and": [filtro_desqualificados, date_match]}

        ganhos = col.count_documents(filtro_ganhos)
        perdidos = col.count_documents(filtro_perdidos)
        desqualificados = col.count_documents(filtro_desqualificados)

        finalizados = ganhos + perdidos + desqualificados

        if finalizados == 0:
            return 0.0

        return round((ganhos / finalizados) * 100, 2)

    except Exception as e:
        print(f"❌ Erro ao calcular taxa de conversão: {e}")
        return 0.0


def get_analytics_summary_text(
    data_inicio: Optional[str] = None,
    data_fim: Optional[str] = None,
    servico: Optional[str] = None
) -> str:
    info = get_leads_qualificados(
        data_inicio=data_inicio,
        data_fim=data_fim,
        servico=servico
    )

    forecast = get_previsao_faturamento(
        data_inicio=data_inicio,
        data_fim=data_fim,
        servico=servico
    )

    ticket_medio = get_ticket_medio(
        data_inicio=data_inicio,
        data_fim=data_fim,
        servico=servico
    )

    taxa_conversao = get_taxa_conversao(
        data_inicio=data_inicio,
        data_fim=data_fim,
        servico=servico
    )

    servico_texto = servico if servico else "Todos os serviços"
    periodo_texto = f"{data_inicio or 'início da base'} até {data_fim or 'hoje'}"

    return f"""
Resumo de analytics para {servico_texto}, no período {periodo_texto}.

Foram analisados {info['total']} leads ativos, dos quais {info['qualificados']} foram considerados qualificados.

O forecast foi calculado sobre as fases "Apresentação de proposta" e "Negociação".
A base total considerada foi de R$ {forecast['base_pipeline_previsao']:,.2f}.

Cenários:
- Pessimista (20%): R$ {forecast['pessimista_20']:,.2f}
- Realista (25%): R$ {forecast['realista_25']:,.2f}
- Otimista (35%): R$ {forecast['otimista_35']:,.2f}

Diferença entre os cenários:
- O cenário pessimista assume uma taxa menor de fechamento do pipeline atual.
- O cenário realista assume uma taxa padrão de conversão.
- O cenário otimista assume um melhor aproveitamento comercial da mesma base em negociação.

O ticket médio dos ganhos finalizados é R$ {ticket_medio:,.2f}.
A taxa de conversão sobre os leads finalizados é {taxa_conversao:.2f}%.
""".strip()


if __name__ == "__main__":
    print("\n📊 --- TESTE DE ANALYTICS ---\n")

    info = get_leads_qualificados()
    print("Leads totais:", info["total"])
    print("Leads qualificados:", info["qualificados"])

    forecast = get_previsao_faturamento()
    print("\nForecast:")
    print(forecast)

    print("\nTicket médio:", get_ticket_medio())
    print("Taxa conversão:", get_taxa_conversao())

    print("\nDistribuição por fase:")
    fases = get_distribuicao_fases()
    for f in fases:
        print(f"{f['fase']} | {f['quantidade']} | {f['total_valor']}")

    print("\n=== FILTRANDO POR SERVIÇO ===")
    servico_teste = "UX/UI"

    info_servico = get_leads_qualificados(servico=servico_teste)
    print("Leads totais:", info_servico["total"])
    print("Leads qualificados:", info_servico["qualificados"])

    forecast_servico = get_previsao_faturamento(servico=servico_teste)
    print("\nForecast por serviço:")
    print(forecast_servico)

    print("\nTicket médio por serviço:", get_ticket_medio(servico=servico_teste))
    print("Taxa conversão por serviço:", get_taxa_conversao(servico=servico_teste))

    fases_servico = get_distribuicao_fases(servico=servico_teste)
    print("\nDistribuição por fase do serviço:")
    for f in fases_servico:
        print(f"{f['fase']} | {f['quantidade']} | {f['total_valor']}")

    col = db_client.get_collection("leads")
    if col is not None:
        servicos = col.distinct("servicos_interesse")
        print("\nServiços encontrados no banco:", servicos)

    print("\n-------------------------------------")