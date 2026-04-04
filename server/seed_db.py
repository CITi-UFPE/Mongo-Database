import os
from pymongo import MongoClient

# Tenta pegar a URL do ambiente, se não conseguir, usa a padrão do Docker
mongo_uri = os.getenv('MONGODB_URL', 'mongodb://admin:pass@mdp-mongo:27017/')

print(f"🔌 Tentando conectar em: {mongo_uri}")

try:
    client = MongoClient(mongo_uri, serverSelectionTimeoutMS=5000)
    client.server_info()
    db = client['database-comercial']
    print("✅ Conexão bem sucedida!")
except Exception as e:
    print(f"❌ Erro de conexão: {e}")
    exit(1)

def seed_database():
    print("🌱 Iniciando seed - Membros CITi para Autenticação...")
    
    # 1. Criar/Atualizar Membros CITi (dados reais para autenticação)
    vendedores = [
        {"nome": "Mariaeudarda Soares", "email": "mariaeudarda.soares@citi.org.br", "role": "Especialista em Dados", "department": "Dados"},
        {"nome": "Mariaeudarda Soares", "email": "mariaeduarda.soares@citi.org.br", "role": "Especialista em Dados", "department": "Dados"},
        {"nome": "Francisco Neto", "email": "francisco.neto@citi.org.br", "role": "Gerente de Comercial", "department": "Comercial"},
        {"nome": "Tiago Mattos", "email": "tiago.mattos@citi.org.br", "role": "Gerente de Contas", "department": "Comercial"},
        {"nome": "Marcela Paranhos", "email": "marcela.paranhos@citi.org.br", "role": "Gerente de Contas", "department": "Comercial"},
        {"nome": "Rafael Nóbrega", "email": "rafael.nobrega@citi.org.br", "role": "Gerente de Contas", "department": "Comercial"},
        {"nome": "João Guilherme Cavalcanti", "email": "joaoguilherme.cavalcanti@citi.org.br", "role": "Diretor de Comercial (CRO)", "department": "Negócios"},
        {"nome": "Júlia Gonçalves Bezerra", "email": "julia.goncalvesbezerra@citi.org.br", "role": "Líder de Dados", "department": "Dados"},
        {"nome": "Ana Raquel", "email": "ana.raquel@citi.org.br", "role": "Gerente de Dados", "department": "Dados"},
        {"nome": "Danilo Barrote", "email": "danilo.barrote@citi.org.br", "role": "Gerente de Dados", "department": "Dados"},
        {"nome": "Rafael Xavier", "email": "rafael.xavier@citi.org.br", "role": "Gerente de Dados", "department": "Dados"},
        {"nome": "Felipe C. Coutinho", "email": "felipeccoutinho@citi.org.br", "role": "Analista de Dados", "department": "Dados"},
        {"nome": "Theo Barza", "email": "theo.barza@citi.org.br", "role": "Analista de Dados", "department": "Dados"},
        {"nome": "Gustavo Leão", "email": "gustavo.leao@citi.org.br", "role": "Analista de Dados", "department": "Dados"},
        {"nome": "Lourdes Castro", "email": "lourdes.castro@citi.org.br", "role": "Analista de Dados", "department": "Dados"},
        {"nome": "Sofia Sakovitz", "email": "sofia.sakovitz@citi.org.br", "role": "Pessoa Desenvolvedora", "department": "Desenvolvimento"}
    ]
    
    # Upsert membros (evita duplicatas)
    for membro in vendedores:
        db.membros.update_one(
            {"email": membro["email"]},
            {"$set": membro},
            upsert=True
        )
    print("✅ Membros CITi criados/atualizados")
    print("🚀 SEED COMPLETADO!")

if __name__ == "__main__":
    seed_database()