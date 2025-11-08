import faker from 'faker';
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

// Função auxiliar para escolher com pesos
function weightedRandom(items) {
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  let random = faker.datatype.number({ min: 0, max: totalWeight - 1 });
  for (const item of items) {
    if (random < item.weight) {
      return item.value;
    }
    random -= item.weight;
  }
  return items[items.length - 1].value; // fallback
}

const CURRENT_YEAR = new Date().getFullYear();

export const seedDb = async () => {
  console.log('Seeding CRM database...');

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

  // 1. Criar Nichos (setores de mercado)
  const nichos = [
    'Tecnologia',
    'Varejo',
    'Educação',
    'Saúde',
    'Financeiro',
    'Consultoria',
    'Manufatura',
    'Logística',
    'Imobiliário',
    'Alimentação',
  ];
  const nichosDocs = await Nicho.insertMany(
    nichos.map(nome => ({ nome_nicho: nome }))
  );
  console.log(`✓ Created ${nichosDocs.length} nichos`);

  // 2. Criar Fases do Funil
  const fases = [
    { nome_fase: 'Prospecção', ordem: 1 },
    { nome_fase: 'Qualificação', ordem: 2 },
    { nome_fase: 'Proposta', ordem: 3 },
    { nome_fase: 'Negociação', ordem: 4 },
    { nome_fase: 'Fechado', ordem: 5 },
  ];
  const fasesDocs = await FaseFunil.insertMany(fases);
  console.log(`✓ Created ${fasesDocs.length} fases do funil`);

  // 3. Criar Origens de Lead
  const origens = [
    { canal: 'Website', fonte: 'Formulário de Contato' },
    { canal: 'LinkedIn', fonte: 'InMail' },
    { canal: 'Indicação', fonte: 'Cliente Existente' },
    { canal: 'Email', fonte: 'Cold Email' },
    { canal: 'Evento', fonte: 'Feira de Negócios' },
    { canal: 'Google Ads', fonte: 'Campanha PPC' },
    { canal: 'Telefone', fonte: 'Cold Call' },
    { canal: 'Instagram', fonte: 'Direct Message' },
  ];
  const origensDocs = await OrigemLead.insertMany(origens);
  console.log(`✓ Created ${origensDocs.length} origens de lead`);

  // 4. Criar Motivos de Perda
  const motivos = [
    'Preço muito alto',
    'Escolheu concorrente',
    'Sem budget',
    'Não respondeu',
    'Timing inadequado',
    'Não atende necessidades',
    'Mudança de prioridades',
  ];
  const motivosDocs = await MotivoPerda.insertMany(
    motivos.map(desc => ({ descricao: desc }))
  );
  console.log(`✓ Created ${motivosDocs.length} motivos de perda`);

  // 5. Criar Membros (time da empresa)
  const cargos = ['Vendedor', 'Desenvolvedor', 'Designer', 'Diretor', 'Analista de dados', 'Gerente'];
  const membros = [];
  for (let i = 0; i < 20; i++) {
    membros.push({
      nome: faker.name.findName(),
      email: faker.internet.email().toLowerCase(),
      cargo: faker.random.arrayElement(cargos),
      telefone: faker.phone.phoneNumber('(##) #####-####'),
      data_entrada: faker.date.between('2020-01-01', '2024-01-01'),
    });
  }
  const membrosDocs = await Membro.insertMany(membros);
  console.log(`✓ Created ${membrosDocs.length} membros`);

  // 6. Criar Vendedores (subconjunto dos membros)
  const vendedores = membrosDocs
    .filter(m => m.cargo === 'Vendedor' || m.cargo === 'Gerente')
    .map(m => ({ id_membro: m._id }));
  
  // Se não houver vendedores suficientes, adicionar alguns
  if (vendedores.length < 5) {
    for (let i = vendedores.length; i < 5; i++) {
      const novoMembro = await Membro.create({
        nome: faker.name.findName(),
        email: `vendedor${i}@${faker.internet.domainName()}`.toLowerCase(),
        cargo: 'Vendedor',
        telefone: faker.phone.phoneNumber('(##) #####-####'),
        data_entrada: faker.date.between('2020-01-01', '2024-01-01'),
      });
      vendedores.push({ id_membro: novoMembro._id });
    }
  }

  const vendedoresDocs = await Vendedor.insertMany(vendedores);
  console.log(`✓ Created ${vendedoresDocs.length} vendedores`);

  // 7. Criar Empresas
  const estados = ['SP', 'RJ', 'MG', 'RS', 'SC', 'PR', 'BA', 'PE', 'CE', 'DF'];
  const empresas = [];
  for (let i = 0; i < 500; i++) {
    empresas.push({
      nome_empresa: faker.company.companyName(),
      cnpj: `${faker.datatype.number({ min: 10000000, max: 99999999 })}${faker.datatype.number({ min: 1000, max: 9999 })}`,
      localizacao_pais: 'Brasil',
      localizacao_estado: faker.random.arrayElement(estados),
      faturamento_anual: faker.datatype.number({ min: 100000, max: 50000000 }),
      numero_funcionarios: faker.datatype.number({ min: 5, max: 500 }),
      id_nicho: faker.random.arrayElement(nichosDocs)._id,
    });
  }
  const empresasDocs = await Empresa.insertMany(empresas);
  console.log(`✓ Created ${empresasDocs.length} empresas`);

  // 8. Criar Contatos (1-3 contatos por empresa)
  const contatos = [];
  const cargosContato = ['CEO', 'CTO', 'Diretor', 'Gerente', 'Coordenador', 'Analista'];
  
  for (const empresa of empresasDocs) {
    const numContatos = faker.datatype.number({ min: 1, max: 3 });
    for (let i = 0; i < numContatos; i++) {
      contatos.push({
        id_empresa: empresa._id,
        nome: faker.name.findName(),
        email: faker.internet.email().toLowerCase(),
        telefone: faker.phone.phoneNumber('(##) #####-####'),
        cargo: faker.random.arrayElement(cargosContato),
      });
    }
  }
  const contatosDocs = await Contato.insertMany(contatos);
  console.log(`✓ Created ${contatosDocs.length} contatos`);

  // 9. Criar 2000 Leads
  const leads = [];
  const statusOptions = ['Aberto', 'Ganho', 'Perdido'];
  const statusWeights = [
    { value: 'Aberto', weight: 50 },
    { value: 'Ganho', weight: 30 },
    { value: 'Perdido', weight: 20 },
  ];

  for (let i = 0; i < 2000; i++) {
    const empresa = faker.random.arrayElement(empresasDocs);
    const contato = faker.random.arrayElement(
      contatosDocs.filter(c => c.id_empresa.toString() === empresa._id.toString())
    );
    
    if (!contato) continue; // Skip se não houver contato para essa empresa

    const membro = faker.random.arrayElement(membrosDocs);
    const fase = faker.random.arrayElement(fasesDocs);
    const origem = faker.random.arrayElement(origensDocs);
    const status = weightedRandom(statusWeights);
    
    const valorBase = faker.datatype.number({ min: 5000, max: 500000 });
    const createdAt = faker.date.between('2023-01-01', '2025-11-01');
    
    const lead = {
      id_fase_atual: fase._id,
      id_empresa: empresa._id,
      id_membro: membro._id,
      id_contato: contato._id,
      id_origem_lead: origem._id,
      valor_estimado: Math.round(valorBase / 100) * 100,
      status,
      createdAt,
    };

    // Adicionar dados específicos baseado no status
    if (status === 'Ganho') {
      lead.data_ganho = faker.date.between(createdAt, new Date());
      lead.id_fase_atual = fasesDocs.find(f => f.nome_fase === 'Fechado')._id;
    } else if (status === 'Perdido') {
      lead.data_perda = faker.date.between(createdAt, new Date());
      lead.id_motivo_perda = faker.random.arrayElement(motivosDocs)._id;
    }

    leads.push(lead);
  }

  const leadsDocs = await Lead.insertMany(leads);
  console.log(`✓ Created ${leadsDocs.length} leads`);

  // 10. Criar Interações (1-5 interações por lead)
  const interacoes = [];
  const tiposAtividade = [
    'Ligação',
    'Email',
    'Reunião',
    'Proposta Enviada',
    'Follow-up',
    'Demo',
    'Negociação',
  ];

  for (const lead of leadsDocs) {
    const numInteracoes = faker.datatype.number({ min: 1, max: 5 });
    const vendedor = faker.random.arrayElement(vendedoresDocs);
    
    for (let i = 0; i < numInteracoes; i++) {
      interacoes.push({
        id_lead: lead._id,
        id_contato: lead.id_contato,
        id_vendedor: vendedor._id,
        tipo_atividade: faker.random.arrayElement(tiposAtividade),
        data_realizacao: faker.date.between(lead.createdAt, new Date()),
      });
    }
  }

  const interacoesDocs = await Interacao.insertMany(interacoes);
  console.log(`✓ Created ${interacoesDocs.length} interações`);

  console.log('\n🎉 Seeding complete!');
  console.log(`Summary:
    - ${nichosDocs.length} nichos
    - ${fasesDocs.length} fases do funil
    - ${origensDocs.length} origens de lead
    - ${motivosDocs.length} motivos de perda
    - ${membrosDocs.length} membros
    - ${vendedoresDocs.length} vendedores
    - ${empresasDocs.length} empresas
    - ${contatosDocs.length} contatos
    - ${leadsDocs.length} leads
    - ${interacoesDocs.length} interações
  `);
};