"""
CITi UFPE — Projeto Mineração de Dados
Script: server/scripts/financeiro/migrar_csv.py

Importa dados de planilhas CSV para as collections do banco financeiro.
Aplica todas as normalizações obrigatórias (tasks 1.2 e 1.3):
  - tipo: "Entrada"/"Saída" → "entrada"/"saida"
  - valor: string → float, rejeita inválidos
  - data: string → datetime ISO, rejeita inválidas
  - categoria: "Infra" → "Infraestrutura", etc.
  - trim() em todos os campos string

Uso:
  python server/scripts/financeiro/migrar_csv.py --arquivo dados.csv
  python server/scripts/financeiro/migrar_csv.py --arquivo dados.csv --historico
  python server/scripts/financeiro/migrar_csv.py --arquivo dados.csv --dry-run

Formato esperado do CSV:
  projeto,subarea,tipo,valor,categoria,data
  Projeto Alpha,Marketing,Entrada,5000,Eventos,2025-01-10
"""

import argparse
import csv
import os
import sys
import unicodedata
from datetime import datetime, timezone
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parents[2]))

from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv(Path(__file__).resolve().parents[2] / ".env")

URI = os.getenv("MONGO_URI_FINANCEIRO")
if not URI:
    print("\n❌ MONGO_URI_FINANCEIRO não encontrada em server/.env\n")
    sys.exit(1)


# ── Tabelas de normalização (task 1.3) ────────────────────────────────────────

_TIPO_MAP = {
    "entrada":  "entrada",
    "receita":  "entrada",
    "ingresso": "entrada",
    "saida":    "saida",
    "saída":    "saida",
    "despesa":  "saida",
    "gasto":    "saida",
    "saídas":   "saida",
    "entradas": "entrada",
}

_CATEGORIA_MAP = {
    "infra":             "Infraestrutura",
    "infraestrutura":    "Infraestrutura",
    "infra-estrutura":   "Infraestrutura",
    "evento":            "Eventos",
    "eventos":           "Eventos",
    "consultoria":       "Consultoria",
    "marketing":         "Marketing",
    "rh":                "Recursos Humanos",
    "recursos humanos":  "Recursos Humanos",
    "financeiro":        "Financeiro",
    "administrativo":    "Administrativo",
    "ti":                "TI",
    "tecnologia":        "TI",
}


# ── Funções de normalização ───────────────────────────────────────────────────

def sem_acentos(texto: str) -> str:
    normalizado = unicodedata.normalize("NFD", texto)
    return "".join(c for c in normalizado if unicodedata.category(c) != "Mn")


def normalizar_tipo(raw: str | None) -> str | None:
    if not raw:
        return None
    chave = sem_acentos(raw.strip().lower())
    return _TIPO_MAP.get(chave)


def normalizar_categoria(raw: str | None) -> str:
    if not raw:
        return "Outros"
    chave = sem_acentos(raw.strip().lower())
    return _CATEGORIA_MAP.get(chave, raw.strip())


def normalizar_valor(raw: str | None) -> float | None:
    """Rejeita ausentes ou inválidos (task 1.3)."""
    if not raw or str(raw).strip() == "":
        return None
    limpo = (
        str(raw)
        .replace("R$", "")
        .replace(" ", "")
        .replace(".", "")   # ponto de milhar: 1.200 → 1200
        .replace(",", ".")  # vírgula decimal → ponto
    )
    try:
        return float(limpo)
    except ValueError:
        return None


def normalizar_data(raw: str | None) -> datetime | None:
    """Rejeita datas ausentes ou inválidas (task 1.3)."""
    if not raw or str(raw).strip() == "":
        return None
    formatos = [
        "%Y-%m-%d",
        "%d/%m/%Y",
        "%Y-%m-%dT%H:%M:%S",
        "%Y-%m-%dT%H:%M:%S.%fZ",
    ]
    for fmt in formatos:
        try:
            dt = datetime.strptime(raw.strip(), fmt)
            return dt.replace(tzinfo=timezone.utc)
        except ValueError:
            continue
    return None


# ── Validação e processamento de uma linha ────────────────────────────────────

def processar_linha(row: dict, num_linha: int) -> dict:
    """
    Retorna {"ok": True, "doc": {...}} ou {"ok": False, "erros": [...]}
    Garante que nenhum campo seja None/undefined antes de inserir (task 1.2).
    """
    erros = []

    projeto = row.get("projeto", "").strip()
    if not projeto:
        erros.append("'projeto' ausente")

    tipo = normalizar_tipo(row.get("tipo"))
    if not tipo:
        erros.append(f"'tipo' inválido: \"{row.get('tipo')}\"")

    valor = normalizar_valor(row.get("valor"))
    if valor is None:
        erros.append(f"'valor' inválido ou ausente: \"{row.get('valor')}\"")
    elif valor < 0:
        erros.append(f"'valor' negativo: {valor}")

    data = normalizar_data(row.get("data"))
    if not data:
        erros.append(f"'data' inválida ou ausente: \"{row.get('data')}\"")

    if erros:
        return {"ok": False, "erros": erros, "linha": num_linha}

    return {
        "ok": True,
        "doc": {
            "projeto":   projeto,
            "subarea":   row.get("subarea", "").strip() or "Não informado",
            "tipo":      tipo,
            "valor":     valor,
            "categoria": normalizar_categoria(row.get("categoria")),
            "data":      data,
        },
    }


# ── Migração principal ────────────────────────────────────────────────────────

def migrar(arquivo_csv: str, dry_run: bool = False, popular_historico: bool = False) -> None:
    caminho = Path(arquivo_csv)
    if not caminho.exists():
        print(f"\n❌ Arquivo não encontrado: {caminho.resolve()}")
        print("   Formato esperado: projeto,subarea,tipo,valor,categoria,data\n")
        sys.exit(1)

    if not dry_run:
        print("\n🔌 Conectando ao banco financeiro...")
        client = MongoClient(URI)
        db = client["citi_financeiro"]
        print("✅ Conectado!\n")
    else:
        print("\n🧪 MODO DRY-RUN — nenhum dado será gravado\n")
        client = None
        db = None

    stats = {"lidas": 0, "validas": 0, "rejeitadas": 0, "erros": []}
    buffer = []

    print(f"📂 Lendo: {caminho.resolve()}")
    print("─" * 55)

    with open(caminho, newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for num_linha, row in enumerate(reader, start=1):
            stats["lidas"] += 1
            resultado = processar_linha(row, num_linha)

            if not resultado["ok"]:
                stats["rejeitadas"] += 1
                stats["erros"].append(resultado)
                print(f"  ⚠️  Linha {num_linha}: {' | '.join(resultado['erros'])}")
                continue

            stats["validas"] += 1
            buffer.append(resultado["doc"])

    # ── Inserção ─────────────────────────────────────────────────────────────
    if not dry_run and buffer:
        db["transacoes"].insert_many(buffer, ordered=False)
        print(f"\n  ✅ {len(buffer)} transação(ões) inserida(s)")

        if popular_historico:
            historico = [
                {"data": d["data"], "valor": d["valor"], "tipo": d["tipo"], "projeto": d["projeto"]}
                for d in buffer
            ]
            db["historico_financeiro"].insert_many(historico, ordered=False)
            print(f"  ✅ {len(historico)} registro(s) inserido(s) em historico_financeiro")

    elif dry_run and buffer:
        print("\n  📋 Documentos que seriam inseridos:")
        for i, doc in enumerate(buffer, start=1):
            print(f"     [{i}]", {k: str(v) if isinstance(v, datetime) else v for k, v in doc.items()})

    # ── Relatório ─────────────────────────────────────────────────────────────
    print("\n" + "─" * 55)
    print("📊 RELATÓRIO DE MIGRAÇÃO")
    print("─" * 55)
    print(f"  Linhas lidas:    {stats['lidas']}")
    print(f"  Válidas:         {stats['validas']}")
    print(f"  Rejeitadas:      {stats['rejeitadas']}")

    if stats["erros"]:
        print("\n  ❌ Erros por linha:")
        for e in stats["erros"]:
            print(f"     Linha {e['linha']}: {', '.join(e['erros'])}")

    msg = "\n🧪 Dry-run concluído. Nenhum dado foi gravado.\n" if dry_run else "\n🎉 Migração finalizada!\n"
    print(msg)

    if client:
        client.close()


# ── CLI ───────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Migração CSV → MongoDB Financeiro CITi")
    parser.add_argument("--arquivo",   default="dados.csv", help="Caminho do arquivo CSV")
    parser.add_argument("--dry-run",   action="store_true", help="Simula sem gravar")
    parser.add_argument("--historico", action="store_true", help="Também popula historico_financeiro")
    args = parser.parse_args()

    migrar(args.arquivo, dry_run=args.dry_run, popular_historico=args.historico)