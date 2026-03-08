import os
import requests
import json
import re
import pandas as pd
from datetime import datetime

# --- CONFIGURAÇÃO ---
PIPEFY_TOKEN = os.getenv("PIPEFY_TOKEN")
PIPEFY_PIPE_ID = os.getenv("PIPEFY_PIPE_ID")
PIPEFY_URL = "https://api.pipefy.com/graphql"

class PipefyTempService:
    def __init__(self):
        self.headers = {
            "Authorization": f"Bearer {PIPEFY_TOKEN}",
            "Content-Type": "application/json"
        }

    # =========================================================================
    # 1. EXTRAÇÃO (Baseado no extract.py da Sprint 1)
    # =========================================================================
    def _get_query(self):
        return """
        query ($pipeId: ID!, $first: Int!, $after: String) {
          cards(pipe_id: $pipeId, first: $first, after: $after) {
            pageInfo { hasNextPage endCursor }
            edges {
              node {
                id
                title
                created_at
                current_phase { name }
                assignees { name }
                fields { name value }
              }
            }
          }
        }
        """

    def _fetch_raw_cards(self):
        """Baixa todos os cards paginados do Pipefy"""
        if not PIPEFY_TOKEN or not PIPEFY_PIPE_ID:
            # Retorna lista vazia se não tiver config, para não quebrar o server
            print("⚠️ Aviso: PIPEFY_TOKEN ou PIPEFY_PIPE_ID não configurados.")
            return []

        cards = []
        after = None
        first = 50

        while True:
            variables = {"pipeId": PIPEFY_PIPE_ID, "first": first, "after": after}
            payload = {"query": self._get_query(), "variables": variables}
            
            try:
                response = requests.post(PIPEFY_URL, json=payload, headers=self.headers, timeout=20)
                if response.status_code != 200:
                    print(f"Erro Pipefy: {response.text}")
                    break
                
                data = response.json()
                if "errors" in data:
                    print(f"Erro GraphQL: {data['errors']}")
                    break

                page_data = data["data"]["cards"]
                for edge in page_data["edges"]:
                    cards.append(edge["node"])

                if not page_data["pageInfo"]["hasNextPage"]:
                    break
                after = page_data["pageInfo"]["endCursor"]
            except Exception as e:
                print(f"Erro de conexão Pipefy: {e}")
                break
            
        return cards

    # =========================================================================
    # 2. LIMPEZA (Baseado no clean.py da Sprint 1)
    # =========================================================================
    def _limpar_string(self, valor):
        if isinstance(valor, str) and valor.startswith('["'):
            return valor.replace('["', '').replace('"]', '').replace('"', '').replace('\\', '')
        return valor

    def _smart_currency(self, val):
        """Lógica robusta para limpar moeda (R$ ou U$)"""
        if not val: return 0.0
        val_str = str(val)
        if any(x in val_str.lower() for x in ['sem', 'estimativa', 'null', 'none']): return 0.0
        
        clean = re.sub(r'[^\d.,-]', '', val_str)
        if not clean: return 0.0

        # Lógica BR (1.000,00) vs US (1,000.00)
        if '.' in clean and ',' in clean:
            if clean.find(',') < clean.find('.'): clean = clean.replace(',', '')
            else: clean = clean.replace('.', '').replace(',', '.')
        elif ',' in clean:
            parts = clean.split(',')
            if len(parts) > 1 and len(parts[-1]) == 3: clean = clean.replace(',', '')
            else: clean = clean.replace(',', '.')
        elif '.' in clean:
            parts = clean.split('.')
            if len(parts) > 1 and len(parts[-1]) == 3: clean = clean.replace('.', '')

        try:
            return max(0.0, float(clean))
        except:
            return 0.0

    def _get_field(self, fields, name_match):
        for f in fields:
            if name_match.lower() in f.get('name', '').lower():
                return self._limpar_string(f.get('value'))
        return None

    def process_data(self, raw_cards):
        cleaned_list = []
        for node in raw_cards:
            fields = node.get('fields', [])
            
            # Tenta pegar valor de vários campos possíveis
            valor_raw = self._get_field(fields, "Valor") or self._get_field(fields, "Budget")
            
            item = {
                "id": node.get('id'),
                "cliente": node.get('title'),
                "fase": node.get('current_phase', {}).get('name'),
                "responsavel": ", ".join([p['name'] for p in node.get('assignees', [])]) or "Não informado",
                "data_criacao": node.get('created_at')[:10] if node.get('created_at') else None,
                
                # Campos de Negócio
                "valor": self._smart_currency(valor_raw),
                "servicos": self._get_field(fields, "Serviço") or self._get_field(fields, "Interesse"),
                "origem": self._get_field(fields, "Fonte") or self._get_field(fields, "Origem"),
                "motivo_perda": self._get_field(fields, "Motivo da perda")
            }
            cleaned_list.append(item)
        return cleaned_list
    # =========================================================================
    # 3. INTELIGÊNCIA (O que a IA vai ler)
    # =========================================================================
    async def get_context_for_ai(self):
        """
        Método público chamado pelo Chatbot.
        Retorna um JSON resumido, não os dados brutos.
        """
        try:
            # 1. Busca
            raw = self._fetch_raw_cards()
            if not raw:
                return json.dumps({"status": "sem_dados", "mensagem": "Não consegui ler o Pipefy ou não há cards."})
            
            # 2. Limpa
            data = self.process_data(raw)
            df = pd.DataFrame(data)

            if df.empty:
                 return json.dumps({"status": "vazio", "mensagem": "Pipefy conectado, mas sem leads."})

            # 3. Analisa (Pandas)
            total_leads = len(df)
            valor_total = df['valor'].sum()
            ticket_medio = df['valor'].mean() if total_leads > 0 else 0
            
            # Agrupamentos
            por_fase = df['fase'].value_counts().to_dict()
            
            # Top Origens (Top 5)
            # Trata valores nulos antes de contar
            df['origem'] = df['origem'].fillna("Não informado")
            por_origem = df['origem'].value_counts().head(5).to_dict()
            
            # Top 5 Oportunidades ($$$)
            top_leads = df.nlargest(5, 'valor')[['cliente', 'valor', 'fase']].to_dict(orient='records')

            # 4. Monta o JSON Resumido para a IA
            resumo = {
                "resumo_executivo": {
                    "total_leads": total_leads,
                    "valor_total_pipeline": f"R$ {valor_total:,.2f}",
                    "ticket_medio": f"R$ {ticket_medio:,.2f}",
                    "data_atualizacao": datetime.now().strftime("%d/%m/%Y %H:%M")
                },
                "funil_vendas": por_fase,
                "origens_principais": por_origem,
                "top_5_maiores_oportunidades": top_leads
            }

            return json.dumps(resumo, ensure_ascii=False, indent=2)

        except Exception as e:
            # Em caso de erro crítico, devolve o erro para a IA avisar o usuário
            return json.dumps({"erro_sistema": str(e)})

# Instância Singleton (para ser importada)
pipefy_temp_service = PipefyTempService()