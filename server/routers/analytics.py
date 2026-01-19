"""Analytics routes for KPIs, CRM and prediction."""

from datetime import datetime, timedelta
from typing import Optional

from bson import ObjectId
from fastapi import APIRouter, HTTPException, Query

from services.db import db_client
from services.prediction import performPrediction


router = APIRouter(prefix="/api/analytics", tags=["analytics"])


def serialize_doc(doc):
    """Convert MongoDB document to JSON-serializable format."""
    if isinstance(doc, dict):
        return {k: serialize_doc(v) for k, v in doc.items()}
    if isinstance(doc, list):
        return [serialize_doc(item) for item in doc]
    if isinstance(doc, ObjectId):
        return str(doc)
    return doc


@router.get("/kpis")
async def get_kpis():
    """Compute CRM KPIs (mirror of old Node /api/analytics/kpis)."""
    try:
        db = db_client.get_db()
        leads = db["leads"]

        total_leads = leads.count_documents({})
        open_leads = leads.count_documents({"status": "Aberto"})
        won_leads = leads.count_documents({"status": "Ganho"})
        lost_leads = leads.count_documents({"status": "Perdido"})

        # Pipeline and won value sums
        pipeline_value_agg = list(
            leads.aggregate([
                {"$match": {"status": "Aberto"}},
                {"$group": {"_id": None, "total": {"$sum": "$valor_estimado"}}},
            ])
        )
        won_value_agg = list(
            leads.aggregate([
                {"$match": {"status": "Ganho"}},
                {"$group": {"_id": None, "total": {"$sum": "$valor_estimado"}}},
            ])
        )

        conversion_rate = (won_leads / total_leads * 100) if total_leads else 0
        loss_rate = (lost_leads / total_leads * 100) if total_leads else 0

        # Funnel distribution
        funnel_distribution = list(
            leads.aggregate([
                {
                    "$lookup": {
                        "from": "fase_funils",
                        "localField": "id_fase_atual",
                        "foreignField": "_id",
                        "as": "fase",
                    }
                },
                {"$unwind": "$fase"},
                {
                    "$group": {
                        "_id": {"fase": "$fase.nome_fase", "ordem": "$fase.ordem"},
                        "count": {"$sum": 1},
                        "valor": {"$sum": "$valor_estimado"},
                    }
                },
                {"$sort": {"_id.ordem": 1}},
            ])
        )

        # Lead sources
        lead_sources = list(
            leads.aggregate([
                {
                    "$lookup": {
                        "from": "origem_leads",
                        "localField": "id_origem_lead",
                        "foreignField": "_id",
                        "as": "origem",
                    }
                },
                {"$unwind": "$origem"},
                {
                    "$group": {
                        "_id": "$origem.canal",
                        "count": {"$sum": 1},
                        "valor": {"$sum": "$valor_estimado"},
                    }
                },
                {"$sort": {"count": -1}},
            ])
        )

        # Loss reasons
        loss_reasons = list(
            leads.aggregate([
                {"$match": {"status": "Perdido", "id_motivo_perda": {"$ne": None}}},
                {
                    "$lookup": {
                        "from": "motivo_perdas",
                        "localField": "id_motivo_perda",
                        "foreignField": "_id",
                        "as": "motivo",
                    }
                },
                {"$unwind": "$motivo"},
                {
                    "$group": {"_id": "$motivo.descricao", "count": {"$sum": 1}}},
                {"$sort": {"count": -1}},
            ])
        )

        # Seller performance
        seller_performance = list(
            leads.aggregate([
                {
                    "$lookup": {
                        "from": "membros",
                        "localField": "id_membro",
                        "foreignField": "_id",
                        "as": "membro",
                    }
                },
                {"$unwind": "$membro"},
                {
                    "$group": {
                        "_id": "$membro._id",
                        "nome": {"$first": "$membro.nome"},
                        "total_leads": {"$sum": 1},
                        "leads_ganhos": {"$sum": {"$cond": [{"$eq": ["$status", "Ganho"]}, 1, 0]}},
                        "leads_perdidos": {"$sum": {"$cond": [{"$eq": ["$status", "Perdido"]}, 1, 0]}},
                        "valor_total": {"$sum": "$valor_estimado"},
                        "valor_ganho": {"$sum": {"$cond": [{"$eq": ["$status", "Ganho"]}, "$valor_estimado", 0]}},
                    }
                },
                {"$sort": {"valor_ganho": -1}},
            ])
        )

        # Temporal evolution (last 12 months)
        twelve_months_ago = datetime.utcnow() - timedelta(days=365)
        temporal_evolution = list(
            leads.aggregate([
                {"$match": {"createdAt": {"$gte": twelve_months_ago}}},
                {
                    "$group": {
                        "_id": {"year": {"$year": "$createdAt"}, "month": {"$month": "$createdAt"}},
                        "total_leads": {"$sum": 1},
                        "leads_ganhos": {"$sum": {"$cond": [{"$eq": ["$status", "Ganho"]}, 1, 0]}},
                        "leads_perdidos": {"$sum": {"$cond": [{"$eq": ["$status", "Perdido"]}, 1, 0]}},
                        "valor_total": {"$sum": "$valor_estimado"},
                    }
                },
                {"$sort": {"_id.year": 1, "_id.month": 1}},
            ])
        )

        return {
            "kpis": {
                "total_leads": total_leads,
                "open_leads": open_leads,
                "won_leads": won_leads,
                "lost_leads": lost_leads,
                "conversion_rate": conversion_rate,
                "loss_rate": loss_rate,
                "pipeline_value": pipeline_value_agg[0]["total"] if pipeline_value_agg else 0,
                "won_value": won_value_agg[0]["total"] if won_value_agg else 0,
            },
            "funnel_distribution": [
                {
                    "fase": f["_id"]["fase"],
                    "ordem": f["_id"]["ordem"],
                    "count": f["count"],
                    "valor": f["valor"],
                }
                for f in funnel_distribution
            ],
            "lead_sources": [
                {"canal": s["_id"], "count": s["count"], "valor": s["valor"]}
                for s in lead_sources
            ],
            "loss_reasons": [{"motivo": r["_id"], "count": r["count"]} for r in loss_reasons],
            "seller_performance": [
                {
                    "id": str(s["_id"]),
                    "nome": s["nome"],
                    "total_leads": s["total_leads"],
                    "leads_ganhos": s["leads_ganhos"],
                    "leads_perdidos": s["leads_perdidos"],
                    "valor_total": s["valor_total"],
                    "valor_ganho": s["valor_ganho"],
                    "taxa_conversao": (s["leads_ganhos"] / s["total_leads"] * 100) if s["total_leads"] else 0,
                }
                for s in seller_performance
            ],
            "temporal_evolution": [
                {
                    "year": t["_id"]["year"],
                    "month": t["_id"]["month"],
                    "date": f"{t['_id']['year']}-{str(t['_id']['month']).zfill(2)}",
                    "total_leads": t["total_leads"],
                    "leads_ganhos": t["leads_ganhos"],
                    "leads_perdidos": t["leads_perdidos"],
                    "valor_total": t["valor_total"],
                }
                for t in temporal_evolution
            ],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/prediction")
async def get_prediction(year: Optional[int] = Query(None)):
    """Proxy to ML prediction service."""
    try:
        result = await performPrediction(year)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/clustering")
async def get_clustering(k: Optional[int] = Query(4)):
    """K-means clustering analysis on leads."""
    try:
        from sklearn.cluster import KMeans
        import numpy as np
        
        db = db_client.get_db()
        leads = list(db["leads"].find({}))
        
        if len(leads) < k:
            return {
                "clusters": [],
                "message": f"Not enough leads ({len(leads)}) for {k} clusters"
            }
        
        # Extract features for clustering
        features = []
        lead_ids = []
        
        for lead in leads:
            try:
                valor = float(lead.get('valor', 0)) or 100
                dias = (datetime.utcnow() - lead.get('data_criacao', datetime.utcnow())).days if lead.get('data_criacao') else 0
                status_val = 1 if lead.get('status') == 'Ganho' else (0.5 if lead.get('status') == 'Aberto' else 0)
                
                features.append([valor, dias, status_val])
                lead_ids.append(str(lead.get('_id')))
            except:
                continue
        
        if len(features) < k:
            return {
                "clusters": [],
                "message": f"Not enough valid leads ({len(features)}) for {k} clusters"
            }
        
        # Normalize features
        X = np.array(features)
        X = (X - X.mean(axis=0)) / (X.std(axis=0) + 1e-8)
        
        # K-means clustering
        kmeans = KMeans(n_clusters=k, random_state=42, n_init=10)
        clusters = kmeans.fit_predict(X)
        
        # Format results
        result_clusters = {}
        for idx, cluster_id in enumerate(clusters):
            if cluster_id not in result_clusters:
                result_clusters[cluster_id] = []
            result_clusters[cluster_id].append({
                "id": lead_ids[idx],
                "valor": features[idx][0],
                "dias": int(features[idx][1]),
                "status": "Ganho" if features[idx][2] == 1 else "Aberto" if features[idx][2] == 0.5 else "Perdido"
            })
        
        return {
            "k": k,
            "clusters": result_clusters,
            "totalLeads": len(leads)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/crm")
async def get_crm_data():
    """Simple CRM dump (leads + companies) limited to 1000 docs each."""
    try:
        db = db_client.get_db()
        leads = list(db["leads"].find({}).limit(1000))
        companies = list(db["empresas"].find({}).limit(1000))
        return {
            "leads": [serialize_doc(l) for l in leads],
            "companies": [serialize_doc(c) for c in companies],
            "summary": {"totalLeads": len(leads), "totalCompanies": len(companies)},
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/")
async def analytics_health():
    return {"message": "Analytics service is running"}