"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.performClustering = void 0;
var _mongoose = _interopRequireDefault(require("mongoose"));
var _Lead = _interopRequireDefault(require("../models/Comercial/Lead.js"));
var _Nicho = _interopRequireDefault(require("../models/Comercial/Nicho.js"));
var _Origem_lead = _interopRequireDefault(require("../models/Comercial/Origem_lead.js"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
console.log('Clustering Service Loaded');

/**
 * Performs K-Means clustering on Lead data.
 * @param {number} k - Number of clusters to find.
 * @returns {Promise<Object>} - Clustering results and analysis.
 */
const performClustering = async (k = 4) => {
  console.log(`Starting clustering with k=${k}`);

  // Dynamic import for ESM compatibility
  // Using eval to bypass Babel transpilation which converts import() to require()
  const {
    kmeans
  } = await eval('import("ml-kmeans")');

  // 1. Fetch Data
  const leads = await _Lead.default.find({
    status: {
      $in: ['Ganho', 'Perdido', 'Aberto']
    }
  })
  // .populate('id_nicho') // Removed: Lead doesn't have id_nicho directly.
  .populate({
    path: 'id_empresa',
    populate: {
      path: 'id_nicho'
    }
  }).populate('id_origem_lead').populate('id_fase_atual').lean();
  if (leads.length < k) {
    throw new Error(`Not enough data points (${leads.length}) for ${k} clusters.`);
  }

  // 2. Preprocessing & Feature Engineering

  // Get all unique Niches and Origins
  const allNichos = [...new Set(leads.map(l => {
    var _l$id_empresa, _l$id_empresa$id_nich;
    return (_l$id_empresa = l.id_empresa) === null || _l$id_empresa === void 0 ? void 0 : (_l$id_empresa$id_nich = _l$id_empresa.id_nicho) === null || _l$id_empresa$id_nich === void 0 ? void 0 : _l$id_empresa$id_nich.nome_nicho;
  }).filter(Boolean))].sort();
  const allOrigens = [...new Set(leads.map(l => {
    var _l$id_origem_lead;
    return (_l$id_origem_lead = l.id_origem_lead) === null || _l$id_origem_lead === void 0 ? void 0 : _l$id_origem_lead.canal;
  }).filter(Boolean))].sort();
  const nichoMap = new Map(allNichos.map((n, i) => [n, i]));
  const origemMap = new Map(allOrigens.map((o, i) => [o, i]));

  // Helper to normalize values (min-max scaling)
  const normalize = (val, min, max) => max - min === 0 ? 0 : (val - min) / (max - min);

  // Log transform value to handle outliers better
  const values = leads.map(l => Math.log1p(l.valor_estimado || 0));
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const phaseOrders = leads.map(l => {
    var _l$id_fase_atual;
    return ((_l$id_fase_atual = l.id_fase_atual) === null || _l$id_fase_atual === void 0 ? void 0 : _l$id_fase_atual.ordem) || 0;
  });
  const minPhase = Math.min(...phaseOrders);
  const maxPhase = Math.max(...phaseOrders);

  // Create Feature Vectors
  // [Normalized LogValue, Normalized Phase, Encoded Niche, Encoded Origin]
  const data = leads.map(lead => {
    var _lead$id_fase_atual, _lead$id_empresa, _lead$id_empresa$id_n, _lead$id_origem_lead;
    const val = normalize(Math.log1p(lead.valor_estimado || 0), minVal, maxVal);
    const phase = normalize(((_lead$id_fase_atual = lead.id_fase_atual) === null || _lead$id_fase_atual === void 0 ? void 0 : _lead$id_fase_atual.ordem) || 0, minPhase, maxPhase);

    // Weight phase higher as it's a strong indicator of progress
    const weightedPhase = phase * 1.5;
    const nichoIdx = nichoMap.get((_lead$id_empresa = lead.id_empresa) === null || _lead$id_empresa === void 0 ? void 0 : (_lead$id_empresa$id_n = _lead$id_empresa.id_nicho) === null || _lead$id_empresa$id_n === void 0 ? void 0 : _lead$id_empresa$id_n.nome_nicho) || 0;
    const origemIdx = origemMap.get((_lead$id_origem_lead = lead.id_origem_lead) === null || _lead$id_origem_lead === void 0 ? void 0 : _lead$id_origem_lead.canal) || 0;
    const normNicho = normalize(nichoIdx, 0, Math.max(allNichos.length - 1, 1));
    const normOrigem = normalize(origemIdx, 0, Math.max(allOrigens.length - 1, 1));
    return [val, weightedPhase, normNicho, normOrigem];
  });

  // 3. Run K-Means
  const result = kmeans(data, k, {
    initialization: 'kmeans++'
  });

  // 4. Analyze Clusters
  const clusters = [];
  for (let i = 0; i < k; i++) {
    const clusterIndices = result.clusters.reduce((acc, val, idx) => val === i ? [...acc, idx] : acc, []);
    const clusterLeads = clusterIndices.map(idx => leads[idx]);
    if (clusterLeads.length === 0) {
      clusters.push({
        id: i,
        size: 0,
        winRate: 0,
        avgValue: 0,
        description: 'Empty Cluster'
      });
      continue;
    }

    // Calculate Stats
    const total = clusterLeads.length;
    const won = clusterLeads.filter(l => l.status === 'Ganho').length;
    const winRate = won / total * 100;
    const avgValue = clusterLeads.reduce((sum, l) => sum + (l.valor_estimado || 0), 0) / total;

    // Find dominant features
    const getNicheCounts = () => {
      const counts = {};
      clusterLeads.forEach(l => {
        var _l$id_empresa2, _l$id_empresa2$id_nic;
        const n = ((_l$id_empresa2 = l.id_empresa) === null || _l$id_empresa2 === void 0 ? void 0 : (_l$id_empresa2$id_nic = _l$id_empresa2.id_nicho) === null || _l$id_empresa2$id_nic === void 0 ? void 0 : _l$id_empresa2$id_nic.nome_nicho) || 'Unknown';
        counts[n] = (counts[n] || 0) + 1;
      });
      return Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    };
    const getOriginCounts = () => {
      const counts = {};
      clusterLeads.forEach(l => {
        var _l$id_origem_lead2;
        const o = ((_l$id_origem_lead2 = l.id_origem_lead) === null || _l$id_origem_lead2 === void 0 ? void 0 : _l$id_origem_lead2.canal) || 'Unknown';
        counts[o] = (counts[o] || 0) + 1;
      });
      return Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    };
    const [topNiche, nicheCount] = getNicheCounts();
    const [topOrigin, originCount] = getOriginCounts();
    clusters.push({
      id: i,
      size: total,
      winRate: parseFloat(winRate.toFixed(1)),
      avgValue: parseFloat(avgValue.toFixed(2)),
      topNiche: topNiche,
      topNichePercentage: Math.round(nicheCount / total * 100),
      topOrigin: topOrigin,
      topOriginPercentage: Math.round(originCount / total * 100),
      centroid: result.centroids[i]
    });
  }

  // 5. Format Response for Visualization
  const points = leads.map((lead, idx) => {
    var _lead$id_fase_atual2, _lead$id_fase_atual3, _lead$id_empresa2, _lead$id_empresa2$id_, _lead$id_origem_lead2;
    // Add jitter to Y (Phase) for better visualization
    // Phase is usually integer 1-8. Jitter +/- 0.3
    const phaseJitter = (Math.random() - 0.5) * 0.6;
    return {
      id: lead._id,
      x: lead.valor_estimado || 0,
      y: (((_lead$id_fase_atual2 = lead.id_fase_atual) === null || _lead$id_fase_atual2 === void 0 ? void 0 : _lead$id_fase_atual2.ordem) || 0) + phaseJitter,
      // Jittered Y
      originalY: ((_lead$id_fase_atual3 = lead.id_fase_atual) === null || _lead$id_fase_atual3 === void 0 ? void 0 : _lead$id_fase_atual3.ordem) || 0,
      cluster: result.clusters[idx],
      status: lead.status,
      niche: (_lead$id_empresa2 = lead.id_empresa) === null || _lead$id_empresa2 === void 0 ? void 0 : (_lead$id_empresa2$id_ = _lead$id_empresa2.id_nicho) === null || _lead$id_empresa2$id_ === void 0 ? void 0 : _lead$id_empresa2$id_.nome_nicho,
      origin: (_lead$id_origem_lead2 = lead.id_origem_lead) === null || _lead$id_origem_lead2 === void 0 ? void 0 : _lead$id_origem_lead2.canal
    };
  });
  return {
    clusters,
    points
  };
};
exports.performClustering = performClustering;