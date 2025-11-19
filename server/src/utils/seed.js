const faker = require('faker');
faker.locale = 'pt_BR';


import {
  Nicho, 
  Fase_funil,          
  Origem_lead, 
  Motivo_perda,        
  Membro,
  Vendedor, 
  Empresa, 
  Meta, 
  Contato, 
  Lead,
  Historico_fase_lead,
  Interacao
} from '../models/Comercial/Index.js';

function weightedRandom(items) {
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  let random = faker.datatype.number({ min: 0, max: totalWeight - 1 });
  for (const item of items) {
    if (random < item.weight) {
      return item.value;
    }
    random -= item.weight;
  }
  return items[items.length - 1].value;
}

const CURRENT_YEAR = new Date().getFullYear();

export const seedDb = async () => {
  console.log('Iniciando seeding do banco de dados Comercial...');

  try {
    console.log('Limpando banco de dados anterior...');
    await Interacao.deleteMany({});
    await Historico_fase_lead.deleteMany({});
    await Lead.deleteMany({});
    await Contato.deleteMany({});
    await Meta.deleteMany({});
    await Empresa.deleteMany({});
    await Vendedor.deleteMany({});
    await Membro.deleteMany({});
    await Motivo_perda.deleteMany({});
    await Origem_lead.deleteMany({});
    await Fase_funil.deleteMany({});
    await Nicho.deleteMany({});
    console.log('Banco de dados limpo.');

    console.log('Criando Nível 0: Nichos, Fases, Origens, Motivos...');
    const nichosPromises = [
      new Nicho({ nome_nicho: 'Tecnologia' }),
      new Nicho({ nome_nicho: 'Saúde' }),
      new Nicho({ nome_nicho: 'Varejo' }),
      new Nicho({ nome_nicho: 'Educação' }),
    ].map(n => n.save());
    
    const fasesPromises = [
      new Fase_funil({ nome_fase: 'Qualificação', ordem: 1 }), 
      new Fase_funil({ nome_fase: 'Proposta', ordem: 2 }),    
      new Fase_funil({ nome_fase: 'Negociação', ordem: 3 }),   
      new Fase_funil({ nome_fase: 'Fechamento', ordem: 4 }),   
    ].map(f => f.save());
    
    const origensPromises = [
      new Origem_lead({ canal: 'Google Ads', fonte: 'Mídia Paga' }),
      new Origem_lead({ canal: 'Indicação (Membro CITI)', fonte: 'Networking' }),
      new Origem_lead({ canal: 'LinkedIn (Prospecção)', fonte: 'Orgânico' }),
    ].map(o => o.save());
    
    const motivosPromises = [
      new Motivo_perda({ descricao: 'Preço' }),                       
      new Motivo_perda({ descricao: 'Perdeu para concorrente' }),      
      new Motivo_perda({ descricao: 'Projeto pausado (sem budget)' }), 
    ].map(m => m.save());
    
    const [nichosSalvos, fasesSalvas, origensSalvas, motivosSalvos] = await Promise.all([
      Promise.all(nichosPromises),
      Promise.all(fasesPromises),
      Promise.all(origensPromises),
      Promise.all(motivosPromises),
    ]);
    console.log('Nível 0 criado.');

    console.log('Criando Nível 1: Membros (Onda, Operacional, Diretoria, Vendedor)...');
    const membrosPromises = [];
    
    for (let i = 0; i < 3; i++) {
      membrosPromises.push(new Membro({
        nome: faker.name.findName(),
        email: faker.internet.email(),
        cargo: 'Vendedor',
        telefone: faker.phone.phoneNumber(),
        data_entrada: faker.date.past(2)
      }).save());
    }
    
    for (let i = 0; i < 7; i++) {
      membrosPromises.push(new Membro({
        nome: faker.name.findName(),
        email: faker.internet.email(),
        cargo: faker.random.arrayElement(['Onda', 'Operacional', 'Diretoria']),
        telefone: faker.phone.phoneNumber(),
        data_entrada: faker.date.past(1)
      }).save());
    }
    const membrosSalvos = await Promise.all(membrosPromises);
    
    console.log('Criando Nível 2: Entidade Vendedor...');
    const membrosVendedores = membrosSalvos.filter(m => m.cargo === 'Vendedor');
    
    const vendedoresPromises = membrosVendedores.map(membro => 
      new Vendedor({ id_membro: membro._id }).save()
    );
    const vendedoresSalvos = await Promise.all(vendedoresPromises);
    console.log(`${membrosSalvos.length} Membros criados, ${vendedoresSalvos.length} Vendedores ('Vendedor') criados.`);

    console.log('Criando Nível 3: Empresas e Metas...');
    const empresasPromises = [];
    for (let i = 0; i < 15; i++) {
      empresasPromises.push(new Empresa({
        nome_empresa: faker.company.companyName(),
        cnpj: faker.datatype.number({ min: 10000000000000, max: 99999999999999 }).toString(),
        localizacao_estado: faker.address.state(true),
        localizacao_pais: 'BR',
        faturamento_anual: faker.finance.amount(100000, 5000000),
        numero_funcionarios: faker.datatype.number({ min: 10, max: 500 }),
        id_nicho: faker.random.arrayElement(nichosSalvos)._id
      }).save());
    }
    
    const metasPromises = [];
    for (const vendedor of vendedoresSalvos) {
      metasPromises.push(new Meta({
        id_vendedor: vendedor._id,
        periodo: 'Q4 2025',
        tipo_meta: 'Receita',
        valor_objetivo: faker.datatype.number({ min: 50000, max: 100000 })
      }).save());
    }
    
    const [empresasSalvas] = await Promise.all([
      Promise.all(empresasPromises),
      Promise.all(metasPromises)
    ]);
    console.log(`${empresasSalvas.length} Empresas e ${metasPromises.length} Metas criadas.`);

    console.log('Criando Nível 4: Contatos...');
    const contatosPromises = [];
    for (const empresa of empresasSalvas) {
      for (let i = 0; i < faker.datatype.number({ min: 1, max: 2 }); i++) {
        contatosPromises.push(new Contato({
          id_empresa: empresa._id,
          nome: faker.name.findName(),
          email: faker.internet.email(),
          telefone: faker.phone.phoneNumber(),
          cargo: faker.name.jobTitle()
        }).save());
      }
    }
    const contatosSalvos = await Promise.all(contatosPromises);
    console.log(`${contatosSalvos.length} Contatos criados.`);

    console.log('Criando Nível 5: Leads...');
    const leadsPromises = [];
    const faseFechamento = fasesSalvas.find(f => f.nome_fase === 'Fechamento');

    for (let i = 0; i < 50; i++) {
      const contato = faker.random.arrayElement(contatosSalvos);
      const membroIndicador = faker.random.arrayElement(membrosSalvos);
      const origem = faker.random.arrayElement(origensSalvas);
      const status = faker.random.arrayElement(['Aberto', 'Ganho', 'Perdido']);
      
      let faseAtual, dataGanho = null, dataPerda = null, motivoPerda = null;

      if (status === 'Aberto') {
        faseAtual = faker.random.arrayElement(fasesSalvas.filter(f => f.nome_fase !== 'Fechamento'))._id;
      } else if (status === 'Ganho') {
        faseAtual = faseFechamento._id;
        dataGanho = faker.date.recent(30);
      } else {
        faseAtual = faker.random.arrayElement(fasesSalvas)._id;
        dataPerda = faker.date.recent(30);
        motivoPerda = faker.random.arrayElement(motivosSalvos)._id;
      }

      leadsPromises.push(new Lead({
        id_fase_atual: faseAtual,
        id_empresa: contato.id_empresa,
        id_membro: membroIndicador._id,
        id_contato: contato._id,
        id_origem_lead: origem._id,
        id_motivo_perda: motivoPerda,
        valor_estimado: faker.finance.amount(5000, 100000),
        status: status,
        data_ganho: dataGanho,
        data_perda: dataPerda,
      }).save());
    }
    const leadsSalvos = await Promise.all(leadsPromises);
    console.log(`${leadsSalvos.length} Leads criados.`);

    console.log('Criando Nível 6: Histórico de Fases e Interações...');
    const finalPromises = [];
    for (const lead of leadsSalvos) {
      finalPromises.push(new Historico_fase_lead({ 
        id_lead: lead._id,
        id_fase: lead.id_fase_atual,
        data_entrada: lead.createdAt,
        data_saida: lead.data_ganho || lead.data_perda,
      }).save());

      if (vendedoresSalvos.length > 0) {
        const vendedorResponsavel = faker.random.arrayElement(vendedoresSalvos);
        for (let i = 0; i< faker.datatype.number({ min: 1, max: 5 }); i++) {
          finalPromises.push(new Interacao({
            id_lead: lead._id,
            id_contato: lead.id_contato,
            id_vendedor: vendedorResponsavel._id,
            tipo_atividade: faker.random.arrayElement(['Email', 'Ligação', 'Reunião']),
            data_realizacao: faker.date.between(lead.createdAt, new Date()),
          }).save());
        }
      }
    }
    await Promise.all(finalPromises);
    console.log('Históricos e Interações criados.');

    console.log('---------------------------------');
    console.log('✅ Seeding do Comercial concluído!');
    console.log('---------------------------------');

  } catch (error) {
    console.error('❌ Erro durante o seeding:', error);
    throw error;
  }
};