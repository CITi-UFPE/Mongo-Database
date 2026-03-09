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
    # 1. EXTRAÇÃO
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
        if not PIPEFY_TOKEN or not PIPEFY_PIPE_ID:
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
                if response.status_code != 200: break
                
                data = response.json()
                if "errors" in data: break

                page_data = data["data"]["cards"]
                for edge in page_data["edges"]:
                    cards.append(edge["node"])

                if not page_data["pageInfo"]["hasNextPage"]: break
                after = page_data["pageInfo"]["endCursor"]
            except Exception as e:
                print(f"Erro de conexão Pipefy: {e}")
                break
            
        return cards

    # =========================================================================
    # 2. LIMPEZA E TRATAMENTO
    # =========================================================================
    def _limpar_string(self, valor):
        if not valor: return None
        if isinstance(valor, str) and valor.startswith('["'):
            valor = valor.replace('["', '').replace('"]', '').replace('"', '').replace('\\', '')
        # Remove tags HTML que poluem as notas de perda
        valor = re.sub(r'<[^>]*>', '', valor)
        return valor.strip()

    def _smart_currency(self, val):
        if not val: return 0.0
        val_str = str(val)
        if any(x in val_str.lower() for x in ['sem', 'estimativa', 'null', 'none']): return 0.0
        clean = re.sub(r'[^\d.,-]', '', val_str)
        if not clean: return 0.0
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
        try: return max(0.0, float(clean))
        except: return 0.0

    def _get_field(self, fields, name_match):
        for f in fields:
            if name_match.lower() in f.get('name', '').lower():
                return self._limpar_string(f.get('value'))
        return None
    # Coloque este método logo acima do process_data
    def _padronizar_fase(self, nome_fase):
        if not nome_fase: return "Desconhecida"
        nome_lower = nome_fase.lower()
        if "qualifica" in nome_lower: return "Qualificação"
        if "diagnóstico" in nome_lower or "diagnostico" in nome_lower: return "Diagnóstico Técnico"
        if "proposta" in nome_lower: return "Apresentação de Proposta"
        if "negocia" in nome_lower: return "Negociação"
        return nome_fase

    def process_data(self, raw_cards):
        cleaned_list = []
        hoje = datetime.now()

        for node in raw_cards:
            fields = node.get('fields', [])
            valor_raw = self._get_field(fields, "Valor") or self._get_field(fields, "Budget")
            
            # Calcula dias no funil para a regra de SLA
            data_criacao_str = node.get('created_at')
            dias_no_funil = 0
            if data_criacao_str:
                try:
                    dt_criacao = datetime.strptime(data_criacao_str[:10], "%Y-%m-%d")
                    dias_no_funil = (hoje - dt_criacao).days
                except:
                    pass

            # AQUI ESTÁ A MÁGICA: A fase passa pelo padronizador!
            fase_padronizada = self._padronizar_fase(node.get('current_phase', {}).get('name', ''))

            item = {
                "id": node.get('id'),
                "cliente": node.get('title'),
                "fase": fase_padronizada,
                "responsavel": ", ".join([p['name'] for p in node.get('assignees', [])]) or "Não informado",
                "dias_no_funil": dias_no_funil,
                "valor": self._smart_currency(valor_raw),
                "origem": self._get_field(fields, "Fonte") or self._get_field(fields, "Origem"),
                
                # Campos de Perda
                "motivo_perda": self._get_field(fields, "Motivo da perda"),
                "notas_perda": self._get_field(fields, "Notas da perda")
            }
            cleaned_list.append(item)
        return cleaned_list
    # =========================================================================
    # 3. INTELIGÊNCIA (O que a IA vai ler)
    # =========================================================================
    async def get_context_for_ai(self):
        try:
            raw = self._fetch_raw_cards()
            if not raw:
                return json.dumps({"status": "sem_dados", "mensagem": "Não consegui ler o Pipefy."})
            
            data = self.process_data(raw)
            df = pd.DataFrame(data)

            if df.empty:
                 return json.dumps({"status": "vazio", "mensagem": "Sem leads."})

            # --- SEGREGAÇÃO DE DADOS ---
            fases_ativas = ['Qualificação', 'Diagnóstico Técnico', 'Apresentação de Proposta', 'Negociação']
            df_ativos = df[df['fase'].isin(fases_ativas)].copy()
            df_perdidos = df[df['fase'].str.contains('Perdido|Desqualificado', case=False, na=False)].copy()

            # --- BLOCO 3: ALERTA DE SLA (Risco Real) ---
            # Identifica leads parados há >10 dias nas fases iniciais
            mask_risco = df_ativos['fase'].isin(['Qualificação', 'Diagnóstico Técnico']) & (df_ativos['dias_no_funil'] > 10)
            leads_em_risco = df_ativos[mask_risco][['cliente', 'fase', 'dias_no_funil', 'responsavel']].to_dict(orient='records')

            # --- BLOCO 6: ANÁLISE DE PERDAS ---
            df_perdidos['motivo_perda'] = df_perdidos['motivo_perda'].fillna("Não preenchido")
            motivos_principais = df_perdidos['motivo_perda'].value_counts().head(3).to_dict()
            
            # Pega as 3 últimas notas de perda reais preenchidas
            notas_reais = df_perdidos[['cliente', 'motivo_perda', 'notas_perda']].dropna(subset=['notas_perda']).tail(3).to_dict(orient='records')

            # --- MONTAGEM DO JSON ESTRATÉGICO ---
            resumo = {
                "saude_do_funil": {
                    "total_leads_ativos": len(df_ativos),
                    "valor_total_ativo": f"R$ {df_ativos['valor'].sum():,.2f}",
                    "distribuicao_por_fase": df_ativos['fase'].value_counts().to_dict()
                },
                "alertas_sla": {
                    "total_leads_em_risco_ha_mais_de_10_dias": len(leads_em_risco),
                    "detalhes_leads_em_risco": leads_em_risco
                },
                "onde_estamos_perdendo_dinheiro": {
                    "total_leads_perdidos": len(df_perdidos),
                    "maiores_motivos_de_perda": motivos_principais,
                    "exemplos_do_que_o_comercial_escreveu_nas_notas": notas_reais
                },
                "foco_prioritario": df_ativos[df_ativos['fase'] == 'Negociação'].nlargest(3, 'valor')[['cliente', 'valor', 'responsavel']].to_dict(orient='records')
            }

            return json.dumps(resumo, ensure_ascii=False, indent=2)

        except Exception as e:
            return json.dumps({"erro_sistema": str(e)})

# Instância Singleton
pipefy_temp_service = PipefyTempService()