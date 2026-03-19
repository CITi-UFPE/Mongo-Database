import os
import sys
from datetime import datetime
from typing import List, Dict, Optional
from dotenv import load_dotenv

# -----------------------------------------------------------------------------
# 1. Configuração de Caminhos e Variáveis de Ambiente
# -----------------------------------------------------------------------------

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

# -----------------------------------------------------------------------------
# 2. Patch de Conexão (Redirecionamento Docker -> Localhost)
# -----------------------------------------------------------------------------

base_uri = (
    os.getenv("MONGO_URI_DEV") or 
    os.getenv("MONGODB_URL") or 
    os.getenv("MONGO_URI_PROD")
)

# Se o script for rodado no Windows (fora do Docker), o host 'mdp-mongo' é inacessível.
# Este bloco intercepta e força a conexão via localhost para a porta exposta.
if base_uri and "mdp-mongo" in base_uri and _should_replace_mongo_host():
    print(f"🔧 Ajuste Local: Trocando 'mdp-mongo' por 'localhost'...")
    final_uri = base_uri.replace("mdp-mongo", "localhost")
    
    # Sobrescreve as variáveis na memória para garantir que o Singleton do banco pegue a correta
    os.environ["MONGO_URI_DEV"] = final_uri
    os.environ["MONGO_URI_PROD"] = final_uri
    os.environ["MONGODB_URL"] = final_uri


# -----------------------------------------------------------------------------
# 3. Importação do Banco de Dados
# -----------------------------------------------------------------------------

try:
    from services.db import db_client
except ImportError:
    print("❌ Erro: Não foi possível importar o db_client. Verifique os caminhos do sys.path.")
    sys.exit(1)

print("✅ Analytics Service iniciado.")


# -----------------------------------------------------------------------------
# 4. Serviços de KPI (Métricas e Analytics)
# -----------------------------------------------------------------------------

def _build_date_match(data_inicio: Optional[str] = None, data_fim: Optional[str] = None) -> Dict:
    if not data_inicio and not data_fim:
        return {}

    date_conditions = []

    if data_inicio or data_fim:
        range_query = {}
        if data_inicio:
            range_query["$gte"] = data_inicio
        if data_fim:
            range_query["$lte"] = data_fim
        date_conditions.append({"data_qualificacao": range_query})

    if data_inicio or data_fim:
        range_query_dt = {}
        if data_inicio:
            range_query_dt["$gte"] = datetime.fromisoformat(f"{data_inicio}T00:00:00")
        if data_fim:
            range_query_dt["$lte"] = datetime.fromisoformat(f"{data_fim}T23:59:59")
        date_conditions.append({"createdAt": range_query_dt})

    if not date_conditions:
        return {}

    return {"$or": date_conditions}


def get_leads_qualificados(limite_valor: float = 10000.0, data_inicio: Optional[str] = None, data_fim: Optional[str] = None) -> int:
    """
    Conta o número de leads com alto potencial de fechamento
    
    Regra de Negóci:
    1. O 'valor' da proposta já está definido e é maior que o limite estipulado (Ex: > 10000.0).
    2. OU o 'budget_estimado' informado é diferente de "< R$10.000,00".
    """
    try:
        col = db_client.get_collection('leads')
        if col is None:
            return {"qualificados": 0, "total": 0}
        
        date_match = _build_date_match(data_inicio, data_fim)
        total_leads = col.count_documents(date_match if date_match else {})
        
        invalid_budgets = [
            "< R$10.000,00",
            None,
            ""
        ]

        query = {
            "$and": [
                {
                    "$or": [
                        {"valor": {"$gt": limite_valor}},
                        {"budget_estimado": {"$nin": invalid_budgets}}
                    ]
                }
            ]
        }

        if date_match:
            query["$and"].append(date_match)

        qualificados = col.count_documents(query)
        return {"qualificados": qualificados, "total": total_leads}
        
    except Exception as e:
        print(f"❌ Erro ao contar leads qualificados: {e}")
        return {"qualificados": 0, "total": 0}


def get_previsao_faturamento(fator_conversao: float = 0.25, data_inicio: Optional[str] = None, data_fim: Optional[str] = None) -> float:
    """
    Calcula a previsão de faturamento do pipeline atual
    
    Regra de Negócio:
    Soma o valor total de todos os leads que estão nas fases finais de negociação
    e aplica um percentual de conversão realista (25%)
    """
    try:
        col = db_client.get_collection('leads')
        if col is None:
            return 0.0
        
        date_match = _build_date_match(data_inicio, data_fim)

        pipeline = [
            {
                "$match": date_match if date_match else {}
            },
            # 1. Traz o nome da fase real lá da coleção de fases
            {
                "$lookup": {
                    "from": "fases",
                    "localField": "id_fase_atual",
                    "foreignField": "_id",
                    "as": "fase_info"
                }
            },
            {
                "$unwind": {
                    "path": "$fase_info",
                    "preserveNullAndEmptyArrays": True
                }
            },
            # 2. Filtra apenas os leads que estão nas fases de dinheiro (ajuste os nomes conforme as suas fases reais)
            {
                "$match": {
                    "fase_info.nome_fase": {"$in": ["Montagem de proposta", "Negociação", "Apresentação de proposta"]}
                }
            },
            # 3. Soma o valor estimado
            # 3. Soma o valor
            # 3. Soma o valor
            {
                "$group": {
                    "_id": None,           
                    "total_bruto": {"$sum": "$valor"}
                }
            }
        ]

        result = list(col.aggregate(pipeline))

        if not result:
            return 0.0
        
        total_bruto = result[0]['total_bruto']
        previsao = total_bruto * fator_conversao

        return previsao
        
    except Exception as e:
        print(f"❌ Erro ao calcular previsão de faturamento: {e}")
        return 0.0


def get_distribuicao_fases(data_inicio: Optional[str] = None, data_fim: Optional[str] = None) -> List[Dict]:
    """
    Retorna a quantidade de leads e o volume financeiro parado em cada fase
    
    Regra de Negócio:
    1. Se o lead possui um 'valor' real, este é utilizado.
    2. Se não (fases de prospecção), converte a string de 'budget_estimado' 
       no valor médio do range estipulado para compor a projeção financeira.
    """
    try:
        col = db_client.get_collection('leads')
        if col is None:
            return []
        
        date_match = _build_date_match(data_inicio, data_fim)

        pipeline = [
            {
                "$match": date_match if date_match else {}
            },
            # 1. Faz a ligação (JOIN) com a coleção de fases para pegar o nome real
            {
                "$lookup": {
                    "from": "fases",
                    "localField": "id_fase_atual",
                    "foreignField": "_id",
                    "as": "fase_info"
                }
            },
            {
                "$unwind": {
                    "path": "$fase_info",
                    "preserveNullAndEmptyArrays": True
                }
            },
            # 2. Arruma o valor (agora buscando 'valor_estimado') e o nome da fase
            # 2. Arruma o valor e converte o budget caso o valor real seja zero
            {
                "$addFields": {
                    "nome_fase_real": { "$ifNull": ["$fase_info.nome_fase", "Sem fase"] },
                    "valor_calculado": {
                        "$cond": {
                            "if": { "$gt": ["$valor", 0] },
                            "then": "$valor",
                            "else": {
                                "$switch": {
                                    "branches": [
                                        { "case": { "$eq": ["$budget_estimado", "< R$10.000,00"] }, "then": 5000 },
                                        { "case": { "$eq": ["$budget_estimado", "R$10.000,00 - R$20.000,00"] }, "then": 15000 },
                                        { "case": { "$eq": ["$budget_estimado", "R$20.000,00 - R$30.000,00"] }, "then": 25000 },
                                        { "case": { "$eq": ["$budget_estimado", "R$30.000,00 - R$40.000,00"] }, "then": 35000 },
                                        { "case": { "$eq": ["$budget_estimado", "R$40.000,00 - R$50.000,00"] }, "then": 45000 },
                                        { "case": { "$eq": ["$budget_estimado", "> R$50.000,00"] }, "then": 50000 }
                                    ],
                                    "default": 0
                                }
                            }
                        }
                    }
                }
            },
            # 3. Agrupa usando o nome real e soma o valor correto
            {
                "$group": {
                    "_id": "$nome_fase_real",
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
            {
                "$sort": {"quantidade": -1}
            }
        ]
        return list(col.aggregate(pipeline))
        
    except Exception as e:
        print(f"❌ Erro ao obter distribuição por fases: {e}")
        return []


# -----------------------------------------------------------------------------
# 5. Validação Local
# -----------------------------------------------------------------------------

if __name__ == "__main__":
    print("\n📊 --- TESTE DE ANALYTICS ---\n")
    
    # 1. Qualificados e Total
    info_leads = get_leads_qualificados()
    print(f"Total de Leads na Base: {info_leads['total']}")
    print(f"Leads Qualificados: {info_leads['qualificados']}")

    # 2. Previsão
    previsao = get_previsao_faturamento()
    print(f"Previsão de Faturamento (25%): R$ {previsao:,.2f}")
    
    # 3. Funil 
    print("\nFunil de Vendas:")
    funil = get_distribuicao_fases()
    
    for item in funil:
        fase_nome = item.get('fase')
        q = item.get('quantidade', 0)
        v = item.get('total_valor', 0)
        
        print(f"   - {fase_nome:<25} | Qtd: {q:<3} | R$ {v:,.2f}")
    
    print("\n-------------------------------------")