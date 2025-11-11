import { faker } from '@faker-js/faker/locale/pt_BR';
import mongoose from 'mongoose';

import {
  Nicho, FaseFunil, Origem_lead, MotivoPerda, Membro,
  Vendedor, Empresa, Meta, Contato, Lead,
  HistoricoFaseLead, Interacao
} from '../models/Comercial/Index.js';

const MONGO_URI = 'mongodb://localhost:27017/citi_comercial';

export const seedDb = async () => {
  console.log('Iniciando seeding do banco de dados Comercial...');

  try {
    console.log('Limpando banco de dados anterior...');
    await Interacao.deleteMany({});
    await HistoricoFaseLead.deleteMany({});
    await Lead.deleteMany({});
    await Contato.deleteMany({});
    await Meta.deleteMany({});
    await Empresa.deleteMany({});
    await Vendedor.deleteMany({});
    await Membro.deleteMany({});
    await MotivoPerda.deleteMany({});
    await Origem_lead.deleteMany({});
    await FaseFunil.deleteMany({});
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
      new FaseFunil({ nome_fase: 'Qualificação', ordem: 1 }),
      new FaseFunil({ nome_fase: 'Proposta', ordem: 2 }),
      new FaseFunil({ nome_fase: 'Negociação', ordem: 3 }),
      new FaseFunil({ nome_fase: 'Fechamento', ordem: 4 }),
    ].map(f => f.save());
    
    const origensPromises = [
      new Origem_lead({ canal: 'Google Ads', fonte: 'Mídia Paga' }),
      new Origem_lead({ canal: 'Indicação (Membro CITI)', fonte: 'Networking' }),
      new Origem_lead({ canal: 'LinkedIn (Prospecção)', fonte: 'Orgânico' }),
    ].map(o => o.save());
    
    const motivosPromises = [
      new MotivoPerda({ descricao: 'Preço' }),
      new MotivoPerda({ descricao: 'Perdeu para concorrente' }),
      new MotivoPerda({ descricao: 'Projeto pausado (sem budget)' }),
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
        nome: faker.person.fullName(),
        email: faker.internet.email(),
        cargo: 'Vendedor',
        telefone: faker.phone.number(),
        data_entrada: faker.date.past(2)
      }).save());
    }
    
    for (let i = 0; i < 7; i++) {
      membrosPromises.push(new Membro({
        nome: faker.person.fullName(),
        email: faker.internet.email(),
        cargo: faker.helpers.arrayElement(['Onda', 'Operacional', 'Diretoria']),
        telefone: faker.phone.number(),
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
        nome_empresa: faker.company.name(),
        cnpj: faker.number.int({ min: 10000000000000, max: 99999999999999 }).toString(),
        localizacao_estado: faker.location.state({ abbreviated: true }),
        localizacao_pais: 'BR',
        faturamento_anual: faker.finance.amount(100000, 5000000),
        numero_funcionarios: faker.number.int({ min: 10, max: 500 }),
        id_nicho: faker.helpers.arrayElement(nichosSalvos)._id
      }).save());
    }
    
    const metasPromises = [];
    for (const vendedor of vendedoresSalvos) {
      metasPromises.push(new Meta({
        id_vendedor: vendedor._id,
        periodo: 'Q4 2025',
        tipo_meta: 'Receita',
        valor_objetivo: faker.number.int({ min: 50000, max: 100000 })
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
      for (let i = 0; i < faker.number.int({ min: 1, max: 2 }); i++) {
        contatosPromises.push(new Contato({
          id_empresa: empresa._id,
          nome: faker.person.fullName(),
          email: faker.internet.email(),
          telefone: faker.phone.number(),
          cargo: faker.person.jobTitle()
        }).save());
      }
    }
    const contatosSalvos = await Promise.all(contatosPromises);
    console.log(`${contatosSalvos.length} Contatos criados.`);

    console.log('Criando Nível 5: Leads...');
    const leadsPromises = [];
    const faseFechamento = fasesSalvas.find(f => f.nome_fase === 'Fechamento');

    for (let i = 0; i < 50; i++) {
      const contato = faker.helpers.arrayElement(contatosSalvos);
      const membroIndicador = faker.helpers.arrayElement(membrosSalvos);
      const origem = faker.helpers.arrayElement(origensSalvas);
      const status = faker.helpers.arrayElement(['Aberto', 'Ganha', 'Perdida']);
      
      let faseAtual, dataGanho = null, dataPerda = null, motivoPerda = null;

      if (status === 'Aberto') {
        faseAtual = faker.helpers.arrayElement(fasesSalvas.filter(f => f.nome_fase !== 'Fechamento'))._id;
      } else if (status === 'Ganha') {
        faseAtual = faseFechamento._id;
        dataGanho = faker.date.recent(30);
      } else {
        faseAtual = faker.helpers.arrayElement(fasesSalvas)._id;
        dataPerda = faker.date.recent(30);
        motivoPerda = faker.helpers.arrayElement(motivosSalvos)._id;
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
      finalPromises.push(new HistoricoFaseLead({
        id_lead: lead._id,
        id_fase: lead.id_fase_atual,
        data_entrada: lead.createdAt,
        data_saida: lead.data_ganho || lead.data_perda,
      }).save());

      if (vendedoresSalvos.length > 0) {
        const vendedorResponsavel = faker.helpers.arrayElement(vendedoresSalvos);
        for (let i = 0; i< faker.number.int({ min: 1, max: 5 }); i++) {
          finalPromises.push(new Interacao({
            id_lead: lead._id,
            id_contato: lead.id_contato,
            id_vendedor: vendedorResponsavel._id,
            tipo_atividade: faker.helpers.arrayElement(['Email', 'Ligação', 'Reunião']),
            data_realizacao: faker.date.between({ from: lead.createdAt, to: new Date() }),
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
  }
};

const runSeed = async () => {
  console.log('Conectando ao banco de dados...');
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Conectado ao MongoDB.');
    
    await seedDb();
    
    await mongoose.disconnect();
    console.log('Desconectado do MongoDB.');
  } catch (error) {
    console.error('Erro ao conectar ou rodar o seed:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
};

runSeed();