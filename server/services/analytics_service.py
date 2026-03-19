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


def get_leads_qualificados(limite_valor: float = 10000.0, data_inicio: Optional[str] = None, data_fim: Optional[str] = None) -> Dict:
    try:
        col_leads = db_client.get_collection('leads')
        col_fases = db_client.get_collection('fases')
        if col_leads is None or col_fases is None: return {"qualificados": 0, "total": 0}
        
        # 1. Mapeia as fases para saber os nomes
        fases_docs = list(col_fases.find({}, {"_id": 1, "nome_fase": 1}))
        fase_map = {str(f["_id"]): f.get("nome_fase", "").lower() for f in fases_docs}

        date_match = _build_date_match(data_inicio, data_fim)
        leads = list(col_leads.find(date_match if date_match else {}, {"id_fase_atual": 1, "valor_estimado": 1}))
        
        # 🚨 LISTA DE BLOQUEIO: Coloque aqui os nomes das fases que você NÃO quer contar (use letras minúsculas)
        fases_inativas = ["ganho", "perdido", "descartado", "concluído"]

        qualificados = 0
        total_ativos = 0

        for lead in leads:
            fase_id = str(lead.get("id_fase_atual", ""))
            nome_fase = fase_map.get(fase_id, "sem fase")

            # Se a fase do lead contiver alguma palavra da lista de bloqueio, a gente ignora ele
            if any(inativa in nome_fase for inativa in fases_inativas):
                continue

            total_ativos += 1 # Conta como Lead Ativo

            try:
                valor = float(lead.get("valor_estimado") or 0.0)
                if valor > 0:  # Se tem valor real, está qualificado
                    qualificados += 1
            except:
                pass

        return {"qualificados": qualificados, "total": total_ativos}
    except Exception as e:
        print(f"❌ Erro ao contar leads qualificados: {e}")
        return {"qualificados": 0, "total": 0}


def get_previsao_faturamento(fator_conversao: float = 0.25, data_inicio: Optional[str] = None, data_fim: Optional[str] = None) -> float:
    try:
        col_leads = db_client.get_collection('leads')
        col_fases = db_client.get_collection('fases')
        if col_leads is None or col_fases is None: return 0.0
        
        # 1. Mapeia as fases em Python (Isto resolve o problema do "Sem fase" de vez)
        fases_docs = list(col_fases.find({}, {"_id": 1, "nome_fase": 1}))
        fase_map = {str(f["_id"]): f.get("nome_fase", "") for f in fases_docs}

        # 2. Busca os leads
        date_match = _build_date_match(data_inicio, data_fim)
        leads = list(col_leads.find(date_match if date_match else {}, {"id_fase_atual": 1, "valor_estimado": 1}))

        total_bruto = 0.0
        fases_alvo = ["Montagem de proposta", "Negociação", "Apresentação de proposta"]

        # 3. Soma o valor com base na fase traduzida
        for lead in leads:
            fase_id = str(lead.get("id_fase_atual", ""))
            nome_fase = fase_map.get(fase_id, "")
            
            if nome_fase in fases_alvo:
                try:
                    total_bruto += float(lead.get("valor_estimado") or 0.0)
                except:
                    pass

        return total_bruto * fator_conversao
    except Exception as e:
        print(f"❌ Erro ao calcular previsão: {e}")
        return 0.0


def get_distribuicao_fases(data_inicio: Optional[str] = None, data_fim: Optional[str] = None) -> List[Dict]:
    try:
        col_leads = db_client.get_collection('leads')
        col_fases = db_client.get_collection('fases')
        if col_leads is None or col_fases is None: return []
        
        fases_docs = list(col_fases.find({}, {"_id": 1, "nome_fase": 1}))
        # Mantém o nome original para exibição
        fase_map = {str(f["_id"]): f.get("nome_fase", "Sem fase") for f in fases_docs}

        date_match = _build_date_match(data_inicio, data_fim)
        leads = list(col_leads.find(date_match if date_match else {}, {"id_fase_atual": 1, "valor_estimado": 1}))

        distribuicao = {}
        
        # 🚨 LISTA DE BLOQUEIO
        fases_inativas = ["ganho", "perdido", "descartado", "concluído"]

        for lead in leads:
            fase_id = str(lead.get("id_fase_atual", ""))
            nome_fase = fase_map.get(fase_id, "Sem fase")
            
            # Barrando os inativos do Funil
            if any(inativa in nome_fase.lower() for inativa in fases_inativas):
                continue
            
            try:
                valor = float(lead.get("valor_estimado") or 0.0)
            except:
                valor = 0.0

            if nome_fase not in distribuicao:
                distribuicao[nome_fase] = {"quantidade": 0, "total_valor": 0.0}
            
            distribuicao[nome_fase]["quantidade"] += 1
            distribuicao[nome_fase]["total_valor"] += valor

        resultado = [
            {"fase": nome, "quantidade": dados["quantidade"], "total_valor": dados["total_valor"]}
            for nome, dados in distribuicao.items()
        ]
        
        resultado.sort(key=lambda x: x["quantidade"], reverse=True)
        return resultado

    except Exception as e:
        print(f"❌ Erro ao obter distribuição por fases: {e}")
        return []
# -----------------------------------------------------------------------------
# 6. Novas Métricas (Origem, Serviços, Perdas e Faturamento)
# -----------------------------------------------------------------------------

def get_origem_dados(data_inicio: Optional[str] = None, data_fim: Optional[str] = None) -> List[Dict]:
    try:
        col = db_client.get_collection('leads')
        if col is None: return []
        
        date_match = _build_date_match(data_inicio, data_fim)
        # Substitua "origem" pelo nome exato do campo que vem do Pipefy (ex: "origem_do_lead")
        leads = list(col.find(date_match if date_match else {}, {"origem": 1}))
        
        distribuicao = {}
        for lead in leads:
            origem = str(lead.get("origem") or "Não informada").strip()
            if not origem: origem = "Não informada"
            distribuicao[origem] = distribuicao.get(origem, 0) + 1
            
        resultado = [{"origem": nome, "quantidade": qtd} for nome, qtd in distribuicao.items()]
        resultado.sort(key=lambda x: x["quantidade"], reverse=True)
        return resultado
    except Exception as e:
        print(f"❌ Erro ao obter origem: {e}")
        return []

def get_distribuicao_servicos(data_inicio: Optional[str] = None, data_fim: Optional[str] = None) -> List[Dict]:
    try:
        col = db_client.get_collection('leads')
        if col is None: return []
        
        date_match = _build_date_match(data_inicio, data_fim)
        # Substitua "servico" pelo nome exato do campo no Pipefy (ex: "tipo_de_servico")
        leads = list(col.find(date_match if date_match else {}, {"servico": 1}))
        
        distribuicao = {}
        for lead in leads:
            servico = str(lead.get("servico") or "Não informado").strip()
            if not servico: servico = "Não informado"
            distribuicao[servico] = distribuicao.get(servico, 0) + 1
            
        resultado = [{"servico": nome, "quantidade": qtd} for nome, qtd in distribuicao.items()]
        resultado.sort(key=lambda x: x["quantidade"], reverse=True)
        return resultado
    except Exception as e:
        print(f"❌ Erro ao obter serviços: {e}")
        return []

def get_motivos_perda(data_inicio: Optional[str] = None, data_fim: Optional[str] = None) -> List[Dict]:
    try:
        col_leads = db_client.get_collection('leads')
        col_fases = db_client.get_collection('fases')
        if col_leads is None or col_fases is None: return []
        
        fases_docs = list(col_fases.find({}, {"_id": 1, "nome_fase": 1}))
        fase_map = {str(f["_id"]): f.get("nome_fase", "").lower() for f in fases_docs}

        date_match = _build_date_match(data_inicio, data_fim)
        # Traz a fase atual e o motivo de perda
        leads = list(col_leads.find(date_match if date_match else {}, {"id_fase_atual": 1, "motivo_perda": 1}))
        
        distribuicao = {}
        for lead in leads:
            fase_id = str(lead.get("id_fase_atual", ""))
            nome_fase = fase_map.get(fase_id, "")
            
            # Só contabiliza se o lead estiver realmente na fase "Perdido"
            if "perdido" in nome_fase or "descartado" in nome_fase:
                motivo = str(lead.get("motivo_perda") or "Não informado").strip()
                if not motivo: motivo = "Não informado"
                distribuicao[motivo] = distribuicao.get(motivo, 0) + 1
            
        resultado = [{"motivo": nome, "quantidade": qtd} for nome, qtd in distribuicao.items()]
        resultado.sort(key=lambda x: x["quantidade"], reverse=True)
        return resultado
    except Exception as e:
        print(f"❌ Erro ao obter motivos de perda: {e}")
        return []

def get_faturamento_e_ticket(data_inicio: Optional[str] = None, data_fim: Optional[str] = None) -> Dict:
    # Esta função mata dois coelhos com uma cajadada só!
    try:
        col_leads = db_client.get_collection('leads')
        col_fases = db_client.get_collection('fases')
        if col_leads is None or col_fases is None: return {"faturamento": 0.0, "ticket_medio": 0.0}
        
        fases_docs = list(col_fases.find({}, {"_id": 1, "nome_fase": 1}))
        fase_map = {str(f["_id"]): f.get("nome_fase", "").lower() for f in fases_docs}

        date_match = _build_date_match(data_inicio, data_fim)
        leads = list(col_leads.find(date_match if date_match else {}, {"id_fase_atual": 1, "valor_estimado": 1}))
        
        faturamento_total = 0.0
        vendas_ganhas = 0

        for lead in leads:
            fase_id = str(lead.get("id_fase_atual", ""))
            nome_fase = fase_map.get(fase_id, "")
            
            # Só soma o dinheiro de quem está na fase "Ganho" / "Concluído"
            if "ganho" in nome_fase or "concluído" in nome_fase:
                try:
                    valor = float(lead.get("valor_estimado") or 0.0)
                except:
                    valor = 0.0
                
                faturamento_total += valor
                vendas_ganhas += 1
                
        ticket_medio = (faturamento_total / vendas_ganhas) if vendas_ganhas > 0 else 0.0
        
        return {
            "faturamento": faturamento_total,
            "ticket_medio": ticket_medio
        }
    except Exception as e:
        print(f"❌ Erro ao calcular faturamento: {e}")
        return {"faturamento": 0.0, "ticket_medio": 0.0}

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