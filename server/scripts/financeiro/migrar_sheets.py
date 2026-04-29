"""
CITi UFPE — Projeto Mineração de Dados
Script: server/scripts/financeiro/migrar_sheets.py

Pipeline de ingestão do Extrato Bancário Cora direto do Google Sheets → MongoDB.
"""

import argparse
import os
import sys
import unicodedata
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

import gspread

# Adiciona a pasta 'server' ao sys.path para conseguirmos importar o database.py
DIR_SERVER = Path(__file__).resolve().parents[2]
sys.path.append(str(DIR_SERVER))

from dotenv import load_dotenv
from database import get_db_financeiro, close_connection

load_dotenv(DIR_SERVER / ".env")

# ── Configurações ─────────────────────────────────────────────────────────────
COL_DATA       = "DATA"
COL_TIPO       = "TIPO"
COL_TRANSACAO  = "TRANSAÇÃO"
COL_NOME       = "IDENTIFICAÇÃO / NOME"
COL_VALOR      = "VALOR (R$)"
COL_CATEGORIA  = "CATEGORIA"
COL_MES_REF    = "MÊS REF."

TIPO_MAP = {"crédito": "entrada", "credito": "entrada", "débito": "saida", "debito": "saida"}
CATEGORIA_MAP = {
    "receita": "Receita", "despesa": "Despesa", "conta simples": "Conta Simples",
    "fatura cartão": "Fatura Cartão", "fatura cartao": "Fatura Cartão",
    "redbull": "RedBull", "kottler": "Kottler", "impostos": "Impostos",
    "fejepe": "FEJEPE", "softex": "Softex", "rde": "RDE",
}

# ── Funções de saneamento ─────────────────────────────────────────────────────

def sem_acentos(texto: str) -> str:
    n = unicodedata.normalize("NFD", texto)
    return "".join(c for c in n if unicodedata.category(c) != "Mn")

def sanitizar_valor(raw) -> float | None:
    if not raw or str(raw).strip() == "":
        return None
    limpo = str(raw).strip().replace("R$", "").replace(" ", "").replace(".", "").replace(",", ".")
    try:
        return float(limpo)
    except ValueError:
        return None

def sanitizar_data(raw: str) -> datetime | None:
    if not raw or str(raw).strip() == "":
        return None
    for fmt in ("%d/%m/%Y", "%Y-%m-%d"):
        try:
            dt = datetime.strptime(str(raw).strip(), fmt)
            return dt.replace(tzinfo=timezone.utc)
        except ValueError:
            continue
    return None

def normalizar_tipo(raw: str) -> str | None:
    if not raw: return None
    return TIPO_MAP.get(sem_acentos(str(raw).strip().lower()))

def normalizar_categoria(raw: str) -> str:
    if not raw: return "Outros"
    chave = sem_acentos(str(raw).strip().lower())
    return CATEGORIA_MAP.get(chave, str(raw).strip())

def processar_linha(row: dict, num: int) -> dict:
    erros = []
    data = sanitizar_data(row.get(COL_DATA, ""))
    if not data: erros.append("data inválida")
    
    tipo = normalizar_tipo(row.get(COL_TIPO, ""))
    if not tipo: erros.append("tipo inválido")
    
    valor_raw = sanitizar_valor(row.get(COL_VALOR, ""))
    if valor_raw is None: erros.append("valor inválido")

    if erros:
        return {"ok": False, "erros": erros, "linha": num}

    return {
        "ok": True,
        "doc": {
            "projeto":    "CITi",
            "subarea":    "Financeiro",
            "tipo":       tipo,
            "valor":      abs(valor_raw),
            "categoria":  normalizar_categoria(row.get(COL_CATEGORIA, "")),
            "data":       data,
            "transacao":  str(row.get(COL_TRANSACAO, "")).strip(),
            "nome":       str(row.get(COL_NOME, "")).strip(),
            "mes_ref":    str(row.get(COL_MES_REF, "")).strip(),
        },
    }

def gerar_historico(docs: list[dict]) -> list[dict]:
    agregado = defaultdict(float)
    for d in docs:
        chave = (d["data"].year, d["data"].month, d["tipo"])
        agregado[chave] += d["valor"]
    return [
        {
            "data": datetime(ano, mes, 1, tzinfo=timezone.utc),
            "valor": round(total, 2),
            "tipo": tipo,
            "projeto": "CITi",
        }
        for (ano, mes, tipo), total in sorted(agregado.items())
    ]

# ── Pipeline principal ────────────────────────────────────────────────────────

def migrar(aba_nome: str, dry_run: bool, limpar: bool) -> None:
    planilha_id = os.getenv("SPREADSHEET_ID_FINANCEIRO")
    caminho_credenciais = DIR_SERVER / "credenciais_gcp.json"

    if not planilha_id:
        print("\n❌ SPREADSHEET_ID_FINANCEIRO não encontrada no .env\n")
        sys.exit(1)
    if not caminho_credenciais.exists():
        print(f"\n❌ Arquivo {caminho_credenciais} não encontrado!\n")
        sys.exit(1)

    print("\n☁️  Conectando ao Google Sheets...")
    gc = gspread.service_account(filename=str(caminho_credenciais))
    planilha = gc.open_by_key(planilha_id)
    aba = planilha.worksheet(aba_nome)
    
    print(f"📥 Puxando dados da aba '{aba_nome}'...")
    # O gspread já lê a primeira linha como cabeçalho e monta dicionários!
    # ── Extração Robusta (Ignora linhas decorativas e colunas vazias extras) ──
    linhas_brutas = aba.get_all_values()
    
    idx_cabecalho = 0
    # Procura qual linha tem as colunas reais da nossa tabela
    for i, linha in enumerate(linhas_brutas):
        if "DATA" in linha and "TIPO" in linha:
            idx_cabecalho = i
            break
            
    cabecalhos = linhas_brutas[idx_cabecalho]
    dados_planilha = linhas_brutas[idx_cabecalho + 1:]
    
    # Transforma a matriz numa lista de dicionários igual o csv.DictReader fazia
    registros = [dict(zip(cabecalhos, linha)) for linha in dados_planilha]
    # ──────────────────────────────────────────────────────────────────────────

    db = None
    if not dry_run:
        print("🔌 Conectando ao MongoDB...")
        db = get_db_financeiro()
        if limpar:
            print("🗑️  Limpando transações anteriores do CITi...")
            db["transacoes"].delete_many({"subarea": "Financeiro", "projeto": "CITi"})
            db["historico_financeiro"].delete_many({"projeto": "CITi"})

    stats = {"lidas": 0, "validas": 0, "rejeitadas": 0, "erros": []}
    buffer = []

    for num, row in enumerate(registros, start=2): # start=2 pois linha 1 é cabeçalho
        if not any(row.values()): continue # pula linhas vazias
        
        stats["lidas"] += 1
        resultado = processar_linha(row, num)
        
        if not resultado["ok"]:
            stats["rejeitadas"] += 1
            stats["erros"].append(resultado)
            print(f"  ⚠️  Linha {num}: {' | '.join(resultado['erros'])}")
            continue
            
        stats["validas"] += 1
        buffer.append(resultado["doc"])

    if not dry_run and buffer:
        db["transacoes"].insert_many(buffer, ordered=False)
        print(f"\n  ✅ {len(buffer)} transação(ões) inserida(s)")
        
        historico = gerar_historico(buffer)
        if historico:
            db["historico_financeiro"].insert_many(historico, ordered=False)
            print(f"  ✅ {len(historico)} registro(s) em historico_financeiro")

    elif dry_run and buffer:
        print(f"\n  📋 {len(buffer)} documentos seriam inseridos. Exemplo:")
        print(f"     {buffer[0]}")

    print("\n" + "─" * 40)
    print(f"📊 RELATÓRIO: {stats['validas']} inseridas | {stats['rejeitadas']} rejeitadas")
    print("─" * 40 + "\n")

    close_connection()

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--aba", default="Extrato Cora", help="Nome da aba na planilha")
    parser.add_argument("--dry-run", action="store_true", help="Simula sem gravar")
    parser.add_argument("--limpar", action="store_true", help="Remove dados antes de inserir")
    args = parser.parse_args()

    migrar(args.aba, dry_run=args.dry_run, limpar=args.limpar)