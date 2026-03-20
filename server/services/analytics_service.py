import os
import sys
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


#  Funções Auxiliares

# Serviços de KPI (Métricas e Analytics)


def get_leads_qualificados(limite_valor: float = 10000.0, data_inicio: Optional[str] = None, data_fim: Optional[str] = None) -> Dict:
    try:
        col_leads = db_client.get_collection('leads')
        # CORREÇÃO: Usando o nome correto da coleção das fotos!
        col_fases = db_client.get_collection('fase_funils')
        if col_leads is None or col_fases is None: return {"qualificados": 0, "total": 0}
        
        fases_docs = list(col_fases.find({}, {"_id": 1, "nome_fase": 1}))
        fase_map = {str(f["_id"]): f.get("nome_fase", "").lower() for f in fases_docs}

        date_match = _build_date_match(data_inicio, data_fim)
        leads = list(col_leads.find(date_match if date_match else {}, {"id_fase_atual": 1, "valor_estimado": 1}))
        
        fases_inativas = ["ganho", "perdido", "descartado", "concluído"]
        qualificados, total_ativos = 0, 0

        for lead in leads:
            fase_id = str(lead.get("id_fase_atual", ""))
            nome_fase = fase_map.get(fase_id, "sem fase")

            if any(inativa in nome_fase for inativa in fases_inativas):
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
        leads = list(col_leads.find(date_match if date_match else {}, {"id_fase_atual": 1, "valor_estimado": 1}))

        total_bruto = 0.0
        fases_alvo = ["Montagem de proposta", "Negociação", "Apresentação de proposta"]

        for lead in leads:
            fase_id = str(lead.get("id_fase_atual", ""))
            nome_fase = fase_map.get(fase_id, "")
            if nome_fase in fases_alvo:
                try: total_bruto += float(lead.get("valor_estimado") or 0.0)
                except: pass

        return total_bruto * fator_conversao
    except Exception: return 0.0

def get_distribuicao_fases(data_inicio: Optional[str] = None, data_fim: Optional[str] = None) -> List[Dict]:
    try:
        col_leads = db_client.get_collection('leads')
        col_fases = db_client.get_collection('fase_funils') # CORRIGIDO
        if col_leads is None or col_fases is None: return []
        
        fases_docs = list(col_fases.find({}, {"_id": 1, "nome_fase": 1}))
        fase_map = {str(f["_id"]): f.get("nome_fase", "Sem fase") for f in fases_docs}

        date_match = _build_date_match(data_inicio, data_fim)
        leads = list(col_leads.find(date_match if date_match else {}, {"id_fase_atual": 1, "valor_estimado": 1}))

        distribuicao = {}
        fases_inativas = ["ganho", "perdido", "descartado", "concluído"]

        for lead in leads:
            fase_id = str(lead.get("id_fase_atual", ""))
            nome_fase = fase_map.get(fase_id, "Sem fase")
            
            if any(inativa in nome_fase.lower() for inativa in fases_inativas):
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
            # Blindagem: Tenta pegar a string direta. Se for um ID de outra tabela, vai agrupar por ID por enquanto.
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
        
        distribuicao = {}
        for lead in leads:
            servico = str(lead.get("servico") or "Não informado").strip()
            if not servico: servico = "Não informado"
            distribuicao[servico] = distribuicao.get(servico, 0) + 1
            
        resultado = [{"servico": nome, "quantidade": qtd} for nome, qtd in distribuicao.items()]
        resultado.sort(key=lambda x: x["quantidade"], reverse=True)
        return resultado
    except Exception: return []

def get_motivos_perda(data_inicio: Optional[str] = None, data_fim: Optional[str] = None) -> List[Dict]:
    try:
        col_leads = db_client.get_collection('leads')
        col_fases = db_client.get_collection('fase_funils') # CORRIGIDO
        col_motivos = db_client.get_collection('motivos_perda') # NOVO: Mapeia os motivos!
        
        if col_leads is None or col_fases is None: return []
        
        # Mapeando fases
        fases_docs = list(col_fases.find({}, {"_id": 1, "nome_fase": 1}))
        fase_map = {str(f["_id"]): f.get("nome_fase", "").lower() for f in fases_docs}

        # Mapeando motivos de perda (lendo da coleção correta que vimos na sua foto)
        motivo_map = {}
        if col_motivos is not None:
            motivos_docs = list(col_motivos.find({}))
            # Ele tenta pegar o campo "nome" ou "motivo". Se o seu campo chamar diferente, ajustamos aqui.
            motivo_map = {str(m["_id"]): m.get("nome", m.get("motivo", "Desconhecido")) for m in motivos_docs}

        date_match = _build_date_match(data_inicio, data_fim)
        leads = list(col_leads.find(date_match if date_match else {}, {"id_fase_atual": 1, "motivo_perda": 1}))
        
        distribuicao = {}
        for lead in leads:
            fase_id = str(lead.get("id_fase_atual", ""))
            nome_fase = fase_map.get(fase_id, "")
            
            # Só contabiliza se o lead estiver "Perdido"
            if "perdido" in nome_fase or "descartado" in nome_fase:
                motivo_id_ou_texto = str(lead.get("motivo_perda") or "Não informado").strip()
                
                # Se for um ID, traduz. Se não for, usa o texto puro mesmo.
                motivo_final = motivo_map.get(motivo_id_ou_texto, motivo_id_ou_texto)
                
                if not motivo_final: motivo_final = "Não informado"
                distribuicao[motivo_final] = distribuicao.get(motivo_final, 0) + 1
            
        resultado = [{"motivo": nome, "quantidade": qtd} for nome, qtd in distribuicao.items()]
        resultado.sort(key=lambda x: x["quantidade"], reverse=True)
        return resultado
    except Exception: return []

def get_faturamento_e_ticket(data_inicio: Optional[str] = None, data_fim: Optional[str] = None) -> Dict:
    try:
        col_leads = db_client.get_collection('leads')
        col_fases = db_client.get_collection('fase_funils') # CORRIGIDO
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
            
            # Só soma o dinheiro de quem está na fase "Ganho"
            if "ganho" in nome_fase or "concluído" in nome_fase:
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

from datetime import datetime

def _build_date_match(data_inicio: str = None, data_fim: str = None):
    """
    Cria o filtro de datas para o MongoDB.
    """
    match_query = {}
    
    # IMPORTANTE: Como os leads são criados em um ano e atualizados em outro,
    # vamos usar o 'updatedAt' para pegar a movimentação real de 2026.
    # Se quiser mudar para a data de criação, mude para "createdAt"
    campo_data = "updatedAt" 

    # Se não vier data nenhuma do Front-end, não filtra nada (ou poderíamos forçar 2026 aqui)
    if not data_inicio and not data_fim:
        return match_query

    match_query[campo_data] = {}

    if data_inicio:
        try:
            # Pega o formato "2026-01-01" e transforma em formato de data do MongoDB
            dt_inicio = datetime.strptime(data_inicio[:10], "%Y-%m-%d")
            match_query[campo_data]["$gte"] = dt_inicio
        except ValueError:
            print(f"⚠️ Erro ao converter data_inicio: {data_inicio}")
            pass
            
    if data_fim:
        try:
            dt_fim = datetime.strptime(data_fim[:10], "%Y-%m-%d")
            # Ajusta para o último segundo do dia, para não perder os leads daquela tarde!
            dt_fim = dt_fim.replace(hour=23, minute=59, second=59)
            match_query[campo_data]["$lte"] = dt_fim
        except ValueError:
            print(f"⚠️ Erro ao converter data_fim: {data_fim}")
            pass
            
    # Limpeza caso a conversão tenha falhado
    if not match_query[campo_data]:
        del match_query[campo_data]
        
    return match_query

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