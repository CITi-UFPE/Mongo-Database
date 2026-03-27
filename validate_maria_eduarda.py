#!/usr/bin/env python3
"""
Script para validar se Maria Eduarda existe no banco de dados com campos corretos.
Use em desenvolvimento para verificar antes de fazer deploy.
"""

from pymongo import MongoClient
import os

# Conectar ao MongoDB Atlas (substitua com sua string de conexão real)
MONGO_URI = os.getenv("MONGODB_URI", "")  # Você precisa configurar essa variável

if not MONGO_URI:
    print("❌ ERRO: MONGODB_URI não está configurado")
    print("   Configure a variável de ambiente com sua string de conexão MongoDB Atlas")
    exit(1)

try:
    client = MongoClient(MONGO_URI)
    db = client.get_database()  # Usa o banco definido na URI (database-comercial)
    print(f"✅ Conectado ao MongoDB: {db.name}\n")
    
    # Procura a collection membros (tenta variantes)
    collections = db.list_collection_names()
    print(f"📋 Collections disponíveis: {collections}\n")
    
    membros_col = None
    for col_name in ["membros", "mebros", "membro"]:
        if col_name in collections:
            membros_col = db[col_name]
            print(f"✅ Usando collection: {col_name}\n")
            break
    
    if not membros_col:
        print("❌ ERRO: Nenhuma collection 'membros' encontrada")
        exit(1)
    
    # Procura por Maria Eduarda (tenta variantes de email)
    email_variants = [
        "mariaeduarda.soares@citi.org.br",
        "meduardasoaresmch@gmail.com",
        "maria.eduarda@gmail.com",
        "maria.eduarda@citi.org",
    ]
    
    print("🔍 Procurando por Maria Eduarda...\n")
    
    member = None
    for email in email_variants:
        member = membros_col.find_one({"email": {"$regex": f"^{email}", "$options": "i"}})
        if member:
            print(f"✅ Encontrado com email: {email}\n")
            break
    
    if not member:
        # Tenta buscar por nome
        member = membros_col.find_one({"nome": {"$regex": "Maria Eduarda", "$options": "i"}})
        if member:
            print(f"✅ Encontrado por nome: {member.get('nome')}\n")
    
    if not member:
        # Lista todos os membros para debug
        print("❌ Maria Eduarda não encontrada!")
        print("\n📋 Listando TODOS os membros no banco:\n")
        all_members = list(membros_col.find({}, {"nome": 1, "email": 1, "role": 1, "department": 1, "_id": 1}))
        for i, m in enumerate(all_members, 1):
            print(f"   {i}. {m.get('nome')} | {m.get('email')}")
            print(f"      Role: {m.get('role')}, Department: {m.get('department')}")
        exit(1)
    
    # Valida campos obrigatórios
    print("📋 Campos no documento:")
    print(f"   _id: {member.get('_id')}")
    print(f"   nome: {member.get('nome')}")
    print(f"   email: {member.get('email')}")
    print(f"   username: {member.get('username')}")
    print(f"   role: {member.get('role')}")
    print(f"   department: {member.get('department')}")
    print(f"   picture: {member.get('picture')}\n")
    
    # Valida enums
    VALID_ROLES = [
        "Especialista em Dados",
        "Gerente de Comercial",
        "Gerente de Contas",
        "Diretor de Comercial (CRO)",
        "Líder de Dados",
        "Gerente de Dados",
        "Analista de Dados",
        "Pessoa Desenvolvedora",
        "Analista de Marketing",
    ]
    
    VALID_DEPTS = ["Dados", "Comercial", "Negócios", "Desenvolvimento", "Marketing"]
    
    role = member.get('role')
    department = member.get('department')
    
    role_valid = role in VALID_ROLES
    dept_valid = department in VALID_DEPTS
    
    print("✅ Validação:")
    print(f"   Email: {'✅' if member.get('email') else '❌'}")
    print(f"   Nome: {'✅' if member.get('nome') else '❌'}")
    print(f"   Role: {'✅' if role_valid else '❌'} (valor: '{role}')")
    print(f"   Department: {'✅' if dept_valid else '❌'} (valor: '{department}')\n")
    
    if not (member.get('email') and member.get('nome') and role_valid and dept_valid):
        print("❌ PROBLEMA DETECTADO!")
        if not member.get('email'):
            print("   - Email vazio ou faltando")
        if not member.get('nome'):
            print("   - Nome vazio ou faltando")
        if not role_valid:
            print(f"   - Role '{role}' não é válido. Use um de: {', '.join(VALID_ROLES)}")
        if not dept_valid:
            print(f"   - Department '{department}' não é válido. Use um de: {', '.join(VALID_DEPTS)}")
        exit(1)
    
    print("✅ Todos os dados estão corretos!")
    
except Exception as e:
    print(f"❌ ERRO ao conectar/consultar: {e}")
    exit(1)
finally:
    client.close()
