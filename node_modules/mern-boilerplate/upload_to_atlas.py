import csv
import os
import sys
import datetime
import random
from pymongo import MongoClient
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def sanitize_for_email(text):
    if not text:
        return ""
    import unicodedata
    import re
    text = unicodedata.normalize('NFD', text).encode('ascii', 'ignore').decode("utf-8")
    text = text.lower()
    text = re.sub(r'[^a-z0-9\s]', '', text)
    text = re.sub(r'\s+', '.', text)
    return text.strip('.')

def parse_date(date_str):
    if not date_str or not date_str.strip():
        return None
    try:
        day, month, year = map(int, date_str.strip().split('/'))
        return datetime.datetime(year, month, day)
    except ValueError:
        return None

def generate_cnpj(index):
    return f"{str(index).zfill(8)}0001{str(index).zfill(2)}"

def main():
    # 1. Connect to MongoDB
    mongo_uri = os.getenv('MONGO_URI_PROD')
    if not mongo_uri:
        print("❌ Error: MONGO_URI_PROD not found in .env file")
        sys.exit(1)
    
    print("Connecting to MongoDB Atlas...")
    try:
        client = MongoClient(mongo_uri)
        # Extract database name from URI or use default
        db_name = client.get_default_database().name
        db = client[db_name]
        print(f"✓ Connected to database: {db_name}")
    except Exception as e:
        print(f"❌ Connection failed: {e}")
        sys.exit(1)

    # 2. Read CSV
    csv_path = os.path.join(os.path.dirname(__file__), 'data_csv', 'comercial_funil.csv')
    print(f"Reading CSV from: {csv_path}")
    
    try:
        with open(csv_path, 'r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            records = list(reader)
            print(f"✓ Read {len(records)} records")
    except FileNotFoundError:
        print("❌ CSV file not found!")
        sys.exit(1)

    # 3. Clear existing data
    print("Cleaning existing collections...")
    collections = ['leads', 'interacaos', 'contatos', 'empresas', 'vendedors', 'membros', 'fase_funils', 'origem_leads', 'nichos', 'motivo_perdas']
    for col in collections:
        db[col].delete_many({})
    print("✓ Collections cleared")

    # 4. Process unique values
    unique_nichos = set()
    unique_fases = set()
    unique_origens = set()
    unique_responsaveis = set()
    unique_empresas = {} # name -> nicho
    unique_contatos = {} # key -> {empresa, date}

    for row in records:
        # Nichos
        setor = row.get('Setor', '').strip()
        if setor and setor != 'Sem dado':
            unique_nichos.add(setor)
        
        # Fases
        fase = row.get('Etapa do funil', '').strip()
        if fase:
            unique_fases.add(fase)
            
        # Origens
        origem = row.get('Origem do lead', '').strip()
        if origem and origem != 'Sem dado':
            unique_origens.add(origem)
            
        # Responsáveis
        resp = row.get('Responsável', '').strip()
        if resp:
            for r in resp.split(','):
                unique_responsaveis.add(r.strip())
                
        # Empresas
        empresa = row.get('Empresa', '').strip()
        if empresa and empresa != 'Sem dado':
            unique_empresas[empresa] = setor if setor and setor != 'Sem dado' else None
            
        # Contatos
        nome_lead = row.get('Nome do lead', '').strip()
        if nome_lead:
            key = f"{nome_lead}|{empresa or 'N/A'}"
            date = parse_date(row.get('Data de entrada no funil')) or datetime.datetime.now()
            
            if key not in unique_contatos or date < unique_contatos[key]['date']:
                unique_contatos[key] = {'empresa': empresa, 'date': date}

    # 5. Insert Reference Data
    
    # Nichos
    nichos_map = {} # name -> _id
    nichos_list = [{'nome_nicho': n} for n in unique_nichos]
    if not nichos_list:
        nichos_list.append({'nome_nicho': 'Geral'})
    
    result = db.nichos.insert_many(nichos_list)
    for name, _id in zip([n['nome_nicho'] for n in nichos_list], result.inserted_ids):
        nichos_map[name] = _id
    print(f"✓ Created {len(nichos_map)} nichos")
    
    default_nicho_id = nichos_map.get('Geral') or list(nichos_map.values())[0]

    # Fases
    fases_map = {}
    fases_list = [{'nome_fase': n, 'ordem': i+1} for i, n in enumerate(sorted(list(unique_fases)))]
    if fases_list:
        result = db.fase_funils.insert_many(fases_list)
        for name, _id in zip([f['nome_fase'] for f in fases_list], result.inserted_ids):
            fases_map[name] = _id
    print(f"✓ Created {len(fases_map)} fases")

    # Origens
    origens_map = {}
    origens_list = [{'canal': n, 'fonte': n} for n in unique_origens]
    if not origens_list:
        origens_list.append({'canal': 'Desconhecido', 'fonte': 'Desconhecido'})
        
    result = db.origem_leads.insert_many(origens_list)
    for name, _id in zip([o['canal'] for o in origens_list], result.inserted_ids):
        origens_map[name] = _id
    print(f"✓ Created {len(origens_map)} origens")
    
    default_origem_id = origens_map.get('Desconhecido') or list(origens_map.values())[0]

    # Motivos Perda
    motivos = ['Preço muito alto', 'Escolheu concorrente', 'Sem budget', 'Não respondeu', 
               'Timing inadequado', 'Não atende necessidades', 'Mudança de prioridades', 'Desqualificado']
    motivos_map = {}
    result = db.motivo_perdas.insert_many([{'descricao': m} for m in motivos])
    for name, _id in zip(motivos, result.inserted_ids):
        motivos_map[name] = _id
    print(f"✓ Created {len(motivos_map)} motivos perda")

    # Membros & Vendedores
    membros_map = {}
    cargos = ['Vendedor', 'Gerente', 'Diretor', 'Vendedor']
    membros_list = []
    
    for i, nome in enumerate(unique_responsaveis):
        membros_list.append({
            'nome': nome,
            'email': f"{sanitize_for_email(nome)}@empresa.com.br",
            'cargo': cargos[i % len(cargos)],
            'telefone': f"(81) 9{random.randint(1000,9999)}-{random.randint(1000,9999)}",
            'data_entrada': datetime.datetime(2020 + (i//10), 1, 1)
        })
    
    if not membros_list:
        membros_list.append({
            'nome': 'Sistema',
            'email': 'sistema@empresa.com.br',
            'cargo': 'Sistema',
            'telefone': '(00) 00000-0000',
            'data_entrada': datetime.datetime.now()
        })

    result = db.membros.insert_many(membros_list)
    membro_ids = result.inserted_ids
    
    # Create Vendedores linked to Membros
    vendedores_list = [{'id_membro': _id} for _id in membro_ids]
    db.vendedors.insert_many(vendedores_list)
    
    for nome, _id in zip([m['nome'] for m in membros_list], membro_ids):
        membros_map[nome] = _id
    print(f"✓ Created {len(membros_map)} membros/vendedores")
    
    default_membro_id = list(membros_map.values())[0]

    # Empresas
    empresas_map = {}
    empresas_list = []
    
    for i, (nome, nicho_name) in enumerate(unique_empresas.items()):
        empresas_list.append({
            'nome_empresa': nome,
            'cnpj': generate_cnpj(i+1),
            'localizacao_pais': 'Brasil',
            'localizacao_estado': 'PE',
            'id_nicho': nichos_map.get(nicho_name, default_nicho_id)
        })
        
    # Default empresa
    empresas_list.append({
        'nome_empresa': 'Empresa não especificada',
        'cnpj': generate_cnpj(0),
        'localizacao_pais': 'Brasil',
        'localizacao_estado': 'PE',
        'id_nicho': default_nicho_id
    })
    
    result = db.empresas.insert_many(empresas_list)
    for nome, _id in zip([e['nome_empresa'] for e in empresas_list], result.inserted_ids):
        empresas_map[nome] = _id
    print(f"✓ Created {len(empresas_map)} empresas")
    
    default_empresa_id = empresas_map['Empresa não especificada']

    # Contatos
    contatos_map = {}
    contatos_list = []
    
    for i, (key, val) in enumerate(unique_contatos.items()):
        nome = key.split('|')[0]
        empresa_nome = val['empresa']
        empresa_id = empresas_map.get(empresa_nome, default_empresa_id)
        
        contatos_list.append({
            'id_empresa': empresa_id,
            'nome': nome,
            'email': f"{sanitize_for_email(nome)}{i+1}@{sanitize_for_email(empresa_nome or 'company')}.com.br",
            'telefone': f"(81) 9{random.randint(1000,9999)}-{random.randint(1000,9999)}",
            'cargo': 'Contato',
            'createdAt': val['date']
        })
        
    if contatos_list:
        result = db.contatos.insert_many(contatos_list)
        for key, _id in zip(unique_contatos.keys(), result.inserted_ids):
            contatos_map[key] = _id
    print(f"✓ Created {len(contatos_map)} contatos")

    # 6. Leads
    leads_list = []
    skipped = 0
    
    for row in records:
        empresa_nome = row.get('Empresa', '').strip()
        nome_lead = row.get('Nome do lead', '').strip()
        
        if not nome_lead:
            skipped += 1
            continue
            
        contato_key = f"{nome_lead}|{empresa_nome or 'N/A'}"
        contato_id = contatos_map.get(contato_key)
        
        if not contato_id:
            skipped += 1
            continue
            
        empresa_id = empresas_map.get(empresa_nome, default_empresa_id)
        
        fase_nome = row.get('Etapa do funil', '').strip()
        fase_id = fases_map.get(fase_nome) or list(fases_map.values())[0]
        
        origem_nome = row.get('Origem do lead', '').strip()
        origem_id = origens_map.get(origem_nome, default_origem_id)
        
        resp_nome = row.get('Responsável', '').strip().split(',')[0].strip()
        membro_id = membros_map.get(resp_nome, default_membro_id)
        
        data_entrada = parse_date(row.get('Data de entrada no funil')) or datetime.datetime.now()
        data_encerramento = parse_date(row.get('Data de encerramento'))
        
        # Status logic
        status = 'Aberto'
        fase_enc = row.get('Fase de encerramento', '').lower()
        
        if fase_nome == 'Ganho' or 'ganho' in fase_enc:
            status = 'Ganho'
        elif fase_nome in ['Perdido', 'Desqualificado'] or 'perdido' in fase_enc:
            status = 'Perdido'
            
        valor_str = row.get('Valor do projeto', '0').strip()
        try:
            valor = int(float(valor_str))
        except:
            valor = 0
            
        lead = {
            'id_fase_atual': fase_id,
            'id_empresa': empresa_id,
            'id_membro': membro_id,
            'id_contato': contato_id,
            'id_origem_lead': origem_id,
            'valor_estimado': valor,
            'status': status,
            'createdAt': data_entrada
        }
        
        if status == 'Ganho' and data_encerramento:
            lead['data_ganho'] = data_encerramento
        elif status == 'Perdido':
            if data_encerramento:
                lead['data_perda'] = data_encerramento
            
            motivo_desc = 'Desqualificado' if fase_nome == 'Desqualificado' else 'Não respondeu'
            lead['id_motivo_perda'] = motivos_map.get(motivo_desc, list(motivos_map.values())[0])
            
        leads_list.append(lead)
        
    if leads_list:
        db.leads.insert_many(leads_list)
        
    print(f"✓ Created {len(leads_list)} leads (skipped {skipped})")
    print("\n🎉 Upload complete!")

if __name__ == "__main__":
    main()
