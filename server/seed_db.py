import os
from datetime import datetime, timedelta
import random
from pymongo import MongoClient

# Tenta pegar a URL do ambiente, se não conseguir, usa a padrão do Docker
# ATENÇÃO: Se seu docker usa senha diferente, ajuste aqui.
mongo_uri = os.getenv('MONGODB_URL', 'mongodb://admin:pass@mdp-mongo:27017/')

print(f"🔌 Tentando conectar em: {mongo_uri}")

try:
    client = MongoClient(mongo_uri, serverSelectionTimeoutMS=5000)
    client.server_info() # Força teste de conexão
    db = client['database-comercial']
    print("✅ Conexão bem sucedida!")
except Exception as e:
    print(f"❌ Erro de conexão: {e}")
    print("DICA: Verifique se o container mdp-mongo está rodando.")
    exit(1)

def seed_database():
    print("🌱 Iniciando a semeadura do banco...")
    
    # 1. Limpar banco antigo (para não duplicar se rodar 2x)
    db.leads.drop()
    db.membros.drop()
    db.fase_funils.drop()
    db.origem_leads.drop()
    db.empresas.drop()
    print("🧹 Banco limpo.")

    # 2. Criar Vendedores (Membros)
    vendedores = [
        {"nome": "Ana Silva", "email": "ana@citi.org.br", "role": "closer"},
        {"nome": "Roberto Carlos", "email": "roberto@citi.org.br", "role": "sdr"},
        {"nome": "Julia Roberts", "email": "julia@citi.org.br", "role": "manager"}
    ]
    res_vend = db.membros.insert_many(vendedores)
    ids_vendedores = list(res_vend.inserted_ids) # Lista de ObjectIds
    print("✅ Vendedores criados")

    # 3. Criar Fases do Funil
    fases = [
        {"nome_fase": "Novo", "ordem": 1},
        {"nome_fase": "Qualificação", "ordem": 2},
        {"nome_fase": "Proposta", "ordem": 3},
        {"nome_fase": "Negociação", "ordem": 4},
        {"nome_fase": "Fechado", "ordem": 5}
    ]
    db.fase_funils.insert_many(fases)
    lista_fases = list(db.fase_funils.find())
    print("✅ Fases criadas")

    # 4. Criar Origens
    origens = [
        {"canal": "Google"}, {"canal": "Instagram"}, {"canal": "Indicação"}, {"canal": "Linkedin"}
    ]
    db.origem_leads.insert_many(origens)
    lista_origens = list(db.origem_leads.find())
    print("✅ Origens criadas")

    # 5. Criar 50 Leads Falsos
    leads = []
    status_opts = ["Aberto", "Aberto", "Aberto", "Ganho", "Perdido"]
    
    for i in range(50):
        # Escolhe aleatórios
        vendedor_id = random.choice(ids_vendedores)
        fase = random.choice(lista_fases)
        origem = random.choice(lista_origens)
        status = random.choice(status_opts)
        
        # Lógica de valor
        valor = random.randint(1000, 50000)
        if status == "Perdido": 
            valor = 0 # Opcional, ou mantém o valor estimado
        
        # Data aleatória no último ano
        data_criacao = datetime.utcnow() - timedelta(days=random.randint(0, 365))

        leads.append({
            "nome": f"Lead Empresa {i}",
            "email": f"contato{i}@empresa.com",
            "valor_estimado": valor,
            "status": status,
            "id_membro": vendedor_id,
            "id_fase_atual": fase["_id"],
            "id_origem_lead": origem["_id"],
            "createdAt": data_criacao,
            "id_motivo_perda": None # Simplificação
        })

    db.leads.insert_many(leads)
    print(f"✅ {len(leads)} Leads inseridos com sucesso!")

    # 6. Criar Empresas (para a aba CRM)
    empresas = []
    for i in range(20):
        empresas.append({
            "nome_empresa": f"Corporação Tech {i}",
            "cnpj": f"00.000.000/000{i}-00",
            "setor": random.choice(["Tecnologia", "Varejo", "Saúde", "Finanças"]),
            "responsavel_id": random.choice(ids_vendedores)
        })
    db.empresas.insert_many(empresas)
    print("✅ Empresas criadas")
    print("🚀 TUDO PRONTO! Pode atualizar o site.")

if __name__ == "__main__":
    seed_database()