import os
import sys
from datetime import datetime
from typing import List, Dict, Optional
from dotenv import load_dotenv


#Configuração de Caminhos e Variáveis

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

# ==========================================
# 2. Patch de Conexão com o Banco
# ==========================================
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

try:
    from services.db import db_client
except ImportError:
    print("❌ Erro: Não foi possível importar o db_client.")
    sys.exit(1)

print("✅ Analytics Service Definitivo iniciado.")

# ==========================================
# 3. Helpers e Regras de Negócio
# ==========================================
FASES_INATIVAS = ["ganho", "perdido", "descartado", "concluído", "finalizado/ganho", "desqualificados"]
FASES_NEGOCIACAO = ["montagem de proposta", "negociação", "apresentação de proposta"]

def _build_date_match(data_inicio: Optional[str] = None, data_fim: Optional[str] = None) -> Dict:
    """Filtro de datas ninja (Ideia do Pipo ajustada para updatedAt)"""
    if not data_inicio and not data_fim:
        return {}

    condicoes = []
    
    # Busca por datas em string (caso venha do pipefy assim)
    range_query_str = {}
    if data_inicio: range_query_str["$gte"] = data_inicio
    if data_fim: range_query_str["$lte"] = data_fim
    if range_query_str: condicoes.append({"data_qualificacao": range_query_str})

    # Busca por data real do banco (updatedAt é melhor para ver as movimentações recentes)
    range_query_dt = {}
    try:
        if data_inicio: range_query_dt["$gte"] = datetime.fromisoformat(f"{data_inicio[:10]}T00:00:00")
        if data_fim: range_query_dt["$lte"] = datetime.fromisoformat(f"{data_fim[:10]}T23:59:59")
        if range_query_dt:
            condicoes.append({"updatedAt": range_query_dt})
            condicoes.append({"createdAt": range_query_dt})
    except ValueError:
        pass

    return {"$or": condicoes} if condicoes else {}

def _get_fase_map() -> Dict[str, str]:
    """Busca as fases na tabela correta e cria um dicionário tradutor (Ideia da Ana)"""
    try:
        col_fases = db_client.get_collection('fase_funils')
        if not col_fases: return {}
        fases_docs = list(col_fases.find({}, {"_id": 1, "nome_fase": 1}))
        return {str(f["_id"]): f.get("nome_fase", "Sem Fase") for f in fases_docs}
    except Exception: return {}

# ==========================================
# 4. Funções de Analytics
# ==========================================

def get_leads_qualificados(limite_valor: float = 0.0, data_inicio: Optional[str] = None, data_fim: Optional[str] = None) -> Dict:
    try:
        col_leads = db_client.get_collection('leads')
        if col_leads is None: return {"qualificados": 0, "total": 0}

        fase_map = _get_fase_map()
        date_match = _build_date_match(data_inicio, data_fim)
        
        leads = list(col_leads.find(date_match, {"id_fase_atual": 1, "valor_estimado": 1, "valor": 1}))
        
        qualificados = 0
        total_ativos = 0

        for lead in leads:
            fase_id = str(lead.get("id_fase_atual", lead.get("fase", "")))
            nome_fase = fase_map.get(fase_id, fase_id).lower()

            if any(inativa in nome_fase for inativa in FASES_INATIVAS):
                continue

            total_ativos += 1
            valor = float(lead.get("valor_estimado") or lead.get("valor") or 0.0)
            if valor > limite_valor:
                qualificados += 1

        return {"qualificados": qualificados, "total": total_ativos}
    except Exception as e:
        print(f"❌ Erro ao contar leads: {e}")
        return {"qualificados": 0, "total": 0}

def get_previsao_faturamento(data_inicio: Optional[str] = None, data_fim: Optional[str] = None) -> Dict[str, float]:
    try:
        col_leads = db_client.get_collection('leads')
        if col_leads is None: raise Exception("Sem coleção")

        fase_map = _get_fase_map()
        date_match = _build_date_match(data_inicio, data_fim)
        leads = list(col_leads.find(date_match, {"id_fase_atual": 1, "valor_estimado": 1, "valor": 1, "fase": 1}))

        total_bruto = 0.0

        for lead in leads:
            fase_id = str(lead.get("id_fase_atual", lead.get("fase", "")))
            nome_fase = fase_map.get(fase_id, fase_id).lower()

            if any(alvo in nome_fase for alvo in FASES_NEGOCIACAO):
                valor = float(lead.get("valor_estimado") or lead.get("valor") or 0.0)
                total_bruto += valor

        return {
            "base_pipeline_previsao": total_bruto,
            "pessimista_20": total_bruto * 0.20,
            "realista_25": total_bruto * 0.25,
            "otimista_35": total_bruto * 0.35
        }
    except Exception as e:
        return {"base_pipeline_previsao": 0.0, "pessimista_20": 0.0, "realista_25": 0.0, "otimista_35": 0.0}

def get_ticket_medio_e_conversao(data_inicio: Optional[str] = None, data_fim: Optional[str] = None) -> Dict:
    try:
        col_leads = db_client.get_collection('leads')
        if col_leads is None: return {"ticket_medio": 0.0, "taxa_conversao": 0.0}

        fase_map = _get_fase_map()
        date_match = _build_date_match(data_inicio, data_fim)
        leads = list(col_leads.find(date_match, {"id_fase_atual": 1, "valor_estimado": 1, "valor_final_negociacao": 1}))

        faturamento_ganho = 0.0
        ganhos = 0
        perdidos = 0

        for lead in leads:
            fase_id = str(lead.get("id_fase_atual", ""))
            nome_fase = fase_map.get(fase_id, fase_id).lower()

            if "ganho" in nome_fase or "concluído" in nome_fase:
                ganhos += 1
                valor = float(lead.get("valor_final_negociacao") or lead.get("valor_estimado") or 0.0)
                faturamento_ganho += valor
            elif "perdid" in nome_fase or "descartad" in nome_fase or "desqualificad" in nome_fase:
                perdidos += 1

        ticket_medio = (faturamento_ganho / ganhos) if ganhos > 0 else 0.0
        total_finalizados = ganhos + perdidos
        taxa_conversao = (ganhos / total_finalizados * 100) if total_finalizados > 0 else 0.0

        return {
            "ticket_medio": round(ticket_medio, 2),
            "taxa_conversao": round(taxa_conversao, 2)
        }
    except Exception: return {"ticket_medio": 0.0, "taxa_conversao": 0.0}

def get_distribuicao_fases(data_inicio: Optional[str] = None, data_fim: Optional[str] = None) -> List[Dict]:
    try:
        col_leads = db_client.get_collection('leads')
        if col_leads is None: return []

        fase_map = _get_fase_map()
        date_match = _build_date_match(data_inicio, data_fim)
        leads = list(col_leads.find(date_match, {"id_fase_atual": 1, "valor_estimado": 1, "valor": 1}))

        distribuicao = {}

        for lead in leads:
            fase_id = str(lead.get("id_fase_atual", ""))
            nome_fase = fase_map.get(fase_id, "Sem Fase").capitalize()
            
            valor = float(lead.get("valor_estimado") or lead.get("valor") or 0.0)

            if nome_fase not in distribuicao:
                distribuicao[nome_fase] = {"quantidade": 0, "total_valor": 0.0}
            
            distribuicao[nome_fase]["quantidade"] += 1
            distribuicao[nome_fase]["total_valor"] += valor

        resultado = [{"fase": nome, "quantidade": d["quantidade"], "total_valor": d["total_valor"]} for nome, d in distribuicao.items()]
        resultado.sort(key=lambda x: x["quantidade"], reverse=True)
        return resultado
    except Exception: return []

def get_motivos_perda(data_inicio: Optional[str] = None, data_fim: Optional[str] = None) -> List[Dict]:
    try:
        col_leads = db_client.get_collection('leads')
        col_motivos = db_client.get_collection('motivos_perda')
        if col_leads is None: return []

        fase_map = _get_fase_map()
        
        motivo_map = {}
        if col_motivos:
            motivos_docs = list(col_motivos.find({}))
            motivo_map = {str(m["_id"]): m.get("nome", m.get("motivo", "Desconhecido")) for m in motivos_docs}

        date_match = _build_date_match(data_inicio, data_fim)
        leads = list(col_leads.find(date_match, {"id_fase_atual": 1, "motivo_perda": 1}))
        
        distribuicao = {}
        for lead in leads:
            fase_id = str(lead.get("id_fase_atual", ""))
            nome_fase = fase_map.get(fase_id, "").lower()
            
            if "perdid" in nome_fase or "descartad" in nome_fase:
                motivo_id = str(lead.get("motivo_perda") or "Não informado").strip()
                motivo_final = motivo_map.get(motivo_id, motivo_id)
                if not motivo_final: motivo_final = "Não informado"
                
                distribuicao[motivo_final] = distribuicao.get(motivo_final, 0) + 1
            
        resultado = [{"motivo": nome, "quantidade": qtd} for nome, qtd in distribuicao.items()]
        resultado.sort(key=lambda x: x["quantidade"], reverse=True)
        return resultado
    except Exception: return []

def get_origem_dados(data_inicio: Optional[str] = None, data_fim: Optional[str] = None) -> List[Dict]:
    try:
        col = db_client.get_collection('leads')
        if col is None: return []
        date_match = _build_date_match(data_inicio, data_fim)
        leads = list(col.find(date_match, {"origem": 1}))
        
        distribuicao = {}
        for lead in leads:
            origem = str(lead.get("origem") or "Não informada").strip()
            distribuicao[origem] = distribuicao.get(origem, 0) + 1
            
        res = [{"origem": k, "quantidade": v} for k, v in distribuicao.items()]
        res.sort(key=lambda x: x["quantidade"], reverse=True)
        return res
    except Exception: return []

def get_distribuicao_servicos(data_inicio: Optional[str] = None, data_fim: Optional[str] = None) -> List[Dict]:
    try:
        col = db_client.get_collection('leads')
        if col is None: return []
        date_match = _build_date_match(data_inicio, data_fim)
        leads = list(col.find(date_match, {"servico": 1, "servicos_interesse": 1}))
        
        distribuicao = {}
        for lead in leads:
            servico = str(lead.get("servicos_interesse") or lead.get("servico") or "Não informado").strip()
            distribuicao[servico] = distribuicao.get(servico, 0) + 1
            
        res = [{"servico": k, "quantidade": v} for k, v in distribuicao.items()]
        res.sort(key=lambda x: x["quantidade"], reverse=True)
        return res
    except Exception: return []

if __name__ == "__main__":
    print("\n📊 --- TESTE DO ANALYTICS DEFINITIVO ---\n")
    data_in = "2026-01-01"
    
    info_leads = get_leads_qualificados(data_inicio=data_in)
    print(f"Total Ativos: {info_leads['total']} | Qualificados: {info_leads['qualificados']}")
    
    previsao = get_previsao_faturamento(data_inicio=data_in)
    print(f"Forecast Base: R$ {previsao['base_pipeline_previsao']:,.2f} | Realista: R$ {previsao['realista_25']:,.2f}")
    
    metricas = get_ticket_medio_e_conversao(data_inicio=data_in)
    print(f"Ticket Médio: R$ {metricas['ticket_medio']:,.2f} | Conversão: {metricas['taxa_conversao']}%")
    
    print("\n-------------------------------------")