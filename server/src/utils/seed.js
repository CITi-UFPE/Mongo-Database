import { parse } from 'csv-parse/sync';
import { readFileSync } from 'fs';
import { join } from 'path';

// Importar modelos Comercial
import Lead from '../models/Comercial/Lead';
import Membro from '../models/Comercial/Membro';
import Vendedor from '../models/Comercial/Vendedor';
import Empresa from '../models/Comercial/Empresa';
import Contato from '../models/Comercial/Contato';
import FaseFunil from '../models/Comercial/Fase_funil';
import OrigemLead from '../models/Comercial/Origem_lead';
import Nicho from '../models/Comercial/Nicho';
import MotivoPerda from '../models/Comercial/Motivo_perda';
import Interacao from '../models/Comercial/Interacao';

import { deleteAllAvatars } from './utils';
import { IMAGES_FOLDER_PATH } from './constants';


// Helper function to parse DD/MM/YYYY dates
function parseDate(dateStr) {
  if (!dateStr || dateStr.trim() === '') return null;
  const parts = dateStr.trim().split('/');
  if (parts.length !== 3) return null;
  // DD/MM/YYYY -> new Date(YYYY, MM-1, DD)
  return new Date(parts[2], parts[1] - 1, parts[0]);
}

// Helper function to generate placeholder CNPJ
function generateCNPJ(index) {
  return `${String(index).padStart(8, '0')}0001${String(index).padStart(2, '0')}`;
}

// Helper function to generate placeholder email
function generateEmail(name, companyName, index) {
  const cleanName = name.toLowerCase().replace(/\s+/g, '.');
  const cleanCompany = companyName ? companyName.toLowerCase().replace(/[^a-z0-9]/g, '') : 'company';
  return `${cleanName}${index}@${cleanCompany}.com.br`;
}

export const seedDb = async () => {
  console.log('Seeding CRM database from CSV...');

  // Limpar todas as coleções
  await Lead.deleteMany({});
  await Interacao.deleteMany({});
  await Contato.deleteMany({});
  await Empresa.deleteMany({});
  await Vendedor.deleteMany({});
  await Membro.deleteMany({});
  await FaseFunil.deleteMany({});
  await OrigemLead.deleteMany({});
  await Nicho.deleteMany({});
  await MotivoPerda.deleteMany({});
  await deleteAllAvatars(join(__dirname, '../..', IMAGES_FOLDER_PATH));

  // Ler e parsear CSV
  const csvPath = join(__dirname, '../../data_csv/comercial_funil.csv');
  const fileContent = readFileSync(csvPath, 'utf-8');

  const records = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true, // Handle BOM in CSV
  });

  console.log(`✓ Read ${records.length} records from CSV`);

  // Extract unique values for reference collections
  const uniqueNichos = new Set();
  const uniqueFases = new Set();
  const uniqueOrigens = new Set();
  const uniqueResponsaveis = new Set();
  const uniqueEmpresas = new Map(); // Map empresa name -> nicho
  const uniqueContatos = new Map(); // Map contato name -> empresa name

  records.forEach(record => {
    // Nichos
    if (record.Setor && record.Setor !== 'Sem dado' && record.Setor.trim() !== '') {
      uniqueNichos.add(record.Setor.trim());
    }

    // Fases do funil
    if (record['Etapa do funil'] && record['Etapa do funil'].trim() !== '') {
      uniqueFases.add(record['Etapa do funil'].trim());
    }

    // Origens
    if (record['Origem do lead'] && record['Origem do lead'] !== 'Sem dado' && record['Origem do lead'].trim() !== '') {
      uniqueOrigens.add(record['Origem do lead'].trim());
    }

    // Responsáveis (can be comma-separated)
    if (record['Responsável'] && record['Responsável'].trim() !== '') {
      const responsaveis = record['Responsável'].split(',').map(r => r.trim());
      responsaveis.forEach(r => uniqueResponsaveis.add(r));
    }

    // Empresas with their sectors
    if (record.Empresa && record.Empresa.trim() !== '' && record.Empresa !== 'Sem dado') {
      const nicho = (record.Setor && record.Setor !== 'Sem dado') ? record.Setor.trim() : null;
      uniqueEmpresas.set(record.Empresa.trim(), nicho);
    }

    // Contatos with their empresas
    if (record['Nome do lead'] && record['Nome do lead'].trim() !== '') {
      const empresaName = record.Empresa && record.Empresa.trim() !== '' && record.Empresa !== 'Sem dado'
        ? record.Empresa.trim()
        : null;
      const key = `${record['Nome do lead'].trim()}|${empresaName || 'N/A'}`;
      uniqueContatos.set(key, empresaName);
    }
  });

  // 1. Criar Nichos
  const nichosList = Array.from(uniqueNichos);
  if (nichosList.length === 0) {
    nichosList.push('Geral'); // Default nicho
  }
  const nichosDocs = await Nicho.insertMany(
    nichosList.map(nome => ({ nome_nicho: nome }))
  );
  console.log(`✓ Created ${nichosDocs.length} nichos`);

  // Create a default nicho for companies without sector
  const defaultNicho = nichosDocs.find(n => n.nome_nicho === 'Geral') || nichosDocs[0];

  // 2. Criar Fases do Funil com ordem
  const fasesList = Array.from(uniqueFases);
  const fasesDocs = await FaseFunil.insertMany(
    fasesList.map((nome, index) => ({
      nome_fase: nome,
      ordem: index + 1
    }))
  );
  console.log(`✓ Created ${fasesDocs.length} fases do funil`);

  // 3. Criar Origens de Lead
  const origensList = Array.from(uniqueOrigens);
  const origensDocs = await OrigemLead.insertMany(
    origensList.map(canal => ({
      canal: canal,
      fonte: canal // Use same value for both
    }))
  );
  console.log(`✓ Created ${origensDocs.length} origens de lead`);

  // Create default origem for leads without origin
  const defaultOrigem = origensDocs[0] || await OrigemLead.create({
    canal: 'Desconhecido',
    fonte: 'Desconhecido'
  });

  // 4. Criar Motivos de Perda (mantém alguns padrões)
  const motivos = [
    'Preço muito alto',
    'Escolheu concorrente',
    'Sem budget',
    'Não respondeu',
    'Timing inadequado',
    'Não atende necessidades',
    'Mudança de prioridades',
    'Desqualificado',
  ];
  const motivosDocs = await MotivoPerda.insertMany(
    motivos.map(desc => ({ descricao: desc }))
  );
  console.log(`✓ Created ${motivosDocs.length} motivos de perda`);

  // 5. Criar Membros (responsáveis)
  const membrosList = Array.from(uniqueResponsaveis);
  const cargos = ['Vendedor', 'Gerente', 'Diretor Comercial', 'Analista de vendas'];
  const membrosDocs = await Membro.insertMany(
    membrosList.map((nome, index) => ({
      nome: nome,
      email: `${nome.toLowerCase().replace(/\s+/g, '.')}@empresa.com.br`,
      cargo: cargos[index % cargos.length],
      telefone: `(81) 9${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`,
      data_entrada: new Date(2020 + Math.floor(index / 10), 0, 1),
    }))
  );
  console.log(`✓ Created ${membrosDocs.length} membros`);

  // Create default membro for leads without responsible
  const defaultMembro = membrosDocs[0] || await Membro.create({
    nome: 'Sistema',
    email: 'sistema@empresa.com.br',
    cargo: 'Sistema',
    telefone: '(00) 00000-0000',
    data_entrada: new Date(),
  });

  // 6. Criar Vendedores (todos os membros são vendedores)
  const vendedoresDocs = await Vendedor.insertMany(
    membrosDocs.map(m => ({ id_membro: m._id }))
  );
  console.log(`✓ Created ${vendedoresDocs.length} vendedores`);

  // 7. Criar Empresas
  const empresasList = Array.from(uniqueEmpresas.entries());
  const empresasMap = new Map(); // Map empresa name -> empresa doc

  for (let i = 0; i < empresasList.length; i++) {
    const [empresaName, nichoName] = empresasList[i];
    const nicho = nichoName
      ? nichosDocs.find(n => n.nome_nicho === nichoName) || defaultNicho
      : defaultNicho;

    const empresaDoc = await Empresa.create({
      nome_empresa: empresaName,
      cnpj: generateCNPJ(i + 1),
      localizacao_pais: 'Brasil',
      localizacao_estado: 'PE',
      id_nicho: nicho._id,
    });
    empresasMap.set(empresaName, empresaDoc);
  }
  console.log(`✓ Created ${empresasMap.size} empresas`);

  // Create default empresa for leads without company
  const defaultEmpresa = await Empresa.create({
    nome_empresa: 'Empresa não especificada',
    cnpj: generateCNPJ(0),
    localizacao_pais: 'Brasil',
    localizacao_estado: 'PE',
    id_nicho: defaultNicho._id,
  });

  // 8. Criar Contatos
  const contatosList = Array.from(uniqueContatos.entries());
  const contatosMap = new Map(); // Map "nome|empresa" -> contato doc

  for (let i = 0; i < contatosList.length; i++) {
    const [key, empresaName] = contatosList[i];
    const [contatoName, _] = key.split('|');

    const empresa = empresaName ? empresasMap.get(empresaName) : defaultEmpresa;
    if (!empresa) continue;

    const contatoDoc = await Contato.create({
      id_empresa: empresa._id,
      nome: contatoName,
      email: generateEmail(contatoName, empresa.nome_empresa, i + 1),
      telefone: `(81) 9${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`,
      cargo: 'Contato',
    });
    contatosMap.set(key, contatoDoc);
  }
  console.log(`✓ Created ${contatosMap.size} contatos`);

  // 9. Criar Leads a partir do CSV
  const leadsToCreate = [];
  let skipped = 0;

  for (const record of records) {
    // Get empresa
    const empresaName = record.Empresa && record.Empresa.trim() !== '' && record.Empresa !== 'Sem dado'
      ? record.Empresa.trim()
      : null;
    const empresa = empresaName ? empresasMap.get(empresaName) : defaultEmpresa;

    if (!empresa) {
      skipped++;
      continue;
    }

    // Get contato
    const contatoName = record['Nome do lead'] && record['Nome do lead'].trim() !== ''
      ? record['Nome do lead'].trim()
      : null;

    if (!contatoName) {
      skipped++;
      continue;
    }

    const contatoKey = `${contatoName}|${empresaName || 'N/A'}`;
    const contato = contatosMap.get(contatoKey);

    if (!contato) {
      skipped++;
      continue;
    }

    // Get fase
    const faseNome = record['Etapa do funil'] && record['Etapa do funil'].trim() !== ''
      ? record['Etapa do funil'].trim()
      : null;
    const fase = faseNome
      ? fasesDocs.find(f => f.nome_fase === faseNome)
      : fasesDocs[0];

    // Get origem
    const origemNome = record['Origem do lead'] && record['Origem do lead'] !== 'Sem dado' && record['Origem do lead'].trim() !== ''
      ? record['Origem do lead'].trim()
      : null;
    const origem = origemNome
      ? origensDocs.find(o => o.canal === origemNome) || defaultOrigem
      : defaultOrigem;

    // Get membro responsável
    const responsavelNome = record['Responsável'] && record['Responsável'].trim() !== ''
      ? record['Responsável'].split(',')[0].trim() // Take first if multiple
      : null;
    const membro = responsavelNome
      ? membrosDocs.find(m => m.nome === responsavelNome) || defaultMembro
      : defaultMembro;

    // Parse dates
    const dataEntrada = parseDate(record['Data de entrada no funil']) || new Date();
    const dataEncerramento = parseDate(record['Data de encerramento']);

    // Determine status
    let status = 'Aberto';
    const faseEncerramento = record['Fase de encerramento'] && record['Fase de encerramento'].trim() !== ''
      ? record['Fase de encerramento'].trim()
      : '';

    const etapaFunil = record['Etapa do funil'] && record['Etapa do funil'].trim() !== ''
      ? record['Etapa do funil'].trim()
      : '';

    if (etapaFunil === 'Ganho' || faseEncerramento.toLowerCase().includes('ganho')) {
      status = 'Ganho';
    } else if (etapaFunil === 'Perdido' || etapaFunil === 'Desqualificado' || faseEncerramento.toLowerCase().includes('perdido')) {
      status = 'Perdido';
    }

    // Parse valor
    const valorStr = record['Valor do projeto'] && record['Valor do projeto'].trim() !== ''
      ? record['Valor do projeto'].trim()
      : '0';
    const valor = parseInt(valorStr) || 0;

    // Create lead
    const lead = {
      id_fase_atual: fase._id,
      id_empresa: empresa._id,
      id_membro: membro._id,
      id_contato: contato._id,
      id_origem_lead: origem._id,
      valor_estimado: valor,
      status: status,
      createdAt: dataEntrada,
    };

    // Add status-specific fields
    if (status === 'Ganho' && dataEncerramento) {
      lead.data_ganho = dataEncerramento;
    } else if (status === 'Perdido' && dataEncerramento) {
      lead.data_perda = dataEncerramento;
      // Assign a motivo_perda
      const motivoDesqualificado = motivosDocs.find(m => m.descricao === 'Desqualificado');
      const motivoPadrao = motivosDocs.find(m => m.descricao === 'Não respondeu');
      lead.id_motivo_perda = etapaFunil === 'Desqualificado'
        ? (motivoDesqualificado || motivoPadrao)._id
        : motivoPadrao._id;
    }

    leadsToCreate.push(lead);
  }

  const leadsDocs = await Lead.insertMany(leadsToCreate);
  console.log(`✓ Created ${leadsDocs.length} leads (skipped ${skipped} records)`);

  console.log('\n🎉 Seeding complete!');
  console.log(`Summary:
    - ${nichosDocs.length} nichos
    - ${fasesDocs.length} fases do funil
    - ${origensDocs.length} origens de lead
    - ${motivosDocs.length} motivos de perda
    - ${membrosDocs.length} membros
    - ${vendedoresDocs.length} vendedores
    - ${empresasMap.size + 1} empresas
    - ${contatosMap.size} contatos
    - ${leadsDocs.length} leads
    - Years: 2023-2025
  `);
};

// If running directly (not imported), connect to MongoDB and run seed
if (require.main === module) {
  import('dotenv/config').then(() => {
    const mongoose = require('mongoose');

    const isProduction = process.env.NODE_ENV === 'production';
    const dbConnection = isProduction ? process.env.MONGO_URI_PROD : process.env.MONGO_URI_DEV;

    console.log('Connecting to MongoDB...');
    mongoose.connect(dbConnection)
      .then(() => {
        console.log('MongoDB Connected...');
        return seedDb();
      })
      .then(() => {
        console.log('\nClosing database connection...');
        return mongoose.connection.close();
      })
      .then(() => {
        console.log('Done!');
        process.exit(0);
      })
      .catch(err => {
        console.error('Error:', err);
        process.exit(1);
      });
  });
}