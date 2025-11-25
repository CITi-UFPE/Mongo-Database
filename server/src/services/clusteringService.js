import mongoose from 'mongoose';
import Lead from '../models/Comercial/Lead.js';
import Nicho from '../models/Comercial/Nicho.js';
import OrigemLead from '../models/Comercial/Origem_lead.js';

console.log('Clustering Service Loaded');

/**
 * Performs K-Means clustering on Lead data.
 * @param {number} k - Number of clusters to find.
 * @returns {Promise<Object>} - Clustering results and analysis.
 */
export const performClustering = async (k = 4) => {
    console.log(`Starting clustering with k=${k}`);

    // Dynamic import for ESM compatibility
    // Using eval to bypass Babel transpilation which converts import() to require()
    const { kmeans } = await (eval('import("ml-kmeans")'));



    // 1. Fetch Data
    const leads = await Lead.find({ status: { $in: ['Ganho', 'Perdido', 'Aberto'] } })
        // .populate('id_nicho') // Removed: Lead doesn't have id_nicho directly.
        .populate({
            path: 'id_empresa',
            populate: { path: 'id_nicho' }
        })

        .populate('id_origem_lead')
        .populate('id_fase_atual')
        .lean();

    if (leads.length < k) {
        throw new Error(`Not enough data points (${leads.length}) for ${k} clusters.`);
    }

    // 2. Preprocessing & Feature Engineering

    // Get all unique Niches and Origins
    const allNichos = [...new Set(leads.map(l => l.id_empresa?.id_nicho?.nome_nicho).filter(Boolean))].sort();
    const allOrigens = [...new Set(leads.map(l => l.id_origem_lead?.canal).filter(Boolean))].sort();

    const nichoMap = new Map(allNichos.map((n, i) => [n, i]));
    const origemMap = new Map(allOrigens.map((o, i) => [o, i]));

    // Helper to normalize values (min-max scaling)
    const normalize = (val, min, max) => (max - min === 0 ? 0 : (val - min) / (max - min));

    // Log transform value to handle outliers better
    const values = leads.map(l => Math.log1p(l.valor_estimado || 0));
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);

    const phaseOrders = leads.map(l => l.id_fase_atual?.ordem || 0);
    const minPhase = Math.min(...phaseOrders);
    const maxPhase = Math.max(...phaseOrders);

    // Create Feature Vectors
    // [Normalized LogValue, Normalized Phase, Encoded Niche, Encoded Origin]
    const data = leads.map(lead => {
        const val = normalize(Math.log1p(lead.valor_estimado || 0), minVal, maxVal);
        const phase = normalize(lead.id_fase_atual?.ordem || 0, minPhase, maxPhase);

        // Weight phase higher as it's a strong indicator of progress
        const weightedPhase = phase * 1.5;

        const nichoIdx = nichoMap.get(lead.id_empresa?.id_nicho?.nome_nicho) || 0;
        const origemIdx = origemMap.get(lead.id_origem_lead?.canal) || 0;

        const normNicho = normalize(nichoIdx, 0, Math.max(allNichos.length - 1, 1));
        const normOrigem = normalize(origemIdx, 0, Math.max(allOrigens.length - 1, 1));

        return [val, weightedPhase, normNicho, normOrigem];
    });

    // 3. Run K-Means
    const result = kmeans(data, k, { initialization: 'kmeans++' });

    // 4. Analyze Clusters
    const clusters = [];
    for (let i = 0; i < k; i++) {
        const clusterIndices = result.clusters.reduce((acc, val, idx) => (val === i ? [...acc, idx] : acc), []);
        const clusterLeads = clusterIndices.map(idx => leads[idx]);

        if (clusterLeads.length === 0) {
            clusters.push({ id: i, size: 0, winRate: 0, avgValue: 0, description: 'Empty Cluster' });
            continue;
        }

        // Calculate Stats
        const total = clusterLeads.length;
        const won = clusterLeads.filter(l => l.status === 'Ganho').length;
        const winRate = (won / total) * 100;
        const avgValue = clusterLeads.reduce((sum, l) => sum + (l.valor_estimado || 0), 0) / total;

        // Find dominant features
        const getNicheCounts = () => {
            const counts = {};
            clusterLeads.forEach(l => {
                const n = l.id_empresa?.id_nicho?.nome_nicho || 'Unknown';
                counts[n] = (counts[n] || 0) + 1;
            });
            return Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
        };

        const getOriginCounts = () => {
            const counts = {};
            clusterLeads.forEach(l => {
                const o = l.id_origem_lead?.canal || 'Unknown';
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
            topNichePercentage: Math.round((nicheCount / total) * 100),
            topOrigin: topOrigin,
            topOriginPercentage: Math.round((originCount / total) * 100),
            centroid: result.centroids[i]
        });
    }

    // 5. Format Response for Visualization
    const points = leads.map((lead, idx) => {
        // Add jitter to Y (Phase) for better visualization
        // Phase is usually integer 1-8. Jitter +/- 0.3
        const phaseJitter = (Math.random() - 0.5) * 0.6;

        return {
            id: lead._id,
            x: lead.valor_estimado || 0,
            y: (lead.id_fase_atual?.ordem || 0) + phaseJitter, // Jittered Y
            originalY: lead.id_fase_atual?.ordem || 0,
            cluster: result.clusters[idx],
            status: lead.status,
            niche: lead.id_empresa?.id_nicho?.nome_nicho,
            origin: lead.id_origem_lead?.canal
        };
    });


    return {
        clusters,
        points
    };
};
