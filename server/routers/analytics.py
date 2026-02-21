"""Analytics routes - Versão Limpa e Conectada ao Service."""
from fastapi import APIRouter, HTTPException, Query, Depends
from typing import Optional
from services.db import db_client
# AQUI: Importamos o serviço novo que criamos
from services.analytics_service import analytics_service

# Tenta importar ML, se falhar, ignora
try:
    from services.prediction import performPrediction
except ImportError:
    performPrediction = None

router = APIRouter(tags=["analytics"])

# --- ROTA PRINCIPAL: KPIS DO DASHBOARD ---
@router.get("/kpis")
async def get_kpis():
    """Busca os dados do Dashboard usando o AnalyticsService."""
    try:
        db = db_client.get_db()
        # Chama a lógica que criamos no outro arquivo
        return await analytics_service.get_kpis(db)
    except Exception as e:
        print(f"Erro KPI: {e}")
        # Se der erro grave, retorna um erro HTTP, mas o Service já tem Mock
        raise HTTPException(status_code=500, detail=str(e))

# --- ROTA: DADOS DO FUNIL ---
@router.get("/funnel")
async def get_funnel():
    """Busca dados específicos do funil."""
    try:
        db = db_client.get_db()
        return await analytics_service.get_funnel_data(db)
    except Exception as e:
        return []

# --- ROTAS LEGADO (Mantidas para não quebrar o site) ---

@router.get("/prediction")
async def get_prediction(year: Optional[int] = Query(None)):
    if performPrediction:
        try:
            return await performPrediction(year)
        except:
            return {"message": "Erro na predição"}
    return {"message": "Serviço de ML não disponível"}

@router.get("/clustering")
async def get_clustering(k: Optional[int] = Query(4)):
    return {
        "clusters": [],
        "message": "Clustering requer dados reais no banco."
    }

@router.get("/crm")
async def get_crm_data():
    """Retorna lista vazia para a tela de CRM não travar."""
    try:
        return {
            "leads": [],
            "companies": [],
            "summary": {"totalLeads": 0, "totalCompanies": 0},
        }
    except:
        return {"leads": [], "companies": [], "summary": {}}

@router.get("/")
async def analytics_health():
    return {"status": "ok"}