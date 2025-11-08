import { Router } from 'express';
import mongoose from 'mongoose';
import Lead from '../../models/Comercial/Lead.js';
import Membro from '../../models/Comercial/Membro.js';
import Vendedor from '../../models/Comercial/Vendedor.js';
import Empresa from '../../models/Comercial/Empresa.js';
import Contato from '../../models/Comercial/Contato.js';
import FaseFunil from '../../models/Comercial/Fase_funil.js';
import OrigemLead from '../../models/Comercial/Origem_lead.js';
import Nicho from '../../models/Comercial/Nicho.js';
import MotivoPerda from '../../models/Comercial/Motivo_perda.js';
import Interacao from '../../models/Comercial/Interacao.js';

const router = Router();
const isMongoReady = () => mongoose.connection.readyState === 1 && mongoose.connection.db;

/**
 * GET /api/analytics/crm
 * Returns aggregated CRM data with all relationships populated
 */
router.get('/crm', async (_req, res) => {
  try {
    if (!isMongoReady()) {
      return res.status(503).json({ message: 'Database connection is not ready.' });
    }

    // Fetch all leads with populated relationships
    const leads = await Lead.find({})
      .populate('id_fase_atual')
      .populate('id_empresa')
      .populate('id_membro')
      .populate('id_contato')
      .populate('id_origem_lead')
      .populate('id_motivo_perda')
      .lean();

    // Fetch all interactions and populate their relationships
    const interactions = await Interacao.find({})
      .populate('id_lead')
      .populate('id_contato')
      .populate({
        path: 'id_vendedor',
        populate: { path: 'id_membro' }
      })
      .lean();

    // Fetch all companies with their nicho
    const companies = await Empresa.find({})
      .populate('id_nicho')
      .lean();

    // Fetch all contacts with their company
    const contacts = await Contato.find({})
      .populate('id_empresa')
      .lean();

    // Fetch reference data
    const [fases, origens, nichos, motivos, membros, vendedores] = await Promise.all([
      FaseFunil.find({}).lean(),
      OrigemLead.find({}).lean(),
      Nicho.find({}).lean(),
      MotivoPerda.find({}).lean(),
      Membro.find({}).lean(),
      Vendedor.find({}).populate('id_membro').lean(),
    ]);

    // Build enriched dataset
    const enrichedLeads = leads.map(lead => {
      const leadInteractions = interactions.filter(
        int => int.id_lead && int.id_lead._id.toString() === lead._id.toString()
      );

      return {
        id: lead._id.toString(),
        // Lead basic info
        valor_estimado: lead.valor_estimado,
        status: lead.status,
        data_ganho: lead.data_ganho,
        data_perda: lead.data_perda,
        createdAt: lead.createdAt,
        updatedAt: lead.updatedAt,
        
        // Fase do funil
        fase_atual: lead.id_fase_atual?.nome_fase || 'N/A',
        fase_ordem: lead.id_fase_atual?.ordem || 0,
        
        // Empresa
        empresa_nome: lead.id_empresa?.nome_empresa || 'N/A',
        empresa_cnpj: lead.id_empresa?.cnpj || 'N/A',
        empresa_localizacao_pais: lead.id_empresa?.localizacao_pais || 'N/A',
        empresa_localizacao_estado: lead.id_empresa?.localizacao_estado || 'N/A',
        empresa_faturamento: lead.id_empresa?.faturamento_anual || 0,
        empresa_funcionarios: lead.id_empresa?.numero_funcionarios || 0,
        
        // Nicho da empresa
        nicho: lead.id_empresa?.id_nicho?.nome_nicho || 'N/A',
        
        // Membro responsável
        membro_nome: lead.id_membro?.nome || 'N/A',
        membro_email: lead.id_membro?.email || 'N/A',
        membro_cargo: lead.id_membro?.cargo || 'N/A',
        
        // Contato
        contato_nome: lead.id_contato?.nome || 'N/A',
        contato_email: lead.id_contato?.email || 'N/A',
        contato_telefone: lead.id_contato?.telefone || 'N/A',
        contato_cargo: lead.id_contato?.cargo || 'N/A',
        
        // Origem do lead
        origem_canal: lead.id_origem_lead?.canal || 'N/A',
        origem_fonte: lead.id_origem_lead?.fonte || 'N/A',
        
        // Motivo de perda (se aplicável)
        motivo_perda: lead.id_motivo_perda?.descricao || null,
        
        // Estatísticas de interações
        total_interacoes: leadInteractions.length,
        ultima_interacao: leadInteractions.length > 0
          ? leadInteractions.sort((a, b) => 
              new Date(b.data_realizacao).getTime() - new Date(a.data_realizacao).getTime()
            )[0].data_realizacao
          : null,
      };
    });

    return res.json({
      leads: enrichedLeads,
      summary: {
        total_leads: leads.length,
        total_interactions: interactions.length,
        total_companies: companies.length,
        total_contacts: contacts.length,
        total_members: membros.length,
        total_sellers: vendedores.length,
        fases_funil: fases.length,
        origens: origens.length,
        nichos: nichos.length,
      },
      reference_data: {
        fases: fases.map(f => ({ id: f._id.toString(), nome: f.nome_fase, ordem: f.ordem })),
        origens: origens.map(o => ({ id: o._id.toString(), canal: o.canal, fonte: o.fonte })),
        nichos: nichos.map(n => ({ id: n._id.toString(), nome: n.nome_nicho })),
        motivos: motivos.map(m => ({ id: m._id.toString(), descricao: m.descricao })),
      }
    });
  } catch (error) {
    console.error('Error fetching CRM analytics:', error);
    return res.status(500).json({ message: 'Failed to retrieve CRM analytics data.' });
  }
});

/**
 * GET /api/analytics/kpis
 * Returns key performance indicators for the CRM dashboard
 */
router.get('/kpis', async (_req, res) => {
  try {
    if (!isMongoReady()) {
      return res.status(503).json({ message: 'Database connection is not ready.' });
    }

    const [totalLeads, openLeads, wonLeads, lostLeads] = await Promise.all([
      Lead.countDocuments({}),
      Lead.countDocuments({ status: 'Aberto' }),
      Lead.countDocuments({ status: 'Ganho' }),
      Lead.countDocuments({ status: 'Perdido' }),
    ]);

    // Calculate total pipeline value and won value
    const [pipelineValue, wonValue] = await Promise.all([
      Lead.aggregate([
        { $match: { status: 'Aberto' } },
        { $group: { _id: null, total: { $sum: '$valor_estimado' } } }
      ]),
      Lead.aggregate([
        { $match: { status: 'Ganho' } },
        { $group: { _id: null, total: { $sum: '$valor_estimado' } } }
      ]),
    ]);

    const conversionRate = totalLeads > 0 ? (wonLeads / totalLeads) * 100 : 0;
    const lossRate = totalLeads > 0 ? (lostLeads / totalLeads) * 100 : 0;

    // Get funnel distribution
    const funnelDistribution = await Lead.aggregate([
      {
        $lookup: {
          from: 'fases_funil_sheet',
          localField: 'id_fase_atual',
          foreignField: '_id',
          as: 'fase'
        }
      },
      { $unwind: '$fase' },
      {
        $group: {
          _id: { fase: '$fase.nome_fase', ordem: '$fase.ordem' },
          count: { $sum: 1 },
          valor: { $sum: '$valor_estimado' }
        }
      },
      { $sort: { '_id.ordem': 1 } }
    ]);

    // Get lead sources
    const leadSources = await Lead.aggregate([
      {
        $lookup: {
          from: 'origens_lead_sheet',
          localField: 'id_origem_lead',
          foreignField: '_id',
          as: 'origem'
        }
      },
      { $unwind: '$origem' },
      {
        $group: {
          _id: '$origem.canal',
          count: { $sum: 1 },
          valor: { $sum: '$valor_estimado' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Get loss reasons
    const lossReasons = await Lead.aggregate([
      { $match: { status: 'Perdido', id_motivo_perda: { $ne: null } } },
      {
        $lookup: {
          from: 'motivos_perda_sheet',
          localField: 'id_motivo_perda',
          foreignField: '_id',
          as: 'motivo'
        }
      },
      { $unwind: '$motivo' },
      {
        $group: {
          _id: '$motivo.descricao',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Get seller performance
    const sellerPerformance = await Lead.aggregate([
      {
        $lookup: {
          from: 'membros_sheet',
          localField: 'id_membro',
          foreignField: '_id',
          as: 'membro'
        }
      },
      { $unwind: '$membro' },
      {
        $group: {
          _id: '$membro._id',
          nome: { $first: '$membro.nome' },
          total_leads: { $sum: 1 },
          leads_ganhos: {
            $sum: { $cond: [{ $eq: ['$status', 'Ganho'] }, 1, 0] }
          },
          leads_perdidos: {
            $sum: { $cond: [{ $eq: ['$status', 'Perdido'] }, 1, 0] }
          },
          valor_total: { $sum: '$valor_estimado' },
          valor_ganho: {
            $sum: { $cond: [{ $eq: ['$status', 'Ganho'] }, '$valor_estimado', 0] }
          }
        }
      },
      { $sort: { valor_ganho: -1 } }
    ]);

    // Temporal evolution (last 12 months)
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const temporalEvolution = await Lead.aggregate([
      { $match: { createdAt: { $gte: twelveMonthsAgo } } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          total_leads: { $sum: 1 },
          leads_ganhos: {
            $sum: { $cond: [{ $eq: ['$status', 'Ganho'] }, 1, 0] }
          },
          leads_perdidos: {
            $sum: { $cond: [{ $eq: ['$status', 'Perdido'] }, 1, 0] }
          },
          valor_total: { $sum: '$valor_estimado' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    return res.json({
      kpis: {
        total_leads: totalLeads,
        open_leads: openLeads,
        won_leads: wonLeads,
        lost_leads: lostLeads,
        conversion_rate: conversionRate,
        loss_rate: lossRate,
        pipeline_value: pipelineValue[0]?.total || 0,
        won_value: wonValue[0]?.total || 0,
      },
      funnel_distribution: funnelDistribution.map(f => ({
        fase: f._id.fase,
        ordem: f._id.ordem,
        count: f.count,
        valor: f.valor
      })),
      lead_sources: leadSources.map(s => ({
        canal: s._id,
        count: s.count,
        valor: s.valor
      })),
      loss_reasons: lossReasons.map(r => ({
        motivo: r._id,
        count: r.count
      })),
      seller_performance: sellerPerformance.map(s => ({
        id: s._id.toString(),
        nome: s.nome,
        total_leads: s.total_leads,
        leads_ganhos: s.leads_ganhos,
        leads_perdidos: s.leads_perdidos,
        valor_total: s.valor_total,
        valor_ganho: s.valor_ganho,
        taxa_conversao: s.total_leads > 0 ? (s.leads_ganhos / s.total_leads) * 100 : 0
      })),
      temporal_evolution: temporalEvolution.map(t => ({
        year: t._id.year,
        month: t._id.month,
        date: `${t._id.year}-${String(t._id.month).padStart(2, '0')}`,
        total_leads: t.total_leads,
        leads_ganhos: t.leads_ganhos,
        leads_perdidos: t.leads_perdidos,
        valor_total: t.valor_total
      }))
    });
  } catch (error) {
    console.error('Error fetching KPIs:', error);
    return res.status(500).json({ message: 'Failed to retrieve KPIs.' });
  }
});

export default router;
