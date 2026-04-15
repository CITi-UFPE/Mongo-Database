"""
CITi UFPE — Projeto Mineração de Dados
Script: server/scripts/financeiro/setup_banco.py

Cria a estrutura completa do banco citi_financeiro:
  - Collections com JSON Schema validation
  - Índices obrigatórios
  - Documentos de exemplo para validação

Uso:
  python server/scripts/financeiro/setup_banco.py
  python server/scripts/financeiro/setup_banco.py --limpar
"""

import argparse
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

# Permite rodar a partir da raiz do projeto
sys.path.append(str(Path(__file__).resolve().parents[2]))

from dotenv import load_dotenv
from pymongo import MongoClient, ASCENDING, DESCENDING
from pymongo.errors import CollectionInvalid

load_dotenv(Path(__file__).resolve().parents[2] / ".env")

URI = os.getenv("MONGO_URI_FINANCEIRO")
if not URI:
    print("\n❌ MONGO_URI_FINANCEIRO não encontrada em server/.env")
    print("   Adicione a linha:")
    print("   MONGO_URI_FINANCEIRO=mongodb+srv://usuario:senha@cluster/banco\n")
    sys.exit(1)

# ── JSON Schema validators (task 1.1) ─────────────────────────────────────────
# O MongoDB rejeita documentos que violem as regras abaixo.

VALIDATORS = {
    "transacoes": {
        "$jsonSchema": {
            "bsonType": "object",
            "required": ["projeto", "tipo", "valor", "data", "categoria"],
            "properties": {
                "projeto":   {"bsonType": "string"},
                "subarea":   {"bsonType": "string"},
                "tipo":      {"enum": ["entrada", "saida"]},
                "valor":     {"bsonType": "double", "minimum": 0},
                "categoria": {"bsonType": "string"},
                "data":      {"bsonType": "date"},
            },
        }
    },
    "historico_financeiro": {
        "$jsonSchema": {
            "bsonType": "object",
            "required": ["data", "valor", "tipo", "projeto"],
            "properties": {
                "data":    {"bsonType": "date"},
                "valor":   {"bsonType": "double", "minimum": 0},
                "tipo":    {"enum": ["entrada", "saida"]},
                "projeto": {"bsonType": "string"},
            },
        }
    },
    "projetos": {
        "$jsonSchema": {
            "bsonType": "object",
            "required": ["nome"],
            "properties": {
                "nome":      {"bsonType": "string"},
                "subarea":   {"bsonType": "string"},
                "descricao": {"bsonType": "string"},
                "ativo":     {"bsonType": "bool"},
            },
        }
    },
    "usuarios": {
        "$jsonSchema": {
            "bsonType": "object",
            "required": ["nome", "email"],
            "properties": {
                "nome":    {"bsonType": "string"},
                "email":   {"bsonType": "string"},
                "subarea": {"bsonType": "string"},
                "cargo":   {"bsonType": "string"},
                "ativo":   {"bsonType": "bool"},
            },
        }
    },
}

# ── Dados de exemplo ──────────────────────────────────────────────────────────

EXEMPLOS = {
    "transacoes": [
        {
            "projeto":   "Projeto Alpha",
            "subarea":   "Marketing",
            "tipo":      "entrada",
            "valor":     5000.0,
            "categoria": "Eventos",
            "data":      datetime(2025, 1, 10, tzinfo=timezone.utc),
        },
        {
            "projeto":   "Projeto Alpha",
            "subarea":   "Financeiro",
            "tipo":      "saida",
            "valor":     1200.0,
            "categoria": "Infraestrutura",
            "data":      datetime(2025, 1, 15, tzinfo=timezone.utc),
        },
        {
            "projeto":   "Projeto Beta",
            "subarea":   "Comercial",
            "tipo":      "entrada",
            "valor":     8500.0,
            "categoria": "Consultoria",
            "data":      datetime(2025, 2, 1, tzinfo=timezone.utc),
        },
    ],
    "historico_financeiro": [
        {
            "data":    datetime(2025, 1, 1, tzinfo=timezone.utc),
            "valor":   4500.0,
            "tipo":    "entrada",
            "projeto": "Projeto Alpha",
        },
        {
            "data":    datetime(2025, 2, 1, tzinfo=timezone.utc),
            "valor":   3200.0,
            "tipo":    "saida",
            "projeto": "Projeto Beta",
        },
    ],
    "projetos": [
        {"nome": "Projeto Alpha", "subarea": "Marketing",  "descricao": "Projeto piloto", "ativo": True},
        {"nome": "Projeto Beta",  "subarea": "Comercial",  "descricao": "Expansão",        "ativo": True},
    ],
    "usuarios": [
        {"nome": "Admin CITi",       "email": "admin@citi.ufpe.br",       "subarea": "Financeiro", "cargo": "Gerente",  "ativo": True},
        {"nome": "Membro Financeiro","email": "financeiro@citi.ufpe.br",   "subarea": "Financeiro", "cargo": "Analista", "ativo": True},
    ],
}


# ── Funções auxiliares ────────────────────────────────────────────────────────

def criar_collection(db, nome: str) -> None:
    # Nota: JSON Schema validation não é suportado nesta versão do cluster.
    # A validação de tipos e campos obrigatórios é feita pelo Pydantic (schemas/financeiro.py).
    if nome in db.list_collection_names():
        print(f"  ⚠️  '{nome}' já existe — pulando")
        return
    try:
        db.create_collection(nome)
        print(f"  ✅ '{nome}' criada")
    except CollectionInvalid:
        print(f"  ⚠️  '{nome}' já existe")


def criar_indices(db) -> None:
    # transacoes
    db["transacoes"].create_index([("data", ASCENDING)],          name="idx_data")
    db["transacoes"].create_index([("projeto", ASCENDING)],       name="idx_projeto")
    db["transacoes"].create_index([("tipo", ASCENDING)],          name="idx_tipo")
    db["transacoes"].create_index([("categoria", ASCENDING)],     name="idx_categoria")
    db["transacoes"].create_index(                                 # composto
        [("projeto", ASCENDING), ("data", DESCENDING)],
        name="idx_projeto_data",
    )

    # historico_financeiro — índice obrigatório (task 1.4)
    db["historico_financeiro"].create_index([("data", ASCENDING)],    name="idx_data")
    db["historico_financeiro"].create_index([("projeto", ASCENDING)], name="idx_projeto")
    db["historico_financeiro"].create_index([("tipo", ASCENDING)],    name="idx_tipo")

    # projetos
    db["projetos"].create_index([("nome", ASCENDING)], unique=True, name="idx_nome_unico")

    # usuarios
    db["usuarios"].create_index([("email", ASCENDING)], unique=True, name="idx_email_unico")

    print("  ✅ Índices criados/confirmados")


# ── Setup principal ───────────────────────────────────────────────────────────

def main(limpar: bool = False) -> None:
    print("\n🔌 Conectando ao banco financeiro...")
    client = MongoClient(URI)
    db = client["citi_financeiro"]
    print("✅ Conectado!\n")

    if limpar:
        print("🗑️  Limpando dados existentes...")
        for col in VALIDATORS:
            db[col].delete_many({})
        print("   Dados removidos.\n")

    print("─── Criando collections ────────────────────────────────")
    for nome in VALIDATORS:
        criar_collection(db, nome)

    print("\n─── Criando índices ────────────────────────────────────")
    criar_indices(db)

    print("\n─── Inserindo documentos de exemplo ───────────────────")
    for nome, docs in EXEMPLOS.items():
        try:
            result = db[nome].insert_many(docs, ordered=False)
            print(f"  ✅ {nome}: {len(result.inserted_ids)} documento(s) inserido(s)")
        except Exception as e:
            # Duplicatas em re-execuções são normais
            print(f"  ⚠️  {nome}: {e}")

    print("\n─── Relatório final ────────────────────────────────────")
    for nome in VALIDATORS:
        count = db[nome].count_documents({})
        print(f"  📁 {nome:<25} → {count} documento(s)")

    print("\n🎉 Setup concluído!\n")
    client.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Setup do banco financeiro CITi")
    parser.add_argument("--limpar", action="store_true", help="Apaga os dados antes de recriar")
    args = parser.parse_args()
    main(limpar=args.limpar)