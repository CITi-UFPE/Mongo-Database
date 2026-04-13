from fastapi import APIRouter, Security, HTTPException
from services.security import verificar_role
from services.db import MongoDB
from datetime import datetime
import calendar

router = APIRouter(prefix="/financeiro", tags=["Financeiro"])
admin_e_financeiro = Security(verificar_role(["admin", "financeiro"]))

def get_db_collection():
    db_instance = MongoDB.get_instance()
    db = db_instance.get_db()
    if db is None:
        raise HTTPException(status_code=500, detail="Base de dados não disponível")
    return db["transacoes"]

# --- RESUMO GERAL ---
@router.get("/resumo", dependencies=[admin_e_financeiro])
def get_resumo():
    col = get_db_collection()
    pipeline = [{ "$group": { "_id": None, 
        "entradas": { "$sum": { "$cond": [{"$eq": ["$tipo", "entrada"]}, "$valor", 0] } },
        "saidas": { "$sum": { "$cond": [{"$eq": ["$tipo", "saida"]}, "$valor", 0] } } 
    }}]
    res = list(col.aggregate(pipeline))
    if not res: return {"saldo": 0, "entradas": 0, "saidas": 0}
    return {"saldo": res[0]["entradas"] - res[0]["saidas"], "entradas": res[0]["entradas"], "saidas": res[0]["saidas"]}

# --- FLUXO MENSAL ---
@router.get("/fluxo-caixa", dependencies=[admin_e_financeiro])
def get_fluxo():
    col = get_db_collection()
    pipeline = [{ "$group": { "_id": { "$month": "$data" },
        "entradas": { "$sum": { "$cond": [{"$eq": ["$tipo", "entrada"]}, "$valor", 0] } },
        "saidas": { "$sum": { "$cond": [{"$eq": ["$tipo", "saida"]}, "$valor", 0] } }
    }}, { "$sort": { "_id": 1 } }]
    return [{"mes": i["_id"], "saldo": i["entradas"] - i["saidas"]} for i in col.aggregate(pipeline)]

# --- LUCRO POR PROJETO ---
@router.get("/lucro-projetos", dependencies=[admin_e_financeiro])
def get_lucro_projetos():
    col = get_db_collection()
    pipeline = [
        { "$group": {
            "_id": "$projeto", # Agrupa pelo nome do projeto
            "receita": { "$sum": { "$cond": [{"$eq": ["$tipo", "entrada"]}, "$valor", 0] } },
            "custo": { "$sum": { "$cond": [{"$eq": ["$tipo", "saida"]}, "$valor", 0] } }
        }},
        { "$project": { "projeto": "$_id", "lucro": { "$subtract": ["$receita", "$custo"] }, "_id": 0 } },
        { "$sort": { "lucro": -1 } } # Do mais lucrativo para o menos
    ]
    return list(col.aggregate(pipeline))

# --- GASTOS POR CATEGORIA ---
@router.get("/gastos-categoria", dependencies=[admin_e_financeiro])
def get_gastos_categoria():
    col = get_db_collection()
    pipeline = [
        { "$match": { "tipo": "saida" } }, # Filtra apenas o que for gasto
        { "$group": { "_id": "$categoria", "total": { "$sum": "$valor" } } },
        { "$sort": { "total": -1 } }
    ]
    return [{"categoria": i["_id"], "valor": i["total"]} for i in col.aggregate(pipeline)]


@router.get("/run-rate", dependencies=[admin_e_financeiro])
def get_run_rate():
    col = get_db_collection()
    hoje = datetime.now()
    primeiro_dia_mes = datetime(hoje.year, hoje.month, 1)
    
    # Busca total de entradas do mês atual
    pipeline = [
        { "$match": { "tipo": "entrada", "data": { "$gte": primeiro_dia_mes } } },
        { "$group": { "_id": None, "total_mes": { "$sum": "$valor" } } }
    ]
    res = list(col.aggregate(pipeline))
    faturamento_atual = res[0]["total_mes"] if res else 0
    
    # Cálculo de Run Rate: (Faturamento / Dias Passados) * Total de dias no mês
    dias_passados = hoje.day
    dias_no_mes = calendar.monthrange(hoje.year, hoje.month)[1]
    
    previsao_final_mes = (faturamento_atual / dias_passados) * dias_no_mes
    
    return {
        "faturamento_atual": faturamento_atual,
        "previsao_run_rate": round(previsao_final_mes, 2),
        "dias_restantes": dias_no_mes - dias_passados
    }