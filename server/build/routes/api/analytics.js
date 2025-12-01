"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _express = require("express");
var _mongoose = _interopRequireDefault(require("mongoose"));
var _Lead = _interopRequireDefault(require("../../models/Comercial/Lead.js"));
var _Membro = _interopRequireDefault(require("../../models/Comercial/Membro.js"));
var _Vendedor = _interopRequireDefault(require("../../models/Comercial/Vendedor.js"));
var _Empresa = _interopRequireDefault(require("../../models/Comercial/Empresa.js"));
var _Contato = _interopRequireDefault(require("../../models/Comercial/Contato.js"));
var _Fase_funil = _interopRequireDefault(require("../../models/Comercial/Fase_funil.js"));
var _Origem_lead = _interopRequireDefault(require("../../models/Comercial/Origem_lead.js"));
var _Nicho = _interopRequireDefault(require("../../models/Comercial/Nicho.js"));
var _Motivo_perda = _interopRequireDefault(require("../../models/Comercial/Motivo_perda.js"));
var _Interacao = _interopRequireDefault(require("../../models/Comercial/Interacao.js"));
var _clusteringService = require("../../services/clusteringService.js");
var _predictionService = require("../../services/predictionService.js");
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
const router = (0, _express.Router)();
const isMongoReady = () => _mongoose.default.connection.readyState === 1 && _mongoose.default.connection.db;

/**
 * GET /api/analytics/crm
 * Returns aggregated CRM data with all relationships populated
 */
router.get('/crm', async (_req, res) => {
  try {
    if (!isMongoReady()) {
      return res.status(503).json({
        message: 'Database connection is not ready.'
      });
    }

    // Fetch all leads with populated relationships
    const leads = await _Lead.default.find({}).populate('id_fase_atual').populate('id_empresa').populate('id_membro').populate('id_contato').populate('id_origem_lead').populate('id_motivo_perda').lean();

    // Fetch all interactions and populate their relationships
    const interactions = await _Interacao.default.find({}).populate('id_lead').populate('id_contato').populate({
      path: 'id_vendedor',
      populate: {
        path: 'id_membro'
      }
    }).lean();

    // Fetch all companies with their nicho
    const companies = await _Empresa.default.find({}).populate('id_nicho').lean();

    // Fetch all contacts with their company
    const contacts = await _Contato.default.find({}).populate('id_empresa').lean();

    // Fetch reference data
    const [fases, origens, nichos, motivos, membros, vendedores] = await Promise.all([_Fase_funil.default.find({}).lean(), _Origem_lead.default.find({}).lean(), _Nicho.default.find({}).lean(), _Motivo_perda.default.find({}).lean(), _Membro.default.find({}).lean(), _Vendedor.default.find({}).populate('id_membro').lean()]);

    // Build enriched dataset
    const enrichedLeads = leads.map(lead => {
      var _lead$id_fase_atual, _lead$id_fase_atual2, _lead$id_empresa, _lead$id_empresa2, _lead$id_empresa3, _lead$id_empresa4, _lead$id_empresa5, _lead$id_empresa6, _lead$id_empresa7, _lead$id_empresa7$id_, _lead$id_membro, _lead$id_membro2, _lead$id_membro3, _lead$id_contato, _lead$id_contato2, _lead$id_contato3, _lead$id_contato4, _lead$id_origem_lead, _lead$id_origem_lead2, _lead$id_motivo_perda;
      const leadInteractions = interactions.filter(int => int.id_lead && int.id_lead._id.toString() === lead._id.toString());
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
        fase_atual: ((_lead$id_fase_atual = lead.id_fase_atual) === null || _lead$id_fase_atual === void 0 ? void 0 : _lead$id_fase_atual.nome_fase) || 'N/A',
        fase_ordem: ((_lead$id_fase_atual2 = lead.id_fase_atual) === null || _lead$id_fase_atual2 === void 0 ? void 0 : _lead$id_fase_atual2.ordem) || 0,
        // Empresa
        empresa_nome: ((_lead$id_empresa = lead.id_empresa) === null || _lead$id_empresa === void 0 ? void 0 : _lead$id_empresa.nome_empresa) || 'N/A',
        empresa_cnpj: ((_lead$id_empresa2 = lead.id_empresa) === null || _lead$id_empresa2 === void 0 ? void 0 : _lead$id_empresa2.cnpj) || 'N/A',
        empresa_localizacao_pais: ((_lead$id_empresa3 = lead.id_empresa) === null || _lead$id_empresa3 === void 0 ? void 0 : _lead$id_empresa3.localizacao_pais) || 'N/A',
        empresa_localizacao_estado: ((_lead$id_empresa4 = lead.id_empresa) === null || _lead$id_empresa4 === void 0 ? void 0 : _lead$id_empresa4.localizacao_estado) || 'N/A',
        empresa_faturamento: ((_lead$id_empresa5 = lead.id_empresa) === null || _lead$id_empresa5 === void 0 ? void 0 : _lead$id_empresa5.faturamento_anual) || 0,
        empresa_funcionarios: ((_lead$id_empresa6 = lead.id_empresa) === null || _lead$id_empresa6 === void 0 ? void 0 : _lead$id_empresa6.numero_funcionarios) || 0,
        // Nicho da empresa
        nicho: ((_lead$id_empresa7 = lead.id_empresa) === null || _lead$id_empresa7 === void 0 ? void 0 : (_lead$id_empresa7$id_ = _lead$id_empresa7.id_nicho) === null || _lead$id_empresa7$id_ === void 0 ? void 0 : _lead$id_empresa7$id_.nome_nicho) || 'N/A',
        // Membro responsável
        membro_nome: ((_lead$id_membro = lead.id_membro) === null || _lead$id_membro === void 0 ? void 0 : _lead$id_membro.nome) || 'N/A',
        membro_email: ((_lead$id_membro2 = lead.id_membro) === null || _lead$id_membro2 === void 0 ? void 0 : _lead$id_membro2.email) || 'N/A',
        membro_cargo: ((_lead$id_membro3 = lead.id_membro) === null || _lead$id_membro3 === void 0 ? void 0 : _lead$id_membro3.cargo) || 'N/A',
        // Contato
        contato_nome: ((_lead$id_contato = lead.id_contato) === null || _lead$id_contato === void 0 ? void 0 : _lead$id_contato.nome) || 'N/A',
        contato_email: ((_lead$id_contato2 = lead.id_contato) === null || _lead$id_contato2 === void 0 ? void 0 : _lead$id_contato2.email) || 'N/A',
        contato_telefone: ((_lead$id_contato3 = lead.id_contato) === null || _lead$id_contato3 === void 0 ? void 0 : _lead$id_contato3.telefone) || 'N/A',
        contato_cargo: ((_lead$id_contato4 = lead.id_contato) === null || _lead$id_contato4 === void 0 ? void 0 : _lead$id_contato4.cargo) || 'N/A',
        // Origem do lead
        origem_canal: ((_lead$id_origem_lead = lead.id_origem_lead) === null || _lead$id_origem_lead === void 0 ? void 0 : _lead$id_origem_lead.canal) || 'N/A',
        origem_fonte: ((_lead$id_origem_lead2 = lead.id_origem_lead) === null || _lead$id_origem_lead2 === void 0 ? void 0 : _lead$id_origem_lead2.fonte) || 'N/A',
        // Motivo de perda (se aplicável)
        motivo_perda: ((_lead$id_motivo_perda = lead.id_motivo_perda) === null || _lead$id_motivo_perda === void 0 ? void 0 : _lead$id_motivo_perda.descricao) || null,
        // Estatísticas de interações
        total_interacoes: leadInteractions.length,
        ultima_interacao: leadInteractions.length > 0 ? leadInteractions.sort((a, b) => new Date(b.data_realizacao).getTime() - new Date(a.data_realizacao).getTime())[0].data_realizacao : null
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
        nichos: nichos.length
      },
      reference_data: {
        fases: fases.map(f => ({
          id: f._id.toString(),
          nome: f.nome_fase,
          ordem: f.ordem
        })),
        origens: origens.map(o => ({
          id: o._id.toString(),
          canal: o.canal,
          fonte: o.fonte
        })),
        nichos: nichos.map(n => ({
          id: n._id.toString(),
          nome: n.nome_nicho
        })),
        motivos: motivos.map(m => ({
          id: m._id.toString(),
          descricao: m.descricao
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching CRM analytics:', error);
    return res.status(500).json({
      message: 'Failed to retrieve CRM analytics data.'
    });
  }
});

/**
 * GET /api/analytics/kpis
 * Returns key performance indicators for the CRM dashboard
 */
router.get('/kpis', async (_req, res) => {
  try {
    var _pipelineValue$, _wonValue$;
    if (!isMongoReady()) {
      return res.status(503).json({
        message: 'Database connection is not ready.'
      });
    }
    const [totalLeads, openLeads, wonLeads, lostLeads] = await Promise.all([_Lead.default.countDocuments({}), _Lead.default.countDocuments({
      status: 'Aberto'
    }), _Lead.default.countDocuments({
      status: 'Ganho'
    }), _Lead.default.countDocuments({
      status: 'Perdido'
    })]);

    // Calculate total pipeline value and won value
    const [pipelineValue, wonValue] = await Promise.all([_Lead.default.aggregate([{
      $match: {
        status: 'Aberto'
      }
    }, {
      $group: {
        _id: null,
        total: {
          $sum: '$valor_estimado'
        }
      }
    }]), _Lead.default.aggregate([{
      $match: {
        status: 'Ganho'
      }
    }, {
      $group: {
        _id: null,
        total: {
          $sum: '$valor_estimado'
        }
      }
    }])]);
    const conversionRate = totalLeads > 0 ? wonLeads / totalLeads * 100 : 0;
    const lossRate = totalLeads > 0 ? lostLeads / totalLeads * 100 : 0;

    // Get funnel distribution
    const funnelDistribution = await _Lead.default.aggregate([{
      $lookup: {
        from: 'fases_funil_sheet',
        localField: 'id_fase_atual',
        foreignField: '_id',
        as: 'fase'
      }
    }, {
      $unwind: '$fase'
    }, {
      $group: {
        _id: {
          fase: '$fase.nome_fase',
          ordem: '$fase.ordem'
        },
        count: {
          $sum: 1
        },
        valor: {
          $sum: '$valor_estimado'
        }
      }
    }, {
      $sort: {
        '_id.ordem': 1
      }
    }]);

    // Get lead sources
    const leadSources = await _Lead.default.aggregate([{
      $lookup: {
        from: 'origens_lead_sheet',
        localField: 'id_origem_lead',
        foreignField: '_id',
        as: 'origem'
      }
    }, {
      $unwind: '$origem'
    }, {
      $group: {
        _id: '$origem.canal',
        count: {
          $sum: 1
        },
        valor: {
          $sum: '$valor_estimado'
        }
      }
    }, {
      $sort: {
        count: -1
      }
    }]);

    // Get loss reasons
    const lossReasons = await _Lead.default.aggregate([{
      $match: {
        status: 'Perdido',
        id_motivo_perda: {
          $ne: null
        }
      }
    }, {
      $lookup: {
        from: 'motivos_perda_sheet',
        localField: 'id_motivo_perda',
        foreignField: '_id',
        as: 'motivo'
      }
    }, {
      $unwind: '$motivo'
    }, {
      $group: {
        _id: '$motivo.descricao',
        count: {
          $sum: 1
        }
      }
    }, {
      $sort: {
        count: -1
      }
    }]);

    // Get seller performance
    const sellerPerformance = await _Lead.default.aggregate([{
      $lookup: {
        from: 'membros_sheet',
        localField: 'id_membro',
        foreignField: '_id',
        as: 'membro'
      }
    }, {
      $unwind: '$membro'
    }, {
      $group: {
        _id: '$membro._id',
        nome: {
          $first: '$membro.nome'
        },
        total_leads: {
          $sum: 1
        },
        leads_ganhos: {
          $sum: {
            $cond: [{
              $eq: ['$status', 'Ganho']
            }, 1, 0]
          }
        },
        leads_perdidos: {
          $sum: {
            $cond: [{
              $eq: ['$status', 'Perdido']
            }, 1, 0]
          }
        },
        valor_total: {
          $sum: '$valor_estimado'
        },
        valor_ganho: {
          $sum: {
            $cond: [{
              $eq: ['$status', 'Ganho']
            }, '$valor_estimado', 0]
          }
        }
      }
    }, {
      $sort: {
        valor_ganho: -1
      }
    }]);

    // Temporal evolution (last 12 months)
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    const temporalEvolution = await _Lead.default.aggregate([{
      $match: {
        createdAt: {
          $gte: twelveMonthsAgo
        }
      }
    }, {
      $group: {
        _id: {
          year: {
            $year: '$createdAt'
          },
          month: {
            $month: '$createdAt'
          }
        },
        total_leads: {
          $sum: 1
        },
        leads_ganhos: {
          $sum: {
            $cond: [{
              $eq: ['$status', 'Ganho']
            }, 1, 0]
          }
        },
        leads_perdidos: {
          $sum: {
            $cond: [{
              $eq: ['$status', 'Perdido']
            }, 1, 0]
          }
        },
        valor_total: {
          $sum: '$valor_estimado'
        }
      }
    }, {
      $sort: {
        '_id.year': 1,
        '_id.month': 1
      }
    }]);
    return res.json({
      kpis: {
        total_leads: totalLeads,
        open_leads: openLeads,
        won_leads: wonLeads,
        lost_leads: lostLeads,
        conversion_rate: conversionRate,
        loss_rate: lossRate,
        pipeline_value: ((_pipelineValue$ = pipelineValue[0]) === null || _pipelineValue$ === void 0 ? void 0 : _pipelineValue$.total) || 0,
        won_value: ((_wonValue$ = wonValue[0]) === null || _wonValue$ === void 0 ? void 0 : _wonValue$.total) || 0
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
        taxa_conversao: s.total_leads > 0 ? s.leads_ganhos / s.total_leads * 100 : 0
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
    return res.status(500).json({
      message: 'Failed to retrieve KPIs.'
    });
  }
});
/**
 * GET /api/analytics/clustering
 * Performs K-Means clustering on leads to find patterns.
 */
router.get('/clustering', async (req, res) => {
  try {
    if (!isMongoReady()) {
      return res.status(503).json({
        message: 'Database connection is not ready.'
      });
    }

    // Dynamic K from query param, default to 4
    const k = parseInt(req.query.k) || 4;
    console.log(`Received clustering request for k=${k}`);
    const results = await (0, _clusteringService.performClustering)(k);
    console.log('Clustering completed successfully');
    return res.json(results);
  } catch (error) {
    console.error('Error performing clustering:', error);
    return res.status(500).json({
      message: 'Failed to perform clustering analysis.',
      error: error.message
    });
  }
});
/**
 * GET /api/analytics/prediction
 * Predicts win probability for open leads.
 */
router.get('/prediction', async (req, res) => {
  try {
    if (!isMongoReady()) {
      return res.status(503).json({
        message: 'Database connection is not ready.'
      });
    }
    console.log('Received prediction request');
    const year = req.query.year ? parseInt(req.query.year) : undefined;
    const results = await (0, _predictionService.performPrediction)(year);
    console.log('Prediction completed successfully');
    return res.json(results);
  } catch (error) {
    console.error('Error performing prediction:', error);
    return res.status(500).json({
      message: 'Failed to perform prediction analysis.',
      error: error.message
    });
  }
});
var _default = exports.default = router;