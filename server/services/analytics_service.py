import logging
from typing import Dict, List

logger = logging.getLogger(__name__)

class AnalyticsService:
    async def get_kpis(self, db) -> Dict:
        try:
            # Tenta buscar na coleção 'leads'
            collection = db["leads"]
            total_leads = await collection.count_documents({})
            
            # Mock de dados se o banco estiver vazio
            if total_leads == 0:
                logger.info("Banco vazio ou inacessível. Usando dados Mock.")
                return {
                    "total_leads": 1250,
                    "leads_ativos": 450,
                    "faturamento_atual": 385000, 
                    "meta_mensal": 500000,
                    "pipeline_valor": 450000,
                    "ticket_medio": 563,
                    "taxa_conversao": 25.6
                }

            # Lógica para dados reais (exemplo básico)
            return {
                "total_leads": total_leads,
                "leads_ativos": total_leads // 3,
                "faturamento_atual": total_leads * 100, # Exemplo de cálculo
                "meta_mensal": 500000,
                "pipeline_valor": total_leads * 50,
                "ticket_medio": 500,
                "taxa_conversao": 15.0
            }

        except Exception as e:
            logger.error(f"Erro ao calcular KPIs: {e}")
            return {"error": str(e)}

    async def get_funnel_data(self, db) -> List[Dict]:
        """Dados estáticos para o gráfico de funil"""
        return [
            {"stage": "Visitantes", "value": 5000},
            {"stage": "Leads", "value": 1250},
            {"stage": "Qualificados", "value": 487},
            {"stage": "Proposta", "value": 200},
            {"stage": "Fechamento", "value": 119}
        ]

analytics_service = AnalyticsService()